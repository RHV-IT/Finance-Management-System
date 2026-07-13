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
 
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Tooltip, Legend);
 
const FONT   = { family: "'Inter','Segoe UI',Arial,sans-serif", size: 10 };
const GRID   = 'rgba(0,0,0,0.05)';
const BASE   = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const X_NONE = { grid: { display: false }, ticks: { font: FONT } };
const Y_NGN  = { grid: { color: GRID }, ticks: { font: FONT, callback: v => '₦' + v + 'M' } };
const LEG_B  = { display: true, position: 'bottom', labels: { font: FONT, boxWidth: 10 } };
 
/* ─── seed data ─────────────────────────────────────────────────────────── */
const SEED_VENDORS = [
  { id:'VND-001', name:'Pharmaplus Nigeria Ltd',    category:'Pharmaceuticals',  contact:'Emeka Okafor',    phone:'0801-234-5678', email:'sales@pharmaplus.ng',     rating:4.8, paymentTerms:'30 Days', status:'Active',   totalPurchases:38_500_000, totalPaid:34_900_000 },
  { id:'VND-002', name:'MedEquip Supplies Ltd',     category:'Medical Equipment',contact:'Aisha Bello',     phone:'0802-345-6789', email:'procurement@medequip.ng', rating:4.5, paymentTerms:'45 Days', status:'Active',   totalPurchases:22_800_000, totalPaid:19_200_000 },
  { id:'VND-003', name:'HealthCare Distributors',   category:'Consumables',      contact:'Tunde Adeyemi',   phone:'0803-456-7890', email:'info@healthcaredist.ng',  rating:4.2, paymentTerms:'30 Days', status:'Active',   totalPurchases:18_400_000, totalPaid:17_100_000 },
  { id:'VND-004', name:'Lagos Medical Stores',      category:'Pharmaceuticals',  contact:'Ngozi Peters',    phone:'0804-567-8901', email:'orders@lagosmedical.ng',  rating:4.6, paymentTerms:'30 Days', status:'Active',   totalPurchases:14_200_000, totalPaid:14_200_000 },
  { id:'VND-005', name:'ProMed Nigeria',            category:'Consumables',      contact:'Chidi Mensah',    phone:'0805-678-9012', email:'sales@promedng.com',      rating:3.9, paymentTerms:'60 Days', status:'Active',   totalPurchases:11_600_000, totalPaid: 8_900_000 },
  { id:'VND-006', name:'Clinix Supplies Ltd',       category:'Surgical Supplies',contact:'Funmi Adesanya',  phone:'0806-789-0123', email:'info@clinixsupplies.ng',  rating:4.1, paymentTerms:'30 Days', status:'Active',   totalPurchases: 9_700_000, totalPaid: 9_700_000 },
  { id:'VND-007', name:'DiagnosTech Nigeria',       category:'Lab Reagents',     contact:'Seun Abiodun',    phone:'0807-890-1234', email:'orders@diagnostech.ng',   rating:4.7, paymentTerms:'45 Days', status:'Active',   totalPurchases: 8_300_000, totalPaid: 7_500_000 },
  { id:'VND-008', name:'ImageCare Ltd',             category:'Radiology',        contact:'Bola Fashola',    phone:'0808-901-2345', email:'sales@imagecare.ng',      rating:4.4, paymentTerms:'30 Days', status:'Active',   totalPurchases: 6_200_000, totalPaid: 6_200_000 },
  { id:'VND-009', name:'BioMedics Nigeria',         category:'Medical Equipment',contact:'Kemi Okonkwo',    phone:'0809-012-3456', email:'info@biomedics.ng',       rating:3.7, paymentTerms:'60 Days', status:'Inactive', totalPurchases: 4_800_000, totalPaid: 3_200_000 },
  { id:'VND-010', name:'OfficeMart Nigeria',        category:'Office Supplies',  contact:'Ahmed Musa',      phone:'0810-123-4567', email:'orders@officemart.ng',    rating:4.0, paymentTerms:'30 Days', status:'Active',   totalPurchases: 1_850_000, totalPaid: 1_850_000 },
];
 
