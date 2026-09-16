/**
 * Turns an action and its outcome into what the assistant says.
 *
 * Rule-written for now. T18 replaces the prose with model narration, which is
 * why this is a separate module with a narrow contract: the *card* a turn
 * carries is decided here too, and that part must keep working when the model
 * is absent or declines to answer.
 *
 * Nothing here invents facts about the dataset. Every sentence is built from
 * the action that was dispatched and the outcome the server returned.
 */
import { Action, AgendaStepId, TEXT_MAX_LENGTH } from './actions';
import { availableStorageLabels, diagnose } from './errorMap';
import { ExecutionFailureCode, ExecutionOutcome } from './executor';
import { MessageCard } from '../messages/types';
import { outstandingWork } from './finalCheck';
import { topicOf } from './prerequisites';
import { Resolution } from './ruleResolver';
import { OutOfScope } from './router';

export interface Narration {
  text: string;
  card?: MessageCard;
  failureCode?: ExecutionFailureCode;
}

const storeLabel = (flag: 'lakehouse' | 'realtime' | 'cache') => {
  if (flag === 'cache') return 'Cache';
  return availableStorageLabels([
    flag === 'lakehouse' ? 'lake_house' : 'realtime_store',
  ])[0];
};

/** What the action asked for, in plain words. Past tense, no outcome. */
/**
 * How each declined question reads back.
 *
 * A function per step rather than one sentence, because "left customer.email
 * as it is" and "kept duplicates" are the same decision about different
 * things, and a generic phrasing would leave the transcript saying nothing
 * about what the user actually chose.
 */
const SKIP_WORDING: Record<AgendaStepId, (path?: string) => string> = {
  name: () => 'left the name alone',
  type: () => 'left the dataset type alone',
  connector: () => 'skipped connector setup',
  sample: () => 'skipped the sample',
  conflicts: (path) =>
    path ? `left the type of ${path} alone` : 'left the type conflicts alone',
  schema: () => 'left the schema as it is',
  pii: (path) =>
    path ? `left ${path} unmasked` : 'left the suggested fields unmasked',
  validation: () => 'left validation as it is',
  transform: () => 'added no transformations',
  denorm: () => 'added no denormalisation',
  dedup: () => 'kept duplicates',
  storage: () => 'left storage as it is',
  keys: () => 'left the storage keys as they are',
  review: () => 'left the dataset unsaved',
};

/** Where each storage flag lands in the document the server returns. */
const INDEXING_FIELD: Record<'lakehouse' | 'realtime' | 'cache', string> = {
  lakehouse: 'lakehouse_enabled',
  realtime: 'olap_store_enabled',
  cache: 'cache_enabled',
};

/**
 * What the dataset actually ended up with, when there is a document to read.
 *
 * The action is what was asked for, and for storage that is not always what
 * was written: the console forces the cache store on for a master dataset, so
 * "the real-time store" was answered with "Cache disabled" while the payload
 * turned it on. Found in the browser, building a master dataset.
 */
const storedFlags = (
  applied: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  const config = applied?.dataset_config as
    { indexing_config?: Record<string, unknown> } | undefined;

  return config?.indexing_config;
};

