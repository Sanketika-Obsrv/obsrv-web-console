/**
 * Covers only the props the AI assistant added: which accordion opens, and
 * which schema rows flash. The rest of `AllConfigurations` is exercised by the
 * wizard's own preview step.
 */
jest.mock('services/dataset', () => ({
  endpoints: { READ_CONNECTORS: '/connectors/read' },
  useFetchDatasetsById: jest.fn(),
  getAllFields: jest.fn(),
  datasetRead: jest.fn(),
}));

jest.mock('services/http', () => ({ http: { get: jest.fn() } }));

import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  datasetRead,
  getAllFields,
  useFetchDatasetsById,
} from 'services/dataset';
import { http } from 'services/http';
import AllConfigurations from './AllConfigurations';

/** `AllConfigurations` reads `useLocation`, so it needs a router in scope. */
const render = (ui: React.ReactElement) =>
  rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

const mocked = {
  fetch: useFetchDatasetsById as jest.MockedFunction<
    typeof useFetchDatasetsById
  >,
  fields: getAllFields as jest.MockedFunction<typeof getAllFields>,
  read: datasetRead as jest.MockedFunction<typeof datasetRead>,
};

const DATASET = {
  dataset_id: 'my-orders',
  name: 'My Orders',
  type: 'event',
  validation_config: { validate: true, mode: 'Strict' },
  dedup_config: { drop_duplicates: false, dedup_key: '' },
  denorm_config: { denorm_fields: [] },
  transformations_config: [],
  connectors_config: [],
  dataset_config: {
    indexing_config: { olap_store_enabled: true },
    keys_config: { timestamp_key: 'order_ts' },
  },
};

/**
 * Shape `generate-fields` returns, confirmed live: nested fields arrive as
 * their own rows with a dotted `column`, alongside the parent object.
 */
const FIELDS = [
  { column: 'order_id', arrival_format: 'text', data_type: 'string' },
  { column: 'total_amount', arrival_format: 'number', data_type: 'double' },
  { column: 'customer', arrival_format: 'object', data_type: 'object' },
  { column: 'customer.email', arrival_format: 'text', data_type: 'string' },
];

const rowFor = (column: string) => screen.getByText(column).closest('tr');

const panel = (name: string) =>
  screen.getByRole('button', { name: new RegExp(name, 'i') });

