/**
 * Keeps the preview pane pointed at whatever the assistant just did.
 *
 * This is the seam between the chat and the preview: the chat reports the
 * action it dispatched and the outcome the executor returned, and the preview
 * learns which accordion to open and which rows to flash. It carries no
 * dataset values of its own — those always come from the server read that
 * `AllConfigurations` performs, which is what `revision` is for: a count of
 * the changes made, so the reads that feed the preview know they are stale.
 */
import { useCallback, useState } from 'react';
import { Action } from './engine/actions';
import { ExecutionOutcome } from './engine/executor';
import { PreviewSection, sectionForAction } from './engine/previewFocus';

export interface PreviewFocus {
  focusSection?: PreviewSection;
  changedRefs?: string[];
  /**
   * How many changes have been written in this conversation.
   *
   * The preview reads the dataset itself, and nothing told it to read again
   * — so "mark mid as required" changed the server and not the screen. The
   * count changes only when something was actually written, so a question
   * answered with a decline does not cause a re-read.
   */
  revision: number;
  recordAction: (action: Action, outcome: ExecutionOutcome) => void;
}

export const usePreviewFocus = (): PreviewFocus => {
  const [focus, setFocus] = useState<{
    focusSection?: PreviewSection;
    changedRefs?: string[];
    revision: number;
  }>({ revision: 0 });

  const recordAction = useCallback(
    (action: Action, outcome: ExecutionOutcome) => {
      const section = sectionForAction(action);

      const wrote = outcome.ok && outcome.status === 'applied';

      setFocus((current) => ({
        // A conversation-only action leaves the preview where it was.
        focusSection: section ?? current.focusSection,
        // A fresh array every time, so an identical edit still re-flashes.
        changedRefs: wrote ? [...outcome.changedRefs] : [],
        revision: current.revision + (wrote ? 1 : 0),
      }));
    },
    [],
  );

  return { ...focus, recordAction };
};
