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
 
const STATUS_BADGE = {
  Received:'green', Approved:'blue', Sent:'blue', Draft:'amber', Cancelled:'red',
};
 
const TABS = [
  { key:'po',  label:'📋 Purchase Orders'    },
  { key:'kpi', label:'📈 Supply-Chain KPIs'  },
];
 
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
 
export default function SupplyChainPage() {
  const [tab, setTab] = useState('po');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
 
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const poConn = getByModule('purchase_orders');
  const { rows, loading: rowsLoading, error: rowsError, refetch } = useSheetData(poConn);
 
  // ── Guard states ──
 
  if (configLoading) return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
 
  if (configError) return (
    <div>
      <SheetError label="Sheet configuration" error={`Could not load the connections manifest: ${configError}`} onRefetch={reload} />
    </div>
  );
 
  if (!poConn) return (
    <div>
      <SheetError
        label="Purchase Orders"
        error={`No connection with module "purchase_orders" is configured. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "supplychain".`}
      />
    </div>
  );
 
  if (rowsLoading) return <div><Loading message={`Loading "${poConn.label}" from Google Sheets…`} /></div>;
 
  if (rowsError) return (
    <div>
      <SheetError label={poConn.label} error={rowsError} onRefetch={refetch} />
    </div>
  );
 
  if (!rows || rows.length === 0) return (
    <div>
      <SheetError
        label={poConn.label}
        error={`The sheet connected fine, but the "${poConn.tabName}" tab returned 0 rows. Check that data starts at header row ${poConn.headerRow} and that the range "${poConn.range}" covers it.`}
        onRefetch={refetch}
      />
    </div>
  );
 
  // ── Real data from here ──
 
  const filtered = rows.filter(p =>
    (!search || `${p.poNo}${p.vendor}${p.item}`.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || p.status === statusFilter)
  );
 
  const totPO    = filtered.reduce((s, p) => s + n(p.total), 0);
  const open     = rows.filter(p => ['Draft','Approved','Sent'].includes(p.status));
  const rcvd     = rows.filter(p => p.status === 'Received');
  const fillRate = rows.length ? (rcvd.length / rows.length * 100).toFixed(0) : 0;
  const vendors  = new Set(rows.map(p => p.vendor).filter(Boolean)).size;
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🛒 Supply Chain & Procurement</h2>
          <p className={styles.pageMeta}>Purchase orders · Delivery tracking · Vendor performance</p>
        </div>
      </div>
 
      {/* ── KPIs — bespoke, needs conditional filters (open/received status) ──── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total PO Value" value={fmt(totPO)} delta={`${filtered.length} orders`} deltaType="up" color="blue" />
        <KPICard label="Open POs" value={open.length} delta={fmt(open.reduce((s, p) => s + n(p.total), 0)) + ' committed'} deltaType="warn" color="amber" />
        <KPICard label="PO Fill Rate" value={`${fillRate}%`} delta={`${rcvd.length} received`} deltaType={+fillRate > 70 ? 'up' : 'warn'} color={+fillRate > 70 ? 'green' : 'amber'} />
        <KPICard label="Active Vendors" value={vendors} delta="In PO history" deltaType="up" color="purple" />
      </div>
 
      <div style={{ display:'flex', borderBottom:'2px solid var(--border)', marginBottom:16, overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'8px 16px', cursor:'pointer', fontSize:11, fontWeight:600, whiteSpace:'nowrap',
            background:'transparent', border:'none', fontFamily:'inherit',
            borderBottom:`2px solid ${tab===t.key?'var(--teal)':'transparent'}`,
            color:tab===t.key?'var(--teal)':'var(--muted)', marginBottom:-2,
          }}>{t.label}</button>
        ))}
      </div>
 
      {/* ── Purchase Orders — bespoke table, needs search + status filter ──── */}
      {tab === 'po' && (
        <>
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search PO / vendor / item…"
              style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none',flex:1,minWidth:200 }} />
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
              style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}>
              <option value="">All Status</option>
              {['Draft','Approved','Sent','Received','Cancelled'].map(s=><option key={s}>{s}</option>)}
            </select>
            <span style={{ fontSize:11, color:'var(--muted)', marginLeft:'auto' }}>{filtered.length} of {rows.length} orders</span>
          </div>
          <div className={tableStyles.tableBox}>
            <table className={tableStyles.table}>
              <thead><tr><th>#</th><th>PO No</th><th>Date</th><th>Vendor</th><th>Item</th><th>Qty</th><th>Total</th><th>Expected</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((p,i) => {
                  const bc = STATUS_BADGE[p.status] ? tableStyles[STATUS_BADGE[p.status]] : tableStyles.amber;
                  return (
                    <tr key={p.poNo||i}>
                      <td style={{ color:'var(--muted)' }}>{i+1}</td>
                      <td style={{ fontWeight:700,color:'var(--navy)' }}>{p.poNo||'—'}</td>
                      <td>{p.date}</td>
                      <td style={{ fontWeight:600,fontSize:11 }}>{p.vendor}</td>
                      <td>{p.item}</td>
                      <td>{n(p.qty).toLocaleString()}</td>
                      <td style={{ fontWeight:700 }}>{fmt(n(p.total))}</td>
                      <td style={{ fontSize:10,color:'var(--muted)' }}>{p.expectedDate||'—'}</td>
                      <td><span className={`${tableStyles.badge} ${bc}`}>{p.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr><td colSpan={6} style={{ fontWeight:700 }}>TOTAL ({filtered.length})</td><td style={{ fontWeight:700 }}>{fmt(totPO)}</td><td colSpan={2}></td></tr></tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ── Supply-Chain KPIs — config-driven via PageRenderer ──── */}
      {tab === 'kpi' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {/* viz-po-002 — Vendor Spend bar, now correctly grouped+summed per vendor */}
          <PageRenderer page="supplychain" module="purchase_orders" only={['bar']} />
          {/* viz-po-003 — PO Status Breakdown pie */}
          <PageRenderer page="supplychain" module="purchase_orders" only={['pie']} />
        </div>
      )}
    </div>
  );
}