/**
 * Loads the in-browser model, or reports honestly why it cannot.
 *
 * `@mlc-ai/web-llm` is imported **dynamically**, and that is not incidental:
 * the package is ~14 MB of library code, and most users of the console will
 * never open the assistant at all. A static import would put that in the main
 * bundle for everyone. The dynamic import keeps it in its own chunk, fetched
 * only when someone actually asks for the model.
 *
 * The weights themselves come from huggingface.co, which is worth knowing
 * before this ships: an air-gapped or egress-restricted deployment cannot
 * reach them, and would run at tier 0 permanently.
 */
import { DEFAULT_MODEL, ModelSpec } from './catalog';
import { Capability, detectCapability } from './tiers';

/**
 * The default, and what the ids and sizes now come from.
 *
 * Kept as named exports because the page and the banner still speak in one
 * model's terms; which model that is comes from `catalog`, whose figures are
 * checked against the installed package rather than written here.
 */
export const MODEL_ID = DEFAULT_MODEL.id;

/**
 * Roughly what the weights cost to fetch, for telling the user before they
 * agree to it. The model's own metadata reports 1,403 MB of *VRAM*, which is
 * a different number and not the one to quote at a download prompt.
 */
export const MODEL_DOWNLOAD_MB = DEFAULT_MODEL.downloadMB;

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
}

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
  /** Which model to load. Defaults to the small one. */
  model?: ModelSpec;
}

/**
 * Loads the model in a Web Worker.
 *
 * The worker matters: inference on the main thread would freeze the console
 * while the assistant thinks, which for a 0.6B model is long enough to notice.
 */
export const loadEngine = async ({
  onProgress,
  model = DEFAULT_MODEL,
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

  const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

  const engine = await CreateMLCEngine(model.id, {
    initProgressCallback: (report) =>
      onProgress?.({ progress: report.progress, text: report.text }),
  });

  return {
    complete: async (prompt, responseFormat) => {
      const reply = await engine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        // Constrained decoding: the action schema is the grammar, which is
        // what stops a 0.6B model inventing action shapes.
        ...(responseFormat ? { response_format: responseFormat as never } : {}),
      });

      return reply.choices[0]?.message?.content ?? '';
    },
    unload: () => engine.unload(),
  };
};
