/**
 * The cards a message can carry.
 *
 * Every card exists because some step cannot be done in prose alone — picking
 * a file, resolving a type conflict against real counts, confirming a save.
 * They all emit `Action`s through one callback, which is what makes the whole
 * workflow reachable with no model and no typing.
 */
import { Diagnosis } from '../engine/errorMap';
import { Action, DataType } from '../engine/actions';

export interface ChoiceOption {
  /** What the user sees. */
  label: string;
  /** Dispatched when chosen. */
  action: Action;
  /** Shown under the label, e.g. why this option is recommended. */
  hint?: string;
}

/** One candidate type for a field the API reported as conflicting. */
export interface ConflictCandidate {
  dataType: DataType;
  /** How many sample values were observed as this type, when the API said. */
  count?: number;
  isRecommended?: boolean;
  /** Widest candidate — the one that can hold every observed value. */
  isSafest?: boolean;
}

export interface FieldRow {
  path: string;
  dataType?: string;
  arrivalFormat?: string;
  required?: boolean;
}

export type MessageCard =
  /** Sample upload, inside the conversation. */
  | { kind: 'file_drop'; prompt?: string; accept?: string[] }
  /** A set of buttons, so any choice is clickable rather than typed. */
  | { kind: 'choice'; prompt?: string; options: ChoiceOption[] }
  | {
      kind: 'confirm';
      title: string;
      summary?: string[];
      confirmLabel?: string;
      confirmAction: Action;
    }
  | {
      kind: 'conflict';
      path: string;
      candidates: ConflictCandidate[];
      /** Set when following the API's recommendation would narrow values. */
      valuesAtRisk?: number;
    }
  | { kind: 'field_table'; caption?: string; fields: FieldRow[] }
  | {
      kind: 'sample_preview';
      rows: Record<string, unknown>[];
      totalRows: number;
    }
  | {
      kind: 'expression_result';
      expression: string;
      dataType?: string;
      /** Evaluated result per sample row, when the expression ran. */
      results?: { input: unknown; output: unknown }[];
      /** Set when the expression could not be evaluated. */
      error?: string;
    }
  | { kind: 'api_error'; diagnosis: Diagnosis };

export type CardKind = MessageCard['kind'];
