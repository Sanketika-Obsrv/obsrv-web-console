import { Action, DataType, validateAction } from './actions';
import { DatasetSnapshot } from './executor';
import { inverseOf, undoTarget } from './undo';
import { Message } from '../session/types';

const field = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  type: 'string',
  arrival_format: 'text',
  data_type: 'string',
  ...overrides,
});

const snapshot = (
  overrides: Partial<DatasetSnapshot> = {},
): DatasetSnapshot => ({
  dataset_id: 'my-orders',
  version_key: '1',
  name: 'My Orders',
  type: 'event',
  data_schema: {
    properties: {
      order_id: field(),
      total_amount: field({ arrival_format: 'number', data_type: 'integer' }),
      customer: {
        type: 'object',
        data_type: 'object',
        arrival_format: 'object',
        properties: { email: field() },
      },
    },
  },
  validation_config: { validate: true, mode: 'Strict' },
  dedup_config: { drop_duplicates: false, dedup_key: '' },
  denorm_config: { denorm_fields: [] },
  transformations_config: [],
  dataset_config: {
    keys_config: {},
    indexing_config: {
      olap_store_enabled: true,
      lakehouse_enabled: false,
      cache_enabled: false,
    },
  },
  ...overrides,
});

/** The inverse actions, or a thrown assertion naming the refusal. */
const inverse = (action: Action, before = snapshot()): Action[] => {
  const result = inverseOf(action, before);
  if (!result.ok) throw new Error(`expected an inverse, got: ${result.reason}`);
  return result.actions;
};

const refusal = (action: Action, before = snapshot()): string => {
  const result = inverseOf(action, before);
  if (result.ok) throw new Error('expected a refusal');
  return result.reason;
};

describe('inverting a schema edit', () => {
  it('puts the data type back to what the server held', () => {
    expect(
      inverse({ kind: 'set_data_type', path: 'order_id', dataType: 'double' }),
    ).toEqual([
      { kind: 'set_data_type', path: 'order_id', dataType: 'string' },
    ]);
  });

  /**
   * `setDataType` moves the arrival format too when the current bucket cannot
   * hold the requested store format, so restoring the store format alone
   * leaves the field in a pairing it never had: a `number`/`integer` field
   * changed to `date-time` lands in `text`, and undoing to `integer` would
   * stay in `text`. The arrival format is restored second, because the check
   * it applies only passes once the store format is back.
   */
  it('also restores the arrival format when the type change moved it', () => {
    expect(
      inverse({
        kind: 'set_data_type',
        path: 'total_amount',
        dataType: 'date-time',
      }),
    ).toEqual([
      { kind: 'set_data_type', path: 'total_amount', dataType: 'integer' },
      {
        kind: 'set_arrival_format',
        path: 'total_amount',
        arrivalFormat: 'number',
      },
    ]);
  });

  it('restores the arrival format', () => {
    expect(
      inverse({
        kind: 'set_arrival_format',
        path: 'total_amount',
        arrivalFormat: 'text',
      }),
    ).toEqual([
      {
        kind: 'set_arrival_format',
        path: 'total_amount',
        arrivalFormat: 'number',
      },
    ]);
  });

  it('restores whether a field was required', () => {
    const before = snapshot({
      data_schema: { properties: { order_id: field({ isRequired: true }) } },
    });

    expect(
      inverse(
        { kind: 'toggle_required', path: 'order_id', required: false },
        before,
      ),
    ).toEqual([{ kind: 'toggle_required', path: 'order_id', required: true }]);
  });

  it('treats an absent isRequired as optional rather than guessing', () => {
    expect(
      inverse({ kind: 'toggle_required', path: 'order_id', required: true }),
    ).toEqual([{ kind: 'toggle_required', path: 'order_id', required: false }]);
  });

  it('clears a description that was not there before', () => {
    expect(
      inverse({
        kind: 'set_description',
        path: 'order_id',
        description: 'the order',
      }),
    ).toEqual([{ kind: 'set_description', path: 'order_id', description: '' }]);
  });

  it('deletes a field that was added', () => {
    expect(
      inverse({
        kind: 'add_field',
        name: 'phone',
        parentPath: 'customer',
        arrivalFormat: 'text',
        dataType: 'string',
      }),
    ).toEqual([{ kind: 'delete_field', path: 'customer.phone' }]);
  });

  it('rebuilds a deleted leaf with its description and requiredness', () => {
    const before = snapshot({
      data_schema: {
        properties: {
          customer: {
            type: 'object',
            data_type: 'object',
            properties: {
              email: field({ isRequired: true, description: 'contact' }),
            },
          },
        },
      },
    });

    expect(
      inverse({ kind: 'delete_field', path: 'customer.email' }, before),
    ).toEqual([
      {
        kind: 'add_field',
        name: 'email',
        parentPath: 'customer',
        arrivalFormat: 'text',
        dataType: 'string',
      },
      { kind: 'toggle_required', path: 'customer.email', required: true },
      {
        kind: 'set_description',
        path: 'customer.email',
        description: 'contact',
      },
    ]);
  });

  /**
   * `add_field` creates one field, so an object with children cannot be put
   * back by it. Saying so is better than restoring an empty object and
   * calling the dataset restored.
   */
  it('refuses to rebuild a deleted object with fields under it', () => {
    expect(refusal({ kind: 'delete_field', path: 'customer' })).toMatch(
      /customer/,
    );
  });

  it('refuses when the field is not in the document it read', () => {
    expect(
      refusal({ kind: 'set_data_type', path: 'nope', dataType: 'string' }),
    ).toMatch(/nope/);
  });

  it('refuses to un-resolve a conflict', () => {
    expect(
      refusal({ kind: 'resolve_conflict', path: 'order_id', mode: 'apply' }),
    ).toMatch(/resolv/i);
  });
});

