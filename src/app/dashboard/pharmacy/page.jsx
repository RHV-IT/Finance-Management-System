'use client';

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RevenuePieChart } from '../../components/Charts';
import { fmt, MONTHS, COLORS } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';

import { useConfig, useSheetData } from '../lib/useConfig';
import { DynamicViz, DynamicVizLine } from '../../components/DynamicViz';

const tip = { background:'#fff', border:'1px solid #E0E4EA', borderRadius:8, fontSize:11 };

const DISPENSING = [
  { ref:'DSP-001', date:'2025-11-25', drug:'Amoxicillin 500mg',     qty:30,  unit:'Tablet', patient:'Ward 2 / Adeyemi J.',  prescriber:'Dr Okonkwo',   dtype:'Inpatient',  uc:80,   value:2400   },
  { ref:'DSP-002', date:'2025-11-25', drug:'Metformin 500mg',        qty:60,  unit:'Tablet', patient:'OPD / Fashola M.',      prescriber:'Dr Aliyu',     dtype:'Outpatient', uc:120,  value:7200   },
  { ref:'DSP-003', date:'2025-11-24', drug:'Amlodipine 5mg',         qty:30,  unit:'Tablet', patient:'Ward 1 / Bello T.',     prescriber:'Dr Balogun',   dtype:'Inpatient',  uc:350,  value:10500  },
  { ref:'DSP-004', date:'2025-11-24', drug:'IV Normal Saline 500ml', qty:4,   unit:'Bottle', patient:'ICU / Eze K.',          prescriber:'Dr Okonkwo',   dtype:'ICU',        uc:1500, value:6000   },
  { ref:'DSP-005', date:'2025-11-23', drug:'Hydrochlorothiazide',    qty:28,  unit:'Tablet', patient:'OPD / Nwankwo E.',      prescriber:'Dr Aliyu',     dtype:'Outpatient', uc:120,  value:3360   },
  { ref:'DSP-006', date:'2025-11-23', drug:'Surgical Gloves M',      qty:10,  unit:'Box',    patient:'Theatre',               prescriber:'Dr Balogun',   dtype:'Theatre',    uc:850,  value:8500   },
  { ref:'DSP-007', date:'2025-11-22', drug:'Blood Glucose Strips',   qty:50,  unit:'Strip',  patient:'Lab / Okafor A.',       prescriber:'Dr Nwachukwu', dtype:'Lab',        uc:2800, value:140000 },
  { ref:'DSP-008', date:'2025-11-21', drug:'Amoxicillin 500mg',      qty:20,  unit:'Tablet', patient:'OPD / Ibrahim S.',      prescriber:'Dr Okonkwo',   dtype:'Outpatient', uc:80,   value:1600   },
  { ref:'DSP-009', date:'2025-11-20', drug:'Amlodipine 5mg',         qty:28,  unit:'Tablet', patient:'Ward 3 / Chukwu P.',    prescriber:'Dr Balogun',   dtype:'Inpatient',  uc:350,  value:9800   },
];

const DRUG_STOCK = [
  { item:'Amoxicillin 500mg',     cat:'Drugs',      qty:45,   unit:'Tablet', cost:80,   reorder:500, expiry:'2026-06-01' },
  { item:'Metformin 500mg',       cat:'Drugs',      qty:6180, unit:'Tablet', cost:120,  reorder:500, expiry:'2026-12-01' },
  { item:'Amlodipine 5mg',        cat:'Drugs',      qty:4790, unit:'Tablet', cost:350,  reorder:300, expiry:'2026-11-01' },
  { item:'IV Normal Saline 500ml',cat:'Fluids',     qty:1780, unit:'Bottle', cost:1500, reorder:200, expiry:'2026-06-01' },
  { item:'Hydrochlorothiazide',   cat:'Drugs',      qty:3780, unit:'Tablet', cost:120,  reorder:300, expiry:'2026-10-01' },
  { item:'Blood Glucose Strips',  cat:'Lab',        qty:1150, unit:'Strip',  cost:2800, reorder:100, expiry:'2025-12-15' },
  { item:'Cannula 18G',           cat:'Consumables',qty:2380, unit:'Pcs',   cost:800,  reorder:50,  expiry:'2026-08-01' },
  { item:'CT Contrast Media',     cat:'X-Ray',      qty:12,   unit:'Vial',   cost:12000,reorder:15,  expiry:'2026-03-01' },
];

const MY_REQS = [
  { date:'2025-11-20', title:'Emergency Antibiotic Restock',  amount:450000, priority:'High',   status:'APPROVED'  },
  { date:'2025-11-15', title:'IV Fluid Monthly Order',        amount:900000, priority:'Normal', status:'PENDING'   },
  { date:'2025-11-08', title:'Diabetic Medication — Nov',     amount:320000, priority:'Normal', status:'COMPLETED' },
  { date:'2025-10-30', title:'Lab Reagents Restock',          amount:280000, priority:'High',   status:'COMPLETED' },
];

