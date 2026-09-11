'use client';

/**
 * components/DynamicViz.jsx
 *
 * Renders visualizations from the Drive JSON config.
 * Automatically detects if data spans multiple time periods
 * and switches between time-series and flat rendering.
 *
 * USAGE:
 *   <DynamicVizList connection={conn} rows={rows} />
 *   <DynamicVizList connection={conn} rows={rows} only={['kpi']} />
 *   <DynamicViz viz={viz} rows={rows} />
 *
 * viz.filters — row-level filtering applied before any aggregation.
 * Mainly for scorecard connections, where one connection's rows hold every
 * KPI mixed together (category/metric/value/_period) — without this, a
 * chart has no way to say "just this one metric" and would otherwise sum
 * unrelated KPIs (percentages, headcounts, currency) into one meaningless
 * number. Shape:
 *   viz.filters = [
 *     { field: 'category', values: ['Clinical Supervision and Leadership'] },
 *     { field: 'metric',   values: ['Prescriptions Dispensed'] },
 *   ]
 * A row must match every filter entry (AND across filters) and match at
 * least one value within each entry (OR within a filter). An entry with
 * an empty values[] is ignored (no constraint). Works for any connection
 * type, not just scorecards — e.g. `{ field: 'dept', values: ['Kitchen'] }`
 * on a normal connection.
 *
 * NEW — grouped series can now be scoped with matchField/matchValue:
 * ─────────────────────────────────────────────────────────────────
 * viz.yFields entries used to mean "sum this different FIELD as its own
 * series" (e.g. compare a `receipts` column against an `issues` column).
 * That falls apart for scorecard data, where several things you want to
 * compare (Pharmacist / Pharm. Tech. / Porter / Admin) all live in the
 * SAME field (`value`), distinguished only by another column (`subLabel`).
 *
 * So a yField entry can now optionally carry:
 *   { field: 'value', matchField: 'subLabel', matchValue: 'Pharmacist', label: 'Pharmacist' }
 * meaning: "before summing this series, only include rows where
 * row[matchField] === matchValue". A yField with no matchField behaves
 * exactly as before (no extra filtering) — fully backward compatible with
 * every existing grouped_line viz.
 *
 * See rowMatchesSeries() and buildGroupedSeriesData() below for the
 * mechanics, and VizGroupedBar (new) / VizGroupedLine (updated) for how
 * they're used.
 */

import { useState } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fmt, COLORS } from '../dashboard/lib/data';
import tableStyles from '../styles/Table.module.css';

const tip = { background: '#fff', border: '1px solid #E0E4EA', borderRadius: 8, fontSize: 11 };
const n   = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;

// ─── Viz-level row filtering ────────────────────────────────────

export function applyVizFilters(rows, viz) {
    const filters = viz?.filters;
    if (!filters || !filters.length || !rows?.length) return rows || [];

    return rows.filter(row =>
        filters.every(f => {
            if (!f?.field || !f.values || !f.values.length) return true; // no constraint
            return f.values.includes(String(row[f.field] ?? ''));
        })
    );
}

// ─── Time-series detection ────────────────────────────────────

/**
 * Detects whether rows span multiple time periods.
 * Returns { isTimeSeries, periods, groupedByPeriod }
 *
 * A dataset is considered time-series when:
 *  - rows have a _period field AND
 *  - there are 2+ distinct periods
 */
export function detectTimeSeries(rows) {
    if (!rows?.length) return { isTimeSeries: false, periods: [], groupedByPeriod: {} };

    const periods = [...new Set(rows.map(r => r._period).filter(Boolean))].sort();

    if (periods.length < 2) {
        return { isTimeSeries: false, periods, groupedByPeriod: {} };
    }

    // Group rows by period
    const groupedByPeriod = {};
    periods.forEach(p => {
        groupedByPeriod[p] = rows.filter(r => r._period === p);
    });

    return { isTimeSeries: true, periods, groupedByPeriod };
}

/**
 * Aggregate rows by period for a trend chart.
 * groupByField: optional field to group within each period (e.g. 'dept')
 */
