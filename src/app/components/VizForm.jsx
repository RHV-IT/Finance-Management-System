'use client';

/**
 * components/VizForm.jsx
 *
 * Add / edit a visualization for a connection.
 *
 * NEW — generic row filtering (any connection, any viz type):
 * ─────────────────────────────────────────────────────────────
 * viz.filters already existed for scorecard connections ("Filter to
 * specific KPIs" below) but had no UI at all for a normal table — meaning
 * there was no way to scope a KPI card (or any chart) to one particular
 * row/line-item on a plain sheet. RowFilterPicker below fixes that: pick
 * any field, pick a real value pulled live from the sheet, and every viz
 * type narrows down to just the matching row(s) before anything else runs.
 *
 * NEW — "Plot across columns" (plain-table Bar/Line only):
 * ─────────────────────────────────────────────────────────────
 * Some plain tables have their time dimension running ACROSS as separate
 * columns (Jan, Feb, Mar... each its own column) rather than down as
 * separate rows the way Scorecard mode expects. This toggle melts those
 * named columns into X-axis points at render time: with no row filter
 * applied, each column gets summed across every row (a live "total per
 * month" trend); with RowFilterPicker narrowed to one row, each column is
 * just read off that one row (a single line item's own monthly trend) —
 * see DynamicViz.jsx's buildColumnSeriesData for the actual melt logic.
 *
 * Live preview:
 * ─────────────────────────────────────────────────────────────
 * Near the bottom of the form, the exact same <DynamicViz /> every real
 * page uses is rendered against real rows from the connected sheet, using
 * the CURRENT draft (including filters and plot-across-columns settings,
 * built by buildPayload() — the same function handleSave uses), so what
 * you see is what gets saved.
 */

import { useState, useMemo, useEffect } from 'react';
import { fetchSheet } from '../dashboard/lib/googleSheets';
import { DynamicViz } from './DynamicViz';

const iStyle = {
    width: '100%', padding: '8px 10px',
    border: '1.5px solid var(--border)', borderRadius: 7,
    fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#fff',
};

const VIZ_TYPES = [
    { value: 'kpi',          label: '🔢 KPI Card'          },
    { value: 'bar',          label: '📊 Bar Chart'         },
    { value: 'grouped_bar',  label: '📊 Grouped Bar Chart'  },
    { value: 'grouped_line', label: '📈 Grouped Line Chart' },
    { value: 'line',         label: '📈 Line Chart'        },
    { value: 'pie',          label: '🥧 Pie Chart'         },
    { value: 'table',        label: '📋 Table'             },
];

const AGG_TYPES  = ['sum', 'count', 'avg', 'max', 'min', 'latest'];
const COLORS     = ['blue', 'green', 'red', 'amber', 'purple', 'navy'];
const SORT_OPTS  = [
    { value: 'desc', label: 'Highest first' },
    { value: 'asc',  label: 'Lowest first'  },
    { value: 'none', label: 'No sort'        },
];
const SERIES_COLORS = ['#117A65', '#E74C3C', '#1B4F72', '#CA6F1E', '#6C3483', '#888'];

const SCORECARD_FIELDS = ['category', 'kpiNo', 'measure', 'unit', 'subLabel', 'metric', 'value', '_period', '_monthLabel'];

const EMPTY_VIZ = {
    id: '', type: 'kpi', label: '', title: '',
    field: '', agg: 'sum', format: 'number', color: 'blue',
    xField: '', yField: '', yFields: [], catField: '', valField: '', pages: [],
    columns: [],
    limit: 10, sort: 'desc', orientation: 'horizontal',
    targetLine: null, defaultLimit: 20,
    hidden: false,
};

// Minimum fields filled in before a preview is worth attempting — avoids
// rendering an empty/misleading chart (e.g. a bar chart with no yField
// just renders a blank grid) while someone's still mid-setup.
function isVizReady(viz) {
    switch (viz.type) {
        case 'kpi':          return !!viz.field;
        case 'bar':
        case 'line':
            // "Plot across columns" replaces the X/Y field pickers entirely.
            if (viz.acrossColumns) return !!viz.columnSeries?.fields?.length;
            return !!viz.yField;
        case 'pie':          return !!viz.catField && !!viz.valField;
        case 'grouped_bar':
        case 'grouped_line': return (viz.yFields || []).some(f => f.field);
        case 'table':        return true; // works with any/all columns, nothing strictly required
        default:             return false;
    }
}

function Field({ label, children, span }) {
    return (
        <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
            <label style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                color: 'var(--navy)', marginBottom: 5,
                textTransform: 'uppercase', letterSpacing: 0.4,
            }}>{label}</label>
            {children}
        </div>
    );
}

function FieldPicker({ id, value, onChange, placeholder, fields }) {
    const listId = `field-list-${id}`;
    return (
        <>
            <input
                list={listId}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder || 'Select or type a field…'}
                style={iStyle}
            />
            {fields.length > 0 && (
                <datalist id={listId}>
                    {fields.map(f => <option key={f} value={f} />)}
                </datalist>
            )}
            {fields.length > 0 && (
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
                    Available: {fields.join(' · ')}
                </div>
            )}
        </>
    );
}