export const describeAction = (
  action: Action,
  applied?: Record<string, unknown>,
): string => {
  switch (action.kind) {
    case 'set_dataset_name':
      return `named the dataset "${action.name}"`;
    case 'set_dataset_type':
      return `set the dataset type to ${action.datasetType}`;
    case 'attach_sample':
      return `read ${action.fileName} and detected the schema`;

    case 'set_data_type':
      return `set ${action.path} to ${action.dataType}`;
    case 'set_arrival_format':
      return `set ${action.path} to arrive as ${action.arrivalFormat}`;
    case 'toggle_required':
      return `made ${action.path} ${action.required ? 'required' : 'optional'}`;
    case 'set_description':
      return `described ${action.path}`;
    case 'add_field':
      return action.parentPath
        ? `added ${action.parentPath}.${action.name}`
        : `added ${action.name}`;
    case 'delete_field':
      return `removed ${action.path}`;
    case 'resolve_conflict':
      return action.mode === 'dismiss'
        ? `kept the current type for ${action.path}`
        : `resolved ${action.path} as ${action.dataType}`;

    case 'set_additional_fields':
      return action.allow
        ? 'allowed fields that are not in the schema'
        : 'restricted the dataset to the fields in the schema';
    case 'set_pii':
      return `set ${action.path} to be ${action.action}ed`;
    case 'add_transformation':
      return `added a transformation on ${action.path}`;
    case 'add_derived_field':
      return `added the derived field ${action.name}`;
    case 'set_dedup':
      return action.enabled
        ? `set duplicates to be dropped on ${action.key}`
        : 'set duplicates to be kept';
    case 'set_denorm':
      return `pulled ${action.masterDatasetId} in on ${action.path}, as ${action.outField}`;

    case 'select_denorm':
      return action.masterDatasetId
        ? `noted ${action.masterDatasetId} as the master dataset`
        : `noted ${action.path} as the field to join on`;
    case 'remove_transformation':
      return `removed the transformation on ${action.fieldKey}`;
    case 'remove_denorm':
      return `removed the denormalisation on ${action.path}`;

    case 'set_storage': {
      const stored = storedFlags(applied);
      const changes = (['lakehouse', 'realtime', 'cache'] as const)
        .filter((flag) => action[flag] !== undefined)
        .map((flag) => {
          const written = stored
            ? Boolean(stored[INDEXING_FIELD[flag]])
            : Boolean(action[flag]);

          return `${storeLabel(flag)} ${written ? 'enabled' : 'disabled'}`;
        });
      return `updated storage: ${changes.join(', ')}`;
    }
    case 'set_keys': {
      const keys = [
        action.primary && `primary key ${action.primary}`,
        action.partition && `partition key ${action.partition}`,
        action.timestamp && `timestamp ${action.timestamp}`,
      ].filter(Boolean);
      return `set ${keys.join(', ')}`;
    }

    case 'select_connector':
      return `selected the ${action.connectorId} connector`;
    case 'set_connector_field':
      return `set ${action.property} to ${String(action.value)}`;
    case 'request_connector_secrets':
      return 'asked for the connector credentials';
    case 'skip_connector':
      return 'skipped connector setup';
    case 'save':
      return 'check the dataset over';
    case 'export_schema':
      return 'prepared the current schema for download';
    case 'goto_step':
      return `moved to the ${action.step} step`;

    // Says what was decided, not that a step was skipped: the user answered a
    // question, and "skipped the pii step" describes the machinery instead of
    // the decision.
    case 'skip_step':
      // Falls back rather than indexing blind: this function labels a
      // confirmation prompt, so a malformed action must still produce a
      // sentence. Throwing here would take down the card that asks.
      return SKIP_WORDING[action.step]?.(action.path) ?? 'leave that as it is';

    // Named rather than vague: this text is also what a confirmation prompt
    // shows, and "applied that change" asks the user to approve something
    // they cannot see. Seen live.
    default:
      return `apply ${action.kind.replace(/_/g, ' ')}`;
  }
};

/**
 * What an action would do, in the present tense, for a confirmation prompt.
 *
 * `describeAction` is written for the past tense of something already done;
 * a proposal has to read as something not yet done.
 */
export const describeProposal = (action: Action): string =>
  describeAction(action)
    .replace(/^named /, 'name ')
    .replace(/^set /, 'set ')
    .replace(/^made /, 'make ')
    .replace(/^described /, 'describe ')
    .replace(/^added /, 'add ')
    .replace(/^removed /, 'remove ')
    .replace(/^resolved /, 'resolve ')
    .replace(/^kept /, 'keep ')
    .replace(/^allowed /, 'allow ')
    .replace(/^restricted /, 'restrict ')
    .replace(/^updated /, 'update ')
    .replace(/^selected /, 'select ')
    .replace(/^skipped /, 'skip ')
    .replace(/^saved /, 'save ')
    .replace(/^moved /, 'move ')
    .replace(/^read /, 'read ');

