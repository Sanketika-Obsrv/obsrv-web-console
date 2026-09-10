import { fireEvent, render, screen } from '@testing-library/react';
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

    expect(screen.queryByText(/paste a sample/i)).not.toBeInTheDocument();
  });
});

describe('an empty conversation', () => {
  it('explains how to start', () => {
    show();

    expect(screen.getByText(/paste a sample/i)).toBeInTheDocument();
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

    expect(screen.queryByText(/paste a sample/i)).not.toBeInTheDocument();
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
 * Attaching a sample is the step that creates the draft, and it arrives the
 * way every other step does: the assistant asks, and its question carries
 * the drop card.
 *
 * There used to be a standing drop card here as well, from when nothing
 * asked for a sample and the user had to know to supply one. Driving the
 * real UI showed what it costs now — a second copy of the same control under
 * every question, offered at the *name* question, where attaching a sample
 * is refused for want of a name. That is the failure the agenda exists to
 * remove, still being staged by the pane.
 */
/**
 * A sample arrives by dropping the file on the conversation or pasting it
 * into the box. The drop card is gone: it was the last control in the
 * transcript with a button on it, and a standing copy of it used to be
 * offered at the *name* question, where attaching a sample is refused for
 * want of a name.
 */
describe('supplying a sample', () => {
  const drop = (file: File) => {
    const pane = screen.getByLabelText(/conversation/i);

    fireEvent.drop(pane, { dataTransfer: { files: [file] } });
  };

  const orders = () =>
    new File(['[{"order_id":"ORD-1"}]'], 'orders.json', {
      type: 'application/json',
    });

  it('hands a dropped file up, wherever in the pane it lands', () => {
    const onSampleFile = jest.fn();
    show({ onSampleFile });

    drop(orders());

    expect(onSampleFile).toHaveBeenCalledWith(expect.any(File));
  });

  it('says a file can be dropped while one is being dragged over', () => {
    show({ onSampleFile: jest.fn() });

    fireEvent.dragOver(screen.getByLabelText(/conversation/i), {
      dataTransfer: { types: ['Files'] },
    });

    expect(screen.getByText(/drop it/i)).toBeInTheDocument();
  });

  it('offers no file picker anywhere', () => {
    show({ messages: [message()], onSampleFile: jest.fn() });

    expect(
      screen.queryByLabelText(/choose a sample file/i),
    ).not.toBeInTheDocument();
  });
});

describe('exporting the action trail', () => {
  it('is offered once there is a conversation to export', async () => {
    const onExportTrail = jest.fn();
    show({ messages: [message()], onExportTrail });

    await userEvent.click(
      screen.getByRole('button', { name: /export the action trail/i }),
    );

    expect(onExportTrail).toHaveBeenCalled();
  });

  it('is not offered before anything has been said', () => {
    show({ messages: [], onExportTrail: jest.fn() });

    expect(
      screen.queryByRole('button', { name: /export the action trail/i }),
    ).not.toBeInTheDocument();
  });
});

/**
 * The model is required, so the conversation waits for it.
 *
 * Not the whole page: the preview and its "Edit in the wizard" link are up
 * from the first paint, which is what makes waiting tolerable and what
 * answers a browser that cannot run the model at all.
 */
describe('waiting for the model', () => {
  const loading = {
    ready: false,
    cached: false,
    onRetry: jest.fn(),
    progress: { progress: 0.4, text: 'Fetching param cache' },
  };

  it('reports the load instead of taking instructions', () => {
    show({ model: loading });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: /message/i }),
    ).not.toBeInTheDocument();
  });

  it('does not show a transcript it cannot answer', () => {
    show({ model: loading, messages: [message()] });

    expect(screen.queryByText('call it My Orders')).not.toBeInTheDocument();
  });

  it('takes instructions once the model is running', () => {
    show({ model: { ready: true, cached: true, onRetry: jest.fn() } });

    expect(
      screen.getByRole('textbox', { name: /message/i }),
    ).toBeInTheDocument();
  });

  it('explains a model that cannot load, and still takes nothing', () => {
    show({
      model: {
        ready: false,
        cached: false,
        onRetry: jest.fn(),
        error: 'This browser has no WebGPU.',
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/WebGPU/);
    expect(
      screen.queryByRole('textbox', { name: /message/i }),
    ).not.toBeInTheDocument();
  });
});