export function buildTrendData(rows, fields = ['total', 'qty']) {
    const grouped = {};

    rows.forEach(row => {
        const period = row._period || 'unknown';
        if (!grouped[period]) {
            grouped[period] = { month: period };
            fields.forEach(f => { grouped[period][f] = 0; });
        }
        fields.forEach(f => { grouped[period][f] += n(row[f]); });
    });

    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Groups rows by a category field, summing a value field for each group.
 * This is what makes "one bar per vendor / department / item" work correctly
 * when the underlying data has many rows per category (a ledger, not a
 * one-row-per-entity register). Order of first appearance is preserved
 * before any sort is applied by the caller.
 */
function groupAndSum(rows, catField, valField) {
    const order = [];
    const totals = {};
    rows.forEach(r => {
        const key = String(r[catField] ?? '—').trim() || '—';
        if (!(key in totals)) { totals[key] = 0; order.push(key); }
        totals[key] += n(r[valField]);
    });
    return order.map(key => ({ x: key.length > 22 ? key.slice(0, 22) + '…' : key, y: totals[key] }));
}

// ─── Grouped-series helpers (bar + line share these) ───────────

/**
 * Does this row belong in this particular series?
 *
 * If the series has no matchField, it's an "old-style" series — every row
 * counts, exactly like before this feature existed.
 *
 * If it DOES have a matchField (e.g. 'subLabel'), the row only counts when
 * that column's value equals matchValue (e.g. 'Porter'). This is what lets
 * four series all read the same `value` field but each only "see" the rows
 * belonging to one role/category/whatever the sheet split things by.
 */
function rowMatchesSeries(row, f) {
    if (!f.matchField) return true;
    return String(row[f.matchField] ?? '').trim() === String(f.matchValue ?? '').trim();
}

/**
 * Turns viz.yFields + rows into chart-ready data for BOTH grouped_bar and
 * grouped_line (they need the exact same shape — only how it's drawn differs).
 *
 * Why not just key each series by its `field` name (the way the OLD code did)?
 * Because two series can now legitimately share the same field — e.g. all four
 * "role" series above read `value`. If we used `field` as the object key, the
 * second series to run would silently overwrite the first one's numbers in the
 * same slot. So instead every series gets its own throwaway key based on its
 * POSITION in the yFields array — 's0' for the first entry, 's1' for the
 * second, and so on — guaranteed unique regardless of what `field` they share.
 *
 * Returns both the chart data AND those generated keys, because the renderer
 * needs to know which key in the data belongs to which <Bar>/<Line> — see
 * VizGroupedBar / VizGroupedLine below, which zip yFields[i] together with
 * seriesKeys[i] to get the right label/color on the right line of data.
 */
function buildGroupedSeriesData(rows, viz, isTimeSeries, period) {
    const yFields    = viz.yFields || [];
    const seriesKeys = yFields.map((_, i) => `s${i}`);

    if (isTimeSeries && period === 'all') {
        // Trend mode: one data point per PERIOD (month), each holding every
        // series' total for that month — e.g. { x: '2026-01', s0: 4, s1: 4, s2: 1, s3: 1 }
        const byPeriod = {};
        rows.forEach(r => {
            const p = r._period || 'unknown';
            if (!byPeriod[p]) {
                byPeriod[p] = { x: p };
                seriesKeys.forEach(k => { byPeriod[p][k] = 0; });
            }
            yFields.forEach((f, i) => {
                if (rowMatchesSeries(r, f)) byPeriod[p][seriesKeys[i]] += n(r[f.field]);
            });
        });
        return { chartData: Object.values(byPeriod).sort((a, b) => a.x.localeCompare(b.x)), seriesKeys };
    }

    // Snapshot mode: one data point per whatever viz.xField is (e.g. 'category'
    // or 'metric') instead of per month — used when a specific period is
    // selected, or the data isn't a time series at all.
    const filteredRows = isTimeSeries ? rows.filter(r => r._period === period) : rows;
    const byX = {};
    filteredRows.forEach(r => {
        const x = String(r[viz.xField] || '—').slice(0, 24);
        if (!byX[x]) {
            byX[x] = { x };
            seriesKeys.forEach(k => { byX[x][k] = 0; });
        }
        yFields.forEach((f, i) => {
            if (rowMatchesSeries(r, f)) byX[x][seriesKeys[i]] += n(r[f.field]);
        });
    });
    return { chartData: Object.values(byX), seriesKeys };
}

// ─── Aggregation ──────────────────────────────────────────────

function aggregate(rows, field, agg) {
    if (!rows?.length || !field) return 0;
    switch (agg) {
        case 'countDistinct': {
            const set = new Set(rows.map(r => r[field]).filter(v => v !== undefined && v !== null && v !== ''));
            return set.size;
        }
        case 'count': return rows.length;
        // 'latest' just needs the last row's ACTUAL value — no summing happens,
        // so there's no reason to force it through n() first. This is what makes
        // text-valued KPIs (e.g. a scorecard row like "Most prescribed drug" —
        // "Ivf Pcm", "Cutenox"...) work: previously n("Ivf Pcm") silently became
        // 0 before this switch ever saw it, so a text KPI's card always showed
        // "0" no matter what. Reading the raw field straight off the last row
        // sidesteps that entirely — numeric fields still work exactly as before,
        // since a number is still just returned as itself here.
        case 'latest': {
            const raw = rows[rows.length - 1]?.[field];
            return raw === undefined || raw === null || raw === '' ? 0 : raw;
        }
        default: break;
    }
    const values = rows.map(r => n(r[field])).filter(v => !isNaN(v));
    switch (agg) {
        case 'sum':    return values.reduce((a, b) => a + b, 0);
        case 'avg':    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        case 'max':    return Math.max(...values);
        case 'min':    return Math.min(...values);
        default:       return values.reduce((a, b) => a + b, 0);
    }
}

function formatValue(value, format) {
    // A KPI's field might legitimately hold text — a scorecard row like "Most
    // prescribed drug" whose value is "Ivf Pcm", not a number. If the format
    // dropdown was still left on Currency/Number/Percent (easy to forget to
    // change for a KPI you don't think of as "text"), those branches would
    // otherwise silently produce "₦NaN" or "NaN%". So: if this value isn't
    // actually a number, show it plainly no matter what format was picked —
    // only numeric values go through the currency/percent/number formatting.
    const isNumeric = value !== '' && value !== null && !isNaN(Number(value));
    if (!isNumeric && format !== 'text') return String(value);

    switch (format) {
        case 'currency': return fmt(value);
        case 'percent':  return `${Number(value).toFixed(1)}%`;
        case 'number':   return Number(value).toLocaleString();
        case 'text':     return String(value);
        default:         return Number(value).toLocaleString();
    }
}

// Returns a tooltip formatter based on viz.format
function makeFormatter(format) {
    switch (format) {
        case 'currency': return v => fmt(v);
        case 'percent':  return v => `${Number(v).toFixed(1)}%`;
        case 'number':   return v => Number(v).toLocaleString();
        case 'text':     return v => String(v);
        default:         return v => Number(v).toLocaleString();
    }
}

// Returns a compact axis tick formatter
function makeTickFormatter(format) {
    switch (format) {
        case 'currency':
            return v => v >= 1e9 ? `₦${(v/1e9).toFixed(1)}B`
                      : v >= 1e6 ? `₦${(v/1e6).toFixed(1)}M`
                      : v >= 1e3 ? `₦${(v/1e3).toFixed(0)}K`
                      : `₦${v}`;
        case 'percent':
            return v => `${Number(v).toFixed(0)}%`;
        case 'number':
        default:
            return v => v >= 1e9 ? `${(v/1e9).toFixed(1)}B`
                      : v >= 1e6 ? `${(v/1e6).toFixed(1)}M`
                      : v >= 1e3 ? `${(v/1e3).toFixed(0)}K`
                      : Number(v).toLocaleString();
    }
}

// ─── Period filter bar ────────────────────────────────────────

function PeriodFilter({ periods, selected, onChange }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Period:</span>
            <button
                onClick={() => onChange('all')}
                style={{
                    padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    background: selected === 'all' ? 'var(--teal)' : 'transparent',
                    color: selected === 'all' ? '#fff' : 'var(--muted)',
                    border: `1px solid ${selected === 'all' ? 'var(--teal)' : 'var(--border)'}`,
                }}
            >All</button>
            {periods.map(p => (
                <button key={p} onClick={() => onChange(p)} style={{
                    padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    background: selected === p ? 'var(--navy)' : 'transparent',
                    color: selected === p ? '#fff' : 'var(--muted)',
                    border: `1px solid ${selected === p ? 'var(--navy)' : 'var(--border)'}`,
                }}>{p}</button>
            ))}
        </div>
    );
}

