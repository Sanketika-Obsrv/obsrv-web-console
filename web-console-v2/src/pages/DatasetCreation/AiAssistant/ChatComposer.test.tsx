import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatComposer from './ChatComposer';

const show = (props: Partial<Parameters<typeof ChatComposer>[0]> = {}) => {
  const onSend = jest.fn();
  render(<ChatComposer onSend={onSend} busy={false} {...props} />);
  return { onSend };
};

const box = () => screen.getByRole('textbox', { name: /message/i });

describe('sending', () => {
  it('sends what was typed', async () => {
    const { onSend } = show();

    await userEvent.type(box(), 'make order_id required');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith('make order_id required');
  });

  it('sends on Enter, since that is what a chat box does', async () => {
    const { onSend } = show();

    await userEvent.type(box(), 'save it{Enter}');

    expect(onSend).toHaveBeenCalledWith('save it');
  });

  it('does not send on Shift+Enter, so a long instruction can be written', async () => {
    const { onSend } = show();

    await userEvent.type(box(), 'first line{Shift>}{Enter}{/Shift}second');

    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears the box after sending', async () => {
    show();

    await userEvent.type(box(), 'save it{Enter}');

    expect(box()).toHaveValue('');
  });

  it('trims what it sends', async () => {
    const { onSend } = show();

    await userEvent.type(box(), '   save it   {Enter}');

    expect(onSend).toHaveBeenCalledWith('save it');
  });

  it('cannot be sent from an empty box', () => {
    show();

    // Asserting the disabled state rather than clicking it: a disabled MUI
    // button has `pointer-events: none`, so a click cannot land at all.
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('sends nothing for whitespace alone', async () => {
    const { onSend } = show();

    await userEvent.type(box(), '    {Enter}');

    expect(onSend).not.toHaveBeenCalled();
  });
});

/**
 * A turn writes to the dataset, so a second send while one is in flight would
 * race two read-modify-writes against each other.
 */
describe('while a turn is running', () => {
  it('refuses to send again', async () => {
    const { onSend } = show({ busy: true });

    await userEvent.type(box(), 'save it{Enter}');

    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables the send button', () => {
    show({ busy: true });

    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('says that it is working', () => {
    show({ busy: true });

    expect(screen.getByRole('status')).toHaveTextContent(/working/i);
  });

  it('keeps what was typed, rather than discarding it', async () => {
    const { rerender } = render(
      <ChatComposer onSend={jest.fn()} busy={false} />,
    );

    await userEvent.type(box(), 'half an instruction');
    rerender(<ChatComposer onSend={jest.fn()} busy />);

    expect(box()).toHaveValue('half an instruction');
  });
});

describe('suggestions', () => {
  it('offers the examples it is given as one-click chips', async () => {
    const { onSend } = show({
      suggestions: ['make order_id required', 'enable the real-time store'],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'make order_id required' }),
    );

    expect(onSend).toHaveBeenCalledWith('make order_id required');
  });

  it('offers nothing when there is nothing to suggest', () => {
    show({ suggestions: [] });

    expect(
      screen.queryByRole('button', { name: /make order_id/ }),
    ).not.toBeInTheDocument();
  });

  it('hides the suggestions while a turn is running', () => {
    show({ suggestions: ['save it'], busy: true });

    expect(
      screen.queryByRole('button', { name: 'save it' }),
    ).not.toBeInTheDocument();
  });
});
