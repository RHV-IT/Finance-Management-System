/**
 * components/DataImporter/parsers.js
 *
 * Parses uploaded CSV and XLSX files into arrays of plain objects.
 * Uses SheetJS (xlsx) for .xlsx — available in Next.js via npm.
 * Uses native FileReader + manual split for CSV (no extra dep needed).
 */
 
/**
 * Master entry point — detects file type and dispatches to the right parser.
 * @param {File} file
 * @returns {Promise<{ headers: string[], rows: object[], raw: string[][] }>}
 */
export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
 
  if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
    return parseCSV(file);
  }
 
  if (ext === 'xlsx' || ext === 'xls') {
    return parseXLSX(file);
  }
 
  throw new Error(`Unsupported file type: .${ext}. Please upload a .csv or .xlsx file.`);
}
 
// ─── CSV Parser ───────────────────────────────────────────────
 
async function parseCSV(file) {
  const text = await readFileAsText(file);
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
 
  if (lines.length < 2) {
    throw new Error('File appears to be empty or has only a header row.');
  }
 
  const raw     = lines.map(l => splitCSVLine(l));
  const headers = raw[0].map(h => h.trim());
  const dataRows = raw.slice(1);
 
  const rows = dataRows.map(cells => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] || '').trim();
    });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ''));
 
  return { headers, rows, raw };
}
 
/**
 * Split a single CSV line respecting quoted fields.
 */
function splitCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuote = false;
 
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
 
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if ((ch === ',' || ch === '\t') && !inQuote) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
 
  result.push(cur);
  return result;
}
 
// ─── XLSX Parser ─────────────────────────────────────────────
 
async function parseXLSX(file) {
  // Dynamically import SheetJS so it doesn't bloat the initial bundle
  let XLSX;
  try {
    XLSX = await import('xlsx');
  } catch {
    throw new Error('SheetJS (xlsx) is not installed. Run: npm install xlsx');
  }
 
  const buffer  = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
 
  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet     = workbook.Sheets[sheetName];
 
  // Convert to array of arrays
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
 
  if (!raw || raw.length < 2) {
    throw new Error('The Excel file appears to be empty or has only a header row.');
  }
 
  const headers  = raw[0].map(h => String(h).trim());
  const dataRows = raw.slice(1).filter(row => row.some(c => c !== '' && c !== null && c !== undefined));
 
  const rows = dataRows.map(cells => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = cells[i];
      // Normalise dates from Excel
      if (val instanceof Date) {
        val = val.toISOString().slice(0, 10);
      } else {
        val = String(val == null ? '' : val).trim();
      }
      obj[h] = val;
    });
    return obj;
  });
 
  return { headers, rows, raw };
}
 
// ─── File reading helpers ─────────────────────────────────────
 
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file, 'UTF-8');
  });
}
 
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(new Uint8Array(e.target.result));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}