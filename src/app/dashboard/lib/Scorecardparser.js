/**
 * lib/scorecardParser.js
 *
 * Turns a "wide" KPI scorecard (one row per KPI, one column per month)
 * into "long" rows (one row per KPI per month) so it drops straight into
 * the existing KPICard / DynamicViz table+line/bar components, which all
 * expect one row = one data point with a `_period`.
 *
 * Also handles composite cells — a single month's cell that's actually
 * several sub-metrics packed together with a delimiter, e.g.
 *   "04:04:01:01"  → Pharmacist:4, Pharm. Tech.:4, Porter:1, Admin:1
 *   "172---59"     → Highest:172, Lowest:59
 *
 * Two ways a row gets split:
 *   1. Auto (colon): if the row's "unit" cell (column E in the RHV sheet)
 *      itself contains ':' separated labels, e.g. "Pharmacist: Pharm. Tech.: Porter",
 *      each month's cell is assumed to use the same ':' delimiter and gets
 *      zipped against those labels.
 *   2. Override: explicit config for rows where the sheet's own labels are
 *      missing, wrong, or use a different delimiter (e.g. "---"). Overrides
 *      always win over the auto-colon path.
 */
 
export function colLetterToIndex(letter) {
  let n = 0;
  for (const c of String(letter).toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}
 
// Fallback only — real connections should always pass an explicit `periodCols`
// with literal keys (e.g. "2026-01"), since the current year can't be assumed.
function buildDefaultMonthCols(year = new Date().getFullYear()) {
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const labels = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEPT','OCT','NOV','DEC'];
  const letters = ['F','G','H','I','J','K','L','M','N','O','P','Q'];
  const out = {};
  letters.forEach((letter, i) => { out[letter] = { key: `${year}-${months[i]}`, label: labels[i] }; });
  return out;
}
const DEFAULT_MONTH_COLS = buildDefaultMonthCols();
 
const DEFAULT_COL_MAP = { sNo: 'A', category: 'B', kpiNo: 'C', measure: 'D', unit: 'E' };
 
/**
 * @param {Array<Array<string>>} rawRows - raw 2D values from the sheet range
 * @param {Object} opts
 * @param {number}   opts.startRow            - row index (within rawRows) where KPI data starts
 * @param {Object}   opts.colMap              - { sNo, category, kpiNo, measure, unit } → column letters
 * @param {Object}   opts.periodCols          - { colLetter: { key: '2026-01', label: 'JAN' } }
 *                                              `key` is now the LITERAL full period string (not just "01") —
 *                                              this lets the same melt logic express monthly periods
 *                                              ("2026-01") *or* weekly-within-month periods
 *                                              ("2025-01-W1") depending on the sheet's shape.
 * @param {Object}   [opts.monthCols]         - deprecated alias for periodCols, kept for back-compat
 * @param {Array}    opts.compositeOverrides  - [{ when: {category,kpiNo,...}, labels: [...], delimiter: '---' }]
 * @returns {{ rows: Array, warnings: Array<string> }}
 */
export function meltScorecard(rawRows, opts = {}) {
  const {
    startRow = 0,
    colMap = DEFAULT_COL_MAP,
    periodCols = opts.monthCols || DEFAULT_MONTH_COLS,
    compositeOverrides = [],
    // Used only when colMap has no "category" entry at all — i.e. the sheet
    // has just one label column (e.g. "KPI/Metric") and no separate grouping
    // column. Every KPI falls under this single bucket instead of showing up
    // with a blank category.
    defaultCategory = 'KPIs',
  } = opts;
 
  const categoryIsMapped = colMap && colMap.category !== undefined;
 
  const idx = Object.fromEntries(
    Object.entries(colMap).map(([k, letter]) => [k, colLetterToIndex(letter)])
  );
 
  const periodEntries = Object.entries(periodCols).map(([letter, info]) => ({
    col: colLetterToIndex(letter),
    key: info.key,      // literal full period, e.g. "2026-01" or "2025-01-W1"
    label: info.label,
  }));
 
  const overrides = compositeOverrides.map(o => ({
    ...o,
    delimiter: o.delimiter || ':',
    match: buildMatcher(o.when || {}),
  }));
 
  let lastCategory = '';
  const rows = [];
  const warnings = [];
 
  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
 
    // Guard: idx.X is undefined when that role was never mapped (e.g. sheets
    // with no separate Category column — just "KPI/Metric" + months). Without
    // this check, row[undefined] is undefined, and String(undefined).trim()
    // silently becomes the literal text "undefined" instead of blank.
    const category = idx.category !== undefined ? String(row[idx.category] ?? '').trim() : '';
    const kpiNo    = idx.kpiNo    !== undefined ? String(row[idx.kpiNo]    ?? '').trim() : '';
    const measure  = idx.measure  !== undefined ? String(row[idx.measure]  ?? '').trim() : '';
    const unit     = idx.unit     !== undefined ? String(row[idx.unit]     ?? '').trim() : '';
 
    // Category is merged in the sheet — only the first row of each block has it.
    if (category) lastCategory = category;
    if (!measure) continue; // blank / section-break row
 
    const effectiveCategory = category || lastCategory || (categoryIsMapped ? '' : defaultCategory);
    const rowCtx = { category: effectiveCategory, kpiNo, measure, unit };
 
    const override = overrides.find(o => o.match(rowCtx));
    const unitLabels = unit.split(':').map(s => s.trim()).filter(Boolean);
    const isAutoColon = !override && unitLabels.length > 1;
 
    periodEntries.forEach(({ col, key, label }) => {
      const raw  = row[col];
      const cell = raw === undefined || raw === null ? '' : String(raw).trim();
      if (cell === '' || cell === '-') return;
 
      const period = key; // literal — caller decides whether it's "2026-01" or "2025-01-W1"
      const base = { category: effectiveCategory, kpiNo, measure, unit, _period: period, _monthLabel: label };
 
      if (override) {
        const parts = cell.split(override.delimiter).map(s => s.trim());
        if (parts.length !== override.labels.length) {
          warnings.push(
            `"${measure}" (${period}): expected ${override.labels.length} values split on "${override.delimiter}", got ${parts.length} — raw: "${cell}"`
          );
        }
        override.labels.forEach((subLabel, i) => {
          const v = parts[i];
          if (v === undefined || v === '') return;
          rows.push({ ...base, subLabel, metric: `${measure} — ${subLabel}`, value: v });
        });
      } else if (isAutoColon && cell.includes(':')) {
        const parts = cell.split(':').map(s => s.trim());
        if (parts.length !== unitLabels.length) {
          warnings.push(
            `"${measure}" (${period}): unit labels imply ${unitLabels.length} values, got ${parts.length} — raw: "${cell}". Consider adding a compositeOverride for this row.`
          );
        }
        unitLabels.forEach((subLabel, i) => {
          const v = parts[i];
          if (v === undefined || v === '') return;
          rows.push({ ...base, subLabel, metric: `${measure} — ${subLabel}`, value: v });
        });
      } else {
        rows.push({ ...base, subLabel: null, metric: measure, value: cell });
      }
    });
  }
 
  return { rows, warnings };
}
 
function buildMatcher(when) {
  return rec => Object.entries(when).every(([k, v]) => String(rec[k] ?? '').trim() === String(v).trim());
}
 