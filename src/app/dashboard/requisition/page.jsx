'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { fmt, COLORS } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js';
 
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);
 
/* ── chart defaults ─────────────────────────────────────────────────────── */
const FONT   = { family: "'Inter','Segoe UI',Arial,sans-serif", size: 10 };
const GRID   = 'rgba(0,0,0,0.05)';
const BASE   = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const X_NONE = { grid: { display: false }, ticks: { font: FONT } };
const Y_BASE = { grid: { color: GRID }, ticks: { font: FONT } };
const LEG_B  = { display: true, position: 'bottom', labels: { font: FONT, boxWidth: 10 } };
 
/* ── constants ──────────────────────────────────────────────────────────── */
const DEPT_LIST = [
  'Pharmacy','Laboratory','Radiology','Ophthalmology','CSSD',
  'Finance','Procurement','HR','Operations','Administration',
];
 
const ITEM_CATEGORIES = ['Drug','Consumable','Reagent','Lab Material','X-Ray Material','Fluid','Equipment','Office Supplies','Other'];
 
const PRIORITY_LIST = ['Normal','High','Urgent'];
 
/* lifecycle from dashboard.html */
const REQ_STAGES = [
  'Submitted',
  'Approved',
  'Queried',
  'Rejected',
  'Pending Procurement',
  'PO Created',
  'Vendor Confirmed',
  'Goods Received',
  'Completed',
];
 
/* ── seed item master (pre-populated dropdown) ───────────────────────────── */
const ITEM_MASTER = [
  { code:'DRG-0001', name:'Amoxicillin 500mg Capsule',     category:'Drug',          unit:'Carton (1000 caps)', estCost:85_000  },
  { code:'DRG-0002', name:'Paracetamol 500mg Tablet',      category:'Drug',          unit:'Carton (1000 tabs)', estCost:18_000  },
  { code:'DRG-0003', name:'Metronidazole 400mg Tablet',    category:'Drug',          unit:'Carton (500 tabs)',  estCost:22_000  },
  { code:'DRG-0004', name:'Amlodipine 5mg Tablet',         category:'Drug',          unit:'Carton (500 tabs)',  estCost:35_000  },
  { code:'DRG-0005', name:'Normal Saline 0.9% 500ml',      category:'Fluid',         unit:'Carton (24 bags)',   estCost:54_000  },
  { code:'DRG-0006', name:'Dextrose 5% 500ml',             category:'Fluid',         unit:'Carton (24 bags)',   estCost:62_000  },
  { code:'CON-0001', name:'Examination Gloves – Medium',   category:'Consumable',    unit:'Carton (1000 pcs)',  estCost:28_000  },
  { code:'CON-0002', name:'Syringe 5ml (Luer Lock)',       category:'Consumable',    unit:'Box (100 pcs)',      estCost:8_500   },
  { code:'CON-0003', name:'IV Cannula 18G',                category:'Consumable',    unit:'Box (50 pcs)',       estCost:14_000  },
  { code:'CON-0004', name:'Nasogastric Tube Size 16',      category:'Consumable',    unit:'Box (50 pcs)',       estCost:22_000  },
  { code:'LAB-0001', name:'FBC Reagent Kit',               category:'Reagent',       unit:'Kit (100 tests)',    estCost:45_000  },
  { code:'LAB-0002', name:'Blood Glucose Strips',          category:'Lab Material',  unit:'Pack (50 strips)',   estCost:6_500   },
  { code:'LAB-0003', name:'Urine Test Strips',             category:'Lab Material',  unit:'Pack (100 strips)',  estCost:7_200   },
  { code:'RAD-0001', name:'CT Contrast Media 100ml',       category:'X-Ray Material',unit:'Vial',              estCost:12_000  },
  { code:'RAD-0002', name:'X-Ray Film 14×17',              category:'X-Ray Material',unit:'Box (100 sheets)',   estCost:35_000  },
  { code:'OPH-0001', name:'Intraocular Lens (IOL)',        category:'Consumable',    unit:'Single',             estCost:18_000  },
  { code:'OFF-0001', name:'A4 Paper Ream 80gsm',           category:'Office Supplies',unit:'Ream',             estCost:4_500   },
  { code:'OFF-0002', name:'HP LaserJet Toner Cartridge',   category:'Office Supplies',unit:'Unit',             estCost:35_000  },
];
 
