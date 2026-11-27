import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { getWorker } from './monacoWorkers';
import './monacoSetup';

jest.mock('@monaco-editor/react', () => ({ loader: { config: jest.fn() } }));
jest.mock('monaco-editor', () => ({ editor: {} }));
jest.mock('./monacoWorkers', () => ({ getWorker: jest.fn() }));

// CRA's resetMocks clears calls before each test, so capture the import-time ones.
const configCalls = [...(loader.config as jest.Mock).mock.calls];

test('points the Monaco loader at the bundled monaco-editor, not the CDN', () => {
  expect(configCalls).toEqual([[{ monaco }]]);
  expect(configCalls[0][0].monaco).toBe(monaco);
});

test('registers the bundled worker factory with Monaco', () => {
  expect(window.MonacoEnvironment?.getWorker).toBe(getWorker);
});
