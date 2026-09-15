import { AGENDA_STEPS } from '../engine/actions';
import { estimateTokens } from './stepSchema';
import { estimatePromptTokens } from './prompt';
import {
  REPLY_MAX_LENGTH,
  ROUTER_EXAMPLES,
  ROUTER_SCHEMA,
  ROUTER_SYSTEM_PROMPT,
  buildRouterPrompt,
  readRouterReply,
} from './router';

describe('ROUTER_SCHEMA', () => {
  it('exposes exactly the five intents', () => {
    const intent = ROUTER_SCHEMA.properties as Record<
      string,
      { enum?: string[] }
    >;

    expect(intent.intent.enum?.slice().sort()).toEqual(
      ['answer', 'ask', 'other', 'reply_to_card', 'request'].sort(),
    );
  });

  it("scopes step to exactly the agenda's own questions", () => {
    const properties = ROUTER_SCHEMA.properties as Record<
      string,
      { enum?: string[] }
    >;

    expect(properties.step.enum).toEqual([...AGENDA_STEPS]);
  });

  it('does not require a step, so an ask or other turn can name none', () => {
    expect(ROUTER_SCHEMA.required).toEqual(['intent']);
  });

  it('is small — a constant grammar, not one that grows with a step', () => {
    expect(estimateTokens(ROUTER_SCHEMA)).toBeLessThan(200);
  });

  /**
   * The point of pulling this into its own file: call A's grammar is the
   * same shape at every question and every dataset width. If it varied it
   * would need rebuilding per turn, which is the cost this design avoids.
   */
  it('is the same object regardless of what buildRouterPrompt is asked to render', () => {
    const before = JSON.stringify(ROUTER_SCHEMA);
    const reference = ROUTER_SCHEMA;

    buildRouterPrompt({ utterance: 'a' });
    buildRouterPrompt({
      utterance: 'b',
      question: 'dedup',
      questionText: 'Shall I drop duplicates?',
      optionLabels: ['Yes, on order_id', 'No'],
      pendingCardTitle: 'Confirm rename',
      history: Array.from({ length: 40 }, (_unused, i) => ({
        id: `m-${i}`,
        role: 'user' as const,
        text: `turn ${i}`,
        createdAt: i,
      })),
    });

    expect(ROUTER_SCHEMA).toBe(reference);
    expect(JSON.stringify(ROUTER_SCHEMA)).toBe(before);
  });
});

describe('readRouterReply — the five intents round-trip', () => {
  it('answer', () => {
    expect(readRouterReply(JSON.stringify({ intent: 'answer' }))).toEqual({
      intent: 'answer',
    });
  });

  it('request, naming a step', () => {
    expect(
      readRouterReply(JSON.stringify({ intent: 'request', step: 'name' })),
    ).toEqual({ intent: 'request', step: 'name' });
  });

  it('reply_to_card, with an optional step for a compound turn', () => {
    expect(
      readRouterReply(
        JSON.stringify({ intent: 'reply_to_card', step: 'dedup' }),
      ),
    ).toEqual({ intent: 'reply_to_card', step: 'dedup' });
  });

  it('ask, with a bounded reply', () => {
    expect(
      readRouterReply(
        JSON.stringify({
          intent: 'ask',
          reply: 'A master dataset is reference data other datasets join to.',
        }),
      ),
    ).toEqual({
      intent: 'ask',
      reply: 'A master dataset is reference data other datasets join to.',
    });
  });

  it('other, with an out-of-scope capability', () => {
    expect(
      readRouterReply(
        JSON.stringify({ intent: 'other', outOfScope: 'publish' }),
      ),
    ).toEqual({ intent: 'other', outOfScope: 'publish' });
  });

  it('a control never touches the document', () => {
    expect(
      readRouterReply(JSON.stringify({ intent: 'other', control: 'undo' })),
    ).toEqual({ intent: 'other', control: 'undo' });
  });
});

describe('readRouterReply — rejects rather than repairs', () => {
  it('rejects a reply longer than REPLY_MAX_LENGTH, and keeps none of it', () => {
    const longReply = 'z'.repeat(REPLY_MAX_LENGTH + 40);
    const raw = JSON.stringify({ intent: 'other', reply: longReply });

    const result = readRouterReply(raw);

    expect(result).toBeUndefined();
    // Guards against a future refactor that truncates instead of rejecting.
    expect(JSON.stringify(result ?? null)).not.toContain('z'.repeat(20));
  });

  it('rejects an answer naming a step outside AGENDA_STEPS', () => {
    const raw = '{"intent":"answer","step":"not_a_real_step"}';

    expect(readRouterReply(raw)).toBeUndefined();
  });

  it('rejects malformed JSON', () => {
    expect(readRouterReply('not json at all')).toBeUndefined();
  });

  it('rejects an empty reply', () => {
    expect(readRouterReply('')).toBeUndefined();
  });

  it('rejects an unknown intent the schema does not list', () => {
    expect(
      readRouterReply(JSON.stringify({ intent: 'do_something' })),
    ).toBeUndefined();
  });

  it('rejects a reply with an extra, unlisted property', () => {
    expect(
      readRouterReply(
        JSON.stringify({ intent: 'answer', somethingElse: true }),
      ),
    ).toBeUndefined();
  });

  it('salvages a reply wrapped in stray prose, same as extractJson', () => {
    const raw = 'Sure, here you go: {"intent":"answer"} — done.';

    expect(readRouterReply(raw)).toEqual({ intent: 'answer' });
  });
});