const SEED_SRV = [
  { srvNo:'SRV-2025-001', date:'2025-11-28', vendor:'Pharmaplus Nigeria Ltd',  poRef:'PO-112201', item:'Normal Saline 0.9% 500ml', category:'Fluid',          qty:500, unit:'Carton', unitCost:54_000, total:4_500_000, receivedBy:'Store Unit',   status:'Posted'    },
  { srvNo:'SRV-2025-002', date:'2025-11-26', vendor:'MedEquip Supplies Ltd',   poRef:'PO-112202', item:'Ventilator Circuits',       category:'Consumable',     qty: 20, unit:'Pack',   unitCost:18_500, total:  370_000, receivedBy:'Store Unit',   status:'Posted'    },
  { srvNo:'SRV-2025-003', date:'2025-11-25', vendor:'HealthCare Distributors', poRef:'PO-112198', item:'Examination Gloves – Med',  category:'Consumable',     qty:100, unit:'Carton', unitCost:28_000, total:2_800_000, receivedBy:'Store Unit',   status:'Posted'    },
  { srvNo:'SRV-2025-004', date:'2025-11-24', vendor:'Lagos Medical Stores',    poRef:'PO-112195', item:'Amlodipine 5mg Tablet',     category:'Drug',           qty: 50, unit:'Carton', unitCost:35_000, total:1_750_000, receivedBy:'Store Unit',   status:'Posted'    },
  { srvNo:'SRV-2025-005', date:'2025-11-22', vendor:'DiagnosTech Nigeria',     poRef:'PO-112190', item:'FBC Reagent Kit',           category:'Reagent',        qty: 30, unit:'Kit',    unitCost:45_000, total:1_350_000, receivedBy:'Store Unit',   status:'Posted'    },
  { srvNo:'SRV-2025-006', date:'2025-11-20', vendor:'Pharmaplus Nigeria Ltd',  poRef:'PO-112185', item:'Amoxicillin 500mg Capsule', category:'Drug',           qty: 80, unit:'Carton', unitCost:85_000, total:6_800_000, receivedBy:'Store Unit',   status:'Posted'    },
  { srvNo:'SRV-2025-007', date:'2025-11-18', vendor:'ImageCare Ltd',           poRef:'PO-112180', item:'CT Contrast Media 100ml',   category:'X-Ray Material', qty: 50, unit:'Vial',   unitCost:12_000, total:  600_000, receivedBy:'Store Unit',   status:'Posted'    },
  { srvNo:'SRV-2025-008', date:'2025-11-15', vendor:'Clinix Supplies Ltd',     poRef:'PO-112175', item:'Surgical Gloves Size 7',    category:'Surgical',       qty: 60, unit:'Carton', unitCost:22_000, total:1_320_000, receivedBy:'Store Unit',   status:'Posted'    },
  { srvNo:'SRV-2025-009', date:'2025-11-12', vendor:'ProMed Nigeria',          poRef:'PO-112170', item:'IV Cannula 18G',            category:'Consumable',     qty:200, unit:'Box',    unitCost:14_000, total:2_800_000, receivedBy:'Store Unit',   status:'Posted'    },
  { srvNo:'SRV-2025-010', date:'2025-11-10', vendor:'OfficeMart Nigeria',      poRef:'PO-111502', item:'A4 Paper Ream + Cartridge', category:'Office Supplies',qty:  1, unit:'Lot',    unitCost:185_000,total:  185_000, receivedBy:'Store Unit',   status:'Posted'    },
  { srvNo:'SRV-2025-011', date:'2025-11-08', vendor:'Lagos Medical Stores',    poRef:'PO-112165', item:'Paracetamol 500mg Tablet',  category:'Drug',           qty: 40, unit:'Carton', unitCost:18_000, total:  720_000, receivedBy:'Store Unit',   status:'Posted'    },
  { srvNo:'SRV-2025-012', date:'2025-11-05', vendor:'MedEquip Supplies Ltd',   poRef:'PO-112160', item:'Patient Monitor (ICU)',     category:'Equipment',      qty:  2, unit:'Unit',   unitCost:1_800_000,total:3_600_000, receivedBy:'Store Unit', status:'Posted'    },
];
 
const CAT_COLORS = {
  'Pharmaceuticals':  '#1B4F72',
  'Consumables':      '#117A65',
  'Medical Equipment':'#6C3483',
  'Lab Reagents':     '#CA6F1E',
  'Surgical Supplies':'#D85A30',
  'Radiology':        '#2980B9',
  'Office Supplies':  '#7F8C8D',
};
 
