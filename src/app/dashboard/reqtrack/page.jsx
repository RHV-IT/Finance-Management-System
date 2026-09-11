'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { fmt } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
/* ─── Lifecycle stages in order ──────────────────────────── */
const STAGES = [
  'Submitted',
  'Pending Management Approval',
  'Approved',
  'Pending Procurement',
  'PO Created',
  'Vendor Confirmed',
  'Goods Received',
  'Completed',
];
 
const TERMINAL = ['Rejected', 'Queried'];
 
/* ─── Demo requisition data ───────────────────────────────── */
const REQS = [
  {
    reqNo: 'DR-000001',
    date: '2025-11-20',
    dept: 'Pharmacy',
    requester: 'Pharmacy Officer',
    item: 'Amoxicillin 500mg × 2,000 Tablets',
    qty: 2000,
    estValue: 160000,
    priority: 'High',
    status: 'Completed',
    stage: 'Completed',
    poNo: 'PO-0039',
    vendor: 'Pharmaplus Nigeria Ltd',
    grnRef: 'GRN-002',
    notes: 'Emergency antibiotic restock — critically low',
    history: [
      { stage: 'Submitted',                    ts: '2025-11-20 08:15', by: 'Pharmacy Officer',   note: 'Critical restock needed' },
      { stage: 'Pending Management Approval',  ts: '2025-11-20 08:16', by: 'System',             note: 'Auto-routed to Management' },
      { stage: 'Approved',                     ts: '2025-11-20 09:30', by: 'COO',                note: 'Approved — urgent' },
      { stage: 'Pending Procurement',          ts: '2025-11-20 09:31', by: 'System',             note: 'Routed to Procurement' },
      { stage: 'PO Created',                   ts: '2025-11-20 10:45', by: 'Procurement Officer',note: 'PO-0039 issued to Pharmaplus' },
      { stage: 'Vendor Confirmed',             ts: '2025-11-20 12:00', by: 'Procurement Officer',note: 'Pharmaplus confirmed delivery for 18 Nov' },
      { stage: 'Goods Received',               ts: '2025-11-18 14:30', by: 'Store Officer',      note: 'GRN-002 created — full qty received' },
      { stage: 'Completed',                    ts: '2025-11-18 15:00', by: 'Procurement Officer',note: 'Request closed' },
    ],
  },
  {
    reqNo: 'DR-000002',
    date: '2025-11-22',
    dept: 'Laboratory',
    requester: 'Lab Officer',
    item: 'Blood Glucose Strips × 500 + FBC Reagent Kit × 10',
    qty: 510,
    estValue: 1445000,
    priority: 'Normal',
    status: 'PO Created',
    stage: 'PO Created',
    poNo: 'PO-0044',
    vendor: 'DiagnosTech',
    grnRef: null,
    notes: 'Monthly lab consumables order',
    history: [
      { stage: 'Submitted',                    ts: '2025-11-22 09:00', by: 'Lab Officer',         note: 'Monthly order' },
      { stage: 'Pending Management Approval',  ts: '2025-11-22 09:01', by: 'System',              note: 'Auto-routed' },
      { stage: 'Approved',                     ts: '2025-11-23 10:15', by: 'Management',           note: 'Approved' },
      { stage: 'Pending Procurement',          ts: '2025-11-23 10:16', by: 'System',              note: 'Routed to Procurement' },
      { stage: 'PO Created',                   ts: '2025-11-24 11:00', by: 'Procurement Officer', note: 'PO-0044 issued to DiagnosTech' },
    ],
  },
  {
    reqNo: 'DR-000003',
    date: '2025-11-24',
    dept: 'Radiology',
    requester: 'Radiology Officer',
    item: 'CT Contrast Media × 30 Vials',
    qty: 30,
    estValue: 360000,
    priority: 'High',
    status: 'Approved',
    stage: 'Approved',
    poNo: null,
    vendor: null,
    grnRef: null,
    notes: 'Stock critically low — CT scan volume increasing',
    history: [
      { stage: 'Submitted',                    ts: '2025-11-24 08:00', by: 'Radiology Officer',  note: 'Critical — CT scan backlog building' },
      { stage: 'Pending Management Approval',  ts: '2025-11-24 08:01', by: 'System',             note: 'Auto-routed' },
      { stage: 'Approved',                     ts: '2025-11-24 09:45', by: 'COO',                note: 'Approved — expedite PO' },
    ],
  },
  {
    reqNo: 'DR-000004',
    date: '2025-11-25',
    dept: 'CSSD',
    requester: 'CSSD Officer',
    item: 'Sterilization Pouches × 5,000 + Indicator Tape × 20 Rolls',
    qty: 5020,
    estValue: 275000,
    priority: 'Normal',
    status: 'Pending Management Approval',
    stage: 'Pending Management Approval',
    poNo: null,
    vendor: null,
    grnRef: null,
    notes: 'Monthly CSSD consumables',
    history: [
      { stage: 'Submitted',                    ts: '2025-11-25 09:30', by: 'CSSD Officer',       note: 'Monthly order' },
      { stage: 'Pending Management Approval',  ts: '2025-11-25 09:31', by: 'System',             note: 'Awaiting Management approval' },
    ],
  },
  {
    reqNo: 'DR-000005',
    date: '2025-11-15',
    dept: 'Ophthalmology',
    requester: 'Ophthalmology Officer',
    item: 'Intraocular Lenses × 5 + Eye Drop Assortment',
    qty: 25,
    estValue: 98000,
    priority: 'Normal',
    status: 'Queried',
    stage: 'Submitted',
    poNo: null,
    vendor: null,
    grnRef: null,
    notes: 'Quarterly ophthal consumables',
    queryNote: 'Please provide specification / brand for intraocular lenses before we can approve.',
    history: [
      { stage: 'Submitted',                    ts: '2025-11-15 10:00', by: 'Ophthalmology Officer', note: 'Q4 restock' },
      { stage: 'Pending Management Approval',  ts: '2025-11-15 10:01', by: 'System',                note: 'Auto-routed' },
      { stage: 'Queried',                      ts: '2025-11-16 11:30', by: 'Management',            note: 'Please provide specification / brand for intraocular lenses.' },
    ],
  },
  {
    reqNo: 'DR-000006',
    date: '2025-11-10',
    dept: 'Pharmacy',
    requester: 'Pharmacy Officer',
    item: 'IV Fluid — Dextrose 5% × 200 Bottles',
    qty: 200,
    estValue: 300000,
    priority: 'Normal',
    status: 'Goods Received',
    stage: 'Goods Received',
    poNo: 'PO-0037',
    vendor: 'HealthCare Distributors',
    grnRef: 'GRN-003',
    notes: '',
    history: [
      { stage: 'Submitted',                    ts: '2025-11-10 08:00', by: 'Pharmacy Officer',    note: '' },
      { stage: 'Pending Management Approval',  ts: '2025-11-10 08:01', by: 'System',              note: '' },
      { stage: 'Approved',                     ts: '2025-11-10 09:00', by: 'Management',           note: 'Approved' },
      { stage: 'Pending Procurement',          ts: '2025-11-10 09:01', by: 'System',              note: '' },
      { stage: 'PO Created',                   ts: '2025-11-11 10:00', by: 'Procurement Officer', note: 'PO-0037 issued' },
      { stage: 'Vendor Confirmed',             ts: '2025-11-12 11:00', by: 'Procurement Officer', note: 'HealthCare confirmed delivery for 15 Nov' },
      { stage: 'Goods Received',               ts: '2025-11-15 14:00', by: 'Store Officer',       note: 'GRN-003 — 380 bottles received (short by 20)' },
    ],
  },
];
 
