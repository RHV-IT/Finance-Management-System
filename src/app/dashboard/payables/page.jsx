'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { fmt, COLORS } from '../lib/data';
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
 
/* ── chart defaults ─────────────────────────────────────────────────────── */
const FONT   = { family: "'Inter','Segoe UI',Arial,sans-serif", size: 10 };
const GRID   = 'rgba(0,0,0,0.05)';
const BASE   = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const X_NONE = { grid: { display: false }, ticks: { font: FONT } };
const Y_NGN  = { grid: { color: GRID }, ticks: { font: FONT, callback: v => '₦' + v + 'M' } };
const LEG_B  = { display: true, position: 'bottom', labels: { font: FONT, boxWidth: 10 } };
 
/* ── seed data ──────────────────────────────────────────────────────────── */
const SEED_PAYABLES = [
  { id:'PAY-001', supplier:'Pharmaplus Nigeria Ltd',    invoiceNo:'PHM-2025-089', invoiceDate:'2025-11-01', dueDate:'2025-11-30', amount:3_450_000, paidAmount:0,         category:'Pharmaceuticals',  poRef:'PO-112185', status:'Overdue',  notes:'14 days overdue. Supplier called twice.' },
  { id:'PAY-002', supplier:'MedEquip Supplies Ltd',    invoiceNo:'MEQ-2025-112', invoiceDate:'2025-11-08', dueDate:'2025-12-08', amount:1_800_000, paidAmount:0,         category:'Medical Equipment',poRef:'PO-112202', status:'Pending',  notes:'Due in 5 days.' },
  { id:'PAY-003', supplier:'HealthCare Distributors',  invoiceNo:'HCD-2025-447', invoiceDate:'2025-10-25', dueDate:'2025-11-24', amount:2_800_000, paidAmount:2_800_000, category:'Consumables',      poRef:'PO-112198', status:'Paid',     notes:'Paid via bank transfer.' },
  { id:'PAY-004', supplier:'Lagos Medical Stores',     invoiceNo:'LMS-2025-203', invoiceDate:'2025-11-10', dueDate:'2025-12-10', amount:1_750_000, paidAmount:0,         category:'Pharmaceuticals',  poRef:'PO-112195', status:'Pending',  notes:'Awaiting MD approval.' },
  { id:'PAY-005', supplier:'DiagnosTech Nigeria',      invoiceNo:'DTN-2025-088', invoiceDate:'2025-11-05', dueDate:'2025-12-05', amount:1_350_000, paidAmount:0,         category:'Lab Reagents',     poRef:'PO-112190', status:'Approved', notes:'AP processing. Bank transfer scheduled.' },
  { id:'PAY-006', supplier:'ProMed Nigeria',           invoiceNo:'PMN-2025-312', invoiceDate:'2025-10-15', dueDate:'2025-11-14', amount:2_800_000, paidAmount:0,         category:'Consumables',      poRef:'PO-112170', status:'Overdue',  notes:'14 days overdue. Dispute on delivery qty.' },
  { id:'PAY-007', supplier:'Clinix Supplies Ltd',      invoiceNo:'CLX-2025-091', invoiceDate:'2025-11-12', dueDate:'2025-12-12', amount:1_320_000, paidAmount:1_320_000, category:'Surgical Supplies', poRef:'PO-112175', status:'Paid',     notes:'Paid.' },
  { id:'PAY-008', supplier:'ImageCare Ltd',            invoiceNo:'IMG-2025-055', invoiceDate:'2025-11-18', dueDate:'2025-12-18', amount:  600_000, paidAmount:0,         category:'Radiology',        poRef:'PO-112180', status:'Pending',  notes:'Invoice under verification.' },
  { id:'PAY-009', supplier:'PowerGen Nigeria Ltd',     invoiceNo:'PGN-2025-022', invoiceDate:'2025-09-01', dueDate:'2025-10-01', amount:  950_000, paidAmount:0,         category:'Plant & Machinery', poRef:'PO-111900', status:'Overdue',  notes:'60 days overdue. Escalated.' },
  { id:'PAY-010', supplier:'OfficeMart Nigeria',       invoiceNo:'OMN-2025-108', invoiceDate:'2025-11-15', dueDate:'2025-12-15', amount:  185_000, paidAmount:185_000,   category:'Office Supplies',  poRef:'PO-111502', status:'Paid',     notes:'Paid.' },
  { id:'PAY-011', supplier:'Toyota Nigeria Ltd',       invoiceNo:'TNL-2025-015', invoiceDate:'2025-10-01', dueDate:'2025-11-01', amount:  340_000, paidAmount:0,         category:'Motor Vehicle',    poRef:'PO-111800', status:'Overdue',  notes:'Vehicle service invoice. 28 days overdue.' },
  { id:'PAY-012', supplier:'Pharmaplus Nigeria Ltd',   invoiceNo:'PHM-2025-101', invoiceDate:'2025-11-20', dueDate:'2025-12-20', amount:5_200_000, paidAmount:0,         category:'Pharmaceuticals',  poRef:'PO-112201', status:'Approved', notes:'Gate-cleared. Ready for payment run.' },
];
 
