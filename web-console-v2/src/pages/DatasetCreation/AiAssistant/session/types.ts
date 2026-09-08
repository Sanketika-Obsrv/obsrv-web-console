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
import { ExecutionFailureCode } from '../engine/executor';
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
}

export type SessionMode = 'create' | 'update';

/** Tier of in-browser model the session ran with. 0 = rule-only. */
export type ModelTier = 0 | 1 | 2 | 3;

export interface AiSession {
  sessionId: string;
  /** Null until `datasets/create` has run. */
  datasetId: string | null;
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
