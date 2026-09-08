/**
 * The `ui_spec` fixtures here mirror what `GET /v2/connectors/read/:id`
 * actually returned when probed live: postgres with a `format: password`
 * field and a `format: hidden` one, kafka with three password fields, an
 * `enum` on the offset reset and base64 cert material that is *not* marked
 * password.
 */
import {
  fillableProps,
  isSecretProp,
  secretProps,
  secretSchema,
  summariseProp,
  validateProp,
} from './connectors';

const POSTGRES = {
  title: 'Postgres',
  type: 'object',
  properties: {
    source_database_type: {
      type: 'string',
      title: 'Database type',
      format: 'hidden',
      default: 'postgresql',
      uiIndex: 0,
    },
    source_database_host: {
      type: 'string',
      title: 'Host',
      uiIndex: 1,
    },
    source_database_port: {
      type: 'integer',
      title: 'Port',
      minimum: 1,
      maximum: 65535,
      default: 5432,
      uiIndex: 2,
    },
    source_database_name: { type: 'string', title: 'Database', uiIndex: 3 },
    source_database_user: { type: 'string', title: 'User', uiIndex: 4 },
    source_database_pwd: {
      type: 'string',
      title: 'Password',
      format: 'password',
      uiIndex: 5,
    },
    source_table: {
      type: 'string',
      title: 'Table',
      pattern: '^[A-Za-z_][A-Za-z0-9_]*$',
      uiIndex: 6,
    },
  },
  required: [
    'source_database_host',
    'source_database_name',
    'source_database_pwd',
  ],
};

const KAFKA = {
  title: 'Kafka',
  type: 'object',
  properties: {
    source_kafka_broker_servers: {
      type: 'string',
      title: 'Brokers',
      uiIndex: 1,
    },
    source_kafka_topic: { type: 'string', title: 'Topic', uiIndex: 2 },
    source_kafka_auto_offset_reset: {
      type: 'string',
      title: 'Offset reset',
      enum: ['earliest', 'latest', 'none'],
      default: 'earliest',
      uiIndex: 3,
    },
    source_data_format: {
      type: 'string',
      format: 'hidden',
      enum: ['json', 'jsonl'],
      uiIndex: 0,
    },
    source_kafka_ssl_truststore_base64: {
      type: 'string',
      title: 'Truststore',
      uiIndex: 4,
    },
    source_kafka_ssl_keystore_base64: {
      type: 'string',
      title: 'Keystore',
      uiIndex: 5,
    },
    source_kafka_ssl_key_password: {
      type: 'string',
      title: 'Key password',
      format: 'password',
      uiIndex: 6,
    },
  },
  required: ['source_kafka_broker_servers', 'source_kafka_topic'],
};

describe('classifying a property as secret', () => {
  it('treats format: password as secret', () => {
    expect(isSecretProp('source_database_pwd', { format: 'password' })).toBe(
      true,
    );
  });

  /**
   * The rule has to be broader than `format: password`. Kafka's truststore
   * and keystore fields are cert material and are *not* marked password —
   * confirmed against the live `ui_spec`.
   */
  it('treats cert material as secret even when not marked password', () => {
    expect(
      isSecretProp('source_kafka_ssl_truststore_base64', { type: 'string' }),
    ).toBe(true);
    expect(
      isSecretProp('source_kafka_ssl_keystore_base64', { type: 'string' }),
    ).toBe(true);
  });

  it('catches the other names credentials hide behind', () => {
    [
      'source_database_pwd',
      'api_password',
      'client_secret',
      'access_token',
      'aws_credentials',
      'ssl_private_key',
    ].forEach((key) =>
      expect(isSecretProp(key, { type: 'string' })).toBe(true),
    );
  });

  it('does not treat ordinary connection details as secret', () => {
    [
      'source_database_host',
      'source_database_port',
      'source_database_user',
      'source_kafka_topic',
      'source_kafka_broker_servers',
      'source_table',
    ].forEach((key) =>
      expect(isSecretProp(key, { type: 'string' })).toBe(false),
    );
  });

  /** A username is not a credential, and redacting it would be unhelpful. */
  it('does not treat a user name as secret', () => {
    expect(isSecretProp('source_database_user', { type: 'string' })).toBe(
      false,
    );
  });
});

describe('which properties can be filled conversationally', () => {
  it('offers the non-secret, non-hidden ones', () => {
    expect(fillableProps(POSTGRES).map((prop) => prop.key)).toEqual([
      'source_database_host',
      'source_database_port',
      'source_database_name',
      'source_database_user',
      'source_table',
    ]);
  });

  it('leaves out anything secret', () => {
    expect(fillableProps(POSTGRES).map((prop) => prop.key)).not.toContain(
      'source_database_pwd',
    );
  });

  /** Hidden props are set by the connector, not the user. */
  it('leaves out hidden properties', () => {
    expect(fillableProps(POSTGRES).map((prop) => prop.key)).not.toContain(
      'source_database_type',
    );
    expect(fillableProps(KAFKA).map((prop) => prop.key)).not.toContain(
      'source_data_format',
    );
  });

  it('orders them the way the form does', () => {
    expect(fillableProps(KAFKA).map((prop) => prop.key)).toEqual([
      'source_kafka_broker_servers',
      'source_kafka_topic',
      'source_kafka_auto_offset_reset',
    ]);
  });

  it('reports which are required', () => {
    const host = fillableProps(POSTGRES).find(
      (prop) => prop.key === 'source_database_host',
    );

    expect(host?.required).toBe(true);
  });

  it('carries the choices and defaults the model needs', () => {
    const offset = fillableProps(KAFKA).find(
      (prop) => prop.key === 'source_kafka_auto_offset_reset',
    );

    expect(offset?.enum).toEqual(['earliest', 'latest', 'none']);
    expect(offset?.default).toBe('earliest');
  });

  it('tolerates a spec with no properties', () => {
    expect(fillableProps({ type: 'object' })).toEqual([]);
    expect(fillableProps(undefined)).toEqual([]);
  });
});

