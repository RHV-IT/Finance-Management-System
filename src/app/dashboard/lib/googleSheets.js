/**
 * lib/googleSheets.js
 *
 * Client-side. Does NOT call Google directly.
 * All requests go through /api/sheets/fetch (service account on the server).
 *
 * This means:
 * - No API key needed in the browser
 * - Works for public AND private sheets
 * - Sheet just needs to be shared with the service account
 */
 
import { meltScorecard, colLetterToIndex } from './Scorecardparser';
 
// ─── Internal: call our server route ─────────────────────────

function parseRangeStartRow(range) {
    if (!range) return 1;
    // Matches "B5:P45", "A1:Z", "Sheet1!B5:P45" — pulls the row number
    // attached to the FIRST cell reference, if any.
    const match = range.match(/(?:![A-Z]+|^[A-Z]+)(\d+)/);
    return match ? parseInt(match[1], 10) : 1; // no digits = whole column = starts at row 1
}
 
async function fetchTabValues(sheetId, tabName, range = 'A:Z') {
    const res = await fetch('/api/sheets/fetch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sheetId, tabName, range }),
    });
 
    const data = await res.json();
 
    if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
    }
 
    return data.values || [];
}
 
// ─── Fetch one tab ────────────────────────────────────────────
 
export async function fetchSheetTab(connection, _apiKey = null, tabOverride = null) {
    const {
        sheetId,
        range        = 'A:Z',
        columnMap    = {},
        headerRow    = 1,
        fillDown     = [],
        module:      _module,
        id:          _connectionId,
        dept:        _dept,
    } = connection;
 
    const tabName = tabOverride?.name || connection.tabName;
    const key     = tabOverride?.key  || connection.tabName;
 
    if (!sheetId || sheetId.includes('YOUR_')) {
        return {
            rows:     [],
            warnings: [`Sheet not connected for "${connection.label || _module}". Add the Sheet ID in Settings.`],
            meta:     {},
        };
    }
 
    if (!tabName) {
        return {
            rows:     [],
            warnings: [`No tab name set for "${connection.label || _module}".`],
            meta:     {},
        };
    }
 
    try {
        // Fetch via server — service account handles auth
        const raw = await fetchTabValues(sheetId, tabName, range);
 
        // headerRow is always the ABSOLUTE row number as seen in the actual
        // sheet (what you'd count if you scrolled to it) — never an index
        // into the fetched array. But `raw` only contains whatever rows
        // Range actually asked for: if Range is "B5:P45", raw[0] is sheet
        // row 5, not row 1. So we have to work out where Range starts and
        // offset headerRow against THAT, not against 0.
        const rangeStartRow  = parseRangeStartRow(range);
        const headerIdxInRaw = headerRow - rangeStartRow; // 0-based index into `raw`
 
        if (headerIdxInRaw < 0) {
            return {
                rows:     [],
                warnings: [`Header Row (${headerRow}) is above where Range "${range}" starts (row ${rangeStartRow}). Header Row must fall inside the fetched Range.`],
                meta:     {},
            };
        }
 
        const headers = (raw[headerIdxInRaw] || []).map(h => String(h).trim());
 
        if (!headers.length) {
            return {
                rows:     [],
                warnings: [`Tab "${tabName}" appears empty or header row ${headerRow} is missing.`],
                meta:     {},
            };
        }
 
        const { mappedRows, unmappedFields } = applyColumnMap(headers, raw.slice(headerIdxInRaw + 1), columnMap);
 
        // Fill down merged cells
        const filledRows = fillDownMerged(mappedRows, fillDown);
 
        // Derive period
        const period = tabOverride?.key
            || (connection.periodSource === 'tabName' ? parsePeriodFromString(tabName) : null)
            || derivePeriodFromRows(connection, filledRows)
            || tabName;
 
        const warnings = unmappedFields.length > 0
            ? [`Fields not found in sheet: ${unmappedFields.join(', ')}. Available: ${headers.join(', ')}`]
            : [];
 
        const rows = filledRows.map(r => ({
            ...r,
            _period:       period,
            _key:          key,
            _tab:          tabName,
            _module:       _module,
            _connectionId: _connectionId,
            _dept:         _dept,
        }));
 
        return {
            rows,
            warnings,
            meta: { sheetId, tabName, key, period, rowCount: rows.length, headers, fetchedAt: new Date().toISOString() },
        };
 
    } catch (err) {
        return { rows: [], warnings: [err.message], meta: {} };
    }
}
 
