'use client';
 
/**
 * components/DynamicViz.jsx
 *
 * Renders any visualization defined in the Drive JSON config.
 * Drop this into any page — it reads the viz config and renders
 * the right chart/KPI/table automatically from the sheet rows.
 *
 * USAGE — render ALL vizs for a connection:
 *   <DynamicVizList connection={conn} rows={rows} />
 *
 * USAGE — render ONE specific viz:
 *   <DynamicViz viz={viz} rows={rows} />
 *
 * USAGE — render only vizs of a certain type:
 *   <DynamicVizList connection={conn} rows={rows} only={['kpi']} />
 *   <DynamicVizList connection={conn} rows={rows} only={['bar','pie','line']} />
 *   <DynamicVizList connection={conn} rows={rows} only={['table']} />
 */
 
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fmt, COLORS } from '../dashboard/lib/data';
import tableStyles from '../styles/Table.module.css';
 
const tip = { background: '#fff', border: '1px solid #E0E4EA', borderRadius: 8, fontSize: 11 };
const n   = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
 
// ─── Aggregate a field across all rows ────────────────────────
 
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
 
// ─── Format a value for display ───────────────────────────────
 
function formatValue(value, format) {
  switch (format) {
    case 'currency': return fmt(value);
    case 'percent':  return `${value.toFixed(1)}%`;
    case 'number':   return value.toLocaleString();
    case 'text':     return String(value);
    default:         return fmt(value);
  }
}
 
// ─── KPI Card ─────────────────────────────────────────────────
 
const COLOR_MAP = {
  blue:   { bg: '#EBF5FB', border: '#AED6F1', text: '#1B4F72' },
  green:  { bg: '#E8F8F5', border: '#A9DFBF', text: '#117A65' },
  red:    { bg: '#FEECEC', border: '#F1948A', text: '#C0392B' },
  amber:  { bg: '#FEF9E7', border: '#F9E79F', text: '#9A7D0A' },
  purple: { bg: '#F5EEF8', border: '#D2B4DE', text: '#6C3483' },
  navy:   { bg: '#EAF0F6', border: '#AEB6BF', text: '#1B2631' },
};
 

function groupAndSum(rows, xField, yField, targetField) {
    const grouped = {};

    rows.forEach(row => {
        const key = String(row[xField] || "—").slice(0, 22);

        if (!grouped[key]) {
            grouped[key] = {
                x: key,
                y: 0,
                target: targetField ? n(row[targetField]) : undefined,
            };
        }

        grouped[key].y += n(row[yField]);
    });

    return Object.values(grouped);
}