describe('which properties need the form', () => {
  it('collects every secret, in form order', () => {
    expect(secretProps(KAFKA).map((prop) => prop.key)).toEqual([
      'source_kafka_ssl_truststore_base64',
      'source_kafka_ssl_keystore_base64',
      'source_kafka_ssl_key_password',
    ]);
  });

  it('builds a schema holding only the secrets', () => {
    const schema = secretSchema(POSTGRES);

    expect(Object.keys(schema.properties)).toEqual(['source_database_pwd']);
  });

  /** A secret the connector demands must still be marked required. */
  it('keeps the required list, narrowed to the secrets', () => {
    expect(secretSchema(POSTGRES).required).toEqual(['source_database_pwd']);
  });

  it('is empty for a connector with no secrets', () => {
    const schema = secretSchema({
      type: 'object',
      properties: { host: { type: 'string' } },
    });

    expect(Object.keys(schema.properties)).toEqual([]);
  });
});

/**
 * Validating locally means a value the connector would reject is caught in
 * the conversation, where it can be corrected, rather than at save time.
 */
describe('validating a value against its property', () => {
  const prop = (key: string, spec: Record<string, unknown>) => ({
    key,
    spec,
    required: false,
  });

  it('accepts a value matching the pattern', () => {
    expect(
      validateProp(
        prop('source_table', { pattern: '^[A-Za-z_][A-Za-z0-9_]*$' }),
        'orders',
      ),
    ).toEqual({ ok: true, value: 'orders' });
  });

  it('rejects a value breaking the pattern, saying so', () => {
    const result = validateProp(
      prop('source_table', { pattern: '^[A-Za-z_][A-Za-z0-9_]*$' }),
      '9 orders!',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/format/i);
  });

  it('accepts a number in range and returns it as a number', () => {
    expect(
      validateProp(
        prop('port', { type: 'integer', minimum: 1, maximum: 65535 }),
        '5432',
      ),
    ).toEqual({ ok: true, value: 5432 });
  });

  it('rejects a number out of range', () => {
    const result = validateProp(
      prop('port', { type: 'integer', minimum: 1, maximum: 65535 }),
      '99999',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/65535/);
  });

  it('rejects something that is not a number at all', () => {
    expect(
      validateProp(prop('port', { type: 'integer' }), 'the usual').ok,
    ).toBe(false);
  });

  it('accepts a value from the enum', () => {
    expect(
      validateProp(
        prop('offset', { enum: ['earliest', 'latest', 'none'] }),
        'latest',
      ),
    ).toEqual({ ok: true, value: 'latest' });
  });

  it('rejects a value outside the enum, listing what is allowed', () => {
    const result = validateProp(
      prop('offset', { enum: ['earliest', 'latest', 'none'] }),
      'newest',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('earliest');
  });

  it('accepts a boolean written as a word', () => {
    expect(validateProp(prop('flag', { type: 'boolean' }), 'true')).toEqual({
      ok: true,
      value: true,
    });
  });

  /**
   * The classifier is the last line of defence: a secret must never be set
   * through the conversational path, whatever asked for it.
   */
  it('refuses to set a secret at all', () => {
    const result = validateProp(
      {
        key: 'source_database_pwd',
        spec: { format: 'password' },
        required: true,
      },
      'hunter2',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/form|secure/i);
  });
});

describe('describing a property for the user', () => {
  it('uses the title rather than the raw key', () => {
    expect(
      summariseProp({
        key: 'source_database_host',
        spec: { title: 'Host' },
        required: true,
      }),
    ).toContain('Host');
  });

  it('says when it is required', () => {
    expect(
      summariseProp({
        key: 'host',
        spec: { title: 'Host' },
        required: true,
      }),
    ).toMatch(/required/i);
  });

  it('offers the choices when there are only a few', () => {
    expect(
      summariseProp({
        key: 'offset',
        spec: { title: 'Offset', enum: ['earliest', 'latest'] },
        required: false,
      }),
    ).toContain('earliest');
  });

  it('mentions the default so the user can accept it', () => {
    expect(
      summariseProp({
        key: 'port',
        spec: { title: 'Port', default: 5432 },
        required: false,
      }),
    ).toContain('5432');
  });

  it('falls back to the key when there is no title', () => {
    expect(
      summariseProp({ key: 'source_table', spec: {}, required: false }),
    ).toContain('source_table');
  });
});
