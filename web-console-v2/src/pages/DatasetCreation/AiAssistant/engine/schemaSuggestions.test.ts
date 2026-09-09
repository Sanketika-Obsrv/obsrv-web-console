import {
  lowSuggestions,
  maskCandidates,
  timestampCandidates,
} from './schemaSuggestions';

/** Shaped exactly as the live `dataschema` response, including `advice`. */
const schema = {
  type: 'object',
  properties: {
    order_id: { type: 'string', data_type: 'string' },
    customer_email: {
      type: 'string',
      data_type: 'string',
      suggestions: [
        {
          message:
            "The Property 'customer_email' appears to be 'email' format type.",
          advice: 'Suggest to Mask the Personal Information',
          resolutionType: 'TRANSFORMATION',
          severity: 'LOW',
          path: 'properties.customer_email',
        },
      ],
    },
    amount: {
      type: 'number',
      data_type: 'double',
      oneof: [{ type: 'double' }, { type: 'string' }],
      suggestions: [
        {
          message: "Conflict in the Schema Generation at property: 'amount'.",
          resolutionType: 'DATA_TYPE',
          severity: 'MUST-FIX',
          path: 'properties.amount',
        },
      ],
    },
    order_ts: {
      type: 'string',
      data_type: 'date-time',
      suggestions: [
        {
          message:
            "The Property 'order_ts' appears to be 'date-time' format type.",
          advice: 'The System can index all data on this column',
          resolutionType: 'INDEX',
          severity: 'LOW',
          path: 'properties.order_ts',
        },
      ],
    },
    customer: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          data_type: 'string',
          suggestions: [
            {
              message:
                "The Property 'email' appears to be 'email' format type.",
              advice: 'Suggest to Mask the Personal Information',
              resolutionType: 'TRANSFORMATION',
              severity: 'LOW',
              path: 'properties.customer.properties.email',
            },
          ],
        },
      },
    },
  },
};

describe('lowSuggestions', () => {
  it('returns the LOW-severity hints with their advice, as dot paths', () => {
    expect(lowSuggestions(schema)).toEqual([
      {
        path: 'customer_email',
        resolutionType: 'TRANSFORMATION',
        message:
          "The Property 'customer_email' appears to be 'email' format type.",
        advice: 'Suggest to Mask the Personal Information',
      },
      {
        path: 'order_ts',
        resolutionType: 'INDEX',
        message:
          "The Property 'order_ts' appears to be 'date-time' format type.",
        advice: 'The System can index all data on this column',
      },
      {
        path: 'customer.email',
        resolutionType: 'TRANSFORMATION',
        message: "The Property 'email' appears to be 'email' format type.",
        advice: 'Suggest to Mask the Personal Information',
      },
    ]);
  });

  it('leaves the MUST-FIX conflicts out — those are a different question', () => {
    expect(lowSuggestions(schema).map((entry) => entry.path)).not.toContain(
      'amount',
    );
  });

  it('is empty for a schema the API returned no hints for', () => {
    expect(lowSuggestions({ properties: { a: { type: 'string' } } })).toEqual(
      [],
    );
  });

  it('survives a schema with no properties at all', () => {
    expect(lowSuggestions({})).toEqual([]);
    expect(lowSuggestions(undefined)).toEqual([]);
  });
});

describe('maskCandidates', () => {
  /**
   * The API's own PII detection, which the wizard shows nowhere. This is why
   * the `pii` question does not depend on the separate `analyze/pii` system
   * API: the hint is already on the document.
   */
  it('lists the fields the API suggested masking, nested ones included', () => {
    expect(maskCandidates(schema)).toEqual([
      'customer_email',
      'customer.email',
    ]);
  });

  it('does not treat an index hint as personal data', () => {
    expect(maskCandidates(schema)).not.toContain('order_ts');
  });
});

describe('timestampCandidates', () => {
  it('lists the fields the API said it could index on', () => {
    expect(timestampCandidates(schema)).toEqual(['order_ts']);
  });
});
