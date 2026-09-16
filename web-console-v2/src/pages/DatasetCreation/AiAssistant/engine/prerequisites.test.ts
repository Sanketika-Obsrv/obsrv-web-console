import { Action } from './actions';
import {
  isDenormRequest,
  kindsForUtterance,
  unmetForAction,
  unmetForStep,
  unmetForUtterance,
} from './prerequisites';

/** A dataset exists and its schema has been worked out. */
const READY = { hasDataset: true, hasSchema: true };
/** Named and typed, but no sample has been given yet. */
const NO_SAMPLE = { hasDataset: true, hasSchema: false };
/** Nothing at all: the very first turn. */
const EMPTY = { hasDataset: false, hasSchema: false };
/** Named and typed, but the draft is created by the sample arriving. */
const NAMED = { hasDataset: false, hasSchema: false, draftPending: true };

describe('what an action needs before it can be done', () => {
  it('says a sample is missing rather than attempting the change', () => {
    const unmet = unmetForAction(
      { kind: 'set_dedup', enabled: true, key: 'order_id' },
      NO_SAMPLE,
    );

    expect(unmet?.requirement).toBe('schema');
    expect(unmet?.text).toMatch(/sample/i);
    // The reply names what was asked for, so it reads as an answer to it.
    expect(unmet?.text).toMatch(/duplicat/i);
  });

  it('says the dataset does not exist yet before anything is sent', () => {
    const unmet = unmetForAction(
      { kind: 'set_storage', realtime: true },
      EMPTY,
    );

    expect(unmet?.requirement).toBe('dataset');
    expect(unmet?.text).toMatch(/name/i);
  });

  /**
   * Found in the browser: with a name and a type already chosen, "needs a
   * dataset first — tell me its name" asks for what the user has just
   * given. What is actually missing is the sample, since that is what
   * creates the draft.
   */
  it('asks for the sample once the name and type are in hand', () => {
    const unmet = unmetForAction(
      { kind: 'set_storage', realtime: true },
      NAMED,
    );

    expect(unmet?.requirement).toBe('dataset');
    expect(unmet?.text).toMatch(/sample/i);
    expect(unmet?.text).not.toMatch(/tell me its name/i);
  });

  it('lets the two questions that start a dataset through', () => {
    const openers: Action[] = [
      { kind: 'set_dataset_name', name: 'My Orders' },
      { kind: 'set_dataset_type', datasetType: 'event' },
    ];

    for (const action of openers) {
      expect(unmetForAction(action, EMPTY)).toBeUndefined();
    }
  });

  /**
   * Undo, help and moving between stages are about the conversation, not
   * about the document, so they work whatever state it is in.
   */
  it('never blocks talking about the flow itself', () => {
    const talk: Action[] = [
      { kind: 'undo' },
      { kind: 'explain', topic: 'dedup' },
      { kind: 'goto_step', step: 'processing' },
      { kind: 'skip_step', step: 'dedup' },
    ];

    for (const action of talk) {
      expect(unmetForAction(action, EMPTY)).toBeUndefined();
    }
  });

  it('asks for nothing once the dataset and its schema are there', () => {
    const ready: Action[] = [
      { kind: 'set_dedup', enabled: true, key: 'order_id' },
      { kind: 'toggle_required', path: 'order_id', required: true },
      { kind: 'save' },
    ];

    for (const action of ready) {
      expect(unmetForAction(action, READY)).toBeUndefined();
    }
  });

  it('holds a sample back until there is a dataset to attach it to', () => {
    const attach: Action = { kind: 'attach_sample', fileName: 'orders.json' };

    expect(unmetForAction(attach, EMPTY)?.requirement).toBe('dataset');
    expect(unmetForAction(attach, NO_SAMPLE)).toBeUndefined();
  });
});

/**
 * The point of reading the utterance too: "dedup on order_id" before there
 * is a schema resolves to nothing, because `order_id` is not a field of a
 * dataset that has no fields. Answering "I did not understand that" is both
 * unhelpful and untrue — it was understood, it just cannot be done yet.
 */
