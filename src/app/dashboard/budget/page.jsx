'use client';
 
import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import { fmt } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
 
const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
const tip = { background:'#fff', border:'1px solid #E0E4EA', borderRadius:8, fontSize:11 };
 
const TABS = [
  { key:'rev', label:'💰 Revenue' },
  { key:'exp', label:'💸 Expense' },
];
 
const PERIODS = [
  { key:'ytd', label:'Full Year (YTD)' },
  { key:'q1',  label:'Q1' },
  { key:'q2',  label:'Q2' },
  { key:'q3',  label:'Q3' },
  { key:'q4',  label:'Q4' },
];
 
function quarterOf(period) {
  // expects "YYYY-MM"
  const month = parseInt(String(period || '').split('-')[1], 10);
  if (!month) return null;
  if (month <= 3) return 'q1';
  if (month <= 6) return 'q2';
  if (month <= 9) return 'q3';
  return 'q4';
}
 
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
 
export default function BudgetPage() {
  const [budMode, setBudMode] = useState('rev');
  const [period,  setPeriod]  = useState('ytd');
 
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const budgetsConn = getByModule('budgets');
  const revenueConn = getByModule('revenue_ledger');
 
  const budgetsState = useSheetData(budgetsConn);
  const revenueState = useSheetData(revenueConn);
 
  // ── Guard states — budgets is the one connection this whole page truly
  // needs; revenue_ledger only blocks the Revenue tab specifically ──
 
  if (configLoading) return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
 
  if (configError) return (
    <div>
      <SheetError label="Sheet configuration" error={`Could not load the connections manifest: ${configError}`} onRefetch={reload} />
    </div>
  );
 
  if (!budgetsConn) return (
    <div>
      <SheetError
        label="Department Budgets"
        error={`No connection with module "budgets" is configured. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "budget".`}
      />
    </div>
  );
 
  if (budgetsState.loading) return <div><Loading message={`Loading "${budgetsConn.label}" from Google Sheets…`} /></div>;
 
  if (budgetsState.error) return (
    <div>
      <SheetError label={budgetsConn.label} error={budgetsState.error} onRefetch={budgetsState.refetch} />
    </div>
  );
 
  if (!budgetsState.rows || budgetsState.rows.length === 0) return (
    <div>
      <SheetError
        label={budgetsConn.label}
        error={`The sheet connected fine, but the "${budgetsConn.tabName}" tab returned 0 rows. Check that data starts at header row ${budgetsConn.headerRow} and that the range "${budgetsConn.range}" covers it.`}
        onRefetch={budgetsState.refetch}
      />
    </div>
  );
 
  const budgetRows = budgetsState.rows;
 
  // Budgets for the active tab's type
  const wantedType = budMode === 'rev' ? 'revenue' : 'expense';
  const typeBudgets = budgetRows.filter(r => (r.type || '').trim().toLowerCase() === wantedType);
  const deptList = [...new Set(typeBudgets.map(r => r.department).filter(Boolean))];
  const budgetByDept = {};
  typeBudgets.forEach(r => { budgetByDept[r.department] = n(r.amount); });
 
  function downloadCSV(rows, filename) {
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🎯 Budget vs Actual</h2>
        </div>
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>
        Budgets are set in the "Budgets" sheet (Settings → Department Budgets) — edit values there,
        not in this page.
      </p>
 
      <div className={styles.tabStrip} style={{ marginBottom: 12 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setBudMode(t.key)}
            className={`${styles.tabBtn} ${budMode === t.key ? styles.active : ''}`}>
            {t.label}
          </button>
        ))}
      </div>
 
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          style={{ padding:'6px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none' }}>
          {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
 
      {budMode === 'rev' ? (() => {
        // ── Revenue tab — real actuals from revenue_ledger ──
        if (!revenueConn) return (
          <SheetError
            label="Revenue Ledger"
            error={`No connection with module "revenue_ledger" is configured. Revenue actuals can't be computed without it — budgets alone are shown above, but there's nothing to compare them against yet.`}
          />
        );
        if (revenueState.loading) return <Loading message={`Loading "${revenueConn.label}" from Google Sheets…`} />;
        if (revenueState.error) return <SheetError label={revenueConn.label} error={revenueState.error} onRefetch={revenueState.refetch} />;
        if (!revenueState.rows || revenueState.rows.length === 0) return (
          <SheetError label={revenueConn.label} error={`The "${revenueConn.tabName}" tab returned 0 rows — no revenue actuals to compare against budgets.`} onRefetch={revenueState.refetch} />
        );
 
        const filteredRows = period === 'ytd'
          ? revenueState.rows
          : revenueState.rows.filter(r => quarterOf(r._period) === period);
 
        const actualByDept = {};
        filteredRows.forEach(r => {
          const dept = r.department || 'Unspecified';
          actualByDept[dept] = (actualByDept[dept] || 0) + n(r.amount);
        });
 
        const allDepts = [...new Set([...deptList, ...Object.keys(actualByDept)])];
        const rows = allDepts.map(name => {
          const b = budgetByDept[name] || 0;
          const a = actualByDept[name] || 0;
          const v = a - b;
          const vp = b ? (v / b * 100) : 0;
          return { name, b, a, v, vp };
        }).sort((x, y) => y.a - x.a);
 
        const totB = rows.reduce((s, r) => s + r.b, 0);
        const totA = rows.reduce((s, r) => s + r.a, 0);
        const achievement = totB ? Math.round(totA / totB * 100) : 0;
 
        return (
          <>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
              <button
                onClick={() => downloadCSV(
                  ['Department,Budget,Actual,Variance,Variance %',
                   ...rows.map(r => `"${r.name}",${r.b},${r.a},${r.v},${r.vp.toFixed(1)}`)],
                  'Budget_vs_Actual_rev.csv'
                )}
                style={{ padding:'6px 16px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer' }}
              >⬇ Download Budget Report</button>
            </div>
            <div className={styles.kpiGrid} style={{ marginBottom: 14 }}>
              <KPICard label="Total Budget" value={fmt(totB)} color="blue" />
              <KPICard label="Total Actual" value={fmt(totA)} color="green" />
              <KPICard label="Variance" value={fmt(totA - totB)} color={totA >= totB ? 'green' : 'red'} />
              <KPICard label="Achievement" value={`${achievement}%`} color="purple" />
            </div>
 
            <div className={styles.card} style={{ marginBottom: 14 }}>
              <div className={styles.cardTitle}>Budget vs Actual by Department</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rows} margin={{ top:4, right:16, left:0, bottom:0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                  <XAxis dataKey="name" tick={{ fontSize:9, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v=>`₦${(v/1e6).toFixed(0)}M`} />
                  <Tooltip contentStyle={tip} formatter={v=>fmt(v)} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                  <Bar dataKey="b" name="Budget" fill="#85C1E9" radius={[3,3,0,0]} />
                  <Bar dataKey="a" name="Actual" fill="#1B4F72" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
 
            <div className={tableStyles.tableBox}>
              <table className={tableStyles.table}>
                <thead><tr><th>Department</th><th className={tableStyles.right}>Budget</th><th className={tableStyles.right}>Actual</th><th className={tableStyles.right}>Variance</th><th className={tableStyles.right}>Var %</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.map(r => {
                    const good = r.v >= 0;
                    return (
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        <td className={tableStyles.right}>{fmt(r.b)}</td>
                        <td className={tableStyles.right}>{fmt(r.a)}</td>
                        <td className={tableStyles.right} style={{ color: good ? 'var(--teal)' : 'var(--red)' }}>{fmt(r.v)}</td>
                        <td className={tableStyles.right}>{r.vp.toFixed(1)}%</td>
                        <td><span className={`${tableStyles.badge} ${good ? tableStyles.green : tableStyles.red}`}>{good ? 'On Track' : 'Off Track'}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight:700, background:'#f0f4f8' }}>
                    <td>TOTAL</td>
                    <td className={tableStyles.right}>{fmt(totB)}</td>
                    <td className={tableStyles.right}>{fmt(totA)}</td>
                    <td className={tableStyles.right}>{fmt(totA - totB)}</td>
                    <td className={tableStyles.right}>{totB ? ((totA - totB) / totB * 100).toFixed(1) : 0}%</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        );
      })() : (() => {
        // ── Expense tab — budgets are real, actuals are not yet available ──
        const totB = deptList.reduce((s, name) => s + (budgetByDept[name] || 0), 0);
 
        return (
          <>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
              <button
                onClick={() => downloadCSV(
                  ['Department,Budget,Actual',
                   ...deptList.map(name => `"${name}",${budgetByDept[name] || 0},`)],
                  'Budget_vs_Actual_exp.csv'
                )}
                style={{ padding:'6px 16px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer' }}
              >⬇ Download Budget Report</button>
            </div>
            <div style={{ background:'#FFF9E6', border:'1px solid #F4D03F', borderRadius:8, padding:'12px 16px', marginBottom:14, fontSize:11, color:'#856404' }}>
              ⚠ No per-department expense connection exists yet, so "Actual" can't be computed for real —
              only budget targets are shown below. Add an expense-by-department sheet to unlock this.
            </div>
            <div className={styles.kpiGrid} style={{ marginBottom: 14 }}>
              <KPICard label="Total Expense Budget" value={fmt(totB)} color="blue" />
              <KPICard label="Departments Budgeted" value={deptList.length} color="purple" />
            </div>
            <div className={tableStyles.tableBox}>
              <table className={tableStyles.table}>
                <thead><tr><th>Department</th><th className={tableStyles.right}>Budget</th><th>Actual</th></tr></thead>
                <tbody>
                  {deptList.map(name => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td className={tableStyles.right}>{fmt(budgetByDept[name] || 0)}</td>
                      <td style={{ color:'var(--muted)' }}>Not tracked yet</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight:700, background:'#f0f4f8' }}>
                    <td>TOTAL</td>
                    <td className={tableStyles.right}>{fmt(totB)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        );
      })()}
    </div>
  );
}