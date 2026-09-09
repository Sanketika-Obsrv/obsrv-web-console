import { AgendaStepId } from './actions';
import { Prompt } from './agenda';
import { answerTo } from './answer';
import { ChoiceOption } from '../messages/types';

const choicePrompt = (step: AgendaStepId, options: ChoiceOption[]): Prompt => ({
  step,
  text: 'question',
  card: { kind: 'choice', prompt: 'pick', options },
});

const PII: Prompt = choicePrompt('pii', [
  {
    label: 'Mask it',
    action: {
      kind: 'set_pii',
      path: 'customer.email',
      action: 'mask',
      skipOnFailure: true,
    },
  },
  {
    label: 'Encrypt it',
    action: {
      kind: 'set_pii',
      path: 'customer.email',
      action: 'encrypt',
      skipOnFailure: true,
    },
  },
  {
    label: 'Leave it',
    action: { kind: 'skip_step', step: 'pii', path: 'customer.email' },
  },
]);

const STORAGE: Prompt = choicePrompt('storage', [
  { label: 'Real-time store', action: { kind: 'set_storage', realtime: true } },
  { label: 'Lakehouse', action: { kind: 'set_storage', lakehouse: true } },
  {
    label: 'Both',
    action: { kind: 'set_storage', realtime: true, lakehouse: true },
  },
]);

const KEYS: Prompt = choicePrompt('keys', [
  { label: 'order_ts', action: { kind: 'set_keys', timestamp: 'order_ts' } },
  {
    label: 'shipped_at',
    action: { kind: 'set_keys', timestamp: 'shipped_at' },
  },
  {
    label: 'Event Arrival Time',
    action: { kind: 'set_keys', timestamp: 'Event Arrival Time' },
  },
]);

const DEDUP: Prompt = choicePrompt('dedup', [
  {
    label: 'order_id',
    action: { kind: 'set_dedup', enabled: true, key: 'order_id' },
  },
  { label: 'Keep duplicates', action: { kind: 'skip_step', step: 'dedup' } },
]);

const NAME: Prompt = {
  step: 'name',
  text: 'What would you like to call this dataset?',
};

describe('answering a choice question', () => {
  it('takes the option the answer names', () => {
    expect(answerTo(PII, 'mask it')).toEqual({
      kind: 'set_pii',
      path: 'customer.email',
      action: 'mask',
      skipOnFailure: true,
    });
  });

  it('does not need the whole label', () => {
    expect(answerTo(PII, 'encrypt')).toMatchObject({ action: 'encrypt' });
    expect(answerTo(STORAGE, 'lakehouse')).toEqual({
      kind: 'set_storage',
      lakehouse: true,
    });
    expect(answerTo(STORAGE, 'both please')).toEqual({
      kind: 'set_storage',
      realtime: true,
      lakehouse: true,
    });
  });

  it('reads a field name as the option carrying it', () => {
    expect(answerTo(KEYS, 'order_ts')).toEqual({
      kind: 'set_keys',
      timestamp: 'order_ts',
    });
    expect(answerTo(DEDUP, 'drop them, key is order_id')).toEqual({
      kind: 'set_dedup',
      enabled: true,
      key: 'order_id',
    });
  });

  it('matches a multi-word label loosely', () => {
    expect(answerTo(STORAGE, 'the real time store')).toEqual({
      kind: 'set_storage',
      realtime: true,
    });
    expect(answerTo(KEYS, 'use the arrival time')).toEqual({
      kind: 'set_keys',
      timestamp: 'Event Arrival Time',
    });
  });

  it('reads a plain no as the option that declines', () => {
    expect(answerTo(DEDUP, 'no')).toEqual({ kind: 'skip_step', step: 'dedup' });
    expect(answerTo(DEDUP, 'not now thanks')).toEqual({
      kind: 'skip_step',
      step: 'dedup',
    });
    expect(answerTo(PII, 'leave it alone')).toEqual({
      kind: 'skip_step',
      step: 'pii',
      path: 'customer.email',
    });
  });

  /**
   * A label that begins with "no" is still a label. Missed first time, and
   * found by the end-to-end walkthrough: the transform question offers "No
   * transformations", the negation guard swallowed it, and the agenda asked
   * the same question until the loop gave up.
   */
  it('takes an option that is itself a no', () => {
    const transform = choicePrompt('transform', [
      {
        label: 'No transformations',
        action: { kind: 'skip_step', step: 'transform' },
      },
    ]);

    expect(answerTo(transform, 'No transformations')).toEqual({
      kind: 'skip_step',
      step: 'transform',
    });
  });

  /**
   * "No duplicates" is the reverse of "keep duplicates" — a negation plus a
   * subject is an instruction, not a decline, and reading it as one would
   * keep the duplicates the user just asked to be rid of.
   */
  it('does not read a negation with a subject as a decline', () => {
    expect(answerTo(DEDUP, 'no duplicates')).toBeUndefined();
    expect(answerTo(DEDUP, "don't keep the duplicates")).toBeUndefined();
    expect(answerTo(DEDUP, 'no thanks')).toEqual({
      kind: 'skip_step',
      step: 'dedup',
    });
  });

  /**
   * Declining is only unambiguous when one option declines. Two skips, or a
   * "no" where nothing declines, are for the resolver to ask about.
   */
  it('does not guess a decline that was not offered', () => {
    expect(answerTo(KEYS, 'no')).toBeUndefined();
    expect(answerTo(STORAGE, 'none of them')).toBeUndefined();
  });

  it('says nothing rather than guess', () => {
    expect(answerTo(STORAGE, 'somewhere cheap')).toBeUndefined();
    expect(answerTo(PII, 'it')).toBeUndefined();
    expect(answerTo(PII, '')).toBeUndefined();
  });

  it('leaves an answer that names two options alone', () => {
    // "mask or encrypt?" is a question back, not an answer.
    expect(answerTo(PII, 'mask or encrypt')).toBeUndefined();
  });
});

