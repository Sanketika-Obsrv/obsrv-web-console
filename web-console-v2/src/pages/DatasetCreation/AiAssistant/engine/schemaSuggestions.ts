/**
 * The API's LOW-severity hints, which nothing in the console surfaces.
 *
 * `datasets/dataschema` returns more than a schema. Alongside the MUST-FIX
 * type conflicts it reports advisory hints, and two of them are worth a
 * question — probed live and quoted verbatim:
 *
 * | severity | resolutionType | message / advice |
 * |---|---|---|
 * | LOW | `TRANSFORMATION` | "appears to be 'email' format type" / "Suggest to Mask the Personal Information" |
 * | LOW | `INDEX` | "appears to be 'date-time' format type" / "The System can index all data on this column" |
 *
 * The first is the API's own PII detection. It means the `pii` question does
 * not depend on the separate `analyze/pii` system API — the hint is already on
 * the document that is read every turn. (That API detects more, phone numbers
 * and card numbers among them, so it stays worth wiring; it is no longer on
 * the critical path.) The second names the field to offer as the timestamp
 * key.
 *
 * These live on the stored `data_schema` only because the assistant stopped
 * stripping them on write — see `patchDatasetDocument` in the executor.
 */
import { DataSchema } from './schemaEditor';
import { pathFromRef } from './previewFocus';

/** The resolution types worth acting on. `DATA_TYPE` is the conflict question. */
export type LowResolutionType = 'TRANSFORMATION' | 'INDEX';

export interface LowSuggestion {
  /** Dot path, e.g. `customer.email`. */
  path: string;
  resolutionType: LowResolutionType;
  message?: string;
  /** The API's own recommendation, in its words. */
  advice?: string;
}

interface RawSuggestion {
  message?: string;
  advice?: string;
  resolutionType?: string;
  severity?: string;
  path?: string;
}

interface Field {
  properties?: Record<string, Field>;
  suggestions?: RawSuggestion[];
}

const ACTIONABLE: LowResolutionType[] = ['TRANSFORMATION', 'INDEX'];

/**
 * Every LOW-severity hint the API attached, in document order.
 *
 * The path is derived from the walk rather than read from `suggestion.path`,
 * because the two can only agree — and deriving it means a suggestion the API
 * mislabels still points at the field it was attached to.
 */
export const lowSuggestions = (
  dataSchema: DataSchema | undefined,
): LowSuggestion[] => {
  const found: LowSuggestion[] = [];

  const walk = (properties: Record<string, Field>, prefix: string) => {
    Object.entries(properties).forEach(([name, field]) => {
      const ref = `${prefix}properties.${name}`;

      (field.suggestions ?? []).forEach((suggestion) => {
        const type = suggestion.resolutionType as LowResolutionType;

        if (suggestion.severity !== 'LOW' || !ACTIONABLE.includes(type)) return;

        found.push({
          path: pathFromRef(ref),
          resolutionType: type,
          ...(suggestion.message ? { message: suggestion.message } : {}),
          ...(suggestion.advice ? { advice: suggestion.advice } : {}),
        });
      });

      if (field.properties) walk(field.properties, `${ref}.`);
    });
  };

  const root = (
    dataSchema as { properties?: Record<string, Field> } | undefined
  )?.properties;
  if (root) walk(root, '');

  return found;
};

const pathsOfType = (
  dataSchema: DataSchema | undefined,
  resolutionType: LowResolutionType,
): string[] =>
  lowSuggestions(dataSchema)
    .filter((suggestion) => suggestion.resolutionType === resolutionType)
    .map((suggestion) => suggestion.path);

/** Fields the API suggested masking — its own PII detection. */
export const maskCandidates = (dataSchema: DataSchema | undefined): string[] =>
  pathsOfType(dataSchema, 'TRANSFORMATION');

/** Fields the API said it could index the data on. */
export const timestampCandidates = (
  dataSchema: DataSchema | undefined,
): string[] => pathsOfType(dataSchema, 'INDEX');
