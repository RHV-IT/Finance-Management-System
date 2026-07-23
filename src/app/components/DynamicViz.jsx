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
 
// ─── Aggregation ──────────────────────────────────────────────
 
function aggregate(rows, field, agg) {
    if (!rows?.length || !field) return 0;
    const values = rows.map(r => n(r[field])).filter(v => !isNaN(v));
    switch (agg) {
        case 'sum':    return values.reduce((a, b) => a + b, 0);
        case 'count':  return rows.length;
        case 'avg':    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        case 'max':    return Math.max(...values);
        case 'min':    return Math.min(...values);
        case 'latest': return values[values.length - 1] ?? 0;
        default:       return values.reduce((a, b) => a + b, 0);
    }
}
 
function formatValue(value, format) {
    switch (format) {
        case 'currency': return fmt(value);
        case 'percent':  return `${value.toFixed(1)}%`;
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
                {formatValue(value, viz.format || 'number')}
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
    // If time-series and specific period → show flat data for that period
    // If not time-series → show flat data
    let chartData;
    let xKey = 'x';
    let yKey = 'y';
 
    if (isTimeSeries && period === 'all') {
        // Trend mode — aggregate by period
        const trendFields = [viz.yField].filter(Boolean);
        const trend       = buildTrendData(rows, trendFields);
        chartData = trend.map(t => ({ x: t.month, y: n(t[viz.yField]) }));
    } else {
        const filteredRows = isTimeSeries ? rows.filter(r => r._period === period) : rows;
        let data = [...filteredRows];
        if (viz.sort === 'desc') data.sort((a, b) => n(b[viz.yField]) - n(a[viz.yField]));
        if (viz.sort === 'asc')  data.sort((a, b) => n(a[viz.yField]) - n(b[viz.yField]));
        if (viz.limit)           data = data.slice(0, viz.limit);
        chartData = data.map(r => ({ x: String(r[viz.xField] || '—').slice(0, 22), y: n(r[viz.yField]) }));
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
        const filteredRows = isTimeSeries ? rows.filter(r => r._period === period) : rows;
        chartData = filteredRows.map(r => ({ x: String(r[viz.xField] || '—').slice(0, 10), y: n(r[viz.yField]) }));
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
 
 
// ─── Grouped Bar Chart ────────────────────────────────────────
/**
 * Compares 2 or more values side by side per category.
 * Config:
 *   viz.xField    — the category axis (e.g. "name", "month")
 *   viz.yFields   — array of { field, label, color } to compare
 *                   e.g. [{ field:"receipts", label:"Receipts" }, { field:"issues", label:"Issues" }]
 *   viz.format    — 'currency' | 'number' | 'percent'
 *   viz.limit     — max items
 *   viz.sort      — 'desc' | 'asc' | 'none' (sorts by first yField)
 */
function VizGroupedBar({ viz, rows, isTimeSeries, periods }) {
    const [period, setPeriod] = useState('all');
 
    const yFields = viz.yFields || [];
    if (yFields.length === 0) {
        return <div style={{ color: 'var(--muted)', fontSize: 11, padding: 16 }}>No yFields configured. Add at least 2 fields to compare.</div>;
    }
 
    // If time-series and "all" → one group per period, each bar = a yField
    // If specific period or not time-series → one group per xField value
    let chartData;
 
    if (isTimeSeries && period === 'all') {
        // Group by period — one entry per period
        const byPeriod = {};
        rows.forEach(r => {
            const p = r._period || 'unknown';
            if (!byPeriod[p]) { byPeriod[p] = { x: p }; yFields.forEach(f => { byPeriod[p][f.field] = 0; }); }
            yFields.forEach(f => { byPeriod[p][f.field] += n(r[f.field]); });
        });
        chartData = Object.values(byPeriod).sort((a, b) => a.x.localeCompare(b.x));
    } else {
        const filteredRows = isTimeSeries ? rows.filter(r => r._period === period) : rows;
 
        // Group by xField, sum each yField
        const byX = {};
        filteredRows.forEach(r => {
            const x = String(r[viz.xField] || '—').slice(0, 24);
            if (!byX[x]) { byX[x] = { x }; yFields.forEach(f => { byX[x][f.field] = 0; }); }
            yFields.forEach(f => { byX[x][f.field] += n(r[f.field]); });
        });
 
        let data = Object.values(byX);
 
        // Sort by first yField
        if (viz.sort === 'desc') data.sort((a, b) => n(b[yFields[0].field]) - n(a[yFields[0].field]));
        if (viz.sort === 'asc')  data.sort((a, b) => n(a[yFields[0].field]) - n(b[yFields[0].field]));
        if (viz.limit)           data = data.slice(0, viz.limit);
 
        chartData = data;
    }
 
    // Default colors if not specified
    const DEFAULT_COLORS = ['#117A65', '#E74C3C', '#1B4F72', '#CA6F1E', '#6C3483', '#888'];
    const formatter     = makeFormatter(viz.format || 'number');
    const tickFormatter = makeTickFormatter(viz.format || 'number');
 
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>
                    {viz.title}
                    {isTimeSeries && period === 'all' && (
                        <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 6 }}>trend across all periods</span>
                    )}
                </div>
                {isTimeSeries && (
                    <select value={period} onChange={e => setPeriod(e.target.value)}
                        style={{ fontSize: 10, border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer' }}>
                        <option value="all">All (trend)</option>
                        {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                )}
            </div>
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%" barGap={2}>
                    <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                    <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#7F8C9A' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#7F8C9A' }} axisLine={false} tickLine={false} width={48} tickFormatter={tickFormatter} />
                    <Tooltip contentStyle={tip} formatter={formatter} />
                    <Legend iconSize={8} iconType="square" wrapperStyle={{ fontSize: 10 }} />
                    {yFields.map((f, i) => (
                        <Bar
                            key={f.field}
                            dataKey={f.field}
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
 
    const { isTimeSeries, periods } = detectTimeSeries(rows);
 
    const cardStyle = {
        background: 'var(--card)', borderRadius: 10,
        padding: '16px', boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border)',
    };
 
    const props = { viz, rows, isTimeSeries, periods };
 
    switch (viz.type) {
        case 'kpi':   return <VizKPI   {...props} />;
        case 'bar':        return <div style={cardStyle}><VizBar        {...props} /></div>;
        case 'grouped_bar': return <div style={cardStyle}><VizGroupedBar {...props} /></div>;
        case 'line':  return <div style={cardStyle}><VizLine  {...props} /></div>;
        case 'pie':   return <div style={cardStyle}><VizPie   {...props} /></div>;
        case 'table': return <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}><div style={{ padding: 16 }}><VizTable {...props} /></div></div>;
        default:      return <div style={{ ...cardStyle, color: 'var(--muted)', fontSize: 11 }}>Unknown viz type: {viz.type}</div>;
    }
}
 
// ─── Multi-viz renderer ───────────────────────────────────────
 
export function DynamicVizList({ connection, rows = [], only, kpiStyle, chartStyle }) {
    if (!connection?.visualizations?.length) return null;
 
    const vizs = only
        ? connection.visualizations.filter(v => only.includes(v.type))
        : connection.visualizations;
 
    const kpis   = vizs.filter(v => v.type === 'kpi');
    const charts = vizs.filter(v => ['bar','grouped_bar','line','pie'].includes(v.type));
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