// monaco-editor's `typings` points at a file it doesn't ship; its types sit behind `exports`, which `moduleResolution: node` ignores.
declare module 'monaco-editor' {
  export * from 'monaco-editor/esm/vs/index';
}
