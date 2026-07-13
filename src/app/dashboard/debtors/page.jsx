'use client';

import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import ReconciliationAlert from '../../components/ReconciliationAlert';
import { useDataWithMeta, usePeriodFilter, PeriodFilterBar } from '../../dashboard/lib/useData';
import { DebtorsTrendChart } from '../../components/Charts';
import { DEBTORS, REVENUE_2025, COLORS, DEMO_DEBTORS, fmt, fmtM } from '../../dashboard/lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';

export default function DebtorsPage() {
  const { month, setMonth, monthOptions, availableMonths } = usePeriodFilter('2025-11', 'debtors');
  const { data: rows, isReal } = useDataWithMeta('debtors', DEMO_DEBTORS, { month });

  // Total from uploaded rows or fall back to DEBTORS constant
  const total = isReal
    ? rows.reduce((s,r) => s+(parseFloat(r.amount)||0), 0)
    : DEBTORS.latest;

  const latRev = REVENUE_2025[10];
  const debR   = latRev > 0 ? total / latRev : 0;
  const mx     = Math.max(...rows.map(r => parseFloat(r.amount)||0), 1);

  // Chart data — use demo trend data when not real
  const chartData = isReal
    ? rows.map(r => ({ period:(r.category||r.name||'').slice(0,14), nov:fmtM(parseFloat(r.amount)||0), oct:0 }))
    : DEBTORS.categories.map((cat,i) => ({ period:cat.length>14?cat.slice(0,14)+'…':cat, oct:fmtM(DEBTORS.data[i][0]), nov:fmtM(DEBTORS.data[i][1]) }));

  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🏦 Debtors & Receivables</h2>
          <p className={styles.pageMeta}>Outstanding balances · {!isReal && 'Demo data — upload via Settings'}</p>
        </div>
      </div>

      <ReconciliationAlert month={month} />

      <PeriodFilterBar
        month={month} setMonth={setMonth}
        monthOptions={monthOptions} availableMonths={availableMonths}
        showMonth={true} showDept={false} isRealData={isReal}
      />

      <div className={styles.kpiGrid}>
        <KPICard label="Total Outstanding" value={fmt(total)} delta="Target < ₦25M" deltaType="down" badge="⚠ Action" badgeType="bad" color="red" />
        <KPICard label="Debtor/Revenue Ratio" value={`${(debR*100).toFixed(1)}%`} delta="Target < 20%" deltaType={debR>0.2?'down':'up'} badge={debR>0.2?'⚠ Above Limit':'✓ OK'} badgeType={debR>0.2?'bad':'good'} color={debR>0.2?'red':'green'} />
        <KPICard label="Debtor Categories" value={rows.length} delta="Active accounts" deltaType="up" color="blue" />
        <KPICard label="Largest Debtor" value={rows[0]?.category||rows[0]?.name||'—'} delta={fmt(parseFloat(rows[0]?.amount)||0)} deltaType="down" color="red" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Debtors Trend</div>
          <DebtorsTrendChart data={chartData} />
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Outstanding Balances</div>
          <div style={{ marginTop:8 }}>
            {rows.map((r,i) => {
              const val = parseFloat(r.amount)||0;
              const pct = mx > 0 ? (val/mx*100).toFixed(0) : 0;
              const cat = r.category || r.name || `Category ${i+1}`;
              return (
                <div key={cat} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                    <span style={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'55%' }}>{cat}</span>
                    <span style={{ fontWeight:700, color:'var(--navy)' }}>{fmt(val)}</span>
                  </div>
                  <div style={{ height:8, background:'#e8ecf0', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, background:COLORS[i%COLORS.length], width:`${pct}%`, transition:'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={tableStyles.tableBox}>
        <div className={tableStyles.tableTitle}>Debtors Ledger — {fmt(total)} total {!isReal&&<span style={{color:'var(--amber)',fontSize:10}}>(demo)</span>}</div>
        <table className={tableStyles.table}>
          <thead><tr><th>Category</th><th>Amount Outstanding</th><th>Priority</th><th>Contact</th></tr></thead>
          <tbody>
            {rows.map((r,i) => {
              const cat = r.category||r.name||`Row ${i+1}`;
              const pri = r.priority||'Medium';
              const priColor = pri==='High'?tableStyles.red:pri==='Low'?tableStyles.green:tableStyles.amber;
              return (
                <tr key={cat}>
                  <td style={{ fontWeight:600 }}>{cat}</td>
                  <td style={{ fontWeight:700 }}>{fmt(parseFloat(r.amount)||0)}</td>
                  <td><span className={`${tableStyles.badge} ${priColor}`}>{pri}</span></td>
                  <td style={{ fontSize:10, color:'var(--muted)' }}>{r.contact||'—'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr><td>TOTAL</td><td style={{ fontWeight:700 }}>{fmt(total)}</td><td colSpan={2}></td></tr></tfoot>
        </table>
      </div>
    </DashboardLayout>
  );
}