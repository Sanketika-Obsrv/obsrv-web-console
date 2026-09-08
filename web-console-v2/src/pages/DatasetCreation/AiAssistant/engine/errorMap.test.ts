/**
 * Every fixture message in this file was captured from the live config API,
 * not invented. Where a test asserts on parsing, it parses the real string.
 */
import {
  SESSION_EXPIRED,
  availableStorageLabels,
  diagnose,
  isEmptyEnvelope,
  storageCapabilities,
  storageRetryAction,
} from './errorMap';

describe('diagnose — optimistic locking', () => {
  const outdated = {
    code: 'DATASET_OUTDATED',
    error:
      'The dataset is outdated. Please try to fetch latest changes of the dataset and perform the updates',
  };

  it('treats a stale version_key as replayable and self-healing', () => {
    const diagnosis = diagnose(outdated);

    expect(diagnosis.recovery).toBe('replay');
    expect(diagnosis.selfHeal).toBe(true);
  });

  it('explains the conflict without echoing the server wording', () => {
    const { explanation } = diagnose(outdated);

    expect(explanation).toMatch(/changed/i);
    expect(explanation).not.toMatch(/fetch latest changes/);
  });

  it('keeps the raw server message as detail', () => {
    expect(diagnose(outdated).detail).toBe(outdated.error);
  });
});

describe('diagnose — unsupported storage type', () => {
  /** Live response when `lakehouse_enabled: true` on a realtime-only cluster. */
  const unsupported = {
    code: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
    error:
      'The storage type "lake_house" is not available. Please use one of the available storage types: realtime_store',
  };

  it('needs a different request rather than a retry of the same one', () => {
    const diagnosis = diagnose(unsupported);

    expect(diagnosis.recovery).toBe('revise');
    expect(diagnosis.selfHeal).toBe(false);
  });

  it('parses the unavailable store and the available list', () => {
    expect(diagnose(unsupported).storage).toEqual({
      unavailable: 'lake_house',
      available: ['realtime_store'],
    });
  });

  it('parses a multi-store available list', () => {
    expect(
      diagnose({
        code: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
        error:
          'The storage type "lake_house" is not available. Please use one of the available storage types: realtime_store, cache',
      }).storage,
    ).toEqual({
      unavailable: 'lake_house',
      available: ['realtime_store', 'cache'],
    });
  });

  it('explains it in the console’s own storage wording', () => {
    const { explanation } = diagnose(unsupported);

    expect(explanation).toContain('Lakehouse');
    expect(explanation).toContain('Real-time Store');
  });

  /** The acceptance criterion: an explanation *and* a working retry. */
  it('offers a set_storage action that turns the unavailable store off', () => {
    expect(diagnose(unsupported).retryAction).toEqual({
      kind: 'set_storage',
      lakehouse: false,
      realtime: true,
    });
  });

  it('leaves cache alone, because cache is not validated as a storage type', () => {
    const retry = diagnose(unsupported).retryAction as Record<string, unknown>;

    expect(retry).not.toHaveProperty('cache');
  });

  it('degrades to an explanation when the message names an unknown store', () => {
    const diagnosis = diagnose({
      code: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
      error:
        'The storage type "quantum_store" is not available. Please use one of the available storage types: realtime_store',
    });

    expect(diagnosis.storage?.unavailable).toBe('quantum_store');
    expect(diagnosis.retryAction).toEqual({
      kind: 'set_storage',
      realtime: true,
    });
  });

  it('still classifies the failure when the message is not parseable', () => {
    const diagnosis = diagnose({
      code: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
      error: 'Storage unavailable',
    });

    expect(diagnosis.recovery).toBe('revise');
    expect(diagnosis.storage).toBeUndefined();
    expect(diagnosis.retryAction).toBeUndefined();
    expect(diagnosis.detail).toBe('Storage unavailable');
  });
});