function VizKPI({ viz, rows }) {
  const value  = aggregate(rows, viz.field, viz.agg || 'sum');
  const colors = COLOR_MAP[viz.color] || COLOR_MAP.blue;
 
  return (
    <div style={{
      background: colors.bg,
      border: `1.5px solid ${colors.border}`,
      borderRadius: 10,
      padding: '16px 20px',
      minWidth: 160,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {viz.label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: colors.text }}>
        {formatValue(value, viz.format || 'currency')}
      </div>
      {viz.subtitle && (
        <div style={{ fontSize: 10, color: colors.text, opacity: 0.7, marginTop: 4 }}>{viz.subtitle}</div>
      )}
    </div>
  );
}
 
// ─── Bar Chart ────────────────────────────────────────────────
 
function VizBar({ viz, rows }) {
  // Sort and limit
  let data = [...rows];
 
  if (viz.sort === 'desc') data.sort((a, b) => n(b[viz.yField]) - n(a[viz.xField === viz.yField ? viz.xField : viz.yField]));
  if (viz.sort === 'asc')  data.sort((a, b) => n(a[viz.yField]) - n(b[viz.yField]));
  if (viz.limit)           data = data.slice(0, viz.limit);
 
  // Truncate long labels
  const chartData = groupAndSum(
    data,
    viz.xField,
    viz.yField,
    viz.targetLine?.field
  );
 
  // Fixed target value
  const fixedTarget = viz.targetLine?.value;
 
  const isHorizontal = viz.orientation === 'horizontal';
 
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>{viz.title}</div>
      <ResponsiveContainer width="100%" height={isHorizontal ? Math.max(200, data.length * 28) : 220}>
        {isHorizontal ? (
          <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="rgba(0,0,0,.05)" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1e6 ? `₦${(v/1e6).toFixed(1)}M` : v.toLocaleString()} />
            <YAxis type="category" dataKey="x" tick={{ fontSize: 9, fill: '#7F8C9A' }} axisLine={false} tickLine={false} width={120} />
            <Tooltip contentStyle={tip} formatter={v => fmt(v)} />
            {fixedTarget && <ReferenceLine x={fixedTarget} stroke="#E74C3C" strokeDasharray="4 4" label={{ value: viz.targetLine.label || 'Target', fontSize: 9, fill: '#E74C3C' }} />}
            <Bar dataKey="y" name={viz.yField} radius={[0, 3, 3, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
            <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#7F8C9A' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#7F8C9A' }} axisLine={false} tickLine={false} width={48} tickFormatter={v => v >= 1e6 ? `₦${(v/1e6).toFixed(0)}M` : v.toLocaleString()} />
            <Tooltip contentStyle={tip} formatter={v => fmt(v)} />
            {fixedTarget && <ReferenceLine y={fixedTarget} stroke="#E74C3C" strokeDasharray="4 4" label={{ value: viz.targetLine.label || 'Target', fontSize: 9, fill: '#E74C3C' }} />}
            <Bar dataKey="y" name={viz.yField} fill="#117A65" radius={[3, 3, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
 
// ─── Line Chart ───────────────────────────────────────────────
 
function VizLine({ viz, rows }) {
  const chartData = groupAndSum(
    rows,
    viz.xField,
    viz.yField,
    viz.targetLine?.field
  );
 
  const fixedTarget = viz.targetLine?.value;
 
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>{viz.title}</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
          <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#7F8C9A' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#7F8C9A' }} axisLine={false} tickLine={false} width={48} tickFormatter={v => v >= 1e6 ? `₦${(v/1e6).toFixed(0)}M` : v.toLocaleString()} />
          <Tooltip contentStyle={tip} formatter={v => fmt(v)} />
          {fixedTarget && <ReferenceLine y={fixedTarget} stroke="#E74C3C" strokeDasharray="4 4" label={{ value: viz.targetLine.label || 'Target', fontSize: 9, fill: '#E74C3C' }} />}
          <Line dataKey="y" name={viz.yField} stroke="#117A65" strokeWidth={2} dot={{ r: 3 }} />
          {chartData[0]?.target !== undefined && (
            <Line dataKey="target" name="Target" stroke="#E74C3C" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
 
// ─── Pie Chart ────────────────────────────────────────────────
 
function VizPie({ viz, rows }) {
  // Group by catField, sum valField
  const grouped = {};
  rows.forEach(r => {
    const cat = r[viz.catField] || 'Other';
    grouped[cat] = (grouped[cat] || 0) + n(r[viz.valField]);
  });
 
  const data = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: +(value / 1e6).toFixed(2) }));
 
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const r  = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x  = cx + r * Math.cos(-midAngle * RADIAN);
    const y  = cy + r * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>;
  };
 
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>{viz.title}</div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={renderLabel}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tip} formatter={v => `₦${v}M`} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
 
// ─── Table ────────────────────────────────────────────────────
 
function VizTable({ viz, rows }) {
  const columns = viz.columns || (rows[0] ? Object.keys(rows[0]).filter(k => !k.startsWith('_')) : []);
 
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>{viz.title}</div>
      <div style={{ overflowX: 'auto' }}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} style={{ textTransform: 'capitalize' }}>
                  {col.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map(col => {
                  const val = row[col] ?? '—';
                  const num = n(val);
                  // Auto-format large numbers as currency
                  const display = typeof val === 'string' && num > 1000 && !isNaN(num)
                    ? fmt(num)
                    : val;
                  return <td key={col}>{display}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
// ─── Single viz renderer ──────────────────────────────────────
 
export function DynamicViz({ viz, rows = [] }) {
  if (!viz || !rows) return null;
 
  const cardStyle = {
    background: 'var(--card)',
    borderRadius: 10,
    padding: '16px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border)',
  };
 
  switch (viz.type) {
    case 'kpi':
      return <VizKPI viz={viz} rows={rows} />;
    case 'bar':
      return <div style={cardStyle}><VizBar viz={viz} rows={rows} /></div>;
    case 'line':
      return <div style={cardStyle}><VizLine viz={viz} rows={rows} /></div>;
    case 'pie':
      return <div style={cardStyle}><VizPie viz={viz} rows={rows} /></div>;
    case 'table':
      return <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}><div style={{ padding: '16px' }}><VizTable viz={viz} rows={rows} /></div></div>;
    default:
      return <div style={{ ...cardStyle, color: 'var(--muted)', fontSize: 11 }}>Unknown viz type: {viz.type}</div>;
  }
}
 
// ─── Multi-viz renderer ───────────────────────────────────────
 
/**
 * Renders all visualizations for a connection.
 *
 * Props:
 *   connection  — the connection object from Drive JSON
 *   rows        — the fetched sheet rows
 *   only        — optional array of types to render e.g. ['kpi'] or ['bar','pie']
 *   kpiStyle    — optional style override for the KPI grid wrapper
 *   chartStyle  — optional style override for the charts grid wrapper
 */
export function DynamicVizList({ connection, rows = [], only, kpiStyle, chartStyle }) {
  if (!connection?.visualizations?.length) return null;
 
  const vizs = only
    ? connection.visualizations.filter(v => only.includes(v.type))
    : connection.visualizations;
 
  const kpis   = vizs.filter(v => v.type === 'kpi');
  const charts = vizs.filter(v => v.type === 'bar' || v.type === 'line' || v.type === 'pie');
  const tables = vizs.filter(v => v.type === 'table');
 
  return (
    <div>
      {/* KPI row */}
      {kpis.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
          gap: 12,
          marginBottom: 16,
          ...kpiStyle,
        }}>
          {kpis.map(viz => <DynamicViz key={viz.id} viz={viz} rows={rows} />)}
        </div>
      )}
 
      {/* Charts grid */}
      {charts.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: charts.length === 1 ? '1fr' : '1fr 1fr',
          gap: 14,
          marginBottom: 16,
          ...chartStyle,
        }}>
          {charts.map(viz => <DynamicViz key={viz.id} viz={viz} rows={rows} />)}
        </div>
      )}
 
      {/* Tables */}
      {tables.map(viz => (
        <div key={viz.id} style={{ marginBottom: 16 }}>
          <DynamicViz viz={viz} rows={rows} />
        </div>
      ))}
    </div>
  );
}