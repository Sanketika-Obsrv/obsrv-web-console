/**
 * jsdom reports zero for every layout property, so the element is a plain
 * object with the three numbers the hook reads. That is enough: what is
 * under test is when it decides to follow, not how a browser lays out.
 */
import { act, renderHook } from '@testing-library/react';
import { useStickToBottom } from './useStickToBottom';

const scroller = (overrides: Partial<HTMLElement> = {}) =>
  ({
    scrollTop: 0,
    scrollHeight: 1000,
    clientHeight: 400,
    ...overrides,
  }) as HTMLElement;

describe('following the newest message', () => {
  it('scrolls to the bottom when something arrives', () => {
    const node = scroller({ scrollTop: 600 });
    const { result, rerender } = renderHook(
      ({ key }) => useStickToBottom(key),
      {
        initialProps: { key: '1:a' },
      },
    );

    act(() => result.current.ref(node));
    rerender({ key: '2:b' });

    expect(node.scrollTop).toBe(node.scrollHeight);
  });

  it('does nothing before there is an element', () => {
    const { rerender } = renderHook(({ key }) => useStickToBottom(key), {
      initialProps: { key: '1:a' },
    });

    expect(() => rerender({ key: '2:b' })).not.toThrow();
  });
});

describe('a reader who has scrolled up', () => {
  it('is left where they are', () => {
    const node = scroller({ scrollTop: 600 });
    const { result, rerender } = renderHook(
      ({ key }) => useStickToBottom(key),
      {
        initialProps: { key: '1:a' },
      },
    );

    act(() => result.current.ref(node));

    // Away from the bottom, and the scroll handler is what notices.
    node.scrollTop = 100;
    act(() => result.current.onScroll());

    rerender({ key: '2:b' });

    expect(node.scrollTop).toBe(100);
  });

  it('follows again once they come back to the bottom', () => {
    const node = scroller({ scrollTop: 600 });
    const { result, rerender } = renderHook(
      ({ key }) => useStickToBottom(key),
      {
        initialProps: { key: '1:a' },
      },
    );

    act(() => result.current.ref(node));

    node.scrollTop = 100;
    act(() => result.current.onScroll());
    node.scrollTop = 600;
    act(() => result.current.onScroll());

    rerender({ key: '2:b' });

    expect(node.scrollTop).toBe(node.scrollHeight);
  });

  /**
   * A rounding difference or a message a pixel taller than measured must not
   * read as "the reader scrolled away", or following would switch itself off
   * for someone who never touched the scrollbar.
   */
  it('counts a few pixels short of the bottom as the bottom', () => {
    const node = scroller({ scrollTop: 580 });
    const { result, rerender } = renderHook(
      ({ key }) => useStickToBottom(key),
      {
        initialProps: { key: '1:a' },
      },
    );

    act(() => result.current.ref(node));
    act(() => result.current.onScroll());

    rerender({ key: '2:b' });

    expect(node.scrollTop).toBe(node.scrollHeight);
  });
});
