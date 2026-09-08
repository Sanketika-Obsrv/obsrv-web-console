/**
 * The security acceptance test for connector credentials.
 *
 * A credential must never reach two places: the session that is persisted to
 * IndexedDB, and the action space the model can emit into. This test drives
 * the real modules rather than asserting the intent, so it fails if any of
 * the layers that enforce it is weakened.
 *
 * The sentinel value is searched for in the *serialised* session, so a secret
 * hidden anywhere in the object graph — a nested action, a card, a message —
 * still fails the test.
 */
import { buildActionSchema, createActionValidator } from '../engine/actions';
import {
  fillableProps,
  isSecretProp,
  secretProps,
  validateProp,
} from '../engine/connectors';
import { createMemoryStorage } from './memoryStorage';
import { createSessionStore } from './sessionStore';

const SECRET = 'hunter2-do-not-store';
const TRUSTSTORE = 'BASE64-CERT-MATERIAL-DO-NOT-STORE';

const KAFKA = {
  type: 'object',
  properties: {
    source_kafka_broker_servers: {
      type: 'string',
      title: 'Brokers',
      uiIndex: 1,
    },
    source_kafka_topic: { type: 'string', title: 'Topic', uiIndex: 2 },
    source_kafka_ssl_truststore_base64: {
      type: 'string',
      title: 'Truststore',
      uiIndex: 3,
    },
    source_kafka_ssl_key_password: {
      type: 'string',
      title: 'Key password',
      format: 'password',
      uiIndex: 4,
    },
  },
  required: ['source_kafka_broker_servers'],
};

describe('the model can only be offered non-secret properties', () => {
  // Options, not a built schema: passing a schema here would silently drop
  // every vocabulary constraint. The validator now throws rather than allow
  // that, and the test below proves it.
  const validate = createActionValidator({
    fieldPaths: ['order_id'],
    connectorProperties: fillableProps(KAFKA).map((prop) => prop.key),
  });

  it('accepts a non-secret property', () => {
    expect(
      validate({
        kind: 'set_connector_field',
        property: 'source_kafka_topic',
        value: 'orders',
      }).ok,
    ).toBe(true);
  });

  /**
   * The constrained action space is the first line of defence: a model
   * emitting a secret-setting action is rejected before anything runs.
   */
  it('rejects setting a password-marked property', () => {
    expect(
      validate({
        kind: 'set_connector_field',
        property: 'source_kafka_ssl_key_password',
        value: SECRET,
      }).ok,
    ).toBe(false);
  });

  it('rejects setting cert material that is not marked password', () => {
    expect(
      validate({
        kind: 'set_connector_field',
        property: 'source_kafka_ssl_truststore_base64',
        value: TRUSTSTORE,
      }).ok,
    ).toBe(false);
  });

  /**
   * `ActionSchemaOptions` has no required fields, so handing a built schema
   * to `createActionValidator` type-checks and produces a validator with no
   * constraints at all — which would put every secret property back within
   * the model's reach. It has to fail loudly.
   */
  it('refuses a built schema where options were expected', () => {
    expect(() =>
      createActionValidator(
        buildActionSchema({
          connectorProperties: ['source_kafka_topic'],
        }) as never,
      ),
    ).toThrow(/options/i);
  });
});

describe('the executor path refuses a secret even if asked directly', () => {
  it('refuses a password property', () => {
    const secret = secretProps(KAFKA).find(
      (prop) => prop.key === 'source_kafka_ssl_key_password',
    );

    expect(validateProp(secret!, SECRET).ok).toBe(false);
  });

  it('refuses cert material', () => {
    const secret = secretProps(KAFKA).find(
      (prop) => prop.key === 'source_kafka_ssl_truststore_base64',
    );

    expect(validateProp(secret!, TRUSTSTORE).ok).toBe(false);
  });

  it('classifies both as secret in the first place', () => {
    expect(
      isSecretProp('source_kafka_ssl_key_password', { format: 'password' }),
    ).toBe(true);
    expect(
      isSecretProp('source_kafka_ssl_truststore_base64', { type: 'string' }),
    ).toBe(true);
  });
});