/* ── seed existing requisitions ─────────────────────────────────────────── */
const SEED_REQS = [
  {
    reqNo:'DR-220101', date:'2025-11-20', dept:'Pharmacy', requester:'pharmacy',
    priority:'High', notes:'Critical stock depletion — ward supply affected',
    status:'Pending Procurement', stage:'Pending Procurement',
    estValue:4_720_000, queryNote:'',
    history:[
      { stage:'Submitted by Pharmacy',    ts:'2025-11-20T09:00:00Z', by:'pharmacy'   },
      { stage:'Approved by Management',   ts:'2025-11-21T10:15:00Z', by:'admin'      },
      { stage:'Pending Procurement',      ts:'2025-11-21T10:16:00Z', by:'admin'      },
    ],
    lines:[
      { item:'Normal Saline 0.9% 500ml', category:'Fluid',      qty:80, unitCost:54_000, total:4_320_000 },
      { item:'Dextrose 5% 500ml',        category:'Fluid',      qty:8,  unitCost:62_000, total:  496_000 },
    ],
  },
  {
    reqNo:'DR-220102', date:'2025-11-22', dept:'Laboratory', requester:'lab',
    priority:'High', notes:'FBC reagent kits nearly exhausted — urgent',
    status:'Approved', stage:'Approved',
    estValue:2_875_000, queryNote:'',
    history:[
      { stage:'Submitted by Laboratory',  ts:'2025-11-22T08:00:00Z', by:'lab'   },
      { stage:'Approved by Management',   ts:'2025-11-23T09:30:00Z', by:'admin' },
    ],
    lines:[
      { item:'FBC Reagent Kit',        category:'Reagent',      qty:30, unitCost:45_000, total:1_350_000 },
      { item:'Blood Glucose Strips',   category:'Lab Material', qty:100,unitCost:6_500,  total:  650_000 },
      { item:'Urine Test Strips',      category:'Lab Material', qty:120,unitCost:7_200,  total:  864_000 },
    ],
  },
  {
    reqNo:'DR-220103', date:'2025-11-25', dept:'Radiology', requester:'radiology',
    priority:'Normal', notes:'Monthly consumable replenishment',
    status:'Queried', stage:'Submitted',
    estValue:1_400_000, queryNote:'Please provide 3 vendor quotations before approval.',
    history:[
      { stage:'Submitted by Radiology',   ts:'2025-11-25T08:00:00Z', by:'radiology' },
      { stage:'Queried by Management',    ts:'2025-11-26T10:00:00Z', by:'admin'     },
    ],
    lines:[
      { item:'CT Contrast Media 100ml', category:'X-Ray Material', qty:50, unitCost:12_000, total:600_000 },
      { item:'X-Ray Film 14×17',        category:'X-Ray Material', qty:20, unitCost:35_000, total:700_000 },
      { item:'Urine Test Strips',       category:'Lab Material',   qty:14, unitCost:7_200,  total:100_800 },
    ],
  },
  {
    reqNo:'DR-220104', date:'2025-11-15', dept:'Finance', requester:'revenue',
    priority:'Low', notes:'Office supplies restock — quarterly',
    status:'Completed', stage:'Completed',
    estValue:185_000, queryNote:'',
    history:[
      { stage:'Submitted by Finance',     ts:'2025-11-15T09:00:00Z', by:'revenue'    },
      { stage:'Approved by Management',   ts:'2025-11-16T11:00:00Z', by:'admin'      },
      { stage:'PO Created',               ts:'2025-11-17T09:00:00Z', by:'procurement'},
      { stage:'Vendor Confirmed',         ts:'2025-11-18T14:00:00Z', by:'procurement'},
      { stage:'Goods Received',           ts:'2025-11-20T10:00:00Z', by:'store'      },
      { stage:'Completed',                ts:'2025-11-21T11:00:00Z', by:'payables'   },
    ],
    lines:[
      { item:'A4 Paper Ream 80gsm',           category:'Office Supplies', qty:10, unitCost:4_500,  total:45_000  },
      { item:'HP LaserJet Toner Cartridge',   category:'Office Supplies', qty:4,  unitCost:35_000, total:140_000 },
    ],
  },
  {
    reqNo:'DR-220105', date:'2025-11-28', dept:'CSSD', requester:'cssd',
    priority:'Normal', notes:'Sterilisation pouch replenishment',
    status:'Submitted', stage:'Submitted',
    estValue:380_000, queryNote:'',
    history:[
      { stage:'Submitted by CSSD', ts:'2025-11-28T09:00:00Z', by:'cssd' },
    ],
    lines:[
      { item:'Self-Seal Sterilisation Pouches', category:'Consumable', qty:20, unitCost:12_000, total:240_000 },
      { item:'Chemical Indicator Tape',         category:'Consumable', qty:40, unitCost:3_500,  total:140_000 },
    ],
  },
];
 
/* ── helpers ─────────────────────────────────────────────────────────────── */
const STATUS_BADGE_CLASS = {
  'Submitted':          tableStyles.blue,
  'Approved':           tableStyles.green,
  'Queried':            tableStyles.amber,
  'Rejected':           tableStyles.red,
  'Pending Procurement':tableStyles.amber,
  'PO Created':         tableStyles.blue,
  'Vendor Confirmed':   tableStyles.blue,
  'Goods Received':     tableStyles.green,
  'Completed':          tableStyles.green,
};
const PRIORITY_CLASS = {
  Urgent: tableStyles.red,
  High:   tableStyles.amber,
  Normal: tableStyles.blue,
  Low:    tableStyles.grey,
};
 
function StatusBadge({ s }) {
  return <span className={`${tableStyles.badge} ${STATUS_BADGE_CLASS[s] ?? tableStyles.grey}`}>{s}</span>;
}
 
/* ── Inline input style ─────────────────────────────────────────────────── */
const inp = {
  padding:'7px 9px', border:'1.5px solid var(--border)', borderRadius:6,
  fontSize:11, outline:'none', width:'100%', fontFamily:'inherit', boxSizing:'border-box',
};
 
/* ── Field wrapper ──────────────────────────────────────────────────────── */
function Field({ label, span, children }) {
  return (
    <label style={{
      display:'flex', flexDirection:'column', fontSize:10,
      fontWeight:700, color:'var(--navy)', gap:4,
      gridColumn: span ? `span ${span}` : undefined,
    }}>
      {label}
      {children}
    </label>
  );
}
 
