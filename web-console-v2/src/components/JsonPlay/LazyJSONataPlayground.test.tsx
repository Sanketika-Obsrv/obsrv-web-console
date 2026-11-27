import { render, screen } from '@testing-library/react';
import LazyJSONataPlayground from './LazyJSONataPlayground';

jest.mock('react-lottie', () => () => null);
jest.mock('./JSONataPlayground', () => ({
  __esModule: true,
  default: () => <div>playground ready</div>,
}));

test('renders the playground once its chunk has loaded', async () => {
  render(<LazyJSONataPlayground />);

  expect(await screen.findByText('playground ready')).toBeInTheDocument();
});
