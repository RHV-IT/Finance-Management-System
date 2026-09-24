'use client';

import { useState, useEffect } from 'react';
import { testSheetConnection, extractSheetId, parsePeriodFromString, fetchSheet } from '../dashboard/lib/googleSheets';
import { getApiKey } from '../dashboard/lib/useConfig';

const iStyle = {
    width: '100%', padding: '8px 10px',
    border: '1.5px solid var(--border)', borderRadius: 7,
    fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#fff',
};

const PAGES = ['inventory','pharmacy','store','overview','revenue','cashbook',
               'expenses','grn','supplychain','debtors','assets','kpi','weekly', 'hr', 'it', 'cssd'];

// Maintained by hand — one entry per page that has more than one real
// destination (a tab, or a secondary module used for just one KPI).
// Drives the "which tab/section" dropdown below instead of a free-typed
// module key. Add to this whenever a new tab gets wired into a page's
// actual code — this list is only as accurate as it's kept up to date;
// I've only filled in pages I've actually seen the source of.

const PAGE_MODULES = {
    inventory: [
        { value: 'stock_register', label: 'Stock Register' },
        { value: 'srv_receipts', label: 'SRV Receipts' },
        { value: 'stock_out', label: 'SIV Issues' },
        { value: 'reorder_alerts', label: 'Reorder Alerts' },
        { value: 'stock_movement', label: 'Stock Movement' },
        { value: 'inventory_valuation', label: 'Inventory Valuation' },
    ],

    pharmacy: [
        { value: 'drug_dispensing',      label: 'Dispensing / Usage tab' },
        { value: 'drug_stock',           label: 'Drug Stock tab' },
        { value: 'procurement_requests', label: 'My Requests tab' },
        { value: 'pharmacy_scorecard',   label: 'KPI Scorecard' },
    ],
    debtors: [
        { value: 'debtors',         label: 'Debtors & Receivables (main data)' },
        { value: 'revenue_monthly', label: 'Revenue (only feeds the Debtor/Revenue ratio KPI)' },
    ],

    store: [
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
    ],

    overview: [
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
    ],

    revenue: [
        { value: 'revenue_ledger', label: 'Revenue Ledger' },
    ],

    cashbook: [
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
    ],

    expenses: [
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
    ],

    grn: [
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
    ],

    supplychain: [
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
    ],

    debtors: [
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
    ],

    assets: [
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
    ],

    kpi: [
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
    ],

    weekly: [
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
    ],

    hr: [
        { value: '', label: '' },
        { value: '', label: '' },
        { value: '', label: '' },
    ],

    it: [
        { value: 'it_kpi_weekly', label: 'IT KPI Weekly' },
        { value: 'it_devices', label: 'IT Devices' },
        { value: 'it_recurrent_subscriptions', label: 'IT Recurrent Subscriptions' },
        { value: 'it_software_subscriptions', label: 'IT Software Subscriptions' },
        { value: 'it_network_downtime', label: 'IT Network Downtime' },
        { value: 'it_emr_downtime', label: 'IT EMR Downtime' },
        { value: 'it_software_projects', label: 'IT Software Projects' },
        { value: 'risk_register', label: 'Risk Register' },
        { value: 'emr_kpi', label: 'EMR KPI' },
    ],
    cssd: [
        { value: 'cssd_batches', label: 'CSSD Batches' },
        { value: 'cssd_packs', label: 'CSSD Packs' },
    ]
};

const FIELD_SUGGESTIONS = [
    'date','name','qty','total','dept','vendor','itemCode','unitCost','unitPrice',
    'uom','invoiceRef','recipient','description','status','category','value',
    'openingQty','closingBalance','totalReceipts','totalIssues','reorder',
    'reorderQty','totalValue','classification','pctOfTotal','poNo','grnNo',
];

function Field({ label, children, span }) {
    return (
        <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--navy)',
                marginBottom:5, textTransform:'uppercase', letterSpacing:0.4 }}>
                {label}
            </label>
            {children}
        </div>
    );
}

/**
 * ModulePicker — replaces a raw "type the module key" text input with a
 * dropdown of the actual tabs/sections known for the selected page (from
 * PAGE_MODULES above). Falls back to a plain input for pages that aren't
 * in the registry at all. Always offers a "not listed" escape hatch so a
 * genuinely new tab can still be typed by hand until someone adds it to
 * PAGE_MODULES.
 */
