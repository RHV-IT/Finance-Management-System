'use client';
 
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import PageRenderer from '../../components/PageRenderer';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import { ExpenseRatioChart } from '../../components/Charts';
import { MONTHLY_TARGET, fmt } from '../lib/data';
import styles from '../../styles/Layout.module.css';
 
const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
 
// ─── Descriptive error / loading states (same pattern as Weekly/Revenue) ──
 
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
 
export default function ExpensesPage() {
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
        error={`No connection with module "revenue_monthly" is configured. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "expenses".`}
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
  const ratio = tRev > 0 ? tExp / tRev * 100 : null;
  const latestMonth = monthly[monthly.length - 1];
 
  const ratioData = monthly.map(r => ({
    month: r.month,
    ratio: r.revenue > 0 ? +(r.expenses / r.revenue * 100).toFixed(1) : null,
    limit: 60,
  }));
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>💸 Expenditure Analysis</h2>
          <p className={styles.pageMeta}>Cost trend · {monthly.length} month{monthly.length !== 1 ? 's' : ''} of data</p>
        </div>
      </div>
 
      {/* ── KPIs — bespoke, straight off the real month/revenue/expenses rows ──── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Expenditure YTD" value={fmt(tExp)} color="red" />
        <KPICard
          label="Expense / Revenue Ratio"
          value={ratio !== null ? `${ratio.toFixed(1)}%` : '—'}
          delta="Target < 60%"
          deltaType={ratio !== null && ratio < 60 ? 'up' : 'down'}
          badge={ratio !== null && ratio < 60 ? '✓ OK' : '⚠ High'}
          badgeType={ratio !== null && ratio < 60 ? 'good' : 'bad'}
          color={ratio !== null && ratio < 60 ? 'green' : 'red'}
        />
        <KPICard
          label={`${latestMonth?.month || 'Latest'} Expenses`}
          value={latestMonth ? fmt(latestMonth.expenses) : '—'}
          color="amber"
        />
        <KPICard
          label="Monthly Avg Expenses"
          value={monthly.length > 0 ? fmt(tExp / monthly.length) : '—'}
          color="purple"
        />
      </div>
 
      {/* ── Ratio trend — derived metric (expenses/revenue), stays bespoke ──── */}
      <div className={styles.card} style={{ marginBottom: 14 }}>
        <div className={styles.cardTitle}>Expense / Revenue Ratio Trend</div>
        <ExpenseRatioChart data={ratioData} />
        <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>
          Red dashed line = 60% threshold.
        </p>
      </div>
 
      {/* ── Monthly detail — config-driven via PageRenderer (viz-rev-004) ──── */}
      <PageRenderer page="expenses" module="revenue_monthly" only={['table']} />
    </div>
  );
}