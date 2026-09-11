'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { fmt, COLORS } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js';

 
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);
 
const FONT  = { family: "'Inter','Segoe UI',Arial,sans-serif", size: 10 };
const GRID  = 'rgba(0,0,0,0.05)';
const BASE  = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const LEG_B = { display: true, position: 'bottom', labels: { font: FONT, boxWidth: 10 } };
 
/* ── seed data ──────────────────────────────────────────────────────────── */
const SEED_APPROVALS = [
  {
    id:'APR-001', title:'Emergency Drug Procurement', dept:'Pharmacy', requester:'Ngozi Peters',
    role:'pharmacy', amount:4_500_000, priority:'HIGH',
    description:'Emergency procurement of IV fluids and antibiotics due to critical stock shortage. Ward supply at risk without immediate action.',
    category:'Procurement', submitted:'2025-11-28', daysWaiting:2,
    status:'PENDING', comments:'', queryNote:'',
    history:[{ ts:'2025-11-28T09:00:00Z', action:'Submitted', by:'Ngozi Peters', note:'Request submitted for urgent approval.' }],
  },
  {
    id:'APR-002', title:'Equipment Maintenance Contract', dept:'Maintenance', requester:'Tunde Fashola',
    role:'admin', amount:1_200_000, priority:'MEDIUM',
    description:'Annual maintenance contract renewal for CT scanner and MRI machine. Current contract expires December 5th.',
    category:'Contract', submitted:'2025-11-27', daysWaiting:1,
    status:'PENDING', comments:'', queryNote:'',
    history:[{ ts:'2025-11-27T10:00:00Z', action:'Submitted', by:'Tunde Fashola', note:'Renewal required before Dec 5.' }],
  },
  {
    id:'APR-003', title:'Staff Training — Financial Systems', dept:'Finance', requester:'Chidi Mensah',
    role:'revenue', amount:350_000, priority:'LOW',
    description:'Two-day training workshop on the new ERP financial reporting modules. 5 staff members to attend.',
    category:'Training', submitted:'2025-11-20', daysWaiting:8,
    status:'APPROVED', comments:'Approved. Schedule for December 10–11.',
    queryNote:'',
    history:[
      { ts:'2025-11-20T09:00:00Z', action:'Submitted',  by:'Chidi Mensah', note:'Staff training request.' },
      { ts:'2025-11-21T11:00:00Z', action:'Approved',   by:'Management',   note:'Approved. Schedule for December 10–11.' },
    ],
  },
  {
    id:'APR-004', title:'Generator Fuel Top-Up', dept:'Maintenance', requester:'Store Unit',
    role:'store', amount:180_000, priority:'LOW',
    description:'Diesel top-up for hospital generators — 500 litres. Current reserve at 15%.',
    category:'Operations', submitted:'2025-11-18', daysWaiting:10,
    status:'APPROVED', comments:'Routine. Approved.',
    queryNote:'',
    history:[
      { ts:'2025-11-18T09:00:00Z', action:'Submitted', by:'Store Unit',   note:'Diesel top-up request.' },
      { ts:'2025-11-19T09:00:00Z', action:'Approved',  by:'Management',   note:'Routine. Approved.' },
    ],
  },
  {
    id:'APR-005', title:'Temporary Staff Agency Invoice', dept:'HR', requester:'HR Unit',
    role:'admin', amount:2_800_000, priority:'MEDIUM',
    description:'Invoice for 8 temporary nurses supplied by MedStaff Agency in October 2025.',
    category:'HR', submitted:'2025-11-15', daysWaiting:13,
    status:'REJECTED', comments:'Query with agency re: actual hours worked. Resubmit with verified timesheets.',
    queryNote:'',
    history:[
      { ts:'2025-11-15T09:00:00Z', action:'Submitted', by:'HR Unit',      note:'Temp staff invoice.' },
      { ts:'2025-11-16T14:00:00Z', action:'Queried',   by:'Management',   note:'Please provide verified timesheets from the agency.' },
      { ts:'2025-11-20T11:00:00Z', action:'Rejected',  by:'Management',   note:'Insufficient documentation. Resubmit with timesheet.' },
    ],
  },
  {
    id:'APR-006', title:'Radiology Consumables — Monthly', dept:'Radiology', requester:'Radiology Unit',
    role:'radiology', amount:1_400_000, priority:'MEDIUM',
    description:'Monthly replenishment of CT contrast media and X-ray films.',
    category:'Procurement', submitted:'2025-11-25', daysWaiting:3,
    status:'QUERIED', comments:'', queryNote:'Please provide 3 vendor quotations before approval can be granted.',
    history:[
      { ts:'2025-11-25T08:00:00Z', action:'Submitted', by:'Radiology Unit', note:'Monthly consumable order.' },
      { ts:'2025-11-26T10:00:00Z', action:'Queried',   by:'Management',     note:'Please provide 3 vendor quotations before approval.' },
    ],
  },
  {
    id:'APR-007', title:'Phaco Machine Spare Parts', dept:'Ophthalmology', requester:'Ophthal Unit',
    role:'ophthal', amount:650_000, priority:'HIGH',
    description:'Replacement parts for the phacoemulsification machine. Currently limiting cataract surgery output.',
    category:'Procurement', submitted:'2025-11-26', daysWaiting:2,
    status:'PENDING', comments:'', queryNote:'',
    history:[{ ts:'2025-11-26T09:00:00Z', action:'Submitted', by:'Ophthal Unit', note:'Urgent — machine limiting surgical output.' }],
  },
  {
    id:'APR-008', title:'Office Renovation — Admin Block', dept:'Administration', requester:'Admin Unit',
    role:'admin', amount:3_200_000, priority:'LOW',
    description:'Minor renovation of admin block: painting, ceiling replacement, and electrical upgrade.',
    category:'Facilities', submitted:'2025-11-10', daysWaiting:18,
    status:'APPROVED', comments:'Approved subject to 3 contractor quotes. Finance to release in tranches.',
    queryNote:'',
    history:[
      { ts:'2025-11-10T09:00:00Z', action:'Submitted', by:'Admin Unit',  note:'Admin block renovation.' },
      { ts:'2025-11-12T10:00:00Z', action:'Queried',   by:'Management', note:'Please get 3 contractor quotes.' },
      { ts:'2025-11-22T14:00:00Z', action:'Approved',  by:'Management', note:'Approved subject to quotes. Tranche payments.' },
    ],
  },
];
 
