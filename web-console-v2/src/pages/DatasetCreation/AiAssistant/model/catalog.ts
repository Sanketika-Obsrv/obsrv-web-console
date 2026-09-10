/**
 * The models this assistant will run, and what each one costs.
 *
 * Two, deliberately. The 0.6B is the one worth downloading on a laptop; the
 * 1.7B is there because the 0.6B was measured picking the wrong action from
 * an open menu, and a question-scoped schema plus a bigger model are the two
 * independent fixes for that.
 *
 * `vramMB` is quoted from `prebuiltAppConfig` in the installed `web-llm`,
 * not estimated here — a test checks each figure against the package, so an
 * upgrade that moves them cannot pass silently. `downloadMB` is not in that
 * metadata: the 0.6B figure was measured, and the 1.7B one is scaled from it
 * by parameter count and marked as an estimate until it is measured live.
 */
// Type-only: `tiers` imports this module at runtime, and a value import
// here would close the cycle.
import type { ModelTier } from './tiers';

export interface ModelSpec {
  /** The id `web-llm` knows it by. */
  id: string;
  label: string;
  /** The lowest capability tier that may run it. */
  tier: Exclude<ModelTier, 0 | 3>;
  /** Weights to fetch, megabytes. An estimate for anything but the 0.6B. */
  downloadMB: number;
  /** From the package's own metadata. */
  vramMB: number;
  contextTokens: number;
}

export const MODELS: ModelSpec[] = [
  {
    id: 'Qwen3-0.6B-q4f16_1-MLC',
    label: 'Qwen3 0.6B',
    tier: 1,
    downloadMB: 450,
    vramMB: 1403.34,
    contextTokens: 4096,
  },
  {
    id: 'Qwen3-1.7B-q4f16_1-MLC',
    label: 'Qwen3 1.7B',
    tier: 2,
    downloadMB: 1100,
    vramMB: 2036.66,
    contextTokens: 4096,
  },
];

export const DEFAULT_MODEL = MODELS[0];

/** The best model this browser may run, which is not always the biggest. */
export const modelForTier = (tier: ModelTier): ModelSpec | undefined =>
  [...MODELS].reverse().find((model) => model.tier <= tier);

export const modelById = (id: string): ModelSpec | undefined =>
  MODELS.find((model) => model.id === id);

/**
 * Bytes to keep, with room for the runtime's own caching.
 *
 * The download figure is what crosses the network; what a browser will
 * *store* is that plus the compiled artefacts, so the check that decides
 * whether to offer a model is deliberately not the download size.
 */
export const bytesNeeded = (model: ModelSpec): number =>
  Math.round(model.downloadMB * 1.2 * 1024 * 1024);
