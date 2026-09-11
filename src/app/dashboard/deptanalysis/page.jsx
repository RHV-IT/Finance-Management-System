'use client';
 
import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import PageRenderer from '../../components/PageRenderer';
import { RevenuePieChart } from '../../components/Charts';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { COLORS, fmt, fmtM } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
const tooltipStyle = { background: '#fff', border: '1px solid #E0E4EA', borderRadius: 8, fontSize: 11 };
 
const TABS = [
  { key: 'revenue', label: '💰 Revenue Breakdown' },
  { key: 'charts',  label: '📊 Charts & Mix'      },
  { key: 'compare', label: '↔ Compare Depts'      },
  { key: 'pct',     label: '% Shares'             },
];
 
// ─── Descriptive error / loading states (same pattern as Revenue/Weekly) ──
 
function SheetError({ label, error, onRefetch }) {
  const notConnected = error?.includes('not connected') || error?.includes('Sheet ID') || error?.includes('No connection');
  return (
    <div style={{ background: notConnected ? '#FFF9E6' : '#FEECEC', border: `1.5px solid ${notConnected ? '#F4D03F' : '#F1948A'}`, borderRadius: 10, padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{notConnected ? '🔗' : '⚠️'}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
        {label}: {notConnected ? 'Not connected yet' : 'Failed to load'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>{error}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <a href="/settings" style={{ padding: '8px 18px', background: 'var(--navy)', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>⚙ Go to Settings</a>
        {onRefetch && !notConnected && (
          <button onClick={onRefetch} style={{ padding: '8px 18px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>↻ Retry</button>
        )}
      </div>
    </div>
  );
}
 
function Loading({ message }) {
  return <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)', fontSize: 12 }}>⏳ {message}</div>;
}
 
export default function DeptAnalysisPage() {
  const [tab,      setTab]      = useState('revenue');
  const [sortMode, setSortMode] = useState('hi');
  const [deptA,    setDeptA]    = useState(0);
  const [deptB,    setDeptB]    = useState(1);
  const [expanded, setExpanded] = useState({});
 
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const ledgerConn = getByModule('revenue_ledger');
  const { rows, loading: rowsLoading, error: rowsError, refetch } = useSheetData(ledgerConn);
 
  // ── Guard states ──
 
  if (configLoading) return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
 
  if (configError) return (
    <div>
      <SheetError label="Sheet configuration" error={`Could not load the connections manifest: ${configError}`} onRefetch={reload} />
    </div>
  );
 
  if (!ledgerConn) return (
    <div>
      <SheetError
        label="Revenue Ledger"
        error={`No connection with module "revenue_ledger" is configured. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "departments".`}
      />
    </div>
  );
 
  if (rowsLoading) return <div><Loading message={`Loading "${ledgerConn.label}" from Google Sheets…`} /></div>;
 
  if (rowsError) return (
    <div>
      <SheetError label={ledgerConn.label} error={rowsError} onRefetch={refetch} />
    </div>
  );
 
  if (!rows || rows.length === 0) return (
    <div>
      <SheetError
        label={ledgerConn.label}
        error={`The sheet connected fine, but the "${ledgerConn.tabName}" tab returned 0 rows. Check that data starts at header row ${ledgerConn.headerRow} and that the range "${ledgerConn.range}" covers it.`}
        onRefetch={refetch}
      />
    </div>
  );
 
  // ── Aggregate the ledger by department (and by item within department) ──
  // Bespoke: expandable per-item drilldown and period comparison aren't
  // things a generic bar/table viz does.
 
  const periods = [...new Set(rows.map(r => r._period).filter(Boolean))].sort();
  const latestPeriod = periods[periods.length - 1];
  const prevPeriod   = periods[periods.length - 2];
 
  const deptMap = {};
  rows.forEach(r => {
    const dept = r.department || 'Unspecified';
    if (!deptMap[dept]) deptMap[dept] = { name: dept, ytd: 0, latest: 0, prev: 0, items: {}, byPeriod: {} };
    const d = deptMap[dept];
    const amt = n(r.amount);
    d.ytd += amt;
    if (r._period === latestPeriod) d.latest += amt;
    if (r._period === prevPeriod)   d.prev   += amt;
 
    const item = r.item || 'Unspecified';
    d.items[item] = (d.items[item] || 0) + amt;
 
    if (r._period) d.byPeriod[r._period] = (d.byPeriod[r._period] || 0) + amt;
  });
 
  const depts = Object.values(deptMap).map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] }));
  const grandRev = depts.reduce((s, d) => s + d.ytd, 0);
  const totalLatest = depts.reduce((s, d) => s + d.latest, 0);
  const topDept = [...depts].sort((a, b) => b.ytd - a.ytd)[0];
 
  const sorted = [...depts];
  if (sortMode === 'hi') sorted.sort((a, b) => b.ytd - a.ytd);
  else if (sortMode === 'lo') sorted.sort((a, b) => a.ytd - b.ytd);
  else sorted.sort((a, b) => a.name.localeCompare(b.name));
 
  const toggleDept = (name) => setExpanded(e => ({ ...e, [name]: !e[name] }));
 
  const pieData = depts.map(d => ({ name: d.name, value: fmtM(d.ytd) }));
 
  // Trend across all departments, one line per department, x-axis = real periods
  const trendData = periods.map(p => {
    const obj = { period: p };
    depts.forEach(d => { obj[d.name] = fmtM(d.byPeriod[p] || 0); });
    return obj;
  });
 
  // Compare tab — guard against fewer than 2 departments existing yet
  const dA = depts[deptA] || depts[0];
  const dB = depts[deptB] || depts[Math.min(1, depts.length - 1)];
  const compareData = periods.map(p => ({
    period: p,
    [dA?.name]: fmtM(dA?.byPeriod[p] || 0),
    [dB?.name]: fmtM(dB?.byPeriod[p] || 0),
  }));
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🏥 Department Analysis</h2>
          <p className={styles.pageMeta}>
            Revenue by department {periods.length > 0 ? `· ${periods[0]} – ${latestPeriod}` : ''}
          </p>
        </div>
      </div>
 
      {/* ── KPIs — bespoke, needs per-department grouping ──── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Grand Total Revenue" value={fmt(grandRev)} color="green" badge="YTD" badgeType="good" />
        <KPICard label="Departments Tracked" value={depts.length} color="blue" />
        <KPICard label="Top Department" value={topDept ? topDept.name : '—'} delta={topDept ? fmt(topDept.ytd) : ''} deltaType="up" color="purple" />
        <KPICard label={`${latestPeriod || 'Latest'} Revenue`} value={fmt(totalLatest)} color="amber" />
      </div>
 
      {/* ── Toolbar ──────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase' }}>Sort:</span>
        {[['hi','Highest'], ['lo','Lowest'], ['az','A–Z']].map(([k, l]) => (
          <button key={k} onClick={() => setSortMode(k)} style={{
            padding:'5px 11px', border:'1.5px solid', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer',
            borderColor: sortMode === k ? 'var(--teal)' : 'var(--border)',
            background:  sortMode === k ? 'var(--teal)' : '#fff',
            color:       sortMode === k ? '#fff' : 'var(--text)',
          }}>{l}</button>
        ))}
      </div>
 
      {/* ── Tab bar ──────────────────────────────── */}
      <div style={{ display:'flex', gap:0, marginBottom:16, borderBottom:'2px solid var(--border)', overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'8px 16px', cursor:'pointer', fontSize:11, fontWeight:600, whiteSpace:'nowrap',
            background:'transparent', border:'none',
            borderBottom:`2px solid ${tab === t.key ? 'var(--teal)' : 'transparent'}`,
            color: tab === t.key ? 'var(--teal)' : 'var(--muted)', marginBottom:-2,
          }}>{t.label}</button>
        ))}
      </div>
 
      {/* ══════════ REVENUE BREAKDOWN ═════════════ */}
      {tab === 'revenue' && (
        <div className={tableStyles.tableBox}>
          <PageRenderer page="departments" module="revenue_ledger" only={['table']} />
          <div className={tableStyles.tableTitle}>Revenue by Department / Item</div>
          <table className={tableStyles.table}>
            <thead>
              <tr style={{ background:'var(--navy)', color:'#fff' }}>
                <th style={{ color:'#fff' }}></th>
                <th style={{ color:'#fff' }}>Department / Item</th>
                <th style={{ color:'#fff' }}>YTD</th>
                <th style={{ color:'#fff' }}>% of Grand Total</th>
                <th style={{ color:'#fff' }}>{latestPeriod || 'Latest'}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(dept => {
                const pct = grandRev > 0 ? (dept.ytd / grandRev * 100).toFixed(1) : 0;
                const isOpen = expanded[dept.name];
                const itemEntries = Object.entries(dept.items).sort((a, b) => b[1] - a[1]);
                return [
                  <tr key={dept.name} onClick={() => toggleDept(dept.name)} style={{ background:'#f5f8fc', cursor:'pointer', fontWeight:700 }}>
                    <td style={{ color:'var(--teal)', fontSize:10 }}>{isOpen ? '▼' : '▶'}</td>
                    <td style={{ fontWeight:700, color:'var(--navy)' }}>{dept.name}</td>
                    <td style={{ color:'var(--teal)' }}>{fmt(dept.ytd)}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <div style={{ height:5, borderRadius:3, background:dept.color, width:`${Math.min(60, +pct * 2)}px` }} />
                        <span style={{ fontSize:9 }}>{pct}%</span>
                      </div>
                    </td>
                    <td>{fmt(dept.latest)}</td>
                  </tr>,
                  ...(isOpen ? itemEntries.map(([item, val]) => (
                    <tr key={`${dept.name}-${item}`} style={{ background:'#fafcff', fontSize:11 }}>
                      <td></td>
                      <td style={{ paddingLeft:24, color:'var(--navy)' }}>⟶ {item}</td>
                      <td style={{ color:'var(--muted)' }}>{fmt(val)}</td>
                      <td style={{ color:'var(--muted)', fontSize:10 }}>
                        {dept.ytd > 0 ? `${(val / dept.ytd * 100).toFixed(1)}% of dept` : '—'}
                      </td>
                      <td style={{ color:'var(--muted)' }}>—</td>
                    </tr>
                  )) : []),
                ];
              })}
              <tr style={{ background:'#0a5c3a', color:'#fff', fontWeight:800 }}>
                <td></td>
                <td style={{ fontSize:13 }}>GRAND TOTAL</td>
                <td>{fmt(grandRev)}</td>
                <td>100%</td>
                <td>{fmt(totalLatest)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
 
      {/* ══════════ CHARTS & MIX ══════════════════ */}
      {tab === 'charts' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {/* Config-driven — reads viz-revl-006 (Revenue by Department bar) */}
            <PageRenderer page="departments" module="revenue_ledger" only={['bar']} />
            <PageRenderer page="departments" module="revenue_ledger" only={['pie']} />
            <div className={styles.card}>
              <div className={styles.cardTitle}>Revenue Mix by Department</div>
              <RevenuePieChart data={pieData} colors={depts.map(d => d.color)} />
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Revenue Trend — All Departments</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top:4, right:16, left:0, bottom:0 }}>
                <CartesianGrid stroke="rgba(0,0,0,.05)" />
                <XAxis dataKey="period" tick={{ fontSize:9, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${v}M`} width={44} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
                <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                {depts.map(d => (
                  <Line key={d.name} dataKey={d.name} name={d.name} stroke={d.color} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
 
      {/* ══════════ COMPARE DEPTS ═════════════════ */}
      {tab === 'compare' && (
        depts.length < 2 ? (
          <div style={{ textAlign:'center', padding:32, color:'var(--muted)', fontSize:11 }}>
            Need at least 2 departments in the ledger to compare — currently only {depts.length}.
          </div>
        ) : (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, fontWeight:700 }}>Compare:</span>
              <select value={deptA} onChange={e => setDeptA(+e.target.value)} style={{ padding:'6px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none' }}>
                {depts.map((d, i) => <option key={i} value={i}>{d.name}</option>)}
              </select>
              <span style={{ fontWeight:700 }}>vs</span>
              <select value={deptB} onChange={e => setDeptB(+e.target.value)} style={{ padding:'6px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none' }}>
                {depts.map((d, i) => <option key={i} value={i}>{d.name}</option>)}
              </select>
            </div>
 
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div className={styles.card}>
                <div className={styles.cardTitle}>{dA.name} vs {dB.name} — by Period</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={compareData} margin={{ top:4, right:8, left:0, bottom:0 }} barCategoryGap="30%">
                    <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                    <XAxis dataKey="period" tick={{ fontSize:9, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${v}M`} width={44} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                    <Bar dataKey={dA.name} fill={dA.color} radius={[3,3,0,0]} />
                    <Bar dataKey={dB.name} fill={dB.color} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={tableStyles.tableBox} style={{ margin:0 }}>
                <div className={tableStyles.tableTitle}>Head-to-Head Comparison</div>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th style={{ color: dA.color }}>{dA.name}</th>
                      <th style={{ color: dB.color }}>{dB.name}</th>
                      <th>Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { metric:'YTD Revenue', vA: fmt(dA.ytd), vB: fmt(dB.ytd), winner: dA.ytd >= dB.ytd ? dA.name : dB.name },
                      { metric:'% of Total', vA: `${(dA.ytd / grandRev * 100).toFixed(1)}%`, vB: `${(dB.ytd / grandRev * 100).toFixed(1)}%`, winner: dA.ytd >= dB.ytd ? dA.name : dB.name },
                      { metric:`${latestPeriod || 'Latest'} Revenue`, vA: fmt(dA.latest), vB: fmt(dB.latest), winner: dA.latest >= dB.latest ? dA.name : dB.name },
                      { metric:'Distinct Items', vA: Object.keys(dA.items).length, vB: Object.keys(dB.items).length, winner: '—' },
                    ].map(row => (
                      <tr key={row.metric}>
                        <td style={{ fontWeight:600 }}>{row.metric}</td>
                        <td style={{ color: dA.color, fontWeight:600 }}>{row.vA}</td>
                        <td style={{ color: dB.color, fontWeight:600 }}>{row.vB}</td>
                        <td><span className={`${tableStyles.badge} ${tableStyles.green}`}>{row.winner} ✓</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
 
      {/* ══════════ % SHARES ══════════════════════ */}
      {tab === 'pct' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Revenue Share by Department</div>
            <RevenuePieChart data={pieData} colors={depts.map(d => d.color)} />
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Dept Revenue Share</div>
            <div style={{ padding:'8px 0' }}>
              {[...depts].sort((a, b) => b.ytd - a.ytd).map(d => {
                const pct = grandRev > 0 ? (d.ytd / grandRev * 100) : 0;
                return (
                  <div key={d.name} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                      <span style={{ fontWeight:600 }}>{d.name}</span>
                      <span style={{ fontWeight:700, color:d.color }}>{pct.toFixed(1)}% · {fmt(d.ytd)}</span>
                    </div>
                    <div style={{ height:10, background:'#e8ecf0', borderRadius:5, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:5, background:d.color, width:`${Math.min(100, pct * 1.5)}%`, transition:'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}