describe('answering a confirmation', () => {
  const SAVE: Prompt = {
    step: 'review',
    text: 'Shall I save it?',
    card: {
      kind: 'confirm',
      title: 'Save this dataset',
      confirmLabel: 'Save',
      confirmAction: { kind: 'save' },
    },
  };

  it('takes yes as the confirmation', () => {
    expect(answerTo(SAVE, 'yes')).toEqual({ kind: 'save' });
    expect(answerTo(SAVE, 'yes please, save it')).toEqual({ kind: 'save' });
    expect(answerTo(SAVE, 'go ahead')).toEqual({ kind: 'save' });
  });

  it('does not read a refusal as a confirmation', () => {
    expect(answerTo(SAVE, 'no')).toBeUndefined();
    expect(answerTo(SAVE, 'not yet')).toBeUndefined();
    expect(answerTo(SAVE, 'wait')).toBeUndefined();
  });
});

describe('answering a conflict', () => {
  const CONFLICT: Prompt = {
    step: 'conflicts',
    text: 'total_amount arrived as more than one type.',
    card: {
      kind: 'conflict',
      path: 'total_amount',
      candidates: [
        { dataType: 'double', count: 108, isRecommended: true },
        { dataType: 'string', count: 12, isSafest: true },
      ],
    },
  };

  it('takes the candidate type it names', () => {
    expect(answerTo(CONFLICT, 'string')).toEqual({
      kind: 'resolve_conflict',
      path: 'total_amount',
      mode: 'apply',
      dataType: 'string',
    });
    expect(answerTo(CONFLICT, 'make it a double')).toMatchObject({
      dataType: 'double',
    });
  });

  it('keeps the current type when asked to', () => {
    expect(answerTo(CONFLICT, 'keep the current type')).toEqual({
      kind: 'resolve_conflict',
      path: 'total_amount',
      mode: 'dismiss',
    });
    expect(answerTo(CONFLICT, 'leave it as it is')).toMatchObject({
      mode: 'dismiss',
    });
  });

  it('does not settle the type on a plain no', () => {
    // Dismissing is a write, so it takes saying so. "No" does not answer
    // "which should it be?".
    expect(answerTo(CONFLICT, 'no')).toBeUndefined();
    expect(answerTo(CONFLICT, 'not sure')).toBeUndefined();
  });

  it('refuses a type that is not on offer', () => {
    // `integer` is a real data type and not one of the observed ones, so
    // choosing it would drop values the sample actually held.
    expect(answerTo(CONFLICT, 'integer')).toBeUndefined();
  });
});

describe('answering the name question', () => {
  it('takes the whole answer as the name', () => {
    expect(answerTo(NAME, 'My Orders')).toEqual({
      kind: 'set_dataset_name',
      name: 'My Orders',
    });
  });

  it('strips the way people say it', () => {
    expect(answerTo(NAME, 'call it My Orders')).toEqual({
      kind: 'set_dataset_name',
      name: 'My Orders',
    });
    expect(answerTo(NAME, "let's call it my-orders please")).toEqual({
      kind: 'set_dataset_name',
      name: 'my-orders',
    });
  });

  /**
   * Without this, "undo" at the name question names the dataset "undo" —
   * the one place where free text is taken whole is the one place a command
   * has to be let through to the resolver.
   */
  it('lets a command through instead of naming the dataset after it', () => {
    for (const said of [
      'undo',
      'revert that',
      'help',
      'why do you need a name',
      'what is a dataset',
      'explain',
      'start over',
    ]) {
      expect(answerTo(NAME, said)).toBeUndefined();
    }
  });

  it('refuses a name nothing could be called', () => {
    expect(answerTo(NAME, '   ')).toBeUndefined();
    expect(answerTo(NAME, 'a'.repeat(200))).toBeUndefined();
  });
});

describe('questions with nothing to type', () => {
  it('has no answer for a file drop', () => {
    expect(
      answerTo(
        {
          step: 'sample',
          text: 'give me a sample',
          card: { kind: 'file_drop' },
        },
        'here',
      ),
    ).toBeUndefined();
  });

  it('has no answer for the connector form', () => {
    expect(
      answerTo(
        { step: 'connector', text: 'connection settings?' },
        'host is db.local',
      ),
    ).toBeUndefined();
  });
});
