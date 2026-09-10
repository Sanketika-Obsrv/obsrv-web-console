/**
 * Which model the user chose, remembered between visits.
 *
 * `localStorage` rather than `sessionStorage`, unlike the active session:
 * the weights are cached per *browser*, so the choice of which to use
 * belongs at the same scope. Downloading a gigabyte and then being offered
 * the small model again on the next visit is not a choice being respected.
 *
 * Every accessor tolerates storage refusing outright — a browser that will
 * not remember a preference is not a reason to have no model.
 */
import { DEFAULT_MODEL, ModelSpec, modelById } from './catalog';

export const MODEL_CHOICE_KEY = 'obsrv-ai-model';

export const rememberedModel = (): ModelSpec => {
  try {
    const stored = window.localStorage.getItem(MODEL_CHOICE_KEY);
    return (stored ? modelById(stored) : undefined) ?? DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
};

export const rememberModel = (id: string): void => {
  try {
    window.localStorage.setItem(MODEL_CHOICE_KEY, id);
  } catch {
    // The model still loads; only the preference is lost.
  }
};

export const forgetModel = (): void => {
  try {
    window.localStorage.removeItem(MODEL_CHOICE_KEY);
  } catch {
    // As above.
  }
};
