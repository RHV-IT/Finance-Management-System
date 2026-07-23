'use client';

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { DynamicVizList } from '../../components/DynamicViz';
import { useConfig, useSheetData } from '../lib/useConfig';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';

const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
const fmt = v => `₦${Number(v).toLocaleString()}`;

const TABS = [
  { key: 'overview',  label: '📊 Overview'         },
  { key: 'assets',    label: '💻 IT Assets'        },
  { key: 'tickets',   label: '🎫 Helpdesk Tickets' },
  { key: 'licenses',  label: '📄 Software Licenses'},
  { key: 'maintenance', label: '🔧 Maintenance'    },
];

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', cursor: 'pointer', fontSize: 11,
      fontWeight: 600, whiteSpace: 'nowrap', background: 'transparent',
      border: 'none', fontFamily: 'inherit',
      borderBottom: `2px solid ${active ? 'var(--teal)' : 'transparent'}`,
      color: active ? 'var(--teal)' : 'var(--muted)', marginBottom: -2,
    }}>{children}</button>
  );
}

function SheetError({ error, onRefetch }) {
  const notConnected = error?.includes('not connected') || error?.includes('Sheet ID');
  return (
    <div style={{ background: notConnected ? '#FFF9E6' : '#FEECEC', border: `1.5px solid ${notConnected ? '#F4D03F' : '#F1948A'}`, borderRadius: 10, padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{notConnected ? '🔗' : '⚠️'}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
        {notConnected ? 'Sheet not connected yet' : 'Failed to load data'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>{error}</div>
      {notConnected
        ? <a href="/settings" style={{ padding: '8px 18px', background: 'var(--navy)', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>⚙ Go to Settings</a>
        : onRefetch && <button onClick={onRefetch} style={{ padding: '8px 18px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}>↻ Retry</button>
      }
    </div>
  );
}

function Loading() {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: i === 0 ? '#f5f7f9' : '#fff' }}>
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} style={{ flex: 1, height: 12, borderRadius: 4, background: i === 0 ? '#dde1e7' : '#f0f2f5', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

// Priority badge colour
function priorityColor(priority, ts) {
  const p = (priority || '').toLowerCase();
  if (p.includes('critical') || p.includes('high')) return ts.red;
  if (p.includes('medium'))                          return ts.amber;
  return ts.green;
}

export default function ITPage() {
  const [tab, setTab] = useState('overview');

  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();

  const assetsConn      = getByModule('it_assets');
  const ticketsConn     = getByModule('it_tickets');
  const licensesConn    = getByModule('it_licenses');
  const maintenanceConn = getByModule('it_maintenance');

  const assets      = useSheetData(assetsConn);
  const tickets     = useSheetData(ticketsConn);
  const licenses    = useSheetData(licensesConn);
  const maintenance = useSheetData(maintenanceConn);

  const anyLoading   = configLoading || [assets, tickets, licenses, maintenance].some(s => s.loading);
  const anyConnected = [assets, tickets, licenses, maintenance].some(s => s.rows.length > 0);

  // ── KPI derivations ──────────────────────────────────────
  const totalAssets     = assets.rows.length;
  const activeAssets    = assets.rows.filter(r => (r.status || '').toLowerCase() === 'active').length;
  const underRepair     = assets.rows.filter(r => (r.status || '').toLowerCase().includes('repair')).length;
  const totalAssetValue = assets.rows.reduce((s, r) => s + n(r.cost || r.value || r.purchaseCost), 0);
  const openTickets     = tickets.rows.filter(r => (r.status || '').toLowerCase().includes('open')).length;
  const criticalTickets = tickets.rows.filter(r => {
    const p = (r.priority || '').toLowerCase();
    return p.includes('critical') || p.includes('high');
  }).length;
  const expiringLicenses = licenses.rows.filter(r => {
    if (!r.expiryDate && !r.expiry) return false;
    const exp  = new Date(r.expiryDate || r.expiry);
    const days = (exp - new Date()) / 864e5;
    return days > 0 && days < 90;
  }).length;

  if (configLoading) return (
    <DashboardLayout>
      <div style={{ textAlign: 'center', padding: 64, color: 'var(--muted)' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Loading IT configuration…</div>
      </div>
    </DashboardLayout>
  );

  if (configError) return (
    <DashboardLayout>
      <div style={{ padding: 24 }}>
        <SheetError error={`Config error: ${configError}`} onRefetch={reload} />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>💻 IT Department</h2>
          <p className={styles.pageMeta}>Assets · Helpdesk · Licenses · Maintenance</p>
        </div>
        <button
          onClick={() => { assets.refetch(); tickets.refetch(); licenses.refetch(); maintenance.refetch(); }}
          disabled={anyLoading}
          style={{ padding: '7px 16px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: anyLoading ? 'wait' : 'pointer' }}
        >{anyLoading ? '⏳ Loading…' : '↻ Refresh All'}</button>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 16,
        background: anyConnected ? '#E8F8F5' : '#FFF9E6',
        border: `1px solid ${anyConnected ? '#A9DFBF' : '#F4D03F'}`, borderRadius: 8,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: anyConnected ? '#117A65' : '#CA6F1E' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: anyConnected ? '#117A65' : '#CA6F1E' }}>
          {anyLoading ? 'Loading…' : anyConnected ? '✓ Live from Google Sheets' : 'Sheets not connected — go to Settings'}
        </span>
        {!anyConnected && <a href="/settings" style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: 'var(--navy)', textDecoration: 'none' }}>⚙ Settings →</a>}
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total IT Assets"     value={totalAssets}     delta="All equipment"          deltaType="up"   color="blue"   />
        <KPICard label="Active Assets"        value={activeAssets}    delta="In use"                 deltaType="up"   color="green"  />
        <KPICard label="Total Asset Value"    value={fmt(totalAssetValue)} delta="Purchase cost"     deltaType="up"   color="purple" />
        <KPICard label="Under Repair"         value={underRepair}
          deltaType={underRepair > 0 ? 'warn' : 'up'}
          badge={underRepair > 0 ? '⚠ Action' : '✓ OK'}
          badgeType={underRepair > 0 ? 'warn' : 'good'}
          color={underRepair > 0 ? 'amber' : 'green'} />
        <KPICard label="Open Tickets"         value={openTickets}
          deltaType={openTickets > 0 ? 'warn' : 'up'}
          badge={criticalTickets > 0 ? `${criticalTickets} critical` : '✓ OK'}
          badgeType={criticalTickets > 0 ? 'bad' : 'good'}
          color={criticalTickets > 0 ? 'red' : openTickets > 0 ? 'amber' : 'green'} />
        <KPICard label="Expiring Licenses"    value={expiringLicenses}
          delta="Within 90 days"
          deltaType={expiringLicenses > 0 ? 'warn' : 'up'}
          color={expiringLicenses > 0 ? 'amber' : 'green'} />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16, overflowX: 'auto' }}>
        {TABS.map(t => <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</TabBtn>)}
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Asset status breakdown */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Asset Status Breakdown</div>
            {assets.loading ? <Loading /> : assets.error ? <SheetError error={assets.error} onRefetch={assets.refetch} /> : (
              <div>
                {Object.entries(
                  assets.rows.reduce((acc, r) => { const s = r.status || 'Unknown'; acc[s] = (acc[s] || 0) + 1; return acc; }, {})
                ).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                  const pct = totalAssets > 0 ? (count / totalAssets * 100).toFixed(0) : 0;
                  return (
                    <div key={status} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ fontWeight: 600 }}>{status}</span>
                        <span style={{ color: 'var(--muted)' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: '#e8ecf0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: 'var(--teal)', width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {assets.rows.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 11 }}>No asset data</div>}
              </div>
            )}
          </div>

          {/* Ticket status */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Ticket Status</div>
            {tickets.loading ? <Loading /> : tickets.error ? <SheetError error={tickets.error} onRefetch={tickets.refetch} /> : (
              <div>
                {Object.entries(
                  tickets.rows.reduce((acc, r) => { const s = r.status || 'Unknown'; acc[s] = (acc[s] || 0) + 1; return acc; }, {})
                ).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                  const color = status.toLowerCase().includes('open') ? '#117A65' : status.toLowerCase().includes('close') ? '#7F8C9A' : '#CA6F1E';
                  return (
                    <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                      <span style={{ fontWeight: 600, color }}>{status}</span>
                      <span style={{ color: 'var(--muted)' }}>{count} tickets</span>
                    </div>
                  );
                })}
                {tickets.rows.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 11 }}>No ticket data</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ IT ASSETS ═════════════════════════════════════════ */}
      {tab === 'assets' && (
        assets.error ? <SheetError error={assets.error} onRefetch={assets.refetch} />
        : assets.loading ? <Loading />
        : assetsConn?.visualizations?.length > 0
          ? <DynamicVizList connection={assetsConn} rows={assets.rows} />
          : (
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>IT Asset Register — {totalAssets} items</div>
              <div style={{ overflowX: 'auto' }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr><th>Asset ID</th><th>Item Name</th><th>Category</th><th>Assigned To</th><th>Department</th><th>Purchase Date</th><th>Cost</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {assets.rows.map((r, i) => {
                      const statusColor = (r.status || '').toLowerCase() === 'active' ? tableStyles.green
                        : (r.status || '').toLowerCase().includes('repair') ? tableStyles.amber : tableStyles.red;
                      return (
                        <tr key={i}>
                          <td style={{ fontSize: 10, color: 'var(--muted)' }}>{r.assetId || r.id || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{r.name || r.itemName || r.asset || '—'}</td>
                          <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.category || r.type || '—'}</span></td>
                          <td>{r.assignedTo || r.user || '—'}</td>
                          <td style={{ fontSize: 10, color: 'var(--muted)' }}>{r.dept || r.department || '—'}</td>
                          <td style={{ fontSize: 10 }}>{r.purchaseDate || r.date || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{fmt(n(r.cost || r.purchaseCost || r.value))}</td>
                          <td><span className={`${tableStyles.badge} ${statusColor}`}>{r.status || '—'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={6} style={{ fontWeight: 700 }}>TOTAL ASSET VALUE</td><td style={{ fontWeight: 700 }}>{fmt(totalAssetValue)}</td><td></td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )
      )}

      {/* ══ HELPDESK TICKETS ══════════════════════════════════ */}
      {tab === 'tickets' && (
        tickets.error ? <SheetError error={tickets.error} onRefetch={tickets.refetch} />
        : tickets.loading ? <Loading />
        : ticketsConn?.visualizations?.length > 0
          ? <DynamicVizList connection={ticketsConn} rows={tickets.rows} />
          : (
            <>
              {criticalTickets > 0 && (
                <div style={{ background: '#FEECEC', border: '1px solid #F1948A', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 11, color: 'var(--red)' }}>
                  ⚠ <strong>{criticalTickets} critical/high priority ticket{criticalTickets !== 1 ? 's' : ''}</strong> require immediate attention.
                </div>
              )}
              <div className={tableStyles.tableBox}>
                <div className={tableStyles.tableTitle}>Helpdesk Tickets — {openTickets} open</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className={tableStyles.table}>
                    <thead>
                      <tr><th>Ticket ID</th><th>Issue</th><th>Raised By</th><th>Department</th><th>Priority</th><th>Assigned To</th><th>Date Raised</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {tickets.rows.map((r, i) => {
                        const statusColor = (r.status || '').toLowerCase().includes('open') ? tableStyles.green
                          : (r.status || '').toLowerCase().includes('progress') ? tableStyles.amber : tableStyles.red;
                        return (
                          <tr key={i}>
                            <td style={{ fontSize: 10, color: 'var(--muted)' }}>{r.ticketId || r.id || `#${i + 1}`}</td>
                            <td style={{ fontWeight: 600 }}>{r.issue || r.title || r.description || '—'}</td>
                            <td>{r.raisedBy || r.requestedBy || r.user || '—'}</td>
                            <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.dept || r.department || '—'}</span></td>
                            <td><span className={`${tableStyles.badge} ${priorityColor(r.priority, tableStyles)}`}>{r.priority || '—'}</span></td>
                            <td style={{ fontSize: 10 }}>{r.assignedTo || r.technician || '—'}</td>
                            <td style={{ fontSize: 10, color: 'var(--muted)' }}>{r.dateRaised || r.date || '—'}</td>
                            <td><span className={`${tableStyles.badge} ${statusColor}`}>{r.status || '—'}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
      )}

      {/* ══ SOFTWARE LICENSES ═════════════════════════════════ */}
      {tab === 'licenses' && (
        licenses.error ? <SheetError error={licenses.error} onRefetch={licenses.refetch} />
        : licenses.loading ? <Loading />
        : licensesConn?.visualizations?.length > 0
          ? <DynamicVizList connection={licensesConn} rows={licenses.rows} />
          : (
            <>
              {expiringLicenses > 0 && (
                <div style={{ background: '#FEF9E7', border: '1px solid #F9E79F', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 11, color: '#9A7D0A' }}>
                  ⚠ <strong>{expiringLicenses} license{expiringLicenses !== 1 ? 's' : ''}</strong> expire within 90 days. Renew before expiry to avoid disruption.
                </div>
              )}
              <div className={tableStyles.tableBox}>
                <div className={tableStyles.tableTitle}>Software Licenses — {licenses.rows.length} total</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className={tableStyles.table}>
                    <thead>
                      <tr><th>Software</th><th>Vendor</th><th>License Type</th><th>Seats</th><th>Cost</th><th>Purchase Date</th><th>Expiry Date</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {licenses.rows.map((r, i) => {
                        const expDate = new Date(r.expiryDate || r.expiry);
                        const daysLeft = !isNaN(expDate) ? Math.floor((expDate - new Date()) / 864e5) : null;
                        const expiryColor = daysLeft !== null && daysLeft < 30 ? tableStyles.red
                          : daysLeft !== null && daysLeft < 90 ? tableStyles.amber : tableStyles.green;
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{r.software || r.name || '—'}</td>
                            <td>{r.vendor || '—'}</td>
                            <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.licenseType || r.type || '—'}</span></td>
                            <td style={{ fontWeight: 600 }}>{r.seats || r.users || '—'}</td>
                            <td>{fmt(n(r.cost || r.price || r.amount))}</td>
                            <td style={{ fontSize: 10, color: 'var(--muted)' }}>{r.purchaseDate || r.startDate || '—'}</td>
                            <td>
                              {(r.expiryDate || r.expiry)
                                ? <span className={`${tableStyles.badge} ${expiryColor}`}>
                                    {r.expiryDate || r.expiry}
                                    {daysLeft !== null && daysLeft < 90 && ` (${daysLeft}d left)`}
                                  </span>
                                : '—'}
                            </td>
                            <td><span className={`${tableStyles.badge} ${daysLeft !== null && daysLeft < 0 ? tableStyles.red : tableStyles.green}`}>
                              {daysLeft !== null && daysLeft < 0 ? 'Expired' : 'Active'}
                            </span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
      )}

      {/* ══ MAINTENANCE ═══════════════════════════════════════ */}
      {tab === 'maintenance' && (
        maintenance.error ? <SheetError error={maintenance.error} onRefetch={maintenance.refetch} />
        : maintenance.loading ? <Loading />
        : maintenanceConn?.visualizations?.length > 0
          ? <DynamicVizList connection={maintenanceConn} rows={maintenance.rows} />
          : (
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Maintenance Log — {maintenance.rows.length} records</div>
              <div style={{ overflowX: 'auto' }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr><th>Date</th><th>Asset / System</th><th>Issue</th><th>Technician</th><th>Cost</th><th>Duration</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {maintenance.rows.map((r, i) => {
                      const statusColor = (r.status || '').toLowerCase() === 'completed' ? tableStyles.green
                        : (r.status || '').toLowerCase().includes('progress') ? tableStyles.amber : tableStyles.red;
                      return (
                        <tr key={i}>
                          <td>{r.date || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{r.asset || r.system || r.equipment || '—'}</td>
                          <td>{r.issue || r.description || r.problem || '—'}</td>
                          <td>{r.technician || r.assignedTo || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{fmt(n(r.cost || r.amount))}</td>
                          <td style={{ fontSize: 10, color: 'var(--muted)' }}>{r.duration || r.hours || '—'}</td>
                          <td><span className={`${tableStyles.badge} ${statusColor}`}>{r.status || '—'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}
    </DashboardLayout>
  );
}