beforeEach(() => {
  jest.clearAllMocks();
  mocked.fetch.mockReturnValue({
    data: DATASET,
    isPending: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mocked.fields.mockResolvedValue({ data: [FIELDS] } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mocked.read.mockResolvedValue({ data: { result: {} } } as any);
  (http.get as jest.Mock).mockResolvedValue({ data: { result: {} } });
});

describe('datasetId prop', () => {
  it('reads the dataset it is given rather than the route param', () => {
    render(<AllConfigurations datasetId="my-orders" status="Draft" />);

    expect(mocked.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ datasetId: 'my-orders' }),
    );
  });

  /** The AI flow mounts the preview before `datasets/create` has run. */
  it('does not request fields when there is no dataset yet', () => {
    render(<AllConfigurations datasetId="" status="Draft" />);

    expect(mocked.fields).not.toHaveBeenCalled();
  });

  /**
   * A `try/catch` around the *call* of an async function catches nothing:
   * the rejection escapes as an unhandled promise, which the dev server
   * renders as a full-screen "Uncaught runtime errors" overlay. Seen in the
   * browser, where a preview of a dataset the API would not return made the
   * assistant look broken while the conversation itself was fine.
   */
  it('survives a connector read that fails', async () => {
    const rejections: unknown[] = [];
    const record = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      rejections.push(event.reason);
    };
    window.addEventListener('unhandledrejection', record);

    mocked.fetch.mockReturnValue({
      data: { ...DATASET, connectors_config: [{ connector_id: 'postgres' }] },
      isPending: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    (http.get as jest.Mock).mockRejectedValue(new Error('boom'));

    render(<AllConfigurations datasetId="my-orders" status="Draft" />);

    await waitFor(() => expect(http.get).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.removeEventListener('unhandledrejection', record);
    expect(rejections).toEqual([]);
  });

  /**
   * The assistant writes denormalisations now, so this path runs whenever a
   * joined dataset is previewed — and the master it names may not be
   * readable.
   */
  it('survives a master dataset read that fails, and still names the ones that worked', async () => {
    const rejections: unknown[] = [];
    const record = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      rejections.push(event.reason);
    };
    window.addEventListener('unhandledrejection', record);

    mocked.fetch.mockReturnValue({
      data: {
        ...DATASET,
        denorm_config: {
          denorm_fields: [
            {
              denorm_key: 'order_id',
              denorm_out_field: 'customer_details',
              dataset_id: 'customers',
            },
          ],
        },
      },
      isPending: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mocked.read.mockRejectedValue(new Error('gone'));

    render(<AllConfigurations datasetId="my-orders" status="Draft" />);

    await waitFor(() => expect(mocked.read).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.removeEventListener('unhandledrejection', record);
    expect(rejections).toEqual([]);
  });

  /**
   * The names were fetched but never shown: the loop pushed into an array
   * that had already been handed to `setState`, so the panel rendered the
   * ids with no names attached.
   */
  it('shows the master dataset name once it has been read', async () => {
    mocked.fetch.mockReturnValue({
      data: {
        ...DATASET,
        denorm_config: {
          denorm_fields: [
            {
              denorm_key: 'order_id',
              denorm_out_field: 'customer_details',
              dataset_id: 'customers',
            },
          ],
        },
      },
      isPending: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mocked.read.mockResolvedValue({
      data: { result: { name: 'Customers', data_schema: {} } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<AllConfigurations datasetId="my-orders" status="Draft" />);

    await waitFor(() =>
      expect(screen.getByText('Customers')).toBeInTheDocument(),
    );
  });

  it('survives a fields read that fails', async () => {
    const rejections: unknown[] = [];
    const record = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      rejections.push(event.reason);
    };
    window.addEventListener('unhandledrejection', record);

    mocked.fields.mockRejectedValue(
      new Error('Request failed with status code 404'),
    );

    render(<AllConfigurations datasetId="my-orders" status="Draft" />);

    await waitFor(() => expect(mocked.fields).toHaveBeenCalled());
    // A microtask turn for the rejection to surface if it is going to.
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.removeEventListener('unhandledrejection', record);
    expect(rejections).toEqual([]);
    // The rest of the preview still renders from the dataset itself.
    expect(screen.getByText('My Orders')).toBeInTheDocument();
  });
});

describe('focusSection', () => {
  it('opens the connector accordion by default', () => {
    render(<AllConfigurations datasetId="my-orders" status="Draft" />);

    expect(panel('Connector')).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens the section the assistant last touched', () => {
    render(
      <AllConfigurations
        datasetId="my-orders"
        status="Draft"
        focusSection="storage"
      />,
    );

    expect(panel('Storage')).toHaveAttribute('aria-expanded', 'true');
    expect(panel('Connector')).toHaveAttribute('aria-expanded', 'false');
  });

  it('moves the open section when the focus changes', () => {
    const { rerender } = render(
      <AllConfigurations
        datasetId="my-orders"
        status="Draft"
        focusSection="storage"
      />,
    );

    rerender(
      <MemoryRouter>
        <AllConfigurations
          datasetId="my-orders"
          status="Draft"
          focusSection="processing"
        />
      </MemoryRouter>,
    );

    expect(panel('Processing')).toHaveAttribute('aria-expanded', 'true');
    expect(panel('Storage')).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('changedRefs', () => {
  it('marks the row the last action changed', async () => {
    render(
      <AllConfigurations
        datasetId="my-orders"
        status="Draft"
        focusSection="ingestion"
        changedRefs={['properties.total_amount']}
      />,
    );

    await waitFor(() =>
      expect(rowFor('total_amount')).toHaveAttribute('data-changed', 'true'),
    );
    expect(rowFor('order_id')).not.toHaveAttribute('data-changed');
  });

  it('marks a nested change on its own row, not the parent', async () => {
    render(
      <AllConfigurations
        datasetId="my-orders"
        status="Draft"
        focusSection="ingestion"
        changedRefs={['properties.customer.properties.email']}
      />,
    );

    await waitFor(() =>
      expect(rowFor('customer.email')).toHaveAttribute('data-changed', 'true'),
    );
    expect(rowFor('customer')).not.toHaveAttribute('data-changed');
  });

  /** Fallback for a field `generate-fields` gave no row of its own. */
  it('marks the visible ancestor when the changed field has no row', async () => {
    render(
      <AllConfigurations
        datasetId="my-orders"
        status="Draft"
        focusSection="ingestion"
        changedRefs={['properties.customer.properties.phone']}
      />,
    );

    await waitFor(() =>
      expect(rowFor('customer')).toHaveAttribute('data-changed', 'true'),
    );
  });

  it('marks nothing when the action changed no fields', async () => {
    render(
      <AllConfigurations
        datasetId="my-orders"
        status="Draft"
        focusSection="ingestion"
        changedRefs={[]}
      />,
    );

    await waitFor(() => expect(rowFor('order_id')).toBeInTheDocument());
    FIELDS.forEach(({ column }) =>
      expect(rowFor(column)).not.toHaveAttribute('data-changed'),
    );
  });
});
