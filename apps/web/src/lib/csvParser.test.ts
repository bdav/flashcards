import { describe, it, expect } from 'vitest';
import { parseCsv } from './csvParser';

describe('csvParser', () => {
  it('parses a valid CSV with front,back headers', () => {
    const result = parseCsv('front,back\nCapital of France,Paris\n2 + 2,4');

    expect(result.validRows).toEqual([
      { front: 'Capital of France', back: 'Paris' },
      { front: '2 + 2', back: '4' },
    ]);
    expect(result.errorRows).toEqual([]);
    expect(result.headerError).toBeNull();
  });

  it('returns header error for wrong headers', () => {
    const result = parseCsv('question,answer\nWhat is 1+1,2');

    expect(result.headerError).toMatch(/front.*back|header/i);
    expect(result.validRows).toEqual([]);
    expect(result.errorRows).toEqual([]);
  });

  it('returns header error for empty CSV', () => {
    const result = parseCsv('');

    expect(result.headerError).toBeTruthy();
  });

  it('separates rows with missing fields into errorRows', () => {
    const result = parseCsv(
      'front,back\nGood Q,Good A\nOnly front,\n,Only back',
    );

    expect(result.validRows).toEqual([{ front: 'Good Q', back: 'Good A' }]);
    expect(result.errorRows).toHaveLength(2);
    expect(result.errorRows[0].reason).toMatch(/back/i);
    expect(result.errorRows[1].reason).toMatch(/front/i);
  });

  it('skips blank rows', () => {
    const result = parseCsv('front,back\nQ1,A1\n\n\nQ2,A2');

    expect(result.validRows).toHaveLength(2);
    expect(result.errorRows).toHaveLength(0);
  });

  it('trims whitespace from fields', () => {
    const result = parseCsv('front,back\n  Capital of France  ,  Paris  ');

    expect(result.validRows).toEqual([
      { front: 'Capital of France', back: 'Paris' },
    ]);
  });

  it('deduplicates within CSV (last occurrence wins, case-insensitive on front)', () => {
    const result = parseCsv(
      'front,back\nQ1,Wrong Answer\nQ1,Right Answer\nQ2,A2',
    );

    expect(result.validRows).toEqual([
      { front: 'Q1', back: 'Right Answer' },
      { front: 'Q2', back: 'A2' },
    ]);
  });

  it('deduplicates case-insensitively on front', () => {
    const result = parseCsv('front,back\nhello,world\nHELLO,WORLD');

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].back).toBe('WORLD');
  });

  it('handles case-insensitive headers', () => {
    const result = parseCsv('Front,Back\nQ1,A1');

    expect(result.validRows).toEqual([{ front: 'Q1', back: 'A1' }]);
    expect(result.headerError).toBeNull();
  });

  it('handles quoted fields with embedded commas', () => {
    const result = parseCsv('front,back\n"Hello, world","Goodbye, world"');

    expect(result.validRows).toEqual([
      { front: 'Hello, world', back: 'Goodbye, world' },
    ]);
  });

  it('handles CRLF line endings', () => {
    const result = parseCsv('front,back\r\nQ1,A1\r\nQ2,A2');

    expect(result.validRows).toHaveLength(2);
  });
});
