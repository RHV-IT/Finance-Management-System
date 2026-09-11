'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { fmt, COLORS } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
 
ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Filler, Tooltip, Legend
);
 
/* ── chart defaults ─────────────────────────────────────────────────────── */
const FONT    = { family: "'Inter','Segoe UI',Arial,sans-serif", size: 10 };
const GRID    = 'rgba(0,0,0,0.05)';
const BASE    = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const X_NONE  = { grid: { display: false }, ticks: { font: FONT } };
const Y_NGN   = { grid: { color: GRID }, ticks: { font: FONT, callback: v => '₦' + v + 'M' } };
const LEGEND_B = { display: true, position: 'bottom', labels: { font: FONT, boxWidth: 10 } };
 
/* ── P2P lifecycle stages (from dashboard.html) ─────────────────────────── */
const P2P_FLOW = [
  'Draft',
  'Submitted',
  'Pending Management Approval',
  'Approved',
  'Awaiting Procurement Action',
  'Procurement Review',
  'Awaiting Final Management Approval',
  'Vendor Approved',
  'Purchase Order Issued',
  'Vendor Confirmed',
  'Delivered',
  'Goods Received',
  'Awaiting Payment',
  'Payment Processing',
  'Paid',
  'Completed',
];
const P2P_TERMINAL = ['Rejected', 'Cancelled'];
 
const DEPT_LIST = [
  'Pharmacy','Laboratory','Radiology','Ophthalmology','CSSD',
  'Finance','Procurement','HR','Operations','Administration',
];
 
const VENDOR_LIST = [
  'Pharmaplus Nigeria Ltd','MedEquip Supplies','HealthCare Distributors',
  'Lagos Medical Stores','ProMed Nigeria','Clinix Supplies Ltd',
  'Abuja Pharma Hub','BioMedics Nigeria','DiagnosTech','ImageCare Ltd',
];
 