describe('inverting a processing change', () => {
  it('restores the previous validation mode', () => {
    const before = snapshot({
      validation_config: { validate: true, mode: 'IgnoreNewFields' },
    });

    expect(
      inverse({ kind: 'set_additional_fields', allow: false }, before),
    ).toEqual([{ kind: 'set_additional_fields', allow: true }]);
  });

  it('refuses when the document carries no validation mode to restore', () => {
    expect(
      refusal(
        { kind: 'set_additional_fields', allow: true },
        snapshot({ validation_config: undefined }),
      ),
    ).toMatch(/validation|before/i);
  });

  it('removes a transformation that was added', () => {
    expect(
      inverse({
        kind: 'set_pii',
        path: 'customer.email',
        action: 'mask',
        skipOnFailure: false,
      }),
    ).toEqual([{ kind: 'remove_transformation', fieldKey: 'customer.email' }]);
  });

  it('removes a derived field by its name', () => {
    expect(
      inverse({
        kind: 'add_derived_field',
        name: 'total_with_tax',
        expression: '$number(total_amount) * 1.2',
        skipOnFailure: false,
      }),
    ).toEqual([{ kind: 'remove_transformation', fieldKey: 'total_with_tax' }]);
  });

  /**
   * A transformation write replaces by `field_key`, so undoing one that
   * replaced another would silently drop the original. There is no action
   * that carries a transformation's stored definition, so this is refused
   * rather than half-done.
   */
  it('refuses when the transformation replaced an existing one', () => {
    const before = snapshot({
      transformations_config: [
        {
          field_key: 'customer.email',
          transformation_function: { type: 'encrypt' },
          mode: 'Strict',
        },
      ],
    });

    expect(
      refusal(
        {
          kind: 'set_pii',
          path: 'customer.email',
          action: 'mask',
          skipOnFailure: false,
        },
        before,
      ),
    ).toMatch(/customer\.email/);
  });

  it('restores the previous dedup settings', () => {
    const before = snapshot({
      dedup_config: { drop_duplicates: true, dedup_key: 'order_id' },
    });

    expect(inverse({ kind: 'set_dedup', enabled: false }, before)).toEqual([
      { kind: 'set_dedup', enabled: true, key: 'order_id' },
    ]);
  });

  it('turns dedup back off, naming no key', () => {
    expect(
      inverse({ kind: 'set_dedup', enabled: true, key: 'order_id' }),
    ).toEqual([{ kind: 'set_dedup', enabled: false }]);
  });

  it('removes a denormalisation that was added', () => {
    expect(
      inverse({
        kind: 'set_denorm',
        path: 'customer.email',
        masterDatasetId: 'customers',
        outField: 'customer_details',
      }),
    ).toEqual([{ kind: 'remove_denorm', path: 'customer.email' }]);
  });

  it('refuses when the denormalisation replaced an existing one', () => {
    const before = snapshot({
      denorm_config: {
        denorm_fields: [
          {
            denorm_key: 'customer.email',
            denorm_out_field: 'old',
            dataset_id: 'customers',
          },
        ],
      },
    });

    expect(
      refusal(
        {
          kind: 'set_denorm',
          path: 'customer.email',
          masterDatasetId: 'customers',
          outField: 'customer_details',
        },
        before,
      ),
    ).toMatch(/customer\.email/);
  });
});

