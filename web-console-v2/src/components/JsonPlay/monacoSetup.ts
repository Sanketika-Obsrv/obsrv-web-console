import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { getWorker } from './monacoWorkers';

// Bundled Monaco instead of the loader's jsdelivr default; see docs/adr/0002-bundle-monaco.md.
window.MonacoEnvironment = { getWorker };

loader.config({ monaco });
