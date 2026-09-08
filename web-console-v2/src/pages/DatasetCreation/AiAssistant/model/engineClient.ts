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
import { Capability, detectCapability } from './tiers';

/** Confirmed present in `prebuiltAppConfig` at 0.2.85. */
export const MODEL_ID = 'Qwen3-0.6B-q4f16_1-MLC';

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
export const isModelCached = async (): Promise<boolean> => {
  try {
    const { hasModelInCache } = await import('@mlc-ai/web-llm');
    return await hasModelInCache(MODEL_ID);
  } catch {
    return false;
  }
};

/** Removes the weights, so "stop using the model" can free the space. */
export const removeModel = async (): Promise<void> => {
  const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm');
  await deleteModelAllInfoInCache(MODEL_ID);
};

export interface LoadOptions {
  onProgress?: (progress: LoadProgress) => void;
}

/**
 * Loads the model in a Web Worker.
 *
 * The worker matters: inference on the main thread would freeze the console
 * while the assistant thinks, which for a 0.6B model is long enough to notice.
 */
export const loadEngine = async ({
  onProgress,
}: LoadOptions = {}): Promise<ModelEngine> => {
  const capability = await detectCapability();

  if (capability.tier === 0) {
    throw new Error(
      capability.reason ?? 'The model cannot run in this browser.',
    );
  }

  const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

  const engine = await CreateMLCEngine(MODEL_ID, {
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
