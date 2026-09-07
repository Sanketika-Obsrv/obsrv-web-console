import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import NewDataset from './NewDataset';

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{`${pathname}${search}`}</div>;
};

const renderPage = (entry = '/dataset/create') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/dataset/create" element={<NewDataset />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

describe('NewDataset', () => {
  it('offers both the wizard and the AI assistant', () => {
    renderPage();

    expect(
      screen.getByRole('button', { name: /^Create New Dataset$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Create with AI Assistant/i }),
    ).toBeInTheDocument();
  });

  it('sends the wizard button to the connector step', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: /^Create New Dataset$/i }),
    );

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/dataset/edit/connector/list/<new>',
    );
  });

  it('sends the AI button to the assistant route', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: /Create with AI Assistant/i }),
    );

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/dataset/ai/<new>',
    );
  });

  it('carries the master dataset type through the AI entry point', async () => {
    renderPage('/dataset/create?datasetType=master');

    await userEvent.click(
      screen.getByRole('button', { name: /Create with AI Assistant/i }),
    );

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/dataset/ai/<new>?datasetType=master',
    );
  });
});
