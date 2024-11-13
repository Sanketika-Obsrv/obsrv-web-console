import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import SelectConnector from './SelectConnector';
import { connectorList } from '../../components/connectorList';
import { BrowserRouter } from 'react-router-dom';

test('renders the SelectConnector component', () => {
  render(<SelectConnector />, { wrapper: BrowserRouter });
  expect(
    screen.getByText(
      /API connector has already pushed the data to Obsrv. You can configure additional data with it./i,
    ),
  ).toBeInTheDocument();
  expect(screen.getByText(/Configure Connector/i)).toBeInTheDocument();
  expect(
    screen.getByPlaceholderText(/Search by connector type/i),
  ).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Filters/i)).toBeInTheDocument();
});

test('filters connectors based on search input', async () => {
  render(<SelectConnector />, { wrapper: BrowserRouter });

  const searchInput = screen.getByPlaceholderText(/Search by connector type/i);
  fireEvent.change(searchInput, { target: { value: 'bigquery' } });

  await waitFor(() => {
    const connector1 = screen.queryByText(/Big query/i);
    expect(connector1).toBeInTheDocument();
  });
});

test('selects and deselects connector card', () => {
  render(<SelectConnector />, { wrapper: BrowserRouter });

  connectorList.forEach((item) => {
    const connectorElements = screen.getAllByTestId('card');

    connectorElements.forEach((connector) => {
      fireEvent.click(connector);

      expect(connector).toHaveClass('selectedCard');
      fireEvent.click(connector);
      expect(connector).not.toHaveClass('selectedCard');
    });
  });
});

test('displays Proceed button when a connector is selected', () => {
  render(<SelectConnector />, { wrapper: BrowserRouter });

  connectorList.forEach((item) => {
    const connector = screen.getByText(item.name);
    fireEvent.click(connector);

    const proceedButton = screen.getByText(/Proceed/i);
    expect(proceedButton).toBeInTheDocument();

    fireEvent.click(connector);
    expect(proceedButton).not.toBeInTheDocument();
  });
});
