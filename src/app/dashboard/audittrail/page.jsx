'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { COLORS } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
 
ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Filler, Tooltip, Legend
);
 
const FONT  = { family: "'Inter','Segoe UI',Arial,sans-serif", size: 10 };
const GRID  = 'rgba(0,0,0,0.05)';
const BASE  = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const LEG_B = { display: true, position: 'bottom', labels: { font: FONT, boxWidth: 10 } };
 
/* ── seed audit log ─────────────────────────────────────────────────────── */
const SEED_AUDIT = [
  { id:1,  ts:'2025-11-28T10:44:00Z', user:'C. Mensah',  role:'Finance',     module:'Finance',     action:'Revenue Updated',          prev:'₦152.8M',          next:'₦155.1M',             ref:'NOV-2025-REV' },
  { id:2,  ts:'2025-11-28T09:15:00Z', user:'N. Peters',  role:'Store',       module:'Stores',      action:'Stock Issued',             prev:'Cannula 18G: 2,400',next:'Cannula 18G: 2,380',  ref:'ISS-2025-1134' },
  { id:3,  ts:'2025-11-27T16:30:00Z', user:'T. Fashola', role:'Payables',    module:'Payables',    action:'Invoice Added',            prev:'—',                next:'₦3,450,000',          ref:'INV-PHM-089' },
  { id:4,  ts:'2025-11-27T14:00:00Z', user:'Billing Dept',role:'Billing',    module:'Billing',     action:'HMO Claim Submitted',      prev:'Pending',          next:'Submitted',           ref:'HMO-LAG-2025-44' },
  { id:5,  ts:'2025-11-26T11:20:00Z', user:'C. Mensah',  role:'Finance',     module:'Finance',     action:'Debtor Record Updated',    prev:'₦29.0M',           next:'₦37.3M',              ref:'DEB-NOV-2025' },
  { id:6,  ts:'2025-11-25T09:05:00Z', user:'N. Peters',  role:'Store',       module:'Stores',      action:'SRV Posted',               prev:'—',                next:'₦9,202,204',          ref:'SRV-NOV-001' },
  { id:7,  ts:'2025-11-24T15:40:00Z', user:'C. Mensah',  role:'Admin',       module:'System',      action:'PIN Changed',              prev:'****',             next:'****',                ref:'SYS-SEC-001' },
  { id:8,  ts:'2025-11-23T10:10:00Z', user:'T. Fashola', role:'Finance',     module:'Finance',     action:'Expense Entry',            prev:'₦56.3M',           next:'₦58.7M',              ref:'EXP-NOV-2025' },
  { id:9,  ts:'2025-11-22T14:00:00Z', user:'Procurement',role:'Procurement', module:'Procurement', action:'Gate 2 — Vendor Approved', prev:'Awaiting Approval', next:'Vendor Approved',    ref:'PR-000001' },
  { id:10, ts:'2025-11-22T08:30:00Z', user:'Procurement',role:'Procurement', module:'Procurement', action:'Recommendation Submitted', prev:'—',                next:'Pharmaplus · ₦4.5M',  ref:'PR-000001' },
  { id:11, ts:'2025-11-21T11:00:00Z', user:'Finance',    role:'Payables',    module:'Payables',    action:'Mark as Paid',             prev:'Awaiting Payment', next:'Paid — ₦185,000',     ref:'PAY-0002' },
  { id:12, ts:'2025-11-20T10:15:00Z', user:'Management', role:'Admin',       module:'Procurement', action:'Gate 1 — Approved',        prev:'Pending',          next:'Approved',            ref:'PR-000001' },
  { id:13, ts:'2025-11-20T09:00:00Z', user:'Pharmacy Unit',role:'Pharmacy',  module:'Requisition',  action:'Request Created',          prev:'—',                next:'IV Fluids ×4',        ref:'PR-000001' },
  { id:14, ts:'2025-11-19T13:25:00Z', user:'Store Unit', role:'Store',       module:'Stores',      action:'Asset Added',              prev:'—',                next:'Patient Monitor ×6',  ref:'AST-009' },
  { id:15, ts:'2025-11-18T15:00:00Z', user:'Procurement',role:'Procurement', module:'Procurement', action:'Vendor Confirmed PO',      prev:'PO Issued',        next:'Vendor Confirmed',    ref:'PO-111502' },
  { id:16, ts:'2025-11-17T09:00:00Z', user:'Procurement',role:'Procurement', module:'Procurement', action:'Purchase Order Issued',    prev:'—',                next:'PO-111502',           ref:'PR-000005' },
  { id:17, ts:'2025-11-16T11:00:00Z', user:'Management', role:'Admin',       module:'Procurement', action:'Gate 1 — Approved',        prev:'Pending',          next:'Approved',            ref:'PR-000005' },
  { id:18, ts:'2025-11-15T09:00:00Z', user:'Finance Unit',role:'Finance',    module:'Requisition',  action:'Request Created',          prev:'—',                next:'Stationery ×1',       ref:'PR-000005' },
  { id:19, ts:'2025-11-14T16:45:00Z', user:'N. Peters',  role:'Store',       module:'Stores',      action:'Low Stock Alert Triggered',prev:'Above reorder',    next:'Below reorder — 8 units', ref:'STK-CAN18G' },
  { id:20, ts:'2025-11-12T10:30:00Z', user:'C. Mensah',  role:'Finance',     module:'Finance',     action:'Budget Set',               prev:'—',                next:'₦360,000,000 (Pharmacy)', ref:'BUD-PHARM-2025' },
  { id:21, ts:'2025-11-10T08:00:00Z', user:'System',     role:'System',      module:'System',      action:'Auto-Backup Completed',    prev:'—',                next:'Snapshot saved',      ref:'BKP-2025-11-10' },
  { id:22, ts:'2025-11-08T14:20:00Z', user:'T. Fashola', role:'Payables',    module:'Payables',    action:'Invoice Disputed',         prev:'Pending',          next:'Disputed',            ref:'PAY-006' },
  { id:23, ts:'2025-11-05T11:10:00Z', user:'C. Mensah',  role:'Finance',     module:'Finance',     action:'Receipt Issued',           prev:'—',                next:'₦14,200,000',         ref:'RCT-001' },
  { id:24, ts:'2025-11-01T09:30:00Z', user:'Billing Dept',role:'Billing',    module:'Billing',     action:'Invoice Created',          prev:'—',                next:'₦4,515,000',          ref:'INV-2025-001' },
];
 
