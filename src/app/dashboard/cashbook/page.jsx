'use client';
 
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { CashFlowChart, CumulativeCashChart } from '../../components/Charts';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import { MONTHLY_TARGET, fmt, fmtM } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
 
// ─── Descriptive error / loading states (same pattern as other revamped pages) ──
 
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
 
export default function CashbookPage() {
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const revenueConn = getByModule('revenue_monthly');
  const { rows, loading: rowsLoading, error: rowsError, refetch } = useSheetData(revenueConn);
 
  // ── Guard states ──
 
  if (configLoading) return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
 
  if (configError) return (
    <div>
      <SheetError label="Sheet configuration" error={`Could not load the connections manifest: ${configError}`} onRefetch={reload} />
    </div>
  );
 
  if (!revenueConn) return (
    <div>
      <SheetError
        label="Monthly Revenue & Expenses"
        error={`No connection with module "revenue_monthly" is configured. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "cashbook".`}
      />
    </div>
  );
 
  if (rowsLoading) return <div><Loading message={`Loading "${revenueConn.label}" from Google Sheets…`} /></div>;
 
  if (rowsError) return (
    <div>
      <SheetError label={revenueConn.label} error={rowsError} onRefetch={refetch} />
    </div>
  );
 
  if (!rows || rows.length === 0) return (
    <div>
      <SheetError
        label={revenueConn.label}
        error={`The sheet connected fine, but the "${revenueConn.tabName}" tab returned 0 rows. Check that data starts at header row ${revenueConn.headerRow} and that the range "${revenueConn.range}" covers it.`}
        onRefetch={refetch}
      />
    </div>
  );
 
  // ── Real data from here ──
 
  const monthly = rows.map(r => ({
    month:    (r.month || '').slice(0, 3),
    revenue:  n(r.revenue),
    expenses: n(r.expenses),
    target:   n(r.target) || MONTHLY_TARGET,
  }));
 
  const tRev = monthly.reduce((s, r) => s + r.revenue,  0);
  const tExp = monthly.reduce((s, r) => s + r.expenses, 0);
  const tNet = tRev - tExp;
  const nMonths = monthly.length || 1;
 
  const bestMonth = [...monthly].sort((a, b) => b.revenue - a.revenue)[0];
 
  // Running cash position — kept as one raw number, only scaled to
  // millions when handed to the chart component (no round-trip conversion)
  let cumRaw = 0;
  const cashData = monthly.map(r => {
    cumRaw += r.revenue - r.expenses;
    return {
      month: r.month,
      receipts: fmtM(r.revenue),
      payments: fmtM(r.expenses),
      cumulative: fmtM(cumRaw),
      cumulativeRaw: cumRaw,
    };
  });
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>📒 Cashbook Summary</h2>
          <p className={styles.pageMeta}>Monthly receipts & payments · {nMonths} month{nMonths !== 1 ? 's' : ''} of data</p>
        </div>
      </div>
 
      {/* ── KPIs — bespoke, derived from the same real revenue/expenses columns ──── */}
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
        <KPICard label="Avg Monthly Receipts" value={fmt(tRev / nMonths)} delta={`${nMonths} active month${nMonths !== 1 ? 's' : ''}`} deltaType="up" color="blue" />
        <KPICard label="Avg Monthly Payments" value={fmt(tExp / nMonths)} deltaType="warn" color="amber" />
        <KPICard
          label="Best Month (Revenue)"
          value={bestMonth ? bestMonth.month : '—'}
          delta={bestMonth ? fmt(bestMonth.revenue) : ''}
          deltaType="up"
          badge="Peak"
          badgeType="good"
          color="purple"
        />
      </div>
 
      {/* ── Charts — reuse existing chart components, fed by real rows ──── */}
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
 
      {/* ── Monthly table — bespoke, needs Net/Cumulative/Ratio/Status derived columns ──── */}
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
            {monthly.map((r, i) => {
              const net = r.revenue - r.expenses;
              const ratio = r.revenue > 0 ? (r.expenses / r.revenue * 100).toFixed(1) : null;
              const cumVal = cashData[i].cumulativeRaw;
              return (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.month}</td>
                  <td style={{ color: 'var(--teal)', fontWeight: 600 }}>{fmt(r.revenue)}</td>
                  <td style={{ color: 'var(--red)' }}>{fmt(r.expenses)}</td>
                  <td style={{ fontWeight: 700, color: net >= 0 ? 'var(--teal)' : 'var(--red)' }}>
                    {net >= 0 ? '+' : ''}{fmt(net)}
                  </td>
                  <td style={{ color: cumVal >= 0 ? 'var(--navy)' : 'var(--red)' }}>{fmt(cumVal)}</td>
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
              <td>{tRev > 0 ? `${(tExp / tRev * 100).toFixed(1)}%` : '—'}</td>
              <td>
                <span className={`${tableStyles.badge} ${tNet > 0 ? tableStyles.green : tableStyles.red}`}>
                  {tNet > 0 ? 'Net Positive' : 'Net Deficit'}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}