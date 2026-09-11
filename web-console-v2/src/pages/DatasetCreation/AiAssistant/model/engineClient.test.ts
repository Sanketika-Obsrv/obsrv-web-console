/**
 * Where the model runs, and what happens when it cannot run there.
 *
 * The library and the worker are both faked: what is under test is the
 * choice of thread, the cleanup, and the refusals — not web-llm.
 */
jest.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: jest.fn(),
  CreateWebWorkerMLCEngine: jest.fn(),
}));

jest.mock('./tiers', () => ({
  detectCapability: jest.fn(async () => ({ tier: 2, hasWebGPU: true })),
}));

jest.mock('./spawnEngineWorker', () => ({
  spawnEngineWorker: jest.fn(),
}));

import { REQUIRED_MODEL } from './catalog';
import { loadEngine } from './engineClient';
import { spawnEngineWorker } from './spawnEngineWorker';
import { detectCapability } from './tiers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const webllm = jest.requireMock('@mlc-ai/web-llm') as any;
const createWorkerEngine = webllm.CreateWebWorkerMLCEngine as jest.Mock;
const createMainEngine = webllm.CreateMLCEngine as jest.Mock;
const detect = detectCapability as jest.Mock;
const spawn = spawnEngineWorker as jest.Mock;

/** Enough of `MLCEngineInterface` for the wrapper to work against. */
const fakeEngine = (reply = 'an answer') => ({
  chat: {
    completions: {
      create: jest.fn(async () => ({
        choices: [{ message: { content: reply } }],
      })),
    },
  },
  unload: jest.fn(async () => undefined),
});

const fakeWorker = () => ({ terminate: jest.fn() });

let worker: ReturnType<typeof fakeWorker>;

beforeEach(() => {
  jest.clearAllMocks();
  detect.mockResolvedValue({ tier: 2, hasWebGPU: true });
  worker = fakeWorker();
  spawn.mockReturnValue(worker);
});

describe('loading the model', () => {
  it('runs it in a worker', async () => {
    const engine = fakeEngine();
    createWorkerEngine.mockResolvedValue(engine);

    const loaded = await loadEngine();

    expect(loaded.thread).toBe('worker');
    expect(createMainEngine).not.toHaveBeenCalled();
    expect(createWorkerEngine).toHaveBeenCalledWith(
      worker,
      REQUIRED_MODEL.id,
      expect.objectContaining({
        initProgressCallback: expect.any(Function),
      }),
    );
    await expect(loaded.complete('anything')).resolves.toBe('an answer');
  });

  it('reports the download while the worker assembles it', async () => {
    createWorkerEngine.mockResolvedValue(fakeEngine());
    const onProgress = jest.fn();

    await loadEngine({ onProgress });

    const { initProgressCallback } = createWorkerEngine.mock.calls[0][2];
    initProgressCallback({ progress: 0.5, text: 'Fetching param 3/5' });

    expect(onProgress).toHaveBeenCalledWith({
      progress: 0.5,
      text: 'Fetching param 3/5',
    });
  });

  it('passes the action schema through as the decoding grammar', async () => {
    const engine = fakeEngine();
    createWorkerEngine.mockResolvedValue(engine);

    const loaded = await loadEngine();
    await loaded.complete('do a thing', { type: 'json_object' });

    expect(engine.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({ response_format: { type: 'json_object' } }),
    );
  });
});

describe('letting the model go', () => {
  it('releases the weights and terminates the worker', async () => {
    const engine = fakeEngine();
    createWorkerEngine.mockResolvedValue(engine);

    const loaded = await loadEngine();
    await loaded.unload();

    expect(engine.unload).toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('terminates the worker even when unloading fails', async () => {
    const engine = fakeEngine();
    engine.unload.mockRejectedValue(new Error('gpu gone'));
    createWorkerEngine.mockResolvedValue(engine);

    const loaded = await loadEngine();
    await expect(loaded.unload()).rejects.toThrow('gpu gone');

    expect(worker.terminate).toHaveBeenCalled();
  });
});

describe('when the worker cannot be used', () => {
  it('falls back to the main thread', async () => {
    createWorkerEngine.mockRejectedValue(new Error('blocked by policy'));
    createMainEngine.mockResolvedValue(fakeEngine('still working'));

    const loaded = await loadEngine();

    expect(loaded.thread).toBe('main');
    expect(createMainEngine).toHaveBeenCalledWith(
      REQUIRED_MODEL.id,
      expect.objectContaining({
        initProgressCallback: expect.any(Function),
      }),
    );
    await expect(loaded.complete('anything')).resolves.toBe('still working');
  });

  it('does not leave the half-built worker running', async () => {
    createWorkerEngine.mockRejectedValue(new Error('blocked by policy'));
    createMainEngine.mockResolvedValue(fakeEngine());

    await loadEngine();

    expect(worker.terminate).toHaveBeenCalled();
  });

  it('falls back when the worker cannot even be spawned', async () => {
    spawn.mockImplementation(() => {
      throw new Error('Worker is not defined');
    });
    createMainEngine.mockResolvedValue(fakeEngine());

    const loaded = await loadEngine();

    expect(loaded.thread).toBe('main');
    expect(createWorkerEngine).not.toHaveBeenCalled();
  });
});

describe('a browser that cannot run it at all', () => {
  it('is refused before anything is fetched', async () => {
    detect.mockResolvedValue({
      tier: 0,
      hasWebGPU: false,
      reason: 'This browser has no WebGPU.',
    });

    await expect(loadEngine()).rejects.toThrow('This browser has no WebGPU.');
    expect(spawn).not.toHaveBeenCalled();
    expect(createWorkerEngine).not.toHaveBeenCalled();
    expect(createMainEngine).not.toHaveBeenCalled();
  });

  it('is refused when there is no room for the model it was asked for', async () => {
    detect.mockResolvedValue({ tier: 1, hasWebGPU: true });

    await expect(loadEngine()).rejects.toThrow(
      `There is not enough room in this browser for ${REQUIRED_MODEL.label}`,
    );
    expect(createWorkerEngine).not.toHaveBeenCalled();
  });
});