/* ════════════════════════════════════════════════════════════════════════════
   LINE ITEM EDITOR
═══════════════════════════════════════════════════════════════════════════ */
function LineItemEditor({ lines, onChange }) {
  function addRow() {
    onChange([...lines, { item:'', category:'Drug', qty:'', unitCost:'', total:0 }]);
  }
  function removeRow(i) {
    onChange(lines.filter((_, idx) => idx !== i));
  }
  function updateRow(i, key, val) {
    const next = lines.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, [key]: val };
      if (key === 'qty' || key === 'unitCost') {
        updated.total = (+updated.qty || 0) * (+updated.unitCost || 0);
      }
      // auto-fill from item master
      if (key === 'item') {
        const found = ITEM_MASTER.find(m => m.name === val);
        if (found) {
          updated.category = found.category;
          updated.unitCost = found.estCost;
          updated.total    = (+updated.qty || 0) * found.estCost;
        }
      }
      return updated;
    });
    onChange(next);
  }
 
  const grandTotal = lines.reduce((s, r) => s + (+r.total || 0), 0);
 
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', letterSpacing:.4 }}>Line Items</span>
        <button type="button" onClick={addRow}
          style={{ padding:'3px 10px', background:'var(--navy)', color:'#fff', border:'none', borderRadius:5, fontSize:10, cursor:'pointer', fontWeight:600 }}>
          ＋ Add Line
        </button>
      </div>
 
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
        <thead>
          <tr>
            {['Item','Category','Qty','Unit Cost (₦)','Total',''].map(h => (
              <th key={h} style={{ background:'#f0f4f8', padding:'6px 8px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--navy)', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((r, i) => (
            <tr key={i}>
              <td style={{ padding:'4px 4px', minWidth:200 }}>
                <select value={r.item} onChange={e => updateRow(i, 'item', e.target.value)}
                  style={{ ...inp, minWidth:200 }}>
                  <option value="">— select item —</option>
                  {ITEM_MASTER.map(m => (
                    <option key={m.code} value={m.name}>{m.name} ({m.unit})</option>
                  ))}
                  <option value="__custom__">Other / Type manually…</option>
                </select>
                {r.item === '__custom__' && (
                  <input type="text" placeholder="Type item name…"
                    onChange={e => updateRow(i, 'item', e.target.value)}
                    style={{ ...inp, marginTop:4 }} />
                )}
              </td>
              <td style={{ padding:'4px 4px', minWidth:130 }}>
                <select value={r.category} onChange={e => updateRow(i, 'category', e.target.value)} style={inp}>
                  {ITEM_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </td>
              <td style={{ padding:'4px 4px', width:80 }}>
                <input type="number" min={1} value={r.qty} placeholder="0"
                  onChange={e => updateRow(i, 'qty', e.target.value)} style={inp} />
              </td>
              <td style={{ padding:'4px 4px', width:130 }}>
                <input type="number" min={0} value={r.unitCost} placeholder="0"
                  onChange={e => updateRow(i, 'unitCost', e.target.value)} style={inp} />
              </td>
              <td style={{ padding:'4px 8px', fontWeight:700, color:'var(--navy)', whiteSpace:'nowrap', textAlign:'right' }}>
                {fmt(+r.total || 0)}
              </td>
              <td style={{ padding:'4px 4px', textAlign:'center' }}>
                <button type="button" onClick={() => removeRow(i)}
                  style={{ background:'var(--red)', color:'#fff', border:'none', borderRadius:4, padding:'3px 8px', cursor:'pointer', fontSize:10 }}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
          {lines.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign:'center', padding:20, color:'var(--muted)', fontSize:11 }}>
                No line items yet — click ＋ Add Line to begin.
              </td>
            </tr>
          )}
        </tbody>
        {lines.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={4} style={{ padding:'8px 10px', fontWeight:700, background:'#f0f4f8', borderTop:'2px solid var(--border)' }}>
                ESTIMATED TOTAL
              </td>
              <td style={{ padding:'8px 8px', fontWeight:800, color:'var(--navy)', background:'#f0f4f8', borderTop:'2px solid var(--border)', textAlign:'right', whiteSpace:'nowrap' }}>
                {fmt(grandTotal)}
              </td>
              <td style={{ background:'#f0f4f8', borderTop:'2px solid var(--border)' }} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
 
/* ════════════════════════════════════════════════════════════════════════════
   NEW REQUISITION MODAL
═══════════════════════════════════════════════════════════════════════════ */
function NewRequisitionModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    dept:     DEPT_LIST[0],
    priority: 'Normal',
    notes:    '',
  });
  const [lines, setLines] = useState([
    { item:'', category:'Drug', qty:'', unitCost:'', total:0 },
  ]);
  const [errors, setErrors] = useState({});
 
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
 
  const grandTotal = lines.reduce((s, r) => s + (+r.total || 0), 0);
 
  function validate() {
    const e = {};
    if (!form.dept)  e.dept  = 'Department is required';
    const valid = lines.filter(r => r.item && r.item !== '__custom__' && +r.qty > 0);
    if (!valid.length) e.lines = 'Add at least one complete line item (item + qty)';
    setErrors(e);
    return Object.keys(e).length === 0;
  }
 
  function handleSubmit() {
    if (!validate()) return;
    const validLines = lines
      .filter(r => r.item && r.item !== '__custom__' && +r.qty > 0)
      .map(r => ({ ...r, qty:+r.qty, unitCost:+r.unitCost||0, total:+r.total||0 }));
 
    const itemSummary = validLines.length === 1
      ? validLines[0].item
      : `${validLines[0].item} + ${validLines.length - 1} more`;
 
    onSubmit({
      ...form,
      lines:    validLines,
      estValue: grandTotal,
      item:     itemSummary,
    });
    onClose();
  }
 
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'30px 10px' }}>
      <div style={{ background:'#fff', borderRadius:12, width:740, maxWidth:'97vw', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
 
        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--navy)' }}>📝 New Departmental Requisition</div>
            <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>Raise a request for drugs, consumables, reagents or supplies. Routes to Management for approval.</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--muted)', lineHeight:1 }}>✕</button>
        </div>
 
        {/* Body */}
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
 
          {/* Step 1 — Request details */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ background:'var(--navy)', color:'#fff', borderRadius:'50%', width:20, height:20, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, flexShrink:0 }}>1</span>
              Request Details
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 16px' }}>
              <Field label="Requesting Department *">
                <select style={inp} value={form.dept} onChange={e => set('dept', e.target.value)}>
                  {DEPT_LIST.map(d => <option key={d}>{d}</option>)}
                </select>
                {errors.dept && <span style={{ color:'var(--red)', fontSize:10 }}>{errors.dept}</span>}
              </Field>
 
              <Field label="Priority">
                <select style={inp} value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITY_LIST.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
 
              <Field label="Justification / Notes" span={2}>
                <textarea style={{ ...inp, resize:'vertical', minHeight:56 }}
                  placeholder="Explain why this request is needed, ward/clinical impact if not fulfilled…"
                  value={form.notes} onChange={e => set('notes', e.target.value)} />
              </Field>
            </div>
          </div>
 
          {/* Divider */}
          <div style={{ borderTop:'1px solid var(--border)' }} />
 
          {/* Step 2 — Line items */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ background:'var(--navy)', color:'#fff', borderRadius:'50%', width:20, height:20, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, flexShrink:0 }}>2</span>
              Items Requested
            </div>
            <LineItemEditor lines={lines} onChange={setLines} />
            {errors.lines && (
              <div style={{ marginTop:6, padding:'6px 10px', background:'#f8d7da', borderRadius:6, color:'#721c24', fontSize:10, fontWeight:600 }}>
                ⚠ {errors.lines}
              </div>
            )}
          </div>
 
          {/* Divider */}
          <div style={{ borderTop:'1px solid var(--border)' }} />
 
          {/* Step 3 — Workflow info */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ background:'var(--navy)', color:'#fff', borderRadius:'50%', width:20, height:20, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, flexShrink:0 }}>3</span>
              What happens next
            </div>
            <div style={{ display:'flex', gap:0, alignItems:'center', flexWrap:'wrap', gap:4 }}>
              {['Your Dept','Management Review','Procurement','Vendor','Store Receipt','Finance / Payment'].map((s, i, arr) => (
                <div key={s} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ background:i===0?'var(--teal)':'#e0e4ea', color:i===0?'#fff':'#888', borderRadius:6, padding:'4px 10px', fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>
                    {s}
                  </div>
                  {i < arr.length - 1 && <span style={{ color:'var(--muted)', fontSize:12 }}>→</span>}
                </div>
              ))}
            </div>
            <p style={{ fontSize:10, color:'var(--muted)', marginTop:8, lineHeight:1.6 }}>
              After submitting, Management will review and approve (Gate 1). Procurement will then source vendors and submit a recommendation for Management's final approval (Gate 2) before a Purchase Order is issued.
            </p>
          </div>
 
          {/* Grand total preview */}
          {grandTotal > 0 && (
            <div style={{ background:'#EBF5FB', borderRadius:8, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--navy)' }}>Estimated Request Value</span>
              <span style={{ fontSize:16, fontWeight:800, color:'var(--navy)' }}>{fmt(grandTotal)}</span>
            </div>
          )}
        </div>
 
        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:10, color:'var(--muted)' }}>
            All fields marked * are required. Submitting routes to Management for Gate 1 approval.
          </span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} className={styles.btnGhost}>Cancel</button>
            <button onClick={handleSubmit} className={styles.btnSecondary}>📤 Submit Requisition</button>
          </div>
        </div>
      </div>
    </div>
  );
}
 