describe('inverting a storage change', () => {
  it('restores all three flags, not only the one that was set', () => {
    expect(inverse({ kind: 'set_storage', lakehouse: true })).toEqual([
      {
        kind: 'set_storage',
        realtime: true,
        lakehouse: false,
        cache: false,
      },
    ]);
  });

  /**
   * The update API insists at least one store stays enabled, so an undo that
   * would send an all-off triple is refused here rather than sent and
   * rejected.
   */
  it('refuses when nothing was enabled before', () => {
    const before = snapshot({
      dataset_config: { keys_config: {}, indexing_config: {} },
    });

    expect(refusal({ kind: 'set_storage', cache: true }, before)).toMatch(
      /one storage option|nothing/i,
    );
  });

  it('restores the previous keys, clearing the ones that were empty', () => {
    const before = snapshot({
      dataset_config: {
        indexing_config: { olap_store_enabled: true },
        keys_config: { data_key: 'order_id', timestamp_key: '' },
      },
    });

    expect(
      inverse(
        { kind: 'set_keys', primary: 'total_amount', timestamp: 'order_id' },
        before,
      ),
    ).toEqual([
      {
        kind: 'set_keys',
        primary: 'order_id',
        partition: '',
        timestamp: '',
      },
    ]);
  });
});

describe('inverting the ingestion actions', () => {
  it('restores the previous name', () => {
    expect(inverse({ kind: 'set_dataset_name', name: 'Renamed' })).toEqual([
      { kind: 'set_dataset_name', name: 'My Orders' },
    ]);
  });

  it('restores the previous type', () => {
    expect(
      inverse({ kind: 'set_dataset_type', datasetType: 'master' }),
    ).toEqual([{ kind: 'set_dataset_type', datasetType: 'event' }]);
  });

  it('refuses to take back the sample that created the draft', () => {
    expect(refusal({ kind: 'attach_sample', fileName: 'orders.json' })).toMatch(
      /sample|draft/i,
    );
  });

  it('refuses to undo a save', () => {
    expect(refusal({ kind: 'save' })).toMatch(/status|save|publish/i);
  });

  it('refuses to undo an undo of a transformation', () => {
    expect(
      refusal({ kind: 'remove_transformation', fieldKey: 'customer.email' }),
    ).toMatch(/transformation/i);
  });
});

/**
 * An inverse is dispatched through the same executor the user's own
 * instructions go through, so one that does not validate would be rejected as
 * an unknown action at the point of use rather than here.
 */
