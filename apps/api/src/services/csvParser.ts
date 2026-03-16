type CsvSuccess = {
  ok: true;
  cards: { front: string; back: string }[];
};

type CsvError = {
  ok: false;
  error: string;
};

export type CsvResult = CsvSuccess | CsvError;

/**
 * Parses a CSV string with front,back headers into card data.
 * Validates headers, trims whitespace, ignores blank rows,
 * and rejects rows missing either field.
 */
export function parseCsv(csv: string): CsvResult {
  const lines = parseLines(csv);

  if (lines.length === 0) {
    return { ok: false, error: 'CSV is empty' };
  }

  const [headerLine, ...dataLines] = lines;
  const headers = headerLine.map((h) => h.toLowerCase().trim());

  const frontIdx = headers.indexOf('front');
  const backIdx = headers.indexOf('back');

  if (frontIdx === -1 || backIdx === -1) {
    return {
      ok: false,
      error: 'CSV must have "front" and "back" headers',
    };
  }

  const cards: { front: string; back: string }[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const fields = dataLines[i];
    const front = (fields[frontIdx] ?? '').trim();
    const back = (fields[backIdx] ?? '').trim();

    if (!front && !back) {
      continue; // skip blank rows
    }

    if (!front || !back) {
      errors.push(`Row ${i + 2}: missing ${!front ? 'front' : 'back'} value`);
      continue;
    }

    cards.push({ front, back });
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join('; ') };
  }

  if (cards.length === 0) {
    return { ok: false, error: 'No cards found in CSV' };
  }

  return { ok: true, cards };
}

/**
 * Parses CSV text into rows of fields, handling quoted fields with commas.
 */
function parseLines(csv: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let fields: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];

    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && csv[i + 1] === '\n') {
        i++; // skip \r\n
      }
      fields.push(current);
      current = '';
      if (fields.some((f) => f.trim() !== '')) {
        rows.push(fields);
      }
      fields = [];
    } else {
      current += ch;
    }
  }

  // Handle last line (no trailing newline)
  fields.push(current);
  if (fields.some((f) => f.trim() !== '')) {
    rows.push(fields);
  }

  return rows;
}
