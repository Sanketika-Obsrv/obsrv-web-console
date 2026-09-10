import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { diagnose } from '../engine/errorMap';
import { Message } from '../session/types';
import MessageList from './MessageList';
import { CardKind, MessageCard } from './types';

const NOW = 1_700_000_000_000;

const message = (overrides: Partial<Message> = {}): Message => ({
  id: 'm1',
  role: 'assistant',
  text: 'Here you go.',
  createdAt: NOW,
  ...overrides,
});

const show = (messages: Message[]) =>
  render(<MessageList messages={messages} />);

const withCard = (card: MessageCard, overrides: Partial<Message> = {}) =>
  message({ ...overrides, card } as Partial<Message>);

describe('plain turns', () => {
  it('renders what was said', () => {
    show([message({ text: 'Named it My Orders.' })]);

    expect(screen.getByText('Named it My Orders.')).toBeInTheDocument();
  });

  it('says who said it', () => {
    show([message({ role: 'user', text: 'call it My Orders' })]);

    expect(screen.getByRole('listitem')).toHaveAttribute('data-role', 'user');
  });

  it('marks a turn whose action was rejected', () => {
    show([message({ failureCode: 'UNKNOWN_FIELD', text: 'No such field' })]);

    expect(screen.getByRole('listitem')).toHaveAttribute('data-failed', 'true');
  });

  it('renders nothing for an empty transcript', () => {
    const { container } = render(<MessageList messages={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('cards', () => {
  it('renders a choice card as the answers it will take', () => {
    show([
      withCard({
        kind: 'choice',
        prompt: 'Use a connector?',
        options: [
          { label: 'Skip for now', action: { kind: 'skip_connector' } },
        ],
      }),
    ]);

    expect(screen.getByText('Skip for now')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a confirm card without anything to press', () => {
    show([
      withCard({
        kind: 'confirm',
        title: 'Save this dataset?',
        confirmAction: { kind: 'save' },
      }),
    ]);

    expect(screen.getByText('Save this dataset?')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a conflict card with its counts', () => {
    show([
      withCard({
        kind: 'conflict',
        path: 'total_amount',
        candidates: [{ dataType: 'double', count: 108 }],
      }),
    ]);

    expect(screen.getByText(/108/)).toBeInTheDocument();
  });

  it('renders a field table', () => {
    show([
      withCard({
        kind: 'field_table',
        fields: [{ path: 'order_id', dataType: 'string' }],
      }),
    ]);

    expect(screen.getByText('order_id')).toBeInTheDocument();
  });

  it('renders a sample preview', () => {
    show([
      withCard({
        kind: 'sample_preview',
        rows: [{ order_id: 'ORD-1' }],
        totalRows: 1,
      }),
    ]);

    expect(screen.getByText('ORD-1')).toBeInTheDocument();
  });

  it('renders an expression result', () => {
    show([
      withCard({
        kind: 'expression_result',
        expression: 'order_id',
        results: [{ input: 'ORD-1', output: 'ORD-1' }],
      }),
    ]);

    expect(screen.getAllByText('ORD-1').length).toBeGreaterThan(0);
  });

  it('renders an API error and says how to re-send it', () => {
    const diagnosis = diagnose({
      code: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
      error:
        'The storage type "lake_house" is not available. Please use one of the available storage types: realtime_store',
    });
    show([withCard({ kind: 'api_error', diagnosis })]);

    expect(screen.getByRole('alert')).toHaveTextContent(/try again/i);
  });

  /**
   * Every card kind must be reachable. This fails when a kind is added to
   * the union without a renderer.
   */
  it('has a renderer for every card kind', () => {
    const samples: Record<CardKind, MessageCard> = {
      choice: { kind: 'choice', options: [] },
      confirm: {
        kind: 'confirm',
        title: 'x',
        confirmAction: { kind: 'save' },
      },
      conflict: { kind: 'conflict', path: 'a', candidates: [] },
      field_table: { kind: 'field_table', fields: [] },
      sample_preview: { kind: 'sample_preview', rows: [], totalRows: 0 },
      expression_result: { kind: 'expression_result', expression: 'a' },
      api_error: {
        kind: 'api_error',
        diagnosis: diagnose({ code: 'WAT', error: 'x' }),
      },
      secret_form: {
        kind: 'secret_form',
        connectorId: 'postgres-connector-1.0.0',
      },
    };

    Object.entries(samples).forEach(([kind, card]) => {
      const { unmount } = render(
        <MessageList messages={[withCard(card, { id: kind })]} />,
      );

      expect(screen.getByTestId(`card-${kind}`)).toBeInTheDocument();
      unmount();
    });
  });
});

/**
 * The credential form is the one thing left in the transcript with a button
 * on it, and its credentials travel through their own callback: an action is
 * recorded in the transcript, and a password must not be.
 */
describe('a secret form card', () => {
  it('hands credentials to the secrets callback', async () => {
    const onSubmitSecrets = jest.fn();

    render(
      <MessageList
        messages={[
          withCard({
            kind: 'secret_form',
            connectorId: 'postgres-connector-1.0.0',
            connectorName: 'Postgres',
          }),
        ]}
        onSubmitSecrets={onSubmitSecrets}
        connectorUiSpec={{
          type: 'object',
          properties: {
            source_database_pwd: {
              type: 'string',
              title: 'Password',
              format: 'password',
            },
          },
        }}
      />,
    );

    await userEvent.type(screen.getByLabelText(/password/i), 'hunter2');
    await userEvent.click(
      screen.getByRole('button', { name: /save credentials/i }),
    );

    expect(onSubmitSecrets).toHaveBeenCalledWith(
      expect.objectContaining({ source_database_pwd: 'hunter2' }),
    );
  });
});