/* ── seed P2P requests ───────────────────────────────────────────────────── */
const SEED_P2P = [
  {
    prNo:'PR-000001', date:'2025-11-20', dept:'Pharmacy', requesterLbl:'Pharmacy Unit',
    priority:'High', notes:'Critical stock depletion — ward supply at risk',
    item:'IV Fluids (Normal Saline 500ml) + 3 more', amount:4_500_000,
    vendor:'Pharmaplus Nigeria Ltd', poNo:'PO-112201', payRef:'PAY-0001',
    grnCompleted:true, storeVerified:true, invoiceUploaded:true,
    status:'Awaiting Payment', history:[
      { ts:'2025-11-20T09:00:00Z', user:'Pharmacy Unit', role:'pharmacy',  action:'Request Created',                  remarks:'Pharmacy – IV Fluids ×4 +3 more' },
      { ts:'2025-11-20T09:01:00Z', user:'Pharmacy Unit', role:'pharmacy',  action:'Pending Management Approval',       remarks:'Routed to Management' },
      { ts:'2025-11-21T10:15:00Z', user:'Management',    role:'admin',     action:'Gate 1 — Management Approved',      remarks:'Approved. Urgent.' },
      { ts:'2025-11-21T10:16:00Z', user:'Management',    role:'admin',     action:'Routed to Procurement',             remarks:'Begin vendor sourcing and RFQ' },
      { ts:'2025-11-22T08:30:00Z', user:'Procurement',   role:'procurement',action:'Procurement Recommendation Submitted',remarks:'Vendor: Pharmaplus Nigeria Ltd · ₦4.5M · 2 quotes compared' },
      { ts:'2025-11-22T14:00:00Z', user:'Management',    role:'admin',     action:'Gate 2 — Vendor Selection Approved',remarks:'Vendor: Pharmaplus Nigeria Ltd · Approved.' },
      { ts:'2025-11-23T09:00:00Z', user:'Procurement',   role:'procurement',action:'Purchase Order Issued',            remarks:'PO-112201' },
      { ts:'2025-11-24T11:00:00Z', user:'Procurement',   role:'procurement',action:'Vendor Confirmed PO',              remarks:'Vendor acknowledged receipt of PO' },
      { ts:'2025-11-25T14:00:00Z', user:'Procurement',   role:'procurement',action:'Mark as Delivered',                remarks:'Vendor delivered goods to Store' },
      { ts:'2025-11-26T09:00:00Z', user:'Store Unit',    role:'store',     action:'Goods Fully Received by Store',     remarks:'Goods received in good condition.' },
      { ts:'2025-11-26T10:00:00Z', user:'Procurement',   role:'procurement',action:'Payment Request Raised',           remarks:'PAY-0001 → Accounts Payable · All 4 gate conditions confirmed' },
    ],
    quotes:[{ vendor:'Pharmaplus Nigeria Ltd', amount:4_500_000, lead:2, selected:true }, { vendor:'ProMed Nigeria', amount:4_800_000, lead:3, selected:false }],
    lines:[
      { item:'Normal Saline 500ml', qty:500, price:4_500, total:2_250_000 },
      { item:'Dextrose 5% 500ml',   qty:200, price:5_200, total:1_040_000 },
      { item:'Ringer\'s Lactate',   qty:150, price:4_800, total:720_000   },
      { item:'Distilled Water 1L',  qty:100, price:4_900, total:490_000   },
    ],
  },
  {
    prNo:'PR-000002', date:'2025-11-22', dept:'Radiology', requesterLbl:'Radiology Unit',
    priority:'Normal', notes:'Monthly consumable replenishment',
    item:'CT Contrast Media + X-Ray Films', amount:1_200_000,
    vendor:'ImageCare Ltd', poNo:'PO-112202', payRef:'',
    grnCompleted:false, storeVerified:false, invoiceUploaded:false,
    status:'Purchase Order Issued', history:[
      { ts:'2025-11-22T08:00:00Z', user:'Radiology Unit', role:'radiology', action:'Request Created',            remarks:'Radiology – CT Contrast Media +1 more' },
      { ts:'2025-11-22T08:01:00Z', user:'Radiology Unit', role:'radiology', action:'Pending Management Approval',remarks:'Routed to Management' },
      { ts:'2025-11-23T09:30:00Z', user:'Management',     role:'admin',     action:'Gate 1 — Management Approved',remarks:'Approved.' },
      { ts:'2025-11-23T09:31:00Z', user:'Management',     role:'admin',     action:'Routed to Procurement',       remarks:'Begin vendor sourcing and RFQ' },
      { ts:'2025-11-24T10:00:00Z', user:'Procurement',    role:'procurement',action:'Procurement Recommendation Submitted',remarks:'Vendor: ImageCare Ltd · ₦1.2M' },
      { ts:'2025-11-24T14:30:00Z', user:'Management',     role:'admin',     action:'Gate 2 — Vendor Selection Approved',remarks:'Vendor: ImageCare Ltd · Approved.' },
      { ts:'2025-11-25T09:00:00Z', user:'Procurement',    role:'procurement',action:'Purchase Order Issued',       remarks:'PO-112202' },
    ],
    quotes:[{ vendor:'ImageCare Ltd', amount:1_200_000, lead:3, selected:true }],
    lines:[
      { item:'CT Contrast Media 100ml', qty:50, price:12_000, total:600_000 },
      { item:'X-Ray Film 14×17',        qty:200,price:3_000,  total:600_000 },
    ],
  },
  {
    prNo:'PR-000003', date:'2025-11-25', dept:'Laboratory', requesterLbl:'Laboratory Unit',
    priority:'High', notes:'FBC reagent kits nearly exhausted',
    item:'FBC Reagent Kits + Urine Test Strips', amount:2_800_000,
    vendor:'DiagnosTech', poNo:'', payRef:'',
    grnCompleted:false, storeVerified:false, invoiceUploaded:false,
    status:'Procurement Review', history:[
      { ts:'2025-11-25T08:00:00Z', user:'Laboratory Unit',role:'lab',        action:'Request Created',            remarks:'Lab – FBC Reagent Kits +1 more' },
      { ts:'2025-11-25T08:01:00Z', user:'Laboratory Unit',role:'lab',        action:'Pending Management Approval',remarks:'Routed to Management' },
      { ts:'2025-11-26T10:00:00Z', user:'Management',     role:'admin',      action:'Gate 1 — Management Approved',remarks:'Approved. Begin sourcing.' },
      { ts:'2025-11-26T10:01:00Z', user:'Management',     role:'admin',      action:'Routed to Procurement',       remarks:'Begin vendor sourcing and RFQ' },
      { ts:'2025-11-27T09:00:00Z', user:'Procurement',    role:'procurement',action:'Begin Vendor Sourcing & RFQ',  remarks:'Vendor sourcing started — RFQ issued' },
    ],
    quotes:[],
    lines:[
      { item:'FBC Reagent Kit (pack)', qty:30, price:45_000, total:1_350_000 },
      { item:'Urine Test Strips ×100', qty:200,price:7_250,  total:1_450_000 },
    ],
  },
  {
    prNo:'PR-000004', date:'2025-11-28', dept:'CSSD', requesterLbl:'CSSD Unit',
    priority:'Normal', notes:'Sterilisation pouch replenishment',
    item:'Sterilisation Pouches & Indicator Tape', amount:380_000,
    vendor:'', poNo:'', payRef:'',
    grnCompleted:false, storeVerified:false, invoiceUploaded:false,
    status:'Pending Management Approval', history:[
      { ts:'2025-11-28T09:00:00Z', user:'CSSD Unit', role:'cssd', action:'Request Created',            remarks:'CSSD – Sterilisation Pouches & Indicator Tape' },
      { ts:'2025-11-28T09:01:00Z', user:'CSSD Unit', role:'cssd', action:'Pending Management Approval',remarks:'Routed to Management' },
    ],
    quotes:[],
    lines:[
      { item:'Self-Seal Sterilisation Pouches (box)', qty:20, price:12_000, total:240_000 },
      { item:'Chemical Indicator Tape (roll)',        qty:40, price:3_500,  total:140_000 },
    ],
  },
  {
    prNo:'PR-000005', date:'2025-11-15', dept:'Finance', requesterLbl:'Finance Unit',
    priority:'Low', notes:'Office supplies restock',
    item:'Stationery & Printer Cartridges', amount:185_000,
    vendor:'OfficeMart Nigeria', poNo:'PO-111502', payRef:'PAY-0002',
    grnCompleted:true, storeVerified:true, invoiceUploaded:true,
    status:'Completed', history:[
      { ts:'2025-11-15T09:00:00Z', user:'Finance Unit', role:'revenue', action:'Request Created',               remarks:'Finance – Stationery +1 more' },
      { ts:'2025-11-15T09:01:00Z', user:'Finance Unit', role:'revenue', action:'Pending Management Approval',    remarks:'Routed to Management' },
      { ts:'2025-11-16T11:00:00Z', user:'Management',   role:'admin',   action:'Gate 1 — Management Approved',   remarks:'Approved.' },
      { ts:'2025-11-16T11:01:00Z', user:'Management',   role:'admin',   action:'Routed to Procurement',          remarks:'Begin vendor sourcing and RFQ' },
      { ts:'2025-11-17T10:00:00Z', user:'Procurement',  role:'procurement',action:'Procurement Recommendation Submitted',remarks:'Vendor: OfficeMart Nigeria · ₦185K' },
      { ts:'2025-11-17T14:00:00Z', user:'Management',   role:'admin',   action:'Gate 2 — Vendor Selection Approved',remarks:'Approved.' },
      { ts:'2025-11-18T09:00:00Z', user:'Procurement',  role:'procurement',action:'Purchase Order Issued',        remarks:'PO-111502' },
      { ts:'2025-11-18T15:00:00Z', user:'Procurement',  role:'procurement',action:'Vendor Confirmed PO',          remarks:'Vendor acknowledged receipt of PO' },
      { ts:'2025-11-19T11:00:00Z', user:'Procurement',  role:'procurement',action:'Mark as Delivered',            remarks:'Vendor delivered goods to Store' },
      { ts:'2025-11-20T09:00:00Z', user:'Store Unit',   role:'store',   action:'Goods Fully Received by Store',   remarks:'All items received in good condition.' },
      { ts:'2025-11-20T10:00:00Z', user:'Procurement',  role:'procurement',action:'Payment Request Raised',       remarks:'PAY-0002 → Accounts Payable' },
      { ts:'2025-11-21T11:00:00Z', user:'Finance',      role:'payables',action:'Mark as Paid',                    remarks:'Bank Transfer — ₦185,000' },
      { ts:'2025-11-21T11:30:00Z', user:'Finance',      role:'payables',action:'Completed',                       remarks:'Request closed' },
    ],
    quotes:[{ vendor:'OfficeMart Nigeria', amount:185_000, lead:1, selected:true }],
    lines:[
      { item:'A4 Paper Reams',      qty:10, price:4_500,  total:45_000  },
      { item:'Printer Cartridges',  qty:4,  price:35_000, total:140_000 },
    ],
  },
];
 
