import { readFileSync } from 'fs';
import { MODELS, bytesNeeded, modelById, modelForTier } from './catalog';

/**
 * The installed `web-llm` bundle, read rather than imported: the package is
 * ~14 MB of ES modules that jest would have to transform, and all that is
 * wanted here is what its prebuilt config actually says.
 */
const bundle = readFileSync(
  require.resolve('@mlc-ai/web-llm/lib/index.js'),
  'utf8',
);

describe('the model catalog', () => {
  /**
   * The guard that matters. A model id that has been renamed or dropped by an
   * upgrade fails at download time, in the user's browser, after they agreed
   * to fetch several hundred megabytes.
   */
  it('names models the installed web-llm actually has', () => {
    const missing = MODELS.filter(
      (model) => !bundle.includes(`model_id: "${model.id}"`),
    ).map((model) => model.id);

    expect(missing).toEqual([]);
  });

  it('quotes the VRAM figures the package reports', () => {
    const wrong = MODELS.filter((model) => {
      const at = bundle.indexOf(`model_id: "${model.id}"`);
      const reported = bundle
        .slice(at, at + 400)
        .match(/vram_required_MB: ([\d.]+)/)?.[1];

      return Number(reported) !== model.vramMB;
    }).map((model) => model.id);

    expect(wrong).toEqual([]);
  });

  it('offers the biggest model the tier allows', () => {
    expect(modelForTier(1)?.id).toBe('Qwen3-0.6B-q4f16_1-MLC');
    expect(modelForTier(2)?.id).toBe('Qwen3-1.7B-q4f16_1-MLC');
  });

  it('offers nothing at all at tier 0', () => {
    expect(modelForTier(0)).toBeUndefined();
  });

  it('finds a model by the id the engine uses', () => {
    expect(modelById('Qwen3-1.7B-q4f16_1-MLC')?.label).toBe('Qwen3 1.7B');
    expect(modelById('made-up')).toBeUndefined();
  });

  it('asks for more room than the download alone', () => {
    for (const model of MODELS) {
      expect(bytesNeeded(model)).toBeGreaterThan(
        model.downloadMB * 1024 * 1024,
      );
    }
  });

  it('costs more the bigger it is', () => {
    const [small, large] = MODELS;

    expect(large.downloadMB).toBeGreaterThan(small.downloadMB);
    expect(large.vramMB).toBeGreaterThan(small.vramMB);
    expect(large.tier).toBeGreaterThan(small.tier);
  });
});