/** "a", "a and b", "a, b and c" — for a sequence read as one sentence. */
const joinPhrases = (phrases: string[]): string =>
  phrases.length <= 1
    ? (phrases[0] ?? '')
    : `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;

export const NOTHING_TO_UNDO =
  'There is nothing to undo yet — I have not changed anything.';

/**
 * What was put back.
 *
 * Phrased as what the assistant *did*, not as "reverted", because an undo is
 * an ordinary write like any other: the transcript should read as the change
 * it actually made.
 */
export const narrateUndo = (
  restored: Action[],
  partial = false,
): Narration => ({
  text: partial
    ? `I put part of that back — I ${joinPhrases(
        restored.map((action) => describeAction(action)),
      )} — and then hit a problem.`
    : `Undone. I ${joinPhrases(
        restored.map((action) => describeAction(action)),
      )}.`,
});

export const narrateOutcome = (
  action: Action,
  outcome: ExecutionOutcome,
): Narration => {
  if (!outcome.ok) {
    const diagnosis = diagnose({ code: outcome.code, error: outcome.error });

    return {
      text: diagnosis.explanation,
      failureCode: outcome.code,
      card: { kind: 'api_error', diagnosis },
    };
  }

  if (outcome.status === 'pending') {
    return {
      text: `Noted — ${describeAction(
        action,
      )}. It will be saved once you add a sample and the draft is created.`,
    };
  }

  if (outcome.status === 'noop') {
    return { text: `Done — ${describeAction(action)}.` };
  }

  /**
   * The closing check, which is the one action that writes nothing.
   *
   * Publishing belongs to the dataset list and the wizard's preview, so the
   * reply says where to go rather than implying the conversation did it.
   */
  if (action.kind === 'save') {
    const work = outstandingWork(outcome.dataset);
    const wrongWith = work.length
      ? ` ${work.length === 1 ? 'One thing is' : `${work.length} things are`} still outstanding: ${joinPhrases(work)}.`
      : '';

    return {
      text: `Everything is saved to the draft — each change went to the server as we made it.${wrongWith} To make it live, publish it from the dataset list or the wizard's preview.`,
    };
  }

  const created = outcome.datasetId
    ? ` The draft is ${outcome.datasetId}.`
    : '';

  // A replay means a concurrent edit was found and the change re-applied
  // against it. Saying so is the difference between trustworthy and quiet.
  const replayed = outcome.replayed
    ? ' The dataset had changed since I last read it, so I re-applied this on top of that change.'
    : '';

  /**
   * A rename after the draft exists still keeps the id it was created with —
   * only the name changes, and a user who just renamed a dataset has reason
   * to wonder whether anything referencing the old id broke. Read only from
   * the server's own re-read of the dataset, never derived from the new name
   * locally: `datasetIdFromName` is how the id is chosen *before* create, and
   * reusing it here would be a guess dressed up as a fact.
   */
  const idStays =
    action.kind === 'set_dataset_name' && outcome.dataset.dataset_id
      ? ` Its id stays ${outcome.dataset.dataset_id}, which does not change once the draft exists.`
      : '';

  return {
    text: `Done — ${describeAction(
      action,
      outcome.dataset as Record<string, unknown> | undefined,
    )}.${created}${replayed}${idStays}`,
  };
};

/**
 * What is said when nothing could be done with what was typed.
 *
 * The wording used to carry examples — "make order_id required" — which
 * named a field most datasets do not have. Reported by the user, plainly:
 * "it says order id for any dataset". So an example is only given when it
 * can be drawn from the dataset in hand, and the rest of the sentence
 * points at the question that is actually on the table.
 */
export interface ResolutionContext {
  /**
   * False when the utterance is not about a dataset at all. Then the honest
   * answer is that it cannot be done here, rather than that it was not
   * understood — the assistant does one job.
   */
  onTopic?: boolean;
  /** Field paths of this dataset, for an example that exists. */
  fieldPaths?: string[];
  /** The question the assistant is waiting on, when it is waiting on one. */
  asked?: string;
  /** What the user said, so the reply can guess at what it was about. */
  said?: string;
}

const OFF_TOPIC =
  'I can only work on this dataset — its name and type, its schema, and how it is processed and stored. That one is outside what I can do here.';

const DID_NOT_UNDERSTAND = 'I did not understand that.';