// ─── COLOR MAP for KPIs ───────────────────────────────────────

const COLOR_MAP = {
    blue:   { bg: '#EBF5FB', border: '#AED6F1', text: '#1B4F72' },
    green:  { bg: '#E8F8F5', border: '#A9DFBF', text: '#117A65' },
    red:    { bg: '#FEECEC', border: '#F1948A', text: '#C0392B' },
    amber:  { bg: '#FEF9E7', border: '#F9E79F', text: '#9A7D0A' },
    purple: { bg: '#F5EEF8', border: '#D2B4DE', text: '#6C3483' },
    navy:   { bg: '#EAF0F6', border: '#AEB6BF', text: '#1B2631' },
};

// ─── VIZ RENDERERS ───────────────────────────────────────────

function VizKPI({ viz, rows, isTimeSeries, periods }) {
    const [period, setPeriod] = useState('all');
    const filteredRows = isTimeSeries && period !== 'all'
        ? rows.filter(r => r._period === period)
        : rows;

    const value  = aggregate(filteredRows, viz.field, viz.agg || 'sum');
    const colors = COLOR_MAP[viz.color] || COLOR_MAP.blue;

    return (
        <div style={{ background: colors.bg, border: `1.5px solid ${colors.border}`, borderRadius: 10, padding: '16px 20px' }}>
            {isTimeSeries && (
                <select value={period} onChange={e => setPeriod(e.target.value)}
                    style={{ fontSize: 9, border: 'none', background: 'transparent', color: colors.text, marginBottom: 6, cursor: 'pointer', fontWeight: 700 }}>
                    <option value="all">All periods</option>
                    {periods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            )}
            <div style={{ fontSize: 10, fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                {viz.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: colors.text }}>
                {formatValue(value, viz.format || 'currency')}
            </div>
            {isTimeSeries && period === 'all' && (
                <div style={{ fontSize: 9, color: colors.text, opacity: 0.6, marginTop: 4 }}>Across {periods.length} periods</div>
            )}
        </div>
    );
}

function VizBar({ viz, rows, isTimeSeries, periods }) {
    const [period, setPeriod] = useState('all');

    // If time-series and "all" selected → show trend (one bar per period)
    // If time-series and specific period → show flat data for that period, grouped by category
    // If not time-series → show flat data, grouped by category
    //
    // "Grouped by category" matters whenever xField can repeat across rows
    // (multiple transactions for the same vendor/department/item) — each
    // category becomes exactly one bar, summed, instead of one bar per row.
    let chartData;

    if (isTimeSeries && period === 'all') {
        // Trend mode — aggregate by period
        const trendFields = [viz.yField].filter(Boolean);
        const trend       = buildTrendData(rows, trendFields);
        chartData = trend.map(t => ({ x: t.month, y: n(t[viz.yField]) }));
    } else {
        const filteredRows = isTimeSeries ? rows.filter(r => r._period === period) : rows;
        let data = groupAndSum(filteredRows, viz.xField, viz.yField);
        if (viz.sort === 'desc') data.sort((a, b) => b.y - a.y);
        if (viz.sort === 'asc')  data.sort((a, b) => a.y - b.y);
        if (viz.limit)           data = data.slice(0, viz.limit);
        chartData = data;
    }

    const fixedTarget  = viz.targetLine?.value;
    const isHorizontal = viz.orientation === 'horizontal' && !(isTimeSeries && period === 'all');
    const height       = isHorizontal ? Math.max(200, chartData.length * 28) : 220;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>
                    {viz.title}
                    {isTimeSeries && period === 'all' && <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 6 }}>trend across all periods</span>}
                </div>
                {isTimeSeries && (
                    <select value={period} onChange={e => setPeriod(e.target.value)}
                        style={{ fontSize: 10, border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer' }}>
                        <option value="all">All (trend)</option>
                        {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                )}
            </div>
            <ResponsiveContainer width="100%" height={height}>
                {isHorizontal ? (
                    <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                        <CartesianGrid horizontal={false} stroke="rgba(0,0,0,.05)" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={makeTickFormatter(viz.format)} />
                        <YAxis type="category" dataKey="x" tick={{ fontSize: 9, fill: '#7F8C9A' }} axisLine={false} tickLine={false} width={120} />
                        <Tooltip contentStyle={tip} formatter={makeFormatter(viz.format)} />
                        {fixedTarget && <ReferenceLine x={fixedTarget} stroke="#E74C3C" strokeDasharray="4 4" />}
                        <Bar dataKey="y" name={viz.yField} radius={[0, 3, 3, 0]}>
                            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                    </BarChart>
                ) : (
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                        <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#7F8C9A' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#7F8C9A' }} axisLine={false} tickLine={false} width={48} tickFormatter={makeTickFormatter(viz.format)} />
                        <Tooltip contentStyle={tip} formatter={makeFormatter(viz.format)} />
                        {fixedTarget && <ReferenceLine y={fixedTarget} stroke="#E74C3C" strokeDasharray="4 4" />}
                        <Bar dataKey="y" name={viz.yField} fill="#117A65" radius={[3, 3, 0, 0]}>
                            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                    </BarChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}

function VizLine({ viz, rows, isTimeSeries, periods }) {
    const [period, setPeriod] = useState('all');

    let chartData;
    if (isTimeSeries && period === 'all') {
        const trend = buildTrendData(rows, [viz.yField].filter(Boolean));
        chartData   = trend.map(t => ({ x: t.month, y: n(t[viz.yField]) }));
    } else {
        // Grouped by category for the same reason as VizBar — a category
        // (e.g. a date without full time-series granularity, or any
        // repeating label) can span multiple rows.
        const filteredRows = isTimeSeries ? rows.filter(r => r._period === period) : rows;
        chartData = groupAndSum(filteredRows, viz.xField, viz.yField)
            .map(d => ({ ...d, x: d.x.slice(0, 10) }));
    }

    const fixedTarget = viz.targetLine?.value;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>{viz.title}</div>
                {isTimeSeries && (
                    <select value={period} onChange={e => setPeriod(e.target.value)}
                        style={{ fontSize: 10, border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer' }}>
                        <option value="all">All (trend)</option>
                        {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                )}
            </div>
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                    <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#7F8C9A' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#7F8C9A' }} axisLine={false} tickLine={false} width={48} tickFormatter={makeTickFormatter(viz.format)} />
                    <Tooltip contentStyle={tip} formatter={makeFormatter(viz.format)} />
                    {fixedTarget && <ReferenceLine y={fixedTarget} stroke="#E74C3C" strokeDasharray="4 4" />}
                    <Line dataKey="y" stroke="#117A65" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function VizPie({ viz, rows, isTimeSeries, periods }) {
    const [period, setPeriod] = useState(periods[periods.length - 1] || 'all');
    const filteredRows = isTimeSeries && period !== 'all'
        ? rows.filter(r => r._period === period)
        : rows;

    // Group by catField, summing valField
    const grouped = {};
    filteredRows.forEach(r => {
        const cat = (r[viz.catField] || '').trim() || 'Other';
        grouped[cat] = (grouped[cat] || 0) + n(r[viz.valField]);
    });

    const rawEntries = Object.entries(grouped)
        .filter(([, v]) => v > 0)          // drop zero-value categories
        .sort((a, b) => b[1] - a[1]);

    const total = rawEntries.reduce((s, [, v]) => s + v, 0);

    // Smart formatting — avoid dividing small quantities by 1e6
    // If the max value is < 1,000 treat as plain numbers; otherwise use ₦M
    const data = rawEntries.map(([name, value]) => ({
        name,
        rawValue: value,
        value: value, // raw value used for proportional sizing — display uses formatValue()
    }));

    const RADIAN      = Math.PI / 180;
    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.04) return null; // hide label on very small slices
        const r = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + r * Math.cos(-midAngle * RADIAN);
        const y = cy + r * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="#fff" textAnchor="middle"
                dominantBaseline="central" fontSize={9} fontWeight={700}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    // Custom tooltip — shows name, value, and % share
    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const entry = payload[0];
        const pct   = total > 0 ? (entry.payload.rawValue / total * 100).toFixed(1) : 0;
        return (
            <div style={{ background: '#fff', border: '1px solid #E0E4EA', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
                <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>{entry.name}</div>
                <div style={{ color: 'var(--muted)' }}>
                    {formatValue(entry.payload.rawValue, viz.format)}
                    <span style={{ marginLeft: 8, fontWeight: 600, color: 'var(--teal)' }}>{pct}%</span>
                </div>
            </div>
        );
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>{viz.title}</div>
                {isTimeSeries && (
                    <select value={period} onChange={e => setPeriod(e.target.value)}
                        style={{ fontSize: 10, border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer' }}>
                        <option value="all">All periods</option>
                        {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                )}
            </div>

            {data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)', fontSize: 11 }}>
                    No data — check that "{viz.catField}" and "{viz.valField}" columns exist and have values.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                    {/* Pie */}
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%" cy="50%"
                                outerRadius={85}
                                labelLine={false}
                                label={renderLabel}
                            >
                                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Inline legend — replaces the default Legend component */}
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {data.map((entry, i) => {
                            const pct = total > 0 ? (entry.rawValue / total * 100).toFixed(1) : 0;
                            return (
                                <div key={entry.name} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    marginBottom: 6, fontSize: 10,
                                }}>
                                    <div style={{
                                        width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                                        background: COLORS[i % COLORS.length],
                                    }} />
                                    <div style={{ flex: 1, color: 'var(--navy)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {entry.name}
                                    </div>
                                    <div style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{pct}%</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

const ROW_LIMITS = [10, 20, 50, 100, 250];

function VizTable({ viz, rows, isTimeSeries, periods }) {
    const [period,   setPeriod]   = useState('all');
    const [rowLimit, setRowLimit] = useState(viz.defaultLimit || 20);

    const periodFiltered = isTimeSeries && period !== 'all'
        ? rows.filter(r => r._period === period)
        : rows;

    const displayRows = rowLimit === 'all' ? periodFiltered : periodFiltered.slice(0, rowLimit);

    const columns = (viz.columns || []).filter(c => !c.startsWith('_'));
    const displayCols = columns.length > 0
        ? columns
        : (periodFiltered[0] ? Object.keys(periodFiltered[0]).filter(k => !k.startsWith('_')) : []);

    return (
        <div>
            {/* Header row with controls */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)' }}>
                    {viz.title}
                    <span style={{ fontSize:10, fontWeight:400, color:'var(--muted)', marginLeft:8 }}>
                        {displayRows.length === periodFiltered.length
                            ? `${periodFiltered.length} rows`
                            : `${displayRows.length} of ${periodFiltered.length} rows`}
                    </span>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {/* Period filter */}
                    {isTimeSeries && (
                        <PeriodFilter periods={periods} selected={period} onChange={setPeriod} />
                    )}

                    {/* Row limit */}
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ fontSize:10, color:'var(--muted)', whiteSpace:'nowrap' }}>Show:</span>
                        <select
                            value={rowLimit}
                            onChange={e => setRowLimit(e.target.value === 'all' ? 'all' : +e.target.value)}
                            style={{ fontSize:11, border:'1.5px solid var(--border)', borderRadius:6,
                                padding:'4px 8px', outline:'none', background:'#fff', cursor:'pointer' }}
                        >
                            {ROW_LIMITS.map(l => (
                                <option key={l} value={l}>{l} rows</option>
                            ))}
                            <option value="all">All rows</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style={{ overflowX:'auto' }}>
                <table className={tableStyles.table}>
                    <thead>
                        <tr>
                            {isTimeSeries && period === 'all' && <th>Period</th>}
                            {displayCols.map(col => (
                                <th key={col}>{col.replace(/([A-Z])/g,' $1').replace(/_/g,' ')}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayRows.map((row, i) => (
                            <tr key={i}>
                                {isTimeSeries && period === 'all' && (
                                    <td style={{ fontSize:10, color:'var(--muted)', whiteSpace:'nowrap' }}>{row._period}</td>
                                )}
                                {displayCols.map(col => {
                                    const val     = row[col] ?? '—';
                                    const num     = n(val);
                                    const display = typeof val === 'string' && num > 1000 && !isNaN(num) ? fmt(num) : val;
                                    return <td key={col}>{display}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Load more */}
            {rowLimit !== 'all' && periodFiltered.length > rowLimit && (
                <div style={{ textAlign:'center', marginTop:10 }}>
                    <button
                        onClick={() => setRowLimit(l => typeof l === 'number' ? Math.min(l + 50, periodFiltered.length) : 'all')}
                        style={{ padding:'6px 20px', background:'transparent', border:'1.5px solid var(--border)',
                            borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', color:'var(--navy)' }}
                    >
                        Load more ({periodFiltered.length - rowLimit} remaining)
                    </button>
                    <button
                        onClick={() => setRowLimit('all')}
                        style={{ marginLeft:8, padding:'6px 14px', background:'transparent', border:'none',
                            fontSize:10, cursor:'pointer', color:'var(--muted)', textDecoration:'underline' }}
                    >
                        Show all
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Grouped Line Chart ───────────────────────────────────────
/**
 * Multiple lines on one chart for comparison over time.
 * Config:
 *   viz.xField   — X axis (e.g. "month", "date") — used only in snapshot mode
 *   viz.yFields  — array of { field, label, color, matchField?, matchValue? }
 *   viz.format   — 'currency' | 'number' | 'percent'
 *
 * See buildGroupedSeriesData() above for how yFields → chart data.
 */
function VizGroupedLine({ viz, rows, isTimeSeries, periods }) {
    const [period, setPeriod] = useState('all');

    const yFields = viz.yFields || [];
    if (yFields.length === 0) {
        return <div style={{ color: 'var(--muted)', fontSize: 11, padding: 16 }}>No yFields configured.</div>;
    }

    const { chartData, seriesKeys } = buildGroupedSeriesData(rows, viz, isTimeSeries, period);

    const DEFAULT_COLORS = ['#117A65', '#E74C3C', '#1B4F72', '#CA6F1E', '#6C3483', '#888'];
    const formatter      = makeFormatter(viz.format || 'number');
    const tickFormatter   = makeTickFormatter(viz.format || 'number');

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>{viz.title}</div>
                {isTimeSeries && (
                    <select value={period} onChange={e => setPeriod(e.target.value)}
                        style={{ fontSize: 10, border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer' }}>
                        <option value="all">All (trend)</option>
                        {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                )}
            </div>
            <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                    <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#7F8C9A' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#7F8C9A' }} axisLine={false} tickLine={false} width={48} tickFormatter={tickFormatter} />
                    <Tooltip contentStyle={tip} formatter={formatter} />
                    <Legend iconSize={8} iconType="line" wrapperStyle={{ fontSize: 10 }} />
                    {yFields.map((f, i) => (
                        <Line
                            key={seriesKeys[i]}
                            dataKey={seriesKeys[i]}
                            name={f.label || f.field}
                            stroke={f.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Grouped Bar Chart (NEW — was previously selectable in VizForm but had
//      no renderer at all, so saving one just made it silently disappear) ──
/**
 * Side-by-side bars for comparison — the bar-chart equivalent of
 * VizGroupedLine above, built on the exact same buildGroupedSeriesData()
 * helper so both chart types split series (e.g. by subLabel) identically.
 *
 * Config: same shape as VizGroupedLine — xField, yFields, format.
 * Recharts groups multiple <Bar> children into a cluster automatically
 * whenever none of them is given a stackId, which is what we want here
 * (clustered, not stacked).
 */
function VizGroupedBar({ viz, rows, isTimeSeries, periods }) {
    const [period, setPeriod] = useState('all');

    const yFields = viz.yFields || [];
    if (yFields.length === 0) {
        return <div style={{ color: 'var(--muted)', fontSize: 11, padding: 16 }}>No yFields configured.</div>;
    }

    const { chartData, seriesKeys } = buildGroupedSeriesData(rows, viz, isTimeSeries, period);

    const DEFAULT_COLORS = ['#117A65', '#E74C3C', '#1B4F72', '#CA6F1E', '#6C3483', '#888'];
    const formatter      = makeFormatter(viz.format || 'number');
    const tickFormatter   = makeTickFormatter(viz.format || 'number');

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>{viz.title}</div>
                {isTimeSeries && (
                    <select value={period} onChange={e => setPeriod(e.target.value)}
                        style={{ fontSize: 10, border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer' }}>
                        <option value="all">All (trend)</option>
                        {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                )}
            </div>
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                    <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#7F8C9A' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#7F8C9A' }} axisLine={false} tickLine={false} width={48} tickFormatter={tickFormatter} />
                    <Tooltip contentStyle={tip} formatter={formatter} />
                    <Legend iconSize={8} iconType="rect" wrapperStyle={{ fontSize: 10 }} />
                    {yFields.map((f, i) => (
                        <Bar
                            key={seriesKeys[i]}
                            dataKey={seriesKeys[i]}
                            name={f.label || f.field}
                            fill={f.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                            radius={[3, 3, 0, 0]}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Single viz renderer ──────────────────────────────────────

export function DynamicViz({ viz, rows = [] }) {
    if (!viz || !rows) return null;

    // Apply viz.filters BEFORE anything else touches the rows — every
    // renderer below (KPI/bar/line/pie/table) and the time-series detector
    // operate only on the filtered set, so a scorecard chart scoped to
    // "metric = Prescriptions Dispensed" never sees any other KPI's rows.
    const scopedRows = applyVizFilters(rows, viz);

    const { isTimeSeries, periods } = detectTimeSeries(scopedRows);

    const cardStyle = {
        background: 'var(--card)', borderRadius: 10,
        padding: '16px', boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border)',
    };

    const props = { viz, rows: scopedRows, isTimeSeries, periods };

    switch (viz.type) {
        case 'kpi':          return <VizKPI          {...props} />;
        case 'bar':          return <div style={cardStyle}><VizBar         {...props} /></div>;
        case 'grouped_bar':  return <div style={cardStyle}><VizGroupedBar  {...props} /></div>;
        case 'line':         return <div style={cardStyle}><VizLine        {...props} /></div>;
        case 'grouped_line': return <div style={cardStyle}><VizGroupedLine {...props} /></div>;
        case 'pie':          return <div style={cardStyle}><VizPie         {...props} /></div>;
        case 'table':        return <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}><div style={{ padding: 16 }}><VizTable {...props} /></div></div>;
        default:             return <div style={{ ...cardStyle, color: 'var(--muted)', fontSize: 11 }}>Unknown viz type: {viz.type}</div>;
    }
}

// ─── Multi-viz renderer ───────────────────────────────────────

export function DynamicVizList({ connection, rows = [], only, kpiStyle, chartStyle }) {
    if (!connection?.visualizations?.length) return null;

    // Hidden vizs stay saved (config intact, toggleable back on from Settings)
    // but never render — filter them out before any other filtering happens.
    const visible = connection.visualizations.filter(v => !v.hidden);

    const vizs = only
        ? visible.filter(v => only.includes(v.type))
        : visible;

    const kpis   = vizs.filter(v => v.type === 'kpi');
    const charts = vizs.filter(v => ['bar', 'grouped_bar', 'line', 'grouped_line', 'pie'].includes(v.type));
    const tables = vizs.filter(v => v.type === 'table');

    return (
        <div>
            {kpis.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
                    gap: 12, marginBottom: 16, ...kpiStyle,
                }}>
                    {kpis.map(viz => <DynamicViz key={viz.id} viz={viz} rows={rows} />)}
                </div>
            )}
            {charts.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: charts.length === 1 ? '1fr' : '1fr 1fr',
                    gap: 14, marginBottom: 16, ...chartStyle,
                }}>
                    {charts.map(viz => <DynamicViz key={viz.id} viz={viz} rows={rows} />)}
                </div>
            )}
            {tables.map(viz => (
                <div key={viz.id} style={{ marginBottom: 16 }}>
                    <DynamicViz viz={viz} rows={rows} />
                </div>
            ))}
        </div>
    );
}