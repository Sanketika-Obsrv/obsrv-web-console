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
import { DatasetFacts } from '../engine/datasetFacts';
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
  /**
   * The dataset's current values. Without this, "again", "instead" and "why
   * is the id still the old one" have nothing to be read against — the
   * prompt used to carry only the question and the sentence typed at it.
   */
  facts?: DatasetFacts;
  /**
   * The option labels the question's own card printed, when it is a choice.
   * This is what makes "the second one" or "the master one" readable at all.
   */
  optionLabels?: string[];
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
  /*
    Four, where every other question gets one or two. The reported bug was
    here: "I want create telemetry dataset" came back with that whole
    sentence as the name, because the only example showed a reply that was
    already nothing but a name. What a person types at this question is
    usually a sentence with a name inside it, so the examples have to show
    the name being taken out of one.
  */
  name: [
    '"call it My Orders" -> {"kind":"set_dataset_name","name":"My Orders"}',
    '"I want create telemetry dataset" -> {"kind":"set_dataset_name","name":"telemetry"}',
    '"can you make me one for web checkout events" -> {"kind":"set_dataset_name","name":"web checkout events"}',
    '"lets do air quality readings please" -> {"kind":"set_dataset_name","name":"air quality readings"}',
    // A rename after the draft already exists — the id keeps its original
    // slug regardless, which is why this is safe to allow at all.
    '"rename it to orders_v2" -> {"kind":"set_dataset_name","name":"orders_v2"}',
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
    // Measured: without this one, "mark mid as required" came back as a
    // change of arrival format. The "as" is what threw it.
    '"mark customer_id as required" -> {"kind":"toggle_required","path":"customer_id","required":true}',
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
  'Answer with the value the user means, not their whole sentence.',
  'If the instruction is unclear or names something you cannot see, reply with a clarify action asking for what you need.',
].join(' ');

/** Which of `DatasetFacts.stores` each label names, in the order said. */
const STORE_LABELS: { flag: keyof DatasetFacts['stores']; label: string }[] = [
  { flag: 'realtime', label: 'real-time' },
  { flag: 'lakehouse', label: 'lakehouse' },
  { flag: 'cache', label: 'cache' },
];

/** `a`, `a and b`, `a, b and c` — the same join `recap.ts` uses. */
const joinAnd = (words: string[]): string =>
  words.length < 2
    ? (words[0] ?? '')
    : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;

/**
 * The dataset's current values, as one mechanical line.
 *
 * Deliberately not prose: this is data rendered from `DatasetFacts`, not a
 * sentence about the dataset, so it cannot be mistaken for something the
 * assistant is claiming rather than reading. Every clause is independently
 * optional, and the line itself disappears once every clause does — a fresh
 * conversation with nothing decided yet has nothing to report here.
 */
const factsLine = (facts?: DatasetFacts): string | undefined => {
  if (!facts) return undefined;

  const clauses: string[] = [];

  if (facts.name) {
    // The id is worth naming only once it is fixed — `executor.ts` derives
    // it from the name and never changes it again once the draft exists,
    // which is exactly when `datasetId` accompanies a name here.
    clauses.push(
      facts.datasetId
        ? `name ${facts.name} (id ${facts.datasetId}, fixed)`
        : `name ${facts.name}`,
    );
  }

  if (facts.datasetType) clauses.push(`type ${facts.datasetType}`);

  const activeStores = STORE_LABELS.filter(
    ({ flag }) => facts.stores[flag],
  ).map(({ label }) => label);
  if (activeStores.length > 0) {
    clauses.push(
      `${joinAnd(activeStores)} store${activeStores.length > 1 ? 's' : ''} on`,
    );
  }

  if (facts.keys.timestamp) clauses.push(`timestamp ${facts.keys.timestamp}`);
  if (facts.keys.primary) clauses.push(`primary ${facts.keys.primary}`);
  if (facts.keys.partition) clauses.push(`partition ${facts.keys.partition}`);

  if (facts.dedup) {
    clauses.push(
      facts.dedup.enabled
        ? `dedup on${facts.dedup.key ? ` ${facts.dedup.key}` : ''}`
        : 'dedup off',
    );
  }

  // Only present at all once there is a real, non-empty comparison to
  // report — see `datasetFacts`'s own doc for why an all-zero diff and one
  // that was never computed both leave this clause out entirely.
  if (facts.liveDiff) {
    const { additions, modifications, deletions } = facts.liveDiff;
    clauses.push(
      `vs live: ${additions} added, ${modifications} modified, ${deletions} deleted`,
    );
  }

  return clauses.length > 0 ? `Now: ${clauses.join('; ')}.` : undefined;
};