/**
 * A guess at the subject, when the words carry one.
 *
 * Not an answer and not an action — a question back. Being wrong costs the
 * user a word; saying nothing costs them a guess at what the assistant can
 * even do.
 */
const guessAt = ({ onTopic, said }: ResolutionContext): string => {
  if (onTopic === false || !said) return '';

  const subject = topicOf(said);

  return subject ? ` Did you mean something about ${subject}?` : '';
};

const helpFor = ({ fieldPaths = [], asked }: ResolutionContext): string => {
  if (asked) return ` I am asking: ${asked}`;

  const [field] = fieldPaths;

  return field
    ? ` You can tell me things like "make ${field} required" or "enable the real-time store".`
    : '';
};

export const narrateResolution = (
  resolution: Resolution,
  context: ResolutionContext = {},
): Narration => {
  // `containModelText` is the same containment `engine/turn.ts` applies to
  // the router's own `reply` — see that function's own doc for why this is
  // a length cap rather than a fixed-sentence substitution. An over-length
  // question falls through to the honest "did not understand"/off-topic
  // wording below, exactly as an absent question already does.
  const question = containModelText(resolution.clarify?.question);
  const options = resolution.clarify?.options ?? [];
  const actions = resolution.candidateActions ?? [];

  // Candidates are only offered as buttons when the resolver built a complete
  // action for each; a bare list would leave the user retyping.
  const card: MessageCard | undefined =
    actions.length > 0 && actions.length === options.length
      ? {
          kind: 'choice',
          options: options.map((label, index) => ({
            label,
            action: actions[index],
          })),
        }
      : undefined;

  if (question) return { text: question, card };

  /**
   * Both halves matter when a question is on the table. Saying only that
   * the request is outside the job leaves the user unsure what the
   * assistant is waiting for; saying only the question ignores what they
   * actually asked.
   */
  const opening = context.onTopic === false ? OFF_TOPIC : DID_NOT_UNDERSTAND;

  return {
    text: `${opening}${guessAt(context)}${helpFor(context)}`,
    card,
  };
};

/** Reused wherever a pending card is declined, so the sentence cannot drift. */
export const LEFT_IT_AS_IT_WAS = 'Left it as it was.';

/**
 * Appended to a plan's failing step when it was not the only thing the turn
 * asked for — so a compound instruction that partly failed does not read as
 * one that quietly finished. The failure's own reason stays in the same
 * message; this only adds that the rest was not attempted.
 */
export const STOPPED_PART_WAY =
  'I stopped there, so anything after that in your message has not been done.';

/**
 * The screen named for a capability the assistant declines by construction.
 *
 * Fixed, one sentence each, and none of them claims a write happened — the
 * model only ever names *which* of these four it read, never the wording:
 * that keeps the assistant from ever describing itself as having published
 * or deleted something it did not.
 */
export const OUT_OF_SCOPE: Record<OutOfScope, string> = {
  // Matches the wording the closing check already gives for the same
  // decision, so "publish" reads the same whether it is declined outright or
  // named as what is still left to do after a save.
  publish:
    "I do not publish datasets from here — to make it live, publish it from the dataset list or the wizard's preview.",
  delete:
    'I do not delete datasets from here — that is done from the dataset list.',
  navigate:
    'I only work inside this one wizard — I cannot take you to another page for that.',
  metrics:
    "Dataset health and metrics are not shown here — they are on the dataset's metrics page.",
};

/**
 * What is said when denormalisation is asked about and there is nothing to
 * join to yet.
 *
 * Deliberately not folded into `OUT_OF_SCOPE`: denormalisation *is* something
 * this assistant can do — `set_denorm`/`select_denorm` are ordinary actions,
 * reachable the moment a master dataset exists — there is simply nothing on
 * offer right now. `OUT_OF_SCOPE` is for a capability declined by
 * construction; this is a capability with nothing to act on, which is a
 * different honest answer and needs its own sentence rather than borrowing
 * that one's wording. Names the real screen the wizard's own "Create Master
 * Dataset" button sends you to — `/dataset/create?datasetType=master`,
 * confirmed in `src/router/index.tsx` (labelled "New Dataset" there) and in
 * `DataDenormalization.tsx`'s own `openCreateMasterDataset` — never a screen
 * invented for this sentence.
 */