// ─── Fetch multiple tabs ──────────────────────────────────────
 
export async function fetchMultiTab(connection, _apiKey = null) {
    const { tabs = [] } = connection;
 
    if (!tabs.length) {
        return { rows: [], warnings: ['No tabs configured. Add tabs in Settings.'], meta: {} };
    }
 
    const results = await Promise.allSettled(
        tabs.map(tab => fetchSheetTab(connection, null, tab))
    );
 
    const allRows     = [];
    const allWarnings = [];
 
    results.forEach((result, i) => {
        const tab = tabs[i];
        if (result.status === 'fulfilled') {
            allRows.push(...result.value.rows);
            if (result.value.warnings.length) {
                allWarnings.push(`[${tab.name}] ${result.value.warnings.join(' ')}`);
            }
        } else {
            allWarnings.push(`[${tab.name}] Failed: ${result.reason?.message}`);
        }
    });
 
    return {
        rows:     allRows,
        warnings: allWarnings,
        meta: {
            sheetId:   connection.sheetId,
            tabMode:   'multi',
            tabCount:  tabs.length,
            rowCount:  allRows.length,
            keys:      tabs.map(t => t.key).filter(Boolean),
            fetchedAt: new Date().toISOString(),
        },
    };
}
 
// ─── Auto-detect all tabs ─────────────────────────────────────
 
export async function fetchAllTabs(connection, _apiKey = null) {
    const { sheetId } = connection;
 
    if (!sheetId || sheetId.includes('YOUR_')) {
        return { rows: [], warnings: ['Sheet ID not set.'], meta: {} };
    }
 
    try {
        const res  = await fetch(`/api/sheets/fetch?sheetId=${encodeURIComponent(sheetId)}`);
        const data = await res.json();
 
        if (!res.ok || !data.ok) {
            return { rows: [], warnings: [data.error || 'Could not fetch sheet metadata.'], meta: {} };
        }
 
        const tabs = (data.tabs || []).map(name => ({
            name,
            key: parsePeriodFromString(name) || name,
        }));
 
        if (!tabs.length) {
            return { rows: [], warnings: ['No tabs found in this sheet.'], meta: {} };
        }
 
        return fetchMultiTab({ ...connection, tabs }, null);
 
    } catch (err) {
        return { rows: [], warnings: [`Auto-detect failed: ${err.message}`], meta: {} };
    }
}
 
// ─── Fetch a KPI scorecard tab (wide → long) ──────────────────
//
// For sheets shaped like a report card rather than a record register:
// one row per KPI, one column per period. See lib/scorecardParser.js for
// the melt/decode logic. Config lives under connection.scorecard:
//
//   {
//     "tabMode": "scorecard",
//     "range": "A6:Q57",
//     "scorecard": {
//       "dataStartOffset": 2,          // rows to skip within `range` before real data starts
//       "colMap": { "sNo":"A","category":"B","kpiNo":"C","measure":"D","unit":"E" },
//       "periodCols": { "F": {"key":"2026-01","label":"JAN"}, ... },   // key = literal period
//       "compositeOverrides": [
//         { "when": {"category":"...","kpiNo":"1"}, "labels":["Pharmacist","Pharm. Tech.","Porter","Admin"], "delimiter":":" },
//         { "when": {"category":"...","kpiNo":"3"}, "labels":["Highest","Lowest"], "delimiter":"---" }
//       ]
//     }
//   }
 
export async function fetchScorecardTab(connection, _apiKey = null) {
    const {
        sheetId,
        tabName,
        range     = 'A6:Q60',
        module:   _module,
        id:       _connectionId,
        dept:     _dept,
        scorecard = {},
    } = connection;
 
    if (!sheetId || sheetId.includes('YOUR_')) {
        return { rows: [], warnings: [`Sheet not connected for "${connection.label || _module}".`], meta: {} };
    }
    if (!tabName) {
        return { rows: [], warnings: [`No tab name set for "${connection.label || _module}".`], meta: {} };
    }
 
    try {
        const raw = await fetchTabValues(sheetId, tabName, range);
 
        if (!raw.length) {
            return { rows: [], warnings: [`Tab "${tabName}" returned no rows for range "${range}".`], meta: {} };
        }
 
        const { rows: melted, warnings } = meltScorecard(raw, {
            startRow:           scorecard.dataStartOffset ?? 2,
            colMap:             scorecard.colMap,
            periodCols:         scorecard.periodCols || scorecard.monthCols,
            compositeOverrides: scorecard.compositeOverrides || [],
        });
 
        const rows = melted.map(r => ({
            ...r,
            _key:          tabName,
            _tab:          tabName,
            _module:       _module,
            _connectionId: _connectionId,
            _dept:         _dept,
        }));
 
        return {
            rows,
            warnings,
            meta: { sheetId, tabName, rowCount: rows.length, fetchedAt: new Date().toISOString() },
        };
 
    } catch (err) {
        return { rows: [], warnings: [err.message], meta: {} };
    }
}
 