const TODAY = '2025-11-28';
 
/* ── helpers ─────────────────────────────────────────────────────────────── */
function daysDue(dueDate) {
  const diff = (new Date(TODAY) - new Date(dueDate)) / 864e5;
  return Math.round(diff);
}
 
function ageBucket(dueDate) {
  const d = daysDue(dueDate);
  if (d < 0)   return 'Not Due';
  if (d <= 30)  return '0–30 Days';
  if (d <= 60)  return '31–60 Days';
  if (d <= 90)  return '61–90 Days';
  return '90+ Days';
}
 
const STATUS_MAP = {
  Overdue:  { cls: tableStyles.red,    label: 'Overdue'  },
  Pending:  { cls: tableStyles.amber,  label: 'Pending'  },
  Approved: { cls: tableStyles.blue,   label: 'Approved' },
  Paid:     { cls: tableStyles.green,  label: 'Paid'     },
  Disputed: { cls: tableStyles.purple, label: 'Disputed' },
};
 
function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] ?? { cls: tableStyles.grey, label: status };
  return <span className={`${tableStyles.badge} ${cfg.cls}`}>{cfg.label}</span>;
}
 
const inp = { padding:'7px 9px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none', width:'100%', fontFamily:'inherit', boxSizing:'border-box' };
 
function Field({ label, span, children }) {
  return (
    <label style={{ display:'flex', flexDirection:'column', fontSize:10, fontWeight:700, color:'var(--navy)', gap:4, gridColumn: span ? `span ${span}` : undefined }}>
      {label}{children}
    </label>
  );
}
 
function Modal({ title, onClose, onSave, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:12, width:640, maxWidth:'96vw', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:800, color:'var(--navy)' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--muted)', lineHeight:1 }}>✕</button>
        </div>
        <div style={{ padding:18, overflowY:'auto', flex:1 }}>{children}</div>
        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <button onClick={onClose} className={styles.btnGhost}>Cancel</button>
          <button onClick={onSave}  className={styles.btnSecondary}>💾 Save</button>
        </div>
      </div>
    </div>
  );
}
 