/* ── helpers ─────────────────────────────────────────────────────────────── */
function stageIndex(s) { return P2P_FLOW.indexOf(s); }
function isTerminal(s) { return P2P_TERMINAL.includes(s); }
 
function paymentGateIssues(r) {
  const issues = [];
  if (!r.poNo)             issues.push('Purchase Order has not been issued');
  if (!r.grnCompleted)     issues.push('Goods Received Note (GRN) has not been completed');
  if (!r.storeVerified)    issues.push('Store has not confirmed receipt of goods');
  if (!r.invoiceUploaded)  issues.push('Vendor invoice has not been uploaded');
  return issues;
}
 
const STATUS_BADGE = {
  'Draft':                          tableStyles.grey,
  'Submitted':                      tableStyles.blue,
  'Pending Management Approval':    tableStyles.amber,
  'Approved':                       tableStyles.blue,
  'Awaiting Procurement Action':    tableStyles.amber,
  'Procurement Review':             tableStyles.amber,
  'Awaiting Final Management Approval': tableStyles.amber,
  'Vendor Approved':                tableStyles.blue,
  'Purchase Order Issued':          tableStyles.blue,
  'Vendor Confirmed':               tableStyles.blue,
  'Delivered':                      tableStyles.blue,
  'Goods Received':                 tableStyles.green,
  'Awaiting Payment':               tableStyles.amber,
  'Payment Processing':             tableStyles.amber,
  'Paid':                           tableStyles.green,
  'Completed':                      tableStyles.green,
  'Rejected':                       tableStyles.red,
  'Cancelled':                      tableStyles.red,
};
 
const PRIORITY_BADGE = {
  Urgent: tableStyles.red,
  High:   tableStyles.amber,
  Normal: tableStyles.blue,
  Low:    tableStyles.grey,
};
 
