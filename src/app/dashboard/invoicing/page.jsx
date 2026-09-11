'use client';
 
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
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
 
export default function InvoicingPage() {
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const invoiceConn = getByModule('invoices');
  const { rows, loading: rowsLoading, error: rowsError, refetch } = useSheetData(invoiceConn);
 
  // ── Guard states ──
 
  if (configLoading) return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
 
  if (configError) return (
    <div>
      <SheetError label="Sheet configuration" error={`Could not load the connections manifest: ${configError}`} onRefetch={reload} />
    </div>
  );
 
  if (!invoiceConn) return (
    <div>
      <SheetError
        label="Invoices"
        error={`No connection with module "invoices" is configured. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "invoicing".`}
      />
    </div>
  );
 
  if (rowsLoading) return <div><Loading message={`Loading "${invoiceConn.label}" from Google Sheets…`} /></div>;
 
  if (rowsError) return (
    <div>
      <SheetError label={invoiceConn.label} error={rowsError} onRefetch={refetch} />
    </div>
  );
 
  if (!rows || rows.length === 0) return (
    <div>
      <SheetError
        label={invoiceConn.label}
        error={`The sheet connected fine, but the "${invoiceConn.tabName}" tab returned 0 rows. Check that data starts at header row ${invoiceConn.headerRow} and that the range "${invoiceConn.range}" covers it.`}
        onRefetch={refetch}
      />
    </div>
  );
 
  // ── Real data from here ──
  // KPIs are bespoke because they need a conditional sum (total WHERE
  // status = X) — no generic viz aggregation does filter-then-sum.
 
  const totalInvoiced = rows.reduce((s, r) => s + n(r.total), 0);
  const paid = rows
    .filter(r => (r.status || '').trim().toLowerCase() === 'paid')
    .reduce((s, r) => s + n(r.total), 0);
  const outstanding = totalInvoiced - paid;
  const overdueRows = rows.filter(r => (r.status || '').trim().toLowerCase() === 'overdue');
  const overdueAmount = overdueRows.reduce((s, r) => s + n(r.total), 0);
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🧾 Invoicing</h2>
          <p className={styles.pageMeta}>Create invoices, send to customers/vendors, track payment status.</p>
        </div>
      </div>
 
      {/* ── KPIs — bespoke, needs conditional sum by status ──── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Invoiced" value={fmt(totalInvoiced)} color="blue" />
        <KPICard label="Paid" value={fmt(paid)} delta={totalInvoiced > 0 ? `${(paid / totalInvoiced * 100).toFixed(0)}% of total` : ''} deltaType="up" color="green" />
        <KPICard label="Outstanding" value={fmt(outstanding)} deltaType="warn" color="amber" />
        <KPICard
          label="Overdue"
          value={fmt(overdueAmount)}
          delta={`${overdueRows.length} invoice${overdueRows.length !== 1 ? 's' : ''}`}
          deltaType={overdueRows.length > 0 ? 'down' : 'up'}
          badge={overdueRows.length > 0 ? '⚠ Follow up' : '✓ None'}
          badgeType={overdueRows.length > 0 ? 'bad' : 'good'}
          color={overdueRows.length > 0 ? 'red' : 'green'}
        />
      </div>
 
      {/* ── Chart — config-driven via PageRenderer (viz-inv-001) ──── */}
      <div style={{ marginBottom: 14 }}>
        <PageRenderer page="invoicing" module="invoices" only={['pie']} />
      </div>
 
      {/* ── Ledger — config-driven via PageRenderer (viz-inv-002) ──── */}
      <PageRenderer page="invoicing" module="invoices" only={['table']} />
    </div>
  );
}