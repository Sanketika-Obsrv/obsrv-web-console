/**
 * The worker the model actually runs in.
 *
 * Everything here executes off the main thread. `WebWorkerMLCEngineHandler`
 * holds a real `MLCEngine` and answers the messages `WebWorkerMLCEngine`
 * sends it from the page, including forwarding load progress back — so the
 * banner on the page keeps reporting the download without knowing where the
 * weights are being assembled.
 *
 * This is the one place `@mlc-ai/web-llm` is imported statically, and it is
 * safe to do so precisely *because* it is a worker entry: webpack gives the
 * worker its own bundle, so the library's ~14 MB stays out of the main chunk
 * exactly as the dynamic imports in `engineClient` used to ensure.
 */
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (event: MessageEvent) => {
  handler.onmessage(event);
};
