'use client';

/**
 * components/DynamicViz.jsx
 *
 * Renders visualizations from the Drive JSON config.
 *
 * viz.filters — row-level filtering applied before ANYTHING else touches
 * the rows, for EVERY viz type, on EVERY connection type (not just
 * scorecards). Shape:
 *   viz.filters = [{ field: 'name', values: ['Bed fee (Admission)'] }]
 * A row must match every filter entry (AND across entries) and match at
 * least one value within each entry (OR within an entry). This is what
 * lets a KPI card (or any chart) be scoped to one particular row/line-item
 * on a normal table, not just to a whole-sheet aggregate.
 *
 * A filter entry can also carry `exclude: true`, which inverts it: rows
 * whose value IS in values[] are dropped and everything else is kept
 * (e.g. a pie of the whole sheet minus a few line items). Entries without
 * the flag behave exactly as before.
 *
 * viz.acrossColumns + viz.columnSeries — for Bar/Line charts on a PLAIN
 * table connection where the months (or any other series) are separate
 * COLUMNS rather than separate ROWS (the shape Scorecard mode expects).
 * Melts those named columns into X-axis points on the fly, at render
 * time, using whatever rows survived viz.filters above:
 *   - No row filter applied  → each column gets SUMMED across every row
 *     (reconstructs a "total per month" trend live from the real data).
 *   - Filtered to one row    → each column is just read off that one row
 *     (a single line item's month-by-month trend, off a plain table).
 * Both cases are the exact same code path — summing a single row is the
 * same as reading it, so there's no separate "row" vs "sum" mode to
 * configure; it falls out naturally from whether a filter narrowed things
 * down first.
 *
 * KPI cards render through <KPICard /> and support optional viz.delta
 * (none | static | vs_previous | vs_target) and viz.badge
 * (none | static | rules) configs — see resolveDelta() / resolveBadge().
 */

import { useState } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fmt, COLORS } from '../dashboard/lib/data';
import tableStyles from '../styles/Table.module.css';
import KPICard from './KPICard';

const tip = { background: '#fff', border: '1px solid #E0E4EA', borderRadius: 8, fontSize: 11 };
const n   = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;

// ─── Viz-level row filtering ────────────────────────────────────

export function applyVizFilters(rows, viz) {
    const filters = viz?.filters;
    if (!filters || !filters.length || !rows?.length) return rows || [];

    return rows.filter(row =>
        filters.every(f => {
            if (!f?.field || !f.values || !f.values.length) return true;
            const hit = f.values.includes(String(row[f.field] ?? ''));
            // f.exclude flips the meaning: drop the matching rows, keep the rest.
            return f.exclude ? !hit : hit;
        })
    );
}

// ─── Time-series detection ────────────────────────────────────

export function detectTimeSeries(rows) {
    if (!rows?.length) return { isTimeSeries: false, periods: [], groupedByPeriod: {} };

    const periods = [...new Set(rows.map(r => r._period).filter(Boolean))].sort();

    if (periods.length < 2) {
        return { isTimeSeries: false, periods, groupedByPeriod: {} };
    }

    const groupedByPeriod = {};
    periods.forEach(p => {
        groupedByPeriod[p] = rows.filter(r => r._period === p);
    });

    return { isTimeSeries: true, periods, groupedByPeriod };
}

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

function rowMatchesSeries(row, f) {
    if (!f.matchField) return true;
    return String(row[f.matchField] ?? '').trim() === String(f.matchValue ?? '').trim();
}

