'use client';
 
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { CashFlowChart, CumulativeCashChart } from '../../components/Charts';
import { MONTHS, REVENUE_2025, EXPENSES_2025, fmt, fmtM } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const tRev  = REVENUE_2025.reduce((a, b) => a + b, 0);
const tExp  = EXPENSES_2025.reduce((a, b) => a + b, 0);
const tNet  = tRev - tExp;
 
// Cumulative cash position
let cum = 0;
const cashData = MONTHS.map((m, i) => {
  cum += REVENUE_2025[i] - EXPENSES_2025[i];
  return {
    month: m,
    receipts: fmtM(REVENUE_2025[i]),
    payments: fmtM(EXPENSES_2025[i]),
    cumulative: fmtM(cum),
  };
});
 
export default function CashbookPage() {
  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>📒 Cashbook Summary</h2>
          <p className={styles.pageMeta}>Monthly receipts & payments · FY 2025</p>
        </div>
      </div>
 
      {/* ── KPIs ─────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Receipts YTD" value={fmt(tRev)} delta="All revenue collected" deltaType="up" color="green" />
        <KPICard label="Total Payments YTD" value={fmt(tExp)} delta="All expenses paid" deltaType="warn" color="red" />
        <KPICard
          label="Net Cash Position"
          value={fmt(tNet)}
          delta={tNet > 0 ? 'Positive balance' : 'Deficit'}
          deltaType={tNet > 0 ? 'up' : 'down'}
          badge={tNet > 0 ? 'Positive' : 'Deficit'}
          badgeType={tNet > 0 ? 'good' : 'bad'}
          color={tNet > 0 ? 'green' : 'red'}
        />
        <KPICard label="Avg Monthly Receipts" value={fmt(tRev / 11)} delta="11 active months" deltaType="up" color="blue" />
        <KPICard label="Avg Monthly Payments" value={fmt(tExp / 11)} deltaType="warn" color="amber" />
        <KPICard
          label="Best Month (Revenue)"
          value="Aug 2025"
          delta={fmt(REVENUE_2025[7])}
          deltaType="up"
          badge="Peak"
          badgeType="good"
          color="purple"
        />
      </div>
 
      {/* ── Charts ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Monthly Cash Flow</div>
          <CashFlowChart data={cashData} />
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Cumulative Cash Position</div>
          <CumulativeCashChart data={cashData} />
        </div>
      </div>
 
      {/* ── Monthly Table ─────────────────────────── */}
      <div className={tableStyles.tableBox}>
        <div className={tableStyles.tableTitle}>Full Year Monthly Summary</div>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Month</th>
              <th>Receipts</th>
              <th>Payments</th>
              <th>Net</th>
              <th>Cumulative</th>
              <th>Exp Ratio</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((m, i) => {
              const rec = REVENUE_2025[i];
              const pay = EXPENSES_2025[i];
              const net = rec - pay;
              const ratio = rec > 0 ? (pay / rec * 100).toFixed(1) : null;
              const cumVal = cashData[i].cumulative;
              return (
                <tr key={m}>
                  <td style={{ fontWeight: 600 }}>{m} 2025</td>
                  <td style={{ color: 'var(--teal)', fontWeight: 600 }}>{fmt(rec)}</td>
                  <td style={{ color: 'var(--red)' }}>{fmt(pay)}</td>
                  <td style={{ fontWeight: 700, color: net >= 0 ? 'var(--teal)' : 'var(--red)' }}>
                    {net >= 0 ? '+' : ''}{fmt(net)}
                  </td>
                  <td style={{ color: +cumVal >= 0 ? 'var(--navy)' : 'var(--red)' }}>{fmt(+cumVal * 1e6)}</td>
                  <td>
                    {ratio ? (
                      <span style={{ color: +ratio < 60 ? 'var(--teal)' : 'var(--red)', fontWeight: 600 }}>
                        {ratio}%
                      </span>
                    ) : '—'}
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
              <td style={{ color: 'var(--teal)' }}>{fmt(tRev)}</td>
              <td style={{ color: 'var(--red)' }}>{fmt(tExp)}</td>
              <td style={{ fontWeight: 700 }}>{fmt(tNet)}</td>
              <td>{fmt(tNet)}</td>
              <td>{(tExp / tRev * 100).toFixed(1)}%</td>
              <td>
                <span className={`${tableStyles.badge} ${tNet > 0 ? tableStyles.green : tableStyles.red}`}>
                  {tNet > 0 ? 'Net Positive' : 'Net Deficit'}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </DashboardLayout>
  );
}