/**
 * Field names that most often say what an action concerned, checked in this
 * order. Generic on purpose: an identifier picked this way is a fact read
 * off the action's own shape, not a phrase matched against what anyone typed.
 */
const IDENTIFYING_FIELDS = [
  'name',
  'path',
  'step',
  'key',
  'datasetType',
  'connectorId',
  'masterDatasetId',
  'fileName',
  'fieldKey',
  'timestamp',
  'primary',
  'partition',
  'property',
] as const;

/**
 * Kinds whose `step` says what the turn was about more than any other field
 * on them does. `skip_step` carries an optional `path` too — "the field the
 * answer concerned, when the question was about one" — but that is a detail
 * of the decline, not what was declined; reading `path` first would digest a
 * PII decline as the field's name rather than the question it left alone.
 */
const STEP_LED_KINDS = ['skip_step', 'goto_step'] as const;

const actionIdentifier = (
  action: NonNullable<Message['action']>,
): string | undefined => {
  const fields = (STEP_LED_KINDS as readonly string[]).includes(action.kind)
    ? (['step', ...IDENTIFYING_FIELDS] as const)
    : IDENTIFYING_FIELDS;

  for (const field of fields) {
    const value = (action as Record<string, unknown>)[field];
    if (typeof value === 'string' && value) return value;
  }

  return undefined;
};

/**
 * One turn as the model needs it: what was said, and what it did.
 *
 * Plain `role: text` reads as a wall of prose, which is why "again" and "the
 * second one" had nothing but the words themselves to resolve against. A
 * turn that dispatched an action, or one the server refused, says so in a
 * bracketed suffix — kept apart from `describeAction`'s prose, because that
 * is written for the person reading the transcript and this is a machine
 * digest written for the model reading the prompt.
 */
const actionSuffix = (action: NonNullable<Message['action']>): string => {
  const identifier = actionIdentifier(action);
  return `[${action.kind}${identifier ? ` ${identifier}` : ''}]`;
};

export const turnDigest = (turn: Message): string => {
  const suffix = turn.failureCode
    ? `[failed ${turn.failureCode}]`
    : turn.action
      ? actionSuffix(turn.action)
      : undefined;

  return suffix
    ? `${turn.role}: ${turn.text} ${suffix}`
    : `${turn.role}: ${turn.text}`;
};

/** The user-side prompt: what step we are on, what they said, a few hints. */
export const buildPrompt = ({
  step,
  utterance,
  question,
  questionText,
  facts,
  optionLabels = [],
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
          [
            `The assistant asked: ${questionText}`,
            // Read against the words the card itself printed — the model
            // cannot resolve "the second one" against anything else.
            ...(optionLabels.length > 0
              ? [`Offered: ${optionLabels.join(', ')}.`]
              : []),
          ].join('\n'),
          'The user is answering that question. Reply with the action that records their answer.',
          ...(EXAMPLES[question].length
            ? [['Answers to this question:', ...EXAMPLES[question]].join('\n')]
            : []),
        ]
      : [`Step: ${step} — ${STEP_PURPOSE[step]}.`];

  const now = factsLine(facts);
  if (now) parts.push(now);

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
    parts.push(['Recent turns:', ...recent.map(turnDigest)].join('\n'));
  }

  parts.push(
    `${question && questionText ? 'Answer' : 'Instruction'}: ${utterance}`,
  );

  return parts.join('\n\n');
};

/** Rough token count, matching `stepSchema`'s estimate. */
export const estimatePromptTokens = (prompt: string): number =>
  Math.round(prompt.length / 3.3);
