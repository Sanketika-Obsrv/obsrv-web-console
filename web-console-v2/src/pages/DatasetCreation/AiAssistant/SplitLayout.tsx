import { Box } from '@mui/material';
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const KEYBOARD_STEP = 2;

export interface SplitLayoutProps {
  left: ReactNode;
  right: ReactNode;
  /** Accessible name for the left pane. */
  leftLabel: string;
  /** Accessible name for the right pane. */
  rightLabel: string;
  initialLeftPercent?: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
  separatorLabel?: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Two-pane layout with a draggable, keyboard-operable divider.
 *
 * Implemented locally rather than with `react-split-pane` because that package
 * ships no types here (`tsconfig` maps it to a `SplitPane.d.ts` that does not
 * exist) and still uses pre-React-18 lifecycles. This follows the ARIA window
 * splitter pattern instead.
 */
const SplitLayout: React.FC<SplitLayoutProps> = ({
  left,
  right,
  leftLabel,
  rightLabel,
  initialLeftPercent = 42,
  minLeftPercent = 25,
  maxLeftPercent = 70,
  separatorLabel = 'Resize panes',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPercent, setLeftPercent] = useState(() =>
    clamp(initialLeftPercent, minLeftPercent, maxLeftPercent),
  );
  const [isDragging, setIsDragging] = useState(false);

  const applyPercent = useCallback(
    (next: number) =>
      setLeftPercent(clamp(Math.round(next), minLeftPercent, maxLeftPercent)),
    [minLeftPercent, maxLeftPercent],
  );

  useEffect(() => {
    if (!isDragging) return undefined;

    const onPointerMove = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container || !Number.isFinite(event.clientX)) return;

      const { left: containerLeft, width } = container.getBoundingClientRect();
      if (!width) return;

      applyPercent(((event.clientX - containerLeft) / width) * 100);
    };

    const stopDragging = () => setIsDragging(false);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [isDragging, applyPercent]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: leftPercent - KEYBOARD_STEP,
      ArrowRight: leftPercent + KEYBOARD_STEP,
      Home: minLeftPercent,
      End: maxLeftPercent,
    };

    if (!(event.key in moves)) return;

    event.preventDefault();
    applyPercent(moves[event.key]);
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        width: '100%',
        height: '100%',
        minHeight: 0,
      }}
    >
      <Box
        component="section"
        aria-label={leftLabel}
        style={{ width: `${leftPercent}%` }}
        sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}
      >
        {left}
      </Box>

      {}
      <Box
        role="separator"
        aria-label={separatorLabel}
        aria-orientation="vertical"
        aria-valuenow={leftPercent}
        aria-valuemin={minLeftPercent}
        aria-valuemax={maxLeftPercent}
        tabIndex={0}
        onPointerDown={() => setIsDragging(true)}
        onKeyDown={onKeyDown}
        sx={{
          flex: '0 0 auto',
          width: '0.5rem',
          cursor: 'col-resize',
          bgcolor: isDragging ? 'primary.main' : 'divider',
          transition: 'background-color 120ms ease',
          '&:hover, &:focus-visible': { bgcolor: 'primary.light' },
        }}
      />

      <Box
        component="section"
        aria-label={rightLabel}
        style={{ width: `${100 - leftPercent}%` }}
        sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}
      >
        {right}
      </Box>
    </Box>
  );
};

export default SplitLayout;
