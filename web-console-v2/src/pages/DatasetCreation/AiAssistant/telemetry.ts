/**
 * What the assistant reports to the console's telemetry service.
 *
 * It goes through `services/telemetry`, the same path the rest of the console
 * uses, rather than a channel of its own — one honest caveat: that service's
 * `sendTelemetryEvents` is commented out today, so these events are built and
 * dropped. That is a platform decision, not one to work around here, and it is
 * why the **audit** trail is an export from the session rather than something
 * reconstructed from telemetry. When the sink is switched on, the assistant is
 * already reporting.
 *
 * **What is emitted is an allowlist, not a redaction.** Only the action kind,
 * the step and the failure code leave the browser. Never what the user typed
 * and never an action's payload: an utterance can carry a field value, a
 * `set_description` carries free text, and a telemetry sink is outside this
 * feature's control. The full trail stays local, where the user can export it.
 */
import {
  generateEndEvent,
  generateInteractEvent,
  generateStartEvent,
} from 'services/telemetry';
import { Action } from './engine/actions';
import { ExecutionFailureCode } from './engine/executor';

/** `object` identifies the dataset when there is one to identify. */
const objectFor = (datasetId: string | null) =>
  datasetId ? { id: datasetId, type: 'Dataset', ver: '1.0.0' } : {};

export interface ActionReport {
  action: Action;
  datasetId: string | null;
  step: string;
  /** Present when the action was rejected. */
  failureCode?: ExecutionFailureCode;
}

export const reportAction = ({
  action,
  datasetId,
  step,
  failureCode,
}: ActionReport): void =>
  generateInteractEvent({
    object: objectFor(datasetId),
    edata: {
      id: 'ai-assistant-action',
      type: action.kind,
      subtype: failureCode ? 'rejected' : 'accepted',
      pageid: `ai-assistant:${step}`,
      ...(failureCode ? { code: failureCode } : {}),
    },
  });

export const reportSessionStart = (sessionId: string, tier: number): void =>
  generateStartEvent({
    object: { id: sessionId, type: 'AiAssistantSession', ver: '1.0.0' },
    edata: {
      type: 'ai-assistant',
      pageid: 'ai-assistant',
      mode: `tier-${tier}`,
    },
  });

export const reportSessionEnd = (
  sessionId: string,
  datasetId: string | null,
  changes: number,
): void =>
  generateEndEvent({
    object: objectFor(datasetId),
    edata: {
      type: 'ai-assistant',
      pageid: 'ai-assistant',
      // A count, not the changes themselves.
      summary: { sessionId, changes },
    },
  });