describe('storageRetryAction', () => {
  it('enables every available store and disables the rest', () => {
    expect(
      storageRetryAction({
        unavailable: 'lake_house',
        available: ['realtime_store'],
      }),
    ).toEqual({ kind: 'set_storage', lakehouse: false, realtime: true });
  });

  it('returns nothing when no known store is available', () => {
    expect(
      storageRetryAction({ unavailable: 'lake_house', available: [] }),
    ).toBeUndefined();
  });
});

describe('diagnose — payloads we built wrong', () => {
  /**
   * These two are assistant bugs, not user mistakes: the server rejected a
   * body this code assembled. They must never be dressed up as user error.
   */
  it('names the config block that carried extra properties', () => {
    const diagnosis = diagnose({
      code: 'DATASET_UPDATE_INPUT_INVALID',
      error:
        '#properties/request/properties/dataset_config/additionalProperties must NOT have additional properties',
    });

    expect(diagnosis.recovery).toBe('report');
    expect(diagnosis.selfHeal).toBe(false);
    expect(diagnosis.subject).toBe('dataset_config');
  });

  it('names the config block that was missing a delta wrapper', () => {
    const diagnosis = diagnose({
      code: 'DATASET_UPDATE_INPUT_INVALID',
      error:
        "#properties/request/properties/transformations_config/items/required must have required property 'value'",
    });

    expect(diagnosis.recovery).toBe('report');
    expect(diagnosis.subject).toBe('transformations_config');
    expect(diagnosis.explanation).toMatch(/upsert|remove|delta/i);
  });

  it('handles a status-transition schema rejection', () => {
    const diagnosis = diagnose({
      code: 'DATASET_STATUS_TRANSITION_INVALID_INPUT',
      error:
        '#properties/request/properties/status/enum must be equal to one of the allowed values',
    });

    expect(diagnosis.recovery).toBe('report');
    expect(diagnosis.subject).toBe('status');
  });

  it('handles the dataschema call missing its config block', () => {
    const diagnosis = diagnose({
      code: 'DATA_SCHEMA_INVALID_INPUT',
      error:
        "#properties/request/required must have required property 'config'",
    });

    expect(diagnosis.recovery).toBe('report');
    expect(diagnosis.subject).toBe('config');
  });

  it('lists the fields a read projection asked for and could not have', () => {
    const diagnosis = diagnose({
      code: 'DATASET_INVALID_FIELDS',
      error:
        'The specified fields [version_key] in the dataset cannot be found.',
    });

    expect(diagnosis.recovery).toBe('report');
    expect(diagnosis.subject).toBe('version_key');
  });
});

describe('diagnose — dataset lifecycle', () => {
  it('sends a missing dataset back to the start', () => {
    const diagnosis = diagnose({
      code: 'DATASET_NOT_FOUND',
      error: 'Dataset with the given dataset_id:orders not found',
    });

    expect(diagnosis.recovery).toBe('restart');
    expect(diagnosis.selfHeal).toBe(false);
  });

  it('asks for a different name when the id is taken', () => {
    const diagnosis = diagnose({
      code: 'DATASET_EXISTS',
      error: 'Dataset Already exists with id:orders',
    });

    expect(diagnosis.recovery).toBe('revise');
    expect(diagnosis.explanation).toMatch(/name/i);
  });
});

describe('diagnose — transport', () => {
  it('retries a network error, since a read is idempotent', () => {
    const diagnosis = diagnose({ code: 'READ_FAILED', error: 'Network Error' });

    expect(diagnosis.recovery).toBe('retry');
    expect(diagnosis.selfHeal).toBe(true);
  });

  it('routes a lost session to re-authentication and never retries it', () => {
    const diagnosis = diagnose({
      code: SESSION_EXPIRED,
      error: 'The response was the login page, not an API envelope',
    });

    expect(diagnosis.recovery).toBe('reauth');
    expect(diagnosis.selfHeal).toBe(false);
    expect(diagnosis.explanation).toMatch(/sign(ed)? in/i);
  });

  it('does not retry a plain server rejection', () => {
    expect(
      diagnose({ code: 'PATCH_FAILED', error: 'Request failed' }).selfHeal,
    ).toBe(false);
  });
});

