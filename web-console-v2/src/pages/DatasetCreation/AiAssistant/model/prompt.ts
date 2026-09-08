/**
 * The prompt given to the in-browser model.
 *
 * Written against a 0.6B model with a 4,096-token context, which shapes
 * everything here:
 *
 * - **Short.** Every token spent on instructions is one unavailable to the
 *   schema and the conversation. The budget is checked by a test.
 * - **One job.** The model chooses an action and nothing else. It does not
 *   narrate, explain or invent values; the executor writes, the server
 *   decides, and `narrate.ts` does the prose.
 * - **Asking is a valid answer.** `clarify` is offered at every step
 *   precisely so that "I am not sure" beats a plausible guess. A small model
 *   guesses readily, and a wrong guess writes to the user's dataset.
 *
 * Field names are *not* enumerated in the prompt for the same reason they are
 * not pinned in the schema: the list grows with the dataset. A sample of them
 * is given as a hint, and `resolveField` handles whatever comes back.
 */
import { WizardStep } from '../engine/actions';
import { Message } from '../session/types';

/** How many field names to show as a hint. Enough to establish the shape. */
const VOCABULARY_HINT = 12;

/** How many prior turns to include. The dataset state comes from the server. */
const HISTORY_TURNS = 6;

const STEP_PURPOSE: Record<WizardStep, string> = {
  connector: 'choosing where the data comes from',
  ingestion: 'naming the dataset and reading a sample',
  schema: 'correcting the detected field types',
  processing: 'validation, de-duplication and transformations',
  storage: 'where the data is stored and which keys are used',
  preview: 'reviewing and saving',
};

export interface PromptInput {
  step: WizardStep;
  utterance: string;
  /** Field paths from the server, sampled rather than listed in full. */
  fieldPaths?: string[];
  /** Prior turns, most recent last. */
  history?: Message[];
}

export const SYSTEM_PROMPT = [
  'You turn one instruction about an Obsrv dataset into one JSON action.',
  'Reply with a single JSON object and nothing else.',
  'Never invent a field name, a value or an action that was not asked for.',
  'If the instruction is unclear or names something you cannot see, reply with a clarify action asking for what you need.',
].join(' ');

/** The user-side prompt: what step we are on, what they said, a few hints. */
export const buildPrompt = ({
  step,
  utterance,
  fieldPaths = [],
  history = [],
}: PromptInput): string => {
  const parts = [`Step: ${step} — ${STEP_PURPOSE[step]}.`];

  if (fieldPaths.length > 0) {
    const shown = fieldPaths.slice(0, VOCABULARY_HINT).join(', ');
    const more =
      fieldPaths.length > VOCABULARY_HINT
        ? ` (and ${fieldPaths.length - VOCABULARY_HINT} more)`
        : '';

    // A hint, not an enumeration: the resolver matches whatever comes back,
    // so the model does not need the whole list to be useful.
    parts.push(`Some fields: ${shown}${more}.`);
  }

  const recent = history.slice(-HISTORY_TURNS);

  if (recent.length > 0) {
    parts.push(
      [
        'Recent turns:',
        ...recent.map((turn) => `${turn.role}: ${turn.text}`),
      ].join('\n'),
    );
  }

  parts.push(`Instruction: ${utterance}`);

  return parts.join('\n\n');
};

/** Rough token count, matching `stepSchema`'s estimate. */
export const estimatePromptTokens = (prompt: string): number =>
  Math.round(prompt.length / 3.3);