export const NO_MASTER_DATASETS =
  'There are no master datasets to join to yet — create one first from New Dataset, with its type set to master, then come back and I can pull its fields in.';

/**
 * The one gate a raw model string passes through before it is allowed to
 * become the *entire* text of a message.
 *
 * `narrateOutOfScope` below has this problem solved already for a capability
 * the engine declines by construction: there is a fixed, engine-owned
 * sentence per capability, so the model's own words can only ever be
 * appended parenthetically — never the whole reply. An `ask`/`other`
 * chit-chat reply and a `clarify` question have no such fixed sentence to
 * fall back on: a chit-chat reply *is* open-ended free text (there is no
 * generic thing to say instead of answering "what is a master dataset?"),
 * and a clarifying question is, by definition, whatever the resolver needs
 * to ask — there is no one fixed question either tier could substitute in
 * its place. So neither can be contained by "replace the model's words with
 * a fixed sentence and append them after"; there is nothing to replace them
 * with.
 *
 * What both cases share instead is that the string is the model's own
 * unverified prose, and the risk is the same one `narrateOutOfScope` guards
 * against: the model claiming, in its own words, that something happened
 * which the engine never did. Bounding the length is what `model/router.ts`
 * already does for exactly this reason on its own `reply` field — an
 * unbounded free-text field is an unbounded surface for a fabricated claim,
 * a bounded one at least cannot smuggle in a paragraph's worth of invented
 * narrative. This function re-checks that same bound defensively, the same
 * belt-and-braces way `readRouterReply` re-checks `reply` against
 * `REPLY_MAX_LENGTH` rather than trusting its own schema to have been
 * compiled correctly upstream — so the guarantee here does not depend on
 * every caller having gone through schema validation first.
 *
 * Both places in the engine that let a raw model string become an entire
 * message's text route through this one function: `engine/turn.ts`'s
 * `ask`/`other` branch, for the router's own `reply`, and `narrateResolution`
 * below, for `clarify.question`. They are not unified into one call any
 * further than that shared check — one takes a `RouterResult`, the other a
 * `Resolution`, two genuinely different shapes produced by two genuinely
 * different pipeline stages, and forcing them through one function beyond
 * "run the same containment check" would only add indirection without
 * removing a second trust boundary, since the boundary that mattered (an
 * unbounded model string reaching the user unchecked) is exactly what this
 * shared check removes. `undefined` in is `undefined` out: there is nothing
 * to contain when there is nothing to say, and every caller already has its
 * own honest fallback for that case — `NOT_SURE_FALLBACK` in `turn.ts`, and
 * the off-topic/did-not-understand wording below.
 */
export const containModelText = (text?: string): string | undefined =>
  text && text.length <= TEXT_MAX_LENGTH ? text : undefined;

/**
 * What is said for a capability the engine declines by construction.
 *
 * The fixed, per-capability sentence is authoritative — it is what keeps the
 * assistant from ever implying it did something it does not do. The model's
 * own `reply` is kept only as a parenthetical, since it read the words that
 * got here and may add something true about them, but it is never allowed to
 * replace or contradict the fixed wording.
 */
export const narrateOutOfScope = (
  capability: OutOfScope,
  reply?: string,
): Narration => ({
  text: reply
    ? `${OUT_OF_SCOPE[capability]} (${reply})`
    : OUT_OF_SCOPE[capability],
});

/**
 * What `explain` says, without running anything.
 *
 * `explain` never reaches the executor, so this can only ever name the
 * topic back — it must not claim the assistant looked into it, searched for
 * it, or will come back with more, since none of that happens. What it can
 * say honestly is what it can do instead: act on the dataset directly.
 */
export const narrateExplain = (
  action: Extract<Action, { kind: 'explain' }>,
): Narration => ({
  text: action.topic
    ? `I do not have an explanation of ${action.topic} to give from here — tell me what to set, add, or change on the dataset, and I will do it directly.`
    : 'I do not have an explanation to give from here — tell me what to set, add, or change on the dataset, and I will do it directly.',
});
