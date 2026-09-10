import { buildFieldVocabulary } from './engine/fieldVocabulary';
import { fallbackSuggestions } from './suggestions';

const vocabularyOf = (columns: string[]) =>
  buildFieldVocabulary(
    columns.map((column) => ({
      column,
      data_type: 'string',
      arrival_format: 'text',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any,
  );

/**
 * Reported by the user: "it says order id for any dataset". The examples
 * offered under the composer were a fixed list written against the probe
 * dataset from this build, so a dataset of sensor readings was told it could
 * say "dedup on order_id".
 */
describe('the examples offered when there is no question to answer', () => {
  it('names fields this dataset actually has', () => {
    const chips = fallbackSuggestions(vocabularyOf(['sensor_id', 'reading']));

    expect(chips.join(' ')).toMatch(/sensor_id/);
    expect(chips.join(' ')).not.toMatch(/order_id/);
  });

  it('offers nothing field-shaped before there is a schema', () => {
    const chips = fallbackSuggestions(vocabularyOf([]));

    expect(chips.join(' ')).not.toMatch(/required|dedup on/);
  });

  it('always offers the way out and the way to finish', () => {
    for (const columns of [[], ['sensor_id']]) {
      const chips = fallbackSuggestions(vocabularyOf(columns));

      expect(chips).toContain('undo that');
      expect(chips).toContain('save it');
    }
  });

  it('keeps the list short enough to read', () => {
    expect(
      fallbackSuggestions(vocabularyOf(['a', 'b', 'c', 'd', 'e', 'f'])).length,
    ).toBeLessThanOrEqual(5);
  });

  /** A nested field is a poor example: it reads as a typo in a chip. */
  it('prefers a top-level field for the example', () => {
    const nested = buildFieldVocabulary([
      {
        column: 'site',
        data_type: 'object',
        properties: { city: { key: 'city', data_type: 'string' } },
      },
      { column: 'reading', data_type: 'double', arrival_format: 'number' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);

    expect(fallbackSuggestions(nested).join(' ')).toMatch(/reading/);
  });
});
