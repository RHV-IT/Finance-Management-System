'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { RevenuePieChart } from '../../components/Charts';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { MONTHS, STREAMS, COLORS, fmt, fmtM } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
/* ─── Department data (aggregated from streams) ───────────── */
const DEPTS = [
  {
    name: 'Pharmacy',
    color: '#117A65',
    ytd: 336800000,
    monthly: MONTHS.map((_, i) => Math.round(336800000 / 11 * (0.8 + Math.random() * 0.4))),
    services: [
      { name: 'Drug Sales', payers: [{ name:'Cash', pct:0.55 }, { name:'HMO', pct:0.3 }, { name:'Corporate', pct:0.15 }] },
      { name: 'Consumables', payers: [{ name:'Cash', pct:0.6 }, { name:'HMO', pct:0.4 }] },
    ],
  },
  {
    name: 'Inpatient / Wards',
    color: '#1B4F72',
    ytd: 180600000,
    monthly: MONTHS.map((_, i) => Math.round(180600000 / 11 * (0.8 + Math.random() * 0.4))),
    services: [
      { name: 'Bed Fees',   payers: [{ name:'Cash', pct:0.4 }, { name:'HMO', pct:0.35 }, { name:'Corporate', pct:0.25 }] },
      { name: 'Nursing',    payers: [{ name:'Cash', pct:0.5 }, { name:'HMO', pct:0.5 }] },
    ],
  },
  {
    name: 'Theatre & Surgery',
    color: '#6C3483',
    ytd: 157700000,
    monthly: MONTHS.map((_, i) => Math.round(157700000 / 11 * (0.8 + Math.random() * 0.4))),
    services: [
      { name: 'Surgery Fee',    payers: [{ name:'Cash', pct:0.45 }, { name:'HMO', pct:0.4 }, { name:'Corporate', pct:0.15 }] },
      { name: 'Anaesthesia',    payers: [{ name:'Cash', pct:0.5 }, { name:'HMO', pct:0.5 }] },
    ],
  },
  {
    name: 'Laboratory',
    color: '#CA6F1E',
    ytd: 143000000,
    monthly: MONTHS.map((_, i) => Math.round(143000000 / 11 * (0.8 + Math.random() * 0.4))),
    services: [
      { name: 'FBC / Haematology', payers: [{ name:'Cash', pct:0.6 }, { name:'HMO', pct:0.4 }] },
      { name: 'Chemistry',         payers: [{ name:'Cash', pct:0.55 }, { name:'HMO', pct:0.45 }] },
    ],
  },
  {
    name: 'Radiology',
    color: '#2E86C1',
    ytd: 181700000,
    monthly: MONTHS.map((_, i) => Math.round(181700000 / 11 * (0.8 + Math.random() * 0.4))),
    services: [
      { name: 'X-Ray',       payers: [{ name:'Cash', pct:0.65 }, { name:'HMO', pct:0.35 }] },
      { name: 'CT Scan',     payers: [{ name:'Cash', pct:0.5 }, { name:'HMO', pct:0.5 }] },
      { name: 'Ultrasound',  payers: [{ name:'Cash', pct:0.7 }, { name:'HMO', pct:0.3 }] },
    ],
  },
];
 
const EXPENSE_DEPTS = [
  { name: 'Pharmacy',           ytd: 98000000,  color: '#C0392B' },
  { name: 'Inpatient / Wards',  ytd: 72000000,  color: '#922B21' },
  { name: 'Theatre & Surgery',  ytd: 58000000,  color: '#E74C3C' },
  { name: 'Laboratory',         ytd: 41000000,  color: '#F39C12' },
  { name: 'Radiology',          ytd: 36000000,  color: '#8E44AD' },
  { name: 'Administration',     ytd: 53000000,  color: '#2E86C1' },
];
 
const tooltipStyle = { background:'#fff', border:'1px solid #E0E4EA', borderRadius:8, fontSize:11 };
 
const TABS = [
  { key:'revenue',  label:'💰 Revenue Breakdown' },
  { key:'expenses', label:'💸 Expense Breakdown' },
  { key:'charts',   label:'📊 Charts & Mix'      },
  { key:'compare',  label:'↔ Compare Depts'      },
  { key:'pct',      label:'% Shares'             },
];
 
const grandRev = DEPTS.reduce((s, d) => s + d.ytd, 0);
 