function buildGroupedSeriesData(rows, viz, isTimeSeries, period) {
    const yFields    = viz.yFields || [];
    const seriesKeys = yFields.map((_, i) => `s${i}`);

    if (isTimeSeries && period === 'all') {
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

// ─── Column-series melting (plain-table "plot across columns") ──

function buildColumnSeriesData(rows, columnSeries) {
    const fields = columnSeries?.fields || [];
    if (!fields.length || !rows?.length) return [];
    // Deliberately just ONE code path: sum each named column across
    // whatever rows are here. If viz.filters already narrowed things down
    // to a single row, "summing" it is identical to just reading it — so
    // there's no separate "one row" vs "every row" mode to configure here;
    // it falls straight out of whether a filter was applied upstream.
    return fields.map(f => ({
        x: f.label || f.field,
        y: rows.reduce((s, r) => s + n(r[f.field]), 0),
    }));
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

function makeFormatter(format) {
    switch (format) {
        case 'currency': return v => fmt(v);
        case 'percent':  return v => `${Number(v).toFixed(1)}%`;
        case 'number':   return v => Number(v).toLocaleString();
        case 'text':     return v => String(v);
        default:         return v => Number(v).toLocaleString();
    }
}

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

// ─── KPI HELPERS ──────────────────────────────────────────────

const fmtNum = n => Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—';

const OPS = {
    '>=': (a, b) => a >= b, '>': (a, b) => a > b,
    '<=': (a, b) => a <= b, '<': (a, b) => a < b,
    '==': (a, b) => a === b,
};

function resolveDelta(cfg, { viz, rows, period, periods, value }) {
    if (!cfg || !cfg.mode || cfg.mode === 'none') return null;
    const higherIsBetter = cfg.higherIsBetter !== false;
    const manual = cfg.type && cfg.type !== 'auto';

    // Arrow follows the direction of change; colour follows good/bad.
    const style = (change) => {
        if (manual) return { type: cfg.type };
        if (!change) return { type: 'warn' };
        const good = higherIsBetter ? change > 0 : change < 0;
        return { type: good ? 'up' : 'down', icon: change > 0 ? '↑' : '↓' };
    };

    if (cfg.mode === 'static') {
        return cfg.text ? { text: cfg.text, type: manual ? cfg.type : 'up' } : null;
    }

    if (cfg.mode === 'vs_previous') {
        const ordered = [...(periods || [])].sort();
        const current = period === 'all' ? ordered[ordered.length - 1] : period;
        const i = ordered.indexOf(current);
        if (i < 1) return null; // no earlier period to compare against
        const agg = viz.agg || 'sum';
        const curr = Number(aggregate(rows.filter(r => r._period === current), viz.field, agg));
        const prev = Number(aggregate(rows.filter(r => r._period === ordered[i - 1]), viz.field, agg));
        if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev === 0) return null;
        const change = curr - prev;
        const amount = cfg.display === 'absolute'
            ? fmtNum(Math.abs(change))
            : `${fmtNum(Math.abs(change / prev) * 100)}%`;
        return { text: `${amount} ${cfg.suffix || 'vs previous period'}`.trim(), ...style(change) };
    }

    if (cfg.mode === 'vs_target') {
        const target = Number(cfg.target), v = Number(value);
        if (!Number.isFinite(target) || target === 0 || !Number.isFinite(v)) return null;
        const diff = v - target;
        const text = cfg.display === 'difference'
            ? `${fmtNum(Math.abs(diff))} ${diff >= 0 ? 'above' : 'below'} target`
            : `${fmtNum((v / target) * 100)}% of target`;
        return { text, ...style(diff) };
    }
    return null;
}

function resolveBadge(cfg, value) {
    if (!cfg || !cfg.mode || cfg.mode === 'none') return null;
    if (cfg.mode === 'static') return cfg.text ? { text: cfg.text, type: cfg.type || 'good' } : null;
    if (cfg.mode === 'rules') {
        const v = Number(value);
        const hit = (cfg.rules || []).find(r =>
            OPS[r.op] && r.value !== '' && Number.isFinite(+r.value) && OPS[r.op](v, +r.value));
        if (hit) return { text: hit.text, type: hit.type || 'good' };
        return cfg.fallback?.text ? { text: cfg.fallback.text, type: cfg.fallback.type || 'warn' } : null;
    }
    return null;
}

// ─── VIZ RENDERERS ───────────────────────────────────────────

function VizKPI({ viz, rows, isTimeSeries, periods }) {
    const [period, setPeriod] = useState('all');
    const filteredRows = isTimeSeries && period !== 'all'
        ? rows.filter(r => r._period === period) : rows;

    const value = aggregate(filteredRows, viz.field, viz.agg || 'sum');

    const delta = resolveDelta(viz.delta, { viz, rows, period, periods, value });
    let badge = resolveBadge(viz.badge, value);
    // Only show the "Across N periods" note if no badge is configured
    if (!badge && isTimeSeries && period === 'all') {
        badge = { text: `Across ${periods.length} periods`, type: 'good' };
    }

    const periodPill = isTimeSeries && (
        <select value={period} onChange={e => setPeriod(e.target.value)} style={{
            fontSize: 10, fontWeight: 700, color: 'inherit',
            background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 99, padding: '2px 8px', cursor: 'pointer', outline: 'none', maxWidth: 110,
        }}>
            <option value="all">All periods</option>
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
    );

    return (
        <KPICard
            label={viz.label}
            value={formatValue(value, viz.format || 'currency')}
            color={viz.color || 'blue'}
            delta={delta?.text}
            deltaType={delta?.type}
            deltaIcon={delta?.icon}
            badge={badge?.text}
            badgeType={badge?.type}
            corner={periodPill}
        />
    );
}

function VizBar({ viz, rows, isTimeSeries, periods }) {
    const [period, setPeriod] = useState('all');
    const usesColumnSeries = viz.acrossColumns && viz.columnSeries?.fields?.length;

    let chartData;
    if (usesColumnSeries) {
        chartData = buildColumnSeriesData(rows, viz.columnSeries);
    } else if (isTimeSeries && period === 'all') {
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

    const showPeriodPicker = isTimeSeries && !usesColumnSeries;
    const fixedTarget  = viz.targetLine?.value;
    const isHorizontal = viz.orientation === 'horizontal' && !(isTimeSeries && period === 'all') && !usesColumnSeries;
    const height       = isHorizontal ? Math.max(200, chartData.length * 28) : 220;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>
                    {viz.title}
                    {isTimeSeries && period === 'all' && !usesColumnSeries && <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 6 }}>trend across all periods</span>}
                </div>
                {showPeriodPicker && (
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
    const usesColumnSeries = viz.acrossColumns && viz.columnSeries?.fields?.length;

    let chartData;
    if (usesColumnSeries) {
        chartData = buildColumnSeriesData(rows, viz.columnSeries);
    } else if (isTimeSeries && period === 'all') {
        const trend = buildTrendData(rows, [viz.yField].filter(Boolean));
        chartData   = trend.map(t => ({ x: t.month, y: n(t[viz.yField]) }));
    } else {
        const filteredRows = isTimeSeries ? rows.filter(r => r._period === period) : rows;
        chartData = groupAndSum(filteredRows, viz.xField, viz.yField)
            .map(d => ({ ...d, x: d.x.slice(0, 10) }));
    }

    const showPeriodPicker = isTimeSeries && !usesColumnSeries;
    const fixedTarget = viz.targetLine?.value;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>{viz.title}</div>
                {showPeriodPicker && (
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

    const grouped = {};
    filteredRows.forEach(r => {
        const cat = (r[viz.catField] || '').trim() || 'Other';
        grouped[cat] = (grouped[cat] || 0) + n(r[viz.valField]);
    });

    const rawEntries = Object.entries(grouped)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]);

    const total = rawEntries.reduce((s, [, v]) => s + v, 0);

    const data = rawEntries.map(([name, value]) => ({
        name,
        rawValue: value,
        value: value,
    }));

    const RADIAN      = Math.PI / 180;
    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.04) return null;
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
                    {isTimeSeries && (
                        <PeriodFilter periods={periods} selected={period} onChange={setPeriod} />
                    )}

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