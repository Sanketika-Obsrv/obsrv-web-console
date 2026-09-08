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
import { getAllFields, useFetchDatasetsById } from 'services/dataset';
import AllConfigurations from './AllConfigurations';

/** `AllConfigurations` reads `useLocation`, so it needs a router in scope. */
const render = (ui: React.ReactElement) =>
  rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

const mocked = {
  fetch: useFetchDatasetsById as jest.MockedFunction<
    typeof useFetchDatasetsById
  >,
  fields: getAllFields as jest.MockedFunction<typeof getAllFields>,
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
