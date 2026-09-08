/**
 * One conversation per dataset workflow, persisted locally.
 *
 * The rules that matter live here rather than in the storage adapter, so they
 * are tested directly:
 *
 * - **No dataset state is cached.** The session holds the transcript, the step
 *   and the user's sample rows. Everything about the dataset is re-read, so a
 *   stale session can never be rendered as truth.
 * - **Sample rows are capped and expire.** They are the user's own data and may
 *   contain personal information, so they are bounded, time-limited, cleared on
 *   save and clearable on request.
 * - **Credentials never reach storage.** The action space already routes
 *   secrets to a form instead of through the model; `scrubSecrets` is the second
 *   line of defence at the persistence boundary.
 */
import _ from 'lodash';
import { SECRET_PROP_NAME } from '../engine/connectors';
import {
  AiSession,
  Message,
  ModelTier,
  SessionMode,
  SessionStorage,
} from './types';

/** Enough rows for inference and duplicate counting, not a copy of the file. */
export const MAX_SAMPLE_ROWS = 200;

/** Sample rows stop being readable a day after they were supplied. */
export const SAMPLE_TTL_MS = 24 * 60 * 60 * 1000;

export const REDACTED = '[redacted]';

/**
 * Property names whose values are credentials.
 *
 * Shared with the connector classifier rather than written twice. The two had
 * drifted: this copy lacked `pwd`, `truststore` and `keystore`, so Kafka's
 * `..._truststore_base64` cert material was persisted in plain text. Caught
 * by `secretLeak.test.ts`, which is exactly what that test is for.
 *
 * Still narrow in one deliberate respect — a bare `key` would match
 * `dedup_key`, `data_key`, `partition_key`, `timestamp_key` and
 * `version_key`, all legitimate dataset configuration whose redaction would
 * corrupt the audit trail.
 */
const SECRET_KEY = SECRET_PROP_NAME;

/**
 * Keys that *name* the field a sibling `value` belongs to.
 *
 * `set_connector_field` is `{ property, value }`, so the credential sits under
 * a neutral key and its sensitivity is declared by the neighbour. Matching on
 * key names alone would let `{ property: 'password', value: 'hunter2' }`
 * straight through.
 */
const NAMING_KEYS = ['property', 'field', 'name'];

const namesASecret = (source: Record<string, unknown>): boolean =>
  NAMING_KEYS.some((key) => {
    const named = source[key];
    return typeof named === 'string' && SECRET_KEY.test(named);
  });

/** Replaces credential-bearing values, leaving the structure intact. */
export const scrubSecrets = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => scrubSecrets(item)) as unknown as T;
  }

  if (!_.isPlainObject(value)) return value;

  const source = value as Record<string, unknown>;
  const redactSiblingValue = namesASecret(source);
  const result: Record<string, unknown> = {};

  Object.keys(source).forEach((key) => {
    if (SECRET_KEY.test(key) || (redactSiblingValue && key === 'value')) {
      result[key] = REDACTED;
      return;
    }

    result[key] = scrubSecrets(source[key]);
  });

  return result as unknown as T;
};

/** A message as the caller supplies it; ids and timestamps are added here. */
export type NewMessage = Omit<Message, 'id' | 'createdAt'>;

export interface SessionStore {
  start(options: { mode: SessionMode; step?: string }): Promise<AiSession>;
  load(sessionId: string): Promise<AiSession | undefined>;
  findByDataset(datasetId: string): Promise<AiSession | undefined>;
  attachDataset(
    sessionId: string,
    datasetId: string,
  ): Promise<AiSession | undefined>;
  /**
   * Records a name or type chosen before the draft exists. Merges, so naming
   * and typing in separate turns both survive.
   */
  setPending(
    sessionId: string,
    pending: AiSession['pending'],
  ): Promise<AiSession | undefined>;
  appendMessage(
    sessionId: string,
    message: NewMessage,
  ): Promise<AiSession | undefined>;
  setStep(sessionId: string, step: string): Promise<AiSession | undefined>;
  setModelTier(
    sessionId: string,
    tier: ModelTier,
  ): Promise<AiSession | undefined>;
  noteVersionKey(
    sessionId: string,
    versionKey: string,
  ): Promise<AiSession | undefined>;
  markConnectorConfigured(sessionId: string): Promise<AiSession | undefined>;
  /** Records the connector chosen, clearing any values from a previous one. */
  selectConnector(
    sessionId: string,
    connector: { id: string; name?: string },
  ): Promise<AiSession | undefined>;
  /** Merges one non-secret connector value into the buffer. */
  setConnectorValue(
    sessionId: string,
    key: string,
    value: unknown,
  ): Promise<AiSession | undefined>;
  setSampleRows(
    sessionId: string,
    rows: unknown[],
  ): Promise<AiSession | undefined>;
  readSampleRows(sessionId: string): Promise<unknown[]>;
  clearSample(sessionId: string): Promise<AiSession | undefined>;
  onSaved(sessionId: string): Promise<AiSession | undefined>;
  clear(sessionId: string): Promise<void>;
  /**
   * Removes conversations that were never spoken to and are not attached to a
   * draft. Returns how many went. Opening the assistant creates a session, so
   * without this an abandoned visit would leave one behind forever.
   */
  pruneEmpty(exceptSessionId?: string): Promise<number>;
  list(): Promise<AiSession[]>;
  /** False once a write has failed, e.g. IndexedDB refused in private browsing. */
  isPersisting(): boolean;
}

