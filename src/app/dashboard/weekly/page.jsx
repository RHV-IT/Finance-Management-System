'use client';
 
import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { useDataWithMeta, usePeriodFilter, PeriodFilterBar } from '../lib/useData';
import { RevenueVsTargetChart, ExpenseRatioChart } from '../../components/Charts';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import {
  MONTHS, REVENUE_2025, EXPENSES_2025, REVENUE_2024,
  MONTHLY_TARGET, DEMO_REVENUE_MONTHLY, fmt, fmtM,
} from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const tip = { background:'#fff', border:'1px solid #E0E4EA', borderRadius:8, fontSize:11 };
 
const TABS = [
  { key:'monthly',   label:'Monthly'      },
  { key:'weekly',    label:'Weekly'       },
  { key:'quarterly', label:'Quarterly'    },
  { key:'yearly',    label:'Year-on-Year' },
];
 
const WEEK_SPLITS = [0.19, 0.22, 0.25, 0.28, 0.06];
const WEEK_RANGES = ['1–7', '8–14', '15–21', '22–28', '29–31'];
 
export default function WeeklyPage() {
  const [tab,      setTab]      = useState('monthly');
  const [selWeek,  setSelWeek]  = useState(0);
 
  const { month, setMonth, monthOptions, availableMonths } =
    usePeriodFilter('2025-11', 'revenue_monthly');
 
  const { data: rows, isReal } = useDataWithMeta('revenue_monthly', DEMO_REVENUE_MONTHLY);
 
  // Build monthly array from uploaded or demo
  const monthly = rows.length > 0
    ? rows.map(r => ({
        month:    (r.month || '').slice(0, 3),
        revenue:  parseFloat(r.revenue)  || 0,
        expenses: parseFloat(r.expenses) || 0,
        target:   parseFloat(r.target)   || MONTHLY_TARGET,
      }))
    : MONTHS.map((m, i) => ({
        month:    m,
        revenue:  REVENUE_2025[i],
        expenses: EXPENSES_2025[i],
        target:   MONTHLY_TARGET,
      }));
 
  const tRev = monthly.reduce((s, r) => s + r.revenue,  0);
  const tExp = monthly.reduce((s, r) => s + r.expenses, 0);
  const n    = monthly.length || 1;
 
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
 
  // YoY — uploaded vs REVENUE_2024 demo
  const yoyData = MONTHS.map((m, i) => ({
    month:  m,
    y2024:  fmtM(REVENUE_2024[i] || 0),
    y2025:  fmtM(monthly[i]?.revenue || 0),
  }));
 
  // Selected month for weekly drill-down
  const selMonthIdx  = monthOptions.findIndex(m => m.value === month);
  const selMonthData = monthly[monthly.length - 1] || monthly[0] || { revenue: 0 };
  const moRev        = selMonthData.revenue;
 
  const weekData = WEEK_SPLITS.map((p, i) => ({
    week:   `W${i + 1}`,
    range:  WEEK_RANGES[i],
    amount: fmtM(moRev * p),
  }));
 
  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>📅 Periodic Reports</h2>
          <p className={styles.pageMeta}>Monthly · Weekly · Quarterly · Year-on-Year</p>
        </div>
      </div>
 
      <PeriodFilterBar
        month={month} setMonth={setMonth}
        monthOptions={monthOptions} availableMonths={availableMonths}
        showMonth={true} showDept={false} isRealData={isReal}
      />
 
      <div className={styles.kpiGrid}>
        <KPICard label="YTD Revenue"   value={fmt(tRev)} color="green" deltaType="up" />
        <KPICard label="YTD Expenses"  value={fmt(tExp)} color="red"   deltaType="warn" />
        <KPICard label="YTD Surplus"   value={fmt(tRev - tExp)} delta={tRev - tExp > 0 ? 'Positive' : 'Deficit'} deltaType={tRev - tExp > 0 ? 'up' : 'down'} color={tRev - tExp > 0 ? 'green' : 'red'} />
        <KPICard label="Months of Data" value={n} color="blue" />
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
 
      {/* ── Monthly ─── */}
      {tab === 'monthly' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Monthly Revenue vs Target</div>
              <RevenueVsTargetChart data={monthlyChartData} />
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Expense / Revenue Ratio</div>
              <ExpenseRatioChart data={monthlyChartData} />
            </div>
          </div>
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Monthly Summary</div>
            <table className={tableStyles.table}>
              <thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Surplus</th><th>Exp Ratio</th><th>Status</th></tr></thead>
              <tbody>
                {monthly.map((r, i) => {
                  const net   = r.revenue - r.expenses;
                  const ratio = r.revenue > 0 ? (r.expenses / r.revenue * 100).toFixed(1) : null;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight:600 }}>{r.month}</td>
                      <td style={{ color:'var(--teal)', fontWeight:600 }}>{fmt(r.revenue)}</td>
                      <td style={{ color:'var(--red)' }}>{fmt(r.expenses)}</td>
                      <td style={{ fontWeight:700, color:net>=0?'var(--teal)':'var(--red)' }}>
                        {net >= 0 ? '+' : ''}{fmt(net)}
                      </td>
                      <td style={{ color: ratio && +ratio > 60 ? 'var(--red)' : 'var(--teal)' }}>
                        {ratio ? `${ratio}%` : '—'}
                      </td>
                      <td>
                        <span className={`${tableStyles.badge} ${net >= 0 ? tableStyles.green : tableStyles.red}`}>
                          {net >= 0 ? 'Surplus' : 'Deficit'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>TOTAL</td>
                  <td style={{ color:'var(--teal)' }}>{fmt(tRev)}</td>
                  <td style={{ color:'var(--red)' }}>{fmt(tExp)}</td>
                  <td style={{ fontWeight:700 }}>{fmt(tRev - tExp)}</td>
                  <td>{tRev > 0 ? `${(tExp/tRev*100).toFixed(1)}%` : '—'}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ── Weekly ─── */}
      {tab === 'weekly' && (
        <>
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
            <div className={styles.cardTitle}>Weekly Revenue Distribution</div>
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
 
      {/* ── Quarterly ─── */}
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
 
      {/* ── Year-on-Year ─── */}
      {tab === 'yearly' && (
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
                <Bar dataKey="y2024" name="2024" fill="#1B4F7288" radius={[2,2,0,0]} />
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
                  <td style={{ fontWeight:700 }}>{fmt(tRev / n)}</td>
                  <td style={{ color:'var(--teal)' }}>Growth</td>
                </tr>
                <tr>
                  <td style={{ fontWeight:600 }}>Months of Data</td>
                  <td style={{ color:'var(--muted)' }}>12</td>
                  <td style={{ fontWeight:700 }}>{n}</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}