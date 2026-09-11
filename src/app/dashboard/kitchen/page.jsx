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
  { id:'orders',    label:'🧾 Meal Orders'     },
  { id:'menu',      label:'📖 Menu'             },
  { id:'store',     label:'📦 Kitchen Store'    },
  { id:'analytics', label:'📊 Analytics'        },
];
 
function Badge({ status }) {
  const map = { Active:'green', Seasonal:'amber', Served:'green', Prepared:'blue', Ordered:'amber', Cancelled:'red' };
  return <span className={`${tableStyles.badge} ${tableStyles[map[status] ?? 'grey']}`}>{status}</span>;
}
 
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
 
function tabGuard(conn, moduleName, page, state) {
  if (!conn) {
    return <SheetError label={moduleName} error={`No connection with module "${moduleName}" is configured yet. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "${page}".`} />;
  }
  if (state.loading) return <Loading message={`Loading "${conn.label}" from Google Sheets…`} />;
  if (state.error) return <SheetError label={conn.label} error={state.error} onRefetch={state.refetch} />;
  if (!state.rows || state.rows.length === 0) {
    return <SheetError label={conn.label} error={`The sheet connected fine, but the "${conn.tabName}" tab returned 0 rows. Check that data starts at header row ${conn.headerRow} and that the range "${conn.range}" covers it.`} onRefetch={state.refetch} />;
  }
  return null;
}
 
