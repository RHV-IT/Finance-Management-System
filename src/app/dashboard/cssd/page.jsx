'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { fmt, fmtM } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
import { Bar, Line, Doughnut } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
 
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Tooltip, Legend);
 
// ── Seed data ──────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DEPT_LIST    = ['ICU / HDU','Theatre','Obstetrics','Orthopaedics','Paediatrics','A&E','ENT','Ophthalmology','Dental','Cardiology'];
 
const SEED_BATCHES = [
  { id:'CSSD-001', date:'2025-11-28', dept:'Theatre',     processed:320, sterilized:318, returnedDmg:2, revenue:1_920_000, expense:480_000, method:'Steam Autoclave',  by:'Nurse Adaeze',    status:'Completed' },
  { id:'CSSD-002', date:'2025-11-27', dept:'ICU / HDU',   processed:185, sterilized:183, returnedDmg:2, revenue:1_110_000, expense:277_500, method:'ETO Sterilizer',   by:'Nurse Bello',     status:'Completed' },
  { id:'CSSD-003', date:'2025-11-26', dept:'Obstetrics',  processed:210, sterilized:210, returnedDmg:0, revenue:1_260_000, expense:315_000, method:'Steam Autoclave',  by:'Nurse Adaeze',    status:'Completed' },
  { id:'CSSD-004', date:'2025-11-25', dept:'Orthopaedics',processed:140, sterilized:138, returnedDmg:2, revenue:840_000,  expense:210_000, method:'Dry Heat Oven',    by:'Nurse Chukwu',    status:'Completed' },
  { id:'CSSD-005', date:'2025-11-24', dept:'Paediatrics', processed: 95, sterilized: 95, returnedDmg:0, revenue:570_000,  expense:142_500, method:'Steam Autoclave',  by:'Nurse Bello',     status:'Completed' },
  { id:'CSSD-006', date:'2025-11-22', dept:'Theatre',     processed:305, sterilized:302, returnedDmg:3, revenue:1_812_000,expense:453_000, method:'Steam Autoclave',  by:'Nurse Adaeze',    status:'Completed' },
  { id:'CSSD-007', date:'2025-11-21', dept:'A&E',         processed:120, sterilized:119, returnedDmg:1, revenue:714_000,  expense:178_500, method:'ETO Sterilizer',   by:'Nurse Chukwu',    status:'Completed' },
  { id:'CSSD-008', date:'2025-11-20', dept:'Cardiology',  processed: 88, sterilized: 87, returnedDmg:1, revenue:522_000,  expense:130_500, method:'Plasma Sterilizer',by:'Nurse Bello',     status:'Completed' },
];
 
const SEED_PACKS = [
  { packId:'PK-001', name:'Basic Surgical Pack',      category:'Surgical',    items:'Scalpel, clamps, retractors, needles',     qty:45, unitCost:12_000, status:'Ready'      },
  { packId:'PK-002', name:'Obstetric Delivery Pack',  category:'Obstetric',   items:'Scissors, cord clamp, drape, gauze',       qty:28, unitCost: 8_500, status:'Ready'      },
  { packId:'PK-003', name:'IV Insertion Pack',        category:'Procedure',   items:'Cannula, dressing, tape, swabs',           qty:120,unitCost: 2_200, status:'Ready'      },
  { packId:'PK-004', name:'Dressing Pack – Large',    category:'Wound Care',  items:'Gauze, saline, bandage, forceps',          qty:85, unitCost: 3_400, status:'Ready'      },
  { packId:'PK-005', name:'Catheterisation Pack',     category:'Procedure',   items:'Catheter, bag, gloves, lubricant, swabs',  qty:60, unitCost: 4_800, status:'Ready'      },
  { packId:'PK-006', name:'Theatre Lap Pack',         category:'Surgical',    items:'Drapes, swabs ×20, bowls, suction tubing', qty:22, unitCost:18_500, status:'Low Stock'   },
  { packId:'PK-007', name:'Eye Procedure Pack',       category:'Ophthal',     items:'Drape, speculum, cannulas, BSS',           qty:15, unitCost:22_000, status:'Low Stock'   },
  { packId:'PK-008', name:'Dental Extraction Pack',   category:'Dental',      items:'Forceps, elevator, swabs, gauze',          qty:40, unitCost: 5_500, status:'Ready'      },
  { packId:'PK-009', name:'Neonatal Care Pack',       category:'Paediatrics', items:'Suction, resuscitation mask, gloves',      qty: 8, unitCost:14_200, status:'Critical'   },
  { packId:'PK-010', name:'Cardiac Cath Pack',        category:'Cardiology',  items:'Introducer, guidewire, drape, contrast set',qty:12,unitCost:35_000, status:'Low Stock'  },
];
 
