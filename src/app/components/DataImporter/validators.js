/**
 * components/DataImporter/validators.js
 *
 * Two jobs:
 * 1. Header mapping  — map uploaded column headers to the config's column keys
 *                      (case-insensitive, tolerates spaces/underscores/hyphens)
 * 2. Row validation  — check types, required fields, enum values per row
 */
 
// ─── 1. Header Mapping ────────────────────────────────────────
 
/**
 * Try to match every uploaded header to a config column.
 * Returns a mapping object: { uploadedHeader → configColumn } and a list of issues.
 *
 * @param {string[]} uploadedHeaders  - headers from the parsed file
 * @param {object[]} configColumns    - columns from importConfig.js
 * @returns {{ mapping: object, matched: object[], unmatched: string[], missing: object[] }}
 */
export function mapHeaders(uploadedHeaders, configColumns) {
  const normalise = s =>
    String(s)
      .toLowerCase()
      .replace(/[\s\-_().\/₦]+/g, '')   // strip spaces, special chars, ₦
      .replace(/amount$/, '')            // "amount" suffix is noise
      .replace(/value$/, '');
 
  const uploadedNorm = uploadedHeaders.map(h => ({
    original: h,
    norm:     normalise(h),
  }));
 
  const mapping  = {};   // configKey → uploadedHeader
  const matched  = [];
  const unmatched = [];
  const missing  = [];
 
  configColumns.forEach(col => {
    const colNorm = normalise(col.label);
    const colKeyNorm = normalise(col.key);
 
    // Try exact match on label, then key, then partial
    const found = uploadedNorm.find(u =>
      u.norm === colNorm ||
      u.norm === colKeyNorm ||
      u.norm.includes(colNorm) ||
      colNorm.includes(u.norm)
    );
 
    if (found) {
      mapping[col.key] = found.original;
      matched.push({ config: col, uploaded: found.original });
    } else if (col.required) {
      missing.push(col);
    }
  });
 
  // Headers in the file that didn't match any config column
  const mappedHeaders = new Set(Object.values(mapping));
  uploadedHeaders.forEach(h => {
    if (!mappedHeaders.has(h)) unmatched.push(h);
  });
 
  return { mapping, matched, unmatched, missing };
}
 
// ─── 2. Row Validation ────────────────────────────────────────
 
/**
 * Validate and coerce all rows against the config column definitions.
 *
 * @param {object[]} rows          - raw rows from the parser (header → string value)
 * @param {object}   mapping       - header mapping from mapHeaders()
 * @param {object[]} configColumns - columns from importConfig.js
 * @returns {{ valid: object[], errors: object[], warnings: object[] }}
 */
export function validateRows(rows, mapping, configColumns) {
  const valid    = [];
  const errors   = [];
  const warnings = [];
 
  rows.forEach((rawRow, rowIdx) => {
    const rowNum  = rowIdx + 2; // +2 for 1-indexed + header
    const rowErrs = [];
    const rowWarns= [];
    const out     = {};
 
    configColumns.forEach(col => {
      const uploadedHeader = mapping[col.key];
      const rawVal = uploadedHeader !== undefined ? (rawRow[uploadedHeader] || '') : '';
      const strVal = String(rawVal).trim();
 
      // Required check
      if (col.required && strVal === '') {
        rowErrs.push(`"${col.label}" is required but empty`);
        out[col.key] = null;
        return;
      }
 
      if (strVal === '') {
        out[col.key] = null;
        return;
      }
 
      // Type coercion
      switch (col.type) {
        case 'number': {
          // Strip ₦, commas, spaces before parsing
          const cleaned = strVal.replace(/[₦,\s]/g, '');
          const num = parseFloat(cleaned);
          if (isNaN(num)) {
            rowErrs.push(`"${col.label}" should be a number, got: "${strVal}"`);
            out[col.key] = null;
          } else {
            out[col.key] = num;
          }
          break;
        }
 
        case 'date': {
          const parsed = parseDate(strVal);
          if (!parsed) {
            rowWarns.push(`"${col.label}" date "${strVal}" could not be parsed — stored as-is`);
            out[col.key] = strVal;
          } else {
            out[col.key] = parsed;
          }
          break;
        }
 
        case 'boolean': {
          const lower = strVal.toLowerCase();
          if (['yes','true','1','y'].includes(lower))  out[col.key] = true;
          else if (['no','false','0','n'].includes(lower)) out[col.key] = false;
          else {
            rowWarns.push(`"${col.label}" should be Yes/No, got: "${strVal}" — defaulting to false`);
            out[col.key] = false;
          }
          break;
        }
 
        case 'enum': {
          const match = (col.values || []).find(
            v => v.toLowerCase() === strVal.toLowerCase()
          );
          if (!match && col.required) {
            rowErrs.push(
              `"${col.label}" must be one of: ${(col.values || []).join(', ')} — got: "${strVal}"`
            );
            out[col.key] = strVal; // store as-is, let app handle
          } else {
            out[col.key] = match || strVal;
          }
          break;
        }
 
        default: { // string
          out[col.key] = strVal;
          break;
        }
      }
    });
 
    if (rowErrs.length > 0) {
      errors.push({ row: rowNum, data: out, errors: rowErrs });
    } else {
      valid.push(out);
      if (rowWarns.length > 0) {
        warnings.push({ row: rowNum, warnings: rowWarns });
      }
    }
  });
 
  return { valid, errors, warnings };
}
 
// ─── Date parsing ─────────────────────────────────────────────
// Accepts: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, Excel serial
 
function parseDate(str) {
  if (!str) return null;
  const s = str.trim();
 
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
 
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const date = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
    if (!isNaN(date)) return date.toISOString().slice(0, 10);
  }
 
  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    const date = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
    if (!isNaN(date)) return date.toISOString().slice(0, 10);
  }
 
  // Excel serial number
  if (/^\d{4,5}$/.test(s)) {
    const serial = parseInt(s);
    const date = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(date)) return date.toISOString().slice(0, 10);
  }
 
  // Natural date string
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
 
  return null;
}
 
// ─── Summary helpers ──────────────────────────────────────────
 
/**
 * Build a human-readable validation summary.
 */
export function buildSummary(valid, errors, warnings, mapping, missing) {
  const lines = [];
 
  if (valid.length > 0) {
    lines.push({ type:'success', msg:`✓ ${valid.length} row${valid.length !== 1 ? 's' : ''} ready to import` });
  }
  if (errors.length > 0) {
    lines.push({ type:'error', msg:`✗ ${errors.length} row${errors.length !== 1 ? 's' : ''} have errors and will be skipped` });
  }
  if (warnings.length > 0) {
    lines.push({ type:'warn', msg:`⚠ ${warnings.length} row${warnings.length !== 1 ? 's' : ''} imported with warnings` });
  }
  if (missing.length > 0) {
    lines.push({ type:'error', msg:`✗ Required columns not found: ${missing.map(c => c.label).join(', ')}` });
  }
 
  return lines;
}