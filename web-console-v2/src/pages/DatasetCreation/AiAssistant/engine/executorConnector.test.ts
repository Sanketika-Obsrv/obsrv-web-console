jest.mock('services/datasetApi', () => ({
  readDataset: jest.fn(),
  updateDataset: jest.fn(),
  datasetStatusTransition: jest.fn(),
}));

import { readDataset, updateDataset } from 'services/datasetApi';
import { Action } from './actions';
import { UiSpec } from './connectors';
import { ExecutorContext, executeAction, submitConnector } from './executor';

const mocked = {
  read: readDataset as jest.MockedFunction<typeof readDataset>,
  update: updateDataset as jest.MockedFunction<typeof updateDataset>,
};

const DATASET_ID = 'my-orders';
const SECRET = 'hunter2-do-not-store';

const POSTGRES: UiSpec = {
  type: 'object',
  properties: {
    source_database_host: { type: 'string', title: 'Host', uiIndex: 1 },
    source_database_port: {
      type: 'integer',
      title: 'Port',
      minimum: 1,
      maximum: 65535,
      uiIndex: 2,
    },
    source_database_pwd: {
      type: 'string',
      title: 'Password',
      format: 'password',
      uiIndex: 3,
    },
  },
  required: ['source_database_host'],
};

const connector = {
  id: 'postgres-connector-1.0.0',
  uiSpec: POSTGRES,
  values: { source_database_host: 'db.internal' },
};

const run = (action: Action, context: Partial<ExecutorContext> = {}) =>
  executeAction(action, {
    datasetId: DATASET_ID,
    connector,
    ...context,
  } as ExecutorContext);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.read.mockResolvedValue({
    dataset_id: DATASET_ID,
    version_key: '111',
  });
  mocked.update.mockResolvedValue({ version_key: '222' });
});

describe('choosing a connector', () => {
  it('writes nothing, because there is nothing to write yet', async () => {
    const outcome = await run({
      kind: 'select_connector',
      connectorId: 'postgres-connector-1.0.0',
    });

    expect(outcome).toEqual({ ok: true, status: 'noop' });
    expect(mocked.update).not.toHaveBeenCalled();
  });

  /**
   * `connectors_config` is a delta API on PATCH, so an empty array means "no
   * changes", not "remove all" — and a draft with no connector already has
   * none. Sending anything would be guessing at remove semantics.
   */
  it('skipping the connector sends nothing', async () => {
    const outcome = await run({ kind: 'skip_connector' });

    expect(outcome).toEqual({ ok: true, status: 'noop' });
    expect(mocked.update).not.toHaveBeenCalled();
  });
});

describe('setting a connector property', () => {
  it('accepts a value the connector declares', async () => {
    const outcome = await run({
      kind: 'set_connector_field',
      property: 'source_database_host',
      value: 'db.internal',
    });

    expect(outcome.ok).toBe(true);
  });

  it('refuses a property the connector does not declare', async () => {
    const outcome = await run({
      kind: 'set_connector_field',
      property: 'source_database_schema',
      value: 'public',
    });

    expect(outcome).toMatchObject({
      ok: false,
      code: 'UNKNOWN_CONNECTOR_FIELD',
    });
  });

  it('refuses a value the connector would reject', async () => {
    const outcome = await run({
      kind: 'set_connector_field',
      property: 'source_database_port',
      value: 99999,
    });

    expect(outcome).toMatchObject({
      ok: false,
      code: 'INVALID_CONNECTOR_VALUE',
    });
  });

  /**
   * The last line of defence. An action is recorded in the transcript, so a
   * secret must not be settable by one even if every earlier guard is
   * bypassed.
   */
  it('refuses a credential outright', async () => {
    const outcome = await run({
      kind: 'set_connector_field',
      property: 'source_database_pwd',
      value: SECRET,
    });

    expect(outcome).toMatchObject({ ok: false, code: 'SECRET_NOT_ALLOWED' });
    expect(JSON.stringify(outcome)).not.toContain(SECRET);
  });

  it('refuses when no connector has been chosen', async () => {
    const outcome = await run(
      {
        kind: 'set_connector_field',
        property: 'source_database_host',
        value: 'db.internal',
      },
      { connector: undefined },
    );

    expect(outcome).toMatchObject({ ok: false, code: 'NO_CONNECTOR' });
  });

  it('writes nothing until the credentials arrive', async () => {
    await run({
      kind: 'set_connector_field',
      property: 'source_database_host',
      value: 'db.internal',
    });

    expect(mocked.update).not.toHaveBeenCalled();
  });
});

describe('submitting the connector with its credentials', () => {
  it('sends the delta shape the update API expects', async () => {
    await submitConnector(DATASET_ID, connector, {
      source_database_pwd: SECRET,
    });

    expect(mocked.update.mock.calls[0][0].connectors_config).toEqual([
      {
        value: {
          id: 'my-orders-postgres-connector-1.0.0',
          connector_id: 'postgres-connector-1.0.0',
          connector_config: {
            source_database_host: 'db.internal',
            source_database_pwd: SECRET,
          },
          operations_config: {},
          version: 'v2',
        },
        action: 'upsert',
      },
    ]);
  });

  it('sends the version key from the read that built the payload', async () => {
    await submitConnector(DATASET_ID, connector, {});

    expect(mocked.update.mock.calls[0][0].version_key).toBe('111');
  });

  /** The outcome goes into the transcript, so it must carry no credential. */
  it('returns nothing containing the credential', async () => {
    const outcome = await submitConnector(DATASET_ID, connector, {
      source_database_pwd: SECRET,
    });

    expect(JSON.stringify(outcome)).not.toContain(SECRET);
  });

  it('reports a rejection rather than throwing', async () => {
    mocked.update.mockRejectedValue(
      Object.assign(new Error('nope'), {
        response: {
          data: {
            error: { code: 'DATASET_UPDATE_INPUT_INVALID', message: 'x' },
          },
        },
      }),
    );

    const outcome = await submitConnector(DATASET_ID, connector, {});

    expect(outcome).toMatchObject({
      ok: false,
      code: 'DATASET_UPDATE_INPUT_INVALID',
    });
  });
});
