import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Bundled Monaco instead of the loader's jsdelivr default; see docs/adr/0002-bundle-monaco.md.
window.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case 'json':
        return new Worker(
          new URL(
            'monaco-editor/esm/vs/language/json/json.worker',
            import.meta.url,
          ),
        );
      case 'css':
      case 'scss':
      case 'less':
        return new Worker(
          new URL(
            'monaco-editor/esm/vs/language/css/css.worker',
            import.meta.url,
          ),
        );
      case 'html':
      case 'handlebars':
      case 'razor':
        return new Worker(
          new URL(
            'monaco-editor/esm/vs/language/html/html.worker',
            import.meta.url,
          ),
        );
      case 'typescript':
      case 'javascript':
        return new Worker(
          new URL(
            'monaco-editor/esm/vs/language/typescript/ts.worker',
            import.meta.url,
          ),
        );
      default:
        return new Worker(
          new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url),
        );
    }
  },
};

loader.config({ monaco });