describe('every inverse it produces', () => {
  const cases: Action[] = [
    { kind: 'set_data_type', path: 'total_amount', dataType: 'date-time' },
    { kind: 'set_arrival_format', path: 'total_amount', arrivalFormat: 'text' },
    { kind: 'toggle_required', path: 'order_id', required: true },
    { kind: 'set_description', path: 'order_id', description: 'x' },
    {
      kind: 'add_field',
      name: 'phone',
      arrivalFormat: 'text',
      dataType: 'string',
    },
    { kind: 'set_additional_fields', allow: true },
    {
      kind: 'set_pii',
      path: 'customer.email',
      action: 'mask',
      skipOnFailure: false,
    },
    { kind: 'set_dedup', enabled: true, key: 'order_id' },
    {
      kind: 'set_denorm',
      path: 'customer.email',
      masterDatasetId: 'customers',
      outField: 'out',
    },
    { kind: 'set_storage', lakehouse: true },
    { kind: 'set_keys', primary: 'total_amount' },
    { kind: 'set_dataset_name', name: 'Renamed' },
    { kind: 'set_dataset_type', datasetType: 'master' },
  ];

  it.each(cases.map((action) => [action.kind, action] as const))(
    'is a valid action, for %s',
    (_kind, action) => {
      inverse(action).forEach((inverted) => {
        expect(validateAction(inverted)).toEqual({
          ok: true,
          action: inverted,
        });
      });
    },
  );
});

describe('choosing what to undo', () => {
  const message = (overrides: Partial<Message>): Message => ({
    id: overrides.id ?? 'm1',
    role: 'assistant',
    text: 'Done',
    createdAt: 1,
    ...overrides,
  });

  const change = (id: string, dataType: DataType = 'double'): Message =>
    message({
      id,
      action: { kind: 'set_data_type', path: 'order_id', dataType },
      inverse: [
        { kind: 'set_data_type', path: 'order_id', dataType: 'string' },
      ],
    });

  it('has nothing to undo in an empty conversation', () => {
    expect(undoTarget([])).toEqual({ status: 'none' });
  });

  it('takes the most recent change', () => {
    const target = undoTarget([change('m1'), change('m2')]);

    expect(target.status).toBe('ready');
    if (target.status !== 'ready') return;
    expect(target.message.id).toBe('m2');
  });

  /**
   * Undoing an older change while a newer one stands would leave the dataset
   * in a state the conversation never described, so the newest change is
   * reported as un-undoable rather than skipped.
   */
  it('reports the newest change as blocked rather than reaching past it', () => {
    const blocked = message({
      id: 'm2',
      action: { kind: 'attach_sample', fileName: 'orders.json' },
      undoBlocked: 'I cannot take back the sample.',
    });

    expect(undoTarget([change('m1'), blocked])).toEqual({
      status: 'blocked',
      message: blocked,
      reason: 'I cannot take back the sample.',
    });
  });

  it('ignores turns that wrote nothing', () => {
    const moved = message({
      id: 'm2',
      action: { kind: 'goto_step', step: 'storage' },
    });
    const target = undoTarget([change('m1'), moved]);

    expect(target.status).toBe('ready');
    if (target.status !== 'ready') return;
    expect(target.message.id).toBe('m1');
  });

  it('ignores a change that was rejected', () => {
    const failed = message({
      id: 'm2',
      action: { kind: 'set_dedup', enabled: true, key: 'order_id' },
      failureCode: 'INELIGIBLE_DEDUP_KEY',
    });
    const target = undoTarget([change('m1'), failed]);

    expect(target.status).toBe('ready');
    if (target.status !== 'ready') return;
    expect(target.message.id).toBe('m1');
  });

  it('does not offer the same change twice', () => {
    const undone = { ...change('m2'), undone: true };
    const target = undoTarget([change('m1'), undone]);

    expect(target.status).toBe('ready');
    if (target.status !== 'ready') return;
    expect(target.message.id).toBe('m1');
  });

  it('ignores what the user typed', () => {
    expect(
      undoTarget([message({ id: 'u1', role: 'user', text: 'undo' })]),
    ).toEqual({ status: 'none' });
  });
});
