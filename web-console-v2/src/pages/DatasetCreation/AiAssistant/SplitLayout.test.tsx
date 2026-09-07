import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SplitLayout from './SplitLayout';

const renderLayout = (
  props: Partial<React.ComponentProps<typeof SplitLayout>> = {},
) =>
  render(
    <SplitLayout
      leftLabel="Chat"
      rightLabel="Preview"
      left={<p>chat body</p>}
      right={<p>preview body</p>}
      {...props}
    />,
  );

/** jsdom reports zero-width elements; pointer maths needs a real box. */
const stubContainerWidth = (width = 1000, left = 0) => {
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 800,
    left,
    right: left + width,
    top: 0,
    bottom: 800,
    x: left,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('panes', () => {
  it('renders both panes with their accessible names and content', () => {
    renderLayout();

    expect(screen.getByRole('region', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getByText('chat body')).toBeInTheDocument();
    expect(screen.getByText('preview body')).toBeInTheDocument();
  });
});

describe('separator', () => {
  it('is a focusable vertical separator carrying the current split', () => {
    renderLayout({
      initialLeftPercent: 40,
      minLeftPercent: 20,
      maxLeftPercent: 70,
    });

    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(separator).toHaveAttribute('aria-valuenow', '40');
    expect(separator).toHaveAttribute('aria-valuemin', '20');
    expect(separator).toHaveAttribute('aria-valuemax', '70');
    expect(separator).toHaveAttribute('tabindex', '0');
  });

  it('widens the left pane on ArrowRight and narrows it on ArrowLeft', () => {
    renderLayout({ initialLeftPercent: 40 });

    const separator = screen.getByRole('separator');

    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(separator).toHaveAttribute('aria-valuenow', '42');

    fireEvent.keyDown(separator, { key: 'ArrowLeft' });
    fireEvent.keyDown(separator, { key: 'ArrowLeft' });
    expect(separator).toHaveAttribute('aria-valuenow', '38');
  });

  it('clamps to the configured bounds', () => {
    renderLayout({
      initialLeftPercent: 40,
      minLeftPercent: 30,
      maxLeftPercent: 50,
    });

    const separator = screen.getByRole('separator');

    fireEvent.keyDown(separator, { key: 'End' });
    expect(separator).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(separator).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(separator, { key: 'Home' });
    expect(separator).toHaveAttribute('aria-valuenow', '30');

    fireEvent.keyDown(separator, { key: 'ArrowLeft' });
    expect(separator).toHaveAttribute('aria-valuenow', '30');
  });

  it('resizes while dragging and stops once the pointer is released', () => {
    stubContainerWidth(1000);
    renderLayout({
      initialLeftPercent: 40,
      minLeftPercent: 20,
      maxLeftPercent: 80,
    });

    const separator = screen.getByRole('separator');

    fireEvent.pointerDown(separator, { clientX: 400 });
    fireEvent.pointerMove(window, { clientX: 600 });
    expect(separator).toHaveAttribute('aria-valuenow', '60');

    fireEvent.pointerUp(window, { clientX: 600 });
    fireEvent.pointerMove(window, { clientX: 300 });
    expect(separator).toHaveAttribute('aria-valuenow', '60');
  });

  it('clamps a drag that overshoots the bounds', () => {
    stubContainerWidth(1000);
    renderLayout({
      initialLeftPercent: 40,
      minLeftPercent: 25,
      maxLeftPercent: 70,
    });

    const separator = screen.getByRole('separator');

    fireEvent.pointerDown(separator, { clientX: 400 });
    fireEvent.pointerMove(window, { clientX: 990 });
    expect(separator).toHaveAttribute('aria-valuenow', '70');

    fireEvent.pointerMove(window, { clientX: 10 });
    expect(separator).toHaveAttribute('aria-valuenow', '25');
  });

  it('applies the split to the pane widths', () => {
    renderLayout({ initialLeftPercent: 35 });

    expect(screen.getByRole('region', { name: 'Chat' })).toHaveStyle({
      width: '35%',
    });
    expect(screen.getByRole('region', { name: 'Preview' })).toHaveStyle({
      width: '65%',
    });
  });
});
