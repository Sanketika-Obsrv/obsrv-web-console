import { buildFieldVocabulary } from './fieldVocabulary';
import { UTTERANCES } from './ruleResolver.fixtures';
import { resolveUtterance } from './ruleResolver';

/** The vocabulary of the probe dataset used throughout this build. */
const FIELDS = [
  { column: 'order_id', data_type: 'string', arrival_format: 'text' },
  { column: 'total_amount', data_type: 'double', arrival_format: 'number' },
  { column: 'order_ts', data_type: 'date-time', arrival_format: 'text' },
  { column: 'channel', data_type: 'string', arrival_format: 'text' },
  { column: 'coupon_code', data_type: 'string', arrival_format: 'text' },
  {
    column: 'customer',
    data_type: 'object',
    properties: {
      customer_id: { key: 'customer_id', data_type: 'string' },
      email: { key: 'email', data_type: 'string' },
    },
  },
  { column: 'items', data_type: 'array', arrival_format: 'array' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vocabulary = buildFieldVocabulary(FIELDS as any);

const resolve = (utterance: string) =>
  resolveUtterance(utterance, { vocabulary });

describe('the fixture set', () => {
  const results = UTTERANCES.map((fixture) => ({
    fixture,
    resolution: resolve(fixture.utterance),
  }));

  const shouldResolve = results.filter(({ fixture }) => fixture.expected);
  const shouldNot = results.filter(({ fixture }) => !fixture.expected);

  it('covers at least 40 utterances', () => {
    expect(UTTERANCES.length).toBeGreaterThanOrEqual(40);
  });

  /**
   * The acceptance bar. Reported as a list of misses rather than a bare count,
   * so a regression names the utterance it broke.
   */
  it('resolves at least 80% of the utterances that should resolve', () => {
    const missed = shouldResolve
      .filter(({ fixture, resolution }) => {
        if (resolution.status !== 'resolved') return true;
        return (
          JSON.stringify(resolution.action) !== JSON.stringify(fixture.expected)
        );
      })
      .map(({ fixture, resolution }) => ({
        utterance: fixture.utterance,
        expected: fixture.expected,
        got: resolution.action ?? resolution.status,
      }));

    const rate = (shouldResolve.length - missed.length) / shouldResolve.length;

    expect({ rate, missed }).toMatchObject({ missed: [] });
    expect(rate).toBeGreaterThanOrEqual(0.8);
  });

  /**
   * No false positives, with no tolerance: acting on a misread instruction is
   * worse than asking, because the executor would write it to the dataset.
   */
  it('never resolves an utterance that must not resolve', () => {
    const wrongly = shouldNot
      .filter(({ resolution }) => resolution.status === 'resolved')
      .map(({ fixture, resolution }) => ({
        utterance: fixture.utterance,
        got: resolution.action,
      }));

    expect(wrongly).toEqual([]);
  });

  it('offers candidates where the utterance was merely ambiguous', () => {
    const ambiguous = shouldNot.filter(({ fixture }) => fixture.ambiguous);

    ambiguous.forEach(({ fixture, resolution }) => {
      expect({
        utterance: fixture.utterance,
        status: resolution.status,
      }).toMatchObject({ status: 'ambiguous' });
      expect(resolution.clarify?.options?.length ?? 0).toBeGreaterThan(1);
    });
  });
});

describe('confidence', () => {
  it('is highest when the field matched exactly', () => {
    const exact = resolve('make total_amount a double');

    expect(exact.confidence).toBeGreaterThanOrEqual(0.9);
  });

  /**
   * "email" is an exact match, not a fuzzy one: it is the unique leaf name of
   * `customer.email`. A genuinely fuzzy term is one that only *contains* the
   * field's name, like "coupon" for `coupon_code`.
   */
  it('is lower when the field was matched fuzzily', () => {
    const fuzzy = resolve('mask coupon');
    const exact = resolve('mask coupon_code');

    expect(fuzzy.confidence).toBeLessThan(exact.confidence);
  });

  it('is zero when nothing resolved', () => {
    expect(resolve('make the thing better').confidence).toBe(0);
  });
});

describe('asking rather than guessing', () => {
  it('names the candidates when a field is ambiguous', () => {
    const resolution = resolve('set id to string');

    expect(resolution.status).toBe('ambiguous');
    expect(resolution.clarify?.options).toEqual(
      expect.arrayContaining(['order_id', 'customer.customer_id']),
    );
  });

  it('asks about the field, not the instruction, when only the field is unclear', () => {
    expect(resolve('set id to string').clarify?.question).toMatch(/which/i);
  });

  it('declines an unknown field rather than picking the nearest', () => {
    expect(resolve('make sku an integer').status).toBe('unknown');
  });

  it('declines a datatype the API does not accept', () => {
    expect(resolve('make total_amount a widget').status).not.toBe('resolved');
  });

  it('declines an empty utterance', () => {
    expect(resolve('').status).toBe('unknown');
    expect(resolve('   ').status).toBe('unknown');
  });
});

describe('phrasing tolerance', () => {
  it('ignores case', () => {
    expect(resolve('MAKE ORDER_ID REQUIRED').action).toEqual({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  it('ignores a trailing full stop', () => {
    expect(resolve('save it.').action).toEqual({ kind: 'save' });
  });

  it('accepts a field written with spaces instead of underscores', () => {
    expect(resolve('make order id required').action).toEqual({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  it('accepts "dedupe" as well as "dedup"', () => {
    expect(resolve('dedupe on order_id').action).toEqual({
      kind: 'set_dedup',
      enabled: true,
      key: 'order_id',
    });
  });
});

/**
 * Eligibility is the executor's business, but the resolver should not offer a
 * key the picker would refuse — asking is cheaper than a rejected write.
 */
describe('eligibility', () => {
  it('declines a date-time field as a dedup key, as the picker does', () => {
    expect(resolve('dedup on order_ts').status).not.toBe('resolved');
  });

  it('declines a nested field as a dedup key', () => {
    expect(resolve('dedup on customer.email').status).not.toBe('resolved');
  });

  it('accepts a nested field for PII, which the picker allows', () => {
    expect(resolve('mask customer.email').status).toBe('resolved');
  });
});

describe('what a resolution carries', () => {
  it('reports the field it resolved, so the caller can echo it back', () => {
    expect(resolve('encrypt the email').resolvedPath).toBe('customer.email');
  });

  it('reports nothing for an action with no field', () => {
    expect(resolve('save it').resolvedPath).toBeUndefined();
  });
});

/**
 * Connector rules only fire once a connector list or a chosen connector's
 * properties are in context. Without that, "set X to Y" is a schema
 * instruction, and reading it as a connector field would be a false positive
 * of the worst kind — it would write to the wrong config.
 */
describe('choosing a connector', () => {
  const connectors = [
    { id: 'postgres-connector-1.0.0', name: 'PostgreSQL' },
    { id: 'kafka-connector-2.0.0', name: 'Kafka' },
    { id: 'kafka-connector-1.0.0', name: 'Kafka (legacy)' },
  ];

  const withConnectors = (utterance: string) =>
    resolveUtterance(utterance, { vocabulary, connectors });

  it('picks a connector named unambiguously', () => {
    expect(withConnectors('use postgres').action).toEqual({
      kind: 'select_connector',
      connectorId: 'postgres-connector-1.0.0',
    });
  });

  it('matches on the display name too', () => {
    expect(withConnectors('connect to PostgreSQL').action).toEqual({
      kind: 'select_connector',
      connectorId: 'postgres-connector-1.0.0',
    });
  });

  it('asks which one when two versions match', () => {
    const resolution = withConnectors('use kafka');

    expect(resolution.status).toBe('ambiguous');
    expect(resolution.clarify?.options).toEqual(
      expect.arrayContaining(['Kafka', 'Kafka (legacy)']),
    );
  });

  it('offers each match as a runnable action', () => {
    const resolution = withConnectors('use kafka');

    expect(resolution.candidateActions).toEqual(
      expect.arrayContaining([
        { kind: 'select_connector', connectorId: 'kafka-connector-2.0.0' },
      ]),
    );
  });

  it('declines a connector that is not installed', () => {
    expect(withConnectors('use snowflake').status).not.toBe('resolved');
  });

  it('resolves nothing before the connector list has been read', () => {
    expect(resolve('use postgres').status).not.toBe('resolved');
  });

  it('still understands skipping the connector', () => {
    expect(withConnectors('skip the connector').action).toEqual({
      kind: 'skip_connector',
    });
  });
});

describe('filling a connector property', () => {
  const connectorProperties = [
    'source_database_host',
    'source_database_port',
    'source_kafka_auto_offset_reset',
  ];

  const withConnector = (utterance: string) =>
    resolveUtterance(utterance, { vocabulary, connectorProperties });

  it('sets a property the connector declares', () => {
    expect(
      withConnector('set source_database_host to db.internal').action,
    ).toEqual({
      kind: 'set_connector_field',
      property: 'source_database_host',
      value: 'db.internal',
    });
  });

  it('keeps the value verbatim', () => {
    expect(
      withConnector('set source_database_port to 5432').action,
    ).toMatchObject({ value: '5432' });
  });

  /**
   * The credential must never become an action, because an action is recorded
   * in the transcript. Refusing at the resolver keeps the value out entirely.
   */
  it('refuses a credential and says where it will be asked for', () => {
    const resolution = withConnector('set source_database_pwd to hunter2');

    expect(resolution.status).not.toBe('resolved');
    expect(JSON.stringify(resolution)).not.toContain('hunter2');
  });

  it('declines a property the connector does not declare', () => {
    expect(
      withConnector('set source_database_schema to public').status,
    ).not.toBe('resolved');
  });

  /**
   * Without a chosen connector, "set X to Y" belongs to the schema rules.
   * Reading it as a connector field would write to the wrong config.
   */
  it('does not claim a schema instruction as a connector field', () => {
    expect(resolve('set order_id to string').action).toEqual({
      kind: 'set_data_type',
      path: 'order_id',
      dataType: 'string',
    });
  });

  it('leaves schema instructions alone even with a connector chosen', () => {
    expect(withConnector('set order_id to string').action).toEqual({
      kind: 'set_data_type',
      path: 'order_id',
      dataType: 'string',
    });
  });
});

/**
 * Reported live: the connector list call was failing, and every connector
 * instruction came back as a generic "I did not understand" — which sent the
 * user looking for a phrasing problem that did not exist.
 */
describe('when the connector list could not be read', () => {
  const unavailable = (utterance: string) =>
    resolveUtterance(utterance, {
      vocabulary,
      connectors: [],
      connectorsUnavailable: true,
    });

  it('says the list could not be read', () => {
    expect(unavailable('use postgres').clarify?.question).toMatch(
      /could not read the list of connectors/i,
    );
  });

  it('still does not resolve an action', () => {
    expect(unavailable('use postgres').status).not.toBe('resolved');
  });

  it('stays silent about connectors when the list is merely empty', () => {
    const resolution = resolveUtterance('use postgres', {
      vocabulary,
      connectors: [],
    });

    expect(resolution.clarify?.question ?? '').not.toMatch(/connectors/i);
  });

  it('does not hijack a schema instruction', () => {
    expect(unavailable('make order_id required').action).toEqual({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });
});

/**
 * Seen live: `set source_database_pwd to ...` came back as "I did not
 * understand". The secret check ran *after* the membership test, and
 * `connectorProperties` is the fillable list, which already excludes
 * secrets — so the guard could never fire.
 */
describe('naming a credential in chat', () => {
  const withConnector = (utterance: string) =>
    resolveUtterance(utterance, {
      vocabulary,
      connectorProperties: ['source_database_host', 'source_database_port'],
    });

  it('says it will be asked for in a secure form', () => {
    expect(
      withConnector('set source_database_pwd to hunter2').clarify?.question,
    ).toMatch(/secure form/i);
  });

  it('does not fall through to "I did not understand"', () => {
    const resolution = withConnector('set source_database_pwd to hunter2');

    expect(resolution.clarify?.question ?? '').not.toMatch(
      /did not understand/i,
    );
  });

  it('keeps the value out of the resolution entirely', () => {
    const resolution = withConnector(
      'set source_database_pwd to hunter2-leak-check',
    );

    expect(JSON.stringify(resolution)).not.toContain('hunter2-leak-check');
  });

  it('refuses cert material by name too', () => {
    expect(
      withConnector('set source_kafka_ssl_truststore_base64 to AAAA').clarify
        ?.question,
    ).toMatch(/secure form/i);
  });

  it('resolves nothing', () => {
    expect(withConnector('set source_database_pwd to x').status).not.toBe(
      'resolved',
    );
  });
});

/**
 * The credential form has to be reachable, or a connector can never be saved.
 * Seen live: naming a credential was correctly refused, but there was no way
 * to then supply it — the same gap the file-drop card had.
 */
describe('asking for the credential form', () => {
  const withConnector = (utterance: string) =>
    resolveUtterance(utterance, {
      vocabulary,
      connectorProperties: ['source_database_host'],
    });

  it.each([
    'I need to enter the connector credentials',
    'add the credentials',
    'let me set the password',
    'provide the secrets',
  ])('understands "%s"', (utterance) => {
    expect(withConnector(utterance).action).toEqual({
      kind: 'request_connector_secrets',
    });
  });

  it('does not offer the form before a connector is chosen', () => {
    expect(resolve('enter the credentials').status).not.toBe('resolved');
  });

  /** A named property is still refused specifically, not turned into a form. */
  it('prefers the specific refusal when a property is named', () => {
    expect(
      withConnector('set source_database_pwd to hunter2').clarify?.question,
    ).toMatch(/secure form/i);
  });
});