/**
 * ScorecardFilterPicker — scorecard-only. Scopes a chart down to one
 * category and/or specific metric(s), using real values pulled from the
 * connected sheet.
 */
function ScorecardFilterPicker({ connection, category, setCategory, selectedMetrics, setSelectedMetrics, singleMetric }) {
    const [sampleRows, setSampleRows] = useState([]);
    const [loading, setLoading]       = useState(false);
    const [loadError, setLoadError]   = useState(null);
    const [search, setSearch]         = useState('');

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!connection?.sheetId) return;
            setLoading(true); setLoadError(null);
            try {
                const { rows, warnings } = await fetchSheet(connection);
                if (cancelled) return;
                setSampleRows(rows || []);
                if (!rows?.length && warnings?.length) setLoadError(warnings[0]);
            } catch (err) {
                if (!cancelled) setLoadError(err.message);
            }
            if (!cancelled) setLoading(false);
        }
        load();
        return () => { cancelled = true; };
    }, [connection?.sheetId, connection?.tabName]);

    const distinctCategories = useMemo(
        () => [...new Set(sampleRows.map(r => r.category).filter(Boolean))].sort(),
        [sampleRows]
    );

    const metricsInScope = useMemo(() => {
        const scoped = category ? sampleRows.filter(r => r.category === category) : sampleRows;
        return [...new Set(scoped.map(r => r.metric).filter(Boolean))].sort();
    }, [sampleRows, category]);

    const visibleMetrics = useMemo(() => {
        if (!search.trim()) return metricsInScope;
        const q = search.trim().toLowerCase();
        return metricsInScope.filter(m => m.toLowerCase().includes(q));
    }, [metricsInScope, search]);

    function toggleMetric(m) {
        if (singleMetric) {
            setSelectedMetrics(selectedMetrics.includes(m) ? [] : [m]);
            return;
        }
        setSelectedMetrics(selectedMetrics.includes(m)
            ? selectedMetrics.filter(x => x !== m)
            : [...selectedMetrics, m]);
    }

    return (
        <Field label="Filter to specific KPIs (strongly recommended)" span>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.6 }}>
                Scorecard connections hold every KPI mixed together. Without a filter, this chart combines
                <strong> all of them</strong> — usually meaningless (e.g. summing a percentage with a
                headcount). Pick a category and/or specific metric(s) below, pulled live from the connected sheet.
            </div>

            {loading && <div style={{ fontSize: 11, color: 'var(--muted)' }}>⏳ Reading KPI names from the sheet…</div>}
            {loadError && <div style={{ fontSize: 11, color: 'var(--red)' }}>Couldn't load sample data: {loadError}</div>}

            {!loading && !loadError && (
                <>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 9, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Category (optional)</label>
                        <select value={category} onChange={e => { setCategory(e.target.value); setSelectedMetrics([]); }} style={iStyle}>
                            <option value="">All categories</option>
                            {distinctCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 9, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                            {singleMetric ? 'Metric — pick exactly one' : 'Metric(s) — pick one or more, leave blank for all in the category'}
                        </label>

                        {metricsInScope.length > 8 && (
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search metric names…"
                                style={{ ...iStyle, marginBottom: 8 }}
                            />
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                            {visibleMetrics.length === 0 && (
                                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>No metrics found{category ? ' in this category' : ''}.</div>
                            )}
                            {visibleMetrics.map(m => {
                                const selected = selectedMetrics.includes(m);
                                return (
                                    <button key={m} type="button" onClick={() => toggleMetric(m)} style={{
                                        padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                        background: selected ? 'var(--teal)' : 'transparent',
                                        color: selected ? '#fff' : 'var(--muted)',
                                        border: `1px solid ${selected ? 'var(--teal)' : 'var(--border)'}`,
                                    }}>
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </Field>
    );
}

/**
 * RowFilterPicker — generic, works for ANY connection (normal tables
 * included). Pick a field to identify rows by, then pick which real
 * value(s) — pulled live from the sheet, never typed blind. This is what
 * makes a KPI card (or any viz) scoped to one particular row possible on
 * a plain table, not just on scorecards.
 */
function RowFilterPicker({ connection, fields, filterField, setFilterField, selectedValues, setSelectedValues, excludeMode, setExcludeMode }) {
    const [sampleRows, setSampleRows] = useState([]);
    const [loading, setLoading]       = useState(false);
    const [loadError, setLoadError]   = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!connection?.sheetId) return;
            setLoading(true); setLoadError(null);
            try {
                const { rows, warnings } = await fetchSheet(connection);
                if (cancelled) return;
                setSampleRows(rows || []);
                if (!rows?.length && warnings?.length) setLoadError(warnings[0]);
            } catch (err) {
                if (!cancelled) setLoadError(err.message);
            }
            if (!cancelled) setLoading(false);
        }
        load();
        return () => { cancelled = true; };
    }, [connection?.sheetId, connection?.tabName]);

    const distinctValues = useMemo(() => {
        if (!filterField) return [];
        return [...new Set(sampleRows.map(r => r[filterField]).filter(Boolean))].sort();
    }, [sampleRows, filterField]);

    function toggleValue(v) {
        setSelectedValues(selectedValues.includes(v)
            ? selectedValues.filter(x => x !== v)
            : [...selectedValues, v]);
    }

    return (
        <Field label="Narrow to a specific row (optional)" span>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.6 }}>
                Leave this blank to use every row. Pick a field that identifies a row (e.g. "name"), then pick
                its value — this is how you build a KPI card or chart for just ONE specific line item instead
                of the whole sheet. Picking more than one value includes all of them together.
            </div>

            <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 9, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Field to filter by</label>
                <select value={filterField} onChange={e => { setFilterField(e.target.value); setSelectedValues([]); }} style={iStyle}>
                    <option value="">— No filter, use every row —</option>
                    {fields.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
            </div>

            {filterField && (
                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 9, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>What should the values you pick do?</label>
                    <select value={excludeMode ? 'exclude' : 'include'}
                        onChange={e => setExcludeMode(e.target.value === 'exclude')} style={iStyle}>
                        <option value="include">Keep only the rows I pick</option>
                        <option value="exclude">Remove the rows I pick (keep everything else)</option>
                    </select>
                </div>
            )}

            {filterField && (
                <div>
                    {loading && <div style={{ fontSize: 11, color: 'var(--muted)' }}>⏳ Reading values from the sheet…</div>}
                    {loadError && <div style={{ fontSize: 11, color: 'var(--red)' }}>Couldn't load sample data: {loadError}</div>}
                    {!loading && !loadError && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                            {distinctValues.length === 0 && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>No values found for that field.</div>}
                            {distinctValues.map(v => {
                                const selected = selectedValues.includes(v);
                                const activeColor = excludeMode ? 'var(--red)' : 'var(--teal)';
                                return (
                                    <button key={v} type="button" onClick={() => toggleValue(v)} style={{
                                        padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                        background: selected ? activeColor : 'transparent',
                                        color: selected ? '#fff' : 'var(--muted)',
                                        border: `1px solid ${selected ? activeColor : 'var(--border)'}`,
                                        textDecoration: selected && excludeMode ? 'line-through' : 'none',
                                    }}>
                                        {v}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </Field>
    );
}

export default function VizForm({ initial, connection, onSave, onCancel, saving }) {
    const [form, setForm] = useState({
        ...EMPTY_VIZ,
        ...initial,
        id: initial?.id || `viz-${Date.now()}`,
    });

    const isScorecard = connection?.tabMode === 'scorecard' || connection?.tabMode === 'scorecard_multi';

    // Real rows for the connection, fetched once — used to render the live
    // preview at the bottom of the form. Fetched independently of the
    // filter pickers' own fetches (those only build dropdown options; this
    // is the full row set the chart will actually render against).
    const [previewRows,    setPreviewRows]    = useState([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError,   setPreviewError]   = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!connection?.sheetId) return;
            setPreviewLoading(true); setPreviewError(null);
            try {
                const { rows, warnings } = await fetchSheet(connection);
                if (cancelled) return;
                setPreviewRows(rows || []);
                if (!rows?.length && warnings?.length) setPreviewError(warnings[0]);
            } catch (err) {
                if (!cancelled) setPreviewError(err.message);
            }
            if (!cancelled) setPreviewLoading(false);
        }
        load();
        return () => { cancelled = true; };
    }, [connection?.sheetId, connection?.tabName]);

    const fields = useMemo(() => {
        if (isScorecard) return SCORECARD_FIELDS;
        const map = connection?.columnMap || {};
        return Object.keys(map);
    }, [connection, isScorecard]);

    // Scorecard-only filter state.
    const [filterCategory, setFilterCategory] = useState(
        () => initial?.filters?.find(f => f.field === 'category')?.values?.[0] || ''
    );
    const [selectedMetrics, setSelectedMetrics] = useState(
        () => initial?.filters?.find(f => f.field === 'metric')?.values || []
    );

    // Generic non-scorecard row filter state — seeded from whatever single
    // filter entry already exists (the current save shape only ever writes
    // one for a non-scorecard viz).
    const [rowFilterField, setRowFilterField] = useState(
        () => (!isScorecard ? initial?.filters?.[0]?.field || '' : '')
    );
    const [rowFilterValues, setRowFilterValues] = useState(
        () => (!isScorecard ? initial?.filters?.[0]?.values || [] : [])
    );

    // Whether the picked row values are KEPT (default) or REMOVED.
    const [rowFilterExclude, setRowFilterExclude] = useState(
        () => (!isScorecard ? !!initial?.filters?.[0]?.exclude : false)
    );

    // "Plot across columns" state — plain-table Bar/Line only.
    const [acrossColumns, setAcrossColumns] = useState(!!initial?.acrossColumns);
    const [columnSeriesFields, setColumnSeriesFields] = useState(initial?.columnSeries?.fields || []);

    function set(key, value) {
        setForm(f => ({ ...f, [key]: value }));
    }

    const isKPI         = form.type === 'kpi';
    const isBar         = form.type === 'bar';
    const isGroupedBar  = form.type === 'grouped_bar';
    const isGroupedLine = form.type === 'grouped_line';
    const isLine        = form.type === 'line';
    const isPie         = form.type === 'pie';
    const isTable       = form.type === 'table';

    const scorecardSingleMetric = isKPI || isLine;

    const { subLabels } = useDistinctSubLabels(
        connection, filterCategory, selectedMetrics,
        isScorecard && (isGroupedBar || isGroupedLine)
    );

    const supportsColumnSeries = !isScorecard && (isBar || isLine);

    // Builds the full viz object from the form plus all the side-state
    // (filters, plot-across-columns). Used by BOTH the live preview and
    // handleSave, so what you preview is exactly what gets saved.
    function buildPayload() {
        const filters = [];
        if (isScorecard) {
            if (filterCategory) filters.push({ field: 'category', values: [filterCategory] });
            if (selectedMetrics.length) filters.push({ field: 'metric', values: selectedMetrics });
        } else if (rowFilterField && rowFilterValues.length) {
            filters.push({
                field: rowFilterField,
                values: rowFilterValues,
                exclude: rowFilterExclude || undefined,
            });
        }

        const payload = { ...form, filters };

        if (supportsColumnSeries && acrossColumns) {
            payload.acrossColumns = true;
            payload.columnSeries  = { fields: columnSeriesFields.filter(f => f.field) };
        } else {
            payload.acrossColumns = undefined;
            payload.columnSeries  = undefined;
        }

        return payload;
    }

    const draftViz = buildPayload();

    async function handleSave() {
        await onSave(buildPayload());
    }

    return (
        <div>
            {isScorecard && (
                <div style={{
                    background: '#F5EEF8', border: '1px solid #D2B4DE',
                    borderRadius: 8, padding: '10px 14px',
                    fontSize: 11, color: '#6C3483', marginBottom: 16,
                }}>
                    📊 This is a <strong>KPI Scorecard</strong> connection — its rows are shaped differently
                    from a normal sheet (category / metric / value / period). Use the filter section below to
                    scope this chart to specific KPIs.
                </div>
            )}

            {!isScorecard && fields.length > 0 && (
                <div style={{
                    background: '#EBF5FB', border: '1px solid #AED6F1',
                    borderRadius: 8, padding: '10px 14px',
                    fontSize: 11, color: 'var(--navy)', marginBottom: 16,
                }}>
                    <strong>Fields available for this connection:</strong>
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {fields.map(f => (
                            <span key={f} style={{
                                padding: '2px 8px', background: '#D6EAF8',
                                borderRadius: 99, fontSize: 10, fontWeight: 600,
                            }}>{f}</span>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                <Field label="Visualization Type">
                    <select value={form.type} onChange={e => set('type', e.target.value)} style={iStyle}>
                        {VIZ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </Field>

                <Field label={isKPI ? 'KPI Label' : 'Chart Title'}>
                    <input
                        value={isKPI ? form.label : form.title}
                        onChange={e => set(isKPI ? 'label' : 'title', e.target.value)}
                        placeholder={isKPI ? 'e.g. Total Issued Value' : 'e.g. Top 10 Items by Value'}
                        style={iStyle}
                    />
                </Field>

                {/* ── KPI fields ─────────────────────────────── */}
                {isKPI && <>
                    <Field label="Field to aggregate">
                        <FieldPicker
                            id={`kpi-field-${form.id}`}
                            value={form.field}
                            onChange={v => set('field', v)}
                            placeholder={isScorecard ? 'value' : 'e.g. total, qty, totalValue'}
                            fields={fields}
                        />
                        {isScorecard && (
                            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
                                Almost always "value" for scorecard connections — that's where each period's number lives.
                            </div>
                        )}
                    </Field>

                    <Field label="Aggregation">
                        <select value={form.agg} onChange={e => set('agg', e.target.value)} style={iStyle}>
                            {AGG_TYPES.map(a => (
                                <option key={a} value={a}>
                                    {a === 'sum'    ? 'Sum (add all values)'          :
                                     a === 'count'  ? 'Count (number of rows)'        :
                                     a === 'avg'    ? 'Average'                        :
                                     a === 'max'    ? 'Maximum (highest value)'        :
                                     a === 'min'    ? 'Minimum (lowest value)'         :
                                     a === 'latest' ? 'Latest (last row value)'        : a}
                                </option>
                            ))}
                        </select>
                        {isScorecard && (
                            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
                                Use "Latest" for a scorecard KPI card — it shows the most recent period's value.
                                Also the only option that works when the value is TEXT rather than a number.
                            </div>
                        )}
                    </Field>

                    <Field label="Format">
                        <select value={form.format} onChange={e => set('format', e.target.value)} style={iStyle}>
                            <option value="currency">Currency (₦)</option>
                            <option value="number">Number (1,234)</option>
                            <option value="percent">Percent (%)</option>
                            <option value="text">Plain text</option>
                        </select>
                        <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
                            If this KPI's value is words rather than a number (a drug name, a status label), pick "Plain text."
                        </div>
                    </Field>

                    <Field label="Colour">
                        <select value={form.color} onChange={e => set('color', e.target.value)} style={iStyle}>
                            {COLORS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                            {COLORS.map(c => (
                                <div key={c} onClick={() => set('color', c)} style={{
                                    width: 22, height: 22, borderRadius: 4, cursor: 'pointer',
                                    background: c==='blue'?'#1B4F72':c==='green'?'#117A65':c==='red'?'#C0392B':c==='amber'?'#9A7D0A':c==='purple'?'#6C3483':'#1B2631',
                                    outline: form.color===c ? '2.5px solid var(--teal)' : 'none',
                                    outlineOffset: 2,
                                }} />
                            ))}
                        </div>
                    </Field>
                </>}

                {/* ── Bar / Line fields ───────────────────────── */}
                {(isBar || isLine) && !isGroupedBar && !acrossColumns && <>
                    <Field label="X Axis (categories / labels)">
                        <FieldPicker
                            id={`x-field-${form.id}`}
                            value={form.xField}
                            onChange={v => set('xField', v)}
                            placeholder={isScorecard ? 'category or metric' : 'e.g. name, date, month'}
                            fields={fields}
                        />
                    </Field>

                    <Field label="Y Axis (values to plot)">
                        <FieldPicker
                            id={`y-field-${form.id}`}
                            value={form.yField}
                            onChange={v => set('yField', v)}
                            placeholder={isScorecard ? 'value' : 'e.g. total, qty, totalValue'}
                            fields={fields}
                        />
                    </Field>

                    {isBar && <>
                        <Field label="Orientation">
                            <select value={form.orientation} onChange={e => set('orientation', e.target.value)} style={iStyle}>
                                <option value="horizontal">Horizontal (items on left, values on right)</option>
                                <option value="vertical">Vertical (items on bottom, values going up)</option>
                            </select>
                        </Field>

                        <Field label="Sort order">
                            <select value={form.sort} onChange={e => set('sort', e.target.value)} style={iStyle}>
                                {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </Field>

                        <Field label="Limit (max items to show)">
                            <select value={form.limit} onChange={e => set('limit', +e.target.value)} style={iStyle}>
                                {[5, 10, 15, 20, 50, 100].map(l => (
                                    <option key={l} value={l}>Top {l}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Target line (optional)">
                            <input
                                type="number"
                                value={form.targetLine?.value ?? ''}
                                onChange={e => {
                                    const v = e.target.value;
                                    set('targetLine', v ? { value: +v, label: 'Target' } : null);
                                }}
                                placeholder="Leave blank for no target line"
                                style={iStyle}
                            />
                            {form.targetLine && (
                                <input
                                    value={form.targetLine.label || 'Target'}
                                    onChange={e => set('targetLine', { ...form.targetLine, label: e.target.value })}
                                    placeholder="Target label"
                                    style={{ ...iStyle, marginTop: 6 }}
                                />
                            )}
                        </Field>
                    </>}
                </>}

                {/* ── Plot across columns (plain-table Bar/Line only) ──── */}
                {supportsColumnSeries && (
                    <Field label="Plot across columns instead of rows?" span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                            <input type="checkbox" checked={acrossColumns} onChange={e => setAcrossColumns(e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                            <span style={{ fontSize: 11.5 }}>
                                My columns ARE the data points (e.g. Jan, Feb, Mar... each its own column) — plot
                                those across the X-axis, instead of picking one X field and one Y field above.
                            </span>
                        </label>

                        {acrossColumns && (
                            <>
                                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.6 }}>
                                    Pick each column that represents one point on the chart, in the order you want
                                    them, and give each a label to show. Use "Narrow to a specific row" below to
                                    chart just ONE line item's columns — leave it blank and every row's values get
                                    summed together instead (e.g. a live total-per-month trend).
                                </div>
                                {columnSeriesFields.map((f, i) => (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 8, marginBottom: 6 }}>
                                        <FieldPicker
                                            id={`cs-field-${form.id}-${i}`}
                                            value={f.field}
                                            onChange={v => { const next = [...columnSeriesFields]; next[i] = { ...next[i], field: v }; setColumnSeriesFields(next); }}
                                            placeholder="e.g. jan"
                                            fields={fields}
                                        />
                                        <input
                                            value={f.label}
                                            onChange={e => { const next = [...columnSeriesFields]; next[i] = { ...next[i], label: e.target.value }; setColumnSeriesFields(next); }}
                                            placeholder="e.g. Jan"
                                            style={iStyle}
                                        />
                                        <button onClick={() => setColumnSeriesFields(columnSeriesFields.filter((_, j) => j !== i))}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16 }}>
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => setColumnSeriesFields([...columnSeriesFields, { field: '', label: '' }])}
                                    style={{
                                        width: '100%', padding: '6px 14px', background: 'transparent',
                                        border: '1.5px dashed var(--border)', borderRadius: 7,
                                        fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)',
                                    }}>
                                    + Add a column
                                </button>

                                {fields.length > 0 && (
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>Quick add from available fields:</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                            {fields
                                                .filter(f => !columnSeriesFields.find(cf => cf.field === f))
                                                .map(f => (
                                                    <button key={f}
                                                        onClick={() => setColumnSeriesFields([...columnSeriesFields, { field: f, label: f.charAt(0).toUpperCase() + f.slice(1) }])}
                                                        style={{
                                                            padding: '2px 10px', background: '#E8F8F5',
                                                            border: '1px solid #A9DFBF', borderRadius: 99,
                                                            fontSize: 10, fontWeight: 600, cursor: 'pointer', color: 'var(--teal)',
                                                        }}>
                                                        + {f}
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </Field>
                )}

                {/* ── Pie fields ──────────────────────────────── */}
                {isPie && <>
                    <Field label="Category field (slices of the pie)">
                        <FieldPicker
                            id={`cat-field-${form.id}`}
                            value={form.catField}
                            onChange={v => set('catField', v)}
                            placeholder={isScorecard ? 'category or metric' : 'e.g. dept, classification, vendor'}
                            fields={fields}
                        />
                    </Field>

                    <Field label="Value field (size of each slice)">
                        <FieldPicker
                            id={`val-field-${form.id}`}
                            value={form.valField}
                            onChange={v => set('valField', v)}
                            placeholder={isScorecard ? 'value' : 'e.g. total, totalValue, qty'}
                            fields={fields}
                        />
                    </Field>
                </>}

                {/* ── Grouped Bar / Grouped Line fields ─────────────────────── */}
                {(isGroupedBar || isGroupedLine) && (
                    <>
                        <Field label="X Axis (category — one group per value)">
                            <FieldPicker
                                id={`gbar-x-${form.id}`}
                                value={form.xField}
                                onChange={v => set('xField', v)}
                                placeholder={isScorecard ? '_period (for a trend) or metric' : 'e.g. name, dept, month'}
                                fields={fields}
                            />
                        </Field>

                        <Field label="Sort order">
                            <select value={form.sort} onChange={e => set('sort', e.target.value)} style={iStyle}>
                                {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </Field>

                        <Field label="Limit (max groups)" >
                            <select value={form.limit} onChange={e => set('limit', +e.target.value)} style={iStyle}>
                                {[5, 10, 15, 20, 50].map(l => <option key={l} value={l}>Top {l}</option>)}
                            </select>
                        </Field>

                        <Field label="Format">
                            <select value={form.format} onChange={e => set('format', e.target.value)} style={iStyle}>
                                <option value="currency">Currency (₦)</option>
                                <option value="number">Number</option>
                                <option value="percent">Percent (%)</option>
                            </select>
                        </Field>

                        <Field label="Values to compare (add each bar/line series)" span>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>
                                Each entry becomes one bar/line series. Add 2 or more to compare them side by side.
                                {isScorecard && ' For scorecard data, every series usually reads "value" — what separates them is the "Split value" column below.'}
                            </div>

                            {isScorecard && subLabels.length > 0 && (
                                <button type="button" onClick={() => {
                                    set('yFields', subLabels.map((sl, i) => ({
                                        field: 'value',
                                        matchField: 'subLabel',
                                        matchValue: sl,
                                        label: sl,
                                        color: SERIES_COLORS[i % SERIES_COLORS.length],
                                    })));
                                }} style={{
                                    width: '100%', padding: '8px 14px', marginBottom: 10,
                                    background: '#F5EEF8', border: '1.5px dashed #D2B4DE',
                                    borderRadius: 7, fontSize: 11, fontWeight: 700,
                                    cursor: 'pointer', color: '#6C3483',
                                }}>
                                    🪄 Auto-split into one series per value ({subLabels.join(', ')})
                                </button>
                            )}

                            {(form.yFields || []).map((yf, i) => (
                                <div key={i} style={{
                                    display: 'grid',
                                    gridTemplateColumns: isScorecard ? '1fr 1fr 1fr 1fr 32px' : '1fr 1fr 1fr 32px',
                                    gap: 8, marginBottom: 8, alignItems: 'center',
                                }}>
                                    <div>
                                        {i === 0 && <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>Field name</div>}
                                        <FieldPicker
                                            id={`yfield-${form.id}-${i}`}
                                            value={yf.field}
                                            onChange={v => {
                                                const next = [...(form.yFields || [])];
                                                next[i] = { ...next[i], field: v };
                                                set('yFields', next);
                                            }}
                                            placeholder="e.g. receipts"
                                            fields={fields}
                                        />
                                    </div>

                                    {isScorecard && (
                                        <div>
                                            {i === 0 && <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>Split value</div>}
                                            <select
                                                value={yf.matchValue || ''}
                                                onChange={e => {
                                                    const v = e.target.value;
                                                    const next = [...(form.yFields || [])];
                                                    next[i] = {
                                                        ...next[i],
                                                        field: next[i].field || 'value',
                                                        matchField: v ? 'subLabel' : undefined,
                                                        matchValue: v || undefined,
                                                        label: next[i].label || v || undefined,
                                                    };
                                                    set('yFields', next);
                                                }}
                                                style={{ ...iStyle, fontSize: 10.5 }}
                                            >
                                                <option value="">(combined — no split)</option>
                                                {subLabels.map(sl => <option key={sl} value={sl}>{sl}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        {i === 0 && <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>Display label</div>}
                                        <input
                                            value={yf.label || ''}
                                            onChange={e => {
                                                const next = [...(form.yFields || [])];
                                                next[i] = { ...next[i], label: e.target.value };
                                                set('yFields', next);
                                            }}
                                            placeholder="e.g. Receipts"
                                            style={iStyle}
                                        />
                                    </div>
                                    <div>
                                        {i === 0 && <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>Bar/line colour</div>}
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            {SERIES_COLORS.map(col => (
                                                <div key={col} onClick={() => {
                                                    const next = [...(form.yFields || [])];
                                                    next[i] = { ...next[i], color: col };
                                                    set('yFields', next);
                                                }} style={{
                                                    width: 18, height: 18, borderRadius: 3,
                                                    background: col, cursor: 'pointer', flexShrink: 0,
                                                    outline: yf.color === col ? '2px solid var(--teal)' : 'none',
                                                    outlineOffset: 1,
                                                }} />
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={() => set('yFields', (form.yFields||[]).filter((_,j)=>j!==i))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16, padding: 0, marginTop: i === 0 ? 16 : 0 }}>
                                        ✕
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={() => set('yFields', [...(form.yFields || []), { field: '', label: '', color: SERIES_COLORS[(form.yFields||[]).length % SERIES_COLORS.length] }])}
                                style={{
                                    width: '100%', padding: '7px 14px',
                                    background: 'transparent', border: '1.5px dashed var(--border)',
                                    borderRadius: 7, fontSize: 11, fontWeight: 600,
                                    cursor: 'pointer', color: 'var(--muted)',
                                }}
                            >
                                + Add series to compare
                            </button>

                            {!isScorecard && fields.length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>Quick add from available fields:</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                        {fields
                                            .filter(f => !(form.yFields||[]).find(yf => yf.field === f))
                                            .map((f, i) => (
                                                <button key={f}
                                                    onClick={() => set('yFields', [...(form.yFields||[]), {
                                                        field: f,
                                                        label: f.charAt(0).toUpperCase() + f.slice(1),
                                                        color: SERIES_COLORS[(form.yFields||[]).length % SERIES_COLORS.length],
                                                    }])}
                                                    style={{
                                                        padding: '2px 10px', background: '#E8F8F5',
                                                        border: '1px solid #A9DFBF', borderRadius: 99,
                                                        fontSize: 10, fontWeight: 600, cursor: 'pointer', color: 'var(--teal)',
                                                    }}>
                                                    + {f}
                                                </button>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </Field>
                    </>
                )}

                {/* ── Table fields ─────────────────────────────── */}
                {isTable && (
                    <Field label="Columns to show" span>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
                            Select which columns appear in the table. Drag to reorder (or leave blank to show all).
                        </div>

                        <div style={{ marginBottom: 8 }}>
                            {(form.columns || []).map((col, i) => (
                                <div key={col} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '5px 10px', background: '#fff',
                                    border: '1px solid var(--border)', borderRadius: 6, marginBottom: 4,
                                }}>
                                    <span style={{ fontSize: 10, color: 'var(--muted)', width: 16 }}>{i + 1}</span>
                                    <span style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>{col}</span>
                                    <button onClick={() => set('columns', (form.columns || []).filter((_, j) => j !== i))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 14 }}>
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        {fields.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {fields.filter(f => !(form.columns || []).includes(f)).map(f => (
                                    <button key={f}
                                        onClick={() => set('columns', [...(form.columns || []), f])}
                                        style={{
                                            padding: '3px 10px', background: '#E8F8F5',
                                            border: '1px solid #A9DFBF', borderRadius: 99,
                                            fontSize: 10, fontWeight: 600, cursor: 'pointer', color: 'var(--teal)',
                                        }}>
                                        + {f}
                                    </button>
                                ))}
                            </div>
                        )}

                        {fields.length === 0 && (
                            <input
                                value={(form.columns || []).join(', ')}
                                onChange={e => set('columns', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                placeholder="name, qty, total, dept (comma-separated)"
                                style={iStyle}
                            />
                        )}

                        <Field label="Default rows shown">
                            <select value={form.defaultLimit || 20} onChange={e => set('defaultLimit', +e.target.value)} style={{ ...iStyle, marginTop: 8 }}>
                                {[10, 20, 50, 100].map(l => <option key={l} value={l}>{l} rows</option>)}
                            </select>
                        </Field>
                    </Field>
                )}

                {/* ── Filtering — scorecard-specific OR generic, never both ─ */}
                {isScorecard ? (
                    <ScorecardFilterPicker
                        connection={connection}
                        category={filterCategory}
                        setCategory={setFilterCategory}
                        selectedMetrics={selectedMetrics}
                        setSelectedMetrics={setSelectedMetrics}
                        singleMetric={scorecardSingleMetric}
                    />
                ) : (
                    <RowFilterPicker
                        connection={connection}
                        fields={fields}
                        filterField={rowFilterField}
                        setFilterField={setRowFilterField}
                        selectedValues={rowFilterValues}
                        setSelectedValues={setRowFilterValues}
                        excludeMode={rowFilterExclude}
                        setExcludeMode={setRowFilterExclude}
                    />
                )}
            </div>

                <Field label="Show on pages (leave blank to use connection default)" span>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
                        Select specific pages for this visualization. If left blank, it will appear on all pages this connection feeds.
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {['overview','inventory','pharmacy','store','grn','supplychain',
                          'debtors','cashbook','expenses','revenue','weekly','assets',
                          'kpi','payables','hr','it'].map(p => {
                            const selected = (form.pages || []).includes(p);
                            return (
                                <button key={p} type="button"
                                    onClick={() => {
                                        const current = form.pages || [];
                                        set('pages', selected
                                            ? current.filter(x => x !== p)
                                            : [...current, p]
                                        );
                                    }}
                                    style={{
                                        padding: '3px 12px', borderRadius: 99, fontSize: 10,
                                        fontWeight: 600, cursor: 'pointer',
                                        background: selected ? 'var(--teal)' : 'transparent',
                                        color: selected ? '#fff' : 'var(--muted)',
                                        border: `1px solid ${selected ? 'var(--teal)' : 'var(--border)'}`,
                                    }}
                                >{p}</button>
                            );
                        })}
                    </div>
                    {(form.pages || []).length > 0 && (
                        <button onClick={() => set('pages', [])}
                            style={{ marginTop: 8, fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                            Clear — use connection default
                        </button>
                    )}
                </Field>

            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginTop: 16, padding: '10px 14px',
                background: form.hidden ? '#FEF9E7' : '#F4F6F9',
                border: `1px solid ${form.hidden ? '#F9E79F' : 'var(--border)'}`,
                borderRadius: 8,
            }}>
                <input
                    type="checkbox"
                    id={`hide-viz-${form.id}`}
                    checked={!!form.hidden}
                    onChange={e => set('hidden', e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor={`hide-viz-${form.id}`} style={{ fontSize: 11, color: 'var(--navy)', cursor: 'pointer', flex: 1 }}>
                    <strong>Hide this visualization</strong> — keeps everything configured here saved, just
                    stops it from showing on any page. Turn it back on any time from this same screen.
                </label>
            </div>

            {/* ── Live Preview — the exact same DynamicViz component every
                real page uses, rendered here with the current draft config
                (filters and plot-across-columns included) against real
                fetched rows. If it looks right here, it'll look right after
                saving — this isn't a separate lookalike renderer that could
                drift out of sync. ──────────────────────────────────────── */}
            <div style={{ margin: '20px 0', padding: '16px 18px', background: '#F4F6F9', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>
                    🔍 Live Preview
                    <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>
                        Exactly how this will look once saved
                    </span>
                </div>

                {previewLoading && <div style={{ fontSize: 11, color: 'var(--muted)' }}>⏳ Loading real data from the sheet…</div>}
                {previewError && !previewLoading && <div style={{ fontSize: 11, color: 'var(--red)' }}>Couldn't load preview data: {previewError}</div>}

                {!previewLoading && !previewError && (
                    isVizReady(draftViz) ? (
                        <div style={{ background: '#fff', borderRadius: 8, padding: 12 }}>
                            <DynamicViz viz={draftViz} rows={previewRows} />
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                            Fill in the fields above (and pick your row/KPI filter, if you're using one) to see a live preview.
                        </div>
                    )
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button onClick={onCancel}
                    style={{ padding: '8px 18px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                    Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                    style={{ padding: '8px 20px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? '⏳ Saving…' : '💾 Save Visualization'}
                </button>
            </div>
        </div>
    );
}

/**
 * useDistinctSubLabels — reads the actual `subLabel` values present for
 * whatever category/metric is currently selected, scoped so the picker
 * only ever offers labels real for THIS KPI.
 */
function useDistinctSubLabels(connection, category, metrics, enabled) {
    const [subLabels, setSubLabels] = useState([]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!enabled || !connection?.sheetId) { setSubLabels([]); return; }
            try {
                const { rows } = await fetchSheet(connection);
                if (cancelled) return;
                const scoped = (rows || []).filter(r =>
                    (!category || r.category === category) &&
                    (!metrics?.length || metrics.includes(r.metric))
                );
                setSubLabels([...new Set(scoped.map(r => r.subLabel).filter(Boolean))]);
            } catch {
                if (!cancelled) setSubLabels([]);
            }
        }
        load();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connection?.sheetId, connection?.tabName, category, JSON.stringify(metrics || []), enabled]);

    return { subLabels };
}