describe('buildRouterPrompt', () => {
  it('includes the option labels the question card printed, when given', () => {
    const prompt = buildRouterPrompt({
      utterance: 'the second one',
      optionLabels: ['Event', 'Master', 'Transaction', 'Leave it as it is'],
    });

    expect(prompt).toContain('Event');
    expect(prompt).toContain('Leave it as it is');
  });

  it('omits option labels when there are none', () => {
    const prompt = buildRouterPrompt({ utterance: 'hello' });

    expect(prompt).not.toMatch(/Offered/i);
  });

  it('includes the pending confirm card title, when given', () => {
    const prompt = buildRouterPrompt({
      utterance: 'yes',
      pendingCardTitle: 'Rename the dataset to orders_v2?',
    });

    expect(prompt).toContain('Rename the dataset to orders_v2?');
  });

  it('omits the pending card title when there is none', () => {
    const prompt = buildRouterPrompt({ utterance: 'yes' });

    expect(prompt).not.toMatch(/Awaiting/i);
  });

  it('includes the question on the table, when there is one', () => {
    const prompt = buildRouterPrompt({
      utterance: 'no, telemetry',
      question: 'name',
      questionText: 'What should we call this dataset?',
    });

    expect(prompt).toContain('What should we call this dataset?');
  });

  it('carries the utterance itself, last', () => {
    const prompt = buildRouterPrompt({ utterance: 'good morning' });

    expect(prompt.trim().endsWith('good morning')).toBe(true);
  });

  it('renders recent history without inventing a phrase-based summary', () => {
    const prompt = buildRouterPrompt({
      utterance: 'and the second one',
      history: [
        { id: '1', role: 'user', text: 'first thing', createdAt: 0 },
        { id: '2', role: 'assistant', text: 'Done.', createdAt: 1 },
      ],
    });

    expect(prompt).toContain('first thing');
    expect(prompt.indexOf('first thing')).toBeLessThan(prompt.indexOf('Done.'));
  });
});

describe('ROUTER_SYSTEM_PROMPT', () => {
  it('bounds the reply to one sentence', () => {
    expect(ROUTER_SYSTEM_PROMPT.toLowerCase()).toMatch(/one sentence/);
  });

  it('forbids claiming a write happened', () => {
    const lower = ROUTER_SYSTEM_PROMPT.toLowerCase();

    expect(lower).toMatch(/changed|saved|published|deleted/);
  });

  it('says producing the reply changes nothing', () => {
    expect(ROUTER_SYSTEM_PROMPT.toLowerCase()).toMatch(/nothing/);
  });

  /**
   * `prompt.test.ts` holds the call-B prompt to 120 tokens. Call A's prompt
   * explains five categories instead of one job, so it is allowed more room
   * — but it is still a fixed prompt with no per-question growth, so a loose
   * ceiling would hide a regression just as surely as no ceiling at all.
   */
  it('is short, and constant regardless of the question asked', () => {
    expect(estimatePromptTokens(ROUTER_SYSTEM_PROMPT)).toBeLessThan(180);
  });
});

describe('ROUTER_EXAMPLES', () => {
  it('is one fixed list, not scoped to a question', () => {
    expect(ROUTER_EXAMPLES.length).toBeGreaterThanOrEqual(8);
  });

  it('demonstrates the out-of-scope and ask cases by example', () => {
    expect(ROUTER_EXAMPLES.some((line) => line.includes('outOfScope'))).toBe(
      true,
    );
    expect(
      ROUTER_EXAMPLES.some((line) => line.includes('"intent":"ask"')),
    ).toBe(true);
  });
});

/**
 * A "boast corpus" — replies that claim the document changed.
 *
 * This only proves the *shape* survives `readRouterReply`: an `other`/`ask`
 * reading with such a sentence in `reply` parses like any other reading.
 * Whether the surrounding pipeline actually discards this reply's effect
 * (the engine drops `reply` whenever the turn also wrote something) is an
 * `engine/turn.ts` / `modelResolver.ts` integration concern, proved in a
 * later commit — not by this file.
 */
describe('a boast corpus parses as data, whatever it claims', () => {
  const boasts = [
    'I have renamed it to orders_v2.',
    'Saved.',
    'Published the dataset.',
  ];

  it.each(boasts)('%s reads as an ordinary other/ask reply', (reply) => {
    const reading = readRouterReply(JSON.stringify({ intent: 'other', reply }));

    expect(reading).toEqual({ intent: 'other', reply });
  });
});
