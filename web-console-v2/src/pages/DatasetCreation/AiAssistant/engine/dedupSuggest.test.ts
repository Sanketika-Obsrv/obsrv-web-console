import {
  DedupCandidate,
  dedupCandidates,
  describeCandidate,
} from './dedupSuggest';

const rows = [
  { order_id: 'A-1', customer_id: 'C-1', city: 'Bengaluru', amount: 10 },
  { order_id: 'A-2', customer_id: 'C-1', city: 'Bengaluru', amount: 20 },
  { order_id: 'A-3', customer_id: 'C-2', city: 'Pune', amount: 10 },
  { order_id: 'A-4', customer_id: 'C-2', city: 'Pune', amount: 30 },
];

const paths = ['order_id', 'customer_id', 'city', 'amount'];

const pathsOf = (candidates: DedupCandidate[]) =>
  candidates.map((candidate) => candidate.path);

describe('dedupCandidates', () => {
  it('puts a field that is unique in the sample first', () => {
    expect(pathsOf(dedupCandidates(rows, paths))[0]).toBe('order_id');
  });

  it('reports how many rows a key would drop', () => {
    const candidates = dedupCandidates(rows, paths);

    // customer_id repeats twice over, so two of the four rows would go.
    expect(
      candidates.find((entry) => entry.path === 'customer_id'),
    ).toMatchObject({ duplicates: 2, total: 4, distinct: 2 });
  });

  it('orders by how much data a key would cost, worst last', () => {
    // amount takes 10, 20, 10, 30 — one repeat, so it outranks customer_id's
    // two even though its name suggests nothing. customer_id and city both
    // cost two rows, and there the id-looking name is the tiebreak.
    expect(pathsOf(dedupCandidates(rows, paths))).toEqual([
      'order_id',
      'amount',
      'customer_id',
      'city',
    ]);
  });

  it('agrees with countDuplicates, which is the executor-side measurement', () => {
    // Guards against the ranking and the warning disagreeing about a key.
    const candidate = dedupCandidates(rows, paths).find(
      (entry) => entry.path === 'city',
    );

    expect(candidate).toMatchObject({ duplicates: 2, total: 4 });
  });

  it('prefers an id-looking name over another equally unique field', () => {
    const unique = [
      { order_id: 'A-1', trace: 'T-1' },
      { order_id: 'A-2', trace: 'T-2' },
    ];

    expect(pathsOf(dedupCandidates(unique, ['trace', 'order_id']))[0]).toBe(
      'order_id',
    );
  });

  it('ranks a unique non-id above a duplicated id, because the data wins', () => {
    // A name is a hint; the sample is evidence.
    const observed = [
      { order_id: 'A-1', trace: 'T-1' },
      { order_id: 'A-1', trace: 'T-2' },
    ];

    expect(pathsOf(dedupCandidates(observed, ['order_id', 'trace']))[0]).toBe(
      'trace',
    );
  });

  it('skips a field that is missing from some rows', () => {
    // A sparse key silently drops every row that lacks it, so it is never
    // offered — the wizard's picker offers it with no such warning.
    const sparse = [{ order_id: 'A-1', coupon: 'X' }, { order_id: 'A-2' }];

    expect(pathsOf(dedupCandidates(sparse, ['order_id', 'coupon']))).toEqual([
      'order_id',
    ]);
  });

  it('returns nothing when there is no sample to judge by', () => {
    expect(dedupCandidates([], paths)).toEqual([]);
  });

  it('only considers the paths it was given', () => {
    // The caller passes dedup-eligible paths, so an object or a date never
    // reaches this function and it does not need to know the schema.
    expect(pathsOf(dedupCandidates(rows, ['city']))).toEqual(['city']);
  });
});

describe('describeCandidate', () => {
  it('states uniqueness as evidence, not as proof', () => {
    const [best] = dedupCandidates(rows, paths);

    expect(describeCandidate(best)).toBe('unique in all 4 sample rows');
  });

  it('says what would be dropped when it is not unique', () => {
    const candidate = dedupCandidates(rows, paths).find(
      (entry) => entry.path === 'customer_id',
    ) as DedupCandidate;

    expect(describeCandidate(candidate)).toBe('would drop 2 of 4 sample rows');
  });

  it('uses the singular for one row', () => {
    const one = dedupCandidates([{ order_id: 'A-1' }], ['order_id'])[0];

    expect(describeCandidate(one)).toBe('unique in the 1 sample row');
  });
});
