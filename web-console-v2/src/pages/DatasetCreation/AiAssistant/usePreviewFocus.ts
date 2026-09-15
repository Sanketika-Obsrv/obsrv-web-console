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
import { AppliedAction } from './engine/turn';

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
  /**
   * Records a whole turn's worth of actions at once.
   *
   * A turn can run more than one action — `runUndo` already does — and
   * `changedRefs` is what the preview flashes, so it has to hold every ref
   * the turn touched rather than only the last action's. Bumping `revision`
   * once per turn, not once per action, is what keeps a multi-action turn
   * from triggering the dataset re-read several times over.
   */
  recordTurn: (applied: AppliedAction[]) => void;
  /** A single-action turn, kept for existing callers. See `recordTurn`. */
  recordAction: (action: Action, outcome: ExecutionOutcome) => void;
}

export const usePreviewFocus = (): PreviewFocus => {
  const [focus, setFocus] = useState<{
    focusSection?: PreviewSection;
    changedRefs?: string[];
    revision: number;
  }>({ revision: 0 });

  const recordTurn = useCallback((applied: AppliedAction[]) => {
    setFocus((current) => {
      // The last action with a section is what the accordion opens to — a
      // conversation-only action at the end of the turn leaves the preview
      // on the section the write before it touched, rather than closing it.
      const section = applied.reduce<PreviewSection | undefined>(
        (chosen, { action }) => sectionForAction(action) ?? chosen,
        undefined,
      );

      // Every action's refs are unioned rather than kept separately, so a
      // turn that both renamed a field and toggled another still flashes
      // both — looped `recordAction` calls would only leave the last one.
      const changedRefs = applied.flatMap(({ outcome }) =>
        outcome.ok && outcome.status === 'applied' ? outcome.changedRefs : [],
      );

      const wrote = applied.some(
        ({ outcome }) => outcome.ok && outcome.status === 'applied',
      );

      return {
        focusSection: section ?? current.focusSection,
        // A fresh array every time, so an identical edit still re-flashes.
        changedRefs,
        revision: current.revision + (wrote ? 1 : 0),
      };
    });
  }, []);

  const recordAction = useCallback(
    (action: Action, outcome: ExecutionOutcome) =>
      recordTurn([{ action, outcome }]),
    [recordTurn],
  );

  return { ...focus, recordTurn, recordAction };
};