const STERILISATION_METHODS = [
  { method:'Steam Autoclave',   batches:58, packsPr:11_240, passRate:99.1, avgCycle:45, color:'#117A65' },
  { method:'ETO Sterilizer',    batches:22, packsPr: 3_180, passRate:98.7, avgCycle:360,color:'#1B4F72' },
  { method:'Dry Heat Oven',     batches:14, packsPr: 1_960, passRate:99.5, avgCycle:120,color:'#CA6F1E' },
  { method:'Plasma Sterilizer', batches: 8, packsPr:   880, passRate:99.8, avgCycle:55, color:'#6C3483' },
];
 
const MONTHLY_STATS = {
  processed:   [2_840,2_920,3_100,2_680,3_450,3_280,3_190,3_620,3_480,3_310,3_260,3_080],
  sterilized:  [2_818,2_895,3_079,2_661,3_422,3_253,3_162,3_590,3_452,3_284,3_234,3_049],
  revenue:     [17_040_000,17_520_000,18_600_000,16_080_000,20_700_000,19_680_000,19_140_000,21_720_000,20_880_000,19_860_000,19_560_000,18_480_000],
  expense:     [4_260_000,4_380_000,4_650_000,4_020_000,5_175_000,4_920_000,4_785_000,5_430_000,5_220_000,4_965_000,4_890_000,4_620_000],
};
 
const FONT = { family: "'Inter','Segoe UI',Arial,sans-serif", size: 10 };
const BASE = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } };
 
// ── badge helper ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    'Completed': tableStyles.green,
    'Ready':     tableStyles.green,
    'In Progress': tableStyles.blue,
    'Low Stock': tableStyles.amber,
    'Critical':  tableStyles.red,
    'Scheduled': tableStyles.grey,
  };
  return <span className={`${tableStyles.badge} ${map[status] ?? tableStyles.grey}`}>{status}</span>;
}
 
