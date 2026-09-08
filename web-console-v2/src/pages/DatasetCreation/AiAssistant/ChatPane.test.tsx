import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ChatPane, { ChatPaneProps } from './ChatPane';
import { AiSession, Message } from './session/types';

const NOW = 1_700_000_000_000;

const message = (overrides: Partial<Message> = {}): Message => ({
  id: 'm1',
  role: 'user',
  text: 'call it My Orders',
  createdAt: NOW,
  ...overrides,
});

const session = (overrides: Partial<AiSession> = {}): AiSession => ({
  sessionId: 'session-1',
  datasetId: 'orders',
  pending: {},
  mode: 'create',
  step: 'schema',
  messages: [message()],
  sampleRows: [],
  sampleExpiresAt: null,
  lastVersionKey: null,
  modelTier: 0,
  connectorConfigured: false,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const show = (props: Partial<ChatPaneProps> = {}) =>
  render(
    <MemoryRouter>
      <ChatPane
        datasetId={null}
        messages={[]}
        loading={false}
        persisting
        resumable={[]}
        {...props}
      />
    </MemoryRouter>,
  );

describe('while the conversation is being restored', () => {
  it('says so rather than showing an empty transcript', () => {
    show({ loading: true });

    expect(screen.getByRole('status')).toHaveTextContent(/restoring/i);
  });

  it('does not offer the empty-state hint yet', () => {
    show({ loading: true });

    expect(screen.queryByText(/drop a sample/i)).not.toBeInTheDocument();
  });
});

describe('an empty conversation', () => {
  it('explains how to start', () => {
    show();

    expect(screen.getByText(/drop a sample/i)).toBeInTheDocument();
  });

  it('says it is resuming when there is already a draft', () => {
    show({ datasetId: 'orders' });

    expect(screen.getByText(/resuming this draft/i)).toBeInTheDocument();
  });
});

describe('the transcript', () => {
  it('shows what was said, in order', () => {
    show({
      messages: [
        message({ id: 'm1', role: 'user', text: 'first' }),
        message({ id: 'm2', role: 'assistant', text: 'second' }),
      ],
    });

    const said = screen
      .getAllByRole('listitem')
      .map((item) => item.textContent);

    expect(said[0]).toContain('first');
    expect(said[1]).toContain('second');
  });

  it('distinguishes who said what', () => {
    show({ messages: [message({ role: 'assistant', text: 'Named it.' })] });

    expect(screen.getByRole('listitem')).toHaveAttribute(
      'data-role',
      'assistant',
    );
  });

  it('marks a turn whose action was rejected', () => {
    show({
      messages: [
        message({
          role: 'assistant',
          text: 'Unknown field "custmer_id"',
          failureCode: 'UNKNOWN_FIELD',
        }),
      ],
    });

    expect(screen.getByRole('listitem')).toHaveAttribute('data-failed', 'true');
  });

  it('does not mark a turn that succeeded', () => {
    show({ messages: [message({ role: 'assistant', text: 'Named it.' })] });

    expect(screen.getByRole('listitem')).not.toHaveAttribute('data-failed');
  });

  it('hides the empty-state hint once there are turns', () => {
    show({ messages: [message()] });

    expect(screen.queryByText(/drop a sample/i)).not.toBeInTheDocument();
  });
});

describe('resuming an earlier conversation', () => {
  it('offers it when the current one is empty', () => {
    show({ resumable: [session()] });

    expect(screen.getByRole('link', { name: 'orders' })).toBeInTheDocument();
  });

  /** Mid-conversation, a list of other conversations is only clutter. */
  it('does not offer it once this conversation has started', () => {
    show({ messages: [message()], resumable: [session()] });

    expect(
      screen.queryByRole('link', { name: 'orders' }),
    ).not.toBeInTheDocument();
  });

  it('passes the clear request through', async () => {
    const onClearSession = jest.fn();
    show({ resumable: [session()], onClearSession });

    await userEvent.click(
      screen.getByRole('button', { name: /clear conversation for orders/i }),
    );

    expect(onClearSession).toHaveBeenCalledWith('session-1');
  });
});

/**
 * Private browsing can refuse IndexedDB. The conversation still works, but
 * saying nothing would let the user lose it on reload without warning.
 */
describe('when the conversation is not being saved', () => {
  it('warns that it will be lost on reload', () => {
    show({ persisting: false });

    expect(screen.getByRole('alert')).toHaveTextContent(/not saving/i);
  });

  it('stays quiet when it is being saved', () => {
    show({ persisting: true });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

/**
 * Attaching a sample is the step that creates the draft, so it has to be
 * reachable before anything else has happened. Nothing else in the flow
 * produces a file-drop card, so without this the dataset could never be
 * created at all.
 */
describe('starting a dataset', () => {
  it('offers a way to supply a sample when the conversation is empty', () => {
    show();

    expect(screen.getByLabelText(/choose a sample file/i)).toBeInTheDocument();
  });

  it('accepts pasted JSON too', () => {
    show();

    expect(screen.getByLabelText(/paste json/i)).toBeInTheDocument();
  });

  it('reports the rows it parsed', async () => {
    const onSampleRows = jest.fn();
    show({ onSampleRows });

    await userEvent.upload(
      screen.getByLabelText(/choose a sample file/i),
      new File(['[{"order_id":"ORD-1"}]'], 'orders.json', {
        type: 'application/json',
      }),
    );

    await waitFor(() => expect(onSampleRows).toHaveBeenCalled());
  });

  /** Once a draft exists the schema is already detected. */
  it('does not offer it once the draft exists', () => {
    show({ datasetId: 'orders' });

    expect(
      screen.queryByLabelText(/choose a sample file/i),
    ).not.toBeInTheDocument();
  });

  /**
   * Found by driving the real UI: naming the dataset first put a message in
   * the transcript, which hid the empty state — and with it the only way to
   * attach a sample. The flow dead-ended with no route to creating a draft.
   */
  it('keeps offering it after the conversation has started', () => {
    show({ messages: [message()] });

    expect(screen.getByLabelText(/choose a sample file/i)).toBeInTheDocument();
  });
});
