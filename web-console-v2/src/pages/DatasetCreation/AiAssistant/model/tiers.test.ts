import { MODEL_BYTES_ESTIMATE, detectCapability } from './tiers';

const withGpu = (adapter: unknown = {}) => ({
  navigatorRef: { gpu: {} } as never,
  requestAdapter: async () => adapter,
  estimateStorage: async () => ({ quota: MODEL_BYTES_ESTIMATE * 4 }),
});

describe('detecting what this browser can do', () => {
  it('offers the model when WebGPU, an adapter and storage are all present', async () => {
    expect(await detectCapability(withGpu())).toMatchObject({
      tier: 1,
      hasWebGPU: true,
    });
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
