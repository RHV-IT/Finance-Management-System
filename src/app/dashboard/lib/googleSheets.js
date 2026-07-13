/**
 * lib/googleSheets.js
 *
 * Fetches data from a public Google Sheet tab and applies the
 * column mapping defined in importConfig.js SHEET_CONNECTIONS.
 *
 * USAGE:
 *   import { fetchSheetTab } from './googleSheets';
 *   const rows = await fetchSheetTab(connection, apiKey);
 *
 * PRIVATE SHEETS (future):
 *   Replace the fetch URL with an OAuth-authenticated request.
 *   The rest of this file stays the same.
 */
 
/**
 * Fetch a single sheet tab and return mapped row objects.
 *
 * @param {object} connection  - one entry from SHEET_CONNECTIONS
 * @param {string} apiKey      - Google Sheets API key
 * @returns {Promise<{ rows: object[], warnings: string[], meta: object }>}
 */
export async function fetchSheetTab(connection, apiKey) {
  const { sheetId, tabName, range = 'A:Z', columnMap, headerRow = 1 } = connection;
  console.log(`API KEY: ${apiKey}`);
 
  if (!sheetId || sheetId === 'YOUR_SHEET_ID_HERE') {
    return { rows: [], warnings: ['No sheet ID configured for this module.'], meta: {} };
  }
 
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    return { rows: [], warnings: ['No Google API key configured. Add it in Settings.'], meta: {} };
  }
 
  const encodedTab  = encodeURIComponent(tabName);
  const encodedRange= encodeURIComponent(`${tabName}!${range}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?key=${apiKey}`;
 
  try {
    const res = await fetch(url);
 
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${res.status}`;
 
      if (res.status === 403) {
        return {
          rows: [],
          warnings: [`Permission denied. Make sure the sheet is set to "Anyone with the link can view". (${msg})`],
          meta: {},
        };
      }
      if (res.status === 404) {
        return {
          rows: [],
          warnings: [`Sheet or tab not found. Check the Sheet ID and tab name "${tabName}". (${msg})`],
          meta: {},
        };
      }
 
      return { rows: [], warnings: [`API error: ${msg}`], meta: {} };
    }
 
    const data = await res.json();
    const raw  = data.values || [];
 
    if (raw.length < headerRow) {
      return { rows: [], warnings: [`Sheet tab "${tabName}" appears to be empty.`], meta: {} };
    }
 
    // Parse headers from configured header row (1-indexed)
    const headers = (raw[headerRow - 1] || []).map(h => String(h).trim());
 
    if (headers.length === 0) {
      return { rows: [], warnings: [`Header row ${headerRow} is empty in tab "${tabName}".`], meta: {} };
    }
 
    const dataRows = raw.slice(headerRow); // everything after the header row
 
    // Apply column mapping: { ourField: 'Their Column Name' }
    const { mappedRows, unmappedFields, unmappedColumns } = applyColumnMap(
      headers, dataRows, columnMap
    );
 
    // Derive period from tab name if configured
    const period = derivePeriod(connection, mappedRows);
 
    // Tag every row with its source metadata
    const rows = mappedRows.map(r => ({
      ...r,
      _source: {
        sheetId,
        tabName,
        period,
        fetchedAt: new Date().toISOString(),
      },
    }));
 
    const warnings = [];
    if (unmappedFields.length > 0) {
      warnings.push(
        `These mapped fields were NOT found in the sheet: ${unmappedFields.join(', ')}. ` +
        `Available columns: ${headers.join(', ')}`
      );
    }
 
    return {
      rows,
      warnings,
      meta: {
        sheetId,
        tabName,
        period,
        rowCount:        rows.length,
        headers,
        unmappedFields,
        unmappedColumns,
        fetchedAt:       new Date().toISOString(),
      },
    };
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return {
        rows: [],
        warnings: ['Network error — check your internet connection.'],
        meta: {},
      };
    }
    return {
      rows: [],
      warnings: [`Unexpected error: ${err.message}`],
      meta: {},
    };
  }
}
 
// ─── Column mapping ───────────────────────────────────────────
 
/**
 * Map raw sheet rows (array of values) to objects using columnMap.
 * Case-insensitive, trims whitespace, fuzzy-matches common variations.
 */
function applyColumnMap(headers, dataRows, columnMap) {
  // Build a lookup: normalised header → original index
  const headerIndex = {};
  headers.forEach((h, i) => {
    headerIndex[normalise(h)] = i;
  });
 
  // For each field in columnMap, find the column index
  const fieldToIndex = {};
  const unmappedFields = [];
 
  Object.entries(columnMap).forEach(([ourField, theirHeader]) => {
    const norm = normalise(theirHeader);
 
    // Try exact match first
    if (headerIndex[norm] !== undefined) {
      fieldToIndex[ourField] = headerIndex[norm];
      return;
    }
 
    // Try fuzzy match — find the closest header
    const fuzzy = Object.keys(headerIndex).find(h =>
      h.includes(norm) || norm.includes(h)
    );
    if (fuzzy !== undefined) {
      fieldToIndex[ourField] = headerIndex[fuzzy];
      return;
    }
 
    unmappedFields.push(`${ourField} (expected: "${theirHeader}")`);
  });
 
  // Which columns in the sheet weren't mapped to anything
  const mappedIndices = new Set(Object.values(fieldToIndex));
  const unmappedColumns = headers.filter((_, i) => !mappedIndices.has(i));
 
  // Convert rows
  const mappedRows = dataRows
    .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
    .map(row => {
      const obj = {};
      Object.entries(fieldToIndex).forEach(([ourField, colIdx]) => {
        const raw = row[colIdx];
        obj[ourField] = raw != null ? String(raw).trim() : '';
      });
      return obj;
    })
    .filter(obj => Object.values(obj).some(v => v !== ''));
 
  return { mappedRows, unmappedFields, unmappedColumns };
}
 
// ─── Period derivation ────────────────────────────────────────
 
/**
 * Derive the YYYY-MM period string for a sheet tab.
 *
 * periodSource options:
 *   'tabName'    → parse period from the tab name itself ("Nov 25", "November 2025")
 *   'dateColumn' → read from mapped 'date' field in the data
 *   'manual'     → use connection.manualPeriod directly
 */
function derivePeriod(connection, rows) {
  const { periodSource = 'dateColumn', periodFormat, tabName, manualPeriod } = connection;
 
  if (periodSource === 'manual' && manualPeriod) {
    return manualPeriod;
  }
 
  if (periodSource === 'tabName') {
    return parsePeriodFromString(tabName);
  }
 
  if (periodSource === 'dateColumn' && rows.length > 0) {
    const firstDate = rows[0]?.date || rows[0]?.Date;
    if (firstDate) {
      const parsed = parseDate(firstDate);
      if (parsed) return parsed.slice(0, 7); // YYYY-MM
    }
  }
 
  // Fallback: current month
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
 
/**
 * Try to parse "November 2025", "Nov 25", "Nov-25", "2025-11" etc.
 * into "YYYY-MM" format.
 */
function parsePeriodFromString(str) {
  if (!str) return null;
  const s = String(str).trim();
 
  // Already YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return s;
 
  // "November 2025" or "Nov 2025"
  const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const shortNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 
  const lower = s.toLowerCase();
 
  for (let i = 0; i < 12; i++) {
    if (lower.includes(monthNames[i]) || lower.includes(shortNames[i])) {
      const yearMatch = s.match(/\d{4}/);
      const shortYear = s.match(/\b(\d{2})\b/);
      const year = yearMatch
        ? yearMatch[0]
        : shortYear
          ? (parseInt(shortYear[1]) > 50 ? `19${shortYear[1]}` : `20${shortYear[1]}`)
          : new Date().getFullYear();
      return `${year}-${String(i + 1).padStart(2, '0')}`;
    }
  }
 
  return null;
}
 
function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  // Try DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const date = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`);
    if (!isNaN(date)) return date.toISOString().slice(0, 10);
  }
  return null;
}
 
