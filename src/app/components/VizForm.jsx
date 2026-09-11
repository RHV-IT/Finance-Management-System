'use client';

/**
 * components/VizForm.jsx
 *
 * Add / edit a visualization for a connection.
 * Field pickers show the connection's actual column names as options.
 *
 * NEW: scorecard support. Scorecard connections (tabMode "scorecard" or
 * "scorecard_multi") don't have a columnMap — their rows always come out
 * of the parser with a fixed shape: category, kpiNo, measure, unit,
 * subLabel, metric, value, _period, _monthLabel. So instead of reading
 * fields from connection.columnMap, we use that fixed list.
 *
 * More importantly: a scorecard connection's rows are EVERY KPI mixed
 * together in one place. A bar/pie/line built against that with no
 * filtering would combine unrelated KPIs (a percentage summed with a
 * headcount, say) into one meaningless number. So for scorecard
 * connections this form also shows a filter section — pick a category
 * and/or specific metric(s) to scope the chart to before it's built.
 * That gets saved as `viz.filters`, which DynamicViz.jsx applies before
 * any aggregation happens (see applyVizFilters in that file).
 *
 * Props:
 *   initial      — existing viz object to edit, or null for new
 *   connection   — the connection object (used to extract field options)
 *   onSave       — async (viz) => void
 *   onCancel     — () => void
 *   saving       — bool
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
    { value: 'kpi',         label: '🔢 KPI Card'          },
    { value: 'bar',         label: '📊 Bar Chart'         },
    { value: 'grouped_bar',  label: '📊 Grouped Bar Chart'  },
    { value: 'grouped_line', label: '📈 Grouped Line Chart' },
    { value: 'line',        label: '📈 Line Chart'        },
    { value: 'pie',         label: '🥧 Pie Chart'         },
    { value: 'table',       label: '📋 Table'             },
];

const AGG_TYPES  = ['sum', 'count', 'avg', 'max', 'min', 'latest'];
const FORMATS    = ['currency', 'number', 'percent', 'text'];
const COLORS     = ['blue', 'green', 'red', 'amber', 'purple', 'navy'];
const SORT_OPTS  = [
    { value: 'desc', label: 'Highest first' },
    { value: 'asc',  label: 'Lowest first'  },
    { value: 'none', label: 'No sort'        },
];

// Fixed output shape of every scorecard connection (see lib/scorecardParser.js).
// Not user-defined like a normal columnMap — these are guaranteed field names.
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
        case 'line':         return !!viz.yField;
        case 'pie':          return !!viz.catField && !!viz.valField;
        case 'grouped_bar':
        case 'grouped_line': return (viz.yFields || []).some(f => f.field);
        case 'table':        return true; // works with any/all columns, nothing strictly required
        default:              return false;
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

/**
 * FieldPicker — an input with a datalist showing all available fields.
 * Falls back to a plain input if no fields available.
 */
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
 * ScorecardFilterPicker — lets the person scope a chart down to one
 * category and/or a handful of specific metrics, using REAL values pulled
 * from the actual connected sheet (not typed by hand) so there's no risk
 * of a typo silently matching nothing.
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

