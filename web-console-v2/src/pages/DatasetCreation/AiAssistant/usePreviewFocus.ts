/**
 * Keeps the preview pane pointed at whatever the assistant just did.
 *
 * This is the seam between the chat and the preview: the chat reports the
 * action it dispatched and the outcome the executor returned, and the preview
 * learns which accordion to open and which rows to flash. It carries no
 * dataset values of its own — those always come from the server read that
 * `AllConfigurations` performs.
 */
import { useCallback, useState } from 'react';
import { Action } from './engine/actions';
import { ExecutionOutcome } from './engine/executor';
import { PreviewSection, sectionForAction } from './engine/previewFocus';

export interface PreviewFocus {
  focusSection?: PreviewSection;
  changedRefs?: string[];
  recordAction: (action: Action, outcome: ExecutionOutcome) => void;
}

export const usePreviewFocus = (): PreviewFocus => {
  const [focus, setFocus] = useState<{
    focusSection?: PreviewSection;
    changedRefs?: string[];
  }>({});

  const recordAction = useCallback(
    (action: Action, outcome: ExecutionOutcome) => {
      const section = sectionForAction(action);

      setFocus((current) => ({
        // A conversation-only action leaves the preview where it was.
        focusSection: section ?? current.focusSection,
        // A fresh array every time, so an identical edit still re-flashes.
        changedRefs:
          outcome.ok && outcome.status === 'applied'
            ? [...outcome.changedRefs]
            : [],
      }));
    },
    [],
  );

  return { ...focus, recordAction };
};
