jest.mock('services/telemetry', () => ({
  generateInteractEvent: jest.fn(),
  generateStartEvent: jest.fn(),
  generateEndEvent: jest.fn(),
}));

import {
  generateEndEvent,
  generateInteractEvent,
  generateStartEvent,
} from 'services/telemetry';
import {
  reportAction,
  reportModelCall,
  reportSessionEnd,
  reportSessionStart,
} from './telemetry';

const interact = generateInteractEvent as jest.MockedFunction<
  typeof generateInteractEvent
>;

beforeEach(() => jest.clearAllMocks());

describe('reporting an action', () => {
  it('names the kind and the step, and identifies the dataset', () => {
    reportAction({
      action: { kind: 'set_dedup', enabled: true, key: 'order_id' },
      datasetId: 'my-orders',
      step: 'processing',
    });

    expect(interact).toHaveBeenCalledWith({
      object: { id: 'my-orders', type: 'Dataset', ver: '1.0.0' },
      edata: {
        id: 'ai-assistant-action',
        type: 'set_dedup',
        subtype: 'accepted',
        pageid: 'ai-assistant:processing',
      },
    });
  });

  it('reports a rejection with the code the API gave', () => {
    reportAction({
      action: { kind: 'set_storage', lakehouse: true },
      datasetId: 'my-orders',
      step: 'storage',
      failureCode: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
    });

    expect(interact.mock.calls[0][0].edata).toMatchObject({
      subtype: 'rejected',
      code: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
    });
  });

  it('identifies nothing when there is no draft yet', () => {
    reportAction({
      action: { kind: 'set_dataset_name', name: 'My Orders' },
      datasetId: null,
      step: 'ingestion',
    });

    expect(interact.mock.calls[0][0].object).toEqual({});
  });

  /**
   * The allowlist is the point of this module. An action's payload can carry a
   * field value, a description, a connector setting or a dataset name, and a
   * telemetry sink is outside this feature's control — so the kind goes and
   * the payload does not.
   */
  it('sends no part of the action payload', () => {
    reportAction({
      action: {
        kind: 'set_description',
        path: 'customer.email',
        description: 'the buyer email address',
      },
      datasetId: 'my-orders',
      step: 'schema',
    });

    const sent = JSON.stringify(interact.mock.calls[0][0]);

    expect(sent).toContain('set_description');
    expect(sent).not.toContain('customer.email');
    expect(sent).not.toContain('buyer');
  });

  it('sends no connector value, even a name that is not itself secret', () => {
    reportAction({
      action: {
        kind: 'set_connector_field',
        property: 'source_database_name',
        value: 'analytics_prod',
      },
      datasetId: 'my-orders',
      step: 'connector',
    });

    const sent = JSON.stringify(interact.mock.calls[0][0]);

    expect(sent).not.toContain('source_database_name');
    expect(sent).not.toContain('analytics_prod');
  });
});

describe('reporting the conversation itself', () => {
  it('starts with the tier it is running, not with any content', () => {
    reportSessionStart('session-abc', 0);

    expect(generateStartEvent).toHaveBeenCalledWith({
      object: { id: 'session-abc', type: 'AiAssistantSession', ver: '1.0.0' },
      edata: {
        type: 'ai-assistant',
        pageid: 'ai-assistant',
        mode: 'tier-0',
      },
    });
  });

  it('ends with a count of changes, not the changes', () => {
    reportSessionEnd('session-abc', 'my-orders', 7);

    expect(generateEndEvent).toHaveBeenCalledWith({
      object: { id: 'my-orders', type: 'Dataset', ver: '1.0.0' },
      edata: {
        type: 'ai-assistant',
        pageid: 'ai-assistant',
        summary: { sessionId: 'session-abc', changes: 7 },
      },
    });
  });
});

/**
 * The router call and the extraction call are the two calls a turn can make
 * to the model. Same allowlist rule as an action: the timing and whether it
 * succeeded leave the browser, never the prompt or the utterance that went
 * into it.
 */
describe('reporting a model call', () => {
  it('names which call it was and how long it took', () => {
    reportModelCall({ call: 'route', ms: 42, ok: true });

    expect(interact).toHaveBeenCalledWith({
      object: {},
      edata: {
        id: 'ai-assistant-model-call',
        type: 'route',
        subtype: 'completed',
        pageid: 'ai-assistant',
        duration: 42,
      },
    });
  });

  it('marks a failed call distinctly from a completed one', () => {
    reportModelCall({ call: 'extract', ms: 8, ok: false });

    expect(interact.mock.calls[0][0].edata).toMatchObject({
      type: 'extract',
      subtype: 'failed',
    });
  });

  it('sends no prompt text or utterance, only the allowlisted scalars', () => {
    reportModelCall({ call: 'route', ms: 13, ok: true });

    const sent = JSON.stringify(interact.mock.calls[0][0]);

    expect(sent).not.toMatch(/prompt|utterance/i);
  });
});
