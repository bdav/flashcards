export interface CsvRow {
  front: string;
  back: string;
}

export interface CsvErrorRow {
  front: string;
  back: string;
  reason: string;
}

export interface CsvParseResult {
  headerError: string | null;
  validRows: CsvRow[];
  errorRows: CsvErrorRow[];
}

/**
 * Parses a CSV string with front,back headers into card data.
 * Returns valid rows and error rows separately.
 * Deduplicates within CSV (last occurrence wins, case-insensitive on front).
 */
export function parseCsv(csv: string): CsvParseResult {
  const lines = parseLines(csv);

  if (lines.length === 0) {
    return { headerError: 'CSV is empty', validRows: [], errorRows: [] };
  }

  const [headerLine, ...dataLines] = lines;
  const headers = headerLine.map((h) => h.toLowerCase().trim());

  const frontIdx = headers.indexOf('front');
  const backIdx = headers.indexOf('back');

  if (frontIdx === -1 || backIdx === -1) {
    return {
      headerError: 'CSV must have "front" and "back" headers',
      validRows: [],
      errorRows: [],
    };
  }

  const validRows: CsvRow[] = [];
  const errorRows: CsvErrorRow[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const fields = dataLines[i];
    const front = (fields[frontIdx] ?? '').trim();
    const back = (fields[backIdx] ?? '').trim();

    if (!front && !back) {
      continue; // skip blank rows
    }

    if (!front || !back) {
      errorRows.push({
        front,
        back,
        reason: `Missing ${!front ? 'front' : 'back'} value`,
      });
      continue;
    }

    validRows.push({ front, back });
  }

  // Dedupe within CSV on front (last occurrence wins, case-insensitive)
  const deduped = new Map<string, CsvRow>();
  for (const row of validRows) {
    deduped.set(row.front.toLowerCase(), row);
  }

  return {
    headerError: null,
    validRows: [...deduped.values()],
    errorRows,
  };
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
          i++;
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
        i++;
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

  fields.push(current);
  if (fields.some((f) => f.trim() !== '')) {
    rows.push(fields);
  }

  return rows;
}
