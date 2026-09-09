import {
  ACTION_KINDS,
  Action,
  ARRIVAL_FORMATS,
  DATA_TYPES,
  buildActionSchema,
  createActionValidator,
  validateAction,
} from './actions';

const validActions: Action[] = [
  { kind: 'set_dataset_name', name: 'Claude Probe Orders' },
  { kind: 'set_dataset_type', datasetType: 'event' },
  { kind: 'attach_sample', fileName: 'orders.json' },
  { kind: 'select_connector', connectorId: 'kafka-connector-2.0.0' },
  {
    kind: 'set_connector_field',
    property: 'source_kafka_topic',
    value: 'orders',
  },
  { kind: 'request_connector_secrets' },
  { kind: 'skip_connector' },
  { kind: 'set_data_type', path: 'total_amount', dataType: 'string' },
  { kind: 'set_arrival_format', path: 'total_amount', arrivalFormat: 'text' },
  { kind: 'toggle_required', path: 'order_id', required: true },
  { kind: 'set_description', path: 'order_id', description: 'Order key' },
  {
    kind: 'add_field',
    name: 'ingested_at',
    arrivalFormat: 'text',
    dataType: 'date-time',
  },
  { kind: 'delete_field', path: 'coupon_code' },
  { kind: 'resolve_conflict', path: 'total_amount', mode: 'apply' },
  {
    kind: 'resolve_conflict',
    path: 'customer.address.geo.lat',
    mode: 'apply',
    dataType: 'double',
  },
  { kind: 'set_additional_fields', allow: false },
  {
    kind: 'set_pii',
    path: 'customer.email',
    action: 'mask',
    skipOnFailure: true,
  },
  {
    kind: 'add_transformation',
    path: 'customer.email',
    expression: '$lowercase(customer.email)',
    skipOnFailure: false,
  },
  {
    kind: 'add_derived_field',
    name: 'order_day',
    expression: '$substring(order_ts, 0, 10)',
    skipOnFailure: true,
  },
  { kind: 'set_dedup', enabled: true, key: 'order_id' },
  { kind: 'set_dedup', enabled: false },
  {
    kind: 'set_denorm',
    path: 'customer.customer_id',
    masterDatasetId: 'customer-master',
    outField: 'customer_details',
  },
  { kind: 'remove_transformation', fieldKey: 'customer.email' },
  { kind: 'remove_denorm', path: 'customer.customer_id' },
  { kind: 'set_storage', realtime: true, lakehouse: false },
  { kind: 'set_keys', primary: 'order_id', partition: 'channel' },
  // Restoring `keys_config` as it was often means putting a key back to
  // unset, which the console stores as the empty string.
  { kind: 'set_keys', primary: '', partition: '', timestamp: '' },
  { kind: 'goto_step', step: 'processing' },
  { kind: 'save' },
  { kind: 'explain', topic: 'dedup' },
  { kind: 'clarify', question: 'Which field holds the order id?' },
  { kind: 'undo' },
];

describe('action catalog', () => {
  it('declares every kind used by the executor', () => {
    expect([...ACTION_KINDS]).toEqual([
      'set_dataset_name',
      'set_dataset_type',
      'attach_sample',
      'select_connector',
      'set_connector_field',
      'request_connector_secrets',
      'skip_connector',
      'set_data_type',
      'set_arrival_format',
      'toggle_required',
      'set_description',
      'add_field',
      'delete_field',
      'resolve_conflict',
      'set_additional_fields',
      'set_pii',
      'add_transformation',
      'add_derived_field',
      'set_dedup',
      'set_denorm',
      'remove_transformation',
      'remove_denorm',
      'set_storage',
      'set_keys',
      'goto_step',
      'save',
      'explain',
      'clarify',
      'undo',
    ]);
  });

  it('keeps the schema and the declared kinds in sync', () => {
    const schema = buildActionSchema();
    const schemaKinds = (
      schema.oneOf as { properties: { kind: { const: string } } }[]
    ).map((variant) => variant.properties.kind.const);

    expect(schemaKinds.sort()).toEqual([...ACTION_KINDS].sort());
  });

  it('has at least one fixture per kind so nothing goes untested', () => {
    const covered = new Set(validActions.map((action) => action.kind));

    expect([...ACTION_KINDS].filter((kind) => !covered.has(kind))).toEqual([]);
  });
});

