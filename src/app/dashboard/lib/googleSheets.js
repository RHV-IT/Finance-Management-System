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
 
// ─── Internal: call our server route ─────────────────────────
 
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
        const raw     = await fetchTabValues(sheetId, tabName, range);
        const headers = (raw[headerRow - 1] || []).map(h => String(h).trim());
 
        if (!headers.length) {
            return {
                rows:     [],
                warnings: [`Tab "${tabName}" appears empty or header row ${headerRow} is missing.`],
                meta:     {},
            };
        }
 
        const { mappedRows, unmappedFields } = applyColumnMap(headers, raw.slice(headerRow), columnMap);
 
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
 
// ─── Smart fetch — picks mode automatically ───────────────────
 
export async function fetchSheet(connection, _apiKey = null) {
    const mode = connection.tabMode || 'single';
    switch (mode) {
        case 'multi': return fetchMultiTab(connection, null);
        case 'auto':  return fetchAllTabs(connection, null);
        default:      return fetchSheetTab(connection, null);
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
 
function applyColumnMap(headers, dataRows, columnMap) {
    const headerIndex = {};
    headers.forEach((h, i) => { headerIndex[normalise(h)] = i; });
 
    const fieldToIndex   = {};
    const unmappedFields = [];
 
    Object.entries(columnMap).forEach(([ourField, theirHeader]) => {
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