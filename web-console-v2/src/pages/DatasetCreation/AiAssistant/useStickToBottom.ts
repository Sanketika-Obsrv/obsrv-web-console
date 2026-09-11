/**
 * Keeps a scrolling element at the bottom as content is added — unless the
 * reader has scrolled away from it.
 *
 * A transcript that jumps to the newest message is right up to the moment
 * someone scrolls back to read an earlier answer; from then on, following is
 * the assistant yanking the page out from under them. So following is a state
 * the reader controls: leaving the bottom turns it off, returning turns it
 * back on. That is the behaviour every chat client has, and the reason it is
 * worth the extra dozen lines.
 *
 * Returns the props for the scroller, so the caller wires a ref and an
 * `onScroll` handler and nothing else.
 */
import { useCallback, useEffect, useRef } from 'react';

/**
 * How far from the bottom still counts as being at it.
 *
 * Not zero: a fractional scroll height, a rounding difference between
 * browsers, or a message rendering a pixel taller than measured all leave a
 * reader who never scrolled a hair above the bottom, and following would
 * switch itself off.
 */
const NEAR_BOTTOM_PX = 48;

const atBottom = (element: HTMLElement): boolean =>
  element.scrollHeight - element.scrollTop - element.clientHeight <=
  NEAR_BOTTOM_PX;

export interface StickToBottom {
  ref: (element: HTMLElement | null) => void;
  onScroll: () => void;
}

/**
 * @param changeKey anything that changes when there is something new to
 * scroll to — the message count and the last message's id, since a single
 * turn appends several messages and each should follow.
 */
export const useStickToBottom = (changeKey: unknown): StickToBottom => {
  const element = useRef<HTMLElement | null>(null);
  const following = useRef(true);

  const ref = useCallback((node: HTMLElement | null) => {
    element.current = node;
  }, []);

  const onScroll = useCallback(() => {
    const node = element.current;
    if (!node) return;

    following.current = atBottom(node);
  }, []);

  useEffect(() => {
    const node = element.current;
    if (!node || !following.current) return;

    node.scrollTop = node.scrollHeight;
  }, [changeKey]);

  return { ref, onScroll };
};
