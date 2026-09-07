import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AiAssistantPage from './AiAssistantPage';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dataset/ai/:datasetId" element={<AiAssistantPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('AiAssistantPage', () => {
  it('renders the chat and preview panes side by side', () => {
    renderAt('/dataset/ai/%3Cnew%3E');

    expect(
      screen.getByRole('region', { name: /assistant chat/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /dataset preview/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('announces a new dataset when the route id is <new>', () => {
    renderAt('/dataset/ai/%3Cnew%3E');

    expect(screen.getByText(/new dataset/i)).toBeInTheDocument();
  });

  it('shows the dataset id when resuming an existing draft', () => {
    renderAt('/dataset/ai/claude-probe-orders');

    expect(screen.getByText('claude-probe-orders')).toBeInTheDocument();
  });
});
