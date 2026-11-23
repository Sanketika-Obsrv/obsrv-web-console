import { render, screen } from '@testing-library/react';
import LazyJSONataPlayground from './LazyJSONataPlayground';

jest.mock('react-lottie', () => () => null);
jest.mock('./JSONataPlayground', () => {
  throw new Error('ChunkLoadError');
});

test('shows a reload message instead of crashing when the chunk fails to load', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);

  render(<LazyJSONataPlayground />);

  expect(
    await screen.findByText(/Couldn't load the JSONata editor/),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
});