/* ── helpers ─────────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  PENDING:  { bg:'#FFF9E6', border:'#F4D03F', badge:tableStyles.amber, icon:'⏳', label:'Pending'  },
  APPROVED: { bg:'#EAF6EE', border:'#2ECC71', badge:tableStyles.green,  icon:'✅', label:'Approved' },
  REJECTED: { bg:'#FEECEC', border:'#F1948A', badge:tableStyles.red,    icon:'❌', label:'Rejected' },
  QUERIED:  { bg:'#FFF9E6', border:'#F39C12', badge:tableStyles.amber,  icon:'🟠', label:'Queried'  },
};
 
const PRIORITY_CFG = {
  HIGH:   { badge:tableStyles.red,   color:'#C0392B' },
  MEDIUM: { badge:tableStyles.amber, color:'#CA6F1E' },
  LOW:    { badge:tableStyles.grey,  color:'#7F8C8D' },
};
 
const inp = {
  padding:'7px 9px', border:'1.5px solid var(--border)', borderRadius:6,
  fontSize:11, outline:'none', width:'100%', fontFamily:'inherit', boxSizing:'border-box',
};
 
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status];
  return <span className={`${tableStyles.badge} ${cfg?.badge ?? tableStyles.grey}`}>{cfg?.label ?? status}</span>;
}
 
function PriorityBadge({ priority }) {
  return <span className={`${tableStyles.badge} ${PRIORITY_CFG[priority]?.badge ?? tableStyles.grey}`}>{priority}</span>;
}
 
function Timeline({ history }) {
  return (
    <div>
      {[...history].reverse().map((h, i, arr) => (
        <div key={i} style={{ display:'flex', gap:10, paddingBottom:10, position:'relative' }}>
          {i < arr.length - 1 && (
            <div style={{ position:'absolute', left:5, top:14, bottom:0, width:2, background:'#e0e4ea' }} />
          )}
          <div style={{ width:12, height:12, borderRadius:'50%', background:'var(--teal)', flexShrink:0, marginTop:3, zIndex:1 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:11, color:'var(--navy)' }}>{h.action}</div>
            {h.note && <div style={{ fontSize:10, color:'var(--muted)', marginTop:1, fontStyle:'italic' }}>{h.note}</div>}
            <div style={{ fontSize:9, color:'#aaa', marginTop:2 }}>
              {new Date(h.ts).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})} · {h.by}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
 
/* ── Approval Detail Panel ───────────────────────────────────────────────── */
function DetailPanel({ req, onClose, onUpdate }) {
  const [local,      setLocal]      = useState(req);
  const [remark,     setRemark]     = useState('');
  const [queryNote,  setQueryNote]  = useState('');
  const [showAction, setShowAction] = useState(null); // 'approve' | 'reject' | 'query'
 
  function pushAndUpdate(status, action, note, extra = {}) {
    const entry = { ts: new Date().toISOString(), action, by:'Management', note };
    const updated = {
      ...local, ...extra, status,
      comments: status !== 'QUERIED' ? note : local.comments,
      queryNote: status === 'QUERIED' ? note : local.queryNote,
      history: [...local.history, entry],
    };
    setLocal(updated);
    onUpdate(updated);
    setShowAction(null);
    setRemark('');
    setQueryNote('');
  }
 
  function doApprove() {
    if (!remark.trim()) { alert('Please enter an approval remark.'); return; }
    pushAndUpdate('APPROVED', 'Approved', remark);
  }
  function doReject() {
    if (!remark.trim()) { alert('A reason for rejection is required.'); return; }
    pushAndUpdate('REJECTED', 'Rejected', remark);
  }
  function doQuery() {
    if (!queryNote.trim()) { alert('Please describe what information is needed.'); return; }
    pushAndUpdate('QUERIED', 'Queried', queryNote);
  }
 
  const cfg = STATUS_CFG[local.status];
 
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:12, width:640, maxWidth:'96vw', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
 
        {/* Header */}
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <span style={{ fontSize:15, fontWeight:800, color:'var(--navy)' }}>{cfg?.icon} {local.title}</span>
            <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{local.id} · {local.dept} · Submitted {local.submitted}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--muted)', lineHeight:1 }}>✕</button>
        </div>
 
        <div style={{ padding:18, overflowY:'auto', flex:1 }}>
 
          {/* Status banner */}
          <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:cfg?.bg, border:`1px solid ${cfg?.border}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:800, fontSize:12 }}>{cfg?.icon} Status: {local.status}</span>
              <div style={{ display:'flex', gap:6 }}>
                <PriorityBadge priority={local.priority} />
                <span className={`${tableStyles.badge} ${tableStyles.blue}`}>{local.category}</span>
              </div>
            </div>
            {local.comments && <div style={{ fontSize:11, marginTop:6, fontStyle:'italic' }}>💬 {local.comments}</div>}
            {local.queryNote && <div style={{ fontSize:11, marginTop:6, color:'#856404' }}>🟠 Query: {local.queryNote}</div>}
          </div>
 
          {/* Info grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 20px', fontSize:11, marginBottom:14, padding:'12px 14px', background:'#f8fafc', borderRadius:8 }}>
            {[
              ['Department',    local.dept],
              ['Requested By',  local.requester],
              ['Amount',        fmt(local.amount)],
              ['Priority',      local.priority],
              ['Date Submitted',local.submitted],
              ['Days Waiting',  `${local.daysWaiting} day${local.daysWaiting!==1?'s':''}`],
            ].map(([k,v])=>(
              <div key={k}><span style={{ fontWeight:700, color:'var(--muted)' }}>{k}: </span><span style={{ fontWeight:600, color:'var(--navy)' }}>{v}</span></div>
            ))}
          </div>
 
          {/* Description */}
          <div style={{ marginBottom:14, padding:'12px 14px', background:'#fff', border:'1px solid var(--border)', borderRadius:8 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', letterSpacing:.4, marginBottom:6 }}>Request Description</div>
            <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.7 }}>{local.description}</div>
          </div>
 
          {/* Action area */}
          {local.status === 'PENDING' || local.status === 'QUERIED' ? (
            <div style={{ marginBottom:14, padding:'14px 16px', background:'#fff', border:'1px solid var(--border)', borderRadius:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)', marginBottom:12 }}>Management Action</div>
 
              {!showAction ? (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button onClick={()=>setShowAction('approve')} className={styles.btnSecondary}>✅ Approve</button>
                  <button onClick={()=>setShowAction('query')}
                    style={{ padding:'6px 14px', background:'#fff', color:'#856404', border:'1.5px solid #F4D03F', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    🟠 Query / Request Info
                  </button>
                  <button onClick={()=>setShowAction('reject')}
                    style={{ padding:'6px 14px', background:'#fff', color:'var(--red)', border:'1.5px solid var(--red)', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    ❌ Reject
                  </button>
                </div>
              ) : showAction === 'approve' ? (
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--navy)', marginBottom:8 }}>Approval Remark <span style={{ color:'var(--red)' }}>*</span></div>
                  <textarea style={{ ...inp, resize:'vertical', minHeight:70, marginBottom:10 }}
                    placeholder="Enter your approval remark…"
                    value={remark} onChange={e=>setRemark(e.target.value)} />
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={doApprove} className={styles.btnSecondary}>✅ Confirm Approval</button>
                    <button onClick={()=>{setShowAction(null);setRemark('');}} className={styles.btnGhost}>Cancel</button>
                  </div>
                </div>
              ) : showAction === 'reject' ? (
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--red)', marginBottom:8 }}>Reason for Rejection <span style={{ color:'var(--red)' }}>*</span></div>
                  <textarea style={{ ...inp, resize:'vertical', minHeight:70, marginBottom:10 }}
                    placeholder="Provide a clear reason for rejecting this request…"
                    value={remark} onChange={e=>setRemark(e.target.value)} />
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={doReject}
                      style={{ padding:'6px 14px', background:'var(--red)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                      ❌ Confirm Rejection
                    </button>
                    <button onClick={()=>{setShowAction(null);setRemark('');}} className={styles.btnGhost}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#856404', marginBottom:8 }}>What information do you need? <span style={{ color:'var(--red)' }}>*</span></div>
                  <textarea style={{ ...inp, resize:'vertical', minHeight:70, marginBottom:10 }}
                    placeholder="Describe the clarification or documentation needed…"
                    value={queryNote} onChange={e=>setQueryNote(e.target.value)} />
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={doQuery}
                      style={{ padding:'6px 14px', background:'#CA6F1E', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                      🟠 Send Query
                    </button>
                    <button onClick={()=>{setShowAction(null);setQueryNote('');}} className={styles.btnGhost}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:8, background:cfg?.bg, border:`1px solid ${cfg?.border}`, fontSize:11, fontWeight:700 }}>
              {local.status === 'APPROVED' ? '✅ This request has been approved. No further action required.' : '❌ This request was rejected and is now closed.'}
            </div>
          )}
 
          {/* Timeline */}
          <div style={{ marginBottom:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)', marginBottom:10 }}>Approval History</div>
            <Timeline history={local.history} />
          </div>
        </div>
 
        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', flexShrink:0 }}>
          <button onClick={onClose} className={styles.btnGhost}>Close</button>
        </div>
      </div>
    </div>
  );
}
 
/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function ApprovalsPage() {
  const [activeTab,    setActiveTab]    = useState('pending');
  const [approvals,    setApprovals]    = useState(SEED_APPROVALS);
  const [detailReq,    setDetailReq]    = useState(null);
  const [search,       setSearch]       = useState('');
  const [deptFilter,   setDeptFilter]   = useState('All');
  const [catFilter,    setCatFilter]    = useState('All');
  const [priFilter,    setPriFilter]    = useState('All');
 
  function updateApproval(updated) {
    setApprovals(p => p.map(a => a.id === updated.id ? updated : a));
  }
 
  /* ── KPIs ─────────────────────────────────────────────────────────── */
  const pending    = approvals.filter(a => a.status === 'PENDING');
  const queried    = approvals.filter(a => a.status === 'QUERIED');
  const approved   = approvals.filter(a => a.status === 'APPROVED');
  const rejected   = approvals.filter(a => a.status === 'REJECTED');
  const pendingHigh= pending.filter(a => a.priority === 'HIGH');
  const pendingVal = pending.reduce((s,a) => s+a.amount, 0);
  const totalVal   = approvals.reduce((s,a) => s+a.amount, 0);
  const approvedVal= approved.reduce((s,a) => s+a.amount, 0);
 
  /* ── filtered list ────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const statusMap = { pending:'PENDING', approved:'APPROVED', rejected:'REJECTED', queried:'QUERIED' };
    const targetStatus = statusMap[activeTab];
    return approvals
      .filter(a =>
        (!targetStatus || a.status === targetStatus) &&
        (!q || a.title.toLowerCase().includes(q) || a.dept.toLowerCase().includes(q) || a.requester.toLowerCase().includes(q)) &&
        (deptFilter === 'All' || a.dept      === deptFilter) &&
        (catFilter  === 'All' || a.category  === catFilter)  &&
        (priFilter  === 'All' || a.priority  === priFilter)
      )
      .sort((a,b) => {
        const priOrd = { HIGH:0, MEDIUM:1, LOW:2 };
        return priOrd[a.priority] - priOrd[b.priority] || new Date(b.submitted) - new Date(a.submitted);
      });
  }, [approvals, activeTab, search, deptFilter, catFilter, priFilter]);
 
  /* ── analytics ────────────────────────────────────────────────────── */
  const byStatus = [
    { label:'Pending',  count:pending.length,  color:'#CA6F1E', bg:'#fff3cd' },
    { label:'Queried',  count:queried.length,  color:'#F39C12', bg:'#fef9e7' },
    { label:'Approved', count:approved.length, color:'#117A65', bg:'#d4edda' },
    { label:'Rejected', count:rejected.length, color:'#C0392B', bg:'#f8d7da' },
  ];
 
  const byDept = useMemo(() => {
    const m = {};
    approvals.forEach(a => { m[a.dept] = (m[a.dept]||0) + 1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [approvals]);
 
  const byCategory = useMemo(() => {
    const m = {};
    approvals.forEach(a => { m[a.category] = (m[a.category]||0) + a.amount; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [approvals]);
 
  const allDepts = ['All', ...new Set(approvals.map(a=>a.dept))];
  const allCats  = ['All', ...new Set(approvals.map(a=>a.category))];
 
  const TABS = [
    { id:'pending',  label:'⏳ Pending',  count:pending.length   },
    { id:'queried',  label:'🟠 Queried',  count:queried.length   },
    { id:'approved', label:'✅ Approved', count:approved.length  },
    { id:'rejected', label:'❌ Rejected', count:rejected.length  },
    { id:'all',      label:'All',         count:approvals.length },
  ];
 
  return (
    <div>
 
      {detailReq && (
        <DetailPanel
          req={detailReq}
          onClose={()=>setDetailReq(null)}
          onUpdate={updated=>{ updateApproval(updated); setDetailReq(updated); }}
        />
      )}
 
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>✅ Approvals</h2>
          <p className={styles.pageMeta}>All departmental approval requests · Review · Approve · Query · Reject</p>
        </div>
        <button className={styles.btnGhost} onClick={() => {
          const rows = ['ID,Title,Dept,Requester,Amount,Priority,Category,Submitted,Status,Comments'];
          approvals.forEach(a => rows.push(`"${a.id}","${a.title}","${a.dept}","${a.requester}",${a.amount},"${a.priority}","${a.category}","${a.submitted}","${a.status}","${a.comments}"`));
          const el = document.createElement('a');
          el.href = URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));
          el.download = 'approvals.csv'; el.click();
        }}>⬇ Export CSV</button>
      </div>
 
      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Pending Approval"    value={pending.length.toString()}    delta={`${pendingHigh.length} high priority`}  deltaType={pending.length>0?'warn':'up'}    badge={pending.length>0?'Action':'Clear'}   badgeType={pending.length>0?'warn':'good'} color={pending.length>0?'amber':'green'} />
        <KPICard label="Queried"             value={queried.length.toString()}    delta="Awaiting more info"                     deltaType={queried.length>0?'warn':'up'}    badge={queried.length>0?'Response Req.':'None'} badgeType={queried.length>0?'warn':'good'} color={queried.length>0?'amber':'green'} />
        <KPICard label="Approved"            value={approved.length.toString()}   delta={fmt(approvedVal)+' total value'}        deltaType="up"                              color="green"  />
        <KPICard label="Rejected"            value={rejected.length.toString()}   delta="Not approved"                           deltaType={rejected.length>0?'down':'up'}   color={rejected.length>0?'red':'green'} />
        <KPICard label="Pending Value"       value={fmt(pendingVal)}              delta="Awaiting decision"                      deltaType="warn"                            color="amber"  />
        <KPICard label="Total Requests"      value={approvals.length.toString()}  delta={fmt(totalVal)+' total value'}           deltaType="neutral"                         color="blue"   />
        <KPICard label="High Priority"       value={pendingHigh.length.toString()} delta="Pending + high priority"              deltaType={pendingHigh.length>0?'warn':'up'} badge={pendingHigh.length>0?'Urgent':'None'} badgeType={pendingHigh.length>0?'bad':'good'} color={pendingHigh.length>0?'red':'green'} />
        <KPICard label="Approval Rate"       value={approvals.length?(approved.length/approvals.length*100).toFixed(0)+'%':'—'} delta="Approved vs total"  deltaType="up"  color="teal"   />
      </div>
 
      {/* ── Pending alert banner ─────────────────────────────────────────── */}
      {pendingHigh.length > 0 && (
        <div style={{ background:'#FEECEC', border:'1px solid #F1948A', borderRadius:10, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:22 }}>🔴</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:12, color:'#721c24' }}>
              {pendingHigh.length} high-priority request{pendingHigh.length>1?'s':''} pending ({fmt(pendingHigh.reduce((s,a)=>s+a.amount,0))})
            </div>
            <div style={{ fontSize:11, color:'#721c24', marginTop:2 }}>
              {pendingHigh.map(a=>a.title).join(' · ')}
            </div>
          </div>
          <button onClick={()=>{ setActiveTab('pending'); setPriFilter('HIGH'); }}
            style={{ padding:'6px 12px', background:'#721c24', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
            Review Now
          </button>
        </div>
      )}
 
      {/* ── Tab Strip ───────────────────────────────────────────────────── */}
      <div className={styles.tabStrip}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`${styles.tabBtn} ${activeTab===t.id?styles.active:''}`}>
            {t.label}
            {t.count > 0 && (
              <span style={{ marginLeft:5, padding:'1px 6px', borderRadius:8, fontSize:9, fontWeight:700,
                background: activeTab===t.id ? 'var(--teal)' : 'var(--border)',
                color: activeTab===t.id ? '#fff' : 'var(--muted)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
 
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <input className={styles.toolbarSearch}
          placeholder="🔍 Search title / dept / requester…"
          value={search} onChange={e=>setSearch(e.target.value)} />
        <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
          value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}>
          {allDepts.map(d=><option key={d}>{d}</option>)}
        </select>
        <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
          value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
          {allCats.map(c=><option key={c}>{c}</option>)}
        </select>
        <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
          value={priFilter} onChange={e=>setPriFilter(e.target.value)}>
          <option value="All">All Priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <span className={styles.spacer}/>
        <span style={{ fontSize:11, color:'var(--muted)' }}>{filtered.length} requests</span>
      </div>
 
      {/* ── Request Cards ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--muted)', background:'#fff', borderRadius:10, boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>✅</div>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>No requests found</div>
          <div style={{ fontSize:11 }}>No approval requests match your current filters.</div>
        </div>
      ) : (
        filtered.map(a => {
          const cfg = STATUS_CFG[a.status];
          return (
            <div key={a.id} style={{
              background:'#fff', borderRadius:10, marginBottom:10,
              border:`1px solid ${a.priority==='HIGH'&&a.status==='PENDING'?'#F1948A':'var(--border)'}`,
              boxShadow:'0 1px 4px rgba(0,0,0,.06)', overflow:'hidden',
            }}>
              {/* Priority stripe */}
              <div style={{ height:3, background: PRIORITY_CFG[a.priority]?.color ?? '#888' }} />
 
              <div style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, flexWrap:'wrap', marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:13, color:'var(--navy)', marginBottom:3 }}>{a.title}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>
                      <span style={{ fontWeight:600, color:'var(--text)' }}>{a.dept}</span>
                      <span style={{ margin:'0 6px' }}>·</span>
                      {a.requester}
                      <span style={{ margin:'0 6px' }}>·</span>
                      Submitted {a.submitted}
                      <span style={{ margin:'0 6px' }}>·</span>
                      <span style={{ color: a.daysWaiting > 3 ? 'var(--red)' : 'var(--amber)', fontWeight:600 }}>
                        {a.daysWaiting} day{a.daysWaiting!==1?'s':''} waiting
                      </span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                    <PriorityBadge priority={a.priority} />
                    <span className={`${tableStyles.badge} ${tableStyles.grey}`}>{a.category}</span>
                    <StatusBadge status={a.status} />
                    <span style={{ fontWeight:800, fontSize:14, color:'var(--navy)', marginLeft:4 }}>{fmt(a.amount)}</span>
                  </div>
                </div>
 
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:10, lineHeight:1.5 }}>{a.description}</div>
 
                {a.queryNote && (
                  <div style={{ background:'#FFF9E6', border:'1px solid #F4D03F', borderRadius:6, padding:'6px 10px', marginBottom:10, fontSize:11 }}>
                    <strong>🟠 Query:</strong> {a.queryNote}
                  </div>
                )}
                {a.comments && a.status !== 'QUERIED' && (
                  <div style={{ background: a.status==='APPROVED'?'#d4edda':'#f8d7da', borderRadius:6, padding:'6px 10px', marginBottom:10, fontSize:11, color: a.status==='APPROVED'?'#155724':'#721c24' }}>
                    <strong>{a.status==='APPROVED'?'✅':'❌'} {a.status==='APPROVED'?'Approved':'Rejected'}:</strong> {a.comments}
                  </div>
                )}
 
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <button onClick={()=>setDetailReq(a)}
                    style={{ padding:'5px 14px', background:'var(--navy)', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600 }}>
                    Open Full Detail →
                  </button>
                  {a.status === 'PENDING' && (
                    <>
                      <button onClick={()=>{ setDetailReq(a); }}
                        style={{ padding:'5px 12px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600 }}>
                        ✅ Approve
                      </button>
                      <button onClick={()=>setDetailReq(a)}
                        style={{ padding:'5px 12px', background:'#fff', color:'var(--red)', border:'1.5px solid var(--red)', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600 }}>
                        ❌ Reject
                      </button>
                    </>
                  )}
                  {a.status === 'QUERIED' && (
                    <span style={{ fontSize:11, color:'#856404', fontStyle:'italic' }}>⏳ Awaiting response from {a.dept}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
 
      {/* ── Analytics Section ───────────────────────────────────────────── */}
      <div style={{ marginTop:20, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        {byStatus.map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'14px 16px', textAlign:'center', cursor:'pointer' }}
            onClick={()=>setActiveTab(s.label.toLowerCase())}>
            <div style={{ fontSize:9, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:.4, marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.count}</div>
          </div>
        ))}
      </div>
 
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Requests by Department</div>
          <div style={{ height:200 }}>
            <Bar
              data={{ labels:byDept.map(e=>e[0]), datasets:[{ data:byDept.map(e=>e[1]), backgroundColor:COLORS, borderRadius:4 }] }}
              options={{ ...BASE, scales:{ x:{ grid:{display:false},ticks:{font:FONT} }, y:{ grid:{color:GRID},ticks:{font:FONT,stepSize:1} } } }}
            />
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Request Value by Category</div>
          <div style={{ height:200 }}>
            <Doughnut
              data={{ labels:byCategory.map(e=>e[0]), datasets:[{ data:byCategory.map(e=>+(e[1]/1e6).toFixed(2)), backgroundColor:COLORS, borderWidth:2, borderColor:'#fff' }] }}
              options={{ responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{ legend:LEG_B } }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}