/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function PayablesPage() {
  const [activeTab,    setActiveTab]    = useState('outstanding');
  const [payables,     setPayables]     = useState(SEED_PAYABLES);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [catFilter,    setCatFilter]    = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(null); // invoice id
  const [detailItem,   setDetailItem]   = useState(null);
 
  const [addForm, setAddForm] = useState({
    supplier:'', invoiceNo:'', invoiceDate: TODAY, dueDate:'',
    amount:'', category:'Pharmaceuticals', poRef:'', notes:'', status:'Pending',
  });
 
  /* ── KPI calculations ─────────────────────────────────────────────── */
  const unpaid      = payables.filter(p => p.status !== 'Paid');
  const overdue     = payables.filter(p => p.status === 'Overdue');
  const totalOut    = unpaid.reduce((s,p)  => s + (p.amount - p.paidAmount), 0);
  const totalOverdue= overdue.reduce((s,p) => s + (p.amount - p.paidAmount), 0);
  const totalPaid   = payables.filter(p=>p.status==='Paid').reduce((s,p) => s + p.paidAmount, 0);
  const due7        = unpaid.filter(p => { const d = daysDue(p.dueDate); return d >= -7 && d <= 0; });
  const due30Val    = unpaid.filter(p => daysDue(p.dueDate) <= 0).reduce((s,p) => s + (p.amount-p.paidAmount),0);
  const supplierCount = new Set(payables.map(p=>p.supplier)).size;
 
  /* ── filtered list ────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payables.filter(p =>
      (!q || p.supplier.toLowerCase().includes(q) || p.invoiceNo.toLowerCase().includes(q) || p.poRef.toLowerCase().includes(q)) &&
      (statusFilter === 'All' || p.status === statusFilter) &&
      (catFilter    === 'All' || p.category === catFilter)
    );
  }, [payables, search, statusFilter, catFilter]);
 
  /* ── ageing buckets ───────────────────────────────────────────────── */
  const ageing = useMemo(() => {
    const buckets = { 'Not Due':0, '0–30 Days':0, '31–60 Days':0, '61–90 Days':0, '90+ Days':0 };
    unpaid.forEach(p => { buckets[ageBucket(p.dueDate)] = (buckets[ageBucket(p.dueDate)]||0) + (p.amount - p.paidAmount); });
    return buckets;
  }, [payables]);
 
  const bySupplier = useMemo(() => {
    const m = {};
    unpaid.forEach(p => { m[p.supplier] = (m[p.supplier]||0) + (p.amount - p.paidAmount); });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8);
  }, [payables]);
 
  const byCategory = useMemo(() => {
    const m = {};
    unpaid.forEach(p => { m[p.category] = (m[p.category]||0) + (p.amount - p.paidAmount); });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [payables]);
 
  const allCats     = ['All', ...new Set(payables.map(p=>p.category))];
  const allStatuses = ['All', 'Overdue', 'Pending', 'Approved', 'Paid', 'Disputed'];
 
  /* ── actions ──────────────────────────────────────────────────────── */
  function saveInvoice() {
    if (!addForm.supplier || !addForm.amount) { alert('Supplier and amount are required.'); return; }
    const rec = {
      id: `PAY-${String(payables.length+1).padStart(3,'0')}`,
      ...addForm, amount: +addForm.amount, paidAmount: 0,
    };
    setPayables(p => [rec, ...p]);
    setShowAddModal(false);
    setAddForm({ supplier:'', invoiceNo:'', invoiceDate:TODAY, dueDate:'', amount:'', category:'Pharmaceuticals', poRef:'', notes:'', status:'Pending' });
  }
 
  function markApproved(id) {
    setPayables(p => p.map(x => x.id === id ? { ...x, status:'Approved' } : x));
  }
 
  function markPaid(id, method) {
    setPayables(p => p.map(x => x.id === id ? { ...x, status:'Paid', paidAmount: x.amount, notes:`Paid via ${method}.` } : x));
    setShowPayModal(null);
    setDetailItem(null);
  }
 
  function markDisputed(id) {
    setPayables(p => p.map(x => x.id === id ? { ...x, status:'Disputed' } : x));
  }
 
  function exportCSV() {
    const rows = ['ID,Supplier,Invoice No,Invoice Date,Due Date,Amount,Paid,Outstanding,Category,PO Ref,Status,Notes'];
    payables.forEach(p => rows.push(`"${p.id}","${p.supplier}","${p.invoiceNo}","${p.invoiceDate}","${p.dueDate}",${p.amount},${p.paidAmount},${p.amount-p.paidAmount},"${p.category}","${p.poRef}","${p.status}","${p.notes}"`));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'})); a.download='payables.csv'; a.click();
  }
 
  const TABS = [
    { id:'outstanding', label:'💳 Outstanding Invoices' },
    { id:'ageing',      label:'📅 Ageing Analysis'      },
    { id:'analytics',   label:'📊 Analytics'             },
    { id:'paid',        label:'✅ Paid History'           },
  ];
 
  return (
    <DashboardLayout>
      {/* ── Add Invoice Modal ────────────────────────────────────────── */}
      {showAddModal && (
        <Modal title="💳 Add Payable Invoice" onClose={()=>setShowAddModal(false)} onSave={saveInvoice}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 16px' }}>
            <Field label="Supplier / Vendor" span={2}>
              <input style={inp} value={addForm.supplier} onChange={e=>setAddForm(p=>({...p,supplier:e.target.value}))} placeholder="Supplier name" />
            </Field>
            <Field label="Invoice Number">
              <input style={inp} value={addForm.invoiceNo} onChange={e=>setAddForm(p=>({...p,invoiceNo:e.target.value}))} placeholder="INV-2025-000" />
            </Field>
            <Field label="PO Reference">
              <input style={inp} value={addForm.poRef} onChange={e=>setAddForm(p=>({...p,poRef:e.target.value}))} placeholder="PO-000000" />
            </Field>
            <Field label="Invoice Date">
              <input type="date" style={inp} value={addForm.invoiceDate} onChange={e=>setAddForm(p=>({...p,invoiceDate:e.target.value}))} />
            </Field>
            <Field label="Due Date">
              <input type="date" style={inp} value={addForm.dueDate} onChange={e=>setAddForm(p=>({...p,dueDate:e.target.value}))} />
            </Field>
            <Field label="Amount (₦)">
              <input type="number" min={0} style={inp} value={addForm.amount} onChange={e=>setAddForm(p=>({...p,amount:e.target.value}))} placeholder="0" />
            </Field>
            <Field label="Category">
              <select style={inp} value={addForm.category} onChange={e=>setAddForm(p=>({...p,category:e.target.value}))}>
                {['Pharmaceuticals','Medical Equipment','Consumables','Lab Reagents','Surgical Supplies','Radiology','Plant & Machinery','Motor Vehicle','Office Supplies','Other'].map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Notes" span={2}>
              <textarea style={{ ...inp, resize:'vertical', minHeight:50 }} value={addForm.notes} onChange={e=>setAddForm(p=>({...p,notes:e.target.value}))} placeholder="Optional notes…" />
            </Field>
          </div>
        </Modal>
      )}
 
      {/* ── Payment Modal ────────────────────────────────────────────── */}
      {showPayModal && (()=>{
        const inv = payables.find(p=>p.id===showPayModal);
        const [method, setMethod] = useState('Bank Transfer');
        return (
          <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <div style={{ background:'#fff',borderRadius:12,width:460,maxWidth:'96vw',boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
              <div style={{ padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between' }}>
                <span style={{ fontSize:15,fontWeight:800,color:'var(--navy)' }}>💳 Process Payment</span>
                <button onClick={()=>setShowPayModal(null)} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--muted)' }}>✕</button>
              </div>
              <div style={{ padding:18 }}>
                <div style={{ marginBottom:14,padding:'12px 14px',background:'#f8fafc',borderRadius:8 }}>
                  {[['Supplier',inv.supplier],['Invoice No',inv.invoiceNo],['Amount Due',fmt(inv.amount-inv.paidAmount)],['Due Date',inv.dueDate]].map(([k,v])=>(
                    <div key={k} style={{ display:'flex',justifyContent:'space-between',fontSize:11,padding:'4px 0',borderBottom:'1px solid var(--border)' }}>
                      <span style={{ color:'var(--muted)',fontWeight:600 }}>{k}</span>
                      <span style={{ fontWeight:700,color:'var(--navy)' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <Field label="Payment Method">
                  <select style={inp} value={method} onChange={e=>setMethod(e.target.value)}>
                    <option>Bank Transfer</option><option>Cheque</option><option>Cash</option><option>Online Transfer</option>
                  </select>
                </Field>
                <div style={{ background:'#d4edda',borderRadius:8,padding:'10px 14px',marginTop:12,fontSize:11,fontWeight:700,color:'#155724' }}>
                  ✅ This will mark the invoice as fully paid and post a GL journal (Dr Trade Creditors / Cr Bank).
                </div>
              </div>
              <div style={{ padding:'12px 18px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:8 }}>
                <button onClick={()=>setShowPayModal(null)} className={styles.btnGhost}>Cancel</button>
                <button onClick={()=>markPaid(inv.id,method)} className={styles.btnSecondary}>✅ Confirm Payment — {fmt(inv.amount-inv.paidAmount)}</button>
              </div>
            </div>
          </div>
        );
      })()}
 
      {/* ── Detail Panel ─────────────────────────────────────────────── */}
      {detailItem && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div style={{ background:'#fff',borderRadius:12,width:540,maxWidth:'96vw',maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
            <div style={{ padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <span style={{ fontSize:15,fontWeight:800,color:'var(--navy)' }}>💳 {detailItem.invoiceNo}</span>
              <button onClick={()=>setDetailItem(null)} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--muted)' }}>✕</button>
            </div>
            <div style={{ padding:18,overflowY:'auto',flex:1 }}>
              {/* Status banner */}
              <div style={{ padding:'10px 14px',borderRadius:8,marginBottom:14,background: detailItem.status==='Overdue'?'#f8d7da':detailItem.status==='Paid'?'#d4edda':'#fff3cd', color: detailItem.status==='Overdue'?'#721c24':detailItem.status==='Paid'?'#155724':'#856404',fontWeight:700,fontSize:12 }}>
                {detailItem.status==='Overdue'?`⚠️ OVERDUE — ${daysDue(detailItem.dueDate)} days past due`:detailItem.status==='Paid'?'✅ PAID — Invoice fully settled':'📋 Status: '+detailItem.status}
              </div>
              {/* Info grid */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 20px',fontSize:11,marginBottom:16,padding:'12px 14px',background:'#f8fafc',borderRadius:8 }}>
                {[['Supplier',detailItem.supplier],['Invoice No',detailItem.invoiceNo],['PO Reference',detailItem.poRef||'—'],['Category',detailItem.category],['Invoice Date',detailItem.invoiceDate],['Due Date',detailItem.dueDate],['Invoice Amount',fmt(detailItem.amount)],['Amount Paid',fmt(detailItem.paidAmount)],['Outstanding',fmt(detailItem.amount-detailItem.paidAmount)],['Days Overdue',daysDue(detailItem.dueDate)>0?daysDue(detailItem.dueDate)+' days':'Not due']].map(([k,v])=>(
                  <div key={k}><span style={{ fontWeight:700,color:'var(--muted)' }}>{k}: </span><span style={{ fontWeight:600,color:'var(--navy)' }}>{v}</span></div>
                ))}
              </div>
              {/* Notes */}
              {detailItem.notes && (
                <div style={{ padding:'10px 14px',background:'#FFF9E6',border:'1px solid #F4D03F',borderRadius:8,fontSize:11,marginBottom:14 }}>
                  <strong>Notes:</strong> {detailItem.notes}
                </div>
              )}
              {/* Payment progress */}
              <div style={{ marginBottom:14 }}>
                <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:4 }}>
                  <span style={{ color:'var(--muted)',fontWeight:600 }}>Payment Progress</span>
                  <span style={{ fontWeight:700,color:'var(--navy)' }}>{detailItem.amount>0?(detailItem.paidAmount/detailItem.amount*100).toFixed(0):0}%</span>
                </div>
                <div style={{ background:'#e8ecf0',borderRadius:6,height:10,overflow:'hidden' }}>
                  <div style={{ height:'100%',borderRadius:6,background:detailItem.status==='Paid'?'#117A65':'#1B4F72',width:`${detailItem.amount>0?(detailItem.paidAmount/detailItem.amount*100):0}%`,transition:'width .6s' }}/>
                </div>
              </div>
              {/* Actions */}
              {detailItem.status !== 'Paid' && (
                <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                  {detailItem.status === 'Pending' && (
                    <button onClick={()=>{ markApproved(detailItem.id); setDetailItem({...detailItem,status:'Approved'}); }} className={styles.btnSecondary}>✅ Approve for Payment</button>
                  )}
                  {(detailItem.status === 'Approved' || detailItem.status === 'Pending') && (
                    <button onClick={()=>{ setShowPayModal(detailItem.id); setDetailItem(null); }} className={styles.btnPrimary}>💳 Process Payment</button>
                  )}
                  {detailItem.status !== 'Disputed' && (
                    <button onClick={()=>{ markDisputed(detailItem.id); setDetailItem({...detailItem,status:'Disputed'}); }}
                      style={{ padding:'6px 14px',background:'#fff',color:'var(--purple)',border:'1.5px solid var(--purple)',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer' }}>
                      ⚠️ Mark Disputed
                    </button>
                  )}
                </div>
              )}
            </div>
            <div style={{ padding:'12px 18px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end' }}>
              <button onClick={()=>setDetailItem(null)} className={styles.btnGhost}>Close</button>
            </div>
          </div>
        </div>
      )}
 
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>💳 Accounts Payable</h2>
          <p className={styles.pageMeta}>Supplier invoices · Ageing analysis · Payment processing · FY 2025</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className={styles.btnSecondary} onClick={()=>setShowAddModal(true)}>＋ Add Invoice</button>
          <button className={styles.btnGhost}     onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      </div>
 
      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Outstanding"    value={fmt(totalOut)}          delta={`${unpaid.length} unpaid invoices`}            deltaType="warn"                        color="red"    />
        <KPICard label="Overdue Amount"        value={fmt(totalOverdue)}      delta={`${overdue.length} overdue invoices`}           deltaType={overdue.length>0?'warn':'up'} badge={overdue.length>0?'Action':'Clear'} badgeType={overdue.length>0?'bad':'good'} color={overdue.length>0?'red':'green'} />
        <KPICard label="Due Within 7 Days"    value={fmt(due7.reduce((s,p)=>s+(p.amount-p.paidAmount),0))} delta={`${due7.length} invoices`} deltaType="warn" color="amber" />
        <KPICard label="Approved for Payment" value={fmt(payables.filter(p=>p.status==='Approved').reduce((s,p)=>s+(p.amount-p.paidAmount),0))} delta="Ready to pay" deltaType="neutral" color="blue" />
        <KPICard label="Total Paid (YTD)"     value={fmt(totalPaid)}         delta="Settled invoices"                              deltaType="up"                          color="green"  />
        <KPICard label="Active Suppliers"     value={supplierCount.toString()} delta="With invoices"                              deltaType="neutral"                     color="purple" />
        <KPICard label="Disputed Invoices"    value={payables.filter(p=>p.status==='Disputed').length.toString()} delta="Under query" deltaType={payables.filter(p=>p.status==='Disputed').length>0?'warn':'up'} color="amber" />
        <KPICard label="Total Invoices"       value={payables.length.toString()} delta="All time"                                 deltaType="neutral"                     color="blue"   />
      </div>
 
      {/* ── Tab Strip ───────────────────────────────────────────────────── */}
      <div className={styles.tabStrip}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`${styles.tabBtn} ${activeTab===t.id?styles.active:''}`}>
            {t.label}
          </button>
        ))}
      </div>
 
      {/* ════ TAB: Outstanding Invoices ══════════════════════════════════ */}
      {activeTab === 'outstanding' && (
        <>
          {/* Overdue alert banner */}
          {overdue.length > 0 && (
            <div style={{ background:'#FEECEC',border:'1px solid #F1948A',borderRadius:10,padding:'12px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:12 }}>
              <span style={{ fontSize:20 }}>🔴</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700,fontSize:12,color:'#721c24' }}>{overdue.length} overdue invoices totalling {fmt(totalOverdue)}</div>
                <div style={{ fontSize:11,color:'#721c24',marginTop:2 }}>Immediate action required. Overdue payables damage supplier relationships and credit terms.</div>
              </div>
              <button onClick={()=>setStatusFilter('Overdue')} style={{ padding:'6px 12px',background:'#721c24',color:'#fff',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer' }}>View Overdue</button>
            </div>
          )}
 
          <div className={styles.toolbar}>
            <input className={styles.toolbarSearch} placeholder="🔍 Search supplier / invoice no / PO ref…"
              value={search} onChange={e=>setSearch(e.target.value)} />
            <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
              value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              {allStatuses.map(s=><option key={s}>{s}</option>)}
            </select>
            <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
              value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
              {allCats.map(c=><option key={c}>{c}</option>)}
            </select>
            <span className={styles.spacer}/>
            <span style={{ fontSize:11,color:'var(--muted)' }}>{filtered.length} invoices</span>
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Payables Ledger</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>ID</th><th>Supplier</th><th>Invoice No</th><th>PO Ref</th>
                  <th>Invoice Date</th><th>Due Date</th><th>Category</th>
                  <th className={tableStyles.right}>Amount</th>
                  <th className={tableStyles.right}>Outstanding</th>
                  <th>Days</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const owed = p.amount - p.paidAmount;
                  const days = daysDue(p.dueDate);
                  const isOverdue = days > 0 && p.status !== 'Paid';
                  return (
                    <tr key={p.id} style={{ background: isOverdue && p.status!=='Paid' ? '#FFF5F5' : '' }}>
                      <td style={{ fontFamily:'monospace',fontSize:10,fontWeight:700 }}>{p.id}</td>
                      <td style={{ fontWeight:700 }}>{p.supplier}</td>
                      <td style={{ fontFamily:'monospace',fontSize:10 }}>{p.invoiceNo}</td>
                      <td style={{ fontFamily:'monospace',fontSize:10,color:'var(--muted)' }}>{p.poRef||'—'}</td>
                      <td style={{ fontSize:10,whiteSpace:'nowrap' }}>{p.invoiceDate}</td>
                      <td style={{ fontSize:10,whiteSpace:'nowrap',color:isOverdue&&p.status!=='Paid'?'var(--red)':'' }}>{p.dueDate}</td>
                      <td><span className={`${tableStyles.badge} ${tableStyles.blue}`} style={{ fontSize:9 }}>{p.category}</span></td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(p.amount)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700,color:owed>0?'var(--red)':'var(--muted)' }}>{owed>0?fmt(owed):'—'}</td>
                      <td style={{ textAlign:'center' }}>
                        {p.status !== 'Paid' ? (
                          <span style={{ fontSize:10,fontWeight:700,color:days>0?'var(--red)':days>-7?'var(--amber)':'var(--teal)',whiteSpace:'nowrap' }}>
                            {days>0?`+${days}d overdue`:days===0?'Due today':`${Math.abs(days)}d left`}
                          </span>
                        ) : <span style={{ fontSize:10,color:'var(--muted)' }}>—</span>}
                      </td>
                      <td><StatusBadge status={p.status} /></td>
                      <td style={{ whiteSpace:'nowrap' }}>
                        <button onClick={()=>setDetailItem(p)} style={{ padding:'3px 8px',background:'var(--navy)',color:'#fff',border:'none',borderRadius:5,cursor:'pointer',fontSize:10,marginRight:4 }}>View</button>
                        {p.status==='Pending'  && <button onClick={()=>markApproved(p.id)}      style={{ padding:'3px 8px',background:'var(--teal)', color:'#fff',border:'none',borderRadius:5,cursor:'pointer',fontSize:10,marginRight:4 }}>Approve</button>}
                        {p.status==='Approved' && <button onClick={()=>setShowPayModal(p.id)}   style={{ padding:'3px 8px',background:'var(--green)',color:'#fff',border:'none',borderRadius:5,cursor:'pointer',fontSize:10 }}>Pay</button>}
                        {p.status==='Overdue'  && <button onClick={()=>setShowPayModal(p.id)}   style={{ padding:'3px 8px',background:'var(--red)',  color:'#fff',border:'none',borderRadius:5,cursor:'pointer',fontSize:10 }}>Pay Now</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7}>TOTAL ({filtered.filter(p=>p.status!=='Paid').length} unpaid)</td>
                  <td className={tableStyles.right}>{fmt(filtered.reduce((s,p)=>s+p.amount,0))}</td>
                  <td className={tableStyles.right} style={{ color:'var(--red)',fontWeight:800 }}>{fmt(filtered.filter(p=>p.status!=='Paid').reduce((s,p)=>s+(p.amount-p.paidAmount),0))}</td>
                  <td colSpan={3}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Ageing Analysis ═══════════════════════════════════════ */}
      {activeTab === 'ageing' && (
        <>
          {/* Ageing bucket cards */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16 }}>
            {[
              { label:'Not Yet Due',   key:'Not Due',     color:'#117A65',bg:'#d4edda' },
              { label:'0–30 Days',     key:'0–30 Days',   color:'#1B4F72',bg:'#d1ecf1' },
              { label:'31–60 Days',    key:'31–60 Days',  color:'#CA6F1E',bg:'#fff3cd' },
              { label:'61–90 Days',    key:'61–90 Days',  color:'#E67E22',bg:'#fdebd0' },
              { label:'Over 90 Days',  key:'90+ Days',    color:'#C0392B',bg:'#f8d7da' },
            ].map(b=>(
              <div key={b.key} style={{ background:b.bg,borderRadius:10,padding:'14px 16px',borderLeft:`4px solid ${b.color}` }}>
                <div style={{ fontSize:9,fontWeight:700,color:b.color,textTransform:'uppercase',letterSpacing:.4,marginBottom:4 }}>{b.label}</div>
                <div style={{ fontSize:18,fontWeight:800,color:b.color }}>{fmt(ageing[b.key]||0)}</div>
                <div style={{ fontSize:9,color:b.color,marginTop:2,opacity:.7 }}>
                  {unpaid.filter(p=>ageBucket(p.dueDate)===b.key).length} invoices
                </div>
              </div>
            ))}
          </div>
 
          <div style={{ display:'grid',gridTemplateColumns:'1.2fr 0.8fr',gap:14,marginBottom:14 }}>
            {/* Ageing bar chart */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Outstanding Balance by Age Bucket</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{
                    labels: ['Not Yet Due','0–30 Days','31–60 Days','61–90 Days','90+ Days'],
                    datasets:[{ data:['Not Due','0–30 Days','31–60 Days','61–90 Days','90+ Days'].map(k=>+(ageing[k]||0)/1e6), backgroundColor:['#117A65','#1B4F72','#CA6F1E','#E67E22','#C0392B'], borderRadius:4 }],
                  }}
                  options={{ ...BASE, scales:{ x:X_NONE, y:Y_NGN } }}
                />
              </div>
            </div>
 
            {/* Supplier ageing table */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Overdue by Supplier</div>
              <div style={{ overflowY:'auto',maxHeight:220 }}>
                {Object.entries(
                  overdue.reduce((m,p)=>{ m[p.supplier]=(m[p.supplier]||0)+(p.amount-p.paidAmount); return m; },{})
                ).sort((a,b)=>b[1]-a[1]).map(([sup,val],i)=>(
                  <div key={sup} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3 }}>
                      <span style={{ fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140 }}>{sup}</span>
                      <span style={{ fontWeight:700,color:'var(--red)',whiteSpace:'nowrap' }}>{fmt(val)}</span>
                    </div>
                    <div style={{ background:'#e8ecf0',borderRadius:4,height:6,overflow:'hidden' }}>
                      <div style={{ height:'100%',borderRadius:4,background:'#C0392B',width:`${val/totalOverdue*100}%`,transition:'width .5s' }}/>
                    </div>
                  </div>
                ))}
                {overdue.length===0 && <div style={{ textAlign:'center',padding:20,color:'var(--teal)',fontWeight:600 }}>✅ No overdue invoices!</div>}
              </div>
            </div>
          </div>
 
          {/* Detailed ageing table */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Detailed Ageing Statement</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Supplier</th><th>Invoice No</th><th>Due Date</th>
                  <th className={tableStyles.right}>Amount</th>
                  <th className={tableStyles.right}>Outstanding</th>
                  <th>Age Bucket</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {unpaid.sort((a,b)=>daysDue(b.dueDate)-daysDue(a.dueDate)).map(p=>{
                  const owed = p.amount - p.paidAmount;
                  const bucket = ageBucket(p.dueDate);
                  const bucketColor = { 'Not Due':'var(--teal)','0–30 Days':'var(--navy)','31–60 Days':'var(--amber)','61–90 Days':'#E67E22','90+ Days':'var(--red)' }[bucket]||'var(--muted)';
                  return (
                    <tr key={p.id} onClick={()=>setDetailItem(p)} style={{ cursor:'pointer' }}>
                      <td style={{ fontWeight:700 }}>{p.supplier}</td>
                      <td style={{ fontFamily:'monospace',fontSize:10 }}>{p.invoiceNo}</td>
                      <td style={{ fontSize:10,whiteSpace:'nowrap',color:daysDue(p.dueDate)>0?'var(--red)':'' }}>{p.dueDate}</td>
                      <td className={tableStyles.right}>{fmt(p.amount)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700,color:'var(--red)' }}>{fmt(owed)}</td>
                      <td><span style={{ fontSize:9,fontWeight:700,color:bucketColor }}>{bucket}</span></td>
                      <td><StatusBadge status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>TOTAL OUTSTANDING ({unpaid.length} invoices)</td>
                  <td className={tableStyles.right}>{fmt(unpaid.reduce((s,p)=>s+p.amount,0))}</td>
                  <td className={tableStyles.right} style={{ color:'var(--red)',fontWeight:800 }}>{fmt(totalOut)}</td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Analytics ════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Outstanding by Supplier (Top 8)</div>
              <div style={{ height:240 }}>
                <Bar
                  data={{ labels:bySupplier.map(e=>e[0].slice(0,20)), datasets:[{ data:bySupplier.map(e=>+(e[1]/1e6).toFixed(2)), backgroundColor:COLORS, borderRadius:4 }] }}
                  options={{ ...BASE, indexAxis:'y', scales:{ x:Y_NGN, y:X_NONE } }}
                />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Outstanding by Category</div>
              <div style={{ height:240 }}>
                <Doughnut
                  data={{ labels:byCategory.map(e=>e[0]), datasets:[{ data:byCategory.map(e=>+(e[1]/1e6).toFixed(2)), backgroundColor:COLORS, borderWidth:2, borderColor:'#fff' }] }}
                  options={{ responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{ legend:LEG_B } }}
                />
              </div>
            </div>
          </div>
 
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Invoice Status Breakdown</div>
              <div style={{ height:200 }}>
                <Bar
                  data={{
                    labels: allStatuses.filter(s=>s!=='All'),
                    datasets:[{ data:allStatuses.filter(s=>s!=='All').map(s=>payables.filter(p=>p.status===s).length), backgroundColor:['#CA6F1E','#1B4F72','#117A65','#C0392B','#6C3483'], borderRadius:4 }],
                  }}
                  options={{ ...BASE, scales:{ x:X_NONE, y:{ grid:{color:GRID},ticks:{font:FONT,stepSize:1} } } }}
                />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Paid vs Outstanding Summary</div>
              <div style={{ height:200 }}>
                <Doughnut
                  data={{ labels:['Paid','Outstanding'], datasets:[{ data:[+(totalPaid/1e6).toFixed(2),+(totalOut/1e6).toFixed(2)], backgroundColor:['#117A65','#C0392B'], borderWidth:2, borderColor:'#fff' }] }}
                  options={{ responsive:true,maintainAspectRatio:false,cutout:'58%',plugins:{ legend:LEG_B } }}
                />
              </div>
            </div>
          </div>
 
          {/* Supplier summary table */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Supplier Payables Summary</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Supplier</th><th>Category</th>
                  <th className={tableStyles.right}>Total Invoiced</th>
                  <th className={tableStyles.right}>Paid</th>
                  <th className={tableStyles.right}>Outstanding</th>
                  <th className={tableStyles.right}>Overdue</th>
                  <th>Payment Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  payables.reduce((m,p)=>{
                    if(!m[p.supplier]) m[p.supplier]={supplier:p.supplier,category:p.category,total:0,paid:0,overdue:0};
                    m[p.supplier].total+=p.amount;
                    m[p.supplier].paid+=p.paidAmount;
                    if(p.status==='Overdue') m[p.supplier].overdue+=(p.amount-p.paidAmount);
                    return m;
                  },{})
                ).sort((a,b)=>(b[1].total-b[1].paid)-(a[1].total-a[1].paid)).map(([sup,d])=>{
                  const rate = d.total>0?(d.paid/d.total*100):0;
                  return (
                    <tr key={sup}>
                      <td style={{ fontWeight:700 }}>{sup}</td>
                      <td><span className={`${tableStyles.badge} ${tableStyles.blue}`} style={{ fontSize:9 }}>{d.category}</span></td>
                      <td className={tableStyles.right}>{fmt(d.total)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(d.paid)}</td>
                      <td className={tableStyles.right} style={{ color:d.total-d.paid>0?'var(--red)':'var(--muted)',fontWeight:700 }}>{d.total-d.paid>0?fmt(d.total-d.paid):'—'}</td>
                      <td className={tableStyles.right} style={{ color:d.overdue>0?'var(--red)':'var(--muted)',fontWeight:d.overdue>0?700:400 }}>{d.overdue>0?fmt(d.overdue):'—'}</td>
                      <td style={{ minWidth:120 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                          <div style={{ flex:1,background:'#e8ecf0',borderRadius:4,height:7,overflow:'hidden' }}>
                            <div style={{ height:'100%',borderRadius:4,background:rate>=90?'#117A65':rate>=50?'#CA6F1E':'#C0392B',width:`${rate}%`,transition:'width .5s' }}/>
                          </div>
                          <span style={{ fontSize:9,fontWeight:700,color:rate>=90?'var(--teal)':rate>=50?'var(--amber)':'var(--red)',whiteSpace:'nowrap' }}>{rate.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Paid History ══════════════════════════════════════════ */}
      {activeTab === 'paid' && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16 }}>
            {[
              { label:'Total Paid (YTD)',    val:fmt(totalPaid),                                                      color:'#117A65',bg:'#d4edda' },
              { label:'Invoices Settled',   val:payables.filter(p=>p.status==='Paid').length+' invoices',             color:'#1B4F72',bg:'#d1ecf1',isStr:true },
              { label:'Avg Invoice Value',  val:fmt(payables.filter(p=>p.status==='Paid').length?totalPaid/payables.filter(p=>p.status==='Paid').length:0), color:'#6C3483',bg:'#e8d5f5' },
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg,borderRadius:10,padding:'14px 18px',borderLeft:`4px solid ${s.color}` }}>
                <div style={{ fontSize:9,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:.4,marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:18,fontWeight:800,color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Paid Invoice History</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>ID</th><th>Supplier</th><th>Invoice No</th><th>PO Ref</th>
                  <th>Invoice Date</th><th>Category</th>
                  <th className={tableStyles.right}>Amount Paid</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payables.filter(p=>p.status==='Paid').map(p=>(
                  <tr key={p.id}>
                    <td style={{ fontFamily:'monospace',fontSize:10,fontWeight:700 }}>{p.id}</td>
                    <td style={{ fontWeight:700 }}>{p.supplier}</td>
                    <td style={{ fontFamily:'monospace',fontSize:10 }}>{p.invoiceNo}</td>
                    <td style={{ fontFamily:'monospace',fontSize:10,color:'var(--muted)' }}>{p.poRef||'—'}</td>
                    <td style={{ fontSize:10 }}>{p.invoiceDate}</td>
                    <td><span className={`${tableStyles.badge} ${tableStyles.blue}`} style={{ fontSize:9 }}>{p.category}</span></td>
                    <td className={tableStyles.right} style={{ fontWeight:700,color:'var(--teal)' }}>{fmt(p.paidAmount)}</td>
                    <td style={{ fontSize:10,color:'var(--muted)' }}>{p.notes}</td>
                  </tr>
                ))}
                {payables.filter(p=>p.status==='Paid').length===0 && (
                  <tr><td colSpan={8} className={tableStyles.emptyState}>No paid invoices yet.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6}>TOTAL PAID</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(totalPaid)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}