describe('what a request needs when nothing could be resolved from it', () => {
  it('reads the subject out of an instruction it could not act on', () => {
    for (const said of [
      'dedup on order_id',
      'drop the duplicate rows',
      'I never want to see the same order twice',
    ]) {
      expect({ said, text: unmetForUtterance(said, NO_SAMPLE)?.text }).toEqual({
        said,
        text: expect.stringMatching(/sample/i),
      });
    }
  });

  it('covers the other things that need a schema', () => {
    for (const said of [
      'mask the email address',
      'add a transformation on the total',
      'join it to the customer master',
      'partition by channel',
      'make the order id required',
    ]) {
      expect({
        said,
        requirement: unmetForUtterance(said, NO_SAMPLE)?.requirement,
      }).toEqual({ said, requirement: 'schema' });
    }
  });

  it('says nothing when the request could be done as things stand', () => {
    expect(unmetForUtterance('dedup on order_id', READY)).toBeUndefined();
  });

  it('says nothing about a request that is not dataset work at all', () => {
    for (const said of ['write me a poem about ducks', 'what is the weather']) {
      expect(unmetForUtterance(said, NO_SAMPLE)).toBeUndefined();
    }
  });

  /**
   * A sample is what a schema is worked out from, so asking for one is never
   * blocked on having one.
   */
  it('does not block the very thing that would unblock it', () => {
    expect(
      unmetForUtterance('here is my sample data', NO_SAMPLE),
    ).toBeUndefined();
    expect(
      unmetForUtterance('use the postgres connector', NO_SAMPLE),
    ).toBeUndefined();
  });
});

describe('the actions the words are asking for', () => {
  it('reads a join however it is phrased', () => {
    for (const said of [
      'join on customer_id',
      'denormalise from the customers master dataset',
      'also pull in the customers record as customer_details',
      'bring in the product details',
      'look up the customer',
    ]) {
      expect(kindsForUtterance(said)).toContain('set_denorm');
    }
  });

  /**
   * The sample question offers to pull data *from* a connector, which is not
   * a join, so "pull" alone must not read as one.
   */
  it('does not read pulling from a source as a join', () => {
    expect(kindsForUtterance('pull it from postgres')).toContain(
      'select_connector',
    );
  });

  it('says nothing when the words name no topic of its own', () => {
    expect(kindsForUtterance('customer_id')).toBeUndefined();
    expect(kindsForUtterance('yes please')).toBeUndefined();
  });
});

/**
 * A router names a *step* rather than a resolved action, before an
 * extraction call has run at all. `unmetForStep` has to answer the same
 * question `unmetForAction` does — what is this waiting on? — from the step
 * alone, so a "request" or "reply_to_card" reading naming a step nobody can
 * act on yet gets the same honest prerequisite reply an action would have.
 */
describe('what an agenda question needs before it can be answered', () => {
  it('never blocks naming or typing the dataset', () => {
    expect(unmetForStep('name', EMPTY)).toBeUndefined();
    expect(unmetForStep('type', EMPTY)).toBeUndefined();

    // Even where every other step would be blocked, these two never are.
    expect(unmetForStep('name', NAMED)).toBeUndefined();
    expect(unmetForStep('type', NAMED)).toBeUndefined();
  });

  it('says a sample is missing for a schema-editing step, same as the action would', () => {
    const byStep = unmetForStep('schema', NO_SAMPLE);
    const byAction = unmetForAction(
      { kind: 'toggle_required', path: 'order_id', required: true },
      NO_SAMPLE,
    );

    expect(byStep).toEqual(byAction);
  });

  it('says the same for the conflicts step, which shares the schema requirement', () => {
    const byStep = unmetForStep('conflicts', NO_SAMPLE);
    const byAction = unmetForAction(
      { kind: 'resolve_conflict', path: 'amount', mode: 'dismiss' },
      NO_SAMPLE,
    );

    expect(byStep).toEqual(byAction);
  });

  it('says the dataset does not exist yet for a storage-requiring step', () => {
    const byStep = unmetForStep('storage', EMPTY);
    const byAction = unmetForAction(
      { kind: 'set_storage', realtime: true },
      EMPTY,
    );

    expect(byStep?.requirement).toBe('dataset');
    expect(byStep).toEqual(byAction);
  });

  it('asks for nothing once the step is not blocked', () => {
    expect(unmetForStep('dedup', READY)).toBeUndefined();
    expect(unmetForStep('storage', READY)).toBeUndefined();
  });
});

describe('isDenormRequest', () => {
  it('recognises a request to join a master dataset', () => {
    expect(isDenormRequest('can I join to a master dataset?')).toBe(true);
    expect(isDenormRequest('denormalise on customer_id')).toBe(true);
  });

  it('is false for a request about something else', () => {
    expect(isDenormRequest('make order_id required')).toBe(false);
    expect(isDenormRequest('enable the real-time store')).toBe(false);
  });
});