// ── Modal ──────────────────────────────────────────────────────────────────
function LogBatchModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    dept: DEPT_LIST[0],
    processed: '',
    sterilized: '',
    returnedDmg: '',
    revenue: '',
    expense: '',
    method: 'Steam Autoclave',
    by: '',
    status: 'Completed',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
 
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'#fff',borderRadius:12,width:560,maxWidth:'95vw',boxShadow:'0 20px 60px rgba(0,0,0,.35)',display:'flex',flexDirection:'column',maxHeight:'90vh' }}>
        <div style={{ padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ fontSize:15,fontWeight:800,color:'var(--navy)' }}>♻️ Log Sterilisation Batch</span>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:18,cursor:'pointer',color:'var(--muted)' }}>✕</button>
        </div>
        <div style={{ padding:18,overflowY:'auto' }}>
          <div className={styles.frm ?? ''} style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 14px' }}>
            {[
              { label:'Date',               key:'date',       type:'date'   },
              { label:'Department',          key:'dept',       type:'select', opts: DEPT_LIST },
              { label:'Packs Processed',     key:'processed',  type:'number' },
              { label:'Packs Sterilised',    key:'sterilized', type:'number' },
              { label:'Returned Damaged',    key:'returnedDmg',type:'number' },
              { label:'Sterilisation Method',key:'method',     type:'select', opts:['Steam Autoclave','ETO Sterilizer','Dry Heat Oven','Plasma Sterilizer'] },
              { label:'Revenue (₦)',         key:'revenue',    type:'number' },
              { label:'Expense (₦)',         key:'expense',    type:'number' },
              { label:'Logged By',           key:'by',         type:'text'   },
              { label:'Status',              key:'status',     type:'select', opts:['Completed','In Progress','Scheduled'] },
            ].map(({ label, key, type, opts }) => (
              <label key={key} style={{ display:'flex',flexDirection:'column',fontSize:10,fontWeight:700,color:'var(--navy)',gap:3 }}>
                {label}
                {type === 'select' ? (
                  <select value={form[key]} onChange={e => set(key, e.target.value)}
                    style={{ padding:'7px 9px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:12,outline:'none' }}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                    style={{ padding:'7px 9px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:12,outline:'none' }} />
                )}
              </label>
            ))}
          </div>
        </div>
        <div style={{ padding:'12px 18px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:8 }}>
          <button onClick={onClose} className={styles.btnGhost}>Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }} className={styles.btnSecondary}>💾 Save Batch</button>
        </div>
      </div>
    </div>
  );
}
 
