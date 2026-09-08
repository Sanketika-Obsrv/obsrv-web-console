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
import { Action } from './actions';
import { availableStorageLabels, diagnose } from './errorMap';
import { ExecutionFailureCode, ExecutionOutcome } from './executor';
import { MessageCard } from '../messages/types';
import { Resolution } from './ruleResolver';

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

/** What the action asked for, in plain words. Present tense, no outcome. */
const describeAction = (action: Action): string => {
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
      return 'set up denormalisation';

    case 'set_storage': {
      const changes = (['lakehouse', 'realtime', 'cache'] as const)
        .filter((flag) => action[flag] !== undefined)
        .map(
          (flag) =>
            `${storeLabel(flag)} ${action[flag] ? 'enabled' : 'disabled'}`,
        );
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
      return 'saved the dataset';
    case 'goto_step':
      return `moved to the ${action.step} step`;

    default:
      return 'applied that change';
  }
};

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

  const created = outcome.datasetId
    ? ` The draft is ${outcome.datasetId}.`
    : '';

  // A replay means a concurrent edit was found and the change re-applied
  // against it. Saying so is the difference between trustworthy and quiet.
  const replayed = outcome.replayed
    ? ' The dataset had changed since I last read it, so I re-applied this on top of that change.'
    : '';

  return {
    text: `Done — ${describeAction(action)}.${created}${replayed}`,
  };
};

const DID_NOT_UNDERSTAND =
  'I did not understand that. You can tell me things like "make order_id required", "dedup on order_id" or "enable the real-time store".';

export const narrateResolution = (resolution: Resolution): Narration => {
  const question = resolution.clarify?.question;
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

  return { text: question ?? DID_NOT_UNDERSTAND, card };
};
