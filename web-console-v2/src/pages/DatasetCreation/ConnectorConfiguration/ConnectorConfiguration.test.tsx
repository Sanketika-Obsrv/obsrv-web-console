import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ConnectorConfiguration from './ConnectorConfiguration';
import {
  useFetchDatasetsById,
  useReadConnectors,
  useUpdateDataset,
} from 'services/dataset';

jest.mock('services/dataset', () => ({
  useFetchDatasetsById: jest.fn(),
  useReadConnectors: jest.fn(),
  useUpdateDataset: jest.fn(),
}));

jest.mock('@rjsf/core', () => ({ withTheme: () => () => null }));
jest.mock('@rjsf/mui', () => ({ Theme: {} }));
jest.mock('@rjsf/validator-ajv8', () => ({ customizeValidator: () => ({}) }));
jest.mock('components/HelpSection/HelpSection', () => () => null);

const mutate = jest.fn();

const connector = (id: string) => ({
  connector_id: id,
  category: 'stream',
  ui_spec: { title: id, properties: {} },
});

const mockDataset = (overrides: Record<string, unknown> = {}) =>
  (useFetchDatasetsById as jest.Mock).mockReturnValue({
    data: {
      connectors_config: [
        {
          id: 'ds1-A',
          connector_id: 'A',
          connector_config: {},
          operations_config: {},
        },
      ],
    },
    isLoading: false,
    isError: false,
    ...overrides,
  });

// react-query returns the same object across renders; a fresh one per call would loop the effect.
const mockConnectorRead = (fail = false) => {
  const results: Record<string, unknown> = {};
  (useReadConnectors as jest.Mock).mockImplementation(({ connectorId }) => {
    const key = String(connectorId);
    results[key] ??= {
      data: fail || !connectorId ? undefined : connector(connectorId),
      isLoading: false,
    };
    return results[key];
  });
};

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/dataset/edit/connector/configure/:datasetId"
          element={<ConnectorConfiguration />}
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  (useUpdateDataset as jest.Mock).mockReturnValue({ mutate });
  mockDataset();
  mockConnectorRead();
});

test('re-saving the existing connector upserts only that connector', () => {
  renderAt('/dataset/edit/connector/configure/ds1?connectorId=A');
  fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));

  const configs = mutate.mock.calls[0][0].data.connectors_config;
  expect(configs).toHaveLength(1);
  expect(configs[0]).toEqual(
    expect.objectContaining({
      action: 'upsert',
      value: expect.objectContaining({ connector_id: 'A' }),
    }),
  );
});

test('a connector with an empty saved config can still be saved', () => {
  renderAt('/dataset/edit/connector/configure/ds1');

  expect(useReadConnectors).toHaveBeenLastCalledWith({ connectorId: 'A' });
  fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));

  expect(mutate).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/failed to load/i)).not.toBeInTheDocument();
});

test('a failed connector read blocks saving', () => {
  mockConnectorRead(true);
  renderAt('/dataset/edit/connector/configure/ds1');

  expect(
    screen.getByText(/Failed to load the connector configuration/i),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Proceed' })).toBeDisabled();
});

test('a failed dataset read is reported as such, not as a missing selection', () => {
  mockDataset({ data: undefined, isError: true });
  renderAt('/dataset/edit/connector/configure/ds1');

  expect(screen.getByText(/Failed to load the dataset/i)).toBeInTheDocument();
  expect(screen.queryByText(/No connector selected/i)).not.toBeInTheDocument();
});

test('no selection and no existing connector asks the user to select one', () => {
  mockDataset({ data: { connectors_config: [] } });
  renderAt('/dataset/edit/connector/configure/ds1');

  expect(screen.getByText(/No connector selected/i)).toBeInTheDocument();
});
