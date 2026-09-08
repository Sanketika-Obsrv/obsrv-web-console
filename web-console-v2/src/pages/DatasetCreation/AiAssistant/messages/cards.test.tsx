import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Action } from '../engine/actions';
import { diagnose } from '../engine/errorMap';
import ApiErrorCard from './ApiErrorCard';
import ChoiceCard from './ChoiceCard';
import ConfirmCard from './ConfirmCard';
import ConflictCard from './ConflictCard';
import ExpressionResultCard from './ExpressionResultCard';
import FieldTableCard from './FieldTableCard';
import SamplePreviewCard from './SamplePreviewCard';

const noop = () => undefined;

describe('ChoiceCard', () => {
  const options = [
    {
      label: 'Drop duplicates',
      action: { kind: 'set_dedup', enabled: true, key: 'order_id' } as Action,
      hint: 'order_id is unique in the sample',
    },
    {
      label: 'Keep duplicates',
      action: { kind: 'set_dedup', enabled: false } as Action,
    },
  ];

  it('offers every option as a button', () => {
    render(
      <ChoiceCard prompt="Deduplicate?" options={options} onAction={noop} />,
    );

    expect(
      screen.getByRole('button', { name: /drop duplicates/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /keep duplicates/i }),
    ).toBeInTheDocument();
  });

  it('dispatches the action for the option chosen', async () => {
    const onAction = jest.fn();
    render(<ChoiceCard options={options} onAction={onAction} />);

    await userEvent.click(
      screen.getByRole('button', { name: /drop duplicates/i }),
    );

    expect(onAction).toHaveBeenCalledWith(options[0].action);
  });

  it('shows the reason behind an option', () => {
    render(<ChoiceCard options={options} onAction={noop} />);

    expect(
      screen.getByText(/order_id is unique in the sample/i),
    ).toBeInTheDocument();
  });

  it('stops offering choices once one has been taken', async () => {
    const { rerender } = render(
      <ChoiceCard options={options} onAction={noop} />,
    );

    rerender(<ChoiceCard options={options} onAction={noop} answered />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('says which option was taken', () => {
    render(
      <ChoiceCard
        options={options}
        onAction={noop}
        answered
        chosenLabel="Drop duplicates"
      />,
    );

    expect(screen.getByText(/drop duplicates/i)).toBeInTheDocument();
  });
});

describe('ConfirmCard', () => {
  const save = { kind: 'save' } as Action;

  it('summarises what is about to happen', () => {
    render(
      <ConfirmCard
        title="Save this dataset?"
        summary={['Dedup on order_id', 'Real-time Store']}
        confirmAction={save}
        onAction={noop}
      />,
    );

    expect(screen.getByText('Save this dataset?')).toBeInTheDocument();
    expect(screen.getByText('Dedup on order_id')).toBeInTheDocument();
    expect(screen.getByText('Real-time Store')).toBeInTheDocument();
  });

  it('dispatches the action on confirm', async () => {
    const onAction = jest.fn();
    render(
      <ConfirmCard
        title="Save this dataset?"
        confirmAction={save}
        onAction={onAction}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(onAction).toHaveBeenCalledWith(save);
  });

  it('dispatches nothing when cancelled', async () => {
    const onAction = jest.fn();
    const onCancel = jest.fn();
    render(
      <ConfirmCard
        title="Save this dataset?"
        confirmAction={save}
        onAction={onAction}
        onCancel={onCancel}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onAction).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('uses the label it is given for the confirming button', () => {
    render(
      <ConfirmCard
        title="Delete the draft?"
        confirmLabel="Delete draft"
        confirmAction={save}
        onAction={noop}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Delete draft' }),
    ).toBeInTheDocument();
  });
});

/**
 * The API recommends a type and reports how many values it observed as each.
 * Where the recommendation would narrow observed values, saying so is the
 * whole point of the card — that advice appears nowhere in the wizard.
 */
describe('ConflictCard', () => {
  const candidates = [
    { dataType: 'double' as const, count: 108, isSafest: true },
    { dataType: 'string' as const, count: 12, isRecommended: true },
  ];

  it('names the field in conflict', () => {
    render(
      <ConflictCard
        path="total_amount"
        candidates={candidates}
        onAction={noop}
      />,
    );

    expect(screen.getByText(/total_amount/)).toBeInTheDocument();
  });

  it('shows the observed count for each candidate', () => {
    render(
      <ConflictCard
        path="total_amount"
        candidates={candidates}
        onAction={noop}
      />,
    );

    expect(screen.getByText(/108/)).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it('marks which one the API recommends', () => {
    render(
      <ConflictCard
        path="total_amount"
        candidates={candidates}
        onAction={noop}
      />,
    );

    expect(screen.getByText(/recommended/i)).toBeInTheDocument();
  });

  it('marks the candidate that can hold every observed value', () => {
    render(
      <ConflictCard
        path="total_amount"
        candidates={candidates}
        onAction={noop}
      />,
    );

    expect(screen.getByText(/holds every value/i)).toBeInTheDocument();
  });

  it('warns how many values the recommendation would narrow', () => {
    render(
      <ConflictCard
        path="total_amount"
        candidates={candidates}
        valuesAtRisk={108}
        onAction={noop}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/108/);
  });

  it('stays quiet when the recommendation loses nothing', () => {
    render(
      <ConflictCard
        path="total_amount"
        candidates={candidates}
        onAction={noop}
      />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('resolves the conflict with the type chosen', async () => {
    const onAction = jest.fn();
    render(
      <ConflictCard
        path="total_amount"
        candidates={candidates}
        onAction={onAction}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /double/i }));

    expect(onAction).toHaveBeenCalledWith({
      kind: 'resolve_conflict',
      path: 'total_amount',
      mode: 'apply',
      dataType: 'double',
    });
  });

  /**
   * An unresolved conflict blocks the save, so there has to be a way out that
   * does not change the type — dismissing keeps whatever the API decided.
   */
  it('can dismiss the conflict without changing the type', async () => {
    const onAction = jest.fn();
    render(
      <ConflictCard
        path="total_amount"
        candidates={candidates}
        onAction={onAction}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /keep the current type/i }),
    );

    expect(onAction).toHaveBeenCalledWith({
      kind: 'resolve_conflict',
      path: 'total_amount',
      mode: 'dismiss',
    });
  });

  it('offers every candidate, not only the recommendation', () => {
    render(
      <ConflictCard
        path="total_amount"
        candidates={candidates}
        onAction={noop}
      />,
    );

    expect(screen.getByRole('button', { name: /double/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /string/i })).toBeInTheDocument();
  });
});

describe('FieldTableCard', () => {
  const fields = [
    {
      path: 'order_id',
      dataType: 'string',
      arrivalFormat: 'text',
      required: true,
    },
    { path: 'customer.email', dataType: 'string', arrivalFormat: 'text' },
  ];

  it('lists each field with its types', () => {
    render(<FieldTableCard fields={fields} />);

    expect(screen.getByText('order_id')).toBeInTheDocument();
    expect(screen.getByText('customer.email')).toBeInTheDocument();
    expect(screen.getAllByText('string')).toHaveLength(2);
  });

  it('marks which fields are required', () => {
    render(<FieldTableCard fields={fields} />);

    const rows = screen.getAllByRole('row');

    expect(rows[1]).toHaveTextContent(/required/i);
    expect(rows[2]).not.toHaveTextContent(/required/i);
  });

  it('says so rather than rendering an empty table', () => {
    render(<FieldTableCard fields={[]} />);

    expect(screen.getByText(/no fields/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('SamplePreviewCard', () => {
  const rows = [
    { order_id: 'ORD-1', total_amount: 263.37 },
    { order_id: 'ORD-2', total_amount: 12 },
  ];

  it('shows the values from the sample', () => {
    render(<SamplePreviewCard rows={rows} totalRows={2} />);

    expect(screen.getByText('ORD-1')).toBeInTheDocument();
    expect(screen.getByText('263.37')).toBeInTheDocument();
  });

  it('says how many rows the sample holds', () => {
    render(<SamplePreviewCard rows={rows.slice(0, 1)} totalRows={120} />);

    expect(screen.getByText(/120 rows/i)).toBeInTheDocument();
  });

  it('is honest that it is showing only some of them', () => {
    render(<SamplePreviewCard rows={rows.slice(0, 1)} totalRows={120} />);

    expect(screen.getByText(/showing 1/i)).toBeInTheDocument();
  });

  it('renders a nested value without crashing', () => {
    render(
      <SamplePreviewCard
        rows={[{ customer: { email: 'a@x.com' } }]}
        totalRows={1}
      />,
    );

    expect(screen.getByText(/a@x.com/)).toBeInTheDocument();
  });

  it('shows an empty cell for a field this row lacks', () => {
    render(
      <SamplePreviewCard
        rows={[{ order_id: 'ORD-1' }, { coupon: 'SAVE10' }]}
        totalRows={2}
      />,
    );

    // The union of keys becomes the columns, as the merge step does.
    expect(screen.getByText('coupon')).toBeInTheDocument();
    expect(screen.getByText('order_id')).toBeInTheDocument();
  });
});

describe('ExpressionResultCard', () => {
  it('shows the expression under test', () => {
    render(
      <ExpressionResultCard
        expression="$split(customer.email, '@')[1]"
        dataType="string"
        results={[{ input: 'a@x.com', output: 'x.com' }]}
      />,
    );

    expect(
      screen.getByText("$split(customer.email, '@')[1]"),
    ).toBeInTheDocument();
  });

  it('shows what it produced from the sample', () => {
    render(
      <ExpressionResultCard
        expression="x"
        results={[{ input: 'a@x.com', output: 'x.com' }]}
      />,
    );

    expect(screen.getByText('x.com')).toBeInTheDocument();
  });

  it('reports the datatype it inferred', () => {
    render(
      <ExpressionResultCard expression="x" dataType="string" results={[]} />,
    );

    expect(screen.getByText(/string/)).toBeInTheDocument();
  });

  /** An expression that will not evaluate must never reach the API. */
  it('shows the error instead of a result', () => {
    render(
      <ExpressionResultCard
        expression="$nope("
        error="Unexpected end of expression"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      /unexpected end of expression/i,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

/**
 * The failure this replaces is a storage step that silently did nothing, so
 * the card has to carry both the explanation and a working retry.
 */
describe('ApiErrorCard', () => {
  const unsupported = diagnose({
    code: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
    error:
      'The storage type "lake_house" is not available. Please use one of the available storage types: realtime_store',
  });

  it('explains the failure in the console’s own wording', () => {
    render(<ApiErrorCard diagnosis={unsupported} onAction={noop} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /does not have Data Lakehouse \(Hudi\)/,
    );
  });

  it('offers the retry the diagnosis derived', async () => {
    const onAction = jest.fn();
    render(<ApiErrorCard diagnosis={unsupported} onAction={onAction} />);

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(onAction).toHaveBeenCalledWith(unsupported.retryAction);
  });

  it('offers no retry when none could be derived', () => {
    render(
      <ApiErrorCard
        diagnosis={diagnose({ code: 'WAT', error: 'Something went wrong' })}
        onAction={noop}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /retry/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps the server’s own message available without leading with it', async () => {
    render(<ApiErrorCard diagnosis={unsupported} onAction={noop} />);

    expect(screen.queryByText(/lake_house/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /details/i }));

    expect(screen.getByText(/lake_house/)).toBeInTheDocument();
  });

  it('says a concurrent edit is being handled rather than blaming the user', () => {
    render(
      <ApiErrorCard
        diagnosis={diagnose({
          code: 'DATASET_OUTDATED',
          error: 'The dataset is outdated.',
        })}
        onAction={noop}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/changed/i);
  });

  it('prompts a sign-in when the session has gone', () => {
    render(
      <ApiErrorCard
        diagnosis={diagnose({
          code: 'SESSION_EXPIRED',
          error: 'The response was the login page',
        })}
        onAction={noop}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/sign in/i);
  });
});
