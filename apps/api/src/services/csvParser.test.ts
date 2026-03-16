import { describe, it, expect } from 'vitest';
import { parseCsv } from './csvParser.js';

describe('parseCsv', () => {
  it('parses valid CSV with front,back headers', () => {
    const csv = 'front,back\nCapital of France,Paris\n2 + 2,4';
    const result = parseCsv(csv);

    expect(result).toEqual({
      ok: true,
      cards: [
        { front: 'Capital of France', back: 'Paris' },
        { front: '2 + 2', back: '4' },
      ],
    });
  });

  it('rejects CSV with wrong headers', () => {
    const csv = 'question,answer\nWhat is 1+1,2';
    const result = parseCsv(csv);

    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('front'),
    });
  });

  it('rejects rows missing front or back', () => {
    const csv = 'front,back\nOnly front,\n,Only back\nValid,Row';
    const result = parseCsv(csv);

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/row/i),
    });
  });

  it('ignores blank rows', () => {
    const csv = 'front,back\nQ1,A1\n\n\nQ2,A2\n';
    const result = parseCsv(csv);

    expect(result).toEqual({
      ok: true,
      cards: [
        { front: 'Q1', back: 'A1' },
        { front: 'Q2', back: 'A2' },
      ],
    });
  });

  it('trims whitespace from fields', () => {
    const csv = 'front,back\n  Capital of France  ,  Paris  ';
    const result = parseCsv(csv);

    expect(result).toEqual({
      ok: true,
      cards: [{ front: 'Capital of France', back: 'Paris' }],
    });
  });

  it('handles CSV with only headers and no data rows', () => {
    const csv = 'front,back\n';
    const result = parseCsv(csv);

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/no cards/i),
    });
  });

  it('handles headers with different casing', () => {
    const csv = 'Front,Back\nQ1,A1';
    const result = parseCsv(csv);

    expect(result).toEqual({
      ok: true,
      cards: [{ front: 'Q1', back: 'A1' }],
    });
  });

  it('handles fields containing commas when quoted', () => {
    const csv = 'front,back\n"What is 1,000 + 1",1001';
    const result = parseCsv(csv);

    expect(result).toEqual({
      ok: true,
      cards: [{ front: 'What is 1,000 + 1', back: '1001' }],
    });
  });
});
