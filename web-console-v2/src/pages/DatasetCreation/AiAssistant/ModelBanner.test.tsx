import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModelBanner from './ModelBanner';
import { REQUIRED_MODEL } from './model/catalog';

const show = (props: Partial<Parameters<typeof ModelBanner>[0]> = {}) => {
  const onRetry = jest.fn();
  render(
    <ModelBanner ready={false} cached={false} onRetry={onRetry} {...props} />,
  );
  return { onRetry };
};

/**
 * The model is not optional any more. Instructions are typed, so
 * understanding loose phrasing is the product rather than an extra, and the
 * banner's job changed with it: it used to offer the model and promise
 * everything worked without it. Now it reports a load the user did not ask
 * for and cannot decline, which makes saying what is happening — and how
 * big it is — the whole point.
 */
describe('while the model loads', () => {
  it('says what is being fetched and how big it is', () => {
    show({ progress: { progress: 0.4, text: 'Fetching param cache' } });

    expect(
      screen.getByText(new RegExp(REQUIRED_MODEL.label)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(String(REQUIRED_MODEL.downloadMB))),
    ).toBeInTheDocument();
  });

  it('reports progress for assistive technology too', () => {
    show({ progress: { progress: 0.4, text: 'Fetching param cache' } });

    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '40',
    );
  });

  it('says the download happens once', () => {
    show({ progress: { progress: 0.1, text: 'Fetching' } });

    expect(screen.getByText(/first time|once/i)).toBeInTheDocument();
  });

  it('does not warn about a download that will not happen', () => {
    show({ cached: true, progress: { progress: 0.1, text: 'Loading' } });

    expect(
      screen.queryByText(new RegExp(`${REQUIRED_MODEL.downloadMB} MB`)),
    ).not.toBeInTheDocument();
  });

  it('says something even before the first progress report', () => {
    show();

    expect(
      screen.getAllByText(/starting|loading|preparing/i).length,
    ).toBeGreaterThan(0);
  });
});

describe('once the model is running', () => {
  it('stays out of the way', () => {
    const { container } = render(
      <ModelBanner ready cached onRetry={jest.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('when the model cannot load', () => {
  const noWebGpu = 'This browser has no WebGPU, so the model cannot run here.';

  it('gives the reason rather than a generic failure', () => {
    show({ error: noWebGpu });

    expect(screen.getByRole('alert')).toHaveTextContent(/WebGPU/);
  });

  /** The wizard is the way out, and the preview pane carries the link. */
  it('points at the wizard', () => {
    show({ error: noWebGpu });

    expect(screen.getByRole('alert')).toHaveTextContent(/wizard/i);
  });

  it('offers to try again, since a download can simply fail', async () => {
    const { onRetry } = show({ error: 'The download stopped halfway.' });

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(onRetry).toHaveBeenCalled();
  });

  it('does not claim the assistant works without it', () => {
    show({ error: noWebGpu });

    expect(screen.getByRole('alert')).not.toHaveTextContent(
      /works without it/i,
    );
  });
});
