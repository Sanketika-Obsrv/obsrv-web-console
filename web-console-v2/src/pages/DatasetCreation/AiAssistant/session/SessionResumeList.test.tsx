import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SessionResumeList from './SessionResumeList';
import { AiSession } from './types';

const NOW = 1_700_000_000_000;

const session = (overrides: Partial<AiSession> = {}): AiSession => ({
  sessionId: 'session-1',
  datasetId: 'my-orders',
  mode: 'create',
  step: 'schema',
  messages: [],
  sampleRows: [],
  sampleExpiresAt: null,
  lastVersionKey: null,
  modelTier: 0,
  connectorConfigured: false,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const show = (
  sessions: AiSession[],
  onClear: (sessionId: string) => void = jest.fn(),
) =>
  render(
    <MemoryRouter>
      <SessionResumeList
        sessions={sessions}
        currentSessionId="session-current"
        onClear={onClear}
        now={NOW}
      />
    </MemoryRouter>,
  );

describe('with nothing to resume', () => {
  it('renders nothing rather than an empty heading', () => {
    const { container } = show([]);

    expect(container).toBeEmptyDOMElement();
  });

  it('ignores a session that has no turns yet', () => {
    const { container } = show([session({ messages: [] })]);

    expect(container).toBeEmptyDOMElement();
  });

  it('ignores the conversation currently open', () => {
    const { container } = show([
      session({
        sessionId: 'session-current',
        messages: [{ id: 'm1', role: 'user', text: 'hello', createdAt: NOW }],
      }),
    ]);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('with earlier conversations', () => {
  const withTurns = (overrides: Partial<AiSession> = {}) =>
    session({
      messages: [
        { id: 'm1', role: 'user', text: 'call it My Orders', createdAt: NOW },
        { id: 'm2', role: 'assistant', text: 'Named it.', createdAt: NOW },
      ],
      ...overrides,
    });

  it('names the draft the conversation belongs to', () => {
    show([withTurns()]);

    expect(screen.getByText('my-orders')).toBeInTheDocument();
  });

  it('links to that draft so the conversation reopens', () => {
    show([withTurns()]);

    expect(screen.getByRole('link', { name: /my-orders/ })).toHaveAttribute(
      'href',
      '/dataset/ai/my-orders',
    );
  });

  /** A conversation abandoned before `datasets/create` has no draft to link. */
  it('describes an unattached conversation without pretending it has a draft', () => {
    show([withTurns({ datasetId: null })]);

    expect(screen.getByText(/not created yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says how far the conversation got', () => {
    show([withTurns({ step: 'storage' })]);

    expect(screen.getByText(/storage/i)).toBeInTheDocument();
  });

  it('says how many turns it holds', () => {
    show([withTurns()]);

    expect(screen.getByText(/2 messages/i)).toBeInTheDocument();
  });

  it('uses the singular for one turn', () => {
    show([
      withTurns({
        messages: [{ id: 'm1', role: 'user', text: 'hi', createdAt: NOW }],
      }),
    ]);

    expect(screen.getByText(/1 message(?!s)/i)).toBeInTheDocument();
  });

  it('lists every resumable conversation', () => {
    show([
      withTurns({ sessionId: 'a', datasetId: 'orders' }),
      withTurns({ sessionId: 'b', datasetId: 'payments' }),
    ]);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('clearing a conversation', () => {
  const withTurns = () =>
    session({
      messages: [{ id: 'm1', role: 'user', text: 'hi', createdAt: NOW }],
    });

  it('asks the caller to clear the one that was chosen', async () => {
    const onClear = jest.fn();
    show([withTurns()], onClear);

    await userEvent.click(
      screen.getByRole('button', { name: /clear conversation for my-orders/i }),
    );

    expect(onClear).toHaveBeenCalledWith('session-1');
  });

  it('names the draft in the control, so the label is unambiguous', () => {
    show([withTurns()]);

    expect(
      screen.getByRole('button', { name: /clear conversation for my-orders/i }),
    ).toBeInTheDocument();
  });
});