function ModulePicker({ page, value, onChange, error }) {
    const opts = PAGE_MODULES[page];

    if (!opts) {
        return (
            <>
                <input value={value} onChange={e => onChange(e.target.value)}
                    placeholder="stock_out"
                    style={{ ...iStyle, borderColor: error ? 'var(--red)' : undefined }} />
                {error && <div style={{ fontSize:10,color:'var(--red)',marginTop:3 }}>{error}</div>}
            </>
        );
    }

    const knownValue = opts.some(o => o.value === value);
    const dropdownValue = !value ? '' : (knownValue ? value : '__custom__');

    return (
        <>
            <select value={dropdownValue}
                onChange={e => onChange(e.target.value === '__custom__' ? '' : e.target.value)}
                style={{ ...iStyle, borderColor: error ? 'var(--red)' : undefined }}>
                <option value="">Select which tab/section…</option>
                {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                <option value="__custom__">✏️ Not listed — type my own</option>
            </select>
            {dropdownValue === '__custom__' && (
                <input value={value} onChange={e => onChange(e.target.value)}
                    placeholder="your-custom-module-key"
                    style={{ ...iStyle, marginTop:6 }} />
            )}
            {error && <div style={{ fontSize:10,color:'var(--red)',marginTop:3 }}>{error}</div>}
        </>
    );
}

/**
 * PreviewPanel — "what will this connection actually produce, right now".
 *
 * The key thing that makes this trustworthy rather than just a nice-looking
 * guess: it calls the SAME fetchSheet() function that powers every real
 * page in the app, on a "draft" connection object built from whatever's
 * currently in the form — not a separate simplified preview implementation
 * that could drift out of sync with what actually happens after saving.
 * If the preview shows it working, saving will show it working too.
 *
 * Manual button rather than auto-refresh on every keystroke — firing a
 * real network request on every letter typed would be both slow and
 * needlessly hammer the sheet, and an auto-refreshing table jumping around
 * while someone's still mid-edit is more confusing than helpful.
 */
function PreviewPanel({ connection, label, disabledReason }) {
    const [loading, setLoading] = useState(false);
    const [result,  setResult]  = useState(null); // { rows, warnings } | null
    const [error,   setError]   = useState(null);

    async function runPreview() {
        setLoading(true); setError(null); setResult(null);
        try {
            const { rows, warnings } = await fetchSheet(connection);
            setResult({ rows: rows || [], warnings: warnings || [] });
        } catch (err) {
            setError(err.message || 'Something went wrong fetching a preview.');
        }
        setLoading(false);
    }

    const sampleRows = (result?.rows || []).slice(0, 5);
    const columns = sampleRows[0] ? Object.keys(sampleRows[0]).filter(k => !k.startsWith('_')) : [];

    return (
        <div style={{ margin:'18px 0', padding:'16px 18px', background:'#F4F6F9', borderRadius:10, border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)' }}>
                    🔍 Preview{label ? ` — ${label}` : ''}
                    <span style={{ fontWeight:400, color:'var(--muted)', marginLeft:8 }}>
                        See real data before saving
                    </span>
                </div>
                <button onClick={runPreview} disabled={loading || !!disabledReason} title={disabledReason || ''} style={{
                    padding:'6px 14px', background: disabledReason ? '#C8CDD3' : 'var(--navy)', color:'#fff', border:'none',
                    borderRadius:7, fontSize:11, fontWeight:600, cursor: disabledReason ? 'not-allowed' : 'pointer', whiteSpace:'nowrap',
                }}>
                    {loading ? '⏳ Fetching…' : (result ? '↻ Refresh preview' : '🔍 Preview Data')}
                </button>
            </div>

            {disabledReason && !result && (
                <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:8 }}>{disabledReason}</div>
            )}

            {error && <div style={{ fontSize:11, color:'var(--red)', marginTop:10 }}>✗ {error}</div>}

            {result && (
                <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>
                        {result.rows.length} row{result.rows.length !== 1 ? 's' : ''} returned
                        {result.rows.length > 5 ? ' — showing the first 5' : ''}
                    </div>

                    {result.warnings.length > 0 && (
                        <div style={{ fontSize:10.5, color:'#9A7D0A', background:'#FEF9E7', border:'1px solid #F9E79F', borderRadius:6, padding:'8px 10px', marginBottom:10, lineHeight:1.6 }}>
                            {result.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                        </div>
                    )}

                    {sampleRows.length > 0 ? (
                        <div style={{ overflowX:'auto', background:'#fff', borderRadius:8, border:'1px solid var(--border)' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10.5 }}>
                                <thead>
                                    <tr>
                                        {columns.map(c => (
                                            <th key={c} style={{ textAlign:'left', padding:'6px 10px', borderBottom:'1.5px solid var(--border)', color:'var(--navy)', fontWeight:700, whiteSpace:'nowrap' }}>
                                                {c}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sampleRows.map((row, i) => (
                                        <tr key={i}>
                                            {columns.map(c => (
                                                <td key={c} style={{ padding:'6px 10px', borderBottom:'1px solid #F0F2F5', whiteSpace:'nowrap' }}>
                                                    {String(row[c] ?? '')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ fontSize:11, color:'var(--muted)' }}>
                            No rows came back — check the warnings above, or double-check Range / Header Row / column roles.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Builds a connection-shaped object from the form's CURRENT state, for
// preview purposes only — deliberately more lenient than handleSave's
// validation, since someone previewing mid-setup hasn't necessarily
// filled in every field yet (Label, Page, Section aren't needed to see
// what the sheet itself returns).
function buildPreviewConnection(form, colPairs) {
    const sheetId = extractSheetId(form.sheetId) || form.sheetId.trim();
    const base = { id: form.id, dept: form.dept, module: form.module, sheetId, tabMode: form.tabMode };

    if (form.tabMode === 'scorecard' || form.tabMode === 'scorecard_multi') {
        return { ...base, tabName: form.tabName, range: form.range, scorecard: form.scorecard, tabs: form.tabs };
    }
    return {
        ...base,
        tabName: form.tabName, range: form.range, headerRow: form.headerRow,
        tabs: form.tabs, periodSource: form.periodSource,
        columnMap: pairsToMap(colPairs),
    };
}

// Same idea, but for one table block inside "multiple tables in one sheet"
// mode — each table has its own independent range/headerRow/columnMap.
function buildTablePreviewConnection(form, table) {
    const sheetId = extractSheetId(form.sheetId) || form.sheetId.trim();
    return {
        id: `${form.id}-preview`, dept: form.dept, module: table.module,
        sheetId, tabMode: form.tabMode, tabName: form.tabName, tabs: form.tabs,
        periodSource: form.periodSource,
        range: table.range, headerRow: +table.headerRow || 1,
        columnMap: pairsToMap(table.colPairs),
    };
}


function ColumnMapBuilder({ pairs, onChange, sheetHeaders }) {
    function updatePair(idx, key, value) {
        const next = pairs.map((p, i) => i === idx ? { ...p, [key]: value } : p);
        onChange(next);
    }
    function addPair() {
        onChange([...pairs, { ourField: '', theirHeader: '', matchBy: 'text', theirCol: '' }]);
    }
    function removePair(idx) {
        onChange(pairs.filter((_, i) => i !== idx));
    }

    return (
        <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 1fr 32px', gap:8, marginBottom:6 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', letterSpacing:0.4 }}>
                    Our field name
                    <span style={{ fontWeight:400, color:'var(--muted)', marginLeft:4 }}>(what pages use)</span>
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', letterSpacing:0.4 }}>
                    Match by
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', letterSpacing:0.4 }}>
                    Their column
                </div>
                <div />
            </div>

            {pairs.map((pair, i) => {
                const matchBy = pair.matchBy || 'text';
                return (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 100px 1fr 32px', gap:8, marginBottom:6, alignItems:'center' }}>
                        <div>
                            <input
                                list={`field-suggestions-${i}`}
                                value={pair.ourField}
                                onChange={e => updatePair(i, 'ourField', e.target.value)}
                                placeholder="e.g. qty"
                                style={iStyle}
                            />
                            <datalist id={`field-suggestions-${i}`}>
                                {FIELD_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                            </datalist>
                        </div>

                        <select value={matchBy} onChange={e => updatePair(i, 'matchBy', e.target.value)}
                            style={{ ...iStyle, fontSize:10.5, padding:'8px 6px' }}>
                            <option value="text">Header text</option>
                            <option value="position">Column letter</option>
                        </select>

                        {matchBy === 'position' ? (
                            <div>
                                <input
                                    value={pair.theirCol || ''}
                                    onChange={e => updatePair(i, 'theirCol', e.target.value.toUpperCase())}
                                    placeholder="e.g. F"
                                    maxLength={3}
                                    style={iStyle}
                                />
                            </div>
                        ) : (
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <span style={{ color:'var(--muted)', fontSize:14, flexShrink:0 }}>↔</span>
                                <input
                                    list={`sheet-headers-${i}`}
                                    value={pair.theirHeader}
                                    onChange={e => updatePair(i, 'theirHeader', e.target.value)}
                                    placeholder="e.g. Qty Issued"
                                    style={iStyle}
                                />
                                {sheetHeaders.length > 0 && (
                                    <datalist id={`sheet-headers-${i}`}>
                                        {sheetHeaders.map(h => <option key={h} value={h} />)}
                                    </datalist>
                                )}
                            </div>
                        )}

                        <button onClick={() => removePair(i)}
                            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', fontSize:16, fontWeight:700, padding:0 }}>
                            ✕
                        </button>
                    </div>
                );
            })}

            <div style={{ fontSize:9.5, color:'var(--muted)', marginBottom:10, lineHeight:1.5 }}>
                Leave "Match by" as <strong>Header text</strong> normally — that's what almost every sheet needs.
                Switch a row to <strong>Column letter</strong> only if that column has no header text, or if
                its header text changes between tabs (e.g. a month-per-tab sheet where the value column is
                called "JAN" in one tab and "FEB" in the next — the letter stays the same even though the label doesn't).
            </div>

            <button onClick={addPair} style={{
                marginTop:4, padding:'6px 14px', background:'transparent',
                border:'1.5px dashed var(--border)', borderRadius:7,
                fontSize:11, fontWeight:600, cursor:'pointer', color:'var(--muted)', width:'100%',
            }}>
                + Add field mapping
            </button>

            {sheetHeaders.length > 0 && (
                <div style={{ marginTop:10, padding:'10px 12px', background:'#F4F6F9', borderRadius:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)', marginBottom:6 }}>
                        Columns found in sheet — click to add:
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {sheetHeaders
                            .filter(h => !pairs.find(p => p.theirHeader === h))
                            .map(h => (
                                <button key={h} onClick={() => onChange([...pairs, { ourField: h, theirHeader: h, matchBy: 'text', theirCol: '' }])}
                                    style={{ padding:'2px 10px', background:'#fff', border:'1px solid var(--border)',
                                        borderRadius:99, fontSize:10, cursor:'pointer', color:'var(--navy)', fontWeight:600 }}>
                                    + {h}
                                </button>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Scorecard setup — guided UI for "report card" style sheets ───────────
//
// Instead of asking someone to write colMap/periodCols JSON by hand, this:
//   1. Fetches the actual header row(s) from their sheet and shows them as text
//   2. Lets them assign a plain-English role to each column via a dropdown
//   3. For period columns, pre-fills a best guess (JAN -> 2026-01) they can edit
//   4. Optionally lets them describe "squished" cells (04:04:01:01) in plain terms
//
// Everything the person does here gets assembled into the same
// { scorecard: { colMap, periodCols, compositeOverrides, dataStartOffset } }
// shape that lib/googleSheets.js + lib/scorecardParser.js expect — they never
// see or touch that JSON directly.

function ScorecardSetup({ form, setField, sheetTabs, sheetId, errors }) {
    const [headerRow,    setHeaderRow]    = useState(6);
    const [dataStartRow, setDataStartRow] = useState(8);
    const [approxRows,   setApproxRows]   = useState(50);
    const [columns,      setColumns]      = useState([]); // [{ letter, text1, text2, role, periodKey, periodLabel }]
    const [detecting,    setDetecting]    = useState(false);
    const [detectError,  setDetectError]  = useState(null);

    const [overrides, setOverrides] = useState([]); // [{ category, kpiNo, labels, delimiter }]
    const [showAdvanced, setShowAdvanced] = useState(false);

    async function detectHeaders() {
        const id = extractSheetId(sheetId) || sheetId.trim();
        if (!id) { setDetectError('Enter a Sheet ID or URL and hit Test & Load above first.'); return; }
        if (!form.tabName) { setDetectError('Pick a tab name first.'); return; }

        setDetecting(true); setDetectError(null);
        try {
            const res = await fetch('/api/sheets/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetId: id, tabName: form.tabName, range: `A${headerRow}:AB${headerRow + 1}` }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not read that row.');

            const row1 = data.values?.[0] || [];
            const row2 = data.values?.[1] || [];
            const lastIdx = Math.max(row1.length, row2.length) - 1;

            // Trim trailing columns that are empty in BOTH rows — no point showing 28 blank columns.
            let lastUsed = -1;
            for (let i = 0; i <= lastIdx; i++) {
                if (String(row1[i] ?? '').trim() || String(row2[i] ?? '').trim()) lastUsed = i;
            }

            const detected = [];
            for (let i = 0; i <= lastUsed; i++) {
                const text1 = String(row1[i] ?? '').trim();
                const text2 = String(row2[i] ?? '').trim();
                const guessedKey = parsePeriodFromString(text2 || text1);
                detected.push({
                    letter: colIndexToLetter(i),
                    text1, text2,
                    role: '',
                    periodKey: guessedKey || '',
                    periodLabel: text2 || text1,
                });
            }
            setColumns(detected);
        } catch (err) {
            setDetectError(err.message);
        }
        setDetecting(false);
    }

    function updateColumn(letter, patch) {
        setColumns(cols => cols.map(c => c.letter === letter ? { ...c, ...patch } : c));
    }

    function addOverride() {
        setOverrides(o => [...o, { category: '', kpiNo: '', labels: '', delimiter: ':' }]);
    }
    function updateOverride(i, patch) {
        setOverrides(o => o.map((row, idx) => idx === i ? { ...row, ...patch } : row));
    }
    function removeOverride(i) {
        setOverrides(o => o.filter((_, idx) => idx !== i));
    }

    // Push the assembled config up into the parent form any time something changes.
    function commitConfig(nextColumns = columns, nextOverrides = overrides, nextHeaderRow = headerRow, nextDataStartRow = dataStartRow, nextApproxRows = approxRows) {
        const colMap = {};
        const periodCols = {};
        nextColumns.forEach(c => {
            if (c.role === 'period') {
                if (c.periodKey) periodCols[c.letter] = { key: c.periodKey, label: c.periodLabel || c.periodKey };
            } else if (c.role) {
                colMap[c.role] = c.letter;
            }
        });

        const compositeOverrides = nextOverrides
            .filter(o => o.labels.trim())
            .map(o => ({
                when: { ...(o.category.trim() ? { category: o.category.trim() } : {}), ...(o.kpiNo.trim() ? { kpiNo: o.kpiNo.trim() } : {}) },
                labels: o.labels.split(',').map(s => s.trim()).filter(Boolean),
                delimiter: o.delimiter.trim() || ':',
            }));

        const firstLetter = nextColumns[0]?.letter || 'A';
        const lastLetter  = nextColumns[nextColumns.length - 1]?.letter || 'Z';
        const lastDataRow = nextDataStartRow + Math.max(nextApproxRows, 1) - 1;

        setField('range', `${firstLetter}${nextHeaderRow}:${lastLetter}${lastDataRow}`);
        setField('scorecard', {
            dataStartOffset: nextDataStartRow - nextHeaderRow,
            colMap,
            periodCols,
            compositeOverrides,
        });
    }

    function onColumnChange(letter, patch) {
        const next = columns.map(c => c.letter === letter ? { ...c, ...patch } : c);
        setColumns(next);
        commitConfig(next, overrides);
    }
    function onOverridesChange(next) {
        setOverrides(next);
        commitConfig(columns, next);
    }
    function onRowConfigChange(patch) {
        const hr = patch.headerRow ?? headerRow;
        const dr = patch.dataStartRow ?? dataStartRow;
        const ar = patch.approxRows ?? approxRows;
        if (patch.headerRow !== undefined) setHeaderRow(patch.headerRow);
        if (patch.dataStartRow !== undefined) setDataStartRow(patch.dataStartRow);
        if (patch.approxRows !== undefined) setApproxRows(patch.approxRows);
        commitConfig(columns, overrides, hr, dr, ar);
    }

    const roleCount = { category: 0, kpiNo: 0, measure: 0 };
    columns.forEach(c => { if (roleCount[c.role] !== undefined) roleCount[c.role]++; });
    const missingRequired = columns.length > 0 && !roleCount.measure;

    return (
        <div>
            <div style={{ padding:'12px 16px', background:'#EBF5FB', border:'1px solid #AED6F1', borderRadius:8, fontSize:11, color:'var(--navy)', lineHeight:1.7, marginBottom:16 }}>
                Use this for sheets that look like a <strong>report card</strong> — one row per KPI, with months
                (or weeks) running <em>across</em> the columns, instead of one row per transaction. If your sheet
                has a normal header row and one row per record, go back and pick "One tab" instead — this
                mode is specifically for the report-card layout.
                <br/><br/>
                Not every scorecard has grouped categories — some are just two columns, e.g.
                <strong> "KPI/Metric"</strong> + Jan/Feb/Mar.... That's fine: mark the label column as
                <strong> "Description / Measure"</strong> and leave "KPI Category" as Skip everywhere — every
                KPI will just sit under one group instead of several.
            </div>

            {/* ── Tab picker ── */}
            <Field label="Tab Name (exact)">
                <input value={form.tabName} onChange={e=>setField('tabName', e.target.value)}
                    list="sheet-tabs-scorecard"
                    placeholder="e.g. Pharmacist"
                    style={iStyle} />
                <datalist id="sheet-tabs-scorecard">
                    {sheetTabs.map(t=><option key={t} value={t} />)}
                </datalist>
            </Field>

            {/* ── Row locations ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, margin:'14px 0' }}>
                <Field label="Which row has the category/measure labels?">
                    <input type="number" value={headerRow}
                        onChange={e=>onRowConfigChange({ headerRow: +e.target.value })} style={iStyle} />
                    <div style={{ fontSize:9.5, color:'var(--muted)', marginTop:3 }}>Count rows in your sheet — e.g. row 6.</div>
                </Field>
                <Field label="Which row does the actual KPI data start on?">
                    <input type="number" value={dataStartRow}
                        onChange={e=>onRowConfigChange({ dataStartRow: +e.target.value })} style={iStyle} />
                    <div style={{ fontSize:9.5, color:'var(--muted)', marginTop:3 }}>The first row with a real KPI, e.g. row 8.</div>
                </Field>
                <Field label="Roughly how many KPI rows total?">
                    <input type="number" value={approxRows}
                        onChange={e=>onRowConfigChange({ approxRows: +e.target.value })} style={iStyle} />
                    <div style={{ fontSize:9.5, color:'var(--muted)', marginTop:3 }}>Doesn't need to be exact — a safe overestimate is fine.</div>
                </Field>
            </div>

            <button onClick={detectHeaders} disabled={detecting}
                style={{ padding:'8px 16px', background:'var(--navy)', color:'#fff', border:'none',
                    borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', marginBottom:8 }}>
                {detecting ? '⏳ Reading your sheet…' : '🔍 Show me the columns in that row'}
            </button>
            {detectError && <div style={{ fontSize:11, color:'var(--red)', marginBottom:10 }}>{detectError}</div>}

            {/* ── Detected columns grid ── */}
            {columns.length > 0 && (
                <div style={{ marginTop:16 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)', marginBottom:4 }}>
                        For each column below — what is it?
                    </div>
                    <div style={{ fontSize:10.5, color:'var(--muted)', marginBottom:10, lineHeight:1.6 }}>
                        This is exactly what's in your sheet at row {headerRow}{dataStartRow !== headerRow + 1 ? ` and ${headerRow + 1}` : ''}.
                        Pick what each column represents. Columns that are just for notes or ranges you don't
                        need can be left as "Skip this column."
                    </div>

                    {missingRequired && (
                        <div style={{ fontSize:10.5, color:'var(--amber)', background:'#FEF9E7', border:'1px solid #F9E79F', borderRadius:6, padding:'6px 10px', marginBottom:10 }}>
                            ⚠ You need at least one column marked "Description / Measure" — that's the text that names each KPI.
                            "KPI Category" is optional: if your sheet doesn't group KPIs into categories (e.g. it's just one
                            "KPI/Metric" column plus months), leave every column's Category as "Skip" — all KPIs will
                            simply show under one group instead of several.
                        </div>
                    )}

                    <div style={{ overflowX:'auto', border:'1px solid var(--border)', borderRadius:8 }}>
                        <div style={{ display:'flex', minWidth:columns.length * 170 }}>
                            {columns.map(c => (
                                <div key={c.letter} style={{ width:170, flexShrink:0, borderRight:'1px solid var(--border)', padding:10 }}>
                                    <div style={{ fontSize:9, fontWeight:700, color:'var(--muted)', marginBottom:4 }}>Column {c.letter}</div>
                                    <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)', minHeight:16, wordBreak:'break-word' }}>
                                        {c.text1 || <span style={{ color:'var(--muted)', fontWeight:400, fontStyle:'italic' }}>(blank)</span>}
                                    </div>
                                    <div style={{ fontSize:10, color:'var(--muted)', minHeight:14, marginBottom:8, wordBreak:'break-word' }}>
                                        {c.text2}
                                    </div>
                                    <select value={c.role} onChange={e=>onColumnChange(c.letter, { role: e.target.value })}
                                        style={{ ...iStyle, fontSize:10.5, padding:'6px 8px' }}>
                                        {SCORECARD_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>

                                    {c.role === 'period' && (
                                        <div style={{ marginTop:6 }}>
                                            <input value={c.periodLabel} onChange={e=>onColumnChange(c.letter, { periodLabel: e.target.value })}
                                                placeholder="Display name, e.g. JAN"
                                                style={{ ...iStyle, fontSize:10, padding:'5px 7px', marginBottom:4 }} />
                                            <input value={c.periodKey} onChange={e=>onColumnChange(c.letter, { periodKey: e.target.value })}
                                                placeholder="e.g. 2026-01"
                                                style={{ ...iStyle, fontSize:10, padding:'5px 7px', borderColor: c.periodKey ? undefined : 'var(--amber)' }} />
                                            {!c.periodKey && <div style={{ fontSize:9, color:'var(--amber)', marginTop:2 }}>Needed — this is how we tell periods apart.</div>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Advanced: composite cells ── */}
            {columns.length > 0 && (
                <div style={{ marginTop:20 }}>
                    <button onClick={()=>setShowAdvanced(s=>!s)} style={{
                        background:'none', border:'none', cursor:'pointer', color:'var(--teal)',
                        fontSize:11, fontWeight:700, padding:0, display:'flex', alignItems:'center', gap:6,
                    }}>
                        {showAdvanced ? '▾' : '▸'} Advanced: some cells pack multiple values together (skip if none)
                    </button>

                    {showAdvanced && (
                        <div style={{ marginTop:10, padding:'14px 16px', background:'#F4F6F9', borderRadius:8, border:'1px solid var(--border)' }}>
                            <div style={{ fontSize:10.5, color:'var(--muted)', lineHeight:1.7, marginBottom:12 }}>
                                Sometimes one row's monthly cell isn't a single number — it's several numbers
                                squeezed into one, like <code style={{ background:'#fff', padding:'1px 5px', borderRadius:4 }}>04:04:01:01</code> meaning
                                4 pharmacists, 4 pharm techs, 1 porter, 1 admin — or <code style={{ background:'#fff', padding:'1px 5px', borderRadius:4 }}>172---59</code> meaning
                                Highest: 172, Lowest: 59. If you have rows like that, describe them here so
                                each gets split into its own KPI automatically. If not, skip this.
                            </div>

                            {overrides.map((o, i) => (
                                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 90px 1fr 90px 32px', gap:8, marginBottom:8, alignItems:'end' }}>
                                    <div>
                                        <label style={{ fontSize:9, color:'var(--muted)', display:'block', marginBottom:3 }}>KPI Category (exact text)</label>
                                        <input value={o.category} onChange={e=>onOverridesChange(overrides.map((r,idx)=>idx===i?{...r,category:e.target.value}:r))}
                                            placeholder="Clinical Supervision and Leadership" style={{ ...iStyle, fontSize:10.5 }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize:9, color:'var(--muted)', display:'block', marginBottom:3 }}>KPI #</label>
                                        <input value={o.kpiNo} onChange={e=>onOverridesChange(overrides.map((r,idx)=>idx===i?{...r,kpiNo:e.target.value}:r))}
                                            placeholder="1" style={{ ...iStyle, fontSize:10.5 }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize:9, color:'var(--muted)', display:'block', marginBottom:3 }}>Labels, in order, comma-separated</label>
                                        <input value={o.labels} onChange={e=>onOverridesChange(overrides.map((r,idx)=>idx===i?{...r,labels:e.target.value}:r))}
                                            placeholder="Pharmacist, Pharm. Tech., Porter, Admin" style={{ ...iStyle, fontSize:10.5 }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize:9, color:'var(--muted)', display:'block', marginBottom:3 }}>Separator</label>
                                        <input value={o.delimiter} onChange={e=>onOverridesChange(overrides.map((r,idx)=>idx===i?{...r,delimiter:e.target.value}:r))}
                                            placeholder=":" style={{ ...iStyle, fontSize:10.5 }} />
                                    </div>
                                    <button onClick={()=>{ const next = overrides.filter((_,idx)=>idx!==i); onOverridesChange(next); }}
                                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', fontSize:16, fontWeight:700 }}>✕</button>
                                </div>
                            ))}

                            <button onClick={()=>{ const next=[...overrides,{category:'',kpiNo:'',labels:'',delimiter:':'}]; onOverridesChange(next); }} style={{
                                marginTop:4, padding:'6px 14px', background:'transparent',
                                border:'1.5px dashed var(--border)', borderRadius:7,
                                fontSize:11, fontWeight:600, cursor:'pointer', color:'var(--muted)',
                            }}>
                                + Describe another row like this
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


function pairsToMap(pairs) {
    const map = {};
    pairs.forEach(({ ourField, theirHeader, matchBy, theirCol }) => {
        const field = (ourField || '').trim();
        if (!field) return;

        if (matchBy === 'position') {
            const col = (theirCol || '').trim().toUpperCase();
            if (col) map[field] = { col };
        } else if ((theirHeader || '').trim()) {
            map[field] = theirHeader.trim();
        }
    });
    return map;
}

function mapToPairs(map) {
    return Object.entries(map || {}).map(([ourField, spec]) => {
        if (spec && typeof spec === 'object' && spec.col) {
            return { ourField, matchBy: 'position', theirCol: spec.col, theirHeader: '' };
        }
        return { ourField, matchBy: 'text', theirHeader: spec, theirCol: '' };
    });
}

function colIndexToLetter(i) {
    let s = '';
    let n = i + 1;
    while (n > 0) {
        const rem = (n - 1) % 26;
        s = String.fromCharCode(65 + rem) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

const SCORECARD_ROLES = [
    { value: '',         label: '— Skip this column —' },
    { value: 'sNo',      label: 'Row number (S/No.)' },
    { value: 'category', label: 'KPI Category' },
    { value: 'kpiNo',    label: 'KPI Number' },
    { value: 'measure',  label: 'Description / Measure' },
    { value: 'unit',     label: 'Unit / Target text' },
    { value: 'period',   label: '📅 Time period (a month, week, etc.)' },
];

function parseRangeStartRow(range) {
    const m = String(range || '').match(/[A-Z]+(\d+)/);
    return m ? parseInt(m[1], 10) : 1;
}

function slugify(s) {
    return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}


const EMPTY_TABLE = () => ({
    _key: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    module: '',
    label: '',
    feedsPage: '',
    headerRow: 1,
    range: 'A1:Z100',
    colPairs: [],
    sheetHeaders: [],
});

export default function ConnectionForm({ initial, onSave, onCancel, saving, onRestartWizard }) {
    const isEditing = !!initial?.id;

    const [form, setForm] = useState({
        id:             initial?.id             || `conn-${Date.now()}`,
        label:          initial?.label          || '',
        dept:           initial?.dept           || '',
        module:         initial?.module         || '',
        sheetId:        initial?.sheetId        || '',
        range:          initial?.range          || 'A:Z',
        headerRow:      initial?.headerRow      || 1,
        periodSource:   initial?.periodSource   || 'dateColumn',
        tabMode:        initial?.tabMode        || 'single',
        tabName:        initial?.tabName        || '',
        tabs:           initial?.tabs           || [],
        visualizations: initial?.visualizations || [],
        feeds:          initial?.feeds          || [{ page:'', section:'', requiredFields:[] }],
    });

    const [colPairs,   setColPairs]   = useState(mapToPairs(initial?.columnMap || {}));
    const [testResult, setTestResult] = useState(null);
    const [testing,    setTesting]    = useState(false);
    const [sheetTabs,  setSheetTabs]  = useState([]);
    const [sheetHeaders, setSheetHeaders] = useState([]);
    const [errors,     setErrors]     = useState({});
    const [newTabName, setNewTabName] = useState('');
    const [newTabKey,  setNewTabKey]  = useState('');

    // ── Multi-table-per-sheet mode ──────────────────────────────
    // Only offered when creating a new connection — editing a bundle
    // after the fact happens per-table via the normal single-connection
    // edit flow, not here.
    const [multiTable, setMultiTable] = useState(false);
    const [tables, setTables] = useState([EMPTY_TABLE()]);
    const [detectingIdx, setDetectingIdx] = useState(null);

    // Defensive resync: if the parent reuses the same ConnectionForm instance
    // for "New" and every subsequent "Edit" click (instead of remounting with
    // a fresh key per connection), React won't re-run the useState initializer
    // above on its own — the form would keep showing stale/blank data even
    // though `initial` changed. This effect makes sure that can't happen,
    // regardless of how the parent invokes the form.
    useEffect(() => {
        setForm({
            id:             initial?.id             || `conn-${Date.now()}`,
            label:          initial?.label          || '',
            dept:           initial?.dept           || '',
            module:         initial?.module         || '',
            sheetId:        initial?.sheetId        || '',
            range:          initial?.range          || 'A:Z',
            headerRow:      initial?.headerRow      || 1,
            periodSource:   initial?.periodSource   || 'dateColumn',
            tabMode:        initial?.tabMode        || 'single',
            tabName:        initial?.tabName        || '',
            tabs:           initial?.tabs           || [],
            scorecard:      initial?.scorecard,
            visualizations: initial?.visualizations || [],
            feeds:          initial?.feeds          || [{ page:'', section:'', requiredFields:[] }],
        });
        setColPairs(mapToPairs(initial?.columnMap || {}));
        setMultiTable(false);
        setTables([EMPTY_TABLE()]);
        setTestResult(null);
        setSheetTabs([]);
        setSheetHeaders([]);
        setErrors({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial?.id]);

    function setField(key, value) { setForm(f => ({ ...f, [key]: value })); }

    function updateTable(idx, patch) {
        setTables(ts => ts.map((t, i) => i === idx ? { ...t, ...patch } : t));
    }
    function addTableBlock() {
        setTables(ts => [...ts, EMPTY_TABLE()]);
    }
    function removeTableBlock(idx) {
        setTables(ts => ts.length > 1 ? ts.filter((_, i) => i !== idx) : ts);
    }

    async function handleTest() {
        const id = extractSheetId(form.sheetId) || form.sheetId.trim();
        if (!id) { setTestResult({ ok:false, error:'Enter a Sheet ID or URL first.' }); return; }

        if (id !== form.sheetId) setField('sheetId', id);

        setTesting(true); setTestResult(null);
        const r = await testSheetConnection(id, null);
        setTestResult(r);

        if (r.ok) {
            setSheetTabs(r.tabs || []);
            if (r.tabs?.length === 1 && !form.tabName) setField('tabName', r.tabs[0]);

            if (!multiTable && r.tabs?.length > 0) {
                const targetTab = form.tabName || r.tabs[0];
                const headerRowNum = form.headerRow || 1;
                try {
                    const res = await fetch('/api/sheets/fetch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sheetId: id, tabName: targetTab, range: `A${headerRowNum}:Z${headerRowNum}` }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const headers = (data.values?.[0] || []).map(h => String(h).trim()).filter(Boolean);
                        setSheetHeaders(headers);
                        // Was: only ran if colPairs was still empty — meant re-testing a
                        // DIFFERENT tab or header row after the first Test & Load never
                        // actually refreshed the mapping table below, it just silently
                        // kept showing whatever tab was detected the first time.
                        // Every Test & Load click is an explicit "give me fresh data"
                        // action, so it should always overwrite with what was just fetched.
                        if (headers.length > 0) {
                            setColPairs(headers.map(h => ({ ourField: h, theirHeader: h })));
                        }
                    }
                } catch {}
            }
        }
        setTesting(false);
    }

    // Per-table header detection — each table has its own header row,
    // so this samples exactly that row instead of always row 1.
    async function detectTableHeaders(idx) {
        const id = extractSheetId(form.sheetId) || form.sheetId.trim();
        if (!id) return;
        const table = tables[idx];
        const targetTab = form.tabMode === 'single' ? form.tabName : (sheetTabs[0] || form.tabs?.[0]?.name);
        if (!targetTab) return;
        const row = +table.headerRow || 1;

        setDetectingIdx(idx);
        try {
            const res = await fetch('/api/sheets/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetId: id, tabName: targetTab, range: `A${row}:Z${row}` }),
            });
            if (res.ok) {
                const data = await res.json();
                const headers = (data.values?.[0] || []).map(h => String(h).trim()).filter(Boolean);
                updateTable(idx, {
                    sheetHeaders: headers,
                    // Same fix as handleTest: always refresh, don't gate on colPairs being empty.
                    colPairs: headers.length > 0
                        ? headers.map(h => ({ ourField: h, theirHeader: h }))
                        : table.colPairs,
                });
            }
        } catch {}
        setDetectingIdx(null);
    }

    function addTab() {
        if (!newTabName.trim()) return;
        const key = newTabKey.trim() || parsePeriodFromString(newTabName) || newTabName;
        setForm(f => ({ ...f, tabs:[...f.tabs, { name:newTabName.trim(), key }] }));
        setNewTabName(''); setNewTabKey('');
    }

    function removeTab(idx) { setForm(f => ({ ...f, tabs:f.tabs.filter((_,i)=>i!==idx) })); }

    function moveTab(idx, dir) {
        setForm(f => {
            const tabs = [...f.tabs]; const to = idx+dir;
            if (to < 0 || to >= tabs.length) return f;
            [tabs[idx],tabs[to]] = [tabs[to],tabs[idx]];
            return { ...f, tabs };
        });
    }

    async function handleSave() {
        const cleanSheetId = extractSheetId(form.sheetId) || form.sheetId.trim();
        if (cleanSheetId !== form.sheetId) setField('sheetId', cleanSheetId);

        const errs = {};
        if (!form.id.trim())        errs.id      = 'Required';
        if (!cleanSheetId)          errs.sheetId = 'Required';
        if (form.tabMode === 'single' && !form.tabName.trim()) errs.tabName = 'Required';
        if (form.tabMode === 'multi'  && form.tabs.length === 0) errs.tabs  = 'Add at least one tab';
        if (form.tabMode === 'scorecard') {
            if (!form.tabName?.trim()) errs.tabName = 'Required';
            if (!form.scorecard?.colMap?.measure) {
                errs.scorecard = 'Click "Show me the columns" and assign at least one column as "Description / Measure" — that\'s the text that names each KPI. Category is optional.';
            }
            if (!form.scorecard?.periodCols || Object.keys(form.scorecard.periodCols).length === 0) {
                errs.scorecard = 'Mark at least one column as a Time Period and give it a period key (e.g. 2026-01).';
            }
        }

        if (multiTable) {
            tables.forEach((t, i) => {
                if (!t.module.trim()) errs[`table-${i}-module`] = 'Required';
                if (!t.range.trim())  errs[`table-${i}-range`]  = 'Required';
                if (!t.feedsPage)     errs[`table-${i}-feedsPage`] = 'Required — this is what decides which page it shows up on. Leaving it blank is why connections end up Uncategorised.';
            });
        } else if (!form.module.trim()) {
            errs.module = 'Required';
        }

        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        if (multiTable) {
            const shared = {
                dept: form.dept,
                sheetId: cleanSheetId,
                tabMode: form.tabMode,
                tabName: form.tabName,
                tabs: form.tabs,
                periodSource: form.periodSource,
                visualizations: [],
            };
            const connections = tables.map(t => ({
                ...shared,
                id: `${form.id}-${slugify(t.module) || slugify(t.label) || t._key}`,
                module: t.module.trim(),
                label: t.label.trim() || t.module.trim(),
                headerRow: +t.headerRow || 1,
                range: t.range.trim(),
                columnMap: pairsToMap(t.colPairs),
                feeds: [{ page: t.feedsPage, section: t.label || t.module, requiredFields: [] }],
            }));
            await onSave(connections);
        } else if (form.tabMode === 'scorecard') {
            await onSave({
                id: form.id, label: form.label, dept: form.dept, module: form.module,
                sheetId: cleanSheetId, tabName: form.tabName,
                tabMode: 'scorecard', range: form.range,
                scorecard: form.scorecard,
                feeds: form.feeds,
                visualizations: form.visualizations,
            });
        } else {
            await onSave({ ...form, sheetId: cleanSheetId, columnMap: pairsToMap(colPairs) });
        }
    }

    return (
        <div>
            {/*onRestartWizard && (
                <button onClick={onRestartWizard} style={{
                    background: 'none', border: 'none', color: 'var(--teal)', fontSize: 11,
                    cursor: 'pointer', textDecoration: 'underline', padding: 0, marginBottom: 14,
                }}>
                    ← Not sure this is the right mode? Answer the wizard again
                </button>
            )*/}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label={multiTable ? 'ID prefix (each table gets its own suffix)' : 'ID (unique slug, no spaces)'}>
                    <input value={form.id} onChange={e=>setField('id',e.target.value)}
                        placeholder="store-siv-issues"
                        style={{ ...iStyle, borderColor:errors.id?'var(--red)':undefined }}
                        disabled={isEditing} />
                    {errors.id && <div style={{ fontSize:10,color:'var(--red)',marginTop:3 }}>{errors.id}</div>}
                </Field>

                <Field label="Department">
                    <input value={form.dept} onChange={e=>setField('dept',e.target.value)}
                        placeholder="Store" style={iStyle} />
                </Field>

                {!multiTable && (
                    <>
                        <Field label="Page this feeds" span>
                            <select value={form.feeds?.[0]?.page||''}
                                onChange={e=>{
                                    const page = e.target.value;
                                    setForm(f=>({...f,feeds:[{...f.feeds?.[0],page}]}));
                                    // If this page has exactly one known destination, just fill
                                    // it in — no reason to make the person pick from a list of one.
                                    const opts = PAGE_MODULES[page];
                                    if (opts && opts.length === 1) setField('module', opts[0].value);
                                }}
                                style={iStyle}>
                                <option value="">Select page…</option>
                                {PAGES.map(p=><option key={p} value={p}>{p}</option>)}
                            </select>
                        </Field>
                        
                        <Field label="Label">
                            <input value={form.label} onChange={e=>setField('label',e.target.value)}
                                placeholder="SIV Issues" style={iStyle} />
                        </Field>

                        <Field label="Module key">
                            <ModulePicker
                                page={form.feeds?.[0]?.page}
                                value={form.module}
                                onChange={v => setField('module', v)}
                                error={errors.module}
                            />
                        </Field>

                        <Field label="Section / tab within that page (optional label)" span>
                            <input
                                value={form.feeds?.[0]?.section || ''}
                                onChange={e=>setForm(f=>({...f,feeds:[{...f.feeds?.[0],section:e.target.value}]}))}
                                placeholder="e.g. Scorecard, Dispensing, Stock — leave blank if the page has no internal tabs"
                                style={iStyle}
                            />
                            <div style={{ fontSize:9.5, color:'var(--muted)', marginTop:4, lineHeight:1.5 }}>
                                This is just a readable note for whoever edits connections later — it doesn't control
                                anything by itself yet. What actually decides which tab this shows up on is the{' '}
                                <strong>Module key</strong> above — make sure the page's code calls{' '}
                                <code style={{ background:'#F4F6F9', padding:'1px 5px', borderRadius:4 }}>&lt;PageRenderer module="{form.module || 'your-module-key'}" /&gt;</code>{' '}
                                inside the right tab.
                            </div>
                        </Field>
                    </>
                )}

                <Field label="Google Sheet URL or ID" span>
                    <div style={{ display:'flex', gap:8 }}>
                        <input value={form.sheetId} onChange={e=>setField('sheetId',e.target.value)}
                            onBlur={()=>setField('sheetId', extractSheetId(form.sheetId) || form.sheetId.trim())}
                            placeholder="Paste the full Google Sheets URL here"
                            style={{ ...iStyle, flex:1, borderColor:errors.sheetId?'var(--red)':undefined }} />
                        <button onClick={handleTest} disabled={testing}
                            style={{ padding:'8px 14px', background:'var(--navy)', color:'#fff', border:'none',
                                borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                            {testing ? '⏳' : '🔌 Test & Load'}
                        </button>
                    </div>
                    <div style={{ fontSize:10, color:'var(--muted)', marginTop:4 }}>
                        Paste the full sheet link or just the ID — either works, it's cleaned up automatically.
                    </div>
                    {errors.sheetId && <div style={{ fontSize:10,color:'var(--red)',marginTop:3 }}>{errors.sheetId}</div>}
                    {testResult && (
                        <div style={{ marginTop:8, padding:'10px 12px', borderRadius:7, fontSize:11,
                            background:testResult.ok?'#E8F8F5':'#FEECEC',
                            border:`1px solid ${testResult.ok?'#A9DFBF':'#F1948A'}`,
                            color:testResult.ok?'var(--teal)':'var(--red)' }}>
                            {testResult.ok ? (
                                <>
                                    ✓ Connected — <strong>{testResult.sheetTitle}</strong>
                                    <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:4 }}>
                                        {testResult.tabs?.map(t=>(
                                            <span key={t}
                                                onClick={()=>form.tabMode==='single'&&setField('tabName',t)}
                                                style={{ padding:'2px 8px', background:'#D5F5E3', borderRadius:99,
                                                    fontSize:10, fontWeight:600,
                                                    cursor:form.tabMode==='single'?'pointer':'default' }}>
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                    {!multiTable && sheetHeaders.length > 0 && (
                                        <div style={{ marginTop:6, fontSize:10, color:'var(--muted)' }}>
                                            Columns found: {sheetHeaders.join(', ')}
                                        </div>
                                    )}
                                </>
                            ) : `✗ ${testResult.error}`}
                        </div>
                    )}
                </Field>

                {!multiTable && form.tabMode !== 'scorecard' && (
                    <>
                        <Field label="Range">
                            <input value={form.range} onChange={e=>setField('range',e.target.value)}
                                placeholder="A:Z" style={iStyle} />
                        </Field>

                        <Field label="Header Row Number">
                            <input type="number" value={form.headerRow}
                                onChange={e=>setField('headerRow',+e.target.value)} style={iStyle} />
                        </Field>
                    </>
                )}
            </div>

            {!isEditing && (
                <div style={{ margin:'16px 0', padding:'12px 16px', background: multiTable ? '#EBF5FB' : '#F4F6F9', borderRadius:8, border:`1px solid ${multiTable ? '#AED6F1' : 'var(--border)'}` }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                        <input type="checkbox" checked={multiTable}
                            onChange={e=>setMultiTable(e.target.checked)}
                            style={{ width:16, height:16, cursor:'pointer' }} />
                        <span style={{ fontSize:12, fontWeight:700, color:'var(--navy)' }}>
                            📑 This sheet contains multiple tables stacked in one tab
                        </span>
                    </label>
                    <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:6, marginLeft:24 }}>
                        Use this when one tab has several distinct tables at different row ranges (like a
                        monthly report with a KPI table, a devices table, a subscriptions table, etc. all in
                        the same sheet). Each table below becomes its own connection sharing this sheet ID
                        and tab settings, with its own header row, range, and column mapping.
                    </div>
                </div>
            )}

            <div style={{ margin:'20px 0 0', padding:'16px 20px', background:'#F4F6F9', borderRadius:10, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)', marginBottom:12 }}>
                    📑 Which tabs should we fetch from?
                </div>

                <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                    {[
                        { value:'single', icon:'1️⃣', label:'One tab',        desc:'All data is in one sheet tab'              },
                        { value:'multi',  icon:'📅', label:'Multiple tabs',  desc:'Data is split by month/period across tabs' },
                        { value:'auto',   icon:'🔄', label:'All tabs',       desc:'Fetch and merge every tab automatically'   },
                        { value:'scorecard', icon:'📊', label:'KPI Scorecard', desc:"One row per KPI, columns are time periods — like a report card, not a record list" },
                    ].map(opt=>(
                        <div key={opt.value} onClick={()=>setField('tabMode',opt.value)} style={{
                            flex:1, padding:'12px 14px', borderRadius:8, cursor:'pointer',
                            border:`2px solid ${form.tabMode===opt.value?'var(--teal)':'var(--border)'}`,
                            background:form.tabMode===opt.value?'#E8F8F5':'#fff',
                        }}>
                            <div style={{ fontSize:18, marginBottom:4 }}>{opt.icon}</div>
                            <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)' }}>{opt.label}</div>
                            <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{opt.desc}</div>
                        </div>
                    ))}
                </div>

                {form.tabMode==='single' && (
                    <div>
                        <label style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', display:'block', marginBottom:5 }}>
                            Tab Name (exact)
                        </label>
                        <input value={form.tabName} onChange={e=>setField('tabName',e.target.value)}
                            list="sheet-tabs-single"
                            placeholder="e.g. SIV Issues — or click a tab from the test result above"
                            style={{ ...iStyle, borderColor:errors.tabName?'var(--red)':undefined }} />
                        <datalist id="sheet-tabs-single">
                            {sheetTabs.map(t=><option key={t} value={t} />)}
                        </datalist>
                        {errors.tabName && <div style={{ fontSize:10,color:'var(--red)',marginTop:3 }}>{errors.tabName}</div>}
                        <div style={{ fontSize:10, color:'var(--muted)', marginTop:8 }}>
                            Period source:
                            <select value={form.periodSource} onChange={e=>setField('periodSource',e.target.value)}
                                style={{ marginLeft:8, fontSize:10, border:'1px solid var(--border)', borderRadius:5, padding:'2px 6px' }}>
                                <option value="dateColumn">There is a date column in the data</option>
                                <option value="tabName">Parse the period from the tab name</option>
                            </select>
                        </div>
                    </div>
                )}

                {form.tabMode==='multi' && (
                    <div>
                        <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', marginBottom:8 }}>
                            Tabs to fetch
                        </div>
                        {errors.tabs && <div style={{ fontSize:10,color:'var(--red)',marginBottom:8 }}>{errors.tabs}</div>}

                        {form.tabs.map((tab,i)=>(
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
                                background:'#fff', border:'1px solid var(--border)', borderRadius:6, marginBottom:4 }}>
                                <span style={{ fontSize:10,color:'var(--muted)',width:20,textAlign:'center' }}>{i+1}</span>
                                <div style={{ flex:1 }}>
                                    <span style={{ fontSize:11,fontWeight:600 }}>{tab.name}</span>
                                    <span style={{ fontSize:10,color:'var(--muted)',marginLeft:8 }}>
                                        key: <code style={{ background:'#f0f2f5',padding:'1px 5px',borderRadius:4 }}>{tab.key}</code>
                                    </span>
                                </div>
                                <button onClick={()=>moveTab(i,-1)} disabled={i===0}
                                    style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:12 }}>↑</button>
                                <button onClick={()=>moveTab(i,1)} disabled={i===form.tabs.length-1}
                                    style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:12 }}>↓</button>
                                <button onClick={()=>removeTab(i)}
                                    style={{ background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:14 }}>✕</button>
                            </div>
                        ))}

                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, alignItems:'end', marginTop:8 }}>
                            <div>
                                <label style={{ fontSize:10,color:'var(--muted)',display:'block',marginBottom:3 }}>Tab name (exact)</label>
                                <input list="multi-tab-suggestions" value={newTabName}
                                    onChange={e=>{
                                        setNewTabName(e.target.value);
                                        if(!newTabKey) setNewTabKey(parsePeriodFromString(e.target.value)||'');
                                    }}
                                    placeholder="January"
                                    style={iStyle} onKeyDown={e=>e.key==='Enter'&&addTab()} />
                                <datalist id="multi-tab-suggestions">
                                    {sheetTabs.filter(t=>!form.tabs.find(ft=>ft.name===t)).map(t=><option key={t} value={t}/>)}
                                </datalist>
                            </div>
                            <div>
                                <label style={{ fontSize:10,color:'var(--muted)',display:'block',marginBottom:3 }}>
                                    Key <span style={{ opacity:0.7 }}>(auto from name)</span>
                                </label>
                                <input value={newTabKey} onChange={e=>setNewTabKey(e.target.value)}
                                    placeholder="2026-01" style={iStyle} />
                            </div>
                            <button onClick={addTab}
                                style={{ padding:'8px 14px',background:'var(--teal)',color:'#fff',border:'none',
                                    borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap' }}>
                                + Add
                            </button>
                        </div>

                        {sheetTabs.filter(t=>!form.tabs.find(ft=>ft.name===t)).length>0 && (
                            <div style={{ marginTop:12 }}>
                                <div style={{ fontSize:10,color:'var(--muted)',marginBottom:6 }}>Quick add from sheet:</div>
                                <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                                    {sheetTabs.filter(t=>!form.tabs.find(ft=>ft.name===t)).map(t=>(
                                        <button key={t} onClick={()=>{
                                            const key=parsePeriodFromString(t)||t;
                                            setForm(f=>({...f,tabs:[...f.tabs,{name:t,key}]}));
                                        }} style={{ padding:'3px 10px',background:'#E8F8F5',border:'1px solid #A9DFBF',
                                            borderRadius:99,fontSize:10,fontWeight:600,cursor:'pointer',color:'var(--teal)' }}>
                                            + {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {form.tabMode==='auto' && (
                    <div style={{ padding:'12px 16px',background:'#EBF5FB',borderRadius:8,fontSize:11,color:'var(--navy)',lineHeight:1.8 }}>
                        <strong>All tabs will be fetched and merged automatically.</strong><br/>
                        Period keys are parsed from tab names — "January" → "2026-01", "Feb 25" → "2025-02".<br/>
                        If a tab name can't be parsed as a date, the raw tab name is used as the key.
                    </div>
                )}

                {form.tabMode==='scorecard' && (
                    <>
                        {errors.scorecard && (
                            <div style={{ fontSize:11, color:'var(--red)', background:'#FEECEC', border:'1px solid #F1948A', borderRadius:7, padding:'8px 12px', marginBottom:12 }}>
                                {errors.scorecard}
                            </div>
                        )}
                        <ScorecardSetup
                            form={form} setField={setField}
                            sheetTabs={sheetTabs}
                            sheetId={form.sheetId}
                            errors={errors}
                        />
                    </>
                )}
            </div>

            {!multiTable && form.tabMode !== 'scorecard' && (
                <div style={{ margin:'20px 0' }}>
                    <div style={{ fontSize:11,fontWeight:700,color:'var(--navy)',marginBottom:4 }}>🗂 Column Mapping</div>
                    <div style={{ fontSize:11,color:'var(--muted)',marginBottom:12,lineHeight:1.6 }}>
                        Map the column headers in their Google Sheet to the field names our system uses.
                        {sheetHeaders.length>0
                            ? ' Column headers from their sheet are available in the dropdowns on the right.'
                            : ' Click "Test & Load" above to auto-detect their column headers.'}
                    </div>
                    <ColumnMapBuilder
                        pairs={colPairs}
                        onChange={setColPairs}
                        sheetHeaders={sheetHeaders}
                    />
                </div>
            )}

            {!multiTable && (() => {
                const sheetReady = !!(extractSheetId(form.sheetId) || form.sheetId?.trim());
                const tabReady = form.tabMode === 'multi' || form.tabMode === 'auto'
                    ? true
                    : !!form.tabName?.trim();
                const disabledReason = !sheetReady
                    ? 'Fill in the Google Sheet URL/ID above first.'
                    : !tabReady
                        ? 'Fill in the Tab Name above first.'
                        : null;
                return (
                    <PreviewPanel
                        connection={buildPreviewConnection(form, colPairs)}
                        disabledReason={disabledReason}
                    />
                );
            })()}

            {multiTable && (
                <div style={{ margin:'20px 0' }}>
                    <div style={{ fontSize:11,fontWeight:700,color:'var(--navy)',marginBottom:4 }}>📑 Tables in this sheet</div>
                    <div style={{ fontSize:11,color:'var(--muted)',marginBottom:12,lineHeight:1.6 }}>
                        One block per table. Header Row and Range are relative to the whole sheet (not
                        per-table) — e.g. a table starting at row 49 with columns A–H uses header row 49
                        and range A49:H82 (stop one row before the next table's header row).
                    </div>

                    {tables.map((t, i) => (
                        <div key={t._key} style={{ border:'1.5px solid var(--border)', borderRadius:10, padding:16, marginBottom:14, background:'#fff' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                                <span style={{ fontSize:12, fontWeight:800, color:'var(--navy)' }}>Table {i+1}</span>
                                {tables.length > 1 && (
                                    <button onClick={()=>removeTableBlock(i)}
                                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', fontSize:12, fontWeight:600 }}>
                                        ✕ Remove table
                                    </button>
                                )}
                            </div>

                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                                <Field label="Page this feeds">
                                    <select value={t.feedsPage}
                                        onChange={e=>{
                                            const page = e.target.value;
                                            const opts = PAGE_MODULES[page];
                                            updateTable(i, {
                                                feedsPage: page,
                                                module: (opts && opts.length === 1) ? opts[0].value : t.module,
                                            });
                                        }}
                                        style={{ ...iStyle, borderColor:errors[`table-${i}-feedsPage`]?'var(--red)':undefined }}>
                                        <option value="">Select page…</option>
                                        {PAGES.map(p=><option key={p} value={p}>{p}</option>)}
                                    </select>
                                    {errors[`table-${i}-feedsPage`] && <div style={{ fontSize:10,color:'var(--red)',marginTop:3 }}>{errors[`table-${i}-feedsPage`]}</div>}
                                </Field>
                                <Field label="Module key">
                                    <ModulePicker
                                        page={t.feedsPage}
                                        value={t.module}
                                        onChange={v => updateTable(i, { module: v })}
                                        error={errors[`table-${i}-module`]}
                                    />
                                </Field>
                                <Field label="Label">
                                    <input value={t.label} onChange={e=>updateTable(i,{label:e.target.value})}
                                        placeholder="Devices & Equipment" style={iStyle} />
                                </Field>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                                    <Field label="Header Row">
                                        <input type="number" value={t.headerRow}
                                            onChange={e=>updateTable(i,{headerRow:+e.target.value})} style={iStyle} />
                                    </Field>
                                    <Field label="Range">
                                        <input value={t.range} onChange={e=>updateTable(i,{range:e.target.value})}
                                            placeholder="A49:H82"
                                            style={{ ...iStyle, borderColor:errors[`table-${i}-range`]?'var(--red)':undefined }} />
                                        {errors[`table-${i}-range`] && <div style={{ fontSize:10,color:'var(--red)',marginTop:3 }}>{errors[`table-${i}-range`]}</div>}
                                    </Field>
                                </div>
                            </div>

                            <button onClick={()=>detectTableHeaders(i)} disabled={detectingIdx===i}
                                style={{ padding:'6px 14px', background:'var(--navy)', color:'#fff', border:'none',
                                    borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', marginBottom:10 }}>
                                {detectingIdx===i ? '⏳ Detecting…' : `🔍 Detect columns at row ${t.headerRow || 1}`}
                            </button>

                            <ColumnMapBuilder
                                pairs={t.colPairs}
                                onChange={pairs=>updateTable(i,{colPairs:pairs})}
                                sheetHeaders={t.sheetHeaders}
                            />

                            <PreviewPanel
                                connection={buildTablePreviewConnection(form, t)}
                                label={`Table ${i+1}`}
                                disabledReason={!t.range?.trim() ? 'Fill in this table\'s Range first.' : null}
                            />
                        </div>
                    ))}

                    <button onClick={addTableBlock} style={{
                        padding:'10px 16px', background:'transparent', border:'1.5px dashed var(--teal)',
                        borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', color:'var(--teal)', width:'100%',
                    }}>
                        + Add another table
                    </button>
                </div>
            )}

            <div style={{ display:'flex',justifyContent:'flex-end',gap:10,paddingTop:16,borderTop:'1px solid var(--border)' }}>
                <button onClick={onCancel}
                    style={{ padding:'8px 18px',background:'transparent',border:'1.5px solid var(--border)',borderRadius:8,fontSize:12,cursor:'pointer' }}>
                    Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                    style={{ padding:'8px 20px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer' }}>
                    {saving?'⏳ Saving…':multiTable?`💾 Save ${tables.length} Connection${tables.length!==1?'s':''}`:'💾 Save Connection'}
                </button>
            </div>
        </div>
    );
}