/**
 * Loads the in-browser model, or reports honestly why it cannot.
 *
 * `@mlc-ai/web-llm` is imported **dynamically**, and that is not incidental:
 * the package is ~14 MB of library code, and most users of the console will
 * never open the assistant at all. A static import would put that in the main
 * bundle for everyone. The dynamic import keeps it in its own chunk, fetched
 * only when someone actually asks for the model. (The type-only import at the
 * top is erased at compile time and costs nothing; `engineWorker` imports the
 * library statically, but webpack bundles a worker entry separately, so that
 * copy is not in the main chunk either.)
 *
 * The weights themselves come from huggingface.co, which is worth knowing
 * before this ships: an air-gapped or egress-restricted deployment cannot
 * reach them, and would run at tier 0 permanently.
 */
import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { ModelSpec, REQUIRED_MODEL } from './catalog';
import { spawnEngineWorker } from './spawnEngineWorker';
import { Capability, detectCapability } from './tiers';

/**
 * The default, and what the ids and sizes now come from.
 *
 * Kept as named exports because the page and the banner still speak in one
 * model's terms; which model that is comes from `catalog`, whose figures are
 * checked against the installed package rather than written here.
 */
export const MODEL_ID = REQUIRED_MODEL.id;

/**
 * Roughly what the weights cost to fetch, for telling the user before they
 * agree to it. The model's own metadata reports 1,403 MB of *VRAM*, which is
 * a different number and not the one to quote at a download prompt.
 */
export const MODEL_DOWNLOAD_MB = REQUIRED_MODEL.downloadMB;

export interface LoadProgress {
  /** 0..1 where the library reports it. */
  progress: number;
  text: string;
}

export type EngineStatus =
  | { state: 'unavailable'; capability: Capability }
  | { state: 'idle'; capability: Capability; cached: boolean }
  | { state: 'loading'; progress: LoadProgress }
  | { state: 'ready' }
  | { state: 'failed'; error: string };

/** Minimal surface the assistant needs; keeps web-llm's types off callers. */
export interface ModelEngine {
  complete(prompt: string, responseFormat?: unknown): Promise<string>;
  unload(): Promise<void>;
  /**
   * Where the weights ended up. `loadEngine` always sets it; it is optional
   * so that a test needing nothing but `complete` can still hand over a
   * two-line fake.
   */
  readonly thread?: EngineThread;
}

/**
 * Which thread ran the model.
 *
 * Worth reporting rather than assuming: the worker is the intended path, and
 * `main` means the fallback fired, which is the difference between a
 * responsive composer and one that freezes while the model thinks.
 */
export type EngineThread = 'worker' | 'main';

/**
 * Whether the weights are already in this browser's cache.
 *
 * Asked before offering a download, so a returning user is not warned about
 * a ~450 MB fetch that will not happen.
 */
export const isModelCached = async (
  modelId: string = MODEL_ID,
): Promise<boolean> => {
  try {
    const { hasModelInCache } = await import('@mlc-ai/web-llm');
    return await hasModelInCache(modelId);
  } catch {
    return false;
  }
};

/** Removes the weights, so "stop using the model" can free the space. */
export const removeModel = async (
  modelId: string = MODEL_ID,
): Promise<void> => {
  const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm');
  await deleteModelAllInfoInCache(modelId);
};

export interface LoadOptions {
  onProgress?: (progress: LoadProgress) => void;
  /** Which model to load. Defaults to the one the assistant requires. */
  model?: ModelSpec;
}

/**
 * The assistant's surface over one of web-llm's engines.
 *
 * Written once because both engines implement `MLCEngineInterface`: the
 * worker engine is a proxy that posts the same calls across the boundary, so
 * `chat.completions.create` and `unload` read identically from here.
 *
 * `dispose` is how the worker gets cleaned up. `unload()` alone releases the
 * weights inside the worker but leaves the worker itself running, which is
 * the leak that was fixed once already — a page left with a gigabyte and a
 * half still resident.
 */
const wrapEngine = (
  engine: MLCEngineInterface,
  thread: EngineThread,
  dispose?: () => void,
): ModelEngine => ({
  thread,
  complete: async (prompt, responseFormat) => {
    const reply = await engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      // Constrained decoding: the action schema is the grammar, which is
      // what stops a 0.6B model inventing action shapes.
      ...(responseFormat ? { response_format: responseFormat as never } : {}),
    });

    return reply.choices[0]?.message?.content ?? '';
  },
  unload: async () => {
    try {
      await engine.unload();
    } finally {
      dispose?.();
    }
  },
});

/**
 * Loads the model, in a Web Worker.
 *
 * Off the main thread because a 1.7B model thinking is long enough to
 * notice: on the main thread the composer stopped answering keystrokes while
 * a turn was resolved. `WebWorkerMLCEngine` keeps the same interface and
 * forwards load progress back across the boundary, so the banner reports the
 * download exactly as before.
 *
 * The main thread stays as a fallback rather than being deleted. The model
 * is mandatory — no model, no conversation — so a browser extension, a
 * content-security policy or a deployment that mangles the worker chunk must
 * not be allowed to take the whole assistant down. There, inference runs
 * where it used to and only responsiveness suffers.
 */
export const loadEngine = async ({
  onProgress,
  model = REQUIRED_MODEL,
}: LoadOptions = {}): Promise<ModelEngine> => {
  const capability = await detectCapability();

  if (capability.tier === 0) {
    throw new Error(
      capability.reason ?? 'The model cannot run in this browser.',
    );
  }

  // Asked for a model this browser was not judged able to hold. Refused
  // rather than attempted: a failure here costs the user the whole download.
  if (model.tier > capability.tier) {
    throw new Error(
      `There is not enough room in this browser for ${model.label}.`,
    );
  }

  const { CreateMLCEngine, CreateWebWorkerMLCEngine } =
    await import('@mlc-ai/web-llm');

  const initProgressCallback = (report: { progress: number; text: string }) =>
    onProgress?.({ progress: report.progress, text: report.text });

  let worker: Worker | undefined;

  try {
    worker = spawnEngineWorker();
    const spawned = worker;
    const engine = await CreateWebWorkerMLCEngine(spawned, model.id, {
      initProgressCallback,
    });

    return wrapEngine(engine, 'worker', () => spawned.terminate());
  } catch {
    // Half-built: the worker exists but the engine inside it does not, so
    // nothing will ever collect it.
    worker?.terminate();
  }

  const engine = await CreateMLCEngine(model.id, { initProgressCallback });

  return wrapEngine(engine, 'main');
};
