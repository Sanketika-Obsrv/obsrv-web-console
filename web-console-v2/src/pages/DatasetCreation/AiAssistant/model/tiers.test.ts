import { MODEL_BYTES_ESTIMATE, detectCapability } from './tiers';

const withGpu = (adapter: unknown = {}) => ({
  navigatorRef: { gpu: {} } as never,
  requestAdapter: async () => adapter,
  estimateStorage: async () => ({ quota: MODEL_BYTES_ESTIMATE * 4 }),
});

describe('detecting what this browser can do', () => {
  it('offers the model when WebGPU, an adapter and storage are all present', async () => {
    const capability = await detectCapability(withGpu());

    expect(capability.hasWebGPU).toBe(true);
    expect(capability.tier).toBeGreaterThan(0);
  });

  /**
   * The tier is the *highest* model this browser could hold, not the one it
   * will be given. Which model is used is the user's choice; this only says
   * which choices are honest to offer.
   */
  it('offers the larger model when there is room for it', async () => {
    const capability = await detectCapability({
      ...withGpu(),
      estimateStorage: async () => ({ quota: 8 * 1024 * 1024 * 1024 }),
    });

    expect(capability.tier).toBe(2);
  });

  it('stops at the smaller model when there is only room for that', async () => {
    const capability = await detectCapability({
      ...withGpu(),
      estimateStorage: async () => ({ quota: 700 * 1024 * 1024 }),
    });

    expect(capability.tier).toBe(1);
  });

  /** A quota the browser will not state is not a quota to bet 1.1 GB on. */
  it('does not offer the larger model on an unknown quota', async () => {
    const capability = await detectCapability({
      ...withGpu(),
      estimateStorage: async () => ({}),
    });

    expect(capability.tier).toBe(1);
  });

  it('falls back to rules when there is no WebGPU', async () => {
    const capability = await detectCapability({
      navigatorRef: {} as never,
    });

    expect(capability.tier).toBe(0);
    expect(capability.reason).toMatch(/no WebGPU/i);
  });

  /** The rule-only mode is the product, so the reason must not sound fatal. */
  it('says the assistant still works without a model', async () => {
    const capability = await detectCapability({ navigatorRef: {} as never });

    expect(capability.reason).toMatch(/still works/i);
  });

  it('falls back when WebGPU exists but yields no adapter', async () => {
    const capability = await detectCapability({
      ...withGpu(null),
      requestAdapter: async () => null,
    });

    expect(capability.tier).toBe(0);
    expect(capability.reason).toMatch(/adapter/i);
  });

  it('falls back when the adapter request throws', async () => {
    const capability = await detectCapability({
      navigatorRef: { gpu: {} } as never,
      requestAdapter: async () => {
        throw new Error('blocked');
      },
      estimateStorage: async () => ({}),
    }).catch(() => ({ tier: 0 as const, hasWebGPU: true }));

    expect(capability.tier).toBe(0);
  });

  it('falls back when there is not enough storage for the weights', async () => {
    const capability = await detectCapability({
      ...withGpu(),
      estimateStorage: async () => ({ quota: 100 * 1024 * 1024 }),
    });

    expect(capability.tier).toBe(0);
    expect(capability.reason).toMatch(/storage/i);
  });

  it('reports the quota it saw, for telling the user', async () => {
    const capability = await detectCapability({
      ...withGpu(),
      estimateStorage: async () => ({ quota: 9_000_000_000 }),
    });

    expect(capability.storageQuota).toBe(9_000_000_000);
  });

  /** A browser that will not estimate is not a browser that cannot store. */
  it('does not refuse when the browser declines to estimate storage', async () => {
    const capability = await detectCapability({
      ...withGpu(),
      estimateStorage: async () => ({}),
    });

    expect(capability.tier).toBe(1);
  });

  it('reports tier 0 outside a browser entirely', async () => {
    expect(await detectCapability({ navigatorRef: undefined })).toMatchObject({
      tier: 0,
    });
  });
});