const MODULE_COLOR = {
  Finance:'#1B4F72', Stores:'#117A65', Payables:'#C0392B', Billing:'#6C3483',
  Procurement:'#CA6F1E', Requisition:'#2980B9', System:'#7F8C8D',
};
 
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1)  return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
 
/* ════════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function AuditTrailPage() {
  const [audit]          = useState(SEED_AUDIT);
  const [search,         setSearch]         = useState('');
  const [moduleFilter,   setModuleFilter]   = useState('All');
  const [userFilter,     setUserFilter]     = useState('All');
  const [periodFilter,   setPeriodFilter]   = useState('30');
  const [detailEntry,    setDetailEntry]    = useState(null);
 
  /* ── KPIs ─────────────────────────────────────────────────────────── */
  const totalEntries  = audit.length;
  const todayEntries  = audit.filter(a => new Date(a.ts).toDateString() === new Date('2025-11-28').toDateString()).length;
  const uniqueUsers    = new Set(audit.map(a=>a.user)).size;
  const uniqueModules  = new Set(audit.map(a=>a.module)).size;
  const systemEntries  = audit.filter(a => a.role === 'System').length;
  const last7Days      = audit.filter(a => (new Date('2025-11-28') - new Date(a.ts)) / 864e5 <= 7).length;
 
  /* ── filtered list ────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const cutoffDays = periodFilter === 'today' ? 1 : periodFilter === '7' ? 7 : periodFilter === '30' ? 30 : 99999;
    return audit
      .filter(a =>
        (!q || a.user.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || a.ref.toLowerCase().includes(q) || a.module.toLowerCase().includes(q)) &&
        (moduleFilter === 'All' || a.module === moduleFilter) &&
        (userFilter   === 'All' || a.user   === userFilter) &&
        ((new Date('2025-11-28') - new Date(a.ts)) / 864e5 <= cutoffDays)
      )
      .sort((a,b) => new Date(b.ts) - new Date(a.ts));
  }, [audit, search, moduleFilter, userFilter, periodFilter]);
 
  /* ── analytics ────────────────────────────────────────────────────── */
  const byModule = useMemo(() => {
    const m = {};
    audit.forEach(a => { m[a.module] = (m[a.module]||0) + 1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [audit]);
 
  const byUser = useMemo(() => {
    const m = {};
    audit.forEach(a => { m[a.user] = (m[a.user]||0) + 1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8);
  }, [audit]);
 
  const byDay = useMemo(() => {
    const m = {};
    audit.forEach(a => {
      const day = new Date(a.ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
      m[day] = (m[day]||0) + 1;
    });
    return Object.entries(m).reverse();
  }, [audit]);
 
  const allModules = ['All', ...new Set(audit.map(a=>a.module))];
  const allUsers    = ['All', ...new Set(audit.map(a=>a.user))];
 
  function exportCSV() {
    const rows = ['Date/Time,User,Role,Module,Action,Previous Value,New Value,Reference'];
    filtered.forEach(a => rows.push(`"${a.ts}","${a.user}","${a.role}","${a.module}","${a.action}","${a.prev}","${a.next}","${a.ref}"`));
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([rows.join('\n')], { type:'text/csv' }));
    el.download = 'audit_trail.csv'; el.click();
  }
 
  return (
    <div>
 
      {/* ── Detail Modal ──────────────────────────────────────────────── */}
      {detailEntry && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, width:520, maxWidth:'96vw', boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:15, fontWeight:800, color:'var(--navy)' }}>📋 Audit Entry Detail</span>
              <button onClick={()=>setDetailEntry(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--muted)', lineHeight:1 }}>✕</button>
            </div>
            <div style={{ padding:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <span style={{ width:36, height:36, borderRadius:'50%', background: MODULE_COLOR[detailEntry.module] ?? '#888', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, flexShrink:0 }}>
                  {detailEntry.user.split(' ').map(w=>w[0]).join('').slice(0,2)}
                </span>
                <div>
                  <div style={{ fontWeight:800, fontSize:13, color:'var(--navy)' }}>{detailEntry.action}</div>
                  <div style={{ fontSize:10, color:'var(--muted)' }}>by {detailEntry.user} ({detailEntry.role})</div>
                </div>
              </div>
 
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px', fontSize:11, marginBottom:16, padding:'12px 14px', background:'#f8fafc', borderRadius:8 }}>
                {[
                  ['Module',    detailEntry.module],
                  ['Reference', detailEntry.ref],
                  ['Date',      new Date(detailEntry.ts).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })],
                  ['Time',      new Date(detailEntry.ts).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })],
                ].map(([k,v])=>(
                  <div key={k}><span style={{ fontWeight:700, color:'var(--muted)' }}>{k}: </span><span style={{ fontWeight:600, color:'var(--navy)' }}>{v}</span></div>
                ))}
              </div>
 
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:10, alignItems:'center', marginBottom:6 }}>
                <div style={{ background:'#f8d7da', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'#721c24', textTransform:'uppercase', letterSpacing:.3, marginBottom:4 }}>Previous Value</div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#721c24' }}>{detailEntry.prev}</div>
                </div>
                <span style={{ fontSize:18, color:'var(--muted)' }}>→</span>
                <div style={{ background:'#d4edda', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'#155724', textTransform:'uppercase', letterSpacing:.3, marginBottom:4 }}>New Value</div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#155724' }}>{detailEntry.next}</div>
                </div>
              </div>
            </div>
            <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
              <button onClick={()=>setDetailEntry(null)} className={styles.btnGhost}>Close</button>
            </div>
          </div>
        </div>
      )}
 
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>📋 Audit Trail</h2>
          <p className={styles.pageMeta}>Complete change log — every ERP action timestamped &amp; traceable</p>
        </div>
        <button className={styles.btnGhost} onClick={exportCSV}>⬇ Export CSV</button>
      </div>
 
      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Log Entries"  value={totalEntries.toString()}   delta="All time"                deltaType="neutral" color="blue"   />
        <KPICard label="Entries Today"      value={todayEntries.toString()}   delta="28 Nov 2025"              deltaType="up"      color="green"  />
        <KPICard label="Last 7 Days"        value={last7Days.toString()}      delta="Recent activity"          deltaType="neutral" color="teal"   />
        <KPICard label="Active Users"       value={uniqueUsers.toString()}    delta="Users with actions"       deltaType="neutral" color="purple" />
        <KPICard label="Modules Touched"    value={uniqueModules.toString()}  delta="Across the system"        deltaType="neutral" color="amber"  />
        <KPICard label="System-Generated"   value={systemEntries.toString()}  delta="Automated entries"        deltaType="neutral" color="blue"   />
      </div>
 
      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <input className={styles.toolbarSearch} placeholder="🔍 Search user / action / reference / module…"
          value={search} onChange={e=>setSearch(e.target.value)} />
        <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
          value={moduleFilter} onChange={e=>setModuleFilter(e.target.value)}>
          {allModules.map(m=><option key={m}>{m}</option>)}
        </select>
        <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
          value={userFilter} onChange={e=>setUserFilter(e.target.value)}>
          {allUsers.map(u=><option key={u}>{u}</option>)}
        </select>
        <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
          value={periodFilter} onChange={e=>setPeriodFilter(e.target.value)}>
          <option value="today">Today</option>
          <option value="7">Last 7 Days</option>
          <option value="30">This Month</option>
          <option value="all">All Time</option>
        </select>
        <span className={styles.spacer}/>
        <span style={{ fontSize:11,color:'var(--muted)' }}>{filtered.length} entries</span>
      </div>
 
      {/* ── Change Log Table ───────────────────────────────────────────── */}
      <div className={tableStyles.tableBox}>
        <div className={tableStyles.tableTitle}>Change Log</div>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Time</th><th>User</th><th>Module</th><th>Action</th>
              <th>Previous Value</th><th>New Value</th><th>Reference</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} onClick={()=>setDetailEntry(a)} style={{ cursor:'pointer' }}>
                <td style={{ fontSize:10, whiteSpace:'nowrap', color:'var(--muted)' }}>
                  {new Date(a.ts).toLocaleDateString('en-GB',{ day:'2-digit',month:'short' })} · {new Date(a.ts).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                  <div style={{ fontSize:9, color:'#aaa' }}>{timeAgo(a.ts)}</div>
                </td>
                <td style={{ fontWeight:700 }}>{a.user}</td>
                <td>
                  <span className={`${tableStyles.badge} ${tableStyles.blue}`} style={{ background: (MODULE_COLOR[a.module]??'#888')+'22', color: MODULE_COLOR[a.module]??'#888' }}>
                    {a.module}
                  </span>
                </td>
                <td style={{ fontWeight:600 }}>{a.action}</td>
                <td style={{ color:'var(--red)', fontSize:10, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.prev}</td>
                <td style={{ color:'var(--teal)', fontSize:10, fontWeight:600, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.next}</td>
                <td style={{ fontFamily:'monospace', fontSize:9, color:'var(--muted)' }}>{a.ref}</td>
                <td><span style={{ fontSize:10, color:'var(--navy)' }}>→</span></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className={tableStyles.emptyState}>
                <div className={tableStyles.emptyIcon}>📭</div>
                <div className={tableStyles.emptyLabel}>No audit records found</div>
                <div className={tableStyles.emptyHint}>Try adjusting your filters.</div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
 
      {/* ── Analytics ───────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Activity by Module</div>
          <div style={{ height:200 }}>
            <Bar
              data={{ labels:byModule.map(e=>e[0]), datasets:[{ data:byModule.map(e=>e[1]), backgroundColor:byModule.map(e=>MODULE_COLOR[e[0]]??COLORS[0]), borderRadius:4 }] }}
              options={{ ...BASE, scales:{ x:{ grid:{display:false},ticks:{font:FONT} }, y:{ grid:{color:GRID},ticks:{font:FONT,stepSize:1} } } }}
            />
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Most Active Users</div>
          <div style={{ height:200 }}>
            <Bar
              data={{ labels:byUser.map(e=>e[0]), datasets:[{ data:byUser.map(e=>e[1]), backgroundColor:COLORS, borderRadius:4 }] }}
              options={{ ...BASE, indexAxis:'y', scales:{ x:{ grid:{color:GRID},ticks:{font:FONT,stepSize:1} }, y:{ grid:{display:false},ticks:{font:FONT} } } }}
            />
          </div>
        </div>
      </div>
 
      <div className={styles.card} style={{ marginBottom:20 }}>
        <div className={styles.cardTitle}>Module Activity Distribution</div>
        <div style={{ height:220, maxWidth:400, margin:'0 auto' }}>
          <Doughnut
            data={{ labels:byModule.map(e=>e[0]), datasets:[{ data:byModule.map(e=>e[1]), backgroundColor:byModule.map(e=>MODULE_COLOR[e[0]]??COLORS[0]), borderWidth:2, borderColor:'#fff' }] }}
            options={{ responsive:true, maintainAspectRatio:false, cutout:'55%', plugins:{ legend:LEG_B } }}
          />
        </div>
      </div>
    </div>
  );
}