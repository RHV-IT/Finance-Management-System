'use client';
 
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import ReconciliationAlert from '../../components/ReconciliationAlert';
import PageRenderer from '../../components/PageRenderer';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import { fmt } from '../lib/data';
import styles from '../../styles/Layout.module.css';
 
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
 
export default function DebtorsPage() {
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
 
  const debtorsConn = getByModule('debtors');
  const { rows, loading: rowsLoading, error: rowsError, refetch } = useSheetData(debtorsConn);
 
  // Revenue is only used for one optional cross-sheet KPI (the ratio) —
  // if it's missing or fails, we degrade that one KPI to "—" rather than
  // blocking the whole Debtors page over an auxiliary connection.
  const revenueConn = getByModule('revenue_monthly');
  const { rows: revenueRows, error: revenueError } = useSheetData(revenueConn);
 
  // ── Guard states — these only apply to the debtors connection itself ──
 
  if (configLoading) return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
 
  if (configError) return (
    <div>
      <SheetError label="Sheet configuration" error={`Could not load the connections manifest: ${configError}`} onRefetch={reload} />
    </div>
  );
 
  if (!debtorsConn) return (
    <div>
      <SheetError
        label="Debtors / Receivables"
        error={`No connection with module "debtors" is configured. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "debtors".`}
      />
    </div>
  );
 
  if (rowsLoading) return <div><Loading message={`Loading "${debtorsConn.label}" from Google Sheets…`} /></div>;
 
  if (rowsError) return (
    <div>
      <SheetError label={debtorsConn.label} error={rowsError} onRefetch={refetch} />
    </div>
  );
 
  if (!rows || rows.length === 0) return (
    <div>
      <SheetError
        label={debtorsConn.label}
        error={`The sheet connected fine, but the "${debtorsConn.tabName}" tab returned 0 rows. Check that data starts at header row ${debtorsConn.headerRow} and that the range "${debtorsConn.range}" covers it.`}
        onRefetch={refetch}
      />
    </div>
  );
 
  // ── Real data from here ──
 
  const total = rows.reduce((s, r) => s + n(r.amount), 0);
  const categoriesTracked = new Set(rows.map(r => r.category).filter(Boolean)).size;
  const largest = [...rows].sort((a, b) => n(b.amount) - n(a.amount))[0];
 
  const latestPeriod = [...new Set(rows.map(r => r._period).filter(Boolean))].sort().pop();
 
  // Cross-connection ratio — degrades gracefully instead of blocking the page
  const hasRevenue = !revenueError && revenueRows && revenueRows.length > 0;
  const latestRevenue = hasRevenue ? n(revenueRows[revenueRows.length - 1].revenue) : null;
  const ratio = latestRevenue && latestRevenue > 0 ? (total / latestRevenue * 100) : null;
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🏦 Debtors & Receivables</h2>
          <p className={styles.pageMeta}>Outstanding balances{latestPeriod ? ` · as of ${latestPeriod}` : ''}</p>
        </div>
      </div>
 
      {/* NOTE: passing `latestPeriod` here as a best guess — I don't have
          ReconciliationAlert's actual prop signature, it previously
          received a `month` string from a filter UI this page no longer
          has. Verify this still matches what the component expects. */}
      <ReconciliationAlert month={latestPeriod} />
 
      {/* ── KPIs — bespoke: needs a specific row (Largest) and a
          cross-connection number (Ratio) that no generic viz supports ──── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Outstanding" value={fmt(total)} delta="Target < ₦25M" deltaType={total < 25_000_000 ? 'up' : 'down'} badge={total < 25_000_000 ? '✓ OK' : '⚠ Action'} badgeType={total < 25_000_000 ? 'good' : 'bad'} color={total < 25_000_000 ? 'green' : 'red'} />
        <KPICard
          label="Debtor / Revenue Ratio"
          value={ratio !== null ? `${ratio.toFixed(1)}%` : '—'}
          delta={ratio !== null ? 'Target < 20%' : 'revenue_monthly not connected'}
          deltaType={ratio !== null && ratio > 20 ? 'down' : 'up'}
          badge={ratio !== null ? (ratio > 20 ? '⚠ Above Limit' : '✓ OK') : undefined}
          badgeType={ratio !== null ? (ratio > 20 ? 'bad' : 'good') : undefined}
          color={ratio !== null ? (ratio > 20 ? 'red' : 'green') : 'blue'}
        />
        <KPICard label="Debtor Categories" value={categoriesTracked} delta="Active accounts" deltaType="up" color="blue" />
        <KPICard label="Largest Debtor" value={largest?.category || '—'} delta={largest ? fmt(n(largest.amount)) : ''} deltaType="down" color="red" />
      </div>
 
      {/* ── Chart — config-driven via PageRenderer (viz-debt-002). If your
          sheet ends up with the same category across multiple report
          dates, this automatically becomes a trend chart with a period
          selector — no extra config needed, that's DynamicViz's built-in
          time-series detection. ──── */}
      <div style={{ marginBottom: 14 }}>
        <PageRenderer page="debtors" module="debtors" only={['bar']} />
      </div>
      
      <PageRenderer page="debtors" module="debtors" only={['pie']} />
 
      {/* ── Ledger — config-driven via PageRenderer (viz-debt-003) ──── */}
      <PageRenderer page="debtors" module="debtors" only={['table']} />
    </div>
  );
}