export default function KitchenPage() {
  const [activeTab, setActiveTab] = useState('orders');
  const [search, setSearch] = useState('');
  const [mealFilter, setMealFilter] = useState('All');
 
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const ordersConn = getByModule('kitchen_orders');
  const menuConn    = getByModule('kitchen_menu');
  const storeConn   = getByModule('kitchen_store');
 
  const ordersState = useSheetData(ordersConn);
  const menuState    = useSheetData(menuConn);
  const storeState   = useSheetData(storeConn);
 
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
          <h2 className={styles.pageTitle}>🍽️ Kitchen Management</h2>
          <p className={styles.pageMeta}>Meal orders · Menu · Kitchen store · Analytics</p>
        </div>
      </div>
 
      <div className={styles.tabStrip}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`${styles.tabBtn} ${activeTab===t.id ? styles.active : ''}`}>
            {t.label}
          </button>
        ))}
      </div>
 
      {/* ══ Meal Orders ════════════════════════════════════════ */}
      {activeTab === 'orders' && (() => {
        const guard = tabGuard(ordersConn, 'kitchen_orders', 'kitchen', ordersState);
        if (guard) return guard;
 
        const orders = ordersState.rows;
        const dates = [...new Set(orders.map(o=>o.date).filter(Boolean))].sort();
        const latestDate = dates[dates.length-1];
        const latestOrders = orders.filter(o=>o.date===latestDate);
        const totalCost  = orders.reduce((s,o)=>s+n(o.cost),0);
        const totalMeals = orders.reduce((s,o)=>s+n(o.qty),0);
        const servedPct  = orders.length ? (orders.filter(o=>o.status==='Served').length/orders.length*100).toFixed(0) : 0;
 
        const filtered = orders.filter(o =>
          (!search || `${o.patient}${o.ward}${o.meal}`.toLowerCase().includes(search.toLowerCase())) &&
          (mealFilter === 'All' || o.mealTime === mealFilter)
        );
 
        return (
          <>
            <div className={styles.kpiGrid} style={{ marginBottom: 14 }}>
              <KPICard label={`Orders (${latestDate || 'latest day'})`} value={latestOrders.length} delta={`${latestOrders.reduce((s,o)=>s+n(o.qty),0)} meals`} deltaType="up" color="blue" />
              <KPICard label="Total Meals Served" value={totalMeals.toLocaleString()} delta="All records in sheet" deltaType="up" color="green" />
              <KPICard label="Total Meal Cost" value={fmt(totalCost)} deltaType="warn" color="amber" />
              <KPICard label="Avg Cost / Meal" value={fmt(totalMeals ? totalCost/totalMeals : 0)} deltaType="neutral" color="purple" />
              <KPICard label="Service Rate" value={`${servedPct}%`} delta="Orders fully served" deltaType={+servedPct>=80?'up':'warn'} badge={+servedPct>=80?'Good':'Monitor'} badgeType={+servedPct>=80?'good':'warn'} color={+servedPct>=80?'green':'amber'} />
            </div>
 
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search patient / ward / meal…"
                style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none',flex:1,minWidth:200 }} />
              <select value={mealFilter} onChange={e=>setMealFilter(e.target.value)}
                style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}>
                <option>All</option>
                {['Breakfast','Lunch','Dinner','Snack','Special Diet'].map(t=><option key={t}>{t}</option>)}
              </select>
              <span style={{ fontSize:11,color:'var(--muted)',marginLeft:'auto' }}>{filtered.length} orders</span>
            </div>
 
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Meal Order Register</div>
              <table className={tableStyles.table}>
                <thead><tr><th>Date</th><th>Patient</th><th>Ward</th><th>Meal Time</th><th>Menu Item</th><th>Diet</th><th className={tableStyles.right}>Qty</th><th className={tableStyles.right}>Cost</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map((o,i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace:'nowrap' }}>{o.date}</td>
                      <td style={{ fontWeight:600 }}>{o.patient}</td>
                      <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{o.ward}</span></td>
                      <td>{o.mealTime}</td>
                      <td>{o.meal}</td>
                      <td>{o.diet}</td>
                      <td className={tableStyles.right}>{n(o.qty)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(n(o.cost))}</td>
                      <td><Badge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={6}>TOTAL ({filtered.length})</td><td className={tableStyles.right}>{filtered.reduce((s,o)=>s+n(o.qty),0)}</td><td className={tableStyles.right}>{fmt(filtered.reduce((s,o)=>s+n(o.cost),0))}</td><td/></tr></tfoot>
              </table>
            </div>
          </>
        );
      })()}
 
      {/* ══ Menu ═══════════════════════════════════════════════ */}
      {activeTab === 'menu' && (() => {
        const guard = tabGuard(menuConn, 'kitchen_menu', 'kitchen', menuState);
        if (guard) return guard;
 
        const menu = menuState.rows;
        const active = menu.filter(m=>m.status==='Active');
        const avgCost = menu.length ? menu.reduce((s,m)=>s+n(m.cost),0)/menu.length : 0;
        const avgSell = menu.length ? menu.reduce((s,m)=>s+n(m.sell),0)/menu.length : 0;
        const totalSell = menu.reduce((s,m)=>s+n(m.sell),0) || 1;
        const avgMargin = menu.reduce((s,m)=>s+(n(m.sell)-n(m.cost)),0) / totalSell * 100;
 
        return (
          <>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16 }}>
              {[
                { label:'Active Items',   value: active.length,           color:'#117A65', bg:'#d4edda' },
                { label:'Avg Cost/Plate', value: fmt(avgCost),            color:'#CA6F1E', bg:'#fff3cd' },
                { label:'Avg Sell Price', value: fmt(avgSell),            color:'#1B4F72', bg:'#d1ecf1' },
                { label:'Avg Margin',     value: `${avgMargin.toFixed(1)}%`, color:'#6C3483', bg:'#e8d5f5' },
              ].map(s=>(
                <div key={s.label} style={{ background:s.bg,borderRadius:10,padding:'14px 16px',borderLeft:`4px solid ${s.color}` }}>
                  <div style={{ fontSize:10,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:.4,marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:18,fontWeight:800,color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
 
            {/* Bespoke — per-row margin is derived, not a stored column */}
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Menu Register</div>
              <table className={tableStyles.table}>
                <thead><tr><th>Code</th><th>Menu Item</th><th>Category</th><th>Diet Type</th><th className={tableStyles.right}>Cost / Plate</th><th className={tableStyles.right}>Selling Price</th><th className={tableStyles.right}>Gross Margin</th><th>Status</th></tr></thead>
                <tbody>
                  {menu.map((m,i) => {
                    const margin = n(m.sell) > 0 ? ((n(m.sell)-n(m.cost))/n(m.sell)*100).toFixed(1) : 0;
                    return (
                      <tr key={m.code || i}>
                        <td style={{ fontFamily:'monospace',fontSize:10,fontWeight:700 }}>{m.code}</td>
                        <td style={{ fontWeight:600 }}>{m.name}</td>
                        <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{m.category}</span></td>
                        <td>{m.diet}</td>
                        <td className={tableStyles.right}>{fmt(n(m.cost))}</td>
                        <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(n(m.sell))}</td>
                        <td className={tableStyles.right}><span style={{ fontWeight:700,color:+margin>50?'var(--teal)':+margin>30?'var(--amber)':'var(--red)' }}>{margin}%</span></td>
                        <td><Badge status={m.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}
 
      {/* ══ Kitchen Store ══════════════════════════════════════ */}
      {activeTab === 'store' && (() => {
        const guard = tabGuard(storeConn, 'kitchen_store', 'kitchen', storeState);
        if (guard) return guard;
 
        const store = storeState.rows;
        const storeValue = store.reduce((s,r)=>s+n(r.totalValue),0);
        const lowStock = store.filter(r=>n(r.qty)<=n(r.reorder));
 
        return (
          <>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap' }}>
              <span style={{ fontSize:11,color:'var(--muted)' }}>Total value: <strong style={{ color:'var(--navy)' }}>{fmt(storeValue)}</strong> · {lowStock.length} low-stock items</span>
            </div>
 
            <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:14 }}>
              {/* Reads viz-kstore-003 */}
              <PageRenderer page="kitchen" module="kitchen_store" only={['table']} />
 
              <div>
                {/* Reads viz-kstore-002 */}
                <div style={{ marginBottom: 14 }}>
                  <PageRenderer page="kitchen" module="kitchen_store" only={['pie']} />
                </div>
                {lowStock.length > 0 && (
                  <div className={styles.card}>
                    <div className={styles.cardTitle}>Low Stock Alerts</div>
                    {lowStock.map((r,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:11 }}>
                        <span style={{ fontWeight:600, color:'var(--amber)' }}>⚠ {r.item}</span>
                        <span style={{ color:'var(--amber)' }}>{n(r.qty)} {r.unit} left</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}
 
      {/* ══ Analytics ══════════════════════════════════════════ */}
      {activeTab === 'analytics' && (() => {
        const ordersGuard = tabGuard(ordersConn, 'kitchen_orders', 'kitchen', ordersState);
        if (ordersGuard) return ordersGuard;
        const storeGuard = tabGuard(storeConn, 'kitchen_store', 'kitchen', storeState);
        if (storeGuard) return storeGuard;
        const menuGuard = tabGuard(menuConn, 'kitchen_menu', 'kitchen', menuState);
        if (menuGuard) return menuGuard;
 
        const menu = menuState.rows;
 
        return (
          <>
            {/* Reads viz-kord-004 (pie) + viz-kord-003/005 (bar) */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <PageRenderer page="kitchen" module="kitchen_orders" only={['pie']} />
              <PageRenderer page="kitchen" module="kitchen_orders" only={['bar']} />
            </div>
 
            {/* Reads viz-kstore-002 */}
            <div style={{ marginBottom: 14 }}>
              <PageRenderer page="kitchen" module="kitchen_store" only={['pie']} />
            </div>
 
            {/* Bespoke — profitability sort + per-row margin are derived */}
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Menu Profitability Summary</div>
              <table className={tableStyles.table}>
                <thead><tr><th>Menu Item</th><th>Diet</th><th className={tableStyles.right}>Cost</th><th className={tableStyles.right}>Sell Price</th><th className={tableStyles.right}>Gross Profit</th><th className={tableStyles.right}>Margin %</th></tr></thead>
                <tbody>
                  {[...menu].sort((a,b)=>(n(b.sell)-n(b.cost))-(n(a.sell)-n(a.cost))).map((m,i) => {
                    const gp  = n(m.sell)-n(m.cost);
                    const pct = n(m.sell) > 0 ? (gp/n(m.sell)*100).toFixed(1) : 0;
                    return (
                      <tr key={m.code || i}>
                        <td style={{ fontWeight:600 }}>{m.name}</td>
                        <td><span className={`${tableStyles.badge} ${tableStyles.grey}`}>{m.diet}</span></td>
                        <td className={tableStyles.right}>{fmt(n(m.cost))}</td>
                        <td className={tableStyles.right}>{fmt(n(m.sell))}</td>
                        <td className={tableStyles.right} style={{ color:'var(--teal)',fontWeight:600 }}>{fmt(gp)}</td>
                        <td className={tableStyles.right}><span style={{ fontWeight:700,color:+pct>55?'var(--teal)':+pct>35?'var(--amber)':'var(--red)' }}>{pct}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}
    </div>
  );
}