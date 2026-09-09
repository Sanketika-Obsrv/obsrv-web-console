/**
 * The shape of one conversation.
 *
 * What is deliberately *not* here matters as much as what is: no dataset
 * document, no config blocks, no `data_schema`. Dataset state is always
 * re-read from the server, so a stale session can never be rendered as truth.
 * The session holds only the conversation, the step, and the sample rows the
 * user supplied.
 */
import { Action } from '../engine/actions';
import { ExecutionFailureCode, PendingDataset } from '../engine/executor';
import { PreviewSection } from '../engine/previewFocus';
import { MessageCard } from '../messages/types';

export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * One turn. An assistant message that changed something records the `Action`
 * it produced, which is what makes the transcript an audit trail rather than
 * just prose.
 */
export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: number;
  /** The action this turn dispatched, when it dispatched one. */
  action?: Action;
  /** Set when the action was rejected. */
  failureCode?: ExecutionFailureCode;
  /** Which preview section the turn concerned, for re-focusing on resume. */
  section?: PreviewSection;
  /**
   * A card this turn presents — a file drop, a set of choices, a conflict to
   * resolve. Cards are how every action stays reachable without a model.
   */
  card?: MessageCard;
  /**
   * The actions that would put this change back, computed from the document
   * as it was *before* the write.
   *
   * Actions rather than a document snapshot: an inverse expressed in the same
   * vocabulary is small enough to persist, keeps undo working after a reload,
   * and is auditable in exactly the way an instruction is — where caching the
   * dataset document would break the rule that dataset state is always
   * re-read from the server.
   */
  inverse?: Action[];
  /** Why this change cannot be undone, when it cannot. */
  undoBlocked?: string;
  /** Set once this change has been undone, so it is not offered twice. */
  undone?: boolean;
}

export type SessionMode = 'create' | 'update';

/** Tier of in-browser model the session ran with. 0 = rule-only. */
export type ModelTier = 0 | 1 | 2 | 3;

export interface AiSession {
  sessionId: string;
  /** Null until `datasets/create` has run. */
  datasetId: string | null;
  /**
   * Name, derived id and type chosen before the draft exists.
   *
   * The server cannot hold these until `datasets/create` has run, so the
   * session carries them between turns and drops them the moment the draft
   * exists and the server owns them. Typed as the executor's own
   * `PendingDataset` so what is stored is exactly what is handed back.
   */
  pending: PendingDataset;
  mode: SessionMode;
  step: string;
  messages: Message[];
  /**
   * Rows the user supplied, kept for local inference and duplicate counting.
   * Capped and given an expiry because they may contain personal data.
   */
  sampleRows: unknown[];
  /** When `sampleRows` stops being readable. */
  sampleExpiresAt: number | null;
  /** Last `version_key` seen, for reporting concurrent edits — never for writing. */
  lastVersionKey: string | null;
  modelTier: ModelTier;
  /**
   * Whether connector credentials have been supplied. The credentials
   * themselves are never stored, so this boolean is all that persists.
   */
  connectorConfigured: boolean;
  /**
   * The connector chosen and the non-secret values gathered for it.
   *
   * Persisted so a reload does not lose eight collected values — postgres
   * marks nine of its ten properties required. Secrets are absent by
   * construction: the classifier keeps them out of `values`, and the store
   * scrubs as a backstop.
   */
  connector?: {
    id: string;
    name?: string;
    values: Record<string, unknown>;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * The persistence port.
 *
 * Keeping the store's logic behind this interface means the rules — capping,
 * expiry, scrubbing — are tested directly against an in-memory implementation,
 * and IndexedDB is a thin adapter with nothing to get wrong.
 */
export interface SessionStorage {
  get(sessionId: string): Promise<AiSession | undefined>;
  put(session: AiSession): Promise<void>;
  delete(sessionId: string): Promise<void>;
  list(): Promise<AiSession[]>;
}
