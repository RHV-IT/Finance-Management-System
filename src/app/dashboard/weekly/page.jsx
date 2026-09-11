'use client';
 
import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import PageRenderer from '../../components/PageRenderer';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import { ExpenseRatioChart } from '../../components/Charts';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { MONTHS, REVENUE_2024, MONTHLY_TARGET, fmt, fmtM } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const tip = { background:'#fff', border:'1px solid #E0E4EA', borderRadius:8, fontSize:11 };
const n   = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
 
const TABS = [
  { key:'monthly',   label:'Monthly'      },
  { key:'weekly',    label:'Weekly'       },
  { key:'quarterly', label:'Quarterly'    },
  { key:'yearly',    label:'Year-on-Year' },
];
 
const WEEK_SPLITS = [0.19, 0.22, 0.25, 0.28, 0.06];
const WEEK_RANGES = ['1–7', '8–14', '15–21', '22–28', '29–31'];
 
// ─── Descriptive error / loading states ────────────────────────
// Mirrors the SheetError pattern already used on the Inventory page,
// so error messaging is consistent across the app.
 
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
        <a href="/dashboard/settings" style={{ padding: '8px 18px', background: 'var(--navy)', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>⚙ Go to Settings</a>
        {onRefetch && !notConnected && (
          <button onClick={onRefetch} style={{ padding: '8px 18px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>↻ Retry</button>
        )}
      </div>
    </div>
  );
}
 
function Loading({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)', fontSize: 12 }}>
      ⏳ {message}
    </div>
  );
}
 
export default function WeeklyPage() {
  const [tab,     setTab]     = useState('monthly');
  const [selWeek, setSelWeek] = useState(0);
 
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const revenueConn = getByModule('revenue_monthly');
  const { rows, loading: rowsLoading, error: rowsError, refetch } = useSheetData(revenueConn);
 
  // ── Guard states, in order of what could actually go wrong ──
 
  if (configLoading) {
    return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
  }
 
  if (configError) {
    return (
      <div>
        <SheetError
          label="Sheet configuration"
          error={`Could not load the connections manifest: ${configError}`}
          onRefetch={reload}
        />
      </div>
    );
  }
 
  if (!revenueConn) {
    return (
      <div>
        <SheetError
          label="Monthly Revenue & Expenses"
          error={`No connection with module "revenue_monthly" is configured. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "weekly".`}
        />
      </div>
    );
  }
 
  if (rowsLoading) {
    return <div><Loading message={`Loading "${revenueConn.label}" from Google Sheets…`} /></div>;
  }
 
  if (rowsError) {
    return (
      <div>
        <SheetError label={revenueConn.label} error={rowsError} onRefetch={refetch} />
      </div>
    );
  }
 
  if (!rows || rows.length === 0) {
    return (
      <div>
        <SheetError
          label={revenueConn.label}
          error={`The sheet connected fine, but the "${revenueConn.tabName}" tab returned 0 rows. Check that data actually starts at header row ${revenueConn.headerRow} and that the range "${revenueConn.range}" covers it.`}
          onRefetch={refetch}
        />
      </div>
    );
  }
 
  // ── Real data from here on — no demo fallback ──
 
  const monthly = rows.map(r => ({
    month:    (r.month || '').slice(0, 3),
    revenue:  n(r.revenue),
    expenses: n(r.expenses),
    target:   n(r.target) || MONTHLY_TARGET,
  }));
 
  const tRev = monthly.reduce((s, r) => s + r.revenue,  0);
  const tExp = monthly.reduce((s, r) => s + r.expenses, 0);
  const nMonths = monthly.length || 1;
 
  const monthlyChartData = monthly.map(r => ({
    month:    r.month,
    revenue:  fmtM(r.revenue),
    expenses: fmtM(r.expenses),
    target:   fmtM(r.target),
    surplus:  fmtM(r.revenue - r.expenses),
    ratio:    r.revenue > 0 ? +(r.expenses / r.revenue * 100).toFixed(1) : null,
    limit:    60,
  }));
 
  // Quarterly — split into groups of 3
  const quarters = ['Q1','Q2','Q3','Q4'].map((q, qi) => {
    const slice = monthly.slice(qi * 3, qi * 3 + 3);
    const r = slice.reduce((s, m) => s + m.revenue,  0);
    const e = slice.reduce((s, m) => s + m.expenses, 0);
    return { quarter: q, revenue: fmtM(r), expenses: fmtM(e), surplus: fmtM(r - e) };
  });
 
  // YoY — real 2025 rows vs a hardcoded 2024 baseline (not yet a real connection)
  const yoyData = MONTHS.map((m, i) => ({
    month:  m,
    y2024:  fmtM(REVENUE_2024[i] || 0),
    y2025:  fmtM(monthly[i]?.revenue || 0),
  }));
 
  // Most recent month on record — used for the synthetic weekly split
  const selMonthData = monthly[monthly.length - 1] || { month: '—', revenue: 0 };
  const moRev = selMonthData.revenue;
 
  const weekData = WEEK_SPLITS.map((p, i) => ({
    week:   `W${i + 1}`,
    range:  WEEK_RANGES[i],
    amount: fmtM(moRev * p),
  }));
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>📅 Periodic Reports</h2>
          <p className={styles.pageMeta}>Monthly · Weekly · Quarterly · Year-on-Year</p>
        </div>
      </div>
 
      <div className={styles.kpiGrid}>
        <KPICard label="YTD Revenue"   value={fmt(tRev)} color="green" deltaType="up" />
        <KPICard label="YTD Expenses"  value={fmt(tExp)} color="red"   deltaType="warn" />
        <KPICard label="YTD Surplus"   value={fmt(tRev - tExp)} delta={tRev - tExp > 0 ? 'Positive' : 'Deficit'} deltaType={tRev - tExp > 0 ? 'up' : 'down'} color={tRev - tExp > 0 ? 'green' : 'red'} />
        <KPICard label="Months of Data" value={nMonths} color="blue" />
      </div>
 
      {/* Tab switcher */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'6px 14px', border:'1.5px solid', borderRadius:6,
            fontSize:11, fontWeight:600, cursor:'pointer',
            borderColor: tab===t.key ? 'var(--navy)' : 'var(--border)',
            background:  tab===t.key ? 'var(--navy)' : '#fff',
            color:       tab===t.key ? '#fff' : 'var(--text)',
          }}>{t.label}</button>
        ))}
      </div>
 
      {/* ── Monthly — config-driven via PageRenderer ─── */}
      {tab === 'monthly' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {/* Revenue vs Target — reads viz-rev-003 from the revenue_monthly connection */}
            <PageRenderer page="weekly" module="revenue_monthly" only={['bar']} />
 
            {/* Expense/Revenue ratio is a derived metric — no viz type supports computed
                fields yet, so this stays a bespoke chart fed by the same raw rows. */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Expense / Revenue Ratio</div>
              <ExpenseRatioChart data={monthlyChartData} />
            </div>
          </div>
 
          {/* Monthly summary table — reads viz-rev-004 */}
          <PageRenderer page="weekly" module="revenue_monthly" only={['table']} />
        </>
      )}
 
      {/* ── Weekly — synthetic split, no real per-week data source yet ─── */}
      {tab === 'weekly' && (
        <>
          <div style={{ fontSize:10.5, color:'var(--muted)', marginBottom:10 }}>
            Estimated split of <strong>{selMonthData.month}</strong>'s revenue using fixed weekly
            percentages — there's no real per-week sheet connected yet, so this is not live data.
          </div>
          <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
            {WEEK_SPLITS.map((p, i) => (
              <div key={i} onClick={() => setSelWeek(i)} style={{
                flex:1, minWidth:90, background:selWeek===i?'#e8f8f5':'#fff',
                border:`2px solid ${selWeek===i?'var(--teal)':'var(--border)'}`,
                borderRadius:8, padding:'10px 12px', textAlign:'center', cursor:'pointer',
              }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)' }}>Week {i+1}</div>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--teal)', margin:'4px 0' }}>
                  {fmt(Math.round(moRev * p))}
                </div>
                <div style={{ fontSize:9, color:'var(--muted)' }}>{WEEK_RANGES[i]}</div>
              </div>
            ))}
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Weekly Revenue Distribution (estimated)</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekData} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                <XAxis dataKey="week" tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v=>`₦${v}M`} width={44} />
                <Tooltip contentStyle={tip} formatter={v=>`₦${v}M`} />
                <Bar dataKey="amount" fill="#117A65" radius={[3,3,0,0]}>
                  {weekData.map((_,i) => (
                    <Cell key={i} fill={i===selWeek?'#1B4F72':'#117A65aa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
 
      {/* ── Quarterly — grouped from real monthly rows, no config viz for this yet ─── */}
      {tab === 'quarterly' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Quarterly Revenue vs Expenses</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={quarters} margin={{ top:4, right:8, left:0, bottom:0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                  <XAxis dataKey="quarter" tick={{ fontSize:11, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v=>`₦${v}M`} width={48} />
                  <Tooltip contentStyle={tip} formatter={v=>`₦${v}M`} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                  <Bar dataKey="revenue"  name="Revenue"  fill="#117A65aa" radius={[3,3,0,0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#C0392Baa" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Quarterly Radar</div>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={quarters} margin={{ top:8, right:16, bottom:8, left:16 }}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="quarter" tick={{ fontSize:11 }} />
                  <Radar name="Revenue"  dataKey="revenue"  stroke="#117A65" fill="#117A65" fillOpacity={0.2} />
                  <Radar name="Expenses" dataKey="expenses" stroke="#C0392B" fill="#C0392B" fillOpacity={0.1} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                  <Tooltip contentStyle={tip} formatter={v=>`₦${v}M`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {quarters.map(q => (
              <div key={q.quarter} style={{ background:'var(--card)', borderRadius:10, padding:'16px', boxShadow:'var(--shadow-sm)', borderLeft:`4px solid ${q.surplus >= 0 ? 'var(--teal)' : 'var(--red)'}` }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase' }}>{q.quarter} 2025</div>
                <div style={{ fontSize:14, fontWeight:800, color:'var(--navy)', marginTop:4 }}>₦{q.revenue}M</div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>Exp: ₦{q.expenses}M</div>
                <div style={{ fontSize:11, fontWeight:700, color: q.surplus >= 0 ? 'var(--teal)' : 'var(--red)', marginTop:4 }}>
                  Net: {q.surplus >= 0 ? '+' : ''}₦{q.surplus}M
                </div>
              </div>
            ))}
          </div>
        </>
      )}
 
      {/* ── Year-on-Year — 2025 is real, 2024 is still a placeholder baseline ─── */}
      {tab === 'yearly' && (
        <div>
          <div style={{ fontSize:10.5, color:'var(--muted)', marginBottom:10 }}>
            2025 figures come from your connected sheet. The 2024 baseline is placeholder data —
            connect a real prior-year sheet to replace it with an actual year-on-year comparison.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Year-on-Year Monthly Revenue</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={yoyData} margin={{ top:4, right:8, left:0, bottom:0 }} barCategoryGap="25%">
                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                  <XAxis dataKey="month" tick={{ fontSize:9, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v=>`₦${v}M`} width={44} />
                  <Tooltip contentStyle={tip} formatter={v=>`₦${v}M`} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                  <Bar dataKey="y2024" name="2024 (placeholder)" fill="#1B4F7288" radius={[2,2,0,0]} />
                  <Bar dataKey="y2025" name="2025" fill="#117A65"   radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={tableStyles.tableBox} style={{ margin:0 }}>
              <div className={tableStyles.tableTitle}>YoY Summary</div>
              <table className={tableStyles.table}>
                <thead><tr><th>Metric</th><th>2024</th><th>2025</th><th>Growth</th></tr></thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight:600 }}>Total Revenue</td>
                    <td style={{ color:'var(--muted)' }}>₦{(REVENUE_2024.reduce((a,b)=>a+b,0)/1e6).toFixed(0)}M</td>
                    <td style={{ fontWeight:700 }}>{fmt(tRev)}</td>
                    <td style={{ color:'var(--teal)', fontWeight:700 }}>
                      {REVENUE_2024.reduce((a,b)=>a+b,0) > 0
                        ? `+${((tRev - REVENUE_2024.reduce((a,b)=>a+b,0)) / REVENUE_2024.reduce((a,b)=>a+b,0) * 100).toFixed(0)}%`
                        : 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight:600 }}>Avg Monthly</td>
                    <td style={{ color:'var(--muted)' }}>{fmt(REVENUE_2024.reduce((a,b)=>a+b,0)/12)}</td>
                    <td style={{ fontWeight:700 }}>{fmt(tRev / nMonths)}</td>
                    <td style={{ color:'var(--teal)' }}>Growth</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight:600 }}>Months of Data</td>
                    <td style={{ color:'var(--muted)' }}>12</td>
                    <td style={{ fontWeight:700 }}>{nMonths}</td>
                    <td>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}