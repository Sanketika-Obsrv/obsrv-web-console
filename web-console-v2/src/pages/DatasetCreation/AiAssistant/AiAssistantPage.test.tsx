/**
 * The preview's own rendering is covered by `PreviewPane.test.tsx` and
 * `AllConfigurations.focus.test.tsx`. Here both panes are stubbed so these
 * tests can assert the one thing only the page owns: that an action dispatched
 * in the chat reaches the preview.
 */
jest.mock('pages/DatasetCreation/PreviewAndSave/AllConfigurations', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div
      data-testid="all-configurations"
      data-focus-section={String(props.focusSection ?? '')}
      data-changed-refs={((props.changedRefs as string[]) ?? []).join(',')}
    />
  ),
}));

jest.mock('./ChatPane', () => ({
  __esModule: true,
  default: ({
    datasetId,
    onAction,
    busy,
  }: {
    datasetId: string | null;
    onAction?: (action: Record<string, unknown>) => void;
    busy?: boolean;
  }) => (
    // `data-busy` mirrors what the real pane uses to disable its composer:
    // the assistant refuses to act before the session can record the turn,
    // so a test has to wait for readiness just as a user would.
    <div data-busy={busy ? 'true' : 'false'}>
      <span>{datasetId ?? 'New dataset'}</span>
      <button
        type="button"
        onClick={() =>
          onAction?.({
            kind: 'set_data_type',
            path: 'total_amount',
            dataType: 'string',
          })
        }
      >
        dispatch
      </button>
    </div>
  ),
}));

// The executor is stubbed, not the assistant: the point of these tests is
// that the real wiring carries a card's action to the executor and the
// resulting change back to the preview.
jest.mock('./engine/executor', () => ({
  ...jest.requireActual('./engine/executor'),
  executeAction: jest.fn(),
}));

jest.mock('services/dataset', () => ({
  ...jest.requireActual('services/dataset'),
  useFetchDatasetsById: jest.fn(),
  getAllFields: jest.fn(),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getAllFields, useFetchDatasetsById } from 'services/dataset';
import AiAssistantPage from './AiAssistantPage';
import { executeAction } from './engine/executor';

// CRA's jest config sets `resetMocks`, so the implementation has to be given
// per test rather than in the mock factory.
beforeEach(() => {
  sessionStorage.clear();

  (
    useFetchDatasetsById as jest.MockedFunction<typeof useFetchDatasetsById>
  ).mockReturnValue({
    data: undefined,
    isPending: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  (getAllFields as jest.MockedFunction<typeof getAllFields>)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockResolvedValue({ data: [[]] } as any);

  (
    executeAction as jest.MockedFunction<typeof executeAction>
  ).mockResolvedValue({
    ok: true,
    status: 'applied',
    dataset: {},
    changedRefs: ['properties.total_amount'],
  });
});

const renderAt = (path: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dataset/ai/:datasetId" element={<AiAssistantPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const configurations = () => screen.getByTestId('all-configurations');

/** The assistant refuses to act until the session can record the turn. */
const waitUntilReady = () =>
  waitFor(() =>
    expect(document.querySelector('[data-busy="false"]')).toBeInTheDocument(),
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

    expect(screen.getAllByText(/new dataset/i).length).toBeGreaterThan(0);
  });

  it('shows the dataset id when resuming an existing draft', () => {
    renderAt('/dataset/ai/claude-probe-orders');

    expect(screen.getAllByText('claude-probe-orders').length).toBeGreaterThan(
      0,
    );
  });

  it('renders no configuration panels before a draft exists', () => {
    renderAt('/dataset/ai/%3Cnew%3E');

    expect(screen.queryByTestId('all-configurations')).not.toBeInTheDocument();
  });
});

/** T11's acceptance criterion, end to end through the real wiring. */
describe('an action dispatched in the chat moves the preview', () => {
  it('sends the action to the executor', async () => {
    renderAt('/dataset/ai/my-orders');
    await waitUntilReady();

    await userEvent.click(screen.getByRole('button', { name: 'dispatch' }));

    await waitFor(() =>
      expect(executeAction).toHaveBeenCalledWith(
        { kind: 'set_data_type', path: 'total_amount', dataType: 'string' },
        expect.objectContaining({ datasetId: 'my-orders' }),
      ),
    );
  });

  it('opens the accordion the action belongs to', async () => {
    renderAt('/dataset/ai/my-orders');
    await waitUntilReady();

    expect(configurations()).toHaveAttribute('data-focus-section', '');

    await userEvent.click(screen.getByRole('button', { name: 'dispatch' }));

    await waitFor(() =>
      expect(configurations()).toHaveAttribute(
        'data-focus-section',
        'ingestion',
      ),
    );
  });

  it('flashes the field the server reported as changed', async () => {
    renderAt('/dataset/ai/my-orders');
    await waitUntilReady();

    await userEvent.click(screen.getByRole('button', { name: 'dispatch' }));

    await waitFor(() =>
      expect(configurations()).toHaveAttribute(
        'data-changed-refs',
        'properties.total_amount',
      ),
    );
  });
});