/* ─── shared styles ─────────────────────────────────────────────────────── */
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
      <div style={{ background:'#fff', borderRadius:12, width:620, maxWidth:'96vw', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
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
 
function StarRating({ rating }) {
  return (
    <span style={{ color:'#F39C12', fontSize:11, fontWeight:700 }}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
      <span style={{ color:'var(--muted)', marginLeft:4, fontSize:10 }}>{rating.toFixed(1)}</span>
    </span>
  );
}
 
/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function VendorsPage() {
  const [activeTab,  setActiveTab]  = useState('vendors');
  const [vendors,    setVendors]    = useState(SEED_VENDORS);
  const [srvList,    setSrvList]    = useState(SEED_SRV);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('All');
  const [statusFilter,setStatusFilter]= useState('All');
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showSrvModal,    setShowSrvModal]    = useState(false);
  const [vendorDetail,    setVendorDetail]    = useState(null);
 
  const [vendorForm, setVendorForm] = useState({ name:'', category:'Pharmaceuticals', contact:'', phone:'', email:'', paymentTerms:'30 Days', status:'Active' });
  const [srvForm,    setSrvForm]    = useState({ date: new Date().toISOString().slice(0,10), vendor:'', poRef:'', item:'', category:'Drug', qty:'', unit:'Carton', unitCost:'', receivedBy:'Store Unit' });
 
  /* ── KPIs ─────────────────────────────────────────────────────────── */
  const totalPurchases = vendors.reduce((s,v) => s + v.totalPurchases, 0);
  const totalPaid      = vendors.reduce((s,v) => s + v.totalPaid,      0);
  const outstanding    = totalPurchases - totalPaid;
  const activeVendors  = vendors.filter(v => v.status === 'Active').length;
  const srvValue       = srvList.reduce((s,r) => s + r.total, 0);
  const avgRating      = vendors.reduce((s,v) => s+v.rating,0) / vendors.length;
 
  /* ── filtered lists ───────────────────────────────────────────────── */
  const filteredVendors = useMemo(() => {
    const q = search.toLowerCase();
    return vendors.filter(v =>
      (!q || v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q) || v.contact.toLowerCase().includes(q)) &&
      (catFilter    === 'All' || v.category === catFilter) &&
      (statusFilter === 'All' || v.status   === statusFilter)
    );
  }, [vendors, search, catFilter, statusFilter]);
 
  const filteredSrv = useMemo(() => {
    const q = search.toLowerCase();
    return srvList.filter(r =>
      !q || r.srvNo.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q) || r.item.toLowerCase().includes(q)
    );
  }, [srvList, search]);
 
  /* ── analytics ────────────────────────────────────────────────────── */
  const vendorSpend = useMemo(() => [...vendors].sort((a,b)=>b.totalPurchases-a.totalPurchases).slice(0,8), [vendors]);
 
  const byCat = useMemo(() => {
    const m = {};
    vendors.forEach(v => { m[v.category] = (m[v.category]||0) + v.totalPurchases; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [vendors]);
 
  const outstanding_aging = useMemo(() => {
    const buckets = { '0-30':0, '31-60':0, '61-90':0, '90+':0 };
    vendors.forEach(v => {
      const diff = v.totalPurchases - v.totalPaid;
      if (diff <= 0) return;
      const idx = Math.floor(Math.random() * 4); // simplified - real system would use invoice dates
      const key = Object.keys(buckets)[idx];
      buckets[key] += diff;
    });
    return buckets;
  }, [vendors]);
 
  /* ── save handlers ────────────────────────────────────────────────── */
  function saveVendor() {
    setVendors(p => [{ id:`VND-${String(p.length+1).padStart(3,'0')}`, ...vendorForm, rating:4.0, totalPurchases:0, totalPaid:0 }, ...p]);
    setShowVendorModal(false);
    setVendorForm({ name:'', category:'Pharmaceuticals', contact:'', phone:'', email:'', paymentTerms:'30 Days', status:'Active' });
  }
 
  function saveSrv() {
    const rec = { srvNo:`SRV-2025-${String(srvList.length+1).padStart(3,'0')}`, ...srvForm, qty:+srvForm.qty||0, unitCost:+srvForm.unitCost||0, total:(+srvForm.qty||0)*(+srvForm.unitCost||0), status:'Posted' };
    setSrvList(p => [rec, ...p]);
    setShowSrvModal(false);
    setSrvForm({ date: new Date().toISOString().slice(0,10), vendor:'', poRef:'', item:'', category:'Drug', qty:'', unit:'Carton', unitCost:'', receivedBy:'Store Unit' });
  }
 
  function exportCSV(data, name, cols) {
    const rows = [cols.join(','), ...data.map(r => cols.map(c => `"${r[c]??''}"`).join(','))];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'})); a.download=name; a.click();
  }
 
  const allCats = ['All', ...new Set(vendors.map(v=>v.category))];
  const TABS = [
    { id:'vendors',   label:'🚚 Vendor Directory'    },
    { id:'srv',       label:'📥 SRV / Receipts'      },
    { id:'analytics', label:'📊 Analytics'            },
    { id:'outstanding',label:'📉 Vendor Outstanding'  },
  ];
 
  return (
    <DashboardLayout>
      {/* ── Modals ──────────────────────────────────────────────────── */}
      {showVendorModal && (
        <Modal title="🚚 Add Vendor" onClose={()=>setShowVendorModal(false)} onSave={saveVendor}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 16px' }}>
            <Field label="Vendor Name" span={2}><input style={inp} value={vendorForm.name} onChange={e=>setVendorForm(p=>({...p,name:e.target.value}))} placeholder="Full vendor name" /></Field>
            <Field label="Category"><select style={inp} value={vendorForm.category} onChange={e=>setVendorForm(p=>({...p,category:e.target.value}))}>
              {['Pharmaceuticals','Medical Equipment','Consumables','Lab Reagents','Surgical Supplies','Radiology','Office Supplies','Other'].map(c=><option key={c}>{c}</option>)}
            </select></Field>
            <Field label="Payment Terms"><select style={inp} value={vendorForm.paymentTerms} onChange={e=>setVendorForm(p=>({...p,paymentTerms:e.target.value}))}>
              {['0 Days (Cash)','7 Days','14 Days','30 Days','45 Days','60 Days'].map(t=><option key={t}>{t}</option>)}
            </select></Field>
            <Field label="Contact Person"><input style={inp} value={vendorForm.contact} onChange={e=>setVendorForm(p=>({...p,contact:e.target.value}))} placeholder="Name" /></Field>
            <Field label="Phone"><input style={inp} value={vendorForm.phone} onChange={e=>setVendorForm(p=>({...p,phone:e.target.value}))} placeholder="0801-000-0000" /></Field>
            <Field label="Email" span={2}><input type="email" style={inp} value={vendorForm.email} onChange={e=>setVendorForm(p=>({...p,email:e.target.value}))} placeholder="vendor@email.com" /></Field>
            <Field label="Status"><select style={inp} value={vendorForm.status} onChange={e=>setVendorForm(p=>({...p,status:e.target.value}))}>
              <option>Active</option><option>Inactive</option><option>Suspended</option>
            </select></Field>
          </div>
        </Modal>
      )}
 
      {showSrvModal && (
        <Modal title="📥 Post SRV (Store Receipt Voucher)" onClose={()=>setShowSrvModal(false)} onSave={saveSrv}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 16px' }}>
            <Field label="Date"><input type="date" style={inp} value={srvForm.date} onChange={e=>setSrvForm(p=>({...p,date:e.target.value}))} /></Field>
            <Field label="PO Reference"><input style={inp} value={srvForm.poRef} onChange={e=>setSrvForm(p=>({...p,poRef:e.target.value}))} placeholder="PO-000000" /></Field>
            <Field label="Vendor"><select style={inp} value={srvForm.vendor} onChange={e=>setSrvForm(p=>({...p,vendor:e.target.value}))}>
              <option value="">— select vendor —</option>
              {vendors.filter(v=>v.status==='Active').map(v=><option key={v.id} value={v.name}>{v.name}</option>)}
            </select></Field>
            <Field label="Item Received"><input style={inp} value={srvForm.item} onChange={e=>setSrvForm(p=>({...p,item:e.target.value}))} placeholder="Item name" /></Field>
            <Field label="Category"><select style={inp} value={srvForm.category} onChange={e=>setSrvForm(p=>({...p,category:e.target.value}))}>
              {['Drug','Consumable','Reagent','Equipment','Fluid','Surgical','X-Ray Material','Office Supplies','Other'].map(c=><option key={c}>{c}</option>)}
            </select></Field>
            <Field label="Unit"><select style={inp} value={srvForm.unit} onChange={e=>setSrvForm(p=>({...p,unit:e.target.value}))}>
              {['Carton','Box','Pack','Vial','Kit','Unit','Lot','Bag','Cylinder'].map(u=><option key={u}>{u}</option>)}
            </select></Field>
            <Field label="Quantity"><input type="number" min={1} style={inp} value={srvForm.qty} onChange={e=>setSrvForm(p=>({...p,qty:e.target.value}))} placeholder="0" /></Field>
            <Field label="Unit Cost (₦)"><input type="number" min={0} style={inp} value={srvForm.unitCost} onChange={e=>setSrvForm(p=>({...p,unitCost:e.target.value}))} placeholder="0" /></Field>
            <Field label="Received By" span={2}><input style={inp} value={srvForm.receivedBy} onChange={e=>setSrvForm(p=>({...p,receivedBy:e.target.value}))} /></Field>
          </div>
          {srvForm.qty && srvForm.unitCost && (
            <div style={{ marginTop:12, padding:'8px 14px', background:'#EBF5FB', borderRadius:8, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--navy)' }}>Total Value</span>
              <span style={{ fontSize:14, fontWeight:800, color:'var(--navy)' }}>{fmt((+srvForm.qty||0)*(+srvForm.unitCost||0))}</span>
            </div>
          )}
        </Modal>
      )}
 
      {/* Vendor detail panel */}
      {vendorDetail && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, width:600, maxWidth:'96vw', maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:15, fontWeight:800, color:'var(--navy)' }}>🚚 {vendorDetail.name}</span>
              <button onClick={()=>setVendorDetail(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--muted)' }}>✕</button>
            </div>
            <div style={{ padding:18, overflowY:'auto', flex:1 }}>
              {/* Vendor info grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 20px', fontSize:11, marginBottom:16, padding:'12px 14px', background:'#f8fafc', borderRadius:8 }}>
                {[['Category',vendorDetail.category],['Status',vendorDetail.status],['Contact',vendorDetail.contact],['Phone',vendorDetail.phone],['Email',vendorDetail.email],['Payment Terms',vendorDetail.paymentTerms]].map(([k,v])=>(
                  <div key={k}><span style={{ fontWeight:700, color:'var(--muted)' }}>{k}: </span><span style={{ fontWeight:600, color:'var(--navy)' }}>{v}</span></div>
                ))}
              </div>
              {/* Financial summary */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { label:'Total Purchases', val:vendorDetail.totalPurchases, color:'#1B4F72', bg:'#d1ecf1' },
                  { label:'Total Paid',      val:vendorDetail.totalPaid,      color:'#117A65', bg:'#d4edda' },
                  { label:'Outstanding',     val:vendorDetail.totalPurchases-vendorDetail.totalPaid, color:'#C0392B', bg:'#f8d7da' },
                ].map(s=>(
                  <div key={s.label} style={{ background:s.bg, borderRadius:8, padding:'12px 14px', textAlign:'center' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:.3 }}>{s.label}</div>
                    <div style={{ fontSize:16, fontWeight:800, color:s.color, marginTop:4 }}>{fmt(s.val)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--navy)' }}>Vendor Rating:</span>
                <StarRating rating={vendorDetail.rating} />
              </div>
              {/* SRV history for this vendor */}
              <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)', marginBottom:8 }}>Delivery History (SRV)</div>
              <table className={tableStyles.table}>
                <thead><tr><th>SRV No</th><th>Date</th><th>Item</th><th className={tableStyles.right}>Total</th></tr></thead>
                <tbody>
                  {srvList.filter(s=>s.vendor===vendorDetail.name).map(s=>(
                    <tr key={s.srvNo}>
                      <td style={{ fontFamily:'monospace', fontSize:10 }}>{s.srvNo}</td>
                      <td>{s.date}</td>
                      <td style={{ fontWeight:600 }}>{s.item}</td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(s.total)}</td>
                    </tr>
                  ))}
                  {srvList.filter(s=>s.vendor===vendorDetail.name).length===0 && (
                    <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--muted)', padding:16 }}>No deliveries recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
              <button onClick={()=>setVendorDetail(null)} className={styles.btnGhost}>Close</button>
            </div>
          </div>
        </div>
      )}
 
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🚚 Vendors &amp; SRV</h2>
          <p className={styles.pageMeta}>Vendor directory · Store Receipt Vouchers · Spend analytics · Outstanding balances</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className={styles.btnSecondary} onClick={()=>setShowVendorModal(true)}>＋ Add Vendor</button>
          <button className={styles.btnPrimary}   onClick={()=>setShowSrvModal(true)}>📥 Post SRV</button>
          <button className={styles.btnGhost} onClick={()=>exportCSV(vendors,'vendors.csv',['id','name','category','contact','phone','email','rating','paymentTerms','status','totalPurchases','totalPaid'])}>⬇ Export</button>
        </div>
      </div>
 
      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Active Vendors"       value={activeVendors.toString()}    delta={`${vendors.length} total registered`}    deltaType="neutral"  color="blue"   />
        <KPICard label="Total Purchases YTD"  value={fmt(totalPurchases)}         delta="All vendors combined"                    deltaType="neutral"  color="purple" />
        <KPICard label="Total Paid"           value={fmt(totalPaid)}              delta={`${(totalPaid/totalPurchases*100).toFixed(0)}% of purchases`} deltaType="up" color="green" />
        <KPICard label="Vendor Outstanding"   value={fmt(outstanding)}            delta="Unpaid balances"                         deltaType={outstanding>5e6?'warn':'up'} badge={outstanding>5e6?'Monitor':'Clear'} badgeType={outstanding>5e6?'warn':'good'} color={outstanding>5e6?'amber':'green'} />
        <KPICard label="SRV Count (YTD)"      value={srvList.length.toString()}   delta="Store receipts posted"                   deltaType="up"       color="teal"   />
        <KPICard label="SRV Total Value"      value={fmt(srvValue)}               delta="Total goods received"                    deltaType="up"       color="blue"   />
        <KPICard label="Avg Vendor Rating"    value={avgRating.toFixed(1)+' ★'}   delta="Out of 5.0"                              deltaType={avgRating>=4?'up':'warn'} badge={avgRating>=4?'Good':'Monitor'} badgeType={avgRating>=4?'good':'warn'} color={avgRating>=4?'green':'amber'} />
        <KPICard label="Categories Covered"   value={new Set(vendors.map(v=>v.category)).size.toString()} delta="Vendor categories" deltaType="neutral" color="purple" />
      </div>
 
      {/* ── Tab Strip ───────────────────────────────────────────────────── */}
      <div className={styles.tabStrip}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`${styles.tabBtn} ${activeTab===t.id?styles.active:''}`}>{t.label}</button>
        ))}
      </div>
 
      {/* ════ TAB: Vendor Directory ════════════════════════════════════════ */}
      {activeTab === 'vendors' && (
        <>
          <div className={styles.toolbar}>
            <input className={styles.toolbarSearch} placeholder="🔍 Search vendor / category / contact…" value={search} onChange={e=>setSearch(e.target.value)} />
            <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }} value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
              {allCats.map(c=><option key={c}>{c}</option>)}
            </select>
            <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option>All</option><option>Active</option><option>Inactive</option><option>Suspended</option>
            </select>
            <span className={styles.spacer}/>
            <span style={{ fontSize:11,color:'var(--muted)' }}>{filteredVendors.length} vendors</span>
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Vendor Directory</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Vendor ID</th><th>Vendor Name</th><th>Category</th><th>Contact</th><th>Phone</th>
                  <th>Payment Terms</th><th>Rating</th>
                  <th className={tableStyles.right}>Total Purchases</th>
                  <th className={tableStyles.right}>Paid</th>
                  <th className={tableStyles.right}>Outstanding</th>
                  <th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map(v=>{
                  const owed = v.totalPurchases - v.totalPaid;
                  return (
                    <tr key={v.id}>
                      <td style={{ fontFamily:'monospace',fontSize:10,fontWeight:700 }}>{v.id}</td>
                      <td style={{ fontWeight:700,color:'var(--navy)' }}>{v.name}</td>
                      <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{v.category}</span></td>
                      <td style={{ fontSize:10 }}>{v.contact}</td>
                      <td style={{ fontSize:10,color:'var(--muted)' }}>{v.phone}</td>
                      <td style={{ fontSize:10 }}>{v.paymentTerms}</td>
                      <td><StarRating rating={v.rating} /></td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(v.totalPurchases)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)',fontWeight:600 }}>{fmt(v.totalPaid)}</td>
                      <td className={tableStyles.right} style={{ color:owed>0?'var(--red)':'var(--muted)',fontWeight:600 }}>{owed>0?fmt(owed):'—'}</td>
                      <td><span className={`${tableStyles.badge} ${v.status==='Active'?tableStyles.green:v.status==='Suspended'?tableStyles.red:tableStyles.grey}`}>{v.status}</span></td>
                      <td>
                        <button onClick={()=>setVendorDetail(v)} style={{ padding:'3px 9px',background:'var(--navy)',color:'#fff',border:'none',borderRadius:5,cursor:'pointer',fontSize:10 }}>View →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7}>TOTAL ({filteredVendors.length} vendors)</td>
                  <td className={tableStyles.right}>{fmt(filteredVendors.reduce((s,v)=>s+v.totalPurchases,0))}</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(filteredVendors.reduce((s,v)=>s+v.totalPaid,0))}</td>
                  <td className={tableStyles.right} style={{ color:'var(--red)' }}>{fmt(filteredVendors.reduce((s,v)=>s+(v.totalPurchases-v.totalPaid),0))}</td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: SRV ══════════════════════════════════════════════════════ */}
      {activeTab === 'srv' && (
        <>
          <div className={styles.toolbar}>
            <button className={styles.btnPrimary} onClick={()=>setShowSrvModal(true)}>📥 Post SRV</button>
            <input className={styles.toolbarSearch} placeholder="🔍 Search SRV no / vendor / item…" value={search} onChange={e=>setSearch(e.target.value)} />
            <span className={styles.spacer}/>
            <span style={{ fontSize:11,color:'var(--muted)' }}>{filteredSrv.length} receipts · Total: <strong style={{ color:'var(--navy)' }}>{fmt(filteredSrv.reduce((s,r)=>s+r.total,0))}</strong></span>
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Store Receipt Voucher (SRV) Register</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>SRV No</th><th>Date</th><th>Vendor</th><th>PO Ref</th><th>Item Received</th>
                  <th>Category</th><th className={tableStyles.right}>Qty</th><th>Unit</th>
                  <th className={tableStyles.right}>Unit Cost</th><th className={tableStyles.right}>Total Value</th>
                  <th>Received By</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSrv.map(r=>(
                  <tr key={r.srvNo}>
                    <td style={{ fontFamily:'monospace',fontSize:10,fontWeight:700 }}>{r.srvNo}</td>
                    <td style={{ whiteSpace:'nowrap' }}>{r.date}</td>
                    <td style={{ fontWeight:600 }}>{r.vendor}</td>
                    <td style={{ fontFamily:'monospace',fontSize:10,color:'var(--muted)' }}>{r.poRef}</td>
                    <td style={{ fontWeight:500 }}>{r.item}</td>
                    <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.category}</span></td>
                    <td className={tableStyles.right} style={{ fontWeight:600 }}>{r.qty.toLocaleString()}</td>
                    <td style={{ fontSize:10 }}>{r.unit}</td>
                    <td className={tableStyles.right}>{fmt(r.unitCost)}</td>
                    <td className={tableStyles.right} style={{ fontWeight:700,color:'var(--navy)' }}>{fmt(r.total)}</td>
                    <td style={{ fontSize:10,color:'var(--muted)' }}>{r.receivedBy}</td>
                    <td><span className={`${tableStyles.badge} ${tableStyles.green}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={9}>TOTAL ({filteredSrv.length} receipts)</td>
                  <td className={tableStyles.right}>{fmt(filteredSrv.reduce((s,r)=>s+r.total,0))}</td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Analytics ════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'1.2fr 0.8fr',gap:14,marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Top Vendors by Purchase Value</div>
              <div style={{ height:240 }}>
                <Bar
                  data={{ labels:vendorSpend.map(v=>v.name.slice(0,22)), datasets:[{ data:vendorSpend.map(v=>+(v.totalPurchases/1e6).toFixed(2)), backgroundColor:COLORS, borderRadius:4 }] }}
                  options={{ ...BASE, indexAxis:'y', scales:{ x:Y_NGN, y:X_NONE } }}
                />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Spend by Category</div>
              <div style={{ height:240 }}>
                <Doughnut
                  data={{ labels:byCat.map(e=>e[0]), datasets:[{ data:byCat.map(e=>+(e[1]/1e6).toFixed(2)), backgroundColor:COLORS, borderWidth:2, borderColor:'#fff' }] }}
                  options={{ responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{ legend:LEG_B } }}
                />
              </div>
            </div>
          </div>
 
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Paid vs Outstanding by Vendor</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{
                    labels: vendorSpend.slice(0,6).map(v=>v.name.slice(0,16)),
                    datasets:[
                      { label:'Paid',        data:vendorSpend.slice(0,6).map(v=>+(v.totalPaid/1e6).toFixed(2)),                         backgroundColor:'#117A6599', borderRadius:3 },
                      { label:'Outstanding', data:vendorSpend.slice(0,6).map(v=>+((v.totalPurchases-v.totalPaid)/1e6).toFixed(2)),       backgroundColor:'#C0392B88', borderRadius:3 },
                    ],
                  }}
                  options={{ ...BASE,plugins:{legend:LEG_B}, scales:{ x:X_NONE, y:Y_NGN } }}
                />
              </div>
            </div>
 
            <div className={styles.card}>
              <div className={styles.cardTitle}>Vendor Performance Summary</div>
              <div style={{ padding:'4px 0' }}>
                {vendorSpend.slice(0,6).map((v,i)=>{
                  const payRate = v.totalPurchases>0?(v.totalPaid/v.totalPurchases*100):0;
                  return (
                    <div key={v.id} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3 }}>
                        <span style={{ fontWeight:600 }}>{v.name.slice(0,24)}</span>
                        <span style={{ fontWeight:700,color:payRate>=90?'var(--teal)':'var(--amber)' }}>{payRate.toFixed(0)}% paid</span>
                      </div>
                      <div style={{ background:'#e8ecf0',borderRadius:4,height:7,overflow:'hidden' }}>
                        <div style={{ height:'100%',borderRadius:4,background:COLORS[i%COLORS.length],width:`${payRate}%`,transition:'width .5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
 
          {/* SRV category breakdown */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>SRV Receipts by Category — YTD</div>
            <table className={tableStyles.table}>
              <thead><tr><th>Category</th><th className={tableStyles.right}>Qty</th><th className={tableStyles.right}>Total Value</th><th className={tableStyles.right}>% Share</th><th>Distribution</th></tr></thead>
              <tbody>
                {Object.entries(srvList.reduce((m,r)=>{if(!m[r.category])m[r.category]={qty:0,val:0};m[r.category].qty+=r.qty;m[r.category].val+=r.total;return m;},{})).sort((a,b)=>b[1].val-a[1].val).map(([cat,d],i)=>{
                  const pct = srvValue>0?(d.val/srvValue*100).toFixed(1):0;
                  return (
                    <tr key={cat}>
                      <td style={{ fontWeight:600 }}>{cat}</td>
                      <td className={tableStyles.right}>{d.qty.toLocaleString()}</td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(d.val)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700,color:'var(--navy)' }}>{pct}%</td>
                      <td style={{ minWidth:120 }}>
                        <div style={{ background:'#e8ecf0',borderRadius:4,height:7,overflow:'hidden' }}>
                          <div style={{ height:'100%',borderRadius:4,background:COLORS[i%COLORS.length],width:`${pct}%`,transition:'width .5s' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><td>TOTAL</td><td className={tableStyles.right}>{srvList.reduce((s,r)=>s+r.qty,0).toLocaleString()}</td><td className={tableStyles.right}>{fmt(srvValue)}</td><td className={tableStyles.right}>100%</td><td/></tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Vendor Outstanding ════════════════════════════════════ */}
      {activeTab === 'outstanding' && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16 }}>
            {[
              { label:'Total Outstanding',   val:outstanding,                                          color:'#C0392B',bg:'#f8d7da' },
              { label:'Vendors with Balance',val:vendors.filter(v=>v.totalPurchases>v.totalPaid).length,color:'#CA6F1E',bg:'#fff3cd' },
              { label:'Fully Paid Vendors',  val:vendors.filter(v=>v.totalPurchases<=v.totalPaid).length,color:'#117A65',bg:'#d4edda' },
              { label:'Payment Rate (Avg)',   val:`${(totalPaid/totalPurchases*100).toFixed(0)}%`,      color:'#1B4F72',bg:'#d1ecf1',isStr:true },
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg,borderRadius:10,padding:'14px 16px',borderLeft:`4px solid ${s.color}` }}>
                <div style={{ fontSize:9,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:.4,marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:s.isStr?20:22,fontWeight:800,color:s.color }}>{s.isStr?s.val:typeof s.val==='number'?fmt(s.val):s.val}</div>
              </div>
            ))}
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Vendor Outstanding — Ageing Analysis</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Vendor</th><th>Category</th>
                  <th className={tableStyles.right}>Total Purchases</th>
                  <th className={tableStyles.right}>Total Paid</th>
                  <th className={tableStyles.right}>Outstanding</th>
                  <th className={tableStyles.right}>0–30 Days</th>
                  <th className={tableStyles.right}>31–60 Days</th>
                  <th className={tableStyles.right}>60+ Days</th>
                  <th>Payment Rate</th>
                </tr>
              </thead>
              <tbody>
                {vendors.filter(v=>v.totalPurchases>0).sort((a,b)=>(b.totalPurchases-b.totalPaid)-(a.totalPurchases-a.totalPaid)).map(v=>{
                  const owed = v.totalPurchases - v.totalPaid;
                  const rate = v.totalPurchases>0?(v.totalPaid/v.totalPurchases*100):0;
                  // simplified aging buckets
                  const b0 = Math.round(owed*0.55);
                  const b1 = Math.round(owed*0.30);
                  const b2 = owed - b0 - b1;
                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight:700 }}>{v.name}</td>
                      <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{v.category}</span></td>
                      <td className={tableStyles.right}>{fmt(v.totalPurchases)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(v.totalPaid)}</td>
                      <td className={tableStyles.right} style={{ color:owed>0?'var(--red)':'var(--muted)',fontWeight:700 }}>{owed>0?fmt(owed):'—'}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{owed>0?fmt(b0):'—'}</td>
                      <td className={tableStyles.right} style={{ color:'var(--amber)' }}>{owed>0?fmt(b1):'—'}</td>
                      <td className={tableStyles.right} style={{ color:'var(--red)' }}>{owed>0&&b2>0?fmt(b2):'—'}</td>
                      <td style={{ minWidth:100 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                          <div style={{ flex:1,background:'#e8ecf0',borderRadius:4,height:7,overflow:'hidden' }}>
                            <div style={{ height:'100%',borderRadius:4,background:rate>=90?'#117A65':rate>=70?'#CA6F1E':'#C0392B',width:`${rate}%`,transition:'width .5s' }} />
                          </div>
                          <span style={{ fontSize:9,fontWeight:700,color:rate>=90?'var(--teal)':rate>=70?'var(--amber)':'var(--red)',whiteSpace:'nowrap' }}>{rate.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>TOTAL</td>
                  <td className={tableStyles.right}>{fmt(totalPurchases)}</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(totalPaid)}</td>
                  <td className={tableStyles.right} style={{ color:'var(--red)',fontWeight:800 }}>{fmt(outstanding)}</td>
                  <td colSpan={4}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}