// ─── Fetch a KPI scorecard spread across multiple tabs ────────
//
// For "one tab per month" scorecards (e.g. RHV's 2025 architecture, where
// each month is its own tab with a weekly breakdown: month-total + WK1–4).
// Each entry in connection.tabs describes one tab and its own periodCols
// (since the columns represent different weeks/labels per tab); colMap and
// compositeOverrides are shared from connection.scorecard unless a tab
// overrides them.
//
//   {
//     "tabMode": "scorecard_multi",
//     "range": "A6:N50",
//     "scorecard": {
//       "dataStartOffset": 2,
//       "colMap": { "sNo":"A","category":"B","kpiNo":"C","measure":"D","unit":"E" },
//       "compositeOverrides": [ ... ]
//     },
//     "tabs": [
//       {
//         "name": "January",
//         "periodCols": {
//           "F": {"key":"2025-01",    "label":"JAN (Month Total)"},
//           "G": {"key":"2025-01-W1", "label":"1st–8th"},
//           "H": {"key":"2025-01-W2", "label":"9th–15th"},
//           "I": {"key":"2025-01-W3", "label":"16th–22nd"},
//           "J": {"key":"2025-01-W4", "label":"23rd–31st"}
//         }
//       },
//       { "name": "February", "periodCols": { ... } }
//     ]
//   }
 
export async function fetchScorecardMultiTab(connection, _apiKey = null) {
    const {
        sheetId,
        range     = 'A6:N60',
        module:   _module,
        id:       _connectionId,
        dept:     _dept,
        scorecard = {},
        tabs      = [],
    } = connection;
 
    if (!sheetId || sheetId.includes('YOUR_')) {
        return { rows: [], warnings: [`Sheet not connected for "${connection.label || _module}".`], meta: {} };
    }
    if (!tabs.length) {
        return { rows: [], warnings: ['No tabs configured for this scorecard. Add tabs in Settings.'], meta: {} };
    }
 
    const results = await Promise.allSettled(
        tabs.map(async tab => {
            const raw = await fetchTabValues(sheetId, tab.name, tab.range || range);
            if (!raw.length) throw new Error(`Tab "${tab.name}" returned no rows for range "${tab.range || range}".`);
 
            const { rows: melted, warnings } = meltScorecard(raw, {
                startRow:           tab.dataStartOffset ?? scorecard.dataStartOffset ?? 2,
                colMap:             tab.colMap || scorecard.colMap,
                periodCols:         tab.periodCols || tab.monthCols,
                compositeOverrides: tab.compositeOverrides || scorecard.compositeOverrides || [],
            });
 
            return {
                warnings,
                rows: melted.map(r => ({
                    ...r,
                    _key:          tab.name,
                    _tab:          tab.name,
                    _module:       _module,
                    _connectionId: _connectionId,
                    _dept:         _dept,
                })),
            };
        })
    );
 
    const allRows     = [];
    const allWarnings = [];
 
    results.forEach((result, i) => {
        const tab = tabs[i];
        if (result.status === 'fulfilled') {
            allRows.push(...result.value.rows);
            if (result.value.warnings.length) {
                allWarnings.push(`[${tab.name}] ${result.value.warnings.join(' ')}`);
            }
        } else {
            allWarnings.push(`[${tab.name}] Failed: ${result.reason?.message}`);
        }
    });
 
    return {
        rows:     allRows,
        warnings: allWarnings,
        meta: {
            sheetId,
            tabMode:   'scorecard_multi',
            tabCount:  tabs.length,
            rowCount:  allRows.length,
            fetchedAt: new Date().toISOString(),
        },
    };
}
 
// ─── Smart fetch — picks mode automatically ───────────────────
 
export async function fetchSheet(connection, _apiKey = null) {
    const mode = connection.tabMode || 'single';
    switch (mode) {
        case 'multi':           return fetchMultiTab(connection, null);
        case 'auto':             return fetchAllTabs(connection, null);
        case 'scorecard':        return fetchScorecardTab(connection, null);
        case 'scorecard_multi':  return fetchScorecardMultiTab(connection, null);
        default:                 return fetchSheetTab(connection, null);
    }
}
 
