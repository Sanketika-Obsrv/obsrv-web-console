// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';

// Several suites wait on genuinely asynchronous work — FileReader, IndexedDB,
// a fetch-backed effect. Testing Library's default 1s budget is enough on an
// idle machine and not enough on a loaded one, which showed up as eight
// unrelated-looking failures when the full suite ran alongside a lint pass.
configure({ asyncUtilTimeout: 5000 });

// react-router 7 needs these at module scope; CRA's jsdom does not provide them.
global.TextEncoder =
  global.TextEncoder || (TextEncoder as unknown as typeof global.TextEncoder);
global.TextDecoder =
  global.TextDecoder || (TextDecoder as unknown as typeof global.TextDecoder);

// jsdom does not implement PointerEvent, so `fireEvent.pointerMove(...)` would
// drop clientX/clientY. MouseEvent carries the coordinates we need. Guarded on
// `window` so a suite that opts into the node environment can still run.
if (
  typeof window !== 'undefined' &&
  typeof window.PointerEvent === 'undefined'
) {
  class PointerEventShim extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? 'mouse';
      this.isPrimary = params.isPrimary ?? true;
    }
  }

  window.PointerEvent =
    PointerEventShim as unknown as typeof window.PointerEvent;
}

// jsdom has no canvas backend; lottie-web probes a 2d context at import time.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
    setTransform: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    closePath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
