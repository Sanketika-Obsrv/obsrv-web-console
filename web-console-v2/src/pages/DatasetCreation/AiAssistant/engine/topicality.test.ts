import { buildFieldVocabulary } from './fieldVocabulary';
import { isAboutDataset } from './topicality';

const FIELDS = [
  { column: 'sensor_id', data_type: 'string', arrival_format: 'text' },
  { column: 'reading', data_type: 'double', arrival_format: 'number' },
  {
    column: 'site',
    data_type: 'object',
    properties: { city: { key: 'city', data_type: 'string' } },
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vocabulary = buildFieldVocabulary(FIELDS as any);
const about = (utterance: string) => isAboutDataset(utterance, vocabulary);

describe('telling dataset work from everything else', () => {
  it('recognises a field of this dataset', () => {
    expect(about('make sensor_id required')).toBe(true);
    expect(about('reading should be a long')).toBe(true);
    expect(about('mask site.city')).toBe(true);
  });

  it('recognises the vocabulary of dataset creation', () => {
    for (const said of [
      'call it Air Quality',
      'what kind of data is this',
      'drop duplicates',
      'what is deduplication',
      'is the email masking on',
      'encrypt the personal data',
      'use the lakehouse',
      'which field is the timestamp',
      'save it',
      'undo that',
      'go to processing',
      "let's set up a connector",
      'reject unknown fields',
      'pull in the master dataset',
    ]) {
      expect({ said, about: about(said) }).toEqual({ said, about: true });
    }
  });

  /**
   * The point of this: an off-topic request should be told plainly that it
   * cannot be done, rather than guessed at or reported as a failure to
   * understand a dataset instruction.
   */
  it('recognises what has nothing to do with a dataset', () => {
    for (const said of [
      'what is the weather in Bangalore',
      'write me a poem about ducks',
      'who won the cricket match',
      'send an email to my manager',
      'what is 2 + 2',
    ]) {
      expect({ said, about: about(said) }).toEqual({ said, about: false });
    }
  });

  /**
   * An attempted instruction is dataset work even when its object is vague:
   * "make the thing better" deserves "I did not understand", not "that is
   * outside what I can do here".
   */
  it('treats an instruction as an attempt at dataset work', () => {
    expect(about('make the thing better')).toBe(true);
    expect(about('change that')).toBe(true);
    expect(about('remove it')).toBe(true);

    /**
     * Including one that is plainly not about this dataset. Telling an
     * instruction apart from *which* thing it means is the resolver's job,
     * and it will decline: "delete the production database" names no field,
     * so it earns a clarifying question rather than a refusal. Either way
     * nothing is written — and the assistant has no way to touch anything
     * but this dataset regardless.
     */
    expect(about('delete the production database')).toBe(true);
  });

  it('treats an empty utterance as nothing to act on', () => {
    expect(about('')).toBe(false);
    expect(about('   ')).toBe(false);
  });

  /** A field name is a field name even where the sentence is odd. */
  it('leans towards dataset work when a field is named', () => {
    expect(about('the weather affects reading')).toBe(true);
  });
});