/* ════════════════════════════════════════════════════════════════════════════
   REQUEST TRACKING TIMELINE
═══════════════════════════════════════════════════════════════════════════ */
function TrackingPanel({ req, onClose }) {
  const ci = REQ_STAGES.indexOf(req.stage);
 
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:12, width:680, maxWidth:'96vw', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
 
        {/* Header */}
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <span style={{ fontSize:15, fontWeight:800, color:'var(--navy)' }}>🔎 {req.reqNo} — Request Tracking</span>
            <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{req.dept} · {req.item} · {fmt(req.estValue)}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--muted)', lineHeight:1 }}>✕</button>
        </div>
 
        <div style={{ padding:18, overflowY:'auto', flex:1 }}>
 
          {/* Query note */}
          {req.queryNote && (
            <div style={{ background:'#FFF9E6', border:'1px solid #F4D03F', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:11 }}>
              <strong>🟠 Management Query:</strong> {req.queryNote}
            </div>
          )}
 
          {/* Status & priority */}
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <StatusBadge s={req.status} />
            <span className={`${tableStyles.badge} ${PRIORITY_CLASS[req.priority] ?? tableStyles.grey}`}>{req.priority} Priority</span>
            <span style={{ fontSize:10, color:'var(--muted)', marginLeft:'auto' }}>{req.date}</span>
          </div>
 
          {/* Stepper */}
          <div style={{ marginBottom:16, padding:'12px 14px', background:'#f8fafc', borderRadius:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)', marginBottom:10, textTransform:'uppercase', letterSpacing:.4 }}>Workflow Progress</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 6px', alignItems:'center' }}>
              {REQ_STAGES.map((s, i) => {
                const done = ci >= i && req.status !== 'Rejected';
                const cur  = i === ci;
                const isRej = req.status === 'Rejected' && s === 'Rejected';
                return (
                  <div key={s} style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <div style={{
                      width:18, height:18, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:9, fontWeight:700, flexShrink:0,
                      background: isRej ? 'var(--red)' : done ? 'var(--teal)' : '#e0e4ea',
                      color: (done || isRej) ? '#fff' : '#999',
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize:9, fontWeight:cur ? 700 : 400, color:cur ? 'var(--navy)' : done ? 'var(--text)' : 'var(--muted)', whiteSpace:'nowrap' }}>
                      {s}
                    </span>
                    {i < REQ_STAGES.length - 1 && (
                      <span style={{ width:12, height:2, background: done && i < ci ? 'var(--teal)' : '#e0e4ea', display:'inline-block', flexShrink:0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
 
          {/* Responsible party */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, marginBottom:16 }}>
            {[
              { stage:'Submitted',          responsible:'Requesting Dept'  },
              { stage:'Approved',           responsible:'Management'       },
              { stage:'Pending Procurement',responsible:'Procurement Team' },
              { stage:'PO Created',         responsible:'Procurement Team' },
              { stage:'Vendor Confirmed',   responsible:'Vendor'           },
              { stage:'Goods Received',     responsible:'Store Unit'       },
              { stage:'Completed',          responsible:'Finance / AP'     },
            ].map(({ stage, responsible }) => {
              const isCurrent = req.stage === stage;
              return (
                <div key={stage} style={{ background: isCurrent ? '#EBF5FB' : '#f8fafc', borderRadius:8, padding:'8px 10px', border: isCurrent ? '1.5px solid var(--teal)' : '1px solid var(--border)' }}>
                  <div style={{ fontSize:9, fontWeight:700, color: isCurrent ? 'var(--teal)' : 'var(--muted)', textTransform:'uppercase', letterSpacing:.3 }}>{isCurrent ? '● Current' : stage}</div>
                  <div style={{ fontSize:10, fontWeight:600, color:'var(--navy)', marginTop:2 }}>{responsible}</div>
                </div>
              );
            })}
          </div>
 
          {/* Line items */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)', marginBottom:8 }}>Items Requested</div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr>
                  {['Item','Category','Qty','Unit Cost','Total'].map(h => (
                    <th key={h} style={{ background:'#f0f4f8', padding:'6px 10px', textAlign: h==='Total'||h==='Unit Cost'||h==='Qty' ? 'right' : 'left', fontSize:10, fontWeight:700, color:'var(--navy)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {req.lines.map((l, i) => (
                  <tr key={i}>
                    <td style={{ padding:'6px 10px', fontWeight:600 }}>{l.item}</td>
                    <td style={{ padding:'6px 10px' }}>
                      <span className={`${tableStyles.badge} ${tableStyles.blue}`}>{l.category}</span>
                    </td>
                    <td style={{ padding:'6px 10px', textAlign:'right' }}>{l.qty.toLocaleString()}</td>
                    <td style={{ padding:'6px 10px', textAlign:'right' }}>{fmt(l.unitCost)}</td>
                    <td style={{ padding:'6px 10px', textAlign:'right', fontWeight:700 }}>{fmt(l.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ padding:'8px 10px', fontWeight:700, background:'#f0f4f8', borderTop:'2px solid var(--border)' }}>ESTIMATED TOTAL</td>
                  <td style={{ padding:'8px 10px', fontWeight:800, color:'var(--navy)', background:'#f0f4f8', borderTop:'2px solid var(--border)', textAlign:'right' }}>{fmt(req.estValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
 
          {/* Audit history */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)', marginBottom:10 }}>Audit History</div>
            <div style={{ padding:'4px 0' }}>
              {[...req.history].reverse().map((h, i, arr) => (
                <div key={i} style={{ display:'flex', gap:10, paddingBottom:10, position:'relative' }}>
                  {i < arr.length - 1 && (
                    <div style={{ position:'absolute', left:5, top:14, bottom:0, width:2, background:'#e0e4ea' }} />
                  )}
                  <div style={{ width:12, height:12, borderRadius:'50%', background:'var(--teal)', flexShrink:0, marginTop:3, zIndex:1 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:11, color:'var(--navy)' }}>{h.stage}</div>
                    <div style={{ fontSize:9, color:'#aaa', marginTop:1 }}>
                      {new Date(h.ts).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })} · {h.by}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
 
        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} className={styles.btnGhost}>Close</button>
        </div>
      </div>
    </div>
  );
}
 
/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function RequisitionPage() {
  const [activeTab,  setActiveTab]  = useState('new');
  const [reqs,       setReqs]       = useState(SEED_REQS);
  const [showNew,    setShowNew]    = useState(false);
  const [trackReq,   setTrackReq]   = useState(null);
  const [search,     setSearch]     = useState('');
  const [stageFilter,setStageFilter]= useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
 
  /* ── KPIs ─────────────────────────────────────────────────────────── */
  const total     = reqs.length;
  const submitted = reqs.filter(r => r.status === 'Submitted').length;
  const pending   = reqs.filter(r => r.status === 'Pending Procurement' || r.status === 'Approved').length;
  const queried   = reqs.filter(r => r.status === 'Queried').length;
  const completed = reqs.filter(r => r.status === 'Completed').length;
  const rejected  = reqs.filter(r => r.status === 'Rejected').length;
  const totalVal  = reqs.reduce((s, r) => s + r.estValue, 0);
  const pendingVal= reqs.filter(r => !['Completed','Rejected'].includes(r.status)).reduce((s,r) => s + r.estValue, 0);
 
  /* ── submit new req ───────────────────────────────────────────────── */
  function handleNewReq(form) {
    const reqNo = `DR-${String(220100 + reqs.length + 1)}`;
    const newReq = {
      reqNo,
      date:      new Date().toISOString().slice(0, 10),
      dept:      form.dept,
      requester: form.dept.toLowerCase().replace(/\s/g,''),
      priority:  form.priority,
      notes:     form.notes,
      status:    'Submitted',
      stage:     'Submitted',
      estValue:  form.estValue,
      item:      form.item,
      queryNote: '',
      lines:     form.lines,
      history: [
        { stage:`Submitted by ${form.dept}`, ts:new Date().toISOString(), by:form.dept }
      ],
    };
    setReqs(p => [newReq, ...p]);
  }
 
  /* ── filtered tracking list ───────────────────────────────────────── */
  const filteredReqs = useMemo(() => {
    const q = search.toLowerCase();
    return reqs.filter(r =>
      (!q || r.reqNo.toLowerCase().includes(q) || r.dept.toLowerCase().includes(q) || r.item.toLowerCase().includes(q)) &&
      (stageFilter === 'All' || r.status === stageFilter) &&
      (deptFilter  === 'All' || r.dept   === deptFilter)
    );
  }, [reqs, search, stageFilter, deptFilter]);
 
  /* ── analytics ────────────────────────────────────────────────────── */
  const byDept = useMemo(() => {
    const m = {};
    reqs.forEach(r => { m[r.dept] = (m[r.dept]||0) + r.estValue; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [reqs]);
 
  const byStatus = useMemo(() => {
    const order = ['Submitted','Approved','Queried','Rejected','Pending Procurement','PO Created','Vendor Confirmed','Goods Received','Completed'];
    const m = {};
    reqs.forEach(r => { m[r.status] = (m[r.status]||0) + 1; });
    return order.filter(s => m[s]).map(s => [s, m[s]]);
  }, [reqs]);
 
  const byPriority = useMemo(() => {
    const m = { Urgent:0, High:0, Normal:0, Low:0 };
    reqs.forEach(r => { m[r.priority] = (m[r.priority]||0) + 1; });
    return Object.entries(m);
  }, [reqs]);
 
  const allStatuses = ['All', ...new Set(reqs.map(r => r.status))];
  const allDepts    = ['All', ...new Set(reqs.map(r => r.dept))];
 
  const TABS = [
    { id:'new',      label:'📝 New Requisition'  },
    { id:'track',    label:'🔎 Request Tracking'  },
    { id:'analytics',label:'📊 Analytics'         },
  ];
 
  /* ── Export CSV ─────────────────────────────────────────────────────*/
  function exportCSV() {
    const rows = ['Req No,Date,Dept,Item,Priority,Status,Stage,Est Value'];
    reqs.forEach(r => rows.push(`${r.reqNo},${r.date},"${r.dept}","${r.item}",${r.priority},${r.status},${r.stage},${r.estValue}`));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type:'text/csv' }));
    a.download = 'requisitions.csv'; a.click();
  }
 
  return (
    <DashboardLayout>
      {showNew  && <NewRequisitionModal onClose={()=>setShowNew(false)} onSubmit={handleNewReq} />}
      {trackReq && <TrackingPanel req={trackReq} onClose={()=>setTrackReq(null)} />}
 
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>📝 Departmental Requisitions</h2>
          <p className={styles.pageMeta}>
            Raise drug, consumable &amp; reagent requests · Full lifecycle tracking · Routes to P2P workflow on approval
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className={styles.btnSecondary} onClick={()=>setShowNew(true)}>＋ New Requisition</button>
          <button className={styles.btnGhost} onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      </div>
 
      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Requests"        value={total.toString()}           delta="All time"                      deltaType="neutral"                    color="blue"   />
        <KPICard label="Awaiting Approval"     value={submitted.toString()}        delta="Pending Management Gate 1"    deltaType={submitted>0?'warn':'up'}    badge={submitted>0?'Action':'Clear'} badgeType={submitted>0?'warn':'good'} color={submitted>0?'amber':'green'} />
        <KPICard label="Queried"               value={queried.toString()}          delta="Response needed from dept"    deltaType={queried>0?'warn':'up'}       badge={queried>0?'Respond':'Clear'}  badgeType={queried>0?'warn':'good'}  color={queried>0?'amber':'green'} />
        <KPICard label="With Procurement"      value={pending.toString()}          delta="Approved / Pending PO"        deltaType="neutral"                    color="blue"   />
        <KPICard label="Completed"             value={completed.toString()}        delta="Fully processed"              deltaType="up"                         color="green"  />
        <KPICard label="Rejected"              value={rejected.toString()}         delta="Not approved"                 deltaType={rejected>0?'down':'neutral'} color={rejected>0?'red':'green'} />
        <KPICard label="Total Req Value"       value={fmt(totalVal)}               delta="All requests combined"        deltaType="neutral"                    color="purple" />
        <KPICard label="Pending Value"         value={fmt(pendingVal)}             delta="Not yet completed"            deltaType="warn"                       color="amber"  />
      </div>
 
      {/* ── Tab Strip ─────────────────────────────────────────────── */}
      <div className={styles.tabStrip}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`${styles.tabBtn} ${activeTab===t.id ? styles.active : ''}`}>
            {t.label}
          </button>
        ))}
      </div>
 
      {/* ════ TAB: New Requisition ═══════════════════════════════════ */}
      {activeTab === 'new' && (
        <div>
          {/* Quick-start card */}
          <div style={{ background:'linear-gradient(135deg,var(--navy) 0%,#0d6e5a 100%)', borderRadius:12, padding:'24px 28px', marginBottom:20, color:'#fff' }}>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:6 }}>📝 Raise a New Departmental Requisition</div>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.75)', marginBottom:16, lineHeight:1.6, maxWidth:560 }}>
              Submit requests for drugs, consumables, reagents or any supplies. Your request will be routed to Management for Gate 1 approval, then to Procurement for vendor sourcing and Gate 2 approval before a Purchase Order is issued.
            </p>
            <button onClick={()=>setShowNew(true)}
              style={{ padding:'10px 24px', background:'#fff', color:'var(--navy)', border:'none', borderRadius:8, fontWeight:800, fontSize:12, cursor:'pointer' }}>
              ＋ Start New Requisition
            </button>
          </div>
 
          {/* Workflow explainer */}
          <div className={styles.card} style={{ marginBottom:16 }}>
            <div className={styles.cardTitle}>Requisition Workflow — How it Works</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
              {[
                { step:'1', icon:'📝', label:'You Submit', desc:'Raise request with line items, priority & justification', color:'#1B4F72' },
                { step:'2', icon:'✅', label:'Gate 1: Mgmt', desc:'Management reviews and approves or queries your request', color:'#CA6F1E' },
                { step:'3', icon:'🔍', label:'Procurement', desc:'Procurement sources vendors, collects quotations', color:'#6C3483' },
                { step:'4', icon:'🏆', label:'Gate 2: Mgmt', desc:'Management approves the recommended vendor', color:'#CA6F1E' },
                { step:'5', icon:'📄', label:'PO Issued', desc:'Purchase Order sent to the approved vendor', color:'#1B4F72' },
                { step:'6', icon:'📥', label:'Delivery', desc:'Vendor delivers — Store confirms receipt & GRN', color:'#117A65' },
                { step:'7', icon:'💳', label:'Payment', desc:'Finance raises payment after all 4 gate conditions met', color:'#C0392B' },
              ].map(s => (
                <div key={s.step} style={{ background:'#f8fafc', borderRadius:8, padding:'12px 14px', borderTop:`3px solid ${s.color}` }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:s.color, marginBottom:3 }}>Step {s.step}: {s.label}</div>
                  <div style={{ fontSize:10, color:'var(--muted)', lineHeight:1.5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
 
          {/* Recent requests by this session */}
          {reqs.filter(r => r.status === 'Submitted').length > 0 && (
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Recently Submitted — Pending Gate 1 Approval</div>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>Req No</th><th>Date</th><th>Department</th><th>Item(s)</th>
                    <th>Priority</th>
                    <th className={tableStyles.right}>Est. Value</th>
                    <th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reqs.filter(r => r.status === 'Submitted').map(r => (
                    <tr key={r.reqNo}>
                      <td style={{ fontFamily:'monospace', fontSize:10, fontWeight:700 }}>{r.reqNo}</td>
                      <td>{r.date}</td>
                      <td style={{ fontWeight:600 }}>{r.dept}</td>
                      <td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.item}</td>
                      <td><span className={`${tableStyles.badge} ${PRIORITY_CLASS[r.priority]??tableStyles.grey}`}>{r.priority}</span></td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(r.estValue)}</td>
                      <td><StatusBadge s={r.status} /></td>
                      <td>
                        <button onClick={()=>{ setTrackReq(r); }}
                          style={{ padding:'3px 9px', background:'var(--navy)', color:'#fff', border:'none', borderRadius:5, cursor:'pointer', fontSize:10 }}>
                          Track →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
 
          {/* Item master reference */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Item Master Reference — Available Items for Requisition</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Code</th><th>Item Name</th><th>Category</th>
                  <th>Unit</th>
                  <th className={tableStyles.right}>Est. Unit Cost</th>
                </tr>
              </thead>
              <tbody>
                {ITEM_MASTER.map(m => (
                  <tr key={m.code}>
                    <td style={{ fontFamily:'monospace', fontSize:10, fontWeight:700 }}>{m.code}</td>
                    <td style={{ fontWeight:600 }}>{m.name}</td>
                    <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{m.category}</span></td>
                    <td style={{ fontSize:10, color:'var(--muted)' }}>{m.unit}</td>
                    <td className={tableStyles.right}>{fmt(m.estCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
 
      {/* ════ TAB: Request Tracking ══════════════════════════════════ */}
      {activeTab === 'track' && (
        <>
          <div className={styles.toolbar}>
            <input className={styles.toolbarSearch}
              placeholder="🔍 Search req no / dept / item…"
              value={search} onChange={e=>setSearch(e.target.value)} />
            <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
              value={stageFilter} onChange={e=>setStageFilter(e.target.value)}>
              {allStatuses.map(s=><option key={s}>{s}</option>)}
            </select>
            <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
              value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}>
              {allDepts.map(d=><option key={d}>{d}</option>)}
            </select>
            <span className={styles.spacer}/>
            <span style={{ fontSize:11, color:'var(--muted)' }}>{filteredReqs.length} requests</span>
          </div>
 
          {/* Lifecycle cards */}
          {filteredReqs.map(r => {
            const ci = REQ_STAGES.indexOf(r.stage);
            return (
              <div key={r.reqNo} style={{ background:'#fff', borderRadius:10, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,.06)', marginBottom:12 }}>
                {/* top row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:'monospace', fontWeight:700, fontSize:12, color:'var(--navy)', marginBottom:2 }}>{r.reqNo}</div>
                    <div style={{ fontSize:11 }}>
                      <span style={{ fontWeight:600 }}>{r.dept}</span>
                      <span style={{ color:'var(--muted)', margin:'0 6px' }}>·</span>
                      <span>{r.item}</span>
                      <span style={{ color:'var(--muted)', margin:'0 6px' }}>·</span>
                      <span style={{ fontWeight:600 }}>{fmt(r.estValue)}</span>
                    </div>
                    {r.notes && (
                      <div style={{ fontSize:10, color:'var(--muted)', marginTop:3, fontStyle:'italic' }}>"{r.notes}"</div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <span className={`${tableStyles.badge} ${PRIORITY_CLASS[r.priority]??tableStyles.grey}`}>{r.priority}</span>
                    <StatusBadge s={r.status} />
                    <button onClick={()=>setTrackReq(r)}
                      style={{ padding:'3px 10px', background:'var(--navy)', color:'#fff', border:'none', borderRadius:5, cursor:'pointer', fontSize:10, fontWeight:600 }}>
                      View Detail →
                    </button>
                  </div>
                </div>
 
                {/* query alert */}
                {r.queryNote && (
                  <div style={{ background:'#FFF9E6', border:'1px solid #F4D03F', borderRadius:6, padding:'6px 10px', marginBottom:8, fontSize:10 }}>
                    <strong>🟠 Query:</strong> {r.queryNote}
                  </div>
                )}
 
                {/* stepper */}
                <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'6px 3px', overflowX:'auto' }}>
                  {REQ_STAGES.map((s, i) => {
                    const done = ci >= i && r.status !== 'Rejected';
                    const cur  = i === ci;
                    return (
                      <div key={s} style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
                        <div style={{
                          width:16, height:16, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:8, fontWeight:700, flexShrink:0,
                          background: done ? 'var(--teal)' : '#e0e4ea',
                          color: done ? '#fff' : '#999',
                        }}>
                          {done ? '✓' : i + 1}
                        </div>
                        <span style={{ fontSize:9, color:cur?'var(--navy)':done?'var(--text)':'var(--muted)', fontWeight:cur?700:400, whiteSpace:'nowrap' }}>
                          {s}
                        </span>
                        {i < REQ_STAGES.length - 1 && (
                          <span style={{ width:10, height:2, background:done&&i<ci?'var(--teal)':'#e0e4ea', display:'inline-block', flexShrink:0 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
 
                {/* responsible */}
                <div style={{ marginTop:8, fontSize:10, color:'var(--muted)' }}>
                  <span style={{ fontWeight:700, color:'var(--navy)' }}>Responsible now: </span>
                  {{ Submitted:'Management', Approved:'Procurement', Queried:`${r.dept} (respond to query)`, 'Pending Procurement':'Procurement', 'PO Created':'Vendor', 'Vendor Confirmed':'Store Unit', 'Goods Received':'Finance / AP', Completed:'—', Rejected:'—' }[r.status] ?? '—'}
                  <span style={{ marginLeft:12, color:'var(--muted)' }}>Submitted: {r.date}</span>
                </div>
              </div>
            );
          })}
 
          {filteredReqs.length === 0 && (
            <div style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
              <div style={{ fontWeight:600, fontSize:12 }}>No requisitions match your filters.</div>
              <div style={{ fontSize:11, marginTop:4 }}>Try adjusting the status or department filter, or submit a new requisition.</div>
            </div>
          )}
        </>
      )}
 
      {/* ════ TAB: Analytics ═══════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <>
          {/* Row 1 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Request Value by Department</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{
                    labels: byDept.map(e=>e[0]),
                    datasets:[{ data:byDept.map(e=>+(e[1]/1e6).toFixed(2)), backgroundColor:COLORS, borderRadius:4 }],
                  }}
                  options={{ ...BASE, indexAxis:'y', scales:{ x:{ grid:{color:GRID}, ticks:{ font:FONT, callback:v=>'₦'+v+'M' } }, y:X_NONE } }}
                />
              </div>
            </div>
 
            <div className={styles.card}>
              <div className={styles.cardTitle}>Requests by Status</div>
              <div style={{ height:220 }}>
                <Doughnut
                  data={{
                    labels: byStatus.map(e=>e[0]),
                    datasets:[{ data:byStatus.map(e=>e[1]), backgroundColor:COLORS, borderWidth:2, borderColor:'#fff' }],
                  }}
                  options={{ responsive:true, maintainAspectRatio:false, cutout:'55%', plugins:{ legend:LEG_B } }}
                />
              </div>
            </div>
          </div>
 
          {/* Row 2 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Requests by Priority</div>
              <div style={{ height:180 }}>
                <Bar
                  data={{
                    labels: byPriority.map(e=>e[0]),
                    datasets:[{ data:byPriority.map(e=>e[1]), backgroundColor:['#C0392B','#CA6F1E','#1B4F72','#117A65'], borderRadius:4 }],
                  }}
                  options={{ ...BASE, scales:{ x:X_NONE, y:{ ...Y_BASE, ticks:{ font:FONT, stepSize:1 } } } }}
                />
              </div>
            </div>
 
            {/* Stage funnel */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Stage Funnel</div>
              <div style={{ padding:'4px 0' }}>
                {byStatus.map(([s, count], i) => {
                  const pct = total > 0 ? (count / total * 100) : 0;
                  return (
                    <div key={s} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                        <span style={{ fontWeight:600 }}>{s}</span>
                        <span style={{ fontWeight:700, color:'var(--navy)' }}>{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div style={{ background:'#e8ecf0', borderRadius:4, height:7, overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:4, background:COLORS[i % COLORS.length], width:`${pct}%`, transition:'width .5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
 
          {/* Full table */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>All Requisitions — Full Summary</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Req No</th><th>Date</th><th>Department</th><th>Item(s)</th>
                  <th>Priority</th><th>Status</th>
                  <th className={tableStyles.right}>Est. Value</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reqs.map(r => (
                  <tr key={r.reqNo} onClick={()=>{ setTrackReq(r); }} style={{ cursor:'pointer' }}>
                    <td style={{ fontFamily:'monospace', fontSize:10, fontWeight:700 }}>{r.reqNo}</td>
                    <td>{r.date}</td>
                    <td style={{ fontWeight:600 }}>{r.dept}</td>
                    <td style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.item}</td>
                    <td><span className={`${tableStyles.badge} ${PRIORITY_CLASS[r.priority]??tableStyles.grey}`}>{r.priority}</span></td>
                    <td><StatusBadge s={r.status} /></td>
                    <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(r.estValue)}</td>
                    <td>
                      <button onClick={e=>{ e.stopPropagation(); setTrackReq(r); }}
                        style={{ padding:'3px 9px', background:'var(--navy)', color:'#fff', border:'none', borderRadius:5, cursor:'pointer', fontSize:10 }}>
                        Track →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6}>TOTAL ({reqs.length} requests)</td>
                  <td className={tableStyles.right}>{fmt(totalVal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}