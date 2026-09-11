'use client';
 
/**
 * app/overview/page.jsx
 *
 * Executive Dashboard — the first page users see.
 * Pulls from ALL connected modules so key metrics are visible without navigating.
 * Also fetches from an external incident tracker API if configured.
 *
 * INCIDENT TRACKER:
 *   Add NEXT_PUBLIC_INCIDENT_API_URL=https://your-api.com to .env.local
 *   Expected response from GET /incidents/summary:
 *   {
 *     total: 42,
 *     open: 5,
 *     resolved: 37,
 *     critical: 2,
 *     avgResolutionTime: "4.2 hrs",
 *     thisMonth: 8,
 *     lastMonth: 11,
 *     recentIncidents: [{ id, title, priority, status, reportedAt, resolvedAt }]
 *   }
 */
 
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { DynamicVizList } from '../../components/DynamicViz';
import {
  RevenueVsTargetChart, RevenueVsExpensesChart,
  SurplusChart, RevenuePieChart,
} from '../../components/Charts';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import { COLORS, fmt, fmtM, MONTHLY_TARGET } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const INCIDENT_API = process.env.NEXT_PUBLIC_INCIDENT_API_URL || null;
const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
 
// ─── UI helpers ───────────────────────────────────────────────
 
function SectionTitle({ emoji, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '24px 0 12px',
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>
        {emoji} {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}
 
function MiniError({ label }) {
  return (
    <div style={{
      background: '#FFF9E6', border: '1px solid #F4D03F',
      borderRadius: 8, padding: '10px 16px',
      fontSize: 11, color: '#9A7D0A',
    }}>
      🔗 <strong>{label}</strong> sheet not connected —{' '}
      <a href="/dashboard/settings" style={{ color: 'var(--teal)', fontWeight: 600 }}>connect in Settings</a>
    </div>
  );
}
 
function MiniLoading({ cols = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} style={{ height: 80, background: '#f0f2f5', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
 
export default function OverviewPage() {
 
  // ── Config ────────────────────────────────────────────────
  const { getByModule, loading: configLoading, error: configError } = useConfig();
 
  // ── All module connections ────────────────────────────────
  const revConn     = getByModule('revenue_monthly');
  const debtorConn  = getByModule('debtors');
  const payConn     = getByModule('payables');
  const stockConn   = getByModule('stock_register');
  const sivConn     = getByModule('stock_out');
  const srvConn     = getByModule('srv_receipts');
  const reorderConn = getByModule('reorder_alerts');
  const poConn      = getByModule('purchase_orders');
  const pharmConn   = getByModule('drug_dispensing');
 
  // ── Fetch all sheets ──────────────────────────────────────
  const rev     = useSheetData(revConn);
  const debtor  = useSheetData(debtorConn);
  const pay     = useSheetData(payConn);
  const stock   = useSheetData(stockConn);
  const siv     = useSheetData(sivConn);
  const srv     = useSheetData(srvConn);
  const reorder = useSheetData(reorderConn);
  const po      = useSheetData(poConn);
  const pharm   = useSheetData(pharmConn);
 
  // ── Incident tracker ──────────────────────────────────────
  const [incidents,        setIncidents]        = useState(null);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentsError,   setIncidentsError]   = useState(null);
 
  useEffect(() => {
    if (!INCIDENT_API) return;
    setIncidentsLoading(true);
    fetch(`${INCIDENT_API}/incidents/summary`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { setIncidents(data); setIncidentsLoading(false); })
      .catch(err => { setIncidentsError(err.message); setIncidentsLoading(false); });
  }, []);
 
  // ── Finance derivations ───────────────────────────────────
  const tRev = rev.rows.reduce((s, r) => s + n(r.revenue),  0);
  const tExp = rev.rows.reduce((s, r) => s + n(r.expenses), 0);
  const tSur = tRev - tExp;
  const expR = tRev > 0 ? tExp / tRev : 0;
  const ach  = MONTHLY_TARGET > 0 && rev.rows.length > 0
    ? tRev / (MONTHLY_TARGET * rev.rows.length)
    : 0;
 
  const tDeb    = debtor.rows.reduce((s, r) => s + n(r.amount), 0);
  const debR    = tRev > 0 ? tDeb / (tRev / Math.max(rev.rows.length, 1)) : 0;
  const tPay    = pay.rows.reduce((s, r) => s + n(r.amount), 0);
  const overdue = pay.rows.filter(r => (r.status || '').toLowerCase() === 'overdue').length;
 
  // ── Inventory derivations ─────────────────────────────────
  const totalStockValue = stock.rows.reduce((s, r) => s + n(r.totalValue), 0);
  const belowReorder    = stock.rows.filter(r => n(r.qty) <= n(r.reorder) && n(r.reorder) > 0).length;
  const totalReceived   = srv.rows.reduce((s, r) => s + n(r.total), 0);
  const totalIssued     = siv.rows.reduce((s, r) => s + n(r.total), 0);
  const reorderAlerts   = reorder.rows.length;
  const estReorderVal   = reorder.rows.reduce((s, r) => s + n(r.estReorderValue), 0);
 
  // ── Procurement derivations ───────────────────────────────
  const openPOs    = po.rows.filter(r => ['open','approved','sent'].some(s => (r.status||'').toLowerCase().includes(s))).length;
  const totalPOVal = po.rows.reduce((s, r) => s + n(r.total), 0);
 
  // ── Pharmacy derivations ──────────────────────────────────
  const totalDispensed = pharm.rows.reduce((s, r) => s + n(r.value), 0);
 
  // ── Chart data ────────────────────────────────────────────
  const monthlyChartData = rev.rows.map(r => ({
    month:    (r.month || r._period || '').slice(0, 7),
    revenue:  fmtM(n(r.revenue)),
    expenses: fmtM(n(r.expenses)),
    target:   fmtM(n(r.target) || MONTHLY_TARGET),
    surplus:  fmtM(n(r.revenue) - n(r.expenses)),
  }));
 
  const revMix = Object.entries(
    rev.rows.reduce((acc, r) => {
      const k = r._period || r.month || 'Other';
      acc[k] = (acc[k] || 0) + n(r.revenue);
      return acc;
    }, {})
  ).slice(0, 6).map(([name, val]) => ({ name, value: fmtM(val) }));
 
  // ── Config loading ────────────────────────────────────────
  if (configLoading) return (
    <div>
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--muted)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Loading dashboard…</div>
        <div style={{ fontSize: 11, marginTop: 6 }}>Fetching configuration from Google Drive</div>
      </div>
    </div>
  );
 
  const anyData = [rev, debtor, stock, siv, srv, reorder, po, pharm, pay].some(s => s.rows.length > 0);
 
  return (
    <div>
 
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🏥 RHV Executive Dashboard</h2>
          <p className={styles.pageMeta}>
            Live · {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {configError && (
          <div style={{ fontSize: 10, color: 'var(--red)', background: '#FEECEC', padding: '6px 12px', borderRadius: 6 }}>
            ✗ Config error: {configError}
          </div>
        )}
      </div>
 
      {/* Not connected notice */}
      {!anyData && !rev.loading && !stock.loading && (
        <div style={{ background: '#EBF5FB', border: '1px solid #AED6F1', borderRadius: 12, padding: '28px', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>No sheets connected yet</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
            Share your department sheets with <strong>rhv-hospital-dashboard@trekking-493220.iam.gserviceaccount.com</strong> then add connections in Settings.
          </div>
          <a href="/dashboard/settings" style={{ padding: '9px 22px', background: 'var(--teal)', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            ⚙ Go to Settings
          </a>
        </div>
      )}
 
      {/* ═══════════════════════════════════════════════════════
          FINANCE
      ═══════════════════════════════════════════════════════ */}
      <SectionTitle emoji="💰">Finance</SectionTitle>
 
      {rev.error ? <MiniError label="Revenue & Expenses" /> : rev.loading ? <MiniLoading cols={4} /> : (
        <>
          <div className={styles.kpiGrid}>
            <KPICard
              label="Total Revenue YTD"
              value={fmt(tRev)}
              delta={`${(ach * 100).toFixed(0)}% of annual target`}
              deltaType={ach >= 1 ? 'up' : 'warn'}
              badge={ach >= 1 ? '✓ On Track' : 'Monitor'}
              badgeType={ach >= 1 ? 'good' : 'warn'}
              color="green"
            />
            <KPICard
              label="Net Surplus / (Deficit)"
              value={fmt(tSur)}
              delta="After all expenses"
              deltaType={tSur > 0 ? 'up' : 'down'}
              badge={tSur > 0 ? 'Surplus' : 'Deficit'}
              badgeType={tSur > 0 ? 'good' : 'bad'}
              color={tSur > 0 ? 'green' : 'red'}
            />
            <KPICard
              label="Total Expenditure YTD"
              value={fmt(tExp)}
              delta="All expenses"
              deltaType="warn"
              color="amber"
            />
            <KPICard
              label="Expense Ratio"
              value={`${(expR * 100).toFixed(1)}%`}
              delta="Target < 60%"
              deltaType={expR < 0.6 ? 'up' : 'down'}
              color={expR < 0.6 ? 'green' : 'red'}
            />
          </div>
 
          {/* Debtors + Payables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            {!debtor.error && !debtor.loading && (
              <>
                <KPICard
                  label="Outstanding Receivables"
                  value={fmt(tDeb)}
                  delta="Target < ₦25M"
                  deltaType={tDeb > 25e6 ? 'down' : 'up'}
                  badge={tDeb > 25e6 ? '⚠ Action' : '✓ OK'}
                  badgeType={tDeb > 25e6 ? 'bad' : 'good'}
                  color={tDeb > 25e6 ? 'red' : 'green'}
                />
                <KPICard
                  label="Debtor / Revenue Ratio"
                  value={`${(debR * 100).toFixed(1)}%`}
                  delta="Target < 20%"
                  deltaType={debR > 0.2 ? 'down' : 'up'}
                  color={debR > 0.2 ? 'red' : 'green'}
                />
              </>
            )}
            {!pay.error && !pay.loading && (
              <>
                <KPICard
                  label="Accounts Payable"
                  value={fmt(tPay)}
                  delta={overdue > 0 ? `${overdue} overdue` : 'All current'}
                  deltaType={overdue > 0 ? 'down' : 'up'}
                  color={overdue > 0 ? 'red' : 'green'}
                />
                <KPICard
                  label="Overdue Payables"
                  value={overdue}
                  delta="Need payment"
                  deltaType={overdue > 0 ? 'down' : 'up'}
                  badge={overdue > 0 ? '⚠ Overdue' : '✓ Clear'}
                  badgeType={overdue > 0 ? 'bad' : 'good'}
                  color={overdue > 0 ? 'red' : 'green'}
                />
              </>
            )}
          </div>
 
          {/* Revenue charts */}
          {monthlyChartData.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Monthly Revenue vs Target</div>
                  <RevenueVsTargetChart data={monthlyChartData} />
                </div>
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Revenue vs Expenditure</div>
                  <RevenueVsExpensesChart data={monthlyChartData} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 14 }}>
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Monthly Surplus / (Deficit)</div>
                  <SurplusChart data={monthlyChartData} />
                </div>
                {revMix.length > 0 && (
                  <div className={styles.card}>
                    <div className={styles.cardTitle}>Revenue by Period</div>
                    <RevenuePieChart data={revMix} colors={COLORS} />
                  </div>
                )}
              </div>
            </>
          )}
 
          {/* Any additional vizs configured on the revenue connection */}
          {revConn?.visualizations?.filter(v => v.type === 'bar' || v.type === 'grouped_bar' || v.type === 'line').length > 0 && (
            <div style={{ marginTop: 14 }}>
              <DynamicVizList connection={revConn} rows={rev.rows} only={['bar','grouped_bar','line']} />
            </div>
          )}
        </>
      )}
 
      {/* ═══════════════════════════════════════════════════════
          INVENTORY & STORE
      ═══════════════════════════════════════════════════════ */}
      <SectionTitle emoji="📦">Inventory & Store</SectionTitle>
 
      {stock.error && srv.error && siv.error ? <MiniError label="Inventory" /> : stock.loading ? <MiniLoading cols={4} /> : (
        <>
          <div className={styles.kpiGrid}>
            <KPICard
              label="Total Stock Value"
              value={fmt(totalStockValue)}
              delta={`${stock.rows.length} SKUs`}
              deltaType="up"
              color="blue"
            />
            <KPICard
              label="Total Received (SRV)"
              value={fmt(totalReceived)}
              delta={`${srv.rows.length} receipts`}
              deltaType="up"
              color="green"
            />
            <KPICard
              label="Total Issued (SIV)"
              value={fmt(totalIssued)}
              delta={`${siv.rows.length} issues`}
              deltaType="warn"
              color="amber"
            />
            <KPICard
              label="Items to Reorder"
              value={reorderAlerts || belowReorder}
              delta={`Est. ${fmt(estReorderVal)}`}
              deltaType={(reorderAlerts || belowReorder) > 0 ? 'down' : 'up'}
              badge={(reorderAlerts || belowReorder) > 0 ? '⚠ Action' : '✓ OK'}
              badgeType={(reorderAlerts || belowReorder) > 0 ? 'bad' : 'good'}
              color={(reorderAlerts || belowReorder) > 0 ? 'red' : 'green'}
            />
          </div>
          {stockConn?.visualizations?.filter(v => v.type !== 'table').length > 0 && (
            <div style={{ marginTop: 14 }}>
              <DynamicVizList connection={stockConn} rows={stock.rows} only={['bar','grouped_bar','pie']} />
            </div>
          )}
        </>
      )}
 
      {/* ═══════════════════════════════════════════════════════
          PROCUREMENT
      ═══════════════════════════════════════════════════════ */}
      <SectionTitle emoji="🛒">Procurement</SectionTitle>
 
      {po.error ? <MiniError label="Purchase Orders" /> : po.loading ? <MiniLoading cols={2} /> : (
        <div className={styles.kpiGrid}>
          <KPICard
            label="Open Purchase Orders"
            value={openPOs}
            delta={`${po.rows.length} total POs`}
            deltaType={openPOs > 0 ? 'warn' : 'up'}
            color={openPOs > 0 ? 'amber' : 'green'}
          />
          <KPICard
            label="Total PO Value"
            value={fmt(totalPOVal)}
            delta="All purchase orders"
            deltaType="up"
            color="blue"
          />
        </div>
      )}
 
      {/* ═══════════════════════════════════════════════════════
          PHARMACY
      ═══════════════════════════════════════════════════════ */}
      <SectionTitle emoji="💊">Pharmacy</SectionTitle>
 
      {pharm.error ? <MiniError label="Drug Dispensing" /> : pharm.loading ? <MiniLoading cols={2} /> : (
        <div className={styles.kpiGrid}>
          <KPICard
            label="Dispensing Value"
            value={fmt(totalDispensed)}
            delta={`${pharm.rows.length} prescriptions`}
            deltaType="up"
            color="purple"
          />
          <KPICard
            label="Total Prescriptions"
            value={pharm.rows.length}
            delta="Records fetched"
            deltaType="up"
            color="blue"
          />
        </div>
      )}
 
      {/* ═══════════════════════════════════════════════════════
          INCIDENT TRACKER
          Only renders when NEXT_PUBLIC_INCIDENT_API_URL is set
      ═══════════════════════════════════════════════════════ */}
      {INCIDENT_API && (
        <>
          <SectionTitle emoji="🚨">Incident Tracker</SectionTitle>
 
          {incidentsLoading && <MiniLoading cols={4} />}
 
          {incidentsError && (
            <div style={{ background: '#FEECEC', border: '1px solid #F1948A', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--red)' }}>
              ✗ Incident tracker unavailable: {incidentsError}
            </div>
          )}
 
          {incidents && !incidentsLoading && (
            <>
              <div className={styles.kpiGrid}>
                <KPICard
                  label="Total Incidents"
                  value={incidents.total ?? incidents.totalIncidents ?? '—'}
                  delta="All time"
                  deltaType="up"
                  color="navy"
                />
                <KPICard
                  label="Open Incidents"
                  value={incidents.open ?? incidents.openIncidents ?? '—'}
                  delta="Unresolved"
                  deltaType={(incidents.open ?? 0) > 0 ? 'warn' : 'up'}
                  badge={(incidents.open ?? 0) > 0 ? '⚠ Open' : '✓ Clear'}
                  badgeType={(incidents.open ?? 0) > 0 ? 'warn' : 'good'}
                  color={(incidents.open ?? 0) > 0 ? 'amber' : 'green'}
                />
                <KPICard
                  label="Resolved"
                  value={incidents.resolved ?? incidents.resolvedIncidents ?? '—'}
                  delta="Closed successfully"
                  deltaType="up"
                  color="green"
                />
                <KPICard
                  label="Critical / High Priority"
                  value={incidents.critical ?? incidents.highPriority ?? '—'}
                  delta="Needs immediate action"
                  deltaType={(incidents.critical ?? 0) > 0 ? 'down' : 'up'}
                  badge={(incidents.critical ?? 0) > 0 ? '⚠ Critical' : '✓ Clear'}
                  badgeType={(incidents.critical ?? 0) > 0 ? 'bad' : 'good'}
                  color={(incidents.critical ?? 0) > 0 ? 'red' : 'green'}
                />
                {incidents.avgResolutionTime && (
                  <KPICard
                    label="Avg Resolution Time"
                    value={incidents.avgResolutionTime}
                    delta="Time to close"
                    deltaType="up"
                    color="blue"
                  />
                )}
                {incidents.thisMonth !== undefined && (
                  <KPICard
                    label="Incidents This Month"
                    value={incidents.thisMonth}
                    delta={incidents.lastMonth !== undefined ? `vs ${incidents.lastMonth} last month` : ''}
                    deltaType={incidents.thisMonth > (incidents.lastMonth ?? 0) ? 'warn' : 'up'}
                    color="purple"
                  />
                )}
              </div>
 
              {/* Recent incidents table */}
              {incidents.recentIncidents?.length > 0 && (
                <div className={tableStyles.tableBox} style={{ marginTop: 14 }}>
                  <div className={tableStyles.tableTitle}>Recent Incidents</div>
                  <table className={tableStyles.table}>
                    <thead>
                      <tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Reported</th><th>Resolved</th></tr>
                    </thead>
                    <tbody>
                      {incidents.recentIncidents.slice(0, 10).map((inc, i) => {
                        const p = (inc.priority || '').toLowerCase();
                        const priorityColor = p.includes('critical') ? tableStyles.red : p.includes('high') ? tableStyles.amber : tableStyles.green;
                        const statusColor = (inc.status || '').toLowerCase().includes('open') ? tableStyles.amber : tableStyles.green;
                        return (
                          <tr key={inc.id || i}>
                            <td style={{ fontSize: 10, color: 'var(--muted)' }}>{inc.id || `#${i + 1}`}</td>
                            <td style={{ fontWeight: 600 }}>{inc.title || inc.description || '—'}</td>
                            <td><span className={`${tableStyles.badge} ${priorityColor}`}>{inc.priority || '—'}</span></td>
                            <td><span className={`${tableStyles.badge} ${statusColor}`}>{inc.status || '—'}</span></td>
                            <td style={{ fontSize: 10, color: 'var(--muted)' }}>{inc.reportedAt || inc.createdAt || '—'}</td>
                            <td style={{ fontSize: 10, color: 'var(--muted)' }}>{inc.resolvedAt || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
 
    </div>
  );
}