/* ── sub-components ─────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  return <span className={`${tableStyles.badge} ${STATUS_BADGE[status] ?? tableStyles.grey}`}>{status}</span>;
}
 
function Timeline({ history }) {
  return (
    <div style={{ padding:'4px 0' }}>
      {[...history].reverse().map((h, i) => (
        <div key={i} style={{ display:'flex',gap:10,paddingBottom:10,position:'relative' }}>
          {/* vertical line */}
          {i < history.length - 1 && (
            <div style={{ position:'absolute',left:5,top:14,bottom:0,width:2,background:'#e0e4ea' }} />
          )}
          <div style={{ width:12,height:12,borderRadius:'50%',background:'var(--teal)',flexShrink:0,marginTop:2,zIndex:1 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700,fontSize:11,color:'var(--navy)' }}>{h.action}</div>
            {h.remarks && <div style={{ fontSize:10,color:'var(--muted)',marginTop:1 }}>{h.remarks}</div>}
            <div style={{ fontSize:9,color:'#aaa',marginTop:2 }}>
              {new Date(h.ts).toLocaleString('en-GB',{ day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit' })} · {h.user}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
 
function WorkflowStepper({ status }) {
  const ci = stageIndex(status);
  const rejected = isTerminal(status);
  const visible = P2P_FLOW.slice(0, Math.min(P2P_FLOW.length, 8)); // show first 8 then last 4
  return (
    <div style={{ display:'flex',flexWrap:'wrap',gap:'6px 4px',alignItems:'center' }}>
      {P2P_FLOW.map((s, i) => {
        const done = !rejected && i <= ci;
        const cur  = i === ci && !rejected;
        return (
          <div key={s} style={{ display:'flex',alignItems:'center',gap:3 }}>
            <div style={{
              width:18,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:9,fontWeight:700,flexShrink:0,
              background: done ? 'var(--teal)' : '#e0e4ea',
              color: done ? '#fff' : '#999',
            }}>
              {done ? '✓' : i+1}
            </div>
            <span style={{ fontSize:9,fontWeight:cur?700:400,color:cur?'var(--navy)':done?'var(--text)':'var(--muted)',whiteSpace:'nowrap' }}>
              {s}
            </span>
            {i < P2P_FLOW.length - 1 && (
              <span style={{ width:14,height:2,background:done&&i<ci?'var(--teal)':'#e0e4ea',display:'inline-block',flexShrink:0 }}/>
            )}
          </div>
        );
      })}
      {rejected && (
        <span style={{ marginLeft:6,padding:'2px 8px',background:'#f8d7da',color:'#721c24',borderRadius:8,fontSize:9,fontWeight:700 }}>{status}</span>
      )}
    </div>
  );
}
 
function Modal({ title, onClose, children, footer }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'#fff',borderRadius:12,width:640,maxWidth:'96vw',maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
        <div style={{ padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:800,color:'var(--navy)' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--muted)',lineHeight:1 }}>✕</button>
        </div>
        <div style={{ padding:18,overflowY:'auto',flex:1 }}>{children}</div>
        {footer && (
          <div style={{ padding:'12px 18px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:8,flexShrink:0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
 
const inputSt = { padding:'7px 9px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none',width:'100%',fontFamily:'inherit',boxSizing:'border-box' };
function Field({ label, col, children }) {
  return (
    <label style={{ display:'flex',flexDirection:'column',fontSize:10,fontWeight:700,color:'var(--navy)',gap:4,gridColumn:col }}>
      {label}{children}
    </label>
  );
}
 
/* ════════════════════════════════════════════════════════════════════════════
   DETAIL PANEL
═══════════════════════════════════════════════════════════════════════════ */
function DetailPanel({ req, onClose, onUpdate }) {
  const [localReq, setLocalReq] = useState(req);
  const [quoteVendor, setQuoteVendor] = useState('');
  const [quoteAmt,    setQuoteAmt]    = useState('');
  const [quoteLead,   setQuoteLead]   = useState('');
  const [showGate, setShowGate] = useState(null); // 'approve' | 'reject' | 'query'
  const [remark, setRemark] = useState('');
  const issues = paymentGateIssues(localReq);
 
  function pushHistory(action, remarks) {
    const entry = { ts: new Date().toISOString(), user:'Management', role:'admin', action, remarks };
    return [...localReq.history, entry];
  }
 
  function advance(toStatus, remarks = '') {
    const updated = { ...localReq, status: toStatus, history: pushHistory(toStatus, remarks) };
    setLocalReq(updated);
    onUpdate(updated);
  }
 
  function gate1Approve() {
    const h = [...localReq.history,
      { ts:new Date().toISOString(), user:'Management', role:'admin', action:'Gate 1 — Management Approved', remarks: remark || 'Approved.' },
      { ts:new Date().toISOString(), user:'Management', role:'admin', action:'Routed to Procurement', remarks:'Begin vendor sourcing and RFQ' },
    ];
    const updated = { ...localReq, status:'Awaiting Procurement Action', history: h };
    setLocalReq(updated); onUpdate(updated); setShowGate(null); setRemark('');
  }
 
  function gate2Approve() {
    const sel = localReq.quotes.find(q => q.selected);
    const h = [...localReq.history,
      { ts:new Date().toISOString(), user:'Management', role:'admin', action:'Gate 2 — Vendor Selection Approved', remarks:`Vendor: ${sel?.vendor ?? '—'} · ${remark || 'Approved.'}` },
    ];
    const updated = { ...localReq, status:'Vendor Approved', history: h };
    setLocalReq(updated); onUpdate(updated); setShowGate(null); setRemark('');
  }
 
  function doReject() {
    if (!remark.trim()) { alert('A reason is required.'); return; }
    const updated = { ...localReq, status:'Rejected', history: pushHistory('Rejected', remark) };
    setLocalReq(updated); onUpdate(updated); setShowGate(null); setRemark('');
  }
 
  function doQuery() {
    if (!remark.trim()) { alert('Please describe the clarification needed.'); return; }
    const updated = { ...localReq, status:'Submitted', queryNote: remark, history: pushHistory('Clarification Requested by Management', remark) };
    setLocalReq(updated); onUpdate(updated); setShowGate(null); setRemark('');
  }
 
  function beginSourcing() {
    advance('Procurement Review','Vendor sourcing started — RFQ issued');
  }
 
  function addQuote() {
    if (!quoteVendor || !quoteAmt) { alert('Vendor and amount required.'); return; }
    const updated = { ...localReq, quotes:[...localReq.quotes, { vendor:quoteVendor, amount:+quoteAmt, lead:+quoteLead||0, selected:false }] };
    setLocalReq(updated); onUpdate(updated);
    setQuoteVendor(''); setQuoteAmt(''); setQuoteLead('');
  }
 
  function selectVendor(idx) {
    const quotes = localReq.quotes.map((q, i) => ({ ...q, selected: i === idx }));
    const sel = quotes[idx];
    const updated = { ...localReq, quotes, vendor: sel.vendor, amount: sel.amount };
    setLocalReq(updated); onUpdate(updated);
  }
 
  function submitRecommendation() {
    const sel = localReq.quotes.find(q => q.selected);
    if (!sel) { alert('Select a preferred vendor first.'); return; }
    const h = [...localReq.history, { ts:new Date().toISOString(), user:'Procurement', role:'procurement', action:'Procurement Recommendation Submitted', remarks:`Vendor: ${sel.vendor} · ₦${sel.amount.toLocaleString()} · ${localReq.quotes.length} quote(s) compared` }];
    const updated = { ...localReq, status:'Awaiting Final Management Approval', history: h };
    setLocalReq(updated); onUpdate(updated);
  }
 
  function issuePO() {
    const poNo = `PO-${Date.now().toString().slice(-6)}`;
    const h = [...localReq.history, { ts:new Date().toISOString(), user:'Procurement', role:'procurement', action:'Purchase Order Issued', remarks: poNo }];
    const updated = { ...localReq, status:'Purchase Order Issued', poNo, history: h };
    setLocalReq(updated); onUpdate(updated);
  }
 
  function markDelivered() {
    advance('Delivered','Vendor delivered goods to Store');
  }
 
  function receiveGoods() {
    const h = [...localReq.history, { ts:new Date().toISOString(), user:'Store Unit', role:'store', action:'Goods Fully Received by Store', remarks:'Goods received in good condition.' }];
    const updated = { ...localReq, status:'Goods Received', grnCompleted:true, storeVerified:true, history: h };
    setLocalReq(updated); onUpdate(updated);
  }
 
  function uploadInvoice() {
    const invNo = `VND-INV-${Date.now().toString().slice(-5)}`;
    const h = [...localReq.history, { ts:new Date().toISOString(), user:'Procurement', role:'procurement', action:'Vendor Invoice Uploaded', remarks:`${invNo} · ₦${localReq.amount.toLocaleString()}` }];
    const updated = { ...localReq, invoiceUploaded:true, history: h };
    setLocalReq(updated); onUpdate(updated);
  }
 
  function raisePayment() {
    if (issues.length) { alert('Payment gate conditions not met:\n\n' + issues.map((x,i)=>`${i+1}. ${x}`).join('\n')); return; }
    const payRef = `PAY-${Date.now().toString().slice(-4)}`;
    const h = [...localReq.history, { ts:new Date().toISOString(), user:'Procurement', role:'procurement', action:'Payment Request Raised', remarks:`${payRef} → Accounts Payable · All 4 gate conditions confirmed` }];
    const updated = { ...localReq, status:'Awaiting Payment', payRef, history: h };
    setLocalReq(updated); onUpdate(updated);
  }
 
  function markPaid() {
    const h = [...localReq.history,
      { ts:new Date().toISOString(), user:'Finance', role:'payables', action:'Payment Processing', remarks:'AP processing payment' },
      { ts:new Date().toISOString(), user:'Finance', role:'payables', action:'Mark as Paid', remarks:`Bank Transfer — ${fmt(localReq.amount)}` },
    ];
    const updated = { ...localReq, status:'Paid', history: h };
    setLocalReq(updated); onUpdate(updated);
  }
 
  function complete() {
    advance('Completed','Request closed');
  }
 
  const s = localReq.status;
 
  /* ── Action section ─────────────────────────────────────────── */
  function ActionBar() {
    if (isTerminal(s)) return (
      <div style={{ padding:'12px 14px',borderRadius:8,background:'#f8d7da',color:'#721c24',fontWeight:700,fontSize:11,marginBottom:14 }}>
        This request is {s}. No further action is possible.
      </div>
    );
    if (s === 'Completed') return (
      <div style={{ padding:'12px 14px',borderRadius:8,background:'#d4edda',color:'#155724',fontWeight:700,fontSize:11,marginBottom:14 }}>
        ✓ Completed — transaction fully processed and closed.
      </div>
    );
 
    return (
      <div style={{ background:'#fff',borderRadius:10,padding:'14px 16px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:14 }}>
        <div style={{ fontSize:11,fontWeight:700,color:'var(--navy)',marginBottom:10 }}>Actions — {s}</div>
 
        {/* Gate 1 */}
        {(s==='Submitted'||s==='Pending Management Approval') && (
          showGate ? (
            <div>
              <div style={{ marginBottom:8 }}>
                <textarea style={{ ...inputSt,resize:'vertical',minHeight:60 }}
                  placeholder={showGate==='query'?'Describe what clarification is needed…':'Remark (optional)…'}
                  value={remark} onChange={e=>setRemark(e.target.value)}/>
              </div>
              <div style={{ display:'flex',gap:8 }}>
                {showGate==='approve' && <button onClick={gate1Approve} className={styles.btnSecondary}>✅ Confirm Gate 1 Approval</button>}
                {showGate==='reject'  && <button onClick={doReject}     style={{ ...actionBtn, background:'var(--red)' }}>❌ Confirm Reject</button>}
                {showGate==='query'   && <button onClick={doQuery}      style={{ ...actionBtn, background:'var(--amber)' }}>🟠 Send Query</button>}
                <button onClick={()=>{setShowGate(null);setRemark('');}} className={styles.btnGhost}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
              <button onClick={()=>setShowGate('approve')} className={styles.btnSecondary}>✅ Gate 1: Approve Request</button>
              <button onClick={()=>setShowGate('query')}   style={{ ...actionBtn, background:'var(--amber)' }}>🟠 Request Clarification</button>
              <button onClick={()=>setShowGate('reject')}  style={{ ...actionBtn, background:'var(--red)' }}>❌ Reject</button>
            </div>
          )
        )}
 
        {/* Procurement sourcing */}
        {(s==='Awaiting Procurement Action'||s==='Approved') && (
          <button onClick={beginSourcing} className={styles.btnSecondary}>🔍 Begin Vendor Sourcing &amp; RFQ</button>
        )}
 
        {/* Quotations */}
        {s==='Procurement Review' && (
          <div>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:10 }}>
              <input style={{ ...inputSt,width:180 }} placeholder="Vendor name" value={quoteVendor} onChange={e=>setQuoteVendor(e.target.value)} />
              <input style={{ ...inputSt,width:120 }} type="number" placeholder="Amount (₦)" value={quoteAmt} onChange={e=>setQuoteAmt(e.target.value)} />
              <input style={{ ...inputSt,width:100 }} type="number" placeholder="Lead (days)" value={quoteLead} onChange={e=>setQuoteLead(e.target.value)} />
              <button onClick={addQuote} className={styles.btnPrimary}>＋ Add Quote</button>
            </div>
            {localReq.quotes.length > 0 && (
              <table className={tableStyles.table} style={{ marginBottom:10 }}>
                <thead><tr><th>Vendor</th><th className={tableStyles.right}>Amount</th><th className={tableStyles.right}>Lead</th><th>Select</th></tr></thead>
                <tbody>
                  {localReq.quotes.map((q,i)=>(
                    <tr key={i} style={{ background:q.selected?'#e8f8f5':'' }}>
                      <td style={{ fontWeight:q.selected?700:400 }}>{q.vendor}{q.selected?' ✓':''}</td>
                      <td className={tableStyles.right}>{fmt(q.amount)}</td>
                      <td className={tableStyles.right}>{q.lead}d</td>
                      <td>{!q.selected && <button onClick={()=>selectVendor(i)} style={{ ...actionBtn,padding:'2px 8px' }}>Select</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {localReq.quotes.some(q=>q.selected) && (
              <button onClick={submitRecommendation} className={styles.btnSecondary}>📋 Submit Recommendation to Management</button>
            )}
          </div>
        )}
 
        {/* Gate 2 */}
        {s==='Awaiting Final Management Approval' && (
          showGate ? (
            <div>
              <textarea style={{ ...inputSt,resize:'vertical',minHeight:60,marginBottom:8 }}
                placeholder={showGate==='reject'?'Reason for rejection…':showGate==='alt'?'Reason for alternative vendor…':'Approval remark…'}
                value={remark} onChange={e=>setRemark(e.target.value)}/>
              <div style={{ display:'flex',gap:8 }}>
                {showGate==='approve' && <button onClick={gate2Approve} className={styles.btnSecondary}>✅ Confirm Gate 2 Approval</button>}
                {showGate==='reject'  && <button onClick={doReject}     style={{ ...actionBtn, background:'var(--red)' }}>❌ Confirm Reject</button>}
                {showGate==='alt'     && <button onClick={()=>{
                  const updated = { ...localReq, status:'Procurement Review', quotes:localReq.quotes.map(q=>({...q,selected:false})), history:[...localReq.history,{ ts:new Date().toISOString(),user:'Management',role:'admin',action:'Alternative Vendor Requested',remarks:remark }] };
                  setLocalReq(updated); onUpdate(updated); setShowGate(null); setRemark('');
                }} style={{ ...actionBtn, background:'var(--amber)' }}>🔄 Confirm Alt Vendor Request</button>}
                <button onClick={()=>{setShowGate(null);setRemark('');}} className={styles.btnGhost}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
              <button onClick={()=>setShowGate('approve')} className={styles.btnSecondary}>✅ Gate 2: Approve Vendor &amp; Proceed to PO</button>
              <button onClick={()=>setShowGate('alt')}     style={{ ...actionBtn, background:'var(--amber)' }}>🔄 Request Alternative Vendor</button>
              <button onClick={()=>setShowGate('reject')}  style={{ ...actionBtn, background:'var(--red)' }}>❌ Reject</button>
            </div>
          )
        )}
 
        {s==='Vendor Approved'     && <button onClick={issuePO}       className={styles.btnSecondary}>📄 Issue Purchase Order</button>}
        {s==='Purchase Order Issued'&&<button onClick={()=>advance('Vendor Confirmed','Vendor acknowledged receipt of PO')} className={styles.btnSecondary}>✓ Vendor Confirmed PO</button>}
        {s==='Vendor Confirmed'    && <button onClick={markDelivered}  className={styles.btnSecondary}>🚚 Mark as Delivered</button>}
        {s==='Delivered'           && (
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            <button onClick={receiveGoods}  className={styles.btnSecondary}>📥 Receive Full Delivery</button>
          </div>
        )}
 
        {s==='Goods Received' && (
          <div>
            {issues.length > 0 ? (
              <div style={{ background:'#FFF9E6',border:'1px solid #F4D03F',borderRadius:8,padding:'10px 14px',marginBottom:10,fontSize:11 }}>
                <strong>⚠️ Payment Gate — Action Required:</strong>
                <ul style={{ margin:'6px 0 0 16px',padding:0 }}>{issues.map(i=><li key={i}>{i}</li>)}</ul>
              </div>
            ) : (
              <div style={{ background:'#EAF3DE',border:'1px solid #3B6D11',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:11,color:'#155724',fontWeight:700 }}>
                ✓ All payment gate conditions met. Payment request can be raised.
              </div>
            )}
            <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
              {!localReq.invoiceUploaded && <button onClick={uploadInvoice} className={styles.btnPrimary}>📄 Upload Vendor Invoice</button>}
              {!issues.length && <button onClick={raisePayment} className={styles.btnSecondary}>💳 Raise Payment Request to Finance</button>}
            </div>
          </div>
        )}
 
        {s==='Awaiting Payment'    && <button onClick={()=>advance('Payment Processing','AP processing payment')} className={styles.btnSecondary}>⏱ Process Payment</button>}
        {s==='Payment Processing'  && <button onClick={markPaid}   className={styles.btnSecondary}>✅ Mark as Paid</button>}
        {s==='Paid'                && <button onClick={complete}    className={styles.btnSecondary}>✓ Mark Completed &amp; Close</button>}
      </div>
    );
  }
 
  const actionBtn = { padding:'6px 14px',color:'#fff',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer' };
 
  return (
    <Modal title={`🔄 P2P Detail — ${localReq.prNo}`} onClose={onClose}>
      {/* Meta */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 20px',fontSize:11,marginBottom:14,padding:'12px 14px',background:'#f8fafc',borderRadius:8 }}>
        {[['PR No',        localReq.prNo],['Date',      localReq.date],
          ['Department',   localReq.dept],['Requestor', localReq.requesterLbl],
          ['Priority',     localReq.priority],['Amount',  fmt(localReq.amount)],
          ['Vendor',       localReq.vendor||'—'],['PO No', localReq.poNo||'—'],
          ['Payment Ref',  localReq.payRef||'—'],['Status', localReq.status],
        ].map(([k,v])=>(
          <div key={k}><span style={{ fontWeight:700,color:'var(--muted)' }}>{k}: </span><span style={{ color:'var(--navy)',fontWeight:600 }}>{v}</span></div>
        ))}
      </div>
 
      {/* Workflow stepper */}
      <div style={{ marginBottom:14,padding:'12px 14px',background:'#fff',borderRadius:10,boxShadow:'0 1px 4px rgba(0,0,0,.06)',overflowX:'auto' }}>
        <div style={{ fontSize:11,fontWeight:700,color:'var(--navy)',marginBottom:8 }}>Workflow Progress</div>
        <WorkflowStepper status={localReq.status} />
      </div>
 
      {/* Line items */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11,fontWeight:700,color:'var(--navy)',marginBottom:8 }}>Line Items</div>
        <table className={tableStyles.table}>
          <thead><tr><th>Item</th><th className={tableStyles.right}>Qty</th><th className={tableStyles.right}>Unit Price</th><th className={tableStyles.right}>Total</th></tr></thead>
          <tbody>
            {localReq.lines.map((l,i)=>(
              <tr key={i}>
                <td style={{ fontWeight:600 }}>{l.item}</td>
                <td className={tableStyles.right}>{l.qty.toLocaleString()}</td>
                <td className={tableStyles.right}>{fmt(l.price)}</td>
                <td className={tableStyles.right} style={{ fontWeight:700 }}>{fmt(l.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3}>TOTAL</td><td className={tableStyles.right}>{fmt(localReq.amount)}</td></tr>
          </tfoot>
        </table>
      </div>
 
      {/* Payment gate status */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14 }}>
        {[
          { label:'PO Issued',         ok:!!localReq.poNo },
          { label:'GRN Completed',     ok:localReq.grnCompleted },
          { label:'Store Verified',    ok:localReq.storeVerified },
          { label:'Invoice Uploaded',  ok:localReq.invoiceUploaded },
        ].map(g=>(
          <div key={g.label} style={{ background:g.ok?'#d4edda':'#f8d7da',borderRadius:8,padding:'8px 10px',textAlign:'center' }}>
            <div style={{ fontSize:16 }}>{g.ok?'✅':'❌'}</div>
            <div style={{ fontSize:9,fontWeight:700,color:g.ok?'#155724':'#721c24',marginTop:3 }}>{g.label}</div>
          </div>
        ))}
      </div>
 
      {/* Action bar */}
      <ActionBar />
 
      {/* Audit trail */}
      <div style={{ marginBottom:0 }}>
        <div style={{ fontSize:11,fontWeight:700,color:'var(--navy)',marginBottom:10 }}>Audit Trail</div>
        <Timeline history={localReq.history} />
      </div>
    </Modal>
  );
}
 
/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function P2PPage() {
  const [activeTab, setActiveTab] = useState('queue');
  const [p2pList,   setP2pList]   = useState(SEED_P2P);
  const [detailReq, setDetailReq] = useState(null);
  const [search,    setSearch]    = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter,   setDeptFilter]   = useState('All');
 
  function updateReq(updated) {
    setP2pList(p => p.map(r => r.prNo === updated.prNo ? updated : r));
  }
 
  /* ── KPI totals ─────────────────────────────────────────────────────── */
  const pending   = p2pList.filter(r => r.status === 'Pending Management Approval' || r.status === 'Submitted').length;
  const pending2  = p2pList.filter(r => r.status === 'Awaiting Final Management Approval').length;
  const withProc  = p2pList.filter(r => ['Awaiting Procurement Action','Procurement Review'].includes(r.status)).length;
  const awaitPay  = p2pList.filter(r => r.status === 'Awaiting Payment' || r.status === 'Payment Processing').length;
  const completed = p2pList.filter(r => r.status === 'Completed' || r.status === 'Paid').length;
  const totalVal  = p2pList.reduce((s,r) => s + r.amount, 0);
 
  /* ── filtered queue ─────────────────────────────────────────────────── */
  const filteredQueue = useMemo(() => {
    const q = search.toLowerCase();
    return p2pList.filter(r =>
      (!q || r.prNo.toLowerCase().includes(q) || r.dept.toLowerCase().includes(q) || r.item.toLowerCase().includes(q)) &&
      (statusFilter === 'All' || r.status === statusFilter) &&
      (deptFilter   === 'All' || r.dept   === deptFilter)
    );
  }, [p2pList, search, statusFilter, deptFilter]);
 
  /* ── analytics data ─────────────────────────────────────────────────── */
  const byDept = useMemo(() => {
    const m = {};
    p2pList.forEach(r => { m[r.dept] = (m[r.dept]||0) + r.amount; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [p2pList]);
 
  const byStatus = useMemo(() => {
    const m = {};
    p2pList.forEach(r => { m[r.status] = (m[r.status]||0) + 1; });
    return Object.entries(m);
  }, [p2pList]);
 
  const byVendor = useMemo(() => {
    const m = {};
    p2pList.filter(r=>r.vendor).forEach(r => { m[r.vendor] = (m[r.vendor]||0) + r.amount; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6);
  }, [p2pList]);
 
  const allStatuses = ['All', ...new Set(p2pList.map(r=>r.status))];
  const allDepts    = ['All', ...new Set(p2pList.map(r=>r.dept))];
 
  const TABS = [
    { id:'queue',     label:'📋 Work Queue'       },
    { id:'analytics', label:'📊 Analytics'         },
    { id:'outstanding',label:'💳 Outstanding Payments' },
  ];
 
  return (
    <div>
      {detailReq && (
        <DetailPanel
          req={detailReq}
          onClose={()=>setDetailReq(null)}
          onUpdate={(updated)=>{ updateReq(updated); setDetailReq(updated); }}
        />
      )}
 
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🔄 Procure-to-Pay (P2P)</h2>
          <p className={styles.pageMeta}>End-to-end: request → Gate 1 → vendor sourcing → Gate 2 → PO → delivery → payment</p>
        </div>
      </div>
 
      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Pending Gate 1"          value={pending.toString()}    delta="Awaiting Management"     deltaType={pending>0?'warn':'up'}    badge={pending>0?'Action':'Clear'} badgeType={pending>0?'warn':'good'} color={pending>0?'amber':'green'} />
        <KPICard label="Pending Gate 2"           value={pending2.toString()}   delta="Vendor approval needed"  deltaType={pending2>0?'warn':'up'}   badge={pending2>0?'Action':'Clear'} badgeType={pending2>0?'warn':'good'} color={pending2>0?'amber':'green'} />
        <KPICard label="With Procurement"         value={withProc.toString()}   delta="Sourcing / RFQ"          deltaType="neutral"                  color="blue"   />
        <KPICard label="Awaiting Payment"         value={awaitPay.toString()}   delta="AP / Finance action"     deltaType={awaitPay>0?'warn':'up'}   color={awaitPay>0?'amber':'green'} />
        <KPICard label="Completed / Paid"         value={completed.toString()}  delta="Closed out"              deltaType="up"                       color="green"  />
        <KPICard label="Total P2P Requests"       value={p2pList.length.toString()} delta="All time"            deltaType="neutral"                  color="blue"   />
        <KPICard label="Total P2P Value"          value={fmt(totalVal)}         delta="All requests"            deltaType="neutral"                  color="purple" />
        <KPICard label="Cancelled / Rejected"     value={p2pList.filter(r=>isTerminal(r.status)).length.toString()} delta="Closed negative" deltaType="down" color="red" />
      </div>
 
      {/* ── Tab Strip ───────────────────────────────────────────────────── */}
      <div className={styles.tabStrip}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`${styles.tabBtn} ${activeTab===t.id?styles.active:''}`}>
            {t.label}
          </button>
        ))}
      </div>
 
      {/* ════ TAB: Work Queue ════════════════════════════════════════════ */}
      {activeTab === 'queue' && (
        <>
          <div className={styles.toolbar}>
            <input className={styles.toolbarSearch} placeholder="🔍 Search PR no / dept / item…"
              value={search} onChange={e=>setSearch(e.target.value)} />
            <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
              value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              {allStatuses.map(s=><option key={s}>{s}</option>)}
            </select>
            <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
              value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}>
              {allDepts.map(d=><option key={d}>{d}</option>)}
            </select>
            <span className={styles.spacer}/>
            <span style={{ fontSize:11,color:'var(--muted)' }}>{filteredQueue.length} requests</span>
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>P2P Work Queue</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>PR No</th><th>Date</th><th>Department</th><th>Requestor</th>
                  <th>Item(s)</th>
                  <th className={tableStyles.right}>Amount</th>
                  <th>Priority</th><th>Status</th><th>Vendor</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map(r => (
                  <tr key={r.prNo}>
                    <td style={{ fontFamily:'monospace',fontSize:10,fontWeight:700 }}>{r.prNo}</td>
                    <td style={{ whiteSpace:'nowrap' }}>{r.date}</td>
                    <td style={{ fontWeight:600 }}>{r.dept}</td>
                    <td style={{ fontSize:10,color:'var(--muted)' }}>{r.requesterLbl}</td>
                    <td style={{ maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.item}</td>
                    <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(r.amount)}</td>
                    <td><span className={`${tableStyles.badge} ${PRIORITY_BADGE[r.priority]??tableStyles.grey}`}>{r.priority}</span></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ fontSize:10,color:'var(--muted)' }}>{r.vendor||'—'}</td>
                    <td>
                      <button onClick={()=>setDetailReq(r)}
                        style={{ padding:'3px 9px',background:'var(--navy)',color:'#fff',border:'none',borderRadius:5,cursor:'pointer',fontSize:10,whiteSpace:'nowrap' }}>
                        Open →
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredQueue.length === 0 && (
                  <tr><td colSpan={10} className={tableStyles.emptyState}>No P2P requests match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
 
          {/* Workflow stage summary */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10 }}>
            {[
              { label:'Gate 1 — Pending', val:p2pList.filter(r=>r.status==='Pending Management Approval'||r.status==='Submitted').length, color:'#CA6F1E', bg:'#fff3cd' },
              { label:'With Procurement', val:p2pList.filter(r=>['Awaiting Procurement Action','Procurement Review'].includes(r.status)).length, color:'#1B4F72', bg:'#d1ecf1' },
              { label:'Gate 2 — Pending', val:p2pList.filter(r=>r.status==='Awaiting Final Management Approval').length, color:'#6C3483', bg:'#e8d5f5' },
              { label:'PO / Delivery',    val:p2pList.filter(r=>['Vendor Approved','Purchase Order Issued','Vendor Confirmed','Delivered'].includes(r.status)).length, color:'#1B4F72', bg:'#d1ecf1' },
              { label:'Goods Received',   val:p2pList.filter(r=>r.status==='Goods Received').length, color:'#117A65', bg:'#d4edda' },
              { label:'Awaiting Payment', val:p2pList.filter(r=>['Awaiting Payment','Payment Processing'].includes(r.status)).length, color:'#CA6F1E', bg:'#fff3cd' },
              { label:'Completed',        val:p2pList.filter(r=>r.status==='Completed').length, color:'#117A65', bg:'#d4edda' },
              { label:'Rejected / Cancelled', val:p2pList.filter(r=>isTerminal(r.status)).length, color:'#C0392B', bg:'#f8d7da' },
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg,borderRadius:8,padding:'10px 14px',borderLeft:`3px solid ${s.color}` }}>
                <div style={{ fontSize:9,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:.4 }}>{s.label}</div>
                <div style={{ fontSize:22,fontWeight:800,color:s.color,marginTop:2 }}>{s.val}</div>
              </div>
            ))}
          </div>
        </>
      )}
 
      {/* ════ TAB: Analytics ═════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Spend by Department</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{ labels:byDept.map(e=>e[0]), datasets:[{ data:byDept.map(e=>+(e[1]/1e6).toFixed(2)), backgroundColor:COLORS, borderRadius:4 }] }}
                  options={{ ...BASE, indexAxis:'y', scales:{ x:{ ...Y_NGN }, y:X_NONE } }}
                />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>P2P Status Pipeline</div>
              <div style={{ height:220 }}>
                <Doughnut
                  data={{ labels:byStatus.map(e=>e[0]), datasets:[{ data:byStatus.map(e=>e[1]), backgroundColor:COLORS, borderWidth:2, borderColor:'#fff' }] }}
                  options={{ responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{ legend:{ display:true,position:'right',labels:{ font:FONT,boxWidth:10 } } } }}
                />
              </div>
            </div>
          </div>
 
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Spend by Vendor</div>
              <div style={{ height:200 }}>
                <Bar
                  data={{ labels:byVendor.map(e=>e[0]), datasets:[{ data:byVendor.map(e=>+(e[1]/1e6).toFixed(2)), backgroundColor:COLORS, borderRadius:4 }] }}
                  options={{ ...BASE, indexAxis:'y', scales:{ x:Y_NGN, y:X_NONE } }}
                />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Request Value by Priority</div>
              <div style={{ height:200 }}>
                <Bar
                  data={{
                    labels:['High','Normal','Low','Urgent'],
                    datasets:[{ data:['High','Normal','Low','Urgent'].map(p=>+(p2pList.filter(r=>r.priority===p).reduce((s,r)=>s+r.amount,0)/1e6).toFixed(2)), backgroundColor:['#C0392B','#1B4F72','#117A65','#CA6F1E'], borderRadius:4 }],
                  }}
                  options={{ ...BASE, scales:{ x:X_NONE, y:Y_NGN } }}
                />
              </div>
            </div>
          </div>
 
          {/* Full analytics table */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>All P2P Requests — Summary</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>PR No</th><th>Date</th><th>Dept</th><th>Item</th>
                  <th className={tableStyles.right}>Amount</th>
                  <th>Priority</th><th>Status</th><th>Vendor</th><th>PO No</th>
                </tr>
              </thead>
              <tbody>
                {p2pList.map(r=>(
                  <tr key={r.prNo} onClick={()=>setDetailReq(r)} style={{ cursor:'pointer' }}>
                    <td style={{ fontFamily:'monospace',fontSize:10,fontWeight:700 }}>{r.prNo}</td>
                    <td>{r.date}</td>
                    <td style={{ fontWeight:600 }}>{r.dept}</td>
                    <td style={{ maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.item}</td>
                    <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(r.amount)}</td>
                    <td><span className={`${tableStyles.badge} ${PRIORITY_BADGE[r.priority]??tableStyles.grey}`}>{r.priority}</span></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ fontSize:10 }}>{r.vendor||'—'}</td>
                    <td style={{ fontFamily:'monospace',fontSize:10 }}>{r.poNo||'—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>TOTAL ({p2pList.length} requests)</td>
                  <td className={tableStyles.right}>{fmt(totalVal)}</td>
                  <td colSpan={4}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Outstanding Payments ══════════════════════════════════ */}
      {activeTab === 'outstanding' && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16 }}>
            {[
              { label:'Awaiting Payment',   val:p2pList.filter(r=>r.status==='Awaiting Payment').reduce((s,r)=>s+r.amount,0),  color:'#CA6F1E',bg:'#fff3cd' },
              { label:'Payment Processing', val:p2pList.filter(r=>r.status==='Payment Processing').reduce((s,r)=>s+r.amount,0),color:'#1B4F72',bg:'#d1ecf1' },
              { label:'Paid (This Period)', val:p2pList.filter(r=>r.status==='Paid'||r.status==='Completed').reduce((s,r)=>s+r.amount,0),color:'#117A65',bg:'#d4edda' },
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg,borderRadius:10,padding:'14px 18px',borderLeft:`4px solid ${s.color}` }}>
                <div style={{ fontSize:10,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:.4,marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:22,fontWeight:800,color:s.color }}>{fmt(s.val)}</div>
              </div>
            ))}
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Requests Awaiting or Processing Payment</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>PR No</th><th>Dept</th><th>Item</th><th>Vendor</th><th>PO No</th>
                  <th className={tableStyles.right}>Amount</th>
                  <th>Pay Ref</th><th>Status</th>
                  <th>Gate Check</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {p2pList.filter(r=>['Goods Received','Awaiting Payment','Payment Processing','Paid'].includes(r.status)).map(r=>{
                  const issues = paymentGateIssues(r);
                  return (
                    <tr key={r.prNo}>
                      <td style={{ fontFamily:'monospace',fontSize:10,fontWeight:700 }}>{r.prNo}</td>
                      <td style={{ fontWeight:600 }}>{r.dept}</td>
                      <td style={{ maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.item}</td>
                      <td style={{ fontSize:10 }}>{r.vendor||'—'}</td>
                      <td style={{ fontFamily:'monospace',fontSize:10 }}>{r.poNo||'—'}</td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(r.amount)}</td>
                      <td style={{ fontFamily:'monospace',fontSize:10 }}>{r.payRef||'—'}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        {issues.length === 0
                          ? <span className={`${tableStyles.badge} ${tableStyles.green}`}>✓ Gate Clear</span>
                          : <span className={`${tableStyles.badge} ${tableStyles.amber}`}>{issues.length} pending</span>
                        }
                      </td>
                      <td>
                        <button onClick={()=>setDetailReq(r)}
                          style={{ padding:'3px 9px',background:'var(--navy)',color:'#fff',border:'none',borderRadius:5,cursor:'pointer',fontSize:10 }}>
                          Open →
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {p2pList.filter(r=>['Goods Received','Awaiting Payment','Payment Processing','Paid'].includes(r.status)).length===0 && (
                  <tr><td colSpan={10} className={tableStyles.emptyState}>No payment-stage requests.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}