// ── Main page ──────────────────────────────────────────────────────────────
export default function CssdPage() {
  const [activeTab, setActiveTab]     = useState('batches');
  const [batches,   setBatches]       = useState(SEED_BATCHES);
  const [search,    setSearch]        = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [methodFilter, setMethodFilter] = useState('All');
 
  const totProc  = batches.reduce((s, b) => s + b.processed,   0);
  const totSter  = batches.reduce((s, b) => s + b.sterilized,  0);
  const totDmg   = batches.reduce((s, b) => s + b.returnedDmg, 0);
  const totRev   = batches.reduce((s, b) => s + b.revenue,     0);
  const totExp   = batches.reduce((s, b) => s + b.expense,     0);
  const utilRate = totProc > 0 ? (totSter / totProc * 100).toFixed(1) : 0;
  const margin   = totRev  > 0 ? ((totRev - totExp) / totRev * 100).toFixed(1) : 0;
 
  const TABS = [
    { id:'batches',  label:'📋 Batch Log'          },
    { id:'packs',    label:'📦 Pack Inventory'      },
    { id:'methods',  label:'🔬 Methods & Cycles'    },
    { id:'analytics',label:'📊 Analytics'           },
  ];
 
  const filteredBatches = useMemo(() => {
    const q = search.toLowerCase();
    return batches.filter(b =>
      (!q || b.id.toLowerCase().includes(q) || b.dept.toLowerCase().includes(q) || b.by.toLowerCase().includes(q)) &&
      (methodFilter === 'All' || b.method === methodFilter)
    );
  }, [batches, search, methodFilter]);
 
  const handleSave = (form) => {
    const newBatch = {
      ...form,
      id: `CSSD-${String(batches.length + 1).padStart(3,'0')}`,
      processed:   +form.processed   || 0,
      sterilized:  +form.sterilized  || 0,
      returnedDmg: +form.returnedDmg || 0,
      revenue:     +form.revenue     || 0,
      expense:     +form.expense     || 0,
    };
    setBatches(p => [newBatch, ...p]);
  };
 
  // dept breakdown from batches
  const deptMap = useMemo(() => {
    const m = {};
    batches.forEach(b => {
      if (!m[b.dept]) m[b.dept] = { dept:b.dept, processed:0, sterilized:0, revenue:0 };
      m[b.dept].processed  += b.processed;
      m[b.dept].sterilized += b.sterilized;
      m[b.dept].revenue    += b.revenue;
    });
    return Object.values(m).sort((a,b) => b.processed - a.processed);
  }, [batches]);
 
  const COLORS = ['#1B4F72','#117A65','#6C3483','#CA6F1E','#D85A30','#639922','#1ABC9C','#F39C12','#E74C3C','#3498DB'];
 
  return (
    <DashboardLayout>
      {showModal && <LogBatchModal onClose={() => setShowModal(false)} onSave={handleSave} />}
 
      {/* ── Header ─────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>♻️ CSSD — Central Sterile Services</h2>
          <p className={styles.pageMeta}>Sterilisation batches · Pack inventory · Cycle performance · FY 2025</p>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button className={styles.btnSecondary} onClick={() => setShowModal(true)}>＋ Log Batch</button>
          <button className={styles.btnGhost} onClick={() => {
            const rows = ['Batch ID,Date,Dept,Processed,Sterilised,Damaged,Revenue,Expense,Method,By,Status'];
            batches.forEach(b => rows.push(`${b.id},${b.date},${b.dept},${b.processed},${b.sterilized},${b.returnedDmg},${b.revenue},${b.expense},"${b.method}","${b.by}",${b.status}`));
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));
            a.download = 'CSSD_Batches.csv'; a.click();
          }}>⬇ Export CSV</button>
        </div>
      </div>
 
      {/* ── KPIs ───────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Packs Processed"      value={totProc.toLocaleString()} delta={`${batches.length} batches`}     deltaType="neutral" color="blue"   />
        <KPICard label="Packs Sterilised"     value={totSter.toLocaleString()} delta="Successfully processed"          deltaType="up"      color="green"  />
        <KPICard label="Utilisation Rate"     value={`${utilRate}%`}           delta="Target ≥ 98%"                   deltaType={+utilRate>=98?'up':'warn'} badge={+utilRate>=98?'On Target':'Monitor'} badgeType={+utilRate>=98?'good':'warn'} color={+utilRate>=98?'green':'amber'} />
        <KPICard label="Returned / Damaged"   value={totDmg.toLocaleString()}  delta="Packs rejected post-sterilisation" deltaType={totDmg===0?'up':'warn'} color={totDmg===0?'green':'amber'} />
        <KPICard label="Revenue Generated"    value={fmt(totRev)}              delta="Sterilisation charges"           deltaType="up"      color="teal"   />
        <KPICard label="Operating Expense"    value={fmt(totExp)}              delta="Materials & utilities"           deltaType="warn"    color="red"    />
        <KPICard label="Dept Contribution Margin" value={`${margin}%`}        delta="Revenue less direct cost"        deltaType={+margin>60?'up':'warn'} badge={+margin>60?'Healthy':'Monitor'} badgeType={+margin>60?'good':'warn'} color={+margin>60?'green':'amber'} />
        <KPICard label="Sterilisation Methods" value={STERILISATION_METHODS.length} delta="Methods in use"           deltaType="neutral"  color="purple" />
      </div>
 
      {/* ── Tab strip ──────────────────────────────── */}
      <div className={styles.tabStrip}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`${styles.tabBtn} ${activeTab===t.id ? styles.active : ''}`}>
            {t.label}
          </button>
        ))}
      </div>
 
      {/* ══ TAB: Batch Log ════════════════════════════════════════════════════ */}
      {activeTab === 'batches' && (
        <div>
          <div className={styles.toolbar}>
            <input className={styles.toolbarSearch} placeholder="🔍 Search batch ID / dept / staff…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
              value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
              <option>All</option>
              {STERILISATION_METHODS.map(m => <option key={m.method}>{m.method}</option>)}
            </select>
            <span style={{ fontSize:11,color:'var(--muted)',marginLeft:'auto' }}>{filteredBatches.length} batches</span>
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Sterilisation Batch Log</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Batch ID</th><th>Date</th><th>Department</th>
                  <th className={tableStyles.right}>Processed</th>
                  <th className={tableStyles.right}>Sterilised</th>
                  <th className={tableStyles.right}>Damaged</th>
                  <th>Method</th>
                  <th className={tableStyles.right}>Revenue</th>
                  <th className={tableStyles.right}>Expense</th>
                  <th className={tableStyles.right}>Margin</th>
                  <th>Logged By</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map(b => {
                  const m = b.revenue > 0 ? ((b.revenue - b.expense) / b.revenue * 100).toFixed(1) : 0;
                  const util = b.processed > 0 ? (b.sterilized / b.processed * 100).toFixed(1) : 0;
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight:700,fontFamily:'monospace',fontSize:10 }}>{b.id}</td>
                      <td>{b.date}</td>
                      <td><span style={{ fontWeight:600 }}>{b.dept}</span></td>
                      <td className={tableStyles.right}>{b.processed.toLocaleString()}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)',fontWeight:600 }}>{b.sterilized.toLocaleString()}</td>
                      <td className={tableStyles.right}>
                        <span style={{ color: b.returnedDmg > 0 ? 'var(--amber)' : 'var(--muted)' }}>{b.returnedDmg}</span>
                      </td>
                      <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{b.method}</span></td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)',fontWeight:600 }}>{fmt(b.revenue)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--red)' }}>{fmt(b.expense)}</td>
                      <td className={tableStyles.right}>
                        <span style={{ fontWeight:700,color:+m>60?'var(--teal)':'var(--amber)' }}>{m}%</span>
                      </td>
                      <td style={{ color:'var(--muted)',fontSize:10 }}>{b.by}</td>
                      <td><StatusBadge status={b.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>TOTAL ({filteredBatches.length} batches)</td>
                  <td className={tableStyles.right}>{filteredBatches.reduce((s,b)=>s+b.processed,0).toLocaleString()}</td>
                  <td className={tableStyles.right}>{filteredBatches.reduce((s,b)=>s+b.sterilized,0).toLocaleString()}</td>
                  <td className={tableStyles.right}>{filteredBatches.reduce((s,b)=>s+b.returnedDmg,0)}</td>
                  <td></td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(filteredBatches.reduce((s,b)=>s+b.revenue,0))}</td>
                  <td className={tableStyles.right} style={{ color:'var(--red)' }}>{fmt(filteredBatches.reduce((s,b)=>s+b.expense,0))}</td>
                  <td className={tableStyles.right}>{margin}%</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
 
          {/* Dept breakdown mini-table */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Usage by Department</div>
            <table className={tableStyles.table}>
              <thead>
                <tr><th>Department</th><th className={tableStyles.right}>Packs Processed</th><th className={tableStyles.right}>Packs Sterilised</th><th className={tableStyles.right}>Pass Rate</th><th className={tableStyles.right}>Revenue</th></tr>
              </thead>
              <tbody>
                {deptMap.map(d => (
                  <tr key={d.dept}>
                    <td style={{ fontWeight:600 }}>{d.dept}</td>
                    <td className={tableStyles.right}>{d.processed.toLocaleString()}</td>
                    <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{d.sterilized.toLocaleString()}</td>
                    <td className={tableStyles.right}>
                      <span style={{ fontWeight:700,color:'var(--teal)' }}>{d.processed>0?(d.sterilized/d.processed*100).toFixed(1):0}%</span>
                    </td>
                    <td className={tableStyles.right}>{fmt(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
 
      {/* ══ TAB: Pack Inventory ═══════════════════════════════════════════════ */}
      {activeTab === 'packs' && (
        <div>
          <div className={styles.toolbar}>
            <span style={{ fontSize:11,color:'var(--muted)' }}>
              {SEED_PACKS.filter(p=>p.status==='Ready').length} ready · {SEED_PACKS.filter(p=>p.status==='Low Stock').length} low stock · {SEED_PACKS.filter(p=>p.status==='Critical').length} critical
            </span>
            <div className={styles.spacer} />
            <span style={{ fontSize:11,color:'var(--muted)' }}>
              Total pack value: <strong style={{ color:'var(--navy)' }}>{fmt(SEED_PACKS.reduce((s,p)=>s+p.qty*p.unitCost,0))}</strong>
            </span>
          </div>
 
          {/* Status summary bars */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16 }}>
            {[
              { label:'Ready for Use', count:SEED_PACKS.filter(p=>p.status==='Ready').length, color:'#117A65', bg:'#d4edda' },
              { label:'Low Stock',     count:SEED_PACKS.filter(p=>p.status==='Low Stock').length, color:'#CA6F1E', bg:'#fff3cd' },
              { label:'Critical',      count:SEED_PACKS.filter(p=>p.status==='Critical').length,  color:'#C0392B', bg:'#f8d7da' },
            ].map(s => (
              <div key={s.label} style={{ background:s.bg,borderRadius:10,padding:'14px 18px',borderLeft:`4px solid ${s.color}` }}>
                <div style={{ fontSize:10,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:.4,marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:28,fontWeight:800,color:s.color }}>{s.count}</div>
                <div style={{ fontSize:10,color:'var(--muted)' }}>pack types</div>
              </div>
            ))}
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Pack Inventory Register</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Pack ID</th><th>Pack Name</th><th>Category</th><th>Contents</th>
                  <th className={tableStyles.right}>Qty Available</th>
                  <th className={tableStyles.right}>Unit Cost</th>
                  <th className={tableStyles.right}>Total Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {SEED_PACKS.map(p => (
                  <tr key={p.packId}>
                    <td style={{ fontFamily:'monospace',fontSize:10,fontWeight:700 }}>{p.packId}</td>
                    <td style={{ fontWeight:600 }}>{p.name}</td>
                    <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{p.category}</span></td>
                    <td style={{ fontSize:10,color:'var(--muted)',maxWidth:200 }}>{p.items}</td>
                    <td className={tableStyles.right} style={{ fontWeight:700,color:p.status==='Critical'?'var(--red)':p.status==='Low Stock'?'var(--amber)':'var(--text)' }}>{p.qty}</td>
                    <td className={tableStyles.right}>{fmt(p.unitCost)}</td>
                    <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(p.qty * p.unitCost)}</td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>TOTAL ({SEED_PACKS.length} pack types)</td>
                  <td className={tableStyles.right}>{SEED_PACKS.reduce((s,p)=>s+p.qty,0)}</td>
                  <td></td>
                  <td className={tableStyles.right}>{fmt(SEED_PACKS.reduce((s,p)=>s+p.qty*p.unitCost,0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
 
      {/* ══ TAB: Methods & Cycles ════════════════════════════════════════════ */}
      {activeTab === 'methods' && (
        <div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16 }}>
            {/* Method breakdown chart */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Batches by Sterilisation Method</div>
              <div style={{ height:220 }}>
                <Doughnut
                  data={{
                    labels: STERILISATION_METHODS.map(m=>m.method),
                    datasets:[{ data:STERILISATION_METHODS.map(m=>m.batches), backgroundColor:STERILISATION_METHODS.map(m=>m.color), borderWidth:2,borderColor:'#fff' }],
                  }}
                  options={{ responsive:true,maintainAspectRatio:false,cutout:'58%',plugins:{ legend:{display:true,position:'right',labels:{font:FONT}} } }}
                />
              </div>
            </div>
            {/* Packs per method */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Packs Processed by Method</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{
                    labels: STERILISATION_METHODS.map(m=>m.method),
                    datasets:[{ data:STERILISATION_METHODS.map(m=>m.packsPr), backgroundColor:STERILISATION_METHODS.map(m=>m.color), borderRadius:4 }],
                  }}
                  options={{ ...BASE, scales:{ x:{ grid:{display:false},ticks:{font:FONT} }, y:{ grid:{color:'rgba(0,0,0,.05)'},ticks:{font:FONT} } } }}
                />
              </div>
            </div>
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Sterilisation Method Performance</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Method</th>
                  <th className={tableStyles.right}>Total Batches</th>
                  <th className={tableStyles.right}>Packs Processed</th>
                  <th className={tableStyles.right}>Pass Rate</th>
                  <th className={tableStyles.right}>Avg Cycle (min)</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {STERILISATION_METHODS.map(m => (
                  <tr key={m.method}>
                    <td>
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                        <span style={{ width:10,height:10,borderRadius:'50%',background:m.color,display:'inline-block' }}></span>
                        <span style={{ fontWeight:600 }}>{m.method}</span>
                      </div>
                    </td>
                    <td className={tableStyles.right}>{m.batches}</td>
                    <td className={tableStyles.right}>{m.packsPr.toLocaleString()}</td>
                    <td className={tableStyles.right}>
                      <span style={{ fontWeight:700,color:m.passRate>=99?'var(--teal)':'var(--amber)' }}>{m.passRate}%</span>
                    </td>
                    <td className={tableStyles.right}>{m.avgCycle} min</td>
                    <td>
                      <div style={{ background:'#e8ecf0',borderRadius:4,height:8,overflow:'hidden',width:120 }}>
                        <div style={{ height:'100%',borderRadius:4,background:m.color,width:`${m.passRate}%`,transition:'width .5s' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
 
          {/* Avg cycle time comparison */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Average Cycle Time by Method (minutes)</div>
            <div style={{ height:180 }}>
              <Bar
                data={{
                  labels: STERILISATION_METHODS.map(m=>m.method),
                  datasets:[{ data:STERILISATION_METHODS.map(m=>m.avgCycle), backgroundColor:STERILISATION_METHODS.map(m=>m.color), borderRadius:4 }],
                }}
                options={{ ...BASE, scales:{ x:{grid:{display:false},ticks:{font:FONT}}, y:{grid:{color:'rgba(0,0,0,.05)'},ticks:{font:FONT,callback:v=>v+' min'}} } }}
              />
            </div>
          </div>
        </div>
      )}
 
      {/* ══ TAB: Analytics ═══════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
            {/* Monthly processed vs sterilised */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Monthly Packs Processed vs Sterilised</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{
                    labels: MONTHS_SHORT,
                    datasets:[
                      { label:'Processed',  data:MONTHLY_STATS.processed,  backgroundColor:'#1B4F7288',borderRadius:3 },
                      { label:'Sterilised', data:MONTHLY_STATS.sterilized, backgroundColor:'#117A65',   borderRadius:3 },
                    ],
                  }}
                  options={{ ...BASE, plugins:{legend:{display:true,position:'bottom',labels:{font:FONT}}}, scales:{ x:{grid:{display:false},ticks:{font:FONT}}, y:{grid:{color:'rgba(0,0,0,.05)'},ticks:{font:FONT}} } }}
                />
              </div>
            </div>
 
            {/* Monthly revenue vs expense */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Monthly Revenue vs Operating Expense</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{
                    labels: MONTHS_SHORT,
                    datasets:[
                      { label:'Revenue', data:MONTHLY_STATS.revenue.map(v=>+(v/1e6).toFixed(2)), backgroundColor:'#117A6599',borderRadius:3 },
                      { label:'Expense', data:MONTHLY_STATS.expense.map(v=>+(v/1e6).toFixed(2)), backgroundColor:'#C0392B88', borderRadius:3 },
                    ],
                  }}
                  options={{ ...BASE, plugins:{legend:{display:true,position:'bottom',labels:{font:FONT}}}, scales:{ x:{grid:{display:false},ticks:{font:FONT}}, y:{grid:{color:'rgba(0,0,0,.05)'},ticks:{font:FONT,callback:v=>'₦'+v+'M'}} } }}
                />
              </div>
            </div>
          </div>
 
          {/* Dept usage chart */}
          <div style={{ display:'grid',gridTemplateColumns:'1.2fr 0.8fr',gap:14,marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Sterilisation Demand by Department</div>
              <div style={{ height:200 }}>
                <Bar
                  data={{
                    labels: deptMap.map(d=>d.dept),
                    datasets:[{ data:deptMap.map(d=>d.processed), backgroundColor:COLORS, borderRadius:4 }],
                  }}
                  options={{ ...BASE, indexAxis:'y', scales:{ x:{grid:{color:'rgba(0,0,0,.05)'},ticks:{font:FONT}}, y:{grid:{display:false},ticks:{font:FONT}} } }}
                />
              </div>
            </div>
 
            {/* Pass rate by dept */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Pass Rate by Department</div>
              <div style={{ padding:'4px 0' }}>
                {deptMap.slice(0,6).map((d,i) => {
                  const rate = d.processed > 0 ? (d.sterilized/d.processed*100) : 0;
                  return (
                    <div key={d.dept} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3 }}>
                        <span style={{ fontWeight:600 }}>{d.dept}</span>
                        <span style={{ fontWeight:700,color:rate>=99?'var(--teal)':'var(--amber)' }}>{rate.toFixed(1)}%</span>
                      </div>
                      <div style={{ background:'#e8ecf0',borderRadius:4,height:6,overflow:'hidden' }}>
                        <div style={{ height:'100%',borderRadius:4,background:COLORS[i],width:`${rate}%`,transition:'width .6s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
 
          {/* Monthly summary table */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Monthly Performance Summary — FY 2025</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className={tableStyles.right}>Processed</th>
                  <th className={tableStyles.right}>Sterilised</th>
                  <th className={tableStyles.right}>Pass Rate</th>
                  <th className={tableStyles.right}>Revenue</th>
                  <th className={tableStyles.right}>Expense</th>
                  <th className={tableStyles.right}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS_SHORT.map((m,i) => {
                  const proc = MONTHLY_STATS.processed[i];
                  const ster = MONTHLY_STATS.sterilized[i];
                  const rev  = MONTHLY_STATS.revenue[i];
                  const exp  = MONTHLY_STATS.expense[i];
                  const rate = proc>0?(ster/proc*100).toFixed(1):0;
                  const mgn  = rev>0?((rev-exp)/rev*100).toFixed(1):0;
                  return (
                    <tr key={m}>
                      <td style={{ fontWeight:600 }}>{m} 2025</td>
                      <td className={tableStyles.right}>{proc.toLocaleString()}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{ster.toLocaleString()}</td>
                      <td className={tableStyles.right}><span style={{ fontWeight:700,color:+rate>=99?'var(--teal)':'var(--amber)' }}>{rate}%</span></td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)',fontWeight:600 }}>{fmt(rev)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--red)' }}>{fmt(exp)}</td>
                      <td className={tableStyles.right}><span style={{ fontWeight:700,color:+mgn>60?'var(--teal)':'var(--amber)' }}>{mgn}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>TOTAL</td>
                  <td className={tableStyles.right}>{MONTHLY_STATS.processed.reduce((a,b)=>a+b,0).toLocaleString()}</td>
                  <td className={tableStyles.right}>{MONTHLY_STATS.sterilized.reduce((a,b)=>a+b,0).toLocaleString()}</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)' }}>
                    {(MONTHLY_STATS.sterilized.reduce((a,b)=>a+b,0)/MONTHLY_STATS.processed.reduce((a,b)=>a+b,0)*100).toFixed(1)}%
                  </td>
                  <td className={tableStyles.right}>{fmt(MONTHLY_STATS.revenue.reduce((a,b)=>a+b,0))}</td>
                  <td className={tableStyles.right}>{fmt(MONTHLY_STATS.expense.reduce((a,b)=>a+b,0))}</td>
                  <td className={tableStyles.right}>
                    {(() => { const r=MONTHLY_STATS.revenue.reduce((a,b)=>a+b,0), e=MONTHLY_STATS.expense.reduce((a,b)=>a+b,0); return ((r-e)/r*100).toFixed(1)+'%'; })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}