import { act, renderHook } from '@testing-library/react';
import { ExecutionOutcome } from './engine/executor';
import { usePreviewFocus } from './usePreviewFocus';

const applied = (changedRefs: string[] = []): ExecutionOutcome => ({
  ok: true,
  status: 'applied',
  dataset: { dataset_id: 'my-orders' },
  changedRefs,
});

const rejected: ExecutionOutcome = {
  ok: false,
  error: 'Unknown field "custmer_id"',
  code: 'UNKNOWN_FIELD',
};

describe('usePreviewFocus', () => {
  it('starts with nothing focused or highlighted', () => {
    const { result } = renderHook(() => usePreviewFocus());

    expect(result.current.focusSection).toBeUndefined();
    expect(result.current.changedRefs).toBeUndefined();
  });

  it('opens the accordion the action belongs to', () => {
    const { result } = renderHook(() => usePreviewFocus());

    act(() =>
      result.current.recordAction(
        { kind: 'set_storage', realtime: true },
        applied(),
      ),
    );

    expect(result.current.focusSection).toBe('storage');
  });

  it('highlights the refs the server reported as changed', () => {
    const { result } = renderHook(() => usePreviewFocus());

    act(() =>
      result.current.recordAction(
        { kind: 'set_data_type', path: 'total_amount', dataType: 'string' },
        applied(['properties.total_amount']),
      ),
    );

    expect(result.current.changedRefs).toEqual(['properties.total_amount']);
  });

  /**
   * A rejected action still moves the preview: seeing the panel the change was
   * meant for is what makes the explanation make sense.
   */
  it('still opens the relevant accordion when the action failed', () => {
    const { result } = renderHook(() => usePreviewFocus());

    act(() =>
      result.current.recordAction(
        { kind: 'set_keys', primary: 'nope' },
        rejected,
      ),
    );

    expect(result.current.focusSection).toBe('storage');
  });

  it('highlights nothing when the action failed', () => {
    const { result } = renderHook(() => usePreviewFocus());

    act(() =>
      result.current.recordAction(
        { kind: 'set_data_type', path: 'x', dataType: 'string' },
        applied(['properties.x']),
      ),
    );
    act(() =>
      result.current.recordAction(
        { kind: 'set_keys', primary: 'nope' },
        rejected,
      ),
    );

    expect(result.current.changedRefs).toEqual([]);
  });

  it('leaves the preview where it is for a conversation-only action', () => {
    const { result } = renderHook(() => usePreviewFocus());

    act(() =>
      result.current.recordAction(
        { kind: 'set_storage', realtime: true },
        applied(),
      ),
    );
    act(() =>
      result.current.recordAction(
        { kind: 'explain', topic: 'dedup' },
        {
          ok: true,
          status: 'noop',
        },
      ),
    );

    expect(result.current.focusSection).toBe('storage');
  });

  it('replaces the previous highlight rather than accumulating', () => {
    const { result } = renderHook(() => usePreviewFocus());

    act(() =>
      result.current.recordAction(
        { kind: 'set_data_type', path: 'a', dataType: 'string' },
        applied(['properties.a']),
      ),
    );
    act(() =>
      result.current.recordAction(
        { kind: 'set_data_type', path: 'b', dataType: 'string' },
        applied(['properties.b']),
      ),
    );

    expect(result.current.changedRefs).toEqual(['properties.b']);
  });

  /**
   * Two identical edits in a row must produce a new array, or the preview's
   * flash effect would not re-fire on the second one.
   */
  it('re-flashes when the same field changes twice', () => {
    const { result } = renderHook(() => usePreviewFocus());

    act(() =>
      result.current.recordAction(
        { kind: 'toggle_required', path: 'a', required: true },
        applied(['properties.a']),
      ),
    );
    const first = result.current.changedRefs;

    act(() =>
      result.current.recordAction(
        { kind: 'toggle_required', path: 'a', required: false },
        applied(['properties.a']),
      ),
    );

    expect(result.current.changedRefs).toEqual(['properties.a']);
    expect(result.current.changedRefs).not.toBe(first);
  });

  it('keeps a stable recordAction so consumers do not re-render', () => {
    const { result, rerender } = renderHook(() => usePreviewFocus());
    const first = result.current.recordAction;

    rerender();

    expect(result.current.recordAction).toBe(first);
  });
});