describe('validateAction', () => {
  it.each(validActions.map((action) => [action.kind, action] as const))(
    'accepts a valid %s',
    (_kind, action) => {
      const result = validateAction(action);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.action).toEqual(action);
    },
  );

  it('rejects an unknown kind', () => {
    const result = validateAction({ kind: 'drop_database' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/kind/i);
  });

  it('rejects a missing discriminator', () => {
    expect(validateAction({ path: 'order_id' }).ok).toBe(false);
  });

  it('rejects a missing required property', () => {
    const result = validateAction({ kind: 'set_data_type', path: 'a' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/dataType/);
  });

  it('rejects an unknown data type', () => {
    expect(
      validateAction({
        kind: 'set_data_type',
        path: 'total_amount',
        dataType: 'money',
      }).ok,
    ).toBe(false);
  });

  it('rejects unexpected extra properties', () => {
    expect(validateAction({ kind: 'save', dataset_id: 'sneaky' }).ok).toBe(
      false,
    );
  });

  it('rejects a non-object payload', () => {
    expect(validateAction(null).ok).toBe(false);
    expect(validateAction('save').ok).toBe(false);
    expect(validateAction([{ kind: 'save' }]).ok).toBe(false);
  });

  it('rejects the wrong type for a boolean slot', () => {
    expect(
      validateAction({ kind: 'toggle_required', path: 'a', required: 'yes' })
        .ok,
    ).toBe(false);
  });

  it('rejects an empty dataset name', () => {
    expect(validateAction({ kind: 'set_dataset_name', name: '' }).ok).toBe(
      false,
    );
  });

  it('requires a key when deduplication is enabled', () => {
    expect(validateAction({ kind: 'set_dedup', enabled: true }).ok).toBe(false);
    expect(
      validateAction({ kind: 'set_dedup', enabled: true, key: 'order_id' }).ok,
    ).toBe(true);
  });

  it('rejects an unknown data type on resolve_conflict', () => {
    expect(
      validateAction({
        kind: 'resolve_conflict',
        path: 'a',
        mode: 'apply',
        dataType: 'money',
      }).ok,
    ).toBe(false);
  });

  it('requires at least one storage flag', () => {
    expect(validateAction({ kind: 'set_storage' }).ok).toBe(false);
  });

  it('requires at least one key on set_keys', () => {
    expect(validateAction({ kind: 'set_keys' }).ok).toBe(false);
  });
});

describe('field path constraints', () => {
  const paths = ['order_id', 'total_amount', 'customer.email'];

  it('restricts path slots to the supplied vocabulary', () => {
    const validate = createActionValidator({ fieldPaths: paths });

    expect(
      validate({
        kind: 'set_data_type',
        path: 'customer.email',
        dataType: 'string',
      }).ok,
    ).toBe(true);
    expect(
      validate({ kind: 'set_data_type', path: 'made_up', dataType: 'string' })
        .ok,
    ).toBe(false);
  });

  /**
   * The empty string clears a storage key, so it has to be accepted even with
   * the vocabulary pinned — without letting an invented path through with it.
   */
  it('accepts a cleared storage key but not an invented one', () => {
    const validate = createActionValidator({ fieldPaths: paths });

    expect(validate({ kind: 'set_keys', primary: '' }).ok).toBe(true);
    expect(validate({ kind: 'set_keys', primary: 'made_up' }).ok).toBe(false);
  });

  it('leaves paths unconstrained when no vocabulary is given', () => {
    expect(
      validateAction({ kind: 'delete_field', path: 'anything.at.all' }).ok,
    ).toBe(true);
  });

  it('exposes the vocabulary in the schema handed to the model', () => {
    const schema = buildActionSchema({ fieldPaths: paths });
    const variants = schema.oneOf as {
      properties: { kind: { const: string }; path?: { enum?: string[] } };
    }[];
    const variant = variants.find(
      (entry) => entry.properties.kind.const === 'delete_field',
    );

    expect(variant?.properties.path?.enum).toEqual(paths);
  });

  it('constrains connector properties when supplied', () => {
    const validate = createActionValidator({
      connectorProperties: ['source_kafka_topic'],
    });

    expect(
      validate({
        kind: 'set_connector_field',
        property: 'source_kafka_topic',
        value: 'orders',
      }).ok,
    ).toBe(true);
    expect(
      validate({
        kind: 'set_connector_field',
        property: 'source_database_pwd',
        value: 'hunter2',
      }).ok,
    ).toBe(false);
  });
});

describe('enums mirror the API data mappings', () => {
  it('lists the arrival formats the dataschema API returns', () => {
    expect([...ARRIVAL_FORMATS].sort()).toEqual([
      'array',
      'boolean',
      'number',
      'object',
      'text',
    ]);
  });

  it('lists every store format from the API data mappings', () => {
    expect([...DATA_TYPES].sort()).toEqual([
      'array',
      'bigdecimal',
      'boolean',
      'date',
      'date-time',
      'double',
      'epoch',
      'float',
      'integer',
      'long',
      'number',
      'object',
      'string',
    ]);
  });
});
