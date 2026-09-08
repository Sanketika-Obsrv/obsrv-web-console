/**
 * Turns a typed utterance into an `Action`, with no model involved.
 *
 * This is what makes the rule-only tier a real product rather than a
 * placeholder: the common phrasings at every step are handled by pattern and
 * vocabulary matching, and anything else is asked about rather than guessed.
 *
 * The governing rule is asymmetric. A miss costs the user one clarifying
 * question; a false positive writes the wrong thing to their dataset. So every
 * pattern requires an explicit verb *and* a field that exists, ambiguity is
 * always surfaced, and an unrecognised datatype is never coerced to the
 * nearest one.
 */
import {
  ARRIVAL_FORMATS,
  Action,
  ArrivalFormat,
  DATA_TYPES,
  DataType,
  DatasetType,
  WIZARD_STEPS,
  WizardStep,
} from './actions';
import { isSecretProp } from './connectors';
import {
  FieldVocabulary,
  dedupEligiblePaths,
  piiEligiblePaths,
  resolveField,
  storageKeyEligiblePaths,
} from './fieldVocabulary';

export interface ResolverContext {
  vocabulary: FieldVocabulary;
  /** Connectors available to choose from, when the list has been read. */
  connectors?: { id: string; name?: string }[];
  /**
   * The connector's non-secret property keys. Absent until a connector is
   * chosen, which is what stops `set X to Y` being read as a connector field
   * before there is a connector.
   */
  connectorProperties?: string[];
}

export type ResolutionStatus = 'resolved' | 'ambiguous' | 'unknown';

export interface Resolution {
  status: ResolutionStatus;
  action?: Action;
  /** 0 when nothing resolved; ~0.95 for an exact field, ~0.7 for a fuzzy one. */
  confidence: number;
  /** The field the utterance turned out to mean, when it named one. */
  resolvedPath?: string;
  /** What to ask when the utterance could not be acted on as written. */
  clarify?: { question: string; options?: string[] };
  /**
   * One complete action per candidate in `clarify.options`, so the caller can
   * offer them as buttons. Built here rather than substituted later, because
   * only the rule knows which slot of which action holds a field path.
   */
  candidateActions?: Action[];
}

const EXACT_CONFIDENCE = 0.95;
const FUZZY_CONFIDENCE = 0.7;
/** No field involved, so there is nothing to have matched wrongly. */
const FIELDLESS_CONFIDENCE = 0.9;

const unknown = (question?: string): Resolution => ({
  status: 'unknown',
  confidence: 0,
  ...(question ? { clarify: { question } } : {}),
});

const ambiguous = (
  question: string,
  options: string[],
  candidateActions?: Action[],
): Resolution => ({
  status: 'ambiguous',
  confidence: 0,
  clarify: { question, options },
  ...(candidateActions ? { candidateActions } : {}),
});

const resolved = (
  action: Action,
  confidence: number,
  resolvedPath?: string,
): Resolution => ({
  status: 'resolved',
  action,
  confidence,
  ...(resolvedPath ? { resolvedPath } : {}),
});

/** Strips the punctuation people type without meaning anything by it. */
const tidy = (utterance: string) =>
  utterance
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '');

/**
 * Field lookup that reports *why* it failed, so the caller can ask a useful
 * question instead of a generic one.
 */
type FieldLookup =
  | { ok: true; path: string; confidence: number }
  | { ok: false; resolution: Resolution };

const lookupField = (
  context: ResolverContext,
  term: string,
  eligible?: string[],
  build?: (path: string) => Action,
): FieldLookup => {
  const resolution = resolveField(context.vocabulary, term);

  if (resolution.status === 'ambiguous') {
    return {
      ok: false,
      resolution: ambiguous(
        `Which field did you mean by "${term.trim()}"?`,
        resolution.candidates,
        build ? resolution.candidates.map(build) : undefined,
      ),
    };
  }

  if (resolution.status === 'unknown') {
    return {
      ok: false,
      resolution: unknown(`I could not find a field called "${term.trim()}".`),
    };
  }

  // Refusing here saves a write the picker would have rejected anyway.
  if (eligible && !eligible.includes(resolution.path)) {
    return {
      ok: false,
      resolution: eligible.length
        ? ambiguous(
            `"${resolution.path}" cannot be used here. Which field did you mean?`,
            eligible,
            build ? eligible.map(build) : undefined,
          )
        : unknown(`"${resolution.path}" cannot be used here.`),
    };
  }

  return {
    ok: true,
    path: resolution.path,
    confidence:
      resolution.status === 'exact' ? EXACT_CONFIDENCE : FUZZY_CONFIDENCE,
  };
};