const newId = (prefix: string, now: number) =>
  `${prefix}-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const createSessionStore = (
  storage: SessionStorage,
  clock: () => number = Date.now,
): SessionStore => {
  let persisting = true;

  const write = async (session: AiSession): Promise<AiSession> => {
    try {
      await storage.put(session);
    } catch {
      // Losing persistence must not lose the conversation in this tab.
      persisting = false;
    }
    return session;
  };

  /** Reads, applies a change, stamps `updatedAt` and writes back. */
  const mutate = async (
    sessionId: string,
    change: (session: AiSession) => AiSession,
  ): Promise<AiSession | undefined> => {
    const current = await storage.get(sessionId);
    if (!current) return undefined;

    return write({ ...change(current), updatedAt: clock() });
  };

  const withoutExpiredSample = (session: AiSession): AiSession =>
    session.sampleExpiresAt !== null && session.sampleExpiresAt <= clock()
      ? { ...session, sampleRows: [], sampleExpiresAt: null }
      : session;

  return {
    start: async ({ mode, step = 'ingestion' }) => {
      const now = clock();

      return write({
        sessionId: newId('session', now),
        datasetId: null,
        pending: {},
        mode,
        step,
        messages: [],
        sampleRows: [],
        sampleExpiresAt: null,
        lastVersionKey: null,
        modelTier: 0,
        connectorConfigured: false,
        createdAt: now,
        updatedAt: now,
      });
    },

    load: (sessionId) => storage.get(sessionId),

    findByDataset: async (datasetId) =>
      (await storage.list()).find((session) => session.datasetId === datasetId),

    attachDataset: (sessionId, datasetId) =>
      // The draft now exists, so the server owns the name and type; keeping
      // local copies would let them rot.
      mutate(sessionId, (session) => ({
        ...session,
        datasetId,
        pending: {},
      })),

    setPending: (sessionId, pending) =>
      mutate(sessionId, (session) => ({
        ...session,
        pending: { ...session.pending, ...pending },
      })),

    appendMessage: (sessionId, message) =>
      mutate(sessionId, (session) => ({
        ...session,
        messages: [
          ...session.messages,
          scrubSecrets({
            ...message,
            id: newId('msg', clock()),
            createdAt: clock(),
          }),
        ],
      })),

    setStep: (sessionId, step) =>
      mutate(sessionId, (session) => ({ ...session, step })),

    setModelTier: (sessionId, modelTier) =>
      mutate(sessionId, (session) => ({ ...session, modelTier })),

    noteVersionKey: (sessionId, lastVersionKey) =>
      mutate(sessionId, (session) => ({ ...session, lastVersionKey })),

    markConnectorConfigured: (sessionId) =>
      mutate(sessionId, (session) => ({
        ...session,
        connectorConfigured: true,
      })),

    selectConnector: (sessionId, connector) =>
      // Values from a previous connector would be meaningless here, and
      // silently carrying them over could send one connector's settings to
      // another.
      mutate(sessionId, (session) => ({
        ...session,
        connector: { ...connector, values: {} },
        connectorConfigured: false,
      })),

    setConnectorValue: (sessionId, key, value) =>
      mutate(sessionId, (session) => {
        // A secret is *dropped*, not redacted. Storing `[redacted]` would be
        // worse than storing nothing: the buffer is merged into
        // `connector_config` on submit, so the connector would receive the
        // literal placeholder as its password.
        if (!session.connector || SECRET_KEY.test(key)) return session;

        return {
          ...session,
          connector: {
            ...session.connector,
            values: { ...session.connector.values, [key]: value },
          },
        };
      }),

    setSampleRows: (sessionId, rows) =>
      mutate(sessionId, (session) => ({
        ...session,
        // The first rows are the ones the schema was inferred from.
        sampleRows: rows.slice(0, MAX_SAMPLE_ROWS),
        sampleExpiresAt: clock() + SAMPLE_TTL_MS,
      })),

    readSampleRows: async (sessionId) => {
      const current = await storage.get(sessionId);
      if (!current) return [];

      const live = withoutExpiredSample(current);

      // Expired rows are dropped from storage, not merely hidden from callers.
      if (live !== current) await write(live);

      return live.sampleRows;
    },

    clearSample: (sessionId) =>
      mutate(sessionId, (session) => ({
        ...session,
        sampleRows: [],
        sampleExpiresAt: null,
      })),

    onSaved: (sessionId) =>
      mutate(sessionId, (session) => ({
        ...session,
        sampleRows: [],
        sampleExpiresAt: null,
      })),

    clear: async (sessionId) => {
      await storage.delete(sessionId);
    },

    pruneEmpty: async (exceptSessionId) => {
      const orphans = (await storage.list()).filter(
        (candidate) =>
          candidate.messages.length === 0 &&
          // A draft outlives the conversation, so keep the link to it.
          candidate.datasetId === null &&
          candidate.sessionId !== exceptSessionId,
      );

      await Promise.all(
        orphans.map((orphan) => storage.delete(orphan.sessionId)),
      );

      return orphans.length;
    },

    list: async () =>
      (await storage.list())
        // The resume list never needs the rows, and should not hold them in memory.
        .map((session) => ({ ...session, sampleRows: [] }))
        .sort((left, right) => right.updatedAt - left.updatedAt),

    isPersisting: () => persisting,
  };
};
