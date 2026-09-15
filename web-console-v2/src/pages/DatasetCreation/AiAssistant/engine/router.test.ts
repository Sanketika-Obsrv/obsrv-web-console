import { Action } from './actions';
import { RouterResult, sanitiseRoute } from './router';

const validAction: Action = { kind: 'set_dataset_name', name: 'orders' };
// Missing `name`, which the schema requires.
const invalidAction = { kind: 'set_dataset_name' } as unknown as Action;

describe('sanitiseRoute', () => {
  it('returns undefined for undefined input', () => {
    expect(sanitiseRoute(undefined)).toBeUndefined();
  });

  it.each(['answer', 'request', 'reply_to_card'] as const)(
    'round-trips a valid %s reading, keeping its actions',
    (intent) => {
      const raw: RouterResult = {
        intent,
        step: 'name',
        actions: [{ action: validAction, confirm: true }],
      };

      const result = sanitiseRoute(raw);

      expect(result).toEqual(raw);
    },
  );

  it.each(['ask', 'other'] as const)(
    'round-trips a valid %s reading, with no actions to carry',
    (intent) => {
      const raw: RouterResult = { intent, reply: 'A short answer.' };

      expect(sanitiseRoute(raw)).toEqual({ ...raw, actions: [] });
    },
  );

  it('drops an invalid action but keeps the rest', () => {
    const raw: RouterResult = {
      intent: 'request',
      actions: [{ action: invalidAction }, { action: validAction }],
    };

    expect(sanitiseRoute(raw)?.actions).toEqual([{ action: validAction }]);
  });

  it('forces actions empty for an ask reading, even if the raw input had some', () => {
    const raw: RouterResult = {
      intent: 'ask',
      actions: [{ action: validAction }],
    };

    expect(sanitiseRoute(raw)?.actions).toEqual([]);
  });

  it('forces actions empty for an other reading, even if the raw input had some', () => {
    const raw: RouterResult = {
      intent: 'other',
      actions: [{ action: validAction }],
    };

    expect(sanitiseRoute(raw)?.actions).toEqual([]);
  });

  it('drops an out-of-range step', () => {
    const raw = {
      intent: 'request',
      step: 'publish',
    } as unknown as RouterResult;

    expect(sanitiseRoute(raw)?.step).toBeUndefined();
  });

  it('drops an action barred by the connector properties in play', () => {
    const raw: RouterResult = {
      intent: 'request',
      actions: [
        {
          action: {
            kind: 'set_connector_field',
            property: 'secret_key',
            value: 'x',
          },
        },
      ],
    };

    const result = sanitiseRoute(raw, { connectorProperties: ['host'] });

    expect(result?.actions).toEqual([]);
  });
});
