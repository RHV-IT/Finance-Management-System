'use client';
 
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import PageRenderer from '../../components/PageRenderer';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import { fmt } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
 
const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
const tip = { background:'#fff', border:'1px solid #E0E4EA', borderRadius:8, fontSize:11 };
const COLORS = ['#1B4F72','#117A65','#6C3483','#CA6F1E','#D85A30','#639922','#1ABC9C','#F39C12','#E74C3C','#3498DB'];
 
const TABS = [
  { id:'batches',  label:'📋 Batch Log'          },
  { id:'packs',    label:'📦 Pack Inventory'      },
  { id:'methods',  label:'🔬 Methods & Cycles'    },
  { id:'analytics',label:'📊 Analytics'           },
];
 
function StatusBadge({ status }) {
  const map = { Completed: tableStyles.green, Ready: tableStyles.green, 'In Progress': tableStyles.blue, 'Low Stock': tableStyles.amber, Critical: tableStyles.red, Scheduled: tableStyles.grey };
  return <span className={`${tableStyles.badge} ${map[status] ?? tableStyles.grey}`}>{status}</span>;
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
 
export default function CssdPage() {
  const [activeTab, setActiveTab] = useState('batches');
 
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const batchesConn = getByModule('cssd_batches');
  const packsConn   = getByModule('cssd_packs');
 
  const batchesState = useSheetData(batchesConn);
  const packsState   = useSheetData(packsConn);
 
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
          <h2 className={styles.pageTitle}>♻️ CSSD — Central Sterile Services</h2>
          <p className={styles.pageMeta}>Sterilisation batches · Pack inventory · Cycle performance</p>
        </div>
      </div>
 
      <div className={styles.tabStrip}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`${styles.tabBtn} ${activeTab===t.id ? styles.active : ''}`}>
            {t.label}
          </button>
        ))}
      </div>
 
      {/* ══ Batch Log ══════════════════════════════════════════ */}
      {activeTab === 'batches' && (() => {
        const guard = tabGuard(batchesConn, 'cssd_batches', 'cssd', batchesState);
        if (guard) return guard;
 
        const batches = batchesState.rows;
        const totProc = batches.reduce((s,b)=>s+n(b.processed),0);
        const totSter = batches.reduce((s,b)=>s+n(b.sterilized),0);
        const totDmg  = batches.reduce((s,b)=>s+n(b.returnedDmg),0);
        const totRev  = batches.reduce((s,b)=>s+n(b.revenue),0);
        const totExp  = batches.reduce((s,b)=>s+n(b.expense),0);
        const utilRate = totProc>0 ? (totSter/totProc*100).toFixed(1) : 0;
        const margin   = totRev>0 ? ((totRev-totExp)/totRev*100).toFixed(1) : 0;
 
        const deptMap = {};
        batches.forEach(b => {
          const dept = b.dept || 'Unspecified';
          if (!deptMap[dept]) deptMap[dept] = { dept, processed:0, sterilized:0, revenue:0 };
          deptMap[dept].processed  += n(b.processed);
          deptMap[dept].sterilized += n(b.sterilized);
          deptMap[dept].revenue    += n(b.revenue);
        });
        const deptRows = Object.values(deptMap).sort((a,b)=>b.processed-a.processed);
 
        return (
          <>
            <div className={styles.kpiGrid} style={{ marginBottom: 14 }}>
              <KPICard label="Packs Processed"    value={totProc.toLocaleString()} delta={`${batches.length} batches`} deltaType="neutral" color="blue" />
              <KPICard label="Packs Sterilised"   value={totSter.toLocaleString()} delta="Successfully processed" deltaType="up" color="green" />
              <KPICard label="Utilisation Rate"   value={`${utilRate}%`} delta="Target ≥ 98%" deltaType={+utilRate>=98?'up':'warn'} badge={+utilRate>=98?'On Target':'Monitor'} badgeType={+utilRate>=98?'good':'warn'} color={+utilRate>=98?'green':'amber'} />
              <KPICard label="Returned / Damaged" value={totDmg.toLocaleString()} deltaType={totDmg===0?'up':'warn'} color={totDmg===0?'green':'amber'} />
              <KPICard label="Revenue Generated"  value={fmt(totRev)} deltaType="up" color="teal" />
              <KPICard label="Operating Expense"  value={fmt(totExp)} deltaType="warn" color="red" />
              <KPICard label="Contribution Margin" value={`${margin}%`} deltaType={+margin>60?'up':'warn'} badge={+margin>60?'Healthy':'Monitor'} badgeType={+margin>60?'good':'warn'} color={+margin>60?'green':'amber'} />
            </div>
 
            {/* Reads viz-cssdb-009 */}
            <PageRenderer page="cssd" module="cssd_batches" only={['table']} />
 
            {/* Dept breakdown — bespoke pivot, VizTable can't group/sum */}
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Usage by Department</div>
              <table className={tableStyles.table}>
                <thead><tr><th>Department</th><th className={tableStyles.right}>Packs Processed</th><th className={tableStyles.right}>Packs Sterilised</th><th className={tableStyles.right}>Pass Rate</th><th className={tableStyles.right}>Revenue</th></tr></thead>
                <tbody>
                  {deptRows.map(d => (
                    <tr key={d.dept}>
                      <td style={{ fontWeight:600 }}>{d.dept}</td>
                      <td className={tableStyles.right}>{d.processed.toLocaleString()}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{d.sterilized.toLocaleString()}</td>
                      <td className={tableStyles.right}><span style={{ fontWeight:700,color:'var(--teal)' }}>{d.processed>0?(d.sterilized/d.processed*100).toFixed(1):0}%</span></td>
                      <td className={tableStyles.right}>{fmt(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}
 
      {/* ══ Pack Inventory ═════════════════════════════════════ */}
      {activeTab === 'packs' && (() => {
        const guard = tabGuard(packsConn, 'cssd_packs', 'cssd', packsState);
        if (guard) return guard;
 
        const packs = packsState.rows;
        const ready    = packs.filter(p=>p.status==='Ready');
        const low      = packs.filter(p=>p.status==='Low Stock');
        const critical = packs.filter(p=>p.status==='Critical');
        const totalValue = packs.reduce((s,p)=>s+n(p.qty)*n(p.unitCost),0);
 
        return (
          <>
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14,flexWrap:'wrap' }}>
              <span style={{ fontSize:11,color:'var(--muted)' }}>Total pack value: <strong style={{ color:'var(--navy)' }}>{fmt(totalValue)}</strong></span>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16 }}>
              {[
                { label:'Ready for Use', count:ready.length,    color:'#117A65', bg:'#d4edda' },
                { label:'Low Stock',     count:low.length,      color:'#CA6F1E', bg:'#fff3cd' },
                { label:'Critical',      count:critical.length, color:'#C0392B', bg:'#f8d7da' },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg,borderRadius:10,padding:'14px 18px',borderLeft:`4px solid ${s.color}` }}>
                  <div style={{ fontSize:10,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:.4,marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:28,fontWeight:800,color:s.color }}>{s.count}</div>
                  <div style={{ fontSize:10,color:'var(--muted)' }}>pack types</div>
                </div>
              ))}
            </div>
 
            {/* Reads viz-cssdp-002 */}
            <PageRenderer page="cssd" module="cssd_packs" only={['table']} />
          </>
        );
      })()}
 
      {/* ══ Methods & Cycles ═══════════════════════════════════ */}
      {activeTab === 'methods' && (() => {
        const guard = tabGuard(batchesConn, 'cssd_batches', 'cssd', batchesState);
        if (guard) return guard;
 
        const batches = batchesState.rows;
        const methodMap = {};
        batches.forEach(b => {
          const m = b.method || 'Unspecified';
          if (!methodMap[m]) methodMap[m] = { method:m, batches:0, processed:0, sterilized:0 };
          methodMap[m].batches++;
          methodMap[m].processed  += n(b.processed);
          methodMap[m].sterilized += n(b.sterilized);
        });
        const methodRows = Object.values(methodMap).sort((a,b)=>b.processed-a.processed);
 
        return (
          <>
            <div style={{ fontSize:10.5, color:'var(--muted)', marginBottom:12 }}>
              Note: average cycle time (minutes) isn't tracked per batch in the current sheet — this would
              need a start/end timestamp per batch to compute for real, so it's left out rather than faked.
            </div>
            <div className={styles.card} style={{ marginBottom:14 }}>
              <div className={styles.cardTitle}>Packs Processed by Method</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={methodRows} margin={{ top:4,right:16,left:0,bottom:0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                  <XAxis dataKey="method" tick={{ fontSize:9, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tip} />
                  <Bar dataKey="processed" radius={[3,3,0,0]}>
                    {methodRows.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Sterilisation Method Performance</div>
              <table className={tableStyles.table}>
                <thead><tr><th>Method</th><th className={tableStyles.right}>Total Batches</th><th className={tableStyles.right}>Packs Processed</th><th className={tableStyles.right}>Pass Rate</th></tr></thead>
                <tbody>
                  {methodRows.map((m,i) => {
                    const passRate = m.processed>0 ? (m.sterilized/m.processed*100) : 0;
                    return (
                      <tr key={m.method}>
                        <td><div style={{ display:'flex',alignItems:'center',gap:8 }}><span style={{ width:10,height:10,borderRadius:'50%',background:COLORS[i%COLORS.length],display:'inline-block' }}></span><span style={{ fontWeight:600 }}>{m.method}</span></div></td>
                        <td className={tableStyles.right}>{m.batches}</td>
                        <td className={tableStyles.right}>{m.processed.toLocaleString()}</td>
                        <td className={tableStyles.right}><span style={{ fontWeight:700,color:passRate>=99?'var(--teal)':'var(--amber)' }}>{passRate.toFixed(1)}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}
 
      {/* ══ Analytics ══════════════════════════════════════════ */}
      {activeTab === 'analytics' && (() => {
        const guard = tabGuard(batchesConn, 'cssd_batches', 'cssd', batchesState);
        if (guard) return guard;
 
        const batches = batchesState.rows;
        const periods = [...new Set(batches.map(b=>b._period).filter(Boolean))].sort();
        const periodMap = {};
        batches.forEach(b => {
          const p = b._period || 'unknown';
          if (!periodMap[p]) periodMap[p] = { period:p, processed:0, sterilized:0, revenue:0, expense:0 };
          periodMap[p].processed  += n(b.processed);
          periodMap[p].sterilized += n(b.sterilized);
          periodMap[p].revenue    += n(b.revenue);
          periodMap[p].expense    += n(b.expense);
        });
        const periodRows = periods.map(p => periodMap[p]);
 
        return (
          <>
            {/* Reads viz-cssdb-007 and viz-cssdb-008 */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
              <PageRenderer page="cssd" module="cssd_batches" only={['grouped_bar']} />
            </div>
 
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Monthly Performance Summary</div>
              <table className={tableStyles.table}>
                <thead><tr><th>Period</th><th className={tableStyles.right}>Processed</th><th className={tableStyles.right}>Sterilised</th><th className={tableStyles.right}>Pass Rate</th><th className={tableStyles.right}>Revenue</th><th className={tableStyles.right}>Expense</th><th className={tableStyles.right}>Margin</th></tr></thead>
                <tbody>
                  {periodRows.map(r => {
                    const rate = r.processed>0 ? (r.sterilized/r.processed*100).toFixed(1) : 0;
                    const mgn  = r.revenue>0 ? ((r.revenue-r.expense)/r.revenue*100).toFixed(1) : 0;
                    return (
                      <tr key={r.period}>
                        <td style={{ fontWeight:600 }}>{r.period}</td>
                        <td className={tableStyles.right}>{r.processed.toLocaleString()}</td>
                        <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{r.sterilized.toLocaleString()}</td>
                        <td className={tableStyles.right}><span style={{ fontWeight:700,color:+rate>=99?'var(--teal)':'var(--amber)' }}>{rate}%</span></td>
                        <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(r.revenue)}</td>
                        <td className={tableStyles.right} style={{ color:'var(--red)' }}>{fmt(r.expense)}</td>
                        <td className={tableStyles.right}><span style={{ fontWeight:700,color:+mgn>60?'var(--teal)':'var(--amber)' }}>{mgn}%</span></td>
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