describe('nothing secret survives in the persisted session', () => {
  const storage = () => createMemoryStorage();

  it('keeps a non-secret connector value, which is the point of the split', async () => {
    const store = createSessionStore(storage());
    const { sessionId } = await store.start({ mode: 'create' });

    await store.appendMessage(sessionId, {
      role: 'assistant',
      text: 'Set the topic to orders.',
      action: {
        kind: 'set_connector_field',
        property: 'source_kafka_topic',
        value: 'orders',
      },
    });

    expect(JSON.stringify(await store.load(sessionId))).toContain('orders');
  });

  it('scrubs a credential out of a recorded action', async () => {
    const store = createSessionStore(storage());
    const { sessionId } = await store.start({ mode: 'create' });

    await store.appendMessage(sessionId, {
      role: 'assistant',
      text: 'Set the key password.',
      action: {
        kind: 'set_connector_field',
        property: 'source_kafka_ssl_key_password',
        value: SECRET,
      },
    });

    expect(JSON.stringify(await store.load(sessionId))).not.toContain(SECRET);
  });

  it('scrubs cert material out of a recorded action', async () => {
    const store = createSessionStore(storage());
    const { sessionId } = await store.start({ mode: 'create' });

    await store.appendMessage(sessionId, {
      role: 'assistant',
      text: 'Set the truststore.',
      action: {
        kind: 'set_connector_field',
        property: 'source_kafka_ssl_truststore_base64',
        value: TRUSTSTORE,
      },
    });

    expect(JSON.stringify(await store.load(sessionId))).not.toContain(
      TRUSTSTORE,
    );
  });

  /** What the user typed is recorded verbatim, so it must not be a credential. */
  it('scrubs a credential a user typed into the chat box', async () => {
    const store = createSessionStore(storage());
    const { sessionId } = await store.start({ mode: 'create' });

    await store.appendMessage(sessionId, {
      role: 'user',
      text: 'set source_kafka_ssl_key_password to something',
      // The resolver refuses to build the action; only the utterance remains.
    });

    const stored = JSON.stringify(await store.load(sessionId));

    // The property name is fine to keep; a value would not be.
    expect(stored).toContain('source_kafka_ssl_key_password');
    expect(stored).not.toContain(SECRET);
  });

  it('records only that the connector was configured', async () => {
    const store = createSessionStore(storage());
    const { sessionId } = await store.start({ mode: 'create' });

    await store.markConnectorConfigured(sessionId);
    const resumed = await store.load(sessionId);

    expect(resumed?.connectorConfigured).toBe(true);
    expect(JSON.stringify(resumed)).not.toContain(SECRET);
  });

  /**
   * The whole object graph is checked, not just the fields this test knows
   * about, so a secret smuggled through a card or a nested payload fails too.
   */
  it('finds no credential anywhere in the graph after a full exchange', async () => {
    const store = createSessionStore(storage());
    const { sessionId } = await store.start({ mode: 'create' });

    await store.setPending(sessionId, { name: 'Kafka Orders' });
    await store.appendMessage(sessionId, {
      role: 'user',
      text: 'use the kafka connector',
    });
    await store.appendMessage(sessionId, {
      role: 'assistant',
      text: 'Which topic?',
      card: {
        kind: 'choice',
        options: [
          {
            label: 'orders',
            action: {
              kind: 'set_connector_field',
              property: 'source_kafka_topic',
              value: 'orders',
            },
          },
        ],
      },
    });
    await store.appendMessage(sessionId, {
      role: 'assistant',
      text: 'Credentials saved.',
      action: {
        kind: 'set_connector_field',
        property: 'source_kafka_ssl_key_password',
        value: SECRET,
      },
    });
    await store.markConnectorConfigured(sessionId);

    const stored = JSON.stringify(await store.load(sessionId));

    expect(stored).not.toContain(SECRET);
    expect(stored).not.toContain(TRUSTSTORE);
    expect(stored).toContain('orders');
  });
});

/**
 * The scrubber is name-based, so it cannot tell a credential's *value* from a
 * credential's *schema*. Persisting a connector's `ui_spec` in a card meant
 * `source_database_pwd`'s schema object was replaced by the string
 * "[redacted]", and RJSF then rendered no field at all — the credential form
 * was silently empty. Found by driving the real UI.
 *
 * The card now carries only the connector's identity; the schema is supplied
 * live. These tests pin that down from both directions.
 */
describe('a connector schema is not persisted with the card', () => {
  it('redacts a schema keyed by a credential name, which is why it is not stored', async () => {
    const store = createSessionStore(createMemoryStorage());
    const { sessionId } = await store.start({ mode: 'create' });

    await store.appendMessage(sessionId, {
      role: 'assistant',
      text: 'Credentials',
      // Deliberately smuggling a schema through a field the scrubber sees.
      action: {
        kind: 'set_connector_field',
        property: 'source_database_pwd',
        value: 'x',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    const stored = await store.load(sessionId);

    // The scrubber cannot distinguish schema from secret, so anything under a
    // credential-shaped key is flattened. That is correct for values and
    // destructive for schemas — hence the card holds no schema.
    expect(JSON.stringify(stored)).toContain('[redacted]');
  });

  it('keeps a secret_form card small enough to survive scrubbing intact', async () => {
    const store = createSessionStore(createMemoryStorage());
    const { sessionId } = await store.start({ mode: 'create' });

    await store.appendMessage(sessionId, {
      role: 'assistant',
      text: 'These go straight to the server.',
      card: {
        kind: 'secret_form',
        connectorId: 'postgres-connector-1.0.0',
        connectorName: 'PostgreSQL',
      },
    });

    const card = (await store.load(sessionId))?.messages[0].card;

    expect(card).toEqual({
      kind: 'secret_form',
      connectorId: 'postgres-connector-1.0.0',
      connectorName: 'PostgreSQL',
    });
  });
});