/* ─── Helpers ────────────────────────────────────────────── */
const stageIndex = s => STAGES.indexOf(s);
 
const RESPONSIBLE = {
  'Submitted':                   'Management',
  'Pending Management Approval': 'Management',
  'Approved':                    'Procurement',
  'Pending Procurement':         'Procurement',
  'PO Created':                  'Procurement / Vendor',
  'Vendor Confirmed':            'Vendor',
  'Goods Received':              'Store',
  'Completed':                   '—',
  'Queried':                     'Requesting Dept',
  'Rejected':                    '—',
};
 
const STATUS_BADGE = {
  Completed:                    tableStyles.green,
  Approved:                     tableStyles.blue,
  'PO Created':                 tableStyles.blue,
  'Vendor Confirmed':           tableStyles.blue,
  'Goods Received':             tableStyles.blue,
  'Pending Management Approval':tableStyles.amber,
  'Pending Procurement':        tableStyles.amber,
  Submitted:                    tableStyles.amber,
  Queried:                      tableStyles.amber,
  Rejected:                     tableStyles.red,
};
 
const PRIORITY_BADGE = { High: tableStyles.red, Normal: tableStyles.blue };
 
const ALL_STAGES_FILTER = ['All Stages', ...STAGES, ...TERMINAL];
 