export default function VizForm({ initial, connection, onSave, onCancel, saving }) {
    const [form, setForm] = useState({
        ...EMPTY_VIZ,
        ...initial,
        id: initial?.id || `viz-${Date.now()}`,
    });

    const isScorecard = connection?.tabMode === 'scorecard' || connection?.tabMode === 'scorecard_multi';

    // Real rows for the connection, fetched once — used to render an
    // actual live preview of this visualization at the bottom of the
    // form. Fetched independently of ScorecardFilterPicker's own fetch
    // below (that one's scoped to building filter dropdowns; this is the
    // full row set the chart will actually render against).
    const [previewRows,   setPreviewRows]   = useState([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError,  setPreviewError]  = useState(null);

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

    // Extract available field names — scorecard connections use a fixed
    // output shape; everything else reads from the connection's columnMap.
    const fields = useMemo(() => {
        if (isScorecard) return SCORECARD_FIELDS;
        const map = connection?.columnMap || {};
        return Object.keys(map);
    }, [connection, isScorecard]);

    // Scorecard-only filter state, seeded from an existing viz's filters when editing.
    const [filterCategory, setFilterCategory] = useState(
        () => initial?.filters?.find(f => f.field === 'category')?.values?.[0] || ''
    );
    const [selectedMetrics, setSelectedMetrics] = useState(
        () => initial?.filters?.find(f => f.field === 'metric')?.values || []
    );

    function set(key, value) {
        setForm(f => ({ ...f, [key]: value }));
    }

    async function handleSave() {
        let filters;
        if (isScorecard) {
            filters = [];
            if (filterCategory) filters.push({ field: 'category', values: [filterCategory] });
            if (selectedMetrics.length) filters.push({ field: 'metric', values: selectedMetrics });
        }
        await onSave(isScorecard ? { ...form, filters } : form);
    }

    const isKPI        = form.type === 'kpi';
    const isBar        = form.type === 'bar';
    const isGroupedBar  = form.type === 'grouped_bar';
    const isGroupedLine = form.type === 'grouped_line';
    const isLine       = form.type === 'line';
    const isPie        = form.type === 'pie';
    const isTable      = form.type === 'table';

    // For KPI and single-line charts, a scorecard viz only makes sense
    // scoped to exactly one metric — summing "Prescriptions Dispensed" and
    // "Dispensing Accuracy %" together isn't a number anyone wants. Bar/pie/
    // table/grouped-line can reasonably span several metrics at once.
    const scorecardSingleMetric = isKPI || isLine;

    return (
        <div>
            {isScorecard && (
                <div style={{
                    background: '#F5EEF8', border: '1px solid #D2B4DE',
                    borderRadius: 8, padding: '10px 14px',
                    fontSize: 11, color: '#6C3483', marginBottom: 16,
                }}>
                    📊 This is a <strong>KPI Scorecard</strong> connection — its rows are shaped differently
                    from a normal sheet (category / metric / value / period, not your own custom fields).
                    Use the filter section below to scope this chart to specific KPIs.
                </div>
            )}

            {/* Available fields hint */}
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

                {/* Type */}
                <Field label="Visualization Type">
                    <select value={form.type} onChange={e => set('type', e.target.value)} style={iStyle}>
                        {VIZ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </Field>

                {/* Label / Title */}
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
                                Use "Latest" for a scorecard KPI card — it shows the most recent period's value, not a total across all months.
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
                {(isBar || isLine) && !isGroupedBar && <>
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

                {/* ── Grouped Bar fields ─────────────────────── */}
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

                        <Field label="Values to compare (add each bar series)" span>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>
                                Each entry becomes one set of bars. Add 2 or more to compare them side by side.
                                {isScorecard && ' For scorecard data, this is usually just one entry: "value" — the filter below is what actually separates each series.'}
                            </div>

                            {/* Existing yFields */}
                            {(form.yFields || []).map((yf, i) => (
                                <div key={i} style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px',
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
                                        {i === 0 && <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>Bar colour</div>}
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            {['#117A65','#E74C3C','#1B4F72','#CA6F1E','#6C3483','#888'].map(col => (
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

                            {/* Add new yField */}
                            <button
                                onClick={() => set('yFields', [...(form.yFields || []), { field: '', label: '', color: '#117A65' }])}
                                style={{
                                    width: '100%', padding: '7px 14px',
                                    background: 'transparent', border: '1.5px dashed var(--border)',
                                    borderRadius: 7, fontSize: 11, fontWeight: 600,
                                    cursor: 'pointer', color: 'var(--muted)',
                                }}
                            >
                                + Add series to compare
                            </button>

                            {/* Quick-add from available fields */}
                            {fields.length > 0 && (
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
                                                        color: ['#117A65','#E74C3C','#1B4F72','#CA6F1E'][(form.yFields||[]).length % 4],
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

                        {/* Selected columns */}
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

                        {/* Add column from available fields */}
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

                        {/* Manual entry if no fields loaded */}
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

                {/* ── Scorecard filter — applies to every viz type ──── */}
                {isScorecard && (
                    <ScorecardFilterPicker
                        connection={connection}
                        category={filterCategory}
                        setCategory={setFilterCategory}
                        selectedMetrics={selectedMetrics}
                        setSelectedMetrics={setSelectedMetrics}
                        singleMetric={scorecardSingleMetric}
                    />
                )}
            </div>

                {/* ── Pages — which pages should this viz appear on ─── */}
                <Field label="Show on pages (leave blank to use connection default)" span>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
                        Select specific pages for this visualization. If left blank, it will appear on all pages this connection feeds.
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {['overview','inventory','pharmacy','store','grn','supplychain',
                          'debtors','cashbook','expenses','revenue','weekly','assets',
                          'kpi','payables','hr','it', 'cssd'].map(p => {
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

            {/* ── Visibility ───────────────────────────────────── */}
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
                against real fetched rows. If it looks right here, it'll
                look right after saving — this isn't a separate lookalike
                renderer that could drift out of sync. ──────────────────── */}
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
                    isVizReady(form) ? (
                        <div style={{ background: '#fff', borderRadius: 8, padding: 12 }}>
                            <DynamicViz viz={form} rows={previewRows} />
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                            Fill in the fields above (and pick your KPI filter, if this is a scorecard connection) to see a live preview.
                        </div>
                    )
                )}
            </div>

            {/* Actions */}
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