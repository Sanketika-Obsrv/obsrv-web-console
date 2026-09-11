/**
 * What `spawnEngineWorker` becomes under jest.
 *
 * jsdom has no `Worker` and babel-jest cannot compile `import.meta.url`, so
 * the real module is mapped to this one for every suite (see
 * `jest.moduleNameMapper` in package.json). The object is only ever handed
 * to a mocked `CreateWebWorkerMLCEngine`, so it needs the shape of a worker
 * and none of the behaviour.
 */
export const spawnEngineWorker = (): Worker =>
  ({
    postMessage: () => undefined,
    terminate: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    dispatchEvent: () => false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any as Worker;
