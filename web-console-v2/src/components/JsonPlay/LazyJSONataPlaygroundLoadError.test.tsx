import type * as RTL from '@testing-library/react';
import type LazyJSONataPlaygroundType from './LazyJSONataPlayground';

let mockLoad: 'chunk-error' | 'render-error' | 'ok';

jest.mock('react-lottie', () => () => null);
jest.mock('./JSONataPlayground', () => {
  if (mockLoad === 'chunk-error') {
    const error = new Error('Loading chunk 42 failed.');
    error.name = 'ChunkLoadError';
    throw error;
  }
  return {
    __esModule: true,
    default: () => {
      if (mockLoad === 'render-error') throw new Error('editor crashed');
      return <div>playground ready</div>;
    },
  };
});

// resetModules drops the cached playground; RTL is re-required to share its React, so clean up by hand.
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';

let rtl: typeof RTL;
let LazyJSONataPlayground: typeof LazyJSONataPlaygroundType;

beforeEach(() => {
  jest.resetModules();
  mockLoad = 'chunk-error';
  rtl = jest.requireActual('@testing-library/react');
  LazyJSONataPlayground = jest.requireActual('./LazyJSONataPlayground').default;
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  rtl.cleanup();
});

test('a failed load offers Try again and Close instead of crashing', async () => {
  const { render, screen } = rtl;
  render(<LazyJSONataPlayground closeTransformations={jest.fn()} />);

  expect(
    await screen.findByText("Couldn't load the JSONata editor."),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
});

test('Close calls the parent close handler', async () => {
  const { fireEvent, render, screen } = rtl;
  const close = jest.fn();
  render(<LazyJSONataPlayground closeTransformations={close} />);

  fireEvent.click(await screen.findByRole('button', { name: 'Close' }));

  expect(close).toHaveBeenCalledTimes(1);
});

test('Try again loads the playground without reloading the page', async () => {
  const { fireEvent, render, screen } = rtl;
  render(<LazyJSONataPlayground closeTransformations={jest.fn()} />);
  await screen.findByRole('button', { name: 'Try again' });

  mockLoad = 'ok';
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByText('playground ready')).toBeInTheDocument();
});

test('an error inside the loaded editor shows a generic message, not the load failure', async () => {
  const { render, screen } = rtl;
  mockLoad = 'render-error';
  render(<LazyJSONataPlayground closeTransformations={jest.fn()} />);

  expect(
    await screen.findByText('Something went wrong in the JSONata editor.'),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Couldn't load the JSONata editor."),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Try again' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
});