const DATA_TYPE_WORDS = new Map<string, DataType>(
  DATA_TYPES.map((type) => [type.replace(/[-_]/g, ''), type]),
);

/** Only a datatype the API accepts. "a widget" resolves to nothing. */
const asDataType = (word: string): DataType | undefined =>
  DATA_TYPE_WORDS.get(
    word
      .trim()
      .toLowerCase()
      .replace(/[-_\s]/g, ''),
  );

const asArrivalFormat = (word: string): ArrivalFormat | undefined =>
  ARRIVAL_FORMATS.find((format) => format === word.trim().toLowerCase()) as
    ArrivalFormat | undefined;

const DATASET_TYPE_WORDS: [RegExp, DatasetType][] = [
  [/\b(event|telemetry)\b/, 'event'],
  [/\b(master|reference|lookup)\b/, 'master'],
  [/\b(transaction|transactions|updates|changes)\b/, 'transaction'],
];

const STEP_WORDS: [RegExp, WizardStep][] = [
  [/\bconnector\b/, 'connector'],
  [/\bingestion\b/, 'ingestion'],
  [/\bschema\b/, 'schema'],
  [/\bprocessing\b/, 'processing'],
  [/\bstorage\b/, 'storage'],
  [/\b(preview|review)\b/, 'preview'],
];

/** One rule: a pattern, and what to do with what it captured. */
interface Rule {
  pattern: RegExp;
  resolve: (
    match: RegExpMatchArray,
    context: ResolverContext,
  ) => Resolution | null;
}

/** Applies a rule that needs one field and nothing else. */
const withField = (
  context: ResolverContext,
  term: string,
  build: (path: string) => Action,
  eligible?: string[],
): Resolution => {
  const field = lookupField(context, term, eligible, build);
  if (!field.ok) return field.resolution;

  return resolved(build(field.path), field.confidence, field.path);
};

