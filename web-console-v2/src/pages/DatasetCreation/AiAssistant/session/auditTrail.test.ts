import {
  AUDIT_FORMAT_VERSION,
  auditFileName,
  buildAuditTrail,
} from './auditTrail';
import { REDACTED } from './sessionStore';
import { AiSession, Message } from './types';

const NOW = 1_700_000_100_000;

const message = (overrides: Partial<Message>): Message => ({
  id: overrides.id ?? 'm1',
  role: 'assistant',
  text: 'Done',
  createdAt: 1_700_000_000_000,
  ...overrides,
});

const session = (overrides: Partial<AiSession> = {}): AiSession => ({
  sessionId: 'session-abc',
  datasetId: 'my-orders',
  pending: {},
  mode: 'create',
  step: 'storage',
  messages: [],
  sampleRows: [],
  sampleExpiresAt: null,
  lastVersionKey: '222',
  modelTier: 0,
  connectorConfigured: false,
  createdAt: 1_699_999_000_000,
  updatedAt: 1_700_000_000_000,
  ...overrides,
});

describe('the exported action trail', () => {
  it('carries a format version, so a stored file can be read later', () => {
    expect(buildAuditTrail(session(), NOW).formatVersion).toBe(
      AUDIT_FORMAT_VERSION,
    );
  });

  it('identifies the conversation and the draft it belongs to', () => {
    const trail = buildAuditTrail(session(), NOW);

    expect(trail.session).toMatchObject({
      sessionId: 'session-abc',
      datasetId: 'my-orders',
      mode: 'create',
      step: 'storage',
    });
  });

  it('records times as ISO timestamps rather than epoch numbers', () => {
    const trail = buildAuditTrail(session(), NOW);

    expect(trail.exportedAt).toBe(new Date(NOW).toISOString());
    expect(trail.session.startedAt).toBe(
      new Date(1_699_999_000_000).toISOString(),
    );
  });

  it('keeps every turn, in the order it happened', () => {
    const trail = buildAuditTrail(
      session({
        messages: [
          message({ id: 'm1', role: 'user', text: 'make order_id required' }),
          message({ id: 'm2', text: 'Done — made order_id required.' }),
        ],
      }),
      NOW,
    );

    expect(trail.entries.map((entry) => entry.text)).toEqual([
      'make order_id required',
      'Done — made order_id required.',
    ]);
  });

  it('carries the action each change dispatched', () => {
    const trail = buildAuditTrail(
      session({
        messages: [
          message({
            action: { kind: 'set_dedup', enabled: true, key: 'order_id' },
            inverse: [{ kind: 'set_dedup', enabled: false }],
          }),
        ],
      }),
      NOW,
    );

    expect(trail.entries[0]).toMatchObject({
      action: { kind: 'set_dedup', enabled: true, key: 'order_id' },
      inverse: [{ kind: 'set_dedup', enabled: false }],
    });
  });

  it('marks a change that was rejected, with the code', () => {
    const trail = buildAuditTrail(
      session({
        messages: [
          message({
            action: { kind: 'set_storage', lakehouse: true },
            failureCode: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
          }),
        ],
      }),
      NOW,
    );

    expect(trail.entries[0]).toMatchObject({
      rejected: true,
      failureCode: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
    });
  });

  /**
   * A change that went through says so in its own words. Labelling it
   * `applied` here would be inventing an outcome the transcript never
   * recorded — a `pending` name and a written one look identical from a
   * message.
   */
  it('says nothing about an outcome it does not hold', () => {
    const trail = buildAuditTrail(
      session({
        messages: [
          message({ action: { kind: 'set_dataset_name', name: 'My Orders' } }),
        ],
      }),
      NOW,
    );

    expect(trail.entries[0].rejected).toBeUndefined();
    expect(trail.entries[0]).not.toHaveProperty('failureCode');
  });

  it('shows which changes were undone', () => {
    const trail = buildAuditTrail(
      session({
        messages: [
          message({
            id: 'm1',
            action: {
              kind: 'toggle_required',
              path: 'order_id',
              required: true,
            },
            undone: true,
          }),
        ],
      }),
      NOW,
    );

    expect(trail.entries[0].undone).toBe(true);
    expect(trail.summary.undone).toBe(1);
  });

  it('counts the turns, the changes and the rejections', () => {
    const trail = buildAuditTrail(
      session({
        messages: [
          message({ id: 'm1', role: 'user', text: 'dedup on order_id' }),
          message({
            id: 'm2',
            action: { kind: 'set_dedup', enabled: true, key: 'order_id' },
          }),
          message({
            id: 'm3',
            action: { kind: 'set_storage', lakehouse: true },
            failureCode: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
          }),
        ],
      }),
      NOW,
    );

    expect(trail.summary).toEqual({
      turns: 3,
      changes: 2,
      rejected: 1,
      undone: 0,
    });
  });

  it('names the connector without exporting the values it was given', () => {
    const trail = buildAuditTrail(
      session({
        connector: {
          id: 'postgres-connector-1.0.0',
          name: 'PostgreSQL',
          values: { source_database_name: 'orders' },
        },
        connectorConfigured: true,
      }),
      NOW,
    );

    expect(trail.session.connector).toEqual({
      id: 'postgres-connector-1.0.0',
      name: 'PostgreSQL',
    });
    expect(JSON.stringify(trail)).not.toContain('source_database_name');
  });
});

/**
 * The export is the second boundary where data leaves — the first is
 * persistence, which already scrubs. Both are covered, because a trail is a
 * file that gets attached to tickets.
 */
describe('what the trail refuses to carry', () => {
  it('leaves the sample rows out entirely', () => {
    const trail = buildAuditTrail(
      session({ sampleRows: [{ email: 'a@example.com' }] }),
      NOW,
    );

    expect(JSON.stringify(trail)).not.toContain('a@example.com');
  });

  it('redacts a credential that somehow reached the transcript', () => {
    const trail = buildAuditTrail(
      session({
        messages: [
          message({
            text: 'set the password',
            action: {
              kind: 'set_connector_field',
              property: 'source_database_password',
              value: 'hunter2',
            },
          }),
        ],
      }),
      NOW,
    );

    expect(JSON.stringify(trail)).not.toContain('hunter2');
    expect(trail.entries[0].action).toMatchObject({ value: REDACTED });
  });
});

describe('the file it is written to', () => {
  it('names the draft and the conversation', () => {
    expect(auditFileName(session())).toBe(
      'dataset-assistant-my-orders-session-abc',
    );
  });

  it('says so when there is no draft yet', () => {
    expect(auditFileName(session({ datasetId: null }))).toContain(
      'new-dataset',
    );
  });
});