export default function ReqTrackPage() {
  const [stageFilter, setStageFilter] = useState('All Stages');
  const [search,      setSearch]      = useState('');
  const [expanded,    setExpanded]    = useState({});
 
  const toggleExpanded = reqNo =>
    setExpanded(prev => ({ ...prev, [reqNo]: !prev[reqNo] }));
 
  const filtered = useMemo(() => {
    return REQS.filter(r => {
      const matchStage  = stageFilter === 'All Stages' || r.status === stageFilter;
      const matchSearch = !search || (r.reqNo + r.dept + r.item + (r.vendor||'')).toLowerCase().includes(search.toLowerCase());
      return matchStage && matchSearch;
    });
  }, [stageFilter, search]);
 
  /* summary counts */
  const pending    = REQS.filter(r => ['Pending Management Approval','Submitted'].includes(r.status)).length;
  const inProgress = REQS.filter(r => ['Approved','Pending Procurement','PO Created','Vendor Confirmed'].includes(r.status)).length;
  const received   = REQS.filter(r => r.status === 'Goods Received').length;
  const completed  = REQS.filter(r => r.status === 'Completed').length;
  const queried    = REQS.filter(r => r.status === 'Queried').length;
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🔎 Request Tracking</h2>
          <p className={styles.pageMeta}>Full lifecycle of every requisition — current stage & responsible department</p>
        </div>
      </div>
 
      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Requests"  value={REQS.length}  delta="All periods"         deltaType="up"   color="blue"   />
        <KPICard label="Pending Approval" value={pending}      delta="Awaiting Management" deltaType={pending>0?'warn':'up'}
          badge={pending>0?'Action Needed':'✓ Clear'} badgeType={pending>0?'warn':'good'} color={pending>0?'amber':'green'} />
        <KPICard label="With Procurement" value={inProgress}   delta="PO / sourcing stage" deltaType="warn" color="purple" />
        <KPICard label="Goods Received"  value={received}      delta="Awaiting completion" deltaType="up"   color="blue"   />
        <KPICard label="Completed"       value={completed}     delta="Fully closed"        deltaType="up"   color="green"  />
        <KPICard label="Queried"         value={queried}       delta="Needs response"
          deltaType={queried>0?'down':'up'} badge={queried>0?'⚠ Respond':'✓ None'}
          badgeType={queried>0?'bad':'good'} color={queried>0?'red':'green'} />
      </div>
 
      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          style={{ padding:'6px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none', minWidth:200 }}
        >
          {ALL_STAGES_FILTER.map(s => <option key={s}>{s}</option>)}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search request no / item / dept / vendor…"
          style={{ padding:'6px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none', flex:1, minWidth:220 }}
        />
        <span style={{ fontSize:11, color:'var(--muted)', whiteSpace:'nowrap' }}>{filtered.length} requests</span>
      </div>
 
      {/* Request cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtered.length === 0 && (
          <div style={{ background:'var(--card)', borderRadius:10, padding:32, textAlign:'center', color:'var(--muted)', boxShadow:'var(--shadow-sm)' }}>
            No requests match the selected filter.
          </div>
        )}
 
        {filtered.map(r => {
          const ci       = stageIndex(r.stage);
          const rejected = r.status === 'Rejected';
          const queried  = r.status === 'Queried';
          const isOpen   = expanded[r.reqNo];
 
          return (
            <div
              key={r.reqNo}
              style={{
                background:'var(--card)',
                borderRadius:10,
                boxShadow:'var(--shadow-sm)',
                overflow:'hidden',
                border:`1px solid ${r.status==='Queried'?'var(--amber)':r.status==='Rejected'?'var(--red)':r.status==='Completed'?'var(--teal)':'var(--border)'}`,
              }}
            >
              {/* Header row */}
              <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:4 }}>
                    <span style={{ fontWeight:800, color:'var(--navy)', fontSize:13 }}>{r.reqNo}</span>
                    <span className={`${tableStyles.badge} ${PRIORITY_BADGE[r.priority]||tableStyles.blue}`}>{r.priority}</span>
                    <span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.dept}</span>
                    <span style={{ fontSize:10, color:'var(--muted)' }}>{r.date}</span>
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{r.item}</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>
                    Est. value: <strong style={{ color:'var(--navy)' }}>{fmt(r.estValue)}</strong>
                    {r.vendor   && <span style={{ marginLeft:12 }}>Vendor: <strong>{r.vendor}</strong></span>}
                    {r.poNo     && <span style={{ marginLeft:12 }}>PO: <strong style={{ color:'var(--teal)' }}>{r.poNo}</strong></span>}
                    {r.grnRef   && <span style={{ marginLeft:12 }}>GRN: <strong style={{ color:'var(--teal)' }}>{r.grnRef}</strong></span>}
                  </div>
                  {r.queryNote && (
                    <div style={{ marginTop:6, padding:'6px 10px', background:'#FFF9E6', borderRadius:6, fontSize:11, color:'#856404', border:'1px solid #F4D03F' }}>
                      💬 <strong>Query:</strong> {r.queryNote}
                    </div>
                  )}
                  {r.notes && !r.queryNote && (
                    <div style={{ marginTop:4, fontSize:10, color:'var(--muted)', fontStyle:'italic' }}>{r.notes}</div>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                  <span className={`${tableStyles.badge} ${STATUS_BADGE[r.status]||tableStyles.amber}`} style={{ fontSize:10 }}>
                    {r.status}
                  </span>
                  <div style={{ fontSize:10, color:'var(--muted)' }}>
                    Responsible: <strong>{RESPONSIBLE[r.status]||'—'}</strong>
                  </div>
                  <button
                    onClick={() => toggleExpanded(r.reqNo)}
                    style={{ fontSize:10, fontWeight:600, color:'var(--teal)', background:'none', border:'none', cursor:'pointer', padding:0 }}
                  >
                    {isOpen ? '▲ Hide timeline' : '▼ Show timeline'}
                  </button>
                </div>
              </div>
 
              {/* Stage progress bar */}
              {!rejected && !queried && (
                <div style={{ padding:'0 18px 14px', overflowX:'auto' }}>
                  <div style={{ display:'flex', alignItems:'center', minWidth:640 }}>
                    {STAGES.map((s, i) => {
                      const done = i <= ci;
                      const curr = i === ci;
                      return (
                        <div key={s} style={{ display:'flex', alignItems:'center', flex: i < STAGES.length - 1 ? 1 : 0 }}>
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                            <div style={{
                              width:26, height:26, borderRadius:'50%',
                              background: done ? 'var(--teal)' : '#e8ecf0',
                              color: done ? '#fff' : '#aaa',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:10, fontWeight:700, flexShrink:0,
                              boxShadow: curr ? '0 0 0 3px rgba(17,122,101,0.25)' : 'none',
                              transition:'background 0.3s',
                            }}>
                              {done ? '✓' : i + 1}
                            </div>
                            <div style={{
                              fontSize:8, textAlign:'center', whiteSpace:'nowrap',
                              color: curr ? 'var(--navy)' : done ? 'var(--teal)' : 'var(--muted)',
                              fontWeight: curr ? 700 : 400,
                              maxWidth:72, overflow:'hidden', textOverflow:'ellipsis',
                            }}>
                              {s}
                            </div>
                          </div>
                          {i < STAGES.length - 1 && (
                            <div style={{ flex:1, height:2, background: i < ci ? 'var(--teal)' : '#e8ecf0', margin:'0 2px', marginBottom:16 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
 
              {/* Queried / Rejected banner */}
              {(rejected || queried) && (
                <div style={{
                  margin:'0 18px 14px',
                  padding:'10px 14px',
                  borderRadius:8,
                  background: rejected ? '#FEECEC' : '#FFF9E6',
                  border: `1px solid ${rejected ? '#F1948A' : '#F4D03F'}`,
                  fontSize:11,
                  color: rejected ? 'var(--red)' : '#856404',
                  fontWeight:600,
                }}>
                  {rejected ? '✗ Rejected' : '🟡 Queried'} — {r.queryNote || 'See audit trail for details.'}
                </div>
              )}
 
              {/* Audit trail (expanded) */}
              {isOpen && (
                <div style={{ borderTop:'1px solid var(--border)', padding:'14px 18px', background:'#fafcff' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>
                    📋 Audit Trail
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                    {r.history.map((h, hi) => (
                      <div key={hi} style={{ display:'flex', gap:14, alignItems:'flex-start', paddingBottom:12 }}>
                        {/* Connector line */}
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                          <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--teal)', marginTop:2, flexShrink:0 }} />
                          {hi < r.history.length - 1 && (
                            <div style={{ width:1, flex:1, background:'var(--border)', minHeight:24 }} />
                          )}
                        </div>
                        {/* Content */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:4 }}>
                            <span style={{ fontWeight:700, fontSize:11, color:'var(--navy)' }}>{h.stage}</span>
                            <span style={{ fontSize:10, color:'var(--muted)', whiteSpace:'nowrap' }}>{h.ts}</span>
                          </div>
                          <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>
                            By: <strong>{h.by}</strong>
                            {h.note && <span style={{ marginLeft:6 }}>— {h.note}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}