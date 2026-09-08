/**
 * Which tier of assistance this browser can actually provide.
 *
 * The tiers exist because the rule-only mode is a first-class product, not a
 * degradation: a browser with no WebGPU still gets the full workflow through
 * cards and the rule resolver. So this module's job is to answer "may we
 * offer the model?" honestly, and never to block the assistant.
 */

/** 0 = rules only, 1 = the small model, 2 = a larger one if it ever ships. */
export type ModelTier = 0 | 1 | 2 | 3;

export interface Capability {
  tier: ModelTier;
  hasWebGPU: boolean;
  /** Bytes the origin may store, when the browser will say. */
  storageQuota?: number;
  /** Why the model is unavailable, for telling the user rather than guessing. */
  reason?: string;
}

/** Rough headroom needed for `Qwen3-0.6B-q4f16_1-MLC`, from its own metadata. */
export const MODEL_VRAM_MB = 1404;

/** The weights are a little over this; the quota check wants a margin. */
export const MODEL_BYTES_ESTIMATE = 450 * 1024 * 1024;

export interface DetectOptions {
  /** Injected for testing; defaults to the real `navigator`. */
  navigatorRef?: Partial<Navigator> & { gpu?: unknown };
  requestAdapter?: () => Promise<unknown>;
  estimateStorage?: () => Promise<{ quota?: number; usage?: number }>;
}

/**
 * Detects what this browser can do, without downloading anything.
 *
 * Deliberately conservative: any doubt resolves to tier 0, because offering a
 * model that then fails to load is worse than not offering it.
 */
export const detectCapability = async ({
  navigatorRef,
  requestAdapter,
  estimateStorage,
}: DetectOptions = {}): Promise<Capability> => {
  const nav =
    navigatorRef ?? (typeof navigator === 'undefined' ? undefined : navigator);

  if (!nav) {
    return { tier: 0, hasWebGPU: false, reason: 'No browser environment.' };
  }

  const hasWebGPU = 'gpu' in nav && Boolean((nav as { gpu?: unknown }).gpu);

  if (!hasWebGPU) {
    return {
      tier: 0,
      hasWebGPU: false,
      reason:
        'This browser has no WebGPU, so the in-browser model cannot run. Everything still works without it.',
    };
  }

  const adapter = await (requestAdapter
    ? requestAdapter()
    : (nav as { gpu: { requestAdapter(): Promise<unknown> } }).gpu
        .requestAdapter()
        .catch(() => null));

  if (!adapter) {
    return {
      tier: 0,
      hasWebGPU: true,
      reason:
        'WebGPU is present but no adapter is available, so the model cannot run here.',
    };
  }

  const estimate: { quota?: number; usage?: number } = await (estimateStorage
    ? estimateStorage()
    : (nav.storage?.estimate?.() ?? Promise.resolve({})));

  const { quota } = estimate;

  if (quota !== undefined && quota < MODEL_BYTES_ESTIMATE) {
    return {
      tier: 0,
      hasWebGPU: true,
      storageQuota: quota,
      reason:
        'There is not enough storage left in this browser to keep the model.',
    };
  }

  return { tier: 1, hasWebGPU: true, storageQuota: quota };
};
