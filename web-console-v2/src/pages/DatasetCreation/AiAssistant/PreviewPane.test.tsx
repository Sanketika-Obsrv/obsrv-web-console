/**
 * `AllConfigurations` is stubbed here so these tests cover what PreviewPane
 * itself decides — the props it forwards, the progress it reports and when the
 * highlight expires. That the accordion and row highlight actually respond to
 * those props is covered by `AllConfigurations.focus.test.tsx`.
 */
jest.mock('pages/DatasetCreation/PreviewAndSave/AllConfigurations', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div
      data-testid="all-configurations"
      data-dataset-id={String(props.datasetId ?? '')}
      data-focus-section={String(props.focusSection ?? '')}
      data-changed-refs={((props.changedRefs as string[]) ?? []).join(',')}
    />
  ),
}));

jest.mock('services/dataset', () => ({
  useFetchDatasetsById: jest.fn(),
  datasetConfigStatus:
    jest.requireActual('services/dataset').datasetConfigStatus,
}));

import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { useFetchDatasetsById } from 'services/dataset';
import PreviewPane from './PreviewPane';

const mockedFetch = useFetchDatasetsById as jest.MockedFunction<
  typeof useFetchDatasetsById
>;

/** A draft with ingestion complete and everything after it still open. */
const ingestionOnly = {
  dataset_id: 'my-orders',
  name: 'My Orders',
  type: 'event',
  data_schema: { type: 'object', properties: { order_id: {} } },
  validation_config: {},
  dedup_config: {},
  denorm_config: { denorm_fields: [] },
  dataset_config: { indexing_config: {}, keys_config: {} },
};

const fullyConfigured = {
  ...ingestionOnly,
  validation_config: { validate: true, mode: 'Strict' },
  dedup_config: { drop_duplicates: true, dedup_key: 'order_id' },
  dataset_config: {
    indexing_config: { olap_store_enabled: true },
    keys_config: { timestamp_key: 'order_ts' },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const givenDataset = (data: any) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedFetch.mockReturnValue({ data, isPending: false } as any);

const configurations = () => screen.getByTestId('all-configurations');

beforeEach(() => {
  jest.clearAllMocks();
  givenDataset(ingestionOnly);
});

describe('before a draft exists', () => {
  it('explains that the preview mirrors the server', () => {
    render(<PreviewPane datasetId={null} />);

    expect(
      screen.getByText(/mirrors what is stored on the server/i),
    ).toBeInTheDocument();
  });

  it('does not render the configuration panels', () => {
    render(<PreviewPane datasetId={null} />);

    expect(screen.queryByTestId('all-configurations')).not.toBeInTheDocument();
  });
});

describe('once a draft exists', () => {
  it('renders the configuration panels for that dataset', () => {
    render(<PreviewPane datasetId="my-orders" />);

    expect(configurations()).toHaveAttribute('data-dataset-id', 'my-orders');
  });

  it('shows the dataset id', () => {
    render(<PreviewPane datasetId="my-orders" />);

    expect(screen.getByText('my-orders')).toBeInTheDocument();
  });

  it('forwards the section the last action touched', () => {
    render(<PreviewPane datasetId="my-orders" focusSection="storage" />);

    expect(configurations()).toHaveAttribute('data-focus-section', 'storage');
  });

  it('forwards the refs the last action changed', () => {
    render(
      <PreviewPane
        datasetId="my-orders"
        changedRefs={['properties.order_id']}
      />,
    );

    expect(configurations()).toHaveAttribute(
      'data-changed-refs',
      'properties.order_id',
    );
  });
});

/**
 * Progress comes from `datasetConfigStatus`, the same function the dataset
 * list uses, so the two flows can never disagree about how far along a draft
 * is.
 */
describe('progress', () => {
  it('marks only the steps the server data actually satisfies', () => {
    render(<PreviewPane datasetId="my-orders" />);

    expect(screen.getByRole('checkbox', { name: 'Ingestion' })).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Processing' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Connectors' }),
    ).not.toBeChecked();
  });

  /**
   * Documenting existing shared behaviour rather than asserting a preference:
   * every clause of `datasetConfigStatus`'s storage check reads
   * `!<store>Enabled || <key>Provided`, so an empty `indexing_config` passes
   * vacuously and Storage reports complete for a dataset with no destination
   * at all. The executor's `NO_STORAGE_SELECTED` guard is what keeps the
   * conversational flow from reaching that state.
   */
  it('reports storage complete when no store is enabled, as the list does', () => {
    render(<PreviewPane datasetId="my-orders" />);

    expect(screen.getByRole('checkbox', { name: 'Storage' })).toBeChecked();
  });

  it('reports every step once the draft is fully configured', () => {
    givenDataset(fullyConfigured);

    render(<PreviewPane datasetId="my-orders" />);

    ['Ingestion', 'Processing', 'Storage'].forEach((label) => {
      expect(screen.getByRole('checkbox', { name: label })).toBeChecked();
    });
  });

  it('publishes the percentage for assistive technology', () => {
    givenDataset(fullyConfigured);

    render(<PreviewPane datasetId="my-orders" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
  });

  it('shows no progress while the read is still in flight', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedFetch.mockReturnValue({ data: undefined, isPending: true } as any);

    render(<PreviewPane datasetId="my-orders" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });
});

/** The highlight is a flash, not a permanent mark on the row. */
describe('highlight expiry', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('drops the highlight after the flash window', () => {
    render(
      <PreviewPane
        datasetId="my-orders"
        changedRefs={['properties.order_id']}
        highlightMs={3000}
      />,
    );

    expect(configurations()).toHaveAttribute(
      'data-changed-refs',
      'properties.order_id',
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(configurations()).toHaveAttribute('data-changed-refs', '');
  });

  it('keeps the highlight until the window elapses', () => {
    render(
      <PreviewPane
        datasetId="my-orders"
        changedRefs={['properties.order_id']}
        highlightMs={3000}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(configurations()).toHaveAttribute(
      'data-changed-refs',
      'properties.order_id',
    );
  });

  it('restarts the window when a new change arrives', () => {
    const { rerender } = render(
      <PreviewPane
        datasetId="my-orders"
        changedRefs={['properties.order_id']}
        highlightMs={3000}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    rerender(
      <PreviewPane
        datasetId="my-orders"
        changedRefs={['properties.total_amount']}
        highlightMs={3000}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(configurations()).toHaveAttribute(
      'data-changed-refs',
      'properties.total_amount',
    );
  });
});
