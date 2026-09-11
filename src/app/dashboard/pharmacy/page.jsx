'use client';
 
import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import PageRenderer from '../../components/PageRenderer';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import { fmt } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
 
const TABS = [
  { key:'overview',  label:'Overview' },
  { key:'disp',  label:'💊 Dispensing / Usage' },
  { key:'stock', label:'📊 Drug Stock'         },
  { key:'req',   label:'📝 My Requests'        },
];
 
function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:'8px 18px', cursor:'pointer', fontSize:11, fontWeight:600, whiteSpace:'nowrap',
      background:'transparent', border:'none', fontFamily:'inherit',
      borderBottom:`2px solid ${active ? 'var(--teal)' : 'transparent'}`,
      color: active ? 'var(--teal)' : 'var(--muted)', marginBottom:-2,
    }}>{children}</button>
  );
}
 
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
 
// Shared guard — each tab is backed by an independent connection, so a
// missing/broken Drug Stock sheet shouldn't block the Dispensing tab and
// vice versa. Returns a rendered guard element, or null if the tab's data
// is actually ready to render.
function tabGuard(conn, moduleName, page, state) {
  if (!conn) {
    return (
      <SheetError
        label={moduleName}
        error={`No connection with module "${moduleName}" is configured yet. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "${page}".`}
      />
    );
  }
  if (state.loading) return <Loading message={`Loading "${conn.label}" from Google Sheets…`} />;
  if (state.error) return <SheetError label={conn.label} error={state.error} onRefetch={state.refetch} />;
  if (!state.rows || state.rows.length === 0) {
    return (
      <SheetError
        label={conn.label}
        error={`The sheet connected fine, but the "${conn.tabName}" tab returned 0 rows. Check that data starts at header row ${conn.headerRow} and that the range "${conn.range}" covers it.`}
        onRefetch={state.refetch}
      />
    );
  }
  return null;
}
 
