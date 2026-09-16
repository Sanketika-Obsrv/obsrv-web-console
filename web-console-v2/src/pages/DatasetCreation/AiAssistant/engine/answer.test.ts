import { AgendaStepId } from './actions';
import { Prompt } from './agenda';
import { CONFIRM_LABELS, answerTo, readOffer } from './answer';
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
  freeText: (name) => ({ kind: 'set_dataset_name', name }),
};

describe('answering a choice question', () => {
  it('takes the option the answer names', () => {
    expect(answerTo(PII, 'mask it')).toEqual({
      action: {
        kind: 'set_pii',
        path: 'customer.email',
        action: 'mask',
        skipOnFailure: true,
      },
    });
  });

  it('does not need the whole label', () => {
    expect(answerTo(PII, 'encrypt')).toMatchObject({
      action: { action: 'encrypt' },
    });
    expect(answerTo(STORAGE, 'lakehouse')).toEqual({
      action: { kind: 'set_storage', lakehouse: true },
    });
    expect(answerTo(STORAGE, 'both please')).toEqual({
      action: { kind: 'set_storage', realtime: true, lakehouse: true },
    });
  });

  it('reads a field name as the option carrying it', () => {
    expect(answerTo(KEYS, 'order_ts')).toEqual({
      action: { kind: 'set_keys', timestamp: 'order_ts' },
    });
    expect(answerTo(DEDUP, 'drop them, key is order_id')).toEqual({
      action: { kind: 'set_dedup', enabled: true, key: 'order_id' },
    });
  });

  it('matches a multi-word label loosely', () => {
    expect(answerTo(STORAGE, 'the real time store')).toEqual({
      action: { kind: 'set_storage', realtime: true },
    });
    expect(answerTo(KEYS, 'use the arrival time')).toEqual({
      action: { kind: 'set_keys', timestamp: 'Event Arrival Time' },
    });
  });

  it('reads a plain no as the option that declines', () => {
    expect(answerTo(DEDUP, 'no')).toEqual({
      action: { kind: 'skip_step', step: 'dedup' },
    });
    expect(answerTo(DEDUP, 'not now thanks')).toEqual({
      action: { kind: 'skip_step', step: 'dedup' },
    });
    expect(answerTo(PII, 'leave it alone')).toEqual({
      action: { kind: 'skip_step', step: 'pii', path: 'customer.email' },
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
      action: { kind: 'skip_step', step: 'transform' },
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
      action: { kind: 'skip_step', step: 'dedup' },
    });
  });

  it('hears "not right now" as a plain no, and "not right" as a complaint', () => {
    const schema = choicePrompt('schema', [
      { label: 'Looks right', action: { kind: 'skip_step', step: 'schema' } },
    ]);

    expect(answerTo(schema, 'not right now')).toEqual({
      action: { kind: 'skip_step', step: 'schema' },
    });

    // "Not right" says the schema is wrong. Reading it as "looks right"
    // would record the opposite of what was said.
    expect(answerTo(schema, 'not right')).toBeUndefined();
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
    expect(answerTo(SAVE, 'yes')).toEqual({ action: { kind: 'save' } });
    expect(answerTo(SAVE, 'Yes!')).toEqual({ action: { kind: 'save' } });
    expect(answerTo(SAVE, 'yes please')).toEqual({ action: { kind: 'save' } });
  });

  it('does not read a refusal as a confirmation', () => {
    expect(answerTo(SAVE, 'no')).toBeUndefined();
    expect(answerTo(SAVE, 'not yet')).toBeUndefined();
    expect(answerTo(SAVE, 'wait')).toBeUndefined();
  });

  /**
   * A reply that carries more than the label is not a reply to the card at
   * all — reading it as one would silently discard whatever else it said.
   * Missed first time: the leading word alone used to decide it, so "no,
   * change the name to telemetry" was read as a bare decline and the rename
   * it carried was dropped. Found in the browser.
   */
  it('does not read a reply that carries more than the label', () => {
    expect(
      answerTo(SAVE, 'yes, and also rename it to telemetry'),
    ).toBeUndefined();
    expect(answerTo(SAVE, 'no, change the name to telemetry')).toBeUndefined();
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
      action: {
        kind: 'resolve_conflict',
        path: 'total_amount',
        mode: 'apply',
        dataType: 'string',
      },
    });
    expect(answerTo(CONFLICT, 'make it a double')).toMatchObject({
      action: { dataType: 'double' },
    });
  });

  /**
   * Dismissing used to be matched against an invented list of phrasings —
   * "keep"/"leave"/"dismiss" — none of them compared against anything the
   * card itself printed. That match is gone: a conflict is settled only by
   * naming one of the offered candidates now, so these fall through
   * unanswered rather than writing a dismissal nobody typed in those words.
   */
  it('no longer matches "keep it" or "dismiss it" as invented phrasing', () => {
    expect(answerTo(CONFLICT, 'keep the current type')).toBeUndefined();
    expect(answerTo(CONFLICT, 'leave it as it is')).toBeUndefined();
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

/**
 * A question that takes prose no longer writes anything by itself. "good
 * morning" at this question used to pass every guard `answerToProse` had and
 * be written as the dataset's name — found in the browser. Now every reply
 * is handed back as a proposal, whatever it says: a wrong guess costs one
 * more word, not a write to find and undo.
 */
describe('answering the name question', () => {
  it('proposes the whole answer as the name, needing a yes', () => {
    expect(answerTo(NAME, 'My Orders')).toEqual({
      action: { kind: 'set_dataset_name', name: 'My Orders' },
      confirm: true,
    });
  });

  /**
   * The matcher no longer strips a preface, filters out commands, or caps a
   * reply's length — those existed only to make an unconfirmed write "safe
   * enough", and nothing is written unconfirmed from here any more. Reading
   * the words for what they mean is the model's or the user's job now; this
   * matcher only ever proposes.
   */
  it('proposes anything typed, even a command or a request aimed elsewhere', () => {
    for (const said of [
      'call it My Orders',
      'undo',
      'write me a poem about ducks',
      'a'.repeat(200),
    ]) {
      expect({ said, result: answerTo(NAME, said) }).toEqual({
        said,
        result: {
          action: { kind: 'set_dataset_name', name: said },
          confirm: true,
        },
      });
    }
  });

  it('still takes the names people actually use', () => {
    for (const said of [
      'My Orders',
      'Air Quality Probe',
      'orders_2026',
      'Customer Orders 2024',
      'Web Checkout Events EU',
    ]) {
      expect({ said, result: answerTo(NAME, said) }).toEqual({
        said,
        result: {
          action: { kind: 'set_dataset_name', name: said },
          confirm: true,
        },
      });
    }
  });

  it('refuses a name nothing could be called', () => {
    expect(answerTo(NAME, '   ')).toBeUndefined();
  });
});

describe('questions with nothing to type', () => {
  /**
   * The sample question takes no typed answer: the data arrives pasted or
   * dropped, and is recognised before the resolver sees it.
   */
  it('has no answer for the sample question', () => {
    expect(
      answerTo({ step: 'sample', text: 'give me a sample' }, 'here'),
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

/**
 * `readOffer` is the confirm card's own matcher: a reply is read against
 * exactly the two words the card prints — `CONFIRM_LABELS.accept` and
 * `CONFIRM_LABELS.decline` — never against a list of ways a user might
 * phrase yes or no.
 */
describe('readOffer', () => {
  const card = {
    kind: 'confirm' as const,
    title: 'Deduplicate on order_id',
    confirmAction: {
      kind: 'set_dedup' as const,
      enabled: true,
      key: 'order_id',
    },
  };

  it('accepts the word the card itself prints', () => {
    expect(readOffer(card, CONFIRM_LABELS.accept)).toBe('accept');
    expect(readOffer(card, 'Yes!')).toBe('accept');
    expect(readOffer(card, 'yes please')).toBe('accept');
  });

  it('declines the word the card itself prints', () => {
    expect(readOffer(card, CONFIRM_LABELS.decline)).toBe('decline');
    expect(readOffer(card, 'no thanks')).toBe('decline');
  });

  /**
   * Anything more than the label is not a reply to the card at all: "NO,
   * change name to telemetry" carries a rename, and reading its leading "no"
   * as a decline would discard that rename silently. Found in the browser.
   */
  it('answers neither when the reply carries more than the label', () => {
    expect(readOffer(card, 'NO , change name to telemetry')).toBeUndefined();
    expect(readOffer(card, 'not that')).toBeUndefined();
    expect(readOffer(card, 'do it')).toBeUndefined();
    expect(readOffer(card, 'go ahead')).toBeUndefined();
  });

  it('answers neither for an empty reply', () => {
    expect(readOffer(card, '')).toBeUndefined();
    expect(readOffer(card, '   ')).toBeUndefined();
  });

  /**
   * A card's own `confirmLabel` is not always literally "yes" — the review
   * step's card, for one, prints "Check it" as its affirmative action. A
   * reply is read against that printed word too, not only the generic one.
   */
  describe('a card whose printed accept label is not literally "yes"', () => {
    const reviewCard = {
      kind: 'confirm' as const,
      title: 'Check this dataset over',
      confirmLabel: 'Check it',
      confirmAction: { kind: 'save' as const },
    };

    it('accepts the card’s own label', () => {
      expect(readOffer(reviewCard, 'Check it')).toBe('accept');
      expect(readOffer(reviewCard, 'check it')).toBe('accept');
    });

    it('still accepts the generic word alongside its own label', () => {
      expect(readOffer(reviewCard, 'yes')).toBe('accept');
    });

    it('does not accept a generic word from a different card', () => {
      expect(readOffer(reviewCard, 'do it')).toBeUndefined();
      expect(readOffer(reviewCard, 'go ahead')).toBeUndefined();
    });

    it('still declines the generic word — the type carries no label for it', () => {
      expect(readOffer(reviewCard, 'no')).toBe('decline');
    });
  });
});
