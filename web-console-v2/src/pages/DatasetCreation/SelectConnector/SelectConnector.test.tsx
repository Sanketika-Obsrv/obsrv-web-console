import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SelectConnector from './SelectConnector';
import { useConnectorsList } from 'services/dataset';

jest.mock('services/dataset', () => ({
  useConnectorsList: jest.fn(),
}));

const connectors = [
  { id: 'c1', name: 'BigQuery', type: 'source', iconurl: '', category: 'Database' },
  { id: 'c2', name: 'Kafka', type: 'source', iconurl: '', category: 'Streaming' },
];

const mockConnectorsList = (
  { isPending = false, data = connectors } = {} as { isPending?: boolean; data?: typeof connectors },
) => {
  const mutate = jest.fn();
  (useConnectorsList as jest.Mock).mockReturnValue({
    mutate,
    isPending,
    data: { data: { result: { data } } },
  });
  return mutate;
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

const renderConnector = () => render(<SelectConnector />, { wrapper: Wrapper });

beforeEach(() => {
  jest.clearAllMocks();
  mockConnectorsList();
});

test('renders the SelectConnector component', () => {
  renderConnector();

  expect(screen.getByText(/Choose additional data connectors/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Search by connector name/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Filter/i)).toBeInTheDocument();
  connectors.forEach((item) => {
    expect(screen.getByText(item.name)).toBeInTheDocument();
  });
});

test('requests the connector list on mount', () => {
  const mutate = mockConnectorsList();
  renderConnector();

  expect(mutate).toHaveBeenCalledWith({ payload: {} });
});

test('shows the loader while the connector list is pending', () => {
  mockConnectorsList({ isPending: true });
  renderConnector();

  expect(screen.queryByPlaceholderText(/Search by connector name/i)).not.toBeInTheDocument();
});

test('filters connectors based on search input', async () => {
  renderConnector();

  fireEvent.change(screen.getByPlaceholderText(/Search by connector name/i), {
    target: { value: 'bigquery' },
  });

  await waitFor(() => {
    expect(screen.getByText('BigQuery')).toBeInTheDocument();
    expect(screen.queryByText('Kafka')).not.toBeInTheDocument();
  });
});

test('selects and deselects connector card', () => {
  renderConnector();

  const card = screen.getAllByTestId('card')[0];

  fireEvent.click(card);
  expect(card).toHaveClass('selectedCard');

  fireEvent.click(card);
  expect(card).not.toHaveClass('selectedCard');
});

test('displays Proceed button when a connector is selected and Skip when none is', () => {
  renderConnector();

  expect(screen.getByText('Skip')).toBeInTheDocument();
  expect(screen.queryByText('Proceed')).not.toBeInTheDocument();

  const card = screen.getAllByTestId('card')[0];
  fireEvent.click(card);

  expect(screen.getByText('Proceed')).toBeInTheDocument();
  expect(screen.queryByText('Skip')).not.toBeInTheDocument();

  fireEvent.click(screen.getAllByTestId('selected-card')[0]);
  expect(screen.getByText('Skip')).toBeInTheDocument();
});