export default function PharmacyPage() {
  const [tab, setTab] = useState('overview');
 
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
 
  const dispensingConn = getByModule('drug_dispensing');
  const drugStockConn  = getByModule('drug_stock');
  const procReqConn    = getByModule('procurement_requests');
 
  const disp  = useSheetData(dispensingConn);
  const stock = useSheetData(drugStockConn);
  const reqs  = useSheetData(procReqConn);
 
  if (configLoading) return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
 
  if (configError) return (
    <div>
      <SheetError label="Sheet configuration" error={`Could not load the connections manifest: ${configError}`} onRefetch={reload} />
    </div>
  );
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>💊 Pharmacy Management</h2>
          <p className={styles.pageMeta}>Drug dispensing · Stock monitoring · Procurement requests</p>
        </div>
      </div>
 
      <div style={{ display:'flex', borderBottom:'2px solid var(--border)', marginBottom:16, overflowX:'auto' }}>
        {TABS.map(t => <TabBtn key={t.key} active={tab===t.key} onClick={()=>setTab(t.key)}>{t.label}</TabBtn>)}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ marginBottom: 14 }}>
          <PageRenderer page="pharmacy" />
        </div>
      )}

      {/* ══ DISPENSING / USAGE ══════════════════════════════════════ */}
      {tab === 'disp' && (() => {
        const guard = tabGuard(dispensingConn, 'drug_dispensing', 'pharmacy', disp);
        if (guard) return guard;
 
        const rows = disp.rows;
        const dates = [...new Set(rows.map(r => r.date).filter(Boolean))].sort();
        const latestDate = dates[dates.length - 1];
        const dispensedLatest = rows.filter(r => r.date === latestDate).length;
        const usageValue = rows.reduce((s, r) => s + n(r.value), 0);
        const distinctDrugs = new Set(rows.map(r => r.drug).filter(Boolean)).size;
        const distinctPrescribers = new Set(rows.map(r => r.prescriber).filter(Boolean)).size;
 
        return (
          <>
            <div className={styles.kpiGrid} style={{ marginBottom: 14 }}>
              <KPICard label={`Dispensed (${latestDate || 'latest day'})`} value={dispensedLatest} delta="Prescriptions attended" deltaType="up" color="blue" />
              <KPICard label="Usage Value (Total)" value={fmt(usageValue)} delta="All records in sheet" deltaType="up" color="green" />
              <KPICard label="Distinct Drugs Dispensed" value={distinctDrugs} delta="Not the full stock register — see Drug Stock tab" deltaType="neutral" color="purple" />
              <KPICard label="Distinct Prescribers" value={distinctPrescribers} deltaType="neutral" color="amber" />
            </div>
 
            {/* Reads viz-pharm-004 (value trend) + viz-pharm-002 (by patient type) */}
            <div>
              <PageRenderer page="pharmacy" module="drug_dispensing" only={['table']} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <PageRenderer page="pharmacy" module="drug_dispensing" only={['bar']} />
            </div>
 
            {/* Reads viz-pharm-003 */}
            <PageRenderer page="pharmacy" module="drug_dispensing" only={['table']} />
          </>
        );
      })()}
 
      {/* ══ DRUG STOCK ══════════════════════════════════════════════ */}
      {tab === 'stock' && (() => {
        const guard = tabGuard(drugStockConn, 'drug_stock', 'pharmacy', stock);
        if (guard) return guard;
 
        const rows = stock.rows;
        const totalValue = rows.reduce((s, r) => s + n(r.totalValue), 0);
        const skuCount = new Set(rows.map(r => r.item).filter(Boolean)).size;
        const low = rows.filter(r => n(r.qty) <= n(r.reorder) && n(r.reorder) > 0);
        const now = new Date();
        const expiring = rows.filter(r => {
          if (!r.expiry) return false;
          const days = (new Date(r.expiry) - now) / 864e5;
          return days > 0 && days < 90;
        });
 
        return (
          <>
            <div className={styles.kpiGrid} style={{ marginBottom: 14 }}>
              <KPICard label="Total Drug Stock Value" value={fmt(totalValue)} color="green" />
              <KPICard label="Drug SKUs" value={skuCount} delta="In register" deltaType="up" color="purple" />
              <KPICard label="Low Stock Items" value={low.length}
                deltaType={low.length > 0 ? 'down' : 'up'} badge={low.length > 0 ? '⚠ Reorder' : '✓ OK'}
                badgeType={low.length > 0 ? 'bad' : 'good'} color={low.length > 0 ? 'red' : 'green'} />
              <KPICard label="Expiring ≤ 90 Days" value={expiring.length} delta="Needs review"
                deltaType={expiring.length > 0 ? 'warn' : 'up'} color={expiring.length > 0 ? 'amber' : 'green'} />
            </div>
 
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14 }}>
              {/* Reads viz-drugstock-004 */}
              <PageRenderer page="pharmacy" module="drug_stock" only={['table']} />
 
              <div>
                {/* Reads viz-drugstock-003 */}
                <div style={{ marginBottom: 14 }}>
                  <PageRenderer page="pharmacy" module="drug_stock" only={['pie']} />
                </div>
 
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Alerts</div>
                  <div style={{ padding:'8px 0' }}>
                    {low.length > 0 ? low.map(d => (
                      <div key={d.item} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:11 }}>
                        <span style={{ fontWeight:600, color:'var(--red)' }}>⚠ {d.item}</span>
                        <span style={{ color:'var(--red)' }}>{n(d.qty)} left (reorder at {n(d.reorder)})</span>
                      </div>
                    )) : <div style={{ color:'var(--teal)', fontSize:11, padding:'8px 0' }}>✓ All drugs are above reorder levels</div>}
                    {expiring.map(d => (
                      <div key={`${d.item}-exp`} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:11 }}>
                        <span style={{ fontWeight:600, color:'var(--amber)' }}>⏰ {d.item}</span>
                        <span style={{ color:'var(--amber)' }}>Expires {d.expiry}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
 
      {/* ══ MY REQUESTS ═════════════════════════════════════════════ */}
      {tab === 'req' && (() => {
        const guard = tabGuard(procReqConn, 'procurement_requests', 'pharmacy', reqs);
        if (guard) return guard;
 
        const rows = reqs.rows;
        const pending = rows.filter(r => (r.status || '').trim().toUpperCase() === 'PENDING');
        const totalRequested = rows.reduce((s, r) => s + n(r.amount), 0);
 
        return (
          <>
            <div className={styles.kpiGrid} style={{ marginBottom: 14 }}>
              <KPICard label="Pending Requests" value={pending.length} delta="Awaiting approval" deltaType="warn" color="amber" />
              <KPICard label="Total Requested" value={fmt(totalRequested)} color="blue" />
            </div>
 
            <div style={{ background:'#EBF5FB', borderRadius:8, padding:'12px 16px', marginBottom:14, fontSize:11 }}>
              💡 To raise a new procurement request, use <strong>New Requisition</strong> in the sidebar. Approved requests are routed automatically to Procurement via the P2P workflow.
            </div>
 
            {/* Reads viz-procreq-002 */}
            <div style={{ marginBottom: 14 }}>
              <PageRenderer page="pharmacy" module="procurement_requests" only={['pie']} />
            </div>
 
            {/* Reads viz-procreq-003 */}
            <PageRenderer page="pharmacy" module="procurement_requests" only={['table']} />
          </>
        );
      })()}
    </div>
  );
}