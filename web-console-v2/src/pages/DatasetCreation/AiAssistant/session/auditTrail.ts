/**
 * The action trail for one conversation, as a document that can leave the
 * browser.
 *
 * Every assistant turn that changed something records the `Action` it
 * dispatched, so the transcript is already an audit trail — this turns it into
 * a file someone can keep, attach to a ticket or diff against the dataset.
 *
 * Two things are deliberately **not** in it:
 *
 * - **The sample rows.** They are the user's own data, and the session holds
 *   them capped and time-limited for exactly that reason. An export would be
 *   a copy with none of those protections.
 * - **Credentials.** They never reach storage, and `scrubSecrets` runs again
 *   here as a backstop at the second boundary where data leaves.
 *
 * Nothing is inferred, either. A message records the action and, when it
 * failed, the code — so a rejected change says so, and a change that went
 * through is left to the turn's own words rather than being relabelled with
 * an outcome the transcript never held.
 */
import { Action } from '../engine/actions';
import { scrubSecrets } from './sessionStore';
import { AiSession, Message, MessageRole, ModelTier } from './types';

export const AUDIT_FORMAT_VERSION = 1;

export interface AuditEntry {
  at: string;
  role: MessageRole;
  text: string;
  /** The action this turn dispatched, when it dispatched one. */
  action?: Action;
  /** Present when the change was rejected; absent means it was not. */
  rejected?: true;
  failureCode?: string;
  /** What would put this change back, when it can be put back. */
  inverse?: Action[];
  /** Why it cannot be, when it cannot. */
  undoBlocked?: string;
  /** True once this change has been undone by a later turn. */
  undone?: boolean;
}

export interface AuditTrail {
  formatVersion: number;
  exportedAt: string;
  session: {
    sessionId: string;
    mode: string;
    datasetId: string | null;
    step: string;
    modelTier: ModelTier;
    startedAt: string;
    updatedAt: string;
    connector?: { id: string; name?: string };
    connectorConfigured: boolean;
  };
  summary: {
    turns: number;
    changes: number;
    rejected: number;
    undone: number;
  };
  entries: AuditEntry[];
}

const iso = (at: number): string => new Date(at).toISOString();

const toEntry = (message: Message): AuditEntry => ({
  at: iso(message.createdAt),
  role: message.role,
  text: message.text,
  ...(message.action ? { action: message.action } : {}),
  ...(message.failureCode
    ? { rejected: true as const, failureCode: message.failureCode }
    : {}),
  ...(message.inverse ? { inverse: message.inverse } : {}),
  ...(message.undoBlocked ? { undoBlocked: message.undoBlocked } : {}),
  ...(message.undone ? { undone: true } : {}),
});

export const buildAuditTrail = (
  session: AiSession,
  now: number = Date.now(),
): AuditTrail => {
  const entries = session.messages.map(toEntry);
  const changed = entries.filter((entry) => entry.action);

  const trail: AuditTrail = {
    formatVersion: AUDIT_FORMAT_VERSION,
    exportedAt: iso(now),
    session: {
      sessionId: session.sessionId,
      mode: session.mode,
      datasetId: session.datasetId,
      step: session.step,
      modelTier: session.modelTier,
      startedAt: iso(session.createdAt),
      updatedAt: iso(session.updatedAt),
      // The values the connector was given are configuration, not part of the
      // trail of actions; the identity is what makes the trail readable.
      ...(session.connector
        ? {
            connector: {
              id: session.connector.id,
              ...(session.connector.name
                ? { name: session.connector.name }
                : {}),
            },
          }
        : {}),
      connectorConfigured: session.connectorConfigured,
    },
    summary: {
      turns: entries.length,
      changes: changed.length,
      rejected: changed.filter((entry) => entry.rejected).length,
      undone: changed.filter((entry) => entry.undone).length,
    },
    entries,
  };

  return scrubSecrets(trail);
};

/** `dataset-assistant-my-orders-session-abc`, with `.json` added by the writer. */
export const auditFileName = (session: AiSession): string =>
  `dataset-assistant-${session.datasetId ?? 'new-dataset'}-${
    session.sessionId
  }`;
