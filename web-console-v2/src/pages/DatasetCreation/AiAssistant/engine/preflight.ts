/**
 * Local checks that run before anything is sent.
 *
 * Three of them, each replacing a place where the wizard lets the user commit
 * to something it cannot yet tell them is wrong:
 *
 * - **Expressions** are evaluated against the sample, so a JSONata that will
 *   not run is reported here rather than rejected by the API later.
 * - **Duplicate counts** make a dedup key recommendation honest. The wizard
 *   offers a key picker with no indication of whether the key is actually
 *   unique in the data the user just supplied.
 * - **Cardinality** tells the user what they are choosing between.
 *
 * `jsonata` is already a dependency, so all of this costs nothing new.
 */
import JSONata from 'jsonata';
import _ from 'lodash';
import { evaluateDataType } from 'pages/DatasetCreation/Processing/utils/dataTypeUtil';

/** How many rows to show a result for; enough to see a pattern. */
const MAX_RESULT_ROWS = 10;

export interface ExpressionResult {
  input: unknown;
  output: unknown;
}

export type ExpressionPreflight =
  | {
      ok: true;
      results: ExpressionResult[];
      /** The datatype the API will store, as the wizard computes it. */
      dataType: string;
    }
  | { ok: false; error: string };

export interface EvaluateOptions {
  maxRows?: number;
}

/**
 * Evaluates an expression against the sample rows.
 *
 * The datatype comes from the wizard's own `evaluateDataType`, so the
 * assistant and the form can never disagree about what a given expression
 * produces. The per-row outputs are computed here purely for display.
 */
export const evaluateExpression = async (
  expression: string,
  rows: Record<string, unknown>[],
  { maxRows = MAX_RESULT_ROWS }: EvaluateOptions = {},
): Promise<ExpressionPreflight> => {
  if (!rows.length) {
    return {
      ok: false,
      error: 'There is no sample to test that against yet.',
    };
  }

  let dataType: string;

  try {
    const merged = rows.reduce<Record<string, unknown>>(
      (into, row) => _.merge(into, row),
      {},
    );

    const evaluated = await evaluateDataType(expression, {
      mergedEvent: merged,
    });
    dataType = evaluated.data_type;
  } catch (cause) {
    return {
      ok: false,
      error:
        cause instanceof Error
          ? cause.message
          : 'That expression could not be evaluated.',
    };
  }

  const compiled = JSONata(expression);

  const results = await Promise.all(
    rows.slice(0, maxRows).map(async (row) => {
      try {
        return { input: row, output: await compiled.evaluate(row) };
      } catch {
        // One row failing is worth showing, not worth failing the whole check.
        return { input: row, output: undefined };
      }
    }),
  );

  return { ok: true, results, dataType };
};

export interface DuplicateCount {
  total: number;
  /** How many distinct values the key took, ignoring rows that lack it. */
  distinct: number;
  /** How many rows would be dropped if duplicates were dropped. */
  duplicates: number;
  /** Rows where the key is absent, which is not the same as a repeat. */
  missing: number;
  /** The values that appeared more than once. */
  repeated: unknown[];
}

/**
 * Counts what deduplicating on a key would actually do to this sample.
 *
 * A row that lacks the key is counted as missing rather than as a duplicate
 * of the other rows that lack it — they are not the same value, they are the
 * absence of one, and reporting them as matches would overstate the case.
 */
export const countDuplicates = (
  rows: Record<string, unknown>[],
  path: string,
): DuplicateCount => {
  const counts = new Map<string, number>();
  let missing = 0;

  rows.forEach((row) => {
    const value = _.get(row, path);

    if (value === undefined || value === null) {
      missing += 1;
      return;
    }

    const key = JSON.stringify(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const repeated = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => JSON.parse(key));

  const duplicates = [...counts.values()].reduce(
    (total, count) => total + (count - 1),
    0,
  );

  return {
    total: rows.length,
    distinct: counts.size,
    duplicates,
    missing,
    repeated,
  };
};

export interface Cardinality {
  distinct: number;
  total: number;
  isUnique: boolean;
  summary: string;
}

/** How many different values a field takes across the sample. */
export const describeCardinality = (
  rows: Record<string, unknown>[],
  path: string,
): Cardinality => {
  const { distinct, total, duplicates, missing } = countDuplicates(rows, path);
  const isUnique = total > 0 && duplicates === 0 && missing === 0;

  return {
    distinct,
    total,
    isUnique,
    summary: `${distinct} distinct value${
      distinct === 1 ? '' : 's'
    } across ${total} row${total === 1 ? '' : 's'}`,
  };
};
