'use client';

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { RevenuePieChart } from '../../components/Charts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { fmt, COLORS } from '../lib/data';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';

import {DynamicViz, DynamicVizList } from '../../components/DynamicViz';

const tip = { background:'#fff', border:'1px solid #E0E4EA', borderRadius:8, fontSize:11 };
const n   = v => parseFloat(String(v||0).replace(/[₦,]/g,'')) || 0;

const TABS = [
  { key:'overview',  label:'📊 Overview'       },
  { key:'stock',     label:'📦 Stock Register' },
  { key:'srv',       label:'📥 SRV Receipts'   },
  { key:'siv',       label:'📤 SIV Issues'     },
  { key:'reorder',   label:'🔔 Reorder Alerts' },
  { key:'movement',  label:'↔ Stock Movement'  },
  { key:'valuation', label:'💰 Valuation'      },
  { key:'medical-consumables', label:'⚕ Medical Consumables' },
];

// ─── Error state ──────────────────────────────────────────────
function SheetError({ error, onRefetch }) {
  const notConnected = error?.includes('not connected') || error?.includes('Sheet ID');
  const noKey        = error?.includes('API key');
  return (
    <div style={{ background:notConnected?'#FFF9E6':'#FEECEC', border:`1.5px solid ${notConnected?'#F4D03F':'#F1948A'}`, borderRadius:10, padding:'24px', textAlign:'center' }}>
      <div style={{ fontSize:28, marginBottom:10 }}>{notConnected?'🔗':noKey?'🔑':'⚠️'}</div>
      <div style={{ fontSize:13, fontWeight:800, color:'var(--navy)', marginBottom:8 }}>
        {notConnected ? 'Sheet not connected yet' : noKey ? 'API key not set' : 'Failed to load data'}
      </div>
      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14 }}>{error}</div>
      {(notConnected || noKey) && (
        <a href="/dashboard/settings" style={{ padding:'8px 18px', background:'var(--navy)', color:'#fff', borderRadius:8, fontSize:11, fontWeight:600, textDecoration:'none' }}>⚙ Go to Settings</a>
      )}
      {onRefetch && !notConnected && !noKey && (
        <button onClick={onRefetch} style={{ padding:'8px 18px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer' }}>↻ Retry</button>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────
function Loading({ rows=5, cols=4 }) {
  return (
    <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid var(--border)' }}>
      {Array.from({length:rows}).map((_,ri) => (
        <div key={ri} style={{ display:'flex', gap:12, padding:'10px 16px', borderBottom:'1px solid var(--border)', background:ri===0?'#f5f7f9':'#fff' }}>
          {Array.from({length:cols}).map((_,ci) => (
            <div key={ci} style={{ flex:1, height:12, borderRadius:4, background:ri===0?'#dde1e7':'#f0f2f5', animation:'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:'8px 14px', cursor:'pointer', fontSize:11, fontWeight:600, whiteSpace:'nowrap',
      background:'transparent', border:'none', fontFamily:'inherit',
      borderBottom:`2px solid ${active?'var(--teal)':'transparent'}`,
      color:active?'var(--teal)':'var(--muted)', marginBottom:-2,
    }}>{children}</button>
  );
}

export default function InventoryPage() {
  const [tab,    setTab]    = useState('overview');
  const [search, setSearch] = useState('');

  // 1. Fetch connections from Google Drive JSON
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();

  // 2. Get each module's connection config
  const stockConn   = getByModule('stock_register');
  const srvConn     = getByModule('srv_receipts');
  const sivConn     = getByModule('stock_out');
  const reorderConn = getByModule('reorder_alerts');
  const movConn     = getByModule('stock_movement');
  const valConn     = getByModule('inventory_valuation');
  const medicalConn = getByModule('medical_consumables');


  // 3. Fetch each sheet's actual data
  const stock   = useSheetData(stockConn);
  const srv     = useSheetData(srvConn);
  const siv     = useSheetData(sivConn);
  const reorder = useSheetData(reorderConn);
  const mov     = useSheetData(movConn);
  const val     = useSheetData(valConn);
  const medicalConsumables = useSheetData(medicalConn);

  const srvBarViz = srvConn?.visualizations?.find(v => v.id === 'viz-srv-002');

  const anyConnected = [stock,srv,siv,medicalConsumables].some(s => s.rows.length > 0);
  const anyLoading   = configLoading || [stock,srv,siv,reorder,mov,val,medicalConsumables].some(s => s.loading);

  // ── KPIs ──────────────────────────────────────────────────
  const totalValue   = stock.rows.reduce((s,r) => s+n(r.totalValue), 0);
  const belowReorder = stock.rows.filter(r => n(r.qty)<=n(r.reorder) && n(r.reorder)>0);
  const deadStock    = stock.rows.filter(r => !r.lastIssued);
  const totalRecvd   = srv.rows.reduce((s,r) => s+n(r.total), 0);
  const totalIssued  = siv.rows.reduce((s,r) => s+n(r.total), 0);
  const estReorder   = reorder.rows.reduce((s,r) => s+n(r.estReorderValue), 0);

  // ── Charts ────────────────────────────────────────────────
  const issuedMap = {};
  siv.rows.forEach(r => { issuedMap[r.name||'?'] = (issuedMap[r.name||'?']||0)+n(r.qty); });
  const top10Issued = Object.entries(issuedMap).sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([name,qty]) => ({ name:name.length>20?name.slice(0,20)+'…':name, qty }));

  const top10Value = [...stock.rows].sort((a,b)=>n(b.totalValue)-n(a.totalValue)).slice(0,10)
    .map(r => ({ name:(r.name||'—').slice(0,20), value:+(n(r.totalValue)/1e6).toFixed(2) }));

  const movChart = mov.rows.slice(0,10).map(r => ({
    name:(r.name||'—').slice(0,14), receipts:n(r.totalReceipts), issues:n(r.totalIssues)
  }));

  const classMap = {A:0,B:0,C:0};
  val.rows.forEach(r => { classMap[r.classification||'C'] += n(r.totalValue); });
  const classPie = [
    {name:'Class A',value:+(classMap.A/1e6).toFixed(2)},
    {name:'Class B',value:+(classMap.B/1e6).toFixed(2)},
    {name:'Class C',value:+(classMap.C/1e6).toFixed(2)},
  ].filter(c=>c.value>0);

  const filteredStock = stock.rows.filter(r =>
    !search || (r.name||'').toLowerCase().includes(search.toLowerCase()) ||
    (r.itemCode||'').toLowerCase().includes(search.toLowerCase())
  );

  // ── Config loading / error ────────────────────────────────
  if (configLoading) return (
    <div>
      <div style={{ textAlign:'center', padding:64 }}>
        <div style={{ fontSize:28, marginBottom:10 }}>⏳</div>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--navy)' }}>Loading sheet configuration from Google Drive…</div>
      </div>
    </div>
  );

  if (configError) return (
    <div>
      <div style={{ padding:24 }}>
        <SheetError error={`Failed to load config: ${configError}`} onRefetch={reload} />
      </div>
    </div>
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>📦 Inventory Management</h2>
          <p className={styles.pageMeta}>Store department · Stock register, receipts, issues & valuation</p>
        </div>
        <button
          onClick={() => { stock.refetch(); srv.refetch(); siv.refetch(); reorder.refetch(); mov.refetch(); val.refetch(); medicalConsumables.refetch(); }}
          disabled={anyLoading}
          style={{ padding:'7px 16px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:8, fontSize:11, fontWeight:600, cursor:anyLoading?'wait':'pointer' }}
        >{anyLoading ? '⏳ Loading…' : '↻ Refresh All'}</button>
      </div>

      {/* Connection status */}
      <div style={{
        display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
        padding:'10px 14px', marginBottom:16,
        background:anyConnected?'#E8F8F5':'#FFF9E6',
        border:`1px solid ${anyConnected?'#A9DFBF':'#F4D03F'}`, borderRadius:8,
      }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:anyConnected?'#117A65':'#CA6F1E' }} />
        <span style={{ fontSize:11, fontWeight:700, color:anyConnected?'#117A65':'#CA6F1E' }}>
          {anyLoading ? 'Loading from Google Sheets…' : anyConnected ? '✓ Live from Google Sheets' : 'Sheets not connected — go to Settings to add sheet IDs'}
        </span>
        {!anyConnected && (
          <a href="/dashboard/settings" style={{ marginLeft:'auto', fontSize:10, fontWeight:600, color:'var(--navy)', textDecoration:'none' }}>⚙ Settings →</a>
        )}
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Inventory Value" value={fmt(totalValue)} delta={`${stock.rows.length} SKUs`} deltaType="up" color="blue" />
        <KPICard label="Items Below Reorder" value={belowReorder.length}
          deltaType={belowReorder.length>0?'down':'up'}
          badge={belowReorder.length>0?'⚠ Action':'✓ OK'}
          badgeType={belowReorder.length>0?'bad':'good'}
          color={belowReorder.length>0?'red':'green'} />
        <KPICard label="Total Received (SRV)" value={fmt(totalRecvd)} delta={`${srv.rows.length} receipts`} deltaType="up" color="green" />
        <KPICard label="Total Issued (SIV)" value={fmt(totalIssued)} delta={`${siv.rows.length} issues`} deltaType="warn" color="amber" />
        <KPICard label="Dead Stock" value={deadStock.length} deltaType={deadStock.length>5?'warn':'up'} color={deadStock.length>5?'amber':'green'} />
        <KPICard label="Est. Reorder Value" value={fmt(estReorder)} delta={`${reorder.rows.length} items`} deltaType="warn" color="purple" />
        <KPICard label="Receipts vs Issues" value={totalIssued>0?`${(totalRecvd/totalIssued).toFixed(1)}×`:'—'} deltaType={totalRecvd>=totalIssued?'up':'warn'} color="blue" />
        <KPICard label="Total SKUs" value={stock.rows.length} deltaType="up" color="navy" />
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:'2px solid var(--border)', marginBottom:16, overflowX:'auto' }}>
        {TABS.map(t => <TabBtn key={t.key} active={tab===t.key} onClick={()=>setTab(t.key)}>{t.label}</TabBtn>)}
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════ */}
      {tab==='overview' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Top 10 Most Issued Items (Qty)</div>
              {siv.error ? <SheetError error={siv.error} onRefetch={siv.refetch} />
                : siv.loading ? <Loading rows={5} cols={2} />
                : <ResponsiveContainer width="100%" height={240}>
                    <BarChart layout="vertical" data={top10Issued} margin={{top:4,right:16,left:8,bottom:0}}>
                      <CartesianGrid horizontal={false} stroke="rgba(0,0,0,.05)" />
                      <XAxis type="number" tick={{fontSize:10,fill:'#7F8C9A'}} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:'#7F8C9A'}} axisLine={false} tickLine={false} width={110} />
                      <Tooltip contentStyle={tip} />
                      <Bar dataKey="qtyIssued" radius={[0,3,3,0]}>
                        {top10Issued.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Top 10 Highest Valued Items (₦M)</div>
              {stock.error ? <SheetError error={stock.error} onRefetch={stock.refetch} />
                : stock.loading ? <Loading rows={5} cols={2} />
                : <ResponsiveContainer width="100%" height={240}>
                    <BarChart layout="vertical" data={top10Value} margin={{top:4,right:16,left:8,bottom:0}}>
                      <CartesianGrid horizontal={false} stroke="rgba(0,0,0,.05)" />
                      <XAxis type="number" tick={{fontSize:10,fill:'#7F8C9A'}} axisLine={false} tickLine={false} tickFormatter={v=>`₦${v}M`} />
                      <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:'#7F8C9A'}} axisLine={false} tickLine={false} width={110} />
                      <Tooltip contentStyle={tip} formatter={v=>`₦${v}M`} />
                      <Bar dataKey="value" radius={[0,3,3,0]}>
                        {top10Value.map((_,i) => <Cell key={i} fill={COLORS[(i+2)%COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Stock Movement — Receipts vs Issues</div>
              {mov.error ? <SheetError error={mov.error} onRefetch={mov.refetch} />
                : mov.loading ? <Loading rows={4} cols={3} />
                : <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={movChart} margin={{top:4,right:8,left:0,bottom:0}} barCategoryGap="30%">
                      <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                      <XAxis dataKey="name" tick={{fontSize:9,fill:'#7F8C9A'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize:10,fill:'#7F8C9A'}} axisLine={false} tickLine={false} width={40} />
                      <Tooltip contentStyle={tip} />
                      <Legend iconSize={8} wrapperStyle={{fontSize:10}} />
                      <Bar dataKey="receipts" name="Receipts" fill="#117A65" radius={[3,3,0,0]} />
                      <Bar dataKey="issues"   name="Issues"   fill="#E74C3C" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>ABC Classification (₦M)</div>
              {val.error ? <SheetError error={val.error} onRefetch={val.refetch} />
                : val.loading ? <Loading rows={4} cols={2} />
                : classPie.length>0
                  ? <RevenuePieChart data={classPie} colors={['#117A65','#CA6F1E','#888']} />
                  : <div style={{textAlign:'center',padding:32,color:'var(--muted)',fontSize:11}}>No valuation data</div>
              }
            </div>
          </div>
        </>
      )}

      {/* ══ STOCK REGISTER ════════════════════════════════════ */}
      {tab==='stock' && (
        stock.error ? <SheetError error={stock.error} onRefetch={stock.refetch} />
        : stock.loading ? <Loading rows={8} cols={6} />
        : <>
            <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search item name or code…"
                style={{padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none',flex:1,minWidth:200}} />
              <span style={{fontSize:11,color:'var(--muted)'}}>{filteredStock.length} items</span>
            </div>
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Stock Register — {fmt(totalValue)} total value</div>
              <div style={{overflowX:'auto'}}>
                <table className={tableStyles.table} style={{minWidth:900}}>
                  <thead><tr>
                    <th>Item Code</th><th>Item Description</th><th>UOM</th>
                    <th>Opening Qty</th><th>Current Qty</th><th>Unit Cost</th>
                    <th>Total Value</th><th>Reorder Lvl</th><th>Reorder Qty</th>
                    <th>Last Received</th><th>Last Issued</th><th>Status</th>
                  </tr></thead>
                  <tbody>
                    {filteredStock.map((r,i) => {
                      const low = n(r.reorder)>0 && n(r.qty)<=n(r.reorder);
                      return (
                        <tr key={r.itemCode||i}>
                          <td style={{fontSize:10,color:'var(--muted)'}}>{r.itemCode||'—'}</td>
                          <td style={{fontWeight:600}}>{r.name}</td>
                          <td style={{color:'var(--muted)',fontSize:10}}>{r.uom||'—'}</td>
                          <td style={{color:'var(--muted)'}}>{n(r.openingQty).toLocaleString()}</td>
                          <td style={{fontWeight:700,color:low?'var(--red)':'var(--text)'}}>{n(r.qty).toLocaleString()}</td>
                          <td>{fmt(n(r.unitCost))}</td>
                          <td style={{fontWeight:700}}>{fmt(n(r.totalValue))}</td>
                          <td style={{color:'var(--muted)'}}>{r.reorder||'—'}</td>
                          <td style={{color:'var(--muted)'}}>{r.reorderQty||'—'}</td>
                          <td style={{fontSize:10}}>{r.lastReceived||'—'}</td>
                          <td style={{fontSize:10}}>{r.lastIssued||'—'}</td>
                          <td><span className={`${tableStyles.badge} ${low?tableStyles.red:tableStyles.green}`}>{low?'⚠ LOW':'✓ OK'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr>
                    <td colSpan={6} style={{fontWeight:700}}>TOTAL ({filteredStock.length})</td>
                    <td style={{fontWeight:700}}>{fmt(filteredStock.reduce((s,r)=>s+n(r.totalValue),0))}</td>
                    <td colSpan={5}></td>
                  </tr></tfoot>
                </table>
              </div>
            </div>
          </>
      )}

      {/* ══ SRV ═══════════════════════════════════════════════ */}
      {/*tab==='srv' && (
        srv.error ? <SheetError error={srv.error} onRefetch={srv.refetch} />
        : srv.loading ? <Loading rows={6} cols={5} />
        : <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>SRV Receipts — {fmt(totalRecvd)} total</div>
            <table className={tableStyles.table}>
              <thead><tr><th>Date</th><th>Vendor</th><th>Item Code</th><th>Item Description</th><th>UOM</th><th>Invoice/Waybill</th><th>Qty Requested</th><th>Unit Price</th><th>Total</th></tr></thead>
              <tbody>
                {srv.rows.map((r,i) => (
                  <tr key={i}>
                    <td>{r.date||'—'}</td>
                    <td style={{fontWeight:600}}>{r.vendor||'—'}</td>
                    <td style={{fontSize:10,color:'var(--muted)'}}>{r.itemCode||'—'}</td>
                    <td>{r.name||'—'}</td>
                    <td style={{color:'var(--muted)',fontSize:10}}>{r.uom||'—'}</td>
                    <td style={{fontSize:10,color:'var(--muted)'}}>{r.invoiceRef||'—'}</td>
                    <td>{n(r.qtyRequested).toLocaleString()}</td>
                    <td>{fmt(n(r.unitPrice))}</td>
                    <td style={{fontWeight:700}}>{fmt(n(r.total))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={8} style={{fontWeight:700}}>TOTAL</td><td style={{fontWeight:700}}>{fmt(totalRecvd)}</td></tr></tfoot>
            </table>
          </div>
      )*/}

      {tab==='srv' && (
        srv.error ? <SheetError error={srv.error} onRefetch={srv.refetch} />
        : srv.loading ? <Loading rows={6} cols={5} />
        : <div className={tableStyles.tableBox}>
            <DynamicVizList connection={srvConn} rows={srv.rows} />
          </div>
      )}

      {tab==='siv' && (
        siv.error ? <SheetError error={siv.error} onRefetch={siv.refetch} />
        : siv.loading ? <Loading rows={6} cols={5} />
        : <div className={tableStyles.tableBox}>
            <DynamicVizList connection={sivConn} rows={siv.rows} />
          </div>
      )}

      {/* ══ SIV ═══════════════════════════════════════════════ */}
      {/*tab==='siv' && (
        siv.error ? <SheetError error={siv.error} onRefetch={siv.refetch} />
        : siv.loading ? <Loading rows={6} cols={5} />
        : <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>SIV Issues — {fmt(totalIssued)} total</div>
            <table className={tableStyles.table}>
              <thead><tr><th>Date Issued</th><th>Item Description</th><th>Code</th><th>Qty Requested</th><th>Qty Issued</th><th>Unit Price</th><th>Total</th><th>Account Head</th><th>Department</th><th>Recipient</th></tr></thead>
              <tbody>
                {siv.rows.map((r,i) => (
                  <tr key={i}>
                    <td>{r.date_issued||'—'}</td>
                    <td style={{fontWeight:600}}>{r.item_description||'—'}</td>
                    <td>{r.code||'—'}</td>
                    <td>{n(r.quantity_requested).toLocaleString()}</td>
                    <td>{n(r.quantity_issued).toLocaleString()}</td>
                    <td>{fmt(n(r.unit_price))}</td>
                    <td style={{fontWeight:700}}>{n(r.total).toLocaleString()}</td>
                    <td style={{fontWeight:700}}>{(r.account_head)}</td>
                    <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.department||'—'}</span></td>
                    <td style={{fontSize:10,color:'var(--muted)'}}>{r.name_of_recipient||'—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={7} style={{fontWeight:700}}>TOTAL</td><td style={{fontWeight:700}}>{fmt(totalIssued)}</td><td colSpan={2}></td></tr></tfoot>
            </table>
          </div>
      )*/}

      {/* ══ REORDER ═══════════════════════════════════════════ */}
      {tab==='reorder' && (
        reorder.error ? <SheetError error={reorder.error} onRefetch={reorder.refetch} />
        : reorder.loading ? <Loading rows={4} cols={4} />
        : <>
            {reorder.rows.length>0 && (
              <div style={{background:'#FEECEC',border:'1px solid #F1948A',borderRadius:10,padding:'12px 16px',marginBottom:14,fontSize:11,color:'var(--red)'}}>
                ⚠ <strong>{reorder.rows.length} item{reorder.rows.length!==1?'s':''}</strong> below reorder level — Est. reorder value: <strong>{fmt(estReorder)}</strong>
              </div>
            )}
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Reorder Alerts</div>
              <table className={tableStyles.table}>
                <thead><tr><th>Item Code</th><th>Item Description</th><th>Current Stock</th><th>Reorder Level</th><th>Qty Required</th><th>Est. Reorder Value</th><th>Action</th></tr></thead>
                <tbody>
                  {reorder.rows.length===0
                    ? <tr><td colSpan={7} style={{textAlign:'center',padding:24,color:'var(--teal)'}}>✓ All items above reorder level</td></tr>
                    : reorder.rows.map((r,i) => (
                        <tr key={i}>
                          <td style={{fontSize:10,color:'var(--muted)'}}>{r.itemCode||'—'}</td>
                          <td style={{fontWeight:700,color:'var(--red)'}}>{r.name||'—'}</td>
                          <td style={{fontWeight:700,color:'var(--red)'}}>{n(r.qty).toLocaleString()}</td>
                          <td>{n(r.reorder).toLocaleString()}</td>
                          <td style={{fontWeight:600}}>{n(r.qtyRequired).toLocaleString()}</td>
                          <td style={{fontWeight:700}}>{fmt(n(r.estReorderValue))}</td>
                          <td><span className={`${tableStyles.badge} ${tableStyles.red}`}>Reorder Now</span></td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </>
      )}

      {/* ══ MOVEMENT ══════════════════════════════════════════ */}
      {tab==='movement' && (
        mov.error ? <SheetError error={mov.error} onRefetch={mov.refetch} />
        : mov.loading ? <Loading rows={6} cols={5} />
        : <>
            <div className={styles.card} style={{marginBottom:14}}>
              <div className={styles.cardTitle}>Stock Movement — Receipts vs Issues</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={movChart} margin={{top:4,right:8,left:0,bottom:0}} barCategoryGap="25%">
                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                  <XAxis dataKey="name" tick={{fontSize:9,fill:'#7F8C9A'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:10,fill:'#7F8C9A'}} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={tip} />
                  <Legend iconSize={8} wrapperStyle={{fontSize:10}} />
                  <Bar dataKey="receipts" name="Total Receipts" fill="#117A65" radius={[3,3,0,0]} />
                  <Bar dataKey="issues"   name="Total Issues"   fill="#E74C3C" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Stock Movement Detail</div>
              <table className={tableStyles.table}>
                <thead><tr><th>Item Code</th><th>Item Description</th><th>Opening Balance</th><th>Total Receipts</th><th>Total Issues</th><th>Closing Balance</th><th>Net</th></tr></thead>
                <tbody>
                  {mov.rows.map((r,i) => {
                    const net = n(r.totalReceipts)-n(r.totalIssues);
                    return (
                      <tr key={i}>
                        <td style={{fontSize:10,color:'var(--muted)'}}>{r.itemCode||'—'}</td>
                        <td style={{fontWeight:600}}>{r.name||'—'}</td>
                        <td style={{color:'var(--muted)'}}>{n(r.openingBalance).toLocaleString()}</td>
                        <td style={{color:'var(--teal)',fontWeight:600}}>+{n(r.totalReceipts).toLocaleString()}</td>
                        <td style={{color:'var(--red)'}}>-{n(r.totalIssues).toLocaleString()}</td>
                        <td style={{fontWeight:700}}>{n(r.closingBalance).toLocaleString()}</td>
                        <td><span className={`${tableStyles.badge} ${net>=0?tableStyles.green:tableStyles.amber}`}>{net>=0?`+${net}`:net}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
      )}

      {/* ══ VALUATION ═════════════════════════════════════════ */}
      {tab==='valuation' && (
        val.error ? <SheetError error={val.error} onRefetch={val.refetch} />
        : val.loading ? <Loading rows={8} cols={5} />
        : <>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:14}}>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Top 10 Highest Valued Items (₦M)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart layout="vertical" data={top10Value} margin={{top:4,right:16,left:8,bottom:0}}>
                    <CartesianGrid horizontal={false} stroke="rgba(0,0,0,.05)" />
                    <XAxis type="number" tick={{fontSize:10,fill:'#7F8C9A'}} axisLine={false} tickLine={false} tickFormatter={v=>`₦${v}M`} />
                    <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:'#7F8C9A'}} axisLine={false} tickLine={false} width={110} />
                    <Tooltip contentStyle={tip} formatter={v=>`₦${v}M`} />
                    <Bar dataKey="value" radius={[0,3,3,0]}>
                      {top10Value.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>ABC Classification</div>
                {classPie.length>0
                  ? <RevenuePieChart data={classPie} colors={['#117A65','#CA6F1E','#888']} />
                  : <div style={{textAlign:'center',padding:32,color:'var(--muted)',fontSize:11}}>Connect valuation sheet</div>
                }
              </div>
            </div>
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Inventory Valuation</div>
              <div style={{overflowX:'auto'}}>
                <table className={tableStyles.table}>
                  <thead><tr><th>Item Code</th><th>Item Description</th><th>Current Qty</th><th>Unit Cost</th><th>Stock Value</th><th>% of Total</th><th>Class</th></tr></thead>
                  <tbody>
                    {val.rows.map((r,i) => {
                      const cls=r.classification||'C';
                      const clsColor=cls==='A'?tableStyles.green:cls==='B'?tableStyles.blue:tableStyles.amber;
                      return (
                        <tr key={i}>
                          <td style={{fontSize:10,color:'var(--muted)'}}>{r.itemCode||'—'}</td>
                          <td style={{fontWeight:600}}>{r.name||'—'}</td>
                          <td>{n(r.qty).toLocaleString()}</td>
                          <td>{fmt(n(r.unitCost))}</td>
                          <td style={{fontWeight:700}}>{fmt(n(r.totalValue))}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <div style={{height:6,borderRadius:3,background:'var(--teal)',opacity:0.7,width:`${Math.min(80,parseFloat(r.pctOfTotal||0)*4)}px`}} />
                              <span style={{fontSize:10}}>{r.pctOfTotal||'—'}%</span>
                            </div>
                          </td>
                          <td><span className={`${tableStyles.badge} ${clsColor}`}>Class {cls}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr>
                    <td colSpan={4} style={{fontWeight:700}}>TOTAL</td>
                    <td style={{fontWeight:700}}>{fmt(val.rows.reduce((s,r)=>s+n(r.totalValue),0))}</td>
                    <td style={{fontWeight:700}}>100%</td><td></td>
                  </tr></tfoot>
                </table>
              </div>
            </div>
          </>
      )}

      {tab==='medical-consumables' && (
        medicalConsumables.error ? <SheetError error={medicalConsumables.error} onRefetch={medicalConsumables.refetch} />
        : medicalConsumables.loading ? <Loading rows={6} cols={5} />
        : <div className={tableStyles.tableBox}>
            <DynamicVizList connection={medicalConn} rows={medicalConsumables.rows} />
          </div>
      )}
    </div>
  );
}