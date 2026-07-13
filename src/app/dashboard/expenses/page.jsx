'use client';
 
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { useDataWithMeta, usePeriodFilter, PeriodFilterBar } from '../lib/useData';
import { ExpensePieChart, ExpenseRatioChart } from '../../components/Charts';
import { EXPENSE_CATS, DEMO_REVENUE_MONTHLY, fmt, fmtM } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const EXP_COLORS = ['#C0392B','#922B21','#E74C3C','#F39C12','#8E44AD','#2E86C1'];
 
export default function ExpensesPage() {
  const { month, setMonth, monthOptions, availableMonths } =
    usePeriodFilter('2025-11', 'revenue_monthly');
 
  // Expenses are derived from the revenue_monthly module
  const { data: rows, isReal } = useDataWithMeta('revenue_monthly', DEMO_REVENUE_MONTHLY);
 
  const tRev = rows.reduce((s, r) => s + (parseFloat(r.revenue)  || 0), 0);
  const tExp = rows.reduce((s, r) => s + (parseFloat(r.expenses) || 0), 0);
 
  // Build category breakdown from EXPENSE_CATS percentages applied to total
  const cats = EXPENSE_CATS
    .map(c => ({ ...c, ytd: Math.round(tExp * c.sh) }))
    .sort((a, b) => b.ytd - a.ytd);
 
  const pieData = cats.map(c => ({ name: c.n, value: fmtM(c.ytd) }));
 
  const ratioData = rows.map((r, i) => ({
    month: (r.month || '').slice(0, 3),
    ratio: parseFloat(r.revenue) > 0
      ? +(parseFloat(r.expenses) / parseFloat(r.revenue) * 100).toFixed(1)
      : null,
    limit: 60,
  }));
 
  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>💸 Expenditure Analysis</h2>
          <p className={styles.pageMeta}>Cost breakdown · FY 2025</p>
        </div>
      </div>
 
      <PeriodFilterBar
        month={month} setMonth={setMonth}
        monthOptions={monthOptions} availableMonths={availableMonths}
        showMonth={true} showDept={false} isRealData={isReal}
      />
 
      <div className={styles.kpiGrid}>
        <KPICard label="Total Expenditure YTD" value={fmt(tExp)} color="red" />
        <KPICard
          label="Expense / Revenue Ratio"
          value={tRev > 0 ? `${(tExp / tRev * 100).toFixed(1)}%` : '—'}
          delta="Target < 60%"
          deltaType={tRev > 0 && tExp / tRev < 0.6 ? 'up' : 'down'}
          badge={tRev > 0 && tExp / tRev < 0.6 ? '✓ OK' : '⚠ High'}
          badgeType={tRev > 0 && tExp / tRev < 0.6 ? 'good' : 'bad'}
          color={tRev > 0 && tExp / tRev < 0.6 ? 'green' : 'red'}
        />
        <KPICard
          label="Largest Cost Category"
          value={cats[0]?.n || '—'}
          delta={fmt(cats[0]?.ytd || 0)}
          deltaType="warn"
          color="amber"
        />
        <KPICard
          label="Monthly Avg Expenses"
          value={rows.length > 0 ? fmt(tExp / rows.length) : '—'}
          color="purple"
        />
      </div>
 
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Cost Category Breakdown</div>
          <ExpensePieChart data={pieData} colors={EXP_COLORS} />
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Expense / Revenue Ratio Trend</div>
          <ExpenseRatioChart data={ratioData} />
          <p style={{ fontSize:10, color:'var(--muted)', marginTop:8 }}>
            Red dashed line = 60% threshold.
          </p>
        </div>
      </div>
 
      <div className={tableStyles.tableBox}>
        <div className={tableStyles.tableTitle}>
          Expense Categories {!isReal && <span style={{ color:'var(--amber)', fontSize:10 }}>(derived from demo revenue data)</span>}
        </div>
        <table className={tableStyles.table}>
          <thead>
            <tr><th>Category</th><th>YTD Amount</th><th>% of Total</th><th>Monthly Avg</th><th>Status</th></tr>
          </thead>
          <tbody>
            {cats.map(c => {
              const pct   = tExp > 0 ? (c.ytd / tExp * 100).toFixed(1) : 0;
              const bench = Math.round(c.sh * 100 + 5);
              const ok    = +pct <= bench;
              return (
                <tr key={c.n}>
                  <td style={{ fontWeight:600 }}>{c.n}</td>
                  <td>{fmt(c.ytd)}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ height:6, borderRadius:3, background:'var(--red)', opacity:0.7, width:`${Math.min(80, +pct * 2)}px` }} />
                      <span>{pct}%</span>
                    </div>
                  </td>
                  <td>{rows.length > 0 ? fmt(c.ytd / rows.length) : '—'}</td>
                  <td>
                    <span className={`${tableStyles.badge} ${ok ? tableStyles.green : tableStyles.amber}`}>
                      {ok ? '✓ Within limit' : '⚠ Monitor'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>TOTAL EXPENDITURE</td>
              <td style={{ fontWeight:700 }}>{fmt(tExp)}</td>
              <td>100%</td>
              <td>{rows.length > 0 ? fmt(tExp / rows.length) : '—'}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </DashboardLayout>
  );
}