function normalise(str) {
  return String(str)
    .toLowerCase()
    .replace(/[\s\-_\/\(\)\.]+/g, '') // remove spaces, dashes, underscores, etc.
    .replace(/[₦#%]/g, '');
}
 
// ─── Sheet URL parser ─────────────────────────────────────────
 
/**
 * Extract sheet ID from a full Google Sheets URL.
 * Handles: /spreadsheets/d/SHEET_ID/edit, /spreadsheets/d/SHEET_ID/view etc.
 */
export function extractSheetId(url) {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}
 
/**
 * Build a preview URL for a sheet tab (opens in browser).
 */
export function buildSheetUrl(sheetId, tabName) {
  if (!sheetId) return null;
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}`;
  return tabName ? `${base}/edit#gid=0` : base;
}
 
/**
 * Test if a sheet is reachable with the given API key.
 * Returns { ok: boolean, error?: string, sheetTitle?: string, tabs?: string[] }
 */
export async function testSheetConnection(sheetId, apiKey) {
  if (!sheetId || !apiKey) {
    return { ok: false, error: 'Missing sheet ID or API key.' };
  }
 
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}&fields=properties.title,sheets.properties.title`;
 
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err?.error?.message || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      ok:         true,
      sheetTitle: data.properties?.title,
      tabs:       (data.sheets || []).map(s => s.properties?.title).filter(Boolean),
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}