export default function DeptAnalysisPage() {
  const [tab,      setTab]      = useState('revenue');
  const [sortMode, setSortMode] = useState('hi');
  const [unit,     setUnit]     = useState('ngn');
  const [deptA,    setDeptA]    = useState(0);
  const [deptB,    setDeptB]    = useState(1);
  const [expanded, setExpanded] = useState({});
 
  const sorted = useMemo(() => {
    const arr = [...DEPTS];
    if (sortMode === 'hi') arr.sort((a, b) => b.ytd - a.ytd);
    else if (sortMode === 'lo') arr.sort((a, b) => a.ytd - b.ytd);
    else arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [sortMode]);
 
  const toggleDept = (name) => setExpanded(e => ({ ...e, [name]: !e[name] }));
 
  /* trend data for charts tab */
  const trendData = MONTHS.map((m, i) => {
    const obj = { month: m };
    DEPTS.forEach(d => { obj[d.name.split(' ')[0]] = fmtM(d.monthly[i] || 0); });
    return obj;
  });
 
  /* compare tab */
  const dA = DEPTS[deptA], dB = DEPTS[deptB];
  const compareData = MONTHS.map((m, i) => ({
    month: m,
    [dA.name.split(' ')[0]]: fmtM(dA.monthly[i] || 0),
    [dB.name.split(' ')[0]]: fmtM(dB.monthly[i] || 0),
  }));
 
  /* pct tab */
  const pieData = DEPTS.map(d => ({ name: d.name, value: fmtM(d.ytd) }));
 
  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🏥 Department Analysis</h2>
          <p className={styles.pageMeta}>Revenue & expense drilldown by department · FY 2025</p>
        </div>
      </div>
 
      {/* ── KPIs ─────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Grand Total Revenue" value={fmt(grandRev)} color="green" badge="YTD" badgeType="good" />
        <KPICard label="Departments Tracked" value={DEPTS.length} color="blue" />
        <KPICard label="Top Department" value={DEPTS[0].name.split(' ')[0]} delta={fmt(DEPTS[0].ytd)} deltaType="up" color="purple" />
        <KPICard label="Total Dept Expenses" value={fmt(EXPENSE_DEPTS.reduce((s, d) => s + d.ytd, 0))} color="red" />
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
        <span style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', marginLeft:8 }}>Unit:</span>
        {[['ngn','₦ NGN'], ['pct','%']].map(([k, l]) => (
          <button key={k} onClick={() => setUnit(k)} style={{
            padding:'5px 11px', border:'1.5px solid', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer',
            borderColor: unit === k ? 'var(--teal)' : 'var(--border)',
            background:  unit === k ? 'var(--teal)' : '#fff',
            color:       unit === k ? '#fff' : 'var(--text)',
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
          <div className={tableStyles.tableTitle}>Revenue by Department / Service / Payer</div>
          <table className={tableStyles.table}>
            <thead>
              <tr style={{ background:'var(--navy)', color:'#fff' }}>
                <th style={{ color:'#fff' }}></th>
                <th style={{ color:'#fff' }}>Department / Service / Payer</th>
                <th style={{ color:'#fff' }}>Jan</th>
                <th style={{ color:'#fff' }}>May</th>
                <th style={{ color:'#fff' }}>Nov</th>
                <th style={{ color:'#fff' }}>Period YTD</th>
                <th style={{ color:'#fff' }}>Svc %</th>
                <th style={{ color:'#fff' }}>Grand %</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(dept => {
                const pct = (dept.ytd / grandRev * 100).toFixed(1);
                const isOpen = expanded[dept.name];
                return [
                  /* dept row */
                  <tr
                    key={dept.name}
                    onClick={() => toggleDept(dept.name)}
                    style={{ background:'#f5f8fc', cursor:'pointer', fontWeight:700 }}
                  >
                    <td style={{ color:'var(--teal)', fontSize:10 }}>{isOpen ? '▼' : '▶'}</td>
                    <td style={{ fontWeight:700, color:'var(--navy)' }}>{dept.name}</td>
                    <td>{unit === 'pct' ? `${((dept.monthly[0] || 0) / grandRev * 100).toFixed(1)}%` : fmt(dept.monthly[0] || 0)}</td>
                    <td>{unit === 'pct' ? `${((dept.monthly[4] || 0) / grandRev * 100).toFixed(1)}%` : fmt(dept.monthly[4] || 0)}</td>
                    <td>{unit === 'pct' ? `${((dept.monthly[10] || 0) / grandRev * 100).toFixed(1)}%` : fmt(dept.monthly[10] || 0)}</td>
                    <td style={{ color:'var(--teal)' }}>{unit === 'pct' ? `${pct}%` : fmt(dept.ytd)}</td>
                    <td>100%</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <div style={{ height:5, borderRadius:3, background:dept.color, width:`${Math.min(60, +pct * 2)}px` }} />
                        <span style={{ fontSize:9 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>,
                  /* service rows (expanded) */
                  ...(isOpen ? dept.services.map(svc => (
                    <tr key={`${dept.name}-${svc.name}`} style={{ background:'#fafcff', fontSize:11 }}>
                      <td></td>
                      <td style={{ paddingLeft:24, color:'var(--navy)' }}>⟶ {svc.name}</td>
                      <td style={{ color:'var(--muted)' }}>—</td>
                      <td style={{ color:'var(--muted)' }}>—</td>
                      <td style={{ color:'var(--muted)' }}>—</td>
                      <td style={{ color:'var(--muted)' }}>
                        {fmt(dept.ytd * svc.payers.reduce((s, p) => s + p.pct, 0) / dept.services.length)}
                      </td>
                      <td style={{ color:'var(--muted)', fontSize:10 }}>
                        {(100 / dept.services.length).toFixed(0)}%
                      </td>
                      <td style={{ color:'var(--muted)', fontSize:10 }}>
                        {(dept.ytd / grandRev * 100 / dept.services.length).toFixed(1)}%
                      </td>
                    </tr>
                  )) : []),
                  /* total row */
                  ...(isOpen ? [
                    <tr key={`${dept.name}-total`} style={{ background:'#e8f4f0', fontWeight:700 }}>
                      <td></td>
                      <td>TOTAL — {dept.name}</td>
                      <td>{fmt(dept.monthly[0] || 0)}</td>
                      <td>{fmt(dept.monthly[4] || 0)}</td>
                      <td>{fmt(dept.monthly[10] || 0)}</td>
                      <td style={{ color:'var(--teal)' }}>{fmt(dept.ytd)}</td>
                      <td>100%</td>
                      <td>{pct}%</td>
                    </tr>
                  ] : []),
                ];
              })}
              <tr style={{ background:'#0a5c3a', color:'#fff', fontWeight:800 }}>
                <td></td>
                <td style={{ fontSize:13 }}>GRAND TOTAL</td>
                <td>{fmt(sorted.reduce((s, d) => s + (d.monthly[0] || 0), 0))}</td>
                <td>{fmt(sorted.reduce((s, d) => s + (d.monthly[4] || 0), 0))}</td>
                <td>{fmt(sorted.reduce((s, d) => s + (d.monthly[10] || 0), 0))}</td>
                <td>{fmt(grandRev)}</td>
                <td>100%</td>
                <td>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
 
      {/* ══════════ EXPENSE BREAKDOWN ═════════════ */}
      {tab === 'expenses' && (
        <div className={tableStyles.tableBox}>
          <div className={tableStyles.tableTitle}>Expense Breakdown by Department</div>
          <table className={tableStyles.table}>
            <thead>
              <tr style={{ background:'#7b241c', color:'#fff' }}>
                <th style={{ color:'#fff' }}>#</th>
                <th style={{ color:'#fff' }}>Department</th>
                <th style={{ color:'#fff' }}>YTD Expenses</th>
                <th style={{ color:'#fff' }}>% of Total</th>
                <th style={{ color:'#fff' }}>vs Revenue</th>
                <th style={{ color:'#fff' }}>Exp Ratio</th>
              </tr>
            </thead>
            <tbody>
              {EXPENSE_DEPTS.sort((a, b) => b.ytd - a.ytd).map((d, i) => {
                const totalExp = EXPENSE_DEPTS.reduce((s, x) => s + x.ytd, 0);
                const pct  = (d.ytd / totalExp * 100).toFixed(1);
                const dRev = DEPTS.find(x => x.name === d.name)?.ytd || 0;
                const ratio = dRev > 0 ? (d.ytd / dRev * 100).toFixed(1) : null;
                return (
                  <tr key={d.name}>
                    <td style={{ color:'var(--muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight:600 }}>{d.name}</td>
                    <td style={{ color:'var(--red)', fontWeight:700 }}>{fmt(d.ytd)}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ height:6, borderRadius:3, background:d.color, width:`${Math.min(80, +pct * 3)}px`, opacity:0.8 }} />
                        <span>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ color:'var(--muted)' }}>{dRev > 0 ? fmt(dRev) : '—'}</td>
                    <td style={{ fontWeight:700, color: ratio && +ratio > 70 ? 'var(--red)' : 'var(--teal)' }}>
                      {ratio ? `${ratio}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>TOTAL</td>
                <td style={{ color:'var(--red)' }}>{fmt(EXPENSE_DEPTS.reduce((s, d) => s + d.ytd, 0))}</td>
                <td>100%</td>
                <td>{fmt(grandRev)}</td>
                <td>{(EXPENSE_DEPTS.reduce((s, d) => s + d.ytd, 0) / grandRev * 100).toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
 
      {/* ══════════ CHARTS & MIX ══════════════════ */}
      {tab === 'charts' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Revenue by Department (YTD)</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart layout="vertical" data={DEPTS.map(d => ({ name: d.name.split(' ')[0], ytd: fmtM(d.ytd) }))} margin={{ top:4, right:16, left:8, bottom:0 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(0,0,0,.05)" />
                  <XAxis type="number" tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${v}M`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
                  <Bar dataKey="ytd" radius={[0,3,3,0]}>
                    {DEPTS.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Revenue Mix by Department</div>
              <RevenuePieChart data={pieData} colors={DEPTS.map(d => d.color)} />
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Revenue Trend — All Departments</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top:4, right:16, left:0, bottom:0 }}>
                <CartesianGrid stroke="rgba(0,0,0,.05)" />
                <XAxis dataKey="month" tick={{ fontSize:9, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${v}M`} width={44} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
                <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                {DEPTS.map(d => (
                  <Line key={d.name} dataKey={d.name.split(' ')[0]} name={d.name} stroke={d.color} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
 
      {/* ══════════ COMPARE DEPTS ═════════════════ */}
      {tab === 'compare' && (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, fontWeight:700 }}>Compare:</span>
            <select value={deptA} onChange={e => setDeptA(+e.target.value)} style={{ padding:'6px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none' }}>
              {DEPTS.map((d, i) => <option key={i} value={i}>{d.name}</option>)}
            </select>
            <span style={{ fontWeight:700 }}>vs</span>
            <select value={deptB} onChange={e => setDeptB(+e.target.value)} style={{ padding:'6px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none' }}>
              {DEPTS.map((d, i) => <option key={i} value={i}>{d.name}</option>)}
            </select>
          </div>
 
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>{dA.name} vs {dB.name} — Monthly</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={compareData} margin={{ top:4, right:8, left:0, bottom:0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                  <XAxis dataKey="month" tick={{ fontSize:9, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${v}M`} width={44} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                  <Bar dataKey={dA.name.split(' ')[0]} fill={dA.color} radius={[3,3,0,0]} />
                  <Bar dataKey={dB.name.split(' ')[0]} fill={dB.color} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={tableStyles.tableBox} style={{ margin:0 }}>
              <div className={tableStyles.tableTitle}>Head-to-Head Comparison</div>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th style={{ color: dA.color }}>{dA.name.split(' ')[0]}</th>
                    <th style={{ color: dB.color }}>{dB.name.split(' ')[0]}</th>
                    <th>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { metric:'YTD Revenue', vA: fmt(dA.ytd), vB: fmt(dB.ytd), winner: dA.ytd >= dB.ytd ? dA.name.split(' ')[0] : dB.name.split(' ')[0] },
                    { metric:'% of Total', vA: `${(dA.ytd / grandRev * 100).toFixed(1)}%`, vB: `${(dB.ytd / grandRev * 100).toFixed(1)}%`, winner: dA.ytd >= dB.ytd ? dA.name.split(' ')[0] : dB.name.split(' ')[0] },
                    { metric:'Nov Revenue', vA: fmt(dA.monthly[10] || 0), vB: fmt(dB.monthly[10] || 0), winner: (dA.monthly[10] || 0) >= (dB.monthly[10] || 0) ? dA.name.split(' ')[0] : dB.name.split(' ')[0] },
                    { metric:'Services', vA: dA.services.length, vB: dB.services.length, winner: '—' },
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
      )}
 
      {/* ══════════ % SHARES ══════════════════════ */}
      {tab === 'pct' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Revenue Share by Department</div>
              <RevenuePieChart data={pieData} colors={DEPTS.map(d => d.color)} />
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Dept Revenue Share</div>
              <div style={{ padding:'8px 0' }}>
                {[...DEPTS].sort((a, b) => b.ytd - a.ytd).map((d, i) => {
                  const pct = (d.ytd / grandRev * 100);
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
        </>
      )}
    </DashboardLayout>
  );
}