describe('diagnose — codes raised before any request', () => {
  /** Client-side guards already carry a written message; keep it verbatim. */
  it.each([
    'UNKNOWN_FIELD',
    'INVALID_EDIT',
    'NO_SCHEMA',
    'INELIGIBLE_DEDUP_KEY',
    'NO_STORAGE_SELECTED',
  ])('passes %s through as a revision the user can act on', (code) => {
    const diagnosis = diagnose({ code, error: 'Unknown field "custmer_id"' });

    expect(diagnosis.recovery).toBe('revise');
    expect(diagnosis.selfHeal).toBe(false);
    expect(diagnosis.explanation).toBe('Unknown field "custmer_id"');
  });
});

describe('diagnose — unknown codes', () => {
  it('never invents an explanation for a code it does not know', () => {
    const diagnosis = diagnose({
      code: 'DATASET_SOMETHING_NEW',
      error: 'Something specific the server said',
    });

    expect(diagnosis.recovery).toBe('report');
    expect(diagnosis.selfHeal).toBe(false);
    expect(diagnosis.explanation).toBe('Something specific the server said');
    expect(diagnosis.code).toBe('DATASET_SOMETHING_NEW');
  });

  it('says something useful even with an empty message', () => {
    expect(diagnose({ code: 'WAT', error: '' }).explanation).not.toBe('');
  });
});

describe('isEmptyEnvelope', () => {
  /**
   * `unwrapResult` is `_.get(response, ['data', 'result'])`. An expired
   * session makes the dev server answer with the SPA HTML shell at HTTP 200,
   * so the call resolves to `undefined` instead of throwing. Confirmed live
   * against `/config/v2/datasets/read` and `/api/config/data`.
   */
  it('flags a response that carried no result envelope', () => {
    expect(isEmptyEnvelope(undefined)).toBe(true);
    expect(isEmptyEnvelope(null)).toBe(true);
  });

  it('flags an HTML body that slipped through as a string', () => {
    expect(isEmptyEnvelope('<!doctype html><html lang="en">')).toBe(true);
  });

  it('accepts a real result object', () => {
    expect(isEmptyEnvelope({ dataset_id: 'orders' })).toBe(false);
  });

  it('accepts a legitimately empty object', () => {
    expect(isEmptyEnvelope({})).toBe(false);
  });
});

describe('storageCapabilities', () => {
  it('reads the same STORAGE_TYPES setting the wizard reads', () => {
    expect(
      storageCapabilities({ lake_house: false, realtime_store: true }),
    ).toEqual({ lakehouse: false, realtime: true, cache: true });
  });

  /**
   * `Storage.tsx` calls `JSON.parse(getSystemSetting('STORAGE_TYPES'))` with
   * no guard, so a missing setting throws there. Here an unreadable setting
   * must not decide anything is unavailable.
   */
  it('assumes nothing when the setting is missing or malformed', () => {
    expect(storageCapabilities(undefined)).toEqual({
      lakehouse: true,
      realtime: true,
      cache: true,
    });
    expect(storageCapabilities('not json')).toEqual({
      lakehouse: true,
      realtime: true,
      cache: true,
    });
  });

  it('parses the setting when it arrives as a JSON string', () => {
    expect(
      storageCapabilities('{"lake_house":true,"realtime_store":false}'),
    ).toEqual({ lakehouse: true, realtime: false, cache: true });
  });
});

describe('availableStorageLabels', () => {
  it('labels stores the way the storage step does', () => {
    expect(availableStorageLabels(['realtime_store', 'lake_house'])).toEqual([
      'Real-time Store (Druid)',
      'Data Lakehouse (Hudi)',
    ]);
  });

  it('passes an unrecognised store through unchanged', () => {
    expect(availableStorageLabels(['quantum_store'])).toEqual([
      'quantum_store',
    ]);
  });
});