const RULES: Rule[] = [
  // — Naming —
  {
    pattern: /^(?:call it|name it|name the dataset|call the dataset)\s+(.+)$/i,
    resolve: ([, name]) =>
      resolved(
        { kind: 'set_dataset_name', name: name.trim() },
        FIELDLESS_CONFIDENCE,
      ),
  },

  // — Dataset type —
  {
    pattern:
      /\b(?:it'?s|this is|these are|it is)\b.*\b(event|telemetry|master|reference|lookup|transaction|transactions|updates|changes)\b/i,
    resolve: (match) => {
      const found = DATASET_TYPE_WORDS.find(([pattern]) =>
        pattern.test(match[0].toLowerCase()),
      );
      return found
        ? resolved(
            { kind: 'set_dataset_type', datasetType: found[1] },
            FIELDLESS_CONFIDENCE,
          )
        : null;
    },
  },

  // — Conflicts, before the datatype rules so "resolve X as Y" is not read as a set —
  {
    pattern: /^resolve\s+(.+?)\s+(?:as|to)\s+(?:an?\s+)?(\S+)$/i,
    resolve: ([, term, type], context) => {
      const dataType = asDataType(type);
      if (!dataType) return null;

      return withField(context, term, (path) => ({
        kind: 'resolve_conflict',
        path,
        mode: 'apply',
        dataType,
      }));
    },
  },
  {
    pattern: /^keep the (?:current|existing) type (?:for|of)\s+(.+)$/i,
    resolve: ([, term], context) =>
      withField(context, term, (path) => ({
        kind: 'resolve_conflict',
        path,
        mode: 'dismiss',
      })),
  },

  // — Arrival format, before datatype: "arrives as" is unambiguous —
  {
    pattern: /^(.+?)\s+arrives? as\s+(?:an?\s+)?(\S+)$/i,
    resolve: ([, term, word], context) => {
      const arrivalFormat = asArrivalFormat(word);
      if (!arrivalFormat) return null;

      return withField(context, term, (path) => ({
        kind: 'set_arrival_format',
        path,
        arrivalFormat,
      }));
    },
  },

  // — Datatype —
  {
    pattern:
      /^(?:make|set|change)\s+(?:the\s+)?(?:type of\s+)?(.+?)\s+(?:to|a|an|as)\s+(?:an?\s+)?(\S+)$/i,
    resolve: ([, term, word], context) => {
      const dataType = asDataType(word);
      if (!dataType) return null;

      return withField(context, term, (path) => ({
        kind: 'set_data_type',
        path,
        dataType,
      }));
    },
  },
  {
    pattern: /^(.+?)\s+should be\s+(?:an?\s+)?(\S+)$/i,
    resolve: ([, term, word], context) => {
      const dataType = asDataType(word);
      if (!dataType) return null;

      return withField(context, term, (path) => ({
        kind: 'set_data_type',
        path,
        dataType,
      }));
    },
  },

  // — Required / optional —
  {
    pattern: /^(?:make|mark)\s+(.+?)\s+(?:required|mandatory)$/i,
    resolve: ([, term], context) =>
      withField(context, term, (path) => ({
        kind: 'toggle_required',
        path,
        required: true,
      })),
  },
  {
    pattern: /^(.+?)\s+is\s+(?:required|mandatory)$/i,
    resolve: ([, term], context) =>
      withField(context, term, (path) => ({
        kind: 'toggle_required',
        path,
        required: true,
      })),
  },
  {
    pattern: /^(?:make\s+)?(.+?)\s+(?:is\s+)?optional$/i,
    resolve: ([, term], context) =>
      withField(context, term, (path) => ({
        kind: 'toggle_required',
        path,
        required: false,
      })),
  },

  // — Description —
  {
    pattern: /^describe\s+(.+?)\s+as\s+(.+)$/i,
    resolve: ([, term, description], context) =>
      withField(context, term, (path) => ({
        kind: 'set_description',
        path,
        description: description.trim(),
      })),
  },

  // — Delete —
  {
    pattern:
      /^(?:delete|remove|drop)\s+(?:the\s+)?(.+?)(?:\s+field|\s+column)?$/i,
    resolve: ([, term], context) =>
      withField(context, term, (path) => ({ kind: 'delete_field', path })),
  },

  // — Additional fields —
  {
    pattern: /\b(allow|accept|permit)\b.*\b(extra|new|additional|unknown)\b/i,
    resolve: () =>
      resolved(
        { kind: 'set_additional_fields', allow: true },
        FIELDLESS_CONFIDENCE,
      ),
  },
  {
    pattern:
      /\b(reject|refuse|disallow|block|don'?t allow)\b.*\b(extra|new|additional|unknown)\b/i,
    resolve: () =>
      resolved(
        { kind: 'set_additional_fields', allow: false },
        FIELDLESS_CONFIDENCE,
      ),
  },

  // — PII —
  {
    pattern: /^(mask|encrypt)\s+(?:the\s+)?(.+)$/i,
    resolve: ([, verb, term], context) =>
      withField(
        context,
        term,
        (path) => ({
          kind: 'set_pii',
          path,
          action: verb.toLowerCase() as 'mask' | 'encrypt',
          skipOnFailure: true,
        }),
        piiEligiblePaths(context.vocabulary),
      ),
  },

  // — Derived fields and transformations —
  //
  // The expression is taken verbatim, quotes and all: it is JSONata, and
  // rewriting any of it would change what it evaluates to. Preflight decides
  // whether it is valid, not this pattern.
  {
    pattern:
      /^(?:add (?:a )?)?derived (?:field|column)\s+([A-Za-z_][\w.]*)\s*(?:=|as)\s*(.+)$/i,
    resolve: ([, name, expression]) =>
      resolved(
        {
          kind: 'add_derived_field',
          name: name.trim(),
          expression: expression.trim(),
          skipOnFailure: true,
        },
        FIELDLESS_CONFIDENCE,
      ),
  },
  {
    pattern: /^transform\s+(.+?)\s+(?:with|using|to)\s+(.+)$/i,
    resolve: ([, term, expression], context) =>
      withField(context, term, (path) => ({
        kind: 'add_transformation',
        path,
        expression: expression.trim(),
        skipOnFailure: true,
      })),
  },

  // — Dedup —
  {
    pattern:
      /\b(?:no|disable|turn off|without)\b.*\b(?:dedup|dedupe|deduplication|duplicates)\b/i,
    resolve: () =>
      resolved({ kind: 'set_dedup', enabled: false }, FIELDLESS_CONFIDENCE),
  },
  {
    pattern:
      /\b(?:dedup|dedupe|deduplicate|drop duplicates|remove duplicates)\b.*?\b(?:on|using|by|with)\s+(.+)$/i,
    resolve: ([, term], context) =>
      withField(
        context,
        term,
        (path) => ({ kind: 'set_dedup', enabled: true, key: path }),
        dedupEligiblePaths(context.vocabulary),
      ),
  },

  // — Storage —
  {
    pattern:
      /\b(enable|turn on|use|add|disable|turn off|remove)\b.*\b(lakehouse|lake house|hudi|real-?time|realtime|druid|cache|redis)\b/i,
    resolve: (match) => {
      const on = /^(enable|turn on|use|add)$/i.test(match[1]);
      const store = match[2].toLowerCase();

      if (/lake|hudi/.test(store)) {
        return resolved(
          { kind: 'set_storage', lakehouse: on },
          FIELDLESS_CONFIDENCE,
        );
      }
      if (/real|druid/.test(store)) {
        return resolved(
          { kind: 'set_storage', realtime: on },
          FIELDLESS_CONFIDENCE,
        );
      }
      return resolved({ kind: 'set_storage', cache: on }, FIELDLESS_CONFIDENCE);
    },
  },

  // — Keys —
  {
    pattern: /\b(?:primary|data)\s*key\b(?:\s+is|\s*[:=])?\s+(.+)$/i,
    resolve: ([, term], context) =>
      withField(
        context,
        term,
        (path) => ({ kind: 'set_keys', primary: path }),
        storageKeyEligiblePaths(context.vocabulary),
      ),
  },
  {
    pattern: /\bpartition\s*(?:key\b(?:\s+is)?|by|on)\s+(.+)$/i,
    resolve: ([, term], context) =>
      withField(
        context,
        term,
        (path) => ({ kind: 'set_keys', partition: path }),
        storageKeyEligiblePaths(context.vocabulary),
      ),
  },
  {
    // `\s*` before the optional noun: "as the timestamp" ends at the word,
    // so requiring a space after it matched nothing.
    pattern:
      /\b(?:use\s+)?(.+?)\s+as (?:the )?(?:timestamp|time)\s*(?:key|field|column)?$/i,
    resolve: ([, term], context) =>
      withField(context, term, (path) => ({
        kind: 'set_keys',
        timestamp: path,
      })),
  },
  {
    pattern: /\btimestamp\s*(?:key\b(?:\s+is)?|is|[:=])\s+(.+)$/i,
    resolve: ([, term], context) =>
      withField(context, term, (path) => ({
        kind: 'set_keys',
        timestamp: path,
      })),
  },

  // — Connector —
  {
    pattern: /\b(?:skip|no)\b.*\bconnector\b/i,
    resolve: () => resolved({ kind: 'skip_connector' }, FIELDLESS_CONFIDENCE),
  },
  {
    // Credentials are refused here rather than resolved and rejected later,
    // so the value never becomes an action and never reaches the transcript.
    pattern:
      /^(?:set|use)\s+(?:the\s+)?([A-Za-z_][\w.]*)\s+(?:to|as|=)\s*(.+)$/i,
    resolve: ([, property, value], context) => {
      if (!context.connectorProperties?.length) return null;

      const known = context.connectorProperties.find(
        (candidate) =>
          candidate.toLowerCase() === property.trim().toLowerCase(),
      );
      if (!known) return null;

      if (isSecretProp(known, {})) {
        return unknown(
          `${known} is a credential, so I will ask for it in a secure form rather than in chat.`,
        );
      }

      return resolved(
        { kind: 'set_connector_field', property: known, value: value.trim() },
        FIELDLESS_CONFIDENCE,
      );
    },
  },
  {
    pattern:
      /\b(?:use|connect (?:to|with)|pull from|read from)\s+(?:the\s+)?([A-Za-z][\w.-]*)\s*(?:connector)?$/i,
    resolve: ([, term], context) => {
      const connectors = context.connectors ?? [];
      if (!connectors.length) return null;

      const needle = term.trim().toLowerCase();
      const matches = connectors.filter(
        (connector) =>
          connector.id.toLowerCase().includes(needle) ||
          (connector.name ?? '').toLowerCase().includes(needle),
      );

      if (matches.length === 1) {
        return resolved(
          { kind: 'select_connector', connectorId: matches[0].id },
          FIELDLESS_CONFIDENCE,
        );
      }

      if (matches.length > 1) {
        return ambiguous(
          `Which connector did you mean by "${term.trim()}"?`,
          matches.map((connector) => connector.name ?? connector.id),
          matches.map((connector) => ({
            kind: 'select_connector',
            connectorId: connector.id,
          })),
        );
      }

      return null;
    },
  },

  // — Navigation —
  {
    pattern:
      /\b(?:go to|take me (?:back )?to|jump to|open|back to)\b.*\b(connector|ingestion|schema|processing|storage|preview|review)\b/i,
    resolve: (match) => {
      const found = STEP_WORDS.find(([pattern]) =>
        pattern.test(match[0].toLowerCase()),
      );
      return found
        ? resolved({ kind: 'goto_step', step: found[1] }, FIELDLESS_CONFIDENCE)
        : null;
    },
  },

  // — Explain —
  {
    pattern:
      /^(?:what(?:'s| is| does)|explain|why|tell me about)\b\s*(?:the\s+)?(.+?)(?:\s+mean)?$/i,
    resolve: ([, topic]) =>
      resolved(
        { kind: 'explain', topic: topic.trim().toLowerCase() },
        FIELDLESS_CONFIDENCE,
      ),
  },

  // — Undo —
  {
    pattern: /^(?:undo|revert|take that back)\b/i,
    resolve: () => resolved({ kind: 'undo' }, FIELDLESS_CONFIDENCE),
  },

  // — Save —
  {
    pattern: /^(?:save|publish|finish|i'?m done|that'?s (?:it|all)|done)\b/i,
    resolve: () => resolved({ kind: 'save' }, FIELDLESS_CONFIDENCE),
  },
];

export const resolveUtterance = (
  utterance: string,
  context: ResolverContext,
): Resolution => {
  const text = tidy(utterance ?? '');
  if (!text) return unknown();

  /**
   * A rule that matched but could not act — an unknown field, an ambiguous
   * one — is remembered rather than returned immediately, so a later rule
   * still gets its chance. Whatever the best explanation was is what the user
   * gets asked about.
   */
  let best: Resolution | null = null;

  for (const rule of RULES) {
    const match = text.match(rule.pattern);
    if (!match) continue;

    const resolution = rule.resolve(match, context);
    if (!resolution) continue;

    if (resolution.status === 'resolved') return resolution;

    // Prefer naming candidates over admitting defeat.
    if (
      !best ||
      (best.status === 'unknown' && resolution.status === 'ambiguous')
    ) {
      best = resolution;
    }
  }

  return best ?? unknown();
};

/** Steps a `goto_step` may name, re-exported for the caller's chips. */
export const RESOLVABLE_STEPS = WIZARD_STEPS;