const MONTHLY_DISP = [2.1,3.4,2.8,4.1,5.2,4.8,5.6,7.3,6.9,6.2,6.8,0].map((v,i) => ({ month: MONTHS[i], value:v }));

const catMap = {};
DRUG_STOCK.forEach(d => { catMap[d.cat] = (catMap[d.cat]||0) + d.qty * d.cost; });
const catPie = Object.entries(catMap).map(([name,val]) => ({ name, value:+(val/1e6).toFixed(2) }));

const today   = DISPENSING.filter(d => d.date === '2025-11-25').length;
const tVal    = DISPENSING.reduce((s,d) => s+d.value, 0);
const low     = DRUG_STOCK.filter(d => d.qty <= d.reorder);
const expiring= DRUG_STOCK.filter(d => { if(!d.expiry) return false; const days=(new Date(d.expiry)-new Date())/864e5; return days>0&&days<90; });

const TABS = [
  { key:'disp',  label:'💊 Dispensing / Usage' },
  { key:'stock', label:'📊 Drug Stock'         },
  { key:'req',   label:'📝 My Requests'        },
];

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:'8px 18px', cursor:'pointer', fontSize:11, fontWeight:600, whiteSpace:'nowrap',
      background:'transparent', border:'none', fontFamily:'inherit',
      borderBottom:`2px solid ${active ? 'var(--teal)' : 'transparent'}`,
      color: active ? 'var(--teal)' : 'var(--muted)', marginBottom:-2,
    }}>{children}</button>
  );
}

