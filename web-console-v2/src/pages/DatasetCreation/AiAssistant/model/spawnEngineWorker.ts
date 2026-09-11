/**
 * Starts the model's worker.
 *
 * Three lines in their own module for one reason: `import.meta.url` is what
 * tells webpack 5 to bundle `engineWorker` as a worker, and `import.meta` is
 * exactly what babel cannot compile when jest transforms this tree to
 * CommonJS. Isolated here, the file can be swapped for a stub through
 * `jest.moduleNameMapper` without touching anything that matters.
 *
 * No loader and no webpack config: `new Worker(new URL(…, import.meta.url))`
 * is parsed natively by the webpack 5 that react-scripts 5 ships.
 */
export const spawnEngineWorker = (): Worker =>
  new Worker(new URL('./engineWorker.ts', import.meta.url), {
    type: 'module',
  });
