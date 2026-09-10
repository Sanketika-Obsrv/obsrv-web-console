import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModelBanner, { ModelBannerProps } from './ModelBanner';
import { MODELS, ModelSpec } from './model/catalog';

const show = (props: Partial<ModelBannerProps> = {}) => {
  const onEnable = jest.fn();
  const onRemove = jest.fn();

  render(
    <ModelBanner
      ready={false}
      cached={[]}
      onEnable={onEnable}
      onRemove={onRemove}
      {...props}
    />,
  );

  return { onEnable, onRemove };
};

describe('offering the model', () => {
  it('states the download size up front', () => {
    show();

    expect(screen.getByText(/about 450 MB/i)).toBeInTheDocument();
  });

  /** It is an offer. Nothing here is required to use the assistant. */
  it('says everything works without it', () => {
    show();

    expect(screen.getByText(/works without it/i)).toBeInTheDocument();
  });

  it('enables on request', async () => {
    const { onEnable } = show();

    await userEvent.click(screen.getByRole('button', { name: /download/i }));

    expect(onEnable).toHaveBeenCalled();
  });

  /** A returning user must not be warned about a download that will not happen. */
  it('does not mention a download when the weights are cached', () => {
    show({ cached: [MODELS[0].id] });

    expect(screen.queryByText(/450 MB/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /use the model/i }),
    ).toBeInTheDocument();
  });
});

describe('while downloading', () => {
  it('shows what it is doing and how far along', () => {
    show({ progress: { progress: 0.42, text: 'Fetching weights' } });

    expect(screen.getByText('Fetching weights')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '42',
    );
  });

  it('copes with a report that carries no fraction', () => {
    show({ progress: { progress: 0, text: 'Starting' } });

    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });
});

describe('once the model is running', () => {
  it('says so, and offers a way out', async () => {
    const { onRemove } = show({ ready: true });

    expect(screen.getByText(/in-browser model/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /stop using/i }));

    expect(onRemove).toHaveBeenCalled();
  });
});

describe('when the model cannot run here', () => {
  it('gives the reason rather than a generic failure', () => {
    show({
      capability: {
        tier: 0,
        hasWebGPU: false,
        reason: 'This browser has no WebGPU, so the model cannot run.',
      },
    });

    expect(screen.getByText(/no WebGPU/i)).toBeInTheDocument();
  });

  it('offers no download when it could not run anyway', () => {
    show({ capability: { tier: 0, hasWebGPU: false, reason: 'No WebGPU.' } });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('reports a load failure without implying the assistant is broken', () => {
    show({ error: 'The model failed to load.' });

    expect(screen.getByRole('alert')).toHaveTextContent(/still works/i);
  });
});

/**
 * The larger model is an alternative, not an upgrade path the user is
 * pushed down: the small one stays the recommendation, and the bigger one
 * is only mentioned where there is actually room for it.
 */
describe('offering a larger model', () => {
  const larger = MODELS.find((model) => model.tier === 2) as ModelSpec;

  /**
   * The list is empty until capability detection returns, which is the state
   * the banner is first rendered in. Destructuring it blind threw, and a
   * component that throws during render takes the whole page with it. Found
   * in the browser, immediately.
   */
  it('renders before the browser has been asked what it can run', () => {
    show({ choices: [] });

    expect(
      screen.getByRole('button', { name: /download the model/i }),
    ).toBeInTheDocument();
  });

  it('says nothing about it when the browser has no room', () => {
    show({ choices: [MODELS[0]] });

    expect(screen.queryByText(new RegExp(larger.label, 'i'))).toBeNull();
  });

  it('offers it by name and size when there is room', () => {
    show({ choices: MODELS });

    expect(
      screen.getByRole('button', {
        name: new RegExp(`${larger.label}.*${larger.downloadMB} MB`, 'i'),
      }),
    ).toBeInTheDocument();
  });

  it('downloads the one that was asked for', async () => {
    const { onEnable } = show({ choices: MODELS });

    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(larger.label, 'i') }),
    );

    expect(onEnable).toHaveBeenCalledWith(larger);
  });

  it('keeps the small model as the plain choice', async () => {
    const { onEnable } = show({ choices: MODELS });

    await userEvent.click(
      screen.getByRole('button', { name: /^download the model$/i }),
    );

    expect(onEnable).toHaveBeenCalledWith(MODELS[0]);
  });

  /**
   * The bug this set was written for.
   *
   * "The model is already downloaded" is true of the small one and says
   * nothing about the large one, so the button beside it read as "switch to
   * the better model" when it meant "fetch another 1.1 GB". Every choice now
   * says which of the two it is.
   */
  it('says a download is a download, even when the other model is cached', () => {
    show({ cached: [MODELS[0].id], choices: MODELS });

    const button = screen.getByRole('button', {
      name: new RegExp(larger.label, 'i'),
    });

    expect(button).toHaveAccessibleName(
      new RegExp(`download.*${larger.downloadMB} MB`, 'i'),
    );
  });

  it('offers the larger model as a plain use once it is cached', () => {
    show({ cached: [larger.id], choices: MODELS });

    expect(
      screen.getByRole('button', {
        name: new RegExp(`use ${larger.label}`, 'i'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(new RegExp(`${larger.downloadMB} MB`)),
    ).toBeNull();
  });

  /** The small model needs the same honesty when only the large one is here. */
  it('says the small model needs downloading when only the large one is cached', () => {
    show({ cached: [larger.id], choices: MODELS });

    expect(
      screen.getByRole('button', { name: /download the model/i }),
    ).toBeInTheDocument();
  });
});
