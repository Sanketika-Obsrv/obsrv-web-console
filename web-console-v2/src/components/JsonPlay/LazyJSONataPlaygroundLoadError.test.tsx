import { fireEvent, render, screen } from '@testing-library/react';
import LazyJSONataPlayground from './LazyJSONataPlayground';

let mockFailLoad = true;

jest.mock('react-lottie', () => () => null);
jest.mock('./JSONataPlayground', () => {
  if (mockFailLoad) throw new Error('ChunkLoadError');
  return { __esModule: true, default: () => <div>playground ready</div> };
});

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

test('a failed load offers Try again and Close instead of crashing', async () => {
  render(<LazyJSONataPlayground closeTransformations={jest.fn()} />);

  expect(
    await screen.findByText("Couldn't load the JSONata editor."),
  ).toBeInTheDocument();
  expect(screen.queryByText(/check your connection/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
});

test('Close calls the parent close handler', async () => {
  const close = jest.fn();
  render(<LazyJSONataPlayground closeTransformations={close} />);

  fireEvent.click(await screen.findByRole('button', { name: 'Close' }));

  expect(close).toHaveBeenCalledTimes(1);
});

test('Try again loads the playground without reloading the page', async () => {
  render(<LazyJSONataPlayground closeTransformations={jest.fn()} />);
  await screen.findByRole('button', { name: 'Try again' });

  mockFailLoad = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByText('playground ready')).toBeInTheDocument();
});