export default function PharmacyPage() {
  const { getByModule, loading: configLoading, error: configError } = useConfig();

  const dispensingConn = getByModule('drug_dispensing');

  const { rows, loading, error, refetch } = useSheetData(dispensingConn);

  const [tab, setTab] = useState('disp');

  if (configLoading) return (
    <DashboardLayout>
      <div style={{ textAlign:'center', padding:64 }}>
        <div style={{ fontSize:28, marginBottom:10 }}>⏳</div>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--navy)' }}>Loading sheet configuration from Google Drive…</div>
      </div>
    </DashboardLayout>
  );

  if (configError) return (
    <DashboardLayout>
      <div style={{ padding:24 }}>
        <SheetError error={`Failed to load config: ${configError}`} onRefetch={reload} />
      </div>
    </DashboardLayout>
  );


  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>💊 Pharmacy Management</h2>
          <p className={styles.pageMeta}>Drug dispensing · Stock monitoring · Procurement requests</p>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <KPICard label="Dispensed Today"    value={today}      delta="Prescriptions attended"   deltaType="up"   color="blue"   />
        <KPICard label="Usage Value (YTD)"  value={fmt(tVal)}  delta="Total dispensed value"    deltaType="up"   color="green"  />
        <KPICard label="Drug SKUs"          value={DRUG_STOCK.length} delta="In register"        deltaType="up"   color="purple" />
        <KPICard label="Low Drug Stock"     value={low.length} delta="Below reorder level"
          deltaType={low.length>0?'down':'up'} badge={low.length>0?'⚠ Reorder':'✓ OK'}
          badgeType={low.length>0?'bad':'good'} color={low.length>0?'red':'green'} />
        <KPICard label="Expiring ≤ 90 Days" value={expiring.length} delta="Needs review"
          deltaType={expiring.length>0?'warn':'up'} color={expiring.length>0?'amber':'green'} />
        <KPICard label="Pending Requests"   value={MY_REQS.filter(r=>r.status==='PENDING').length}
          delta="Awaiting approval" deltaType="warn" color="amber" />
      </div>

      <div style={{ display:'flex', borderBottom:'2px solid var(--border)', marginBottom:16, overflowX:'auto' }}>
        {TABS.map(t => <TabBtn key={t.key} active={tab===t.key} onClick={()=>setTab(t.key)}>{t.label}</TabBtn>)}
      </div>

      {tab === 'disp' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Monthly Dispensing Value Trend (₦M)</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={MONTHLY_DISP} margin={{ top:4, right:8, left:0, bottom:0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
                  <XAxis dataKey="month" tick={{ fontSize:9, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v=>`₦${v}M`} width={40} />
                  <Tooltip contentStyle={tip} formatter={v=>`₦${v}M`} />
                  <Bar dataKey="value" fill="#117A65" radius={[3,3,0,0]}>
                    {MONTHLY_DISP.map((_,i) => <Cell key={i} fill={i===10?'#1B4F72':'#117A65aa'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Dispensing by Type</div>
              {['Inpatient','Outpatient','ICU','Theatre','Lab'].map((type,i) => {
                const count = DISPENSING.filter(d=>d.dtype===type).length;
                const pct   = DISPENSING.length > 0 ? (count/DISPENSING.length*100).toFixed(0) : 0;
                return (
                  <div key={type} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:2 }}>
                      <span style={{ fontWeight:600 }}>{type}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height:6, background:'#e8ecf0', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:3, background:COLORS[i], width:`${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Drug Dispensing Records</div>
            <table className={tableStyles.table}>
              <thead><tr><th>Ref</th><th>Date</th><th>Drug</th><th>Qty</th><th>Unit</th><th>Patient / Ward</th><th>Prescriber</th><th>Type</th><th>Value</th></tr></thead>
              <tbody>
                {DISPENSING.map(d => (
                  <tr key={d.ref}>
                    <td style={{ fontWeight:700, color:'var(--navy)' }}>{d.ref}</td>
                    <td>{d.date}</td>
                    <td style={{ fontWeight:600 }}>{d.drug}</td>
                    <td>{d.qty}</td>
                    <td style={{ color:'var(--muted)', fontSize:10 }}>{d.unit}</td>
                    <td style={{ fontSize:11 }}>{d.patient}</td>
                    <td style={{ fontSize:10, color:'var(--muted)' }}>{d.prescriber}</td>
                    <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{d.dtype}</span></td>
                    <td style={{ fontWeight:700 }}>{fmt(d.value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={8} style={{ fontWeight:700 }}>TOTAL DISPENSING VALUE</td><td style={{ fontWeight:700 }}>{fmt(tVal)}</td></tr></tfoot>
            </table>
          </div>
        </>
      )}

      {tab === 'stock' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div className={tableStyles.tableBox} style={{ gridColumn:'1/-1', margin:0 }}>
            <div className={tableStyles.tableTitle}>Drug & Consumable Stock Levels</div>
            <table className={tableStyles.table}>
              <thead><tr><th>Drug / Item</th><th>Category</th><th>In Stock</th><th>Unit</th><th>Unit Cost</th><th>Reorder Lvl</th><th>Expiry</th><th>Status</th></tr></thead>
              <tbody>
                {DRUG_STOCK.map(d => {
                  const isLow  = d.qty <= d.reorder;
                  const now    = new Date();
                  const exp    = d.expiry ? new Date(d.expiry) : null;
                  const outd   = exp && exp < now;
                  const near   = exp && !outd && (exp - now)/864e5 < 90;
                  const sBadge = isLow ? tableStyles.red : tableStyles.green;
                  const sLabel = isLow ? '⚠ LOW' : '✓ OK';
                  return (
                    <tr key={d.item}>
                      <td style={{ fontWeight:600 }}>{d.item}</td>
                      <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{d.cat}</span></td>
                      <td style={{ fontWeight:700, color:isLow?'var(--red)':'var(--text)' }}>{d.qty.toLocaleString()}</td>
                      <td style={{ color:'var(--muted)', fontSize:10 }}>{d.unit}</td>
                      <td>{fmt(d.cost)}</td>
                      <td>{d.reorder}</td>
                      <td>{d.expiry ? <span className={`${tableStyles.badge} ${outd?tableStyles.red:near?tableStyles.amber:tableStyles.green}`}>{d.expiry}</span> : '—'}</td>
                      <td><span className={`${tableStyles.badge} ${sBadge}`}>{sLabel}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Stock Value by Category</div>
            <RevenuePieChart data={catPie} colors={COLORS} />
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Alerts</div>
            <div style={{ padding:'8px 0' }}>
              {low.length > 0 ? low.map(d => (
                <div key={d.item} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:11 }}>
                  <span style={{ fontWeight:600, color:'var(--red)' }}>⚠ {d.item}</span>
                  <span style={{ color:'var(--red)' }}>{d.qty} left (reorder at {d.reorder})</span>
                </div>
              )) : <div style={{ color:'var(--teal)', fontSize:11, padding:'8px 0' }}>✓ All drugs are above reorder levels</div>}
              {expiring.map(d => (
                <div key={d.item} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:11 }}>
                  <span style={{ fontWeight:600, color:'var(--amber)' }}>⏰ {d.item}</span>
                  <span style={{ color:'var(--amber)' }}>Expires {d.expiry}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'req' && (
        <>
          <div style={{ background:'#EBF5FB', borderRadius:8, padding:'12px 16px', marginBottom:14, fontSize:11 }}>
            💡 To raise a new procurement request, use <strong>New Requisition</strong> in the sidebar. Approved requests are routed automatically to Procurement via the P2P workflow.
          </div>
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>My Procurement Requests</div>
            <table className={tableStyles.table}>
              <thead><tr><th>Date</th><th>Title</th><th>Amount</th><th>Priority</th><th>Status</th></tr></thead>
              <tbody>
                {MY_REQS.map((r,i) => {
                  const sColor = r.status==='APPROVED'?tableStyles.green:r.status==='REJECTED'?tableStyles.red:r.status==='COMPLETED'?tableStyles.blue:tableStyles.amber;
                  const pColor = r.priority==='High'?tableStyles.red:tableStyles.amber;
                  return (
                    <tr key={i}>
                      <td>{r.date}</td>
                      <td style={{ fontWeight:600 }}>{r.title}</td>
                      <td style={{ fontWeight:700 }}>{fmt(r.amount)}</td>
                      <td><span className={`${tableStyles.badge} ${pColor}`}>{r.priority}</span></td>
                      <td><span className={`${tableStyles.badge} ${sColor}`}>{r.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}