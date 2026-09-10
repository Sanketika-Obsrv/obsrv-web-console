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
import { AgendaStepId, WizardStep } from '../engine/actions';
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
  /** The agenda question on the table, when the assistant asked one. */
  question?: AgendaStepId;
  /** That question in its own words, which is the best context there is. */
  questionText?: string;
  /** Field paths from the server, sampled rather than listed in full. */
  fieldPaths?: string[];
  /** Prior turns, most recent last. */
  history?: Message[];
}

/**
 * One worked reply per question.
 *
 * Few-shot rather than more instructions, because a small model imitates a
 * shape far more reliably than it follows a rule — and because the examples
 * are the cheapest way to say what a *bare* reply means. "No" is the whole
 * problem: it is an answer at eight of these questions and means something
 * different at each.
 *
 * Kept to one or two lines each. They are only shown for the question being
 * asked, so the cost is one example, not fourteen.
 */
export const EXAMPLES: Record<AgendaStepId, string[]> = {
  name: [
    '"call it My Orders" -> {"kind":"set_dataset_name","name":"My Orders"}',
  ],
  type: ['"master data" -> {"kind":"set_dataset_type","datasetType":"master"}'],
  connector: [
    '"the host is db.local" -> {"kind":"set_connector_field","property":"source_database_host","value":"db.local"}',
  ],
  sample: [
    '"use postgres" -> {"kind":"select_connector","connectorId":"postgres"}',
  ],
  conflicts: [
    '"string" -> {"kind":"resolve_conflict","path":"amount","mode":"apply","dataType":"string"}',
    '"keep what you have" -> {"kind":"resolve_conflict","path":"amount","mode":"dismiss"}',
  ],
  schema: [
    '"make order_id required" -> {"kind":"toggle_required","path":"order_id","required":true}',
    '"looks right" -> {"kind":"skip_step","step":"schema"}',
  ],
  pii: [
    '"mask it" -> {"kind":"set_pii","path":"customer_email","action":"mask","skipOnFailure":true}',
    '"leave it" -> {"kind":"skip_step","step":"pii","path":"customer_email"}',
  ],
  validation: [
    '"reject them" -> {"kind":"set_additional_fields","allow":false}',
    '"let them through" -> {"kind":"set_additional_fields","allow":true}',
  ],
  transform: ['"none" -> {"kind":"skip_step","step":"transform"}'],
  denorm: [
    '"Customers" -> {"kind":"select_denorm","masterDatasetId":"customers"}',
    '"not now" -> {"kind":"skip_step","step":"denorm"}',
  ],
  dedup: [
    '"yes, on order_id" -> {"kind":"set_dedup","enabled":true,"key":"order_id"}',
    '"no" -> {"kind":"skip_step","step":"dedup"}',
  ],
  storage: [
    '"both" -> {"kind":"set_storage","realtime":true,"lakehouse":true}',
  ],
  keys: ['"order_ts" -> {"kind":"set_keys","timestamp":"order_ts"}'],
  review: ['"yes" -> {"kind":"save"}'],
};

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
  question,
  questionText,
  fieldPaths = [],
  history = [],
}: PromptInput): string => {
  /**
   * The question replaces the step when there is one.
   *
   * Both would be redundant and the question is strictly better context: it
   * says what was asked in the words the user just read, where the step only
   * says which page of the wizard this would have been.
   */
  const parts =
    question && questionText
      ? [
          `The assistant asked: ${questionText}`,
          'The user is answering that question. Reply with the action that records their answer.',
          ...(EXAMPLES[question].length
            ? [['Answers to this question:', ...EXAMPLES[question]].join('\n')]
            : []),
        ]
      : [`Step: ${step} — ${STEP_PURPOSE[step]}.`];

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

  parts.push(
    `${question && questionText ? 'Answer' : 'Instruction'}: ${utterance}`,
  );

  return parts.join('\n\n');
};

/** Rough token count, matching `stepSchema`'s estimate. */
export const estimatePromptTokens = (prompt: string): number =>
  Math.round(prompt.length / 3.3);