// ─── Test a sheet connection ──────────────────────────────────
 
export async function testSheetConnection(sheetId, _apiKey = null) {
    if (!sheetId) return { ok: false, error: 'Missing sheet ID.' };
 
    try {
        const res  = await fetch(`/api/sheets/fetch?sheetId=${encodeURIComponent(sheetId)}`);
        const data = await res.json();
        return data;
    } catch (err) {
        return { ok: false, error: err.message };
    }
}
 
export function extractSheetId(url) {
    if (!url) return null;
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}
 
// ─── Fill down merged cells ───────────────────────────────────
 
function fillDownMerged(rows, fields = []) {
    if (!fields.length) return rows;
    const lastValues = {};
    return rows.map(row => {
        fields.forEach(field => {
            const value = row[field];
            if (value !== undefined && value !== null && value !== '') {
                lastValues[field] = value;
            } else if (lastValues[field] !== undefined) {
                row[field] = lastValues[field];
            }
        });
        return row;
    });
}
 
// ─── Column mapping ───────────────────────────────────────────
//
// Each entry in columnMap can be one of two things:
//
//   1. A plain string — matched against the sheet's actual header text,
//      exact then fuzzy. This is the original behavior, used by every
//      existing connection (kitchen store, IT KPI, etc.) — unchanged.
//        "qty": "Qty On Hand"
//
//   2. { "col": "F" } — matched by column POSITION instead, ignoring
//      whatever text (if any) is in that header cell. Use this when:
//        - the column has no header at all (blank cell), or
//        - the header text isn't stable across tabs — e.g. a "multi"
//          connection where each monthly tab labels the same column
//          differently ("JAN" in the January tab, "FEB" in February...).
//          Text-matching would silently break the moment the label
//          changes; position-matching doesn't care what the label says.
//        "value": { "col": "F" }
 
function applyColumnMap(headers, dataRows, columnMap) {
    const headerIndex = {};
    headers.forEach((h, i) => { headerIndex[normalise(h)] = i; });
 
    const fieldToIndex   = {};
    const unmappedFields = [];
 
    Object.entries(columnMap).forEach(([ourField, spec]) => {
        // Position-based reference — resolve directly, no header lookup at all.
        if (spec && typeof spec === 'object' && spec.col) {
            fieldToIndex[ourField] = colLetterToIndex(spec.col);
            return;
        }
 
        // Text-based reference — original exact-then-fuzzy header matching.
        const theirHeader = spec;
        const norm  = normalise(theirHeader);
        if (headerIndex[norm] !== undefined) { fieldToIndex[ourField] = headerIndex[norm]; return; }
        const fuzzy = Object.keys(headerIndex).find(h => h.includes(norm) || norm.includes(h));
        if (fuzzy !== undefined) { fieldToIndex[ourField] = headerIndex[fuzzy]; return; }
        unmappedFields.push(`${ourField} (expected: "${theirHeader}")`);
    });
 
    const mappedRows = dataRows
        .filter(row => row && row.some(cell => cell !== '' && cell != null))
        .map(row => {
            const obj = {};
            Object.entries(fieldToIndex).forEach(([field, idx]) => {
                obj[field] = row[idx] != null ? String(row[idx]).trim() : '';
            });
            return obj;
        })
        .filter(obj => Object.values(obj).some(v => v !== ''));
 
    return { mappedRows, unmappedFields };
}
 
// ─── Period helpers ───────────────────────────────────────────
 
function derivePeriodFromRows(connection, rows) {
    if (connection.periodSource !== 'dateColumn') return null;
    const firstDate = rows[0]?.date || rows[0]?.Date;
    if (!firstDate) return null;
    const d = new Date(firstDate);
    if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return null;
}
 
export function parsePeriodFromString(str) {
    if (!str) return null;
    const s = String(str).trim();
    if (/^\d{4}-\d{2}$/.test(s)) return s;
 
    const months      = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const shortMonths = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const lower       = s.toLowerCase();
 
    for (let i = 0; i < 12; i++) {
        if (lower.includes(months[i]) || lower.includes(shortMonths[i])) {
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
 
function normalise(str) {
    return String(str)
        .toLowerCase()
        .replace(/[\s\-_\/\(\)\.]+/g, '')
        .replace(/[₦#%]/g, '');
}
 