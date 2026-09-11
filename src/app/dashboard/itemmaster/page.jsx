'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { RevenuePieChart } from '../../components/Charts';
import { fmt, COLORS } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
/* ─── Item catalogue ─────────────────────────────────────── */
const ITEMS = [
  /* Drugs */
  { code:'DRG-0001', name:'Amoxicillin 500mg Capsule',       cat:'Drug',        dept:'Pharmacy',       rev:true,  cost:80,    sell:200,   reorder:500,  min:200,  max:10000, vendor:'Pharmaplus Nigeria Ltd',  generic:'Amoxicillin',        strength:'500mg',   drugType:'Antibiotic',      drugGroup:'Antibiotics',          dispUnit:'Capsule', recvUnit:'Carton', packSize:1000, batchTracked:true,  incomeHead:'601020' },
  { code:'DRG-0002', name:'Metformin 500mg Tablet',          cat:'Drug',        dept:'Pharmacy',       rev:true,  cost:120,   sell:300,   reorder:500,  min:200,  max:10000, vendor:'Pharmaplus Nigeria Ltd',  generic:'Metformin',          strength:'500mg',   drugType:'Antidiabetic',    drugGroup:'Antidiabetics',        dispUnit:'Tablet',  recvUnit:'Carton', packSize:1000, batchTracked:true,  incomeHead:'601020' },
  { code:'DRG-0003', name:'Amlodipine 5mg Tablet',           cat:'Drug',        dept:'Pharmacy',       rev:true,  cost:350,   sell:700,   reorder:300,  min:100,  max:5000,  vendor:'Pharmaplus Nigeria Ltd',  generic:'Amlodipine',         strength:'5mg',     drugType:'Antihypertensive',drugGroup:'Antihypertensives',    dispUnit:'Tablet',  recvUnit:'Carton', packSize:500,  batchTracked:true,  incomeHead:'601020' },
  { code:'DRG-0004', name:'Hydrochlorothiazide 25mg Tablet', cat:'Drug',        dept:'Pharmacy',       rev:true,  cost:120,   sell:250,   reorder:300,  min:100,  max:5000,  vendor:'Pharmaplus Nigeria Ltd',  generic:'Hydrochlorothiazide', strength:'25mg',   drugType:'Diuretic',        drugGroup:'Diuretics',            dispUnit:'Tablet',  recvUnit:'Carton', packSize:1000, batchTracked:true,  incomeHead:'601020' },
  { code:'DRG-0005', name:'Artemether/Lumefantrine 80/480mg',cat:'Drug',        dept:'Pharmacy',       rev:true,  cost:850,   sell:2200,  reorder:200,  min:50,   max:3000,  vendor:'Pharmaplus Nigeria Ltd',  generic:'Artemether+Lumefantrine',strength:'80/480mg',drugType:'Antimalarial', drugGroup:'Antimalarials',     dispUnit:'Tablet',  recvUnit:'Box',    packSize:24,   batchTracked:true,  incomeHead:'601020' },
  { code:'DRG-0006', name:'Amoxicillin + Clavulanate 625mg', cat:'Drug',        dept:'Pharmacy',       rev:true,  cost:1200,  sell:2800,  reorder:100,  min:50,   max:2000,  vendor:'Pharmaplus Nigeria Ltd',  generic:'Co-Amoxiclav',       strength:'625mg',   drugType:'Antibiotic',      drugGroup:'Antibiotics',          dispUnit:'Tablet',  recvUnit:'Box',    packSize:14,   batchTracked:true,  incomeHead:'601020' },
 
  /* Fluids */
  { code:'FLD-0001', name:'IV Normal Saline 0.9% 500ml',     cat:'Fluid',       dept:'Pharmacy',       rev:true,  cost:1500,  sell:3200,  reorder:200,  min:50,   max:2000,  vendor:'HealthCare Distributors', generic:'Sodium Chloride',    strength:'0.9%',    drugType:'IV Fluid',        drugGroup:'IV Fluids / Electrolytes', dispUnit:'Infusion (500ml)', recvUnit:'Carton', packSize:24, batchTracked:true, incomeHead:'601010' },
  { code:'FLD-0002', name:'IV Dextrose 5% 500ml',            cat:'Fluid',       dept:'Pharmacy',       rev:true,  cost:1500,  sell:3200,  reorder:150,  min:50,   max:1500,  vendor:'HealthCare Distributors', generic:'Dextrose',           strength:'5%',      drugType:'IV Fluid',        drugGroup:'IV Fluids / Electrolytes', dispUnit:'Infusion (500ml)', recvUnit:'Carton', packSize:24, batchTracked:true, incomeHead:'601010' },
 
  /* Consumables */
  { code:'CON-0001', name:'Cannula 18G',                     cat:'Consumable',  dept:'CSSD',           rev:false, cost:800,   sell:0,     reorder:50,   min:20,   max:5000,  vendor:'MedEquip Supplies',       generic:'',                   strength:'',        drugType:'',                drugGroup:'',                     dispUnit:'Pcs', recvUnit:'Box', packSize:100, batchTracked:false, incomeHead:'701030' },
  { code:'CON-0002', name:'Surgical Gloves M',               cat:'Consumable',  dept:'Theatre',        rev:false, cost:850,   sell:0,     reorder:300,  min:100,  max:10000, vendor:'MedEquip Supplies',       generic:'',                   strength:'',        drugType:'',                drugGroup:'',                     dispUnit:'Pcs', recvUnit:'Carton', packSize:100, batchTracked:false, incomeHead:'701030' },
  { code:'CON-0003', name:'Exam Gloves S',                   cat:'Consumable',  dept:'Outpatient',     rev:false, cost:650,   sell:0,     reorder:300,  min:100,  max:10000, vendor:'MedEquip Supplies',       generic:'',                   strength:'',        drugType:'',                drugGroup:'',                     dispUnit:'Pcs', recvUnit:'Carton', packSize:100, batchTracked:false, incomeHead:'701030' },
  { code:'CON-0004', name:'Syringe 5ml',                     cat:'Consumable',  dept:'CSSD',           rev:false, cost:35,    sell:0,     reorder:3000, min:1000, max:30000, vendor:'MedEquip Supplies',       generic:'',                   strength:'',        drugType:'',                drugGroup:'',                     dispUnit:'Pcs', recvUnit:'Box', packSize:100, batchTracked:false, incomeHead:'701030' },
  { code:'CON-0005', name:'IV Giving Set',                   cat:'Consumable',  dept:'Pharmacy',       rev:false, cost:420,   sell:0,     reorder:200,  min:50,   max:3000,  vendor:'MedEquip Supplies',       generic:'',                   strength:'',        drugType:'',                drugGroup:'',                     dispUnit:'Pcs', recvUnit:'Box', packSize:50, batchTracked:false, incomeHead:'701030' },
 
  /* Reagents / Lab */
  { code:'LAB-0001', name:'FBC Reagent Kit',                 cat:'Reagent',     dept:'Laboratory',     rev:true,  cost:4500,  sell:8000,  reorder:30,   min:10,   max:200,   vendor:'DiagnosTech',             generic:'',                   strength:'',        drugType:'',                drugGroup:'',                     dispUnit:'Kit', recvUnit:'Box', packSize:1, batchTracked:true, incomeHead:'601020' },
  { code:'LAB-0002', name:'Blood Glucose Strips',            cat:'Reagent',     dept:'Laboratory',     rev:true,  cost:2800,  sell:5500,  reorder:100,  min:50,   max:1000,  vendor:'DiagnosTech',             generic:'',                   strength:'',        drugType:'',                drugGroup:'',                     dispUnit:'Strip', recvUnit:'Box', packSize:50, batchTracked:true, incomeHead:'601020' },
  { code:'LAB-0003', name:'Urinalysis Strips',               cat:'Reagent',     dept:'Laboratory',     rev:true,  cost:5500,  sell:9500,  reorder:80,   min:30,   max:500,   vendor:'DiagnosTech',             generic:'',                   strength:'',        drugType:'',                drugGroup:'',                     dispUnit:'Strip', recvUnit:'Box', packSize:100, batchTracked:true, incomeHead:'601020' },
 
  /* Radiology */
  { code:'RAD-0001', name:'CT Contrast Media (Iohexol)',     cat:'Consumable',  dept:'Radiology',      rev:true,  cost:12000, sell:22000, reorder:15,   min:5,    max:100,   vendor:'ImageCare Nigeria',       generic:'Iohexol',            strength:'350mg/ml',drugType:'',                drugGroup:'',                     dispUnit:'Vial', recvUnit:'Box', packSize:10, batchTracked:true, incomeHead:'601020' },
  { code:'RAD-0002', name:'X-Ray Film 14×17"',               cat:'Consumable',  dept:'Radiology',      rev:false, cost:1800,  sell:0,     reorder:100,  min:50,   max:1000,  vendor:'ImageCare Nigeria',       generic:'',                   strength:'',        drugType:'',                drugGroup:'',                     dispUnit:'Sheet', recvUnit:'Box', packSize:100, batchTracked:false, incomeHead:'701040' },
 
  /* Ophthalmology */
  { code:'OPH-0001', name:'Intraocular Lens (Monofocal)',    cat:'Consumable',  dept:'Ophthalmology',  rev:true,  cost:18000, sell:35000, reorder:10,   min:5,    max:80,    vendor:'OptiVision',              generic:'',                   strength:'',        drugType:'',                drugGroup:'',                     dispUnit:'Unit', recvUnit:'Box', packSize:1, batchTracked:true, incomeHead:'601010' },
 
  /* Office */
  { code:'OFF-0001', name:'A4 Paper Ream 80gsm',             cat:'Consumable',  dept:'Administration', rev:false, cost:4500,  sell:0,     reorder:50,   min:20,   max:300,   vendor:'OfficeMart',              generic:'',                   strength:'',        drugType:'',                drugGroup:'',                     dispUnit:'Ream', recvUnit:'Carton', packSize:5, batchTracked:false, incomeHead:'701040' },
];
 
const FILTER_OPTIONS = [
  { val:'',          label:'All Items'          },
  { val:'rev',       label:'Revenue-Generating' },
  { val:'nonrev',    label:'Non-Revenue'        },
  { val:'Drug',      label:'Drugs Only'         },
  { val:'Fluid',     label:'Fluids'             },
  { val:'Consumable',label:'Consumables'        },
  { val:'Reagent',   label:'Reagents'           },
];
 
/* summary stats */
const totalItems = ITEMS.length;
const drugsCount = ITEMS.filter(i => i.cat === 'Drug' || i.cat === 'Fluid').length;
const revCount   = ITEMS.filter(i => i.rev).length;
const deptsCount = [...new Set(ITEMS.map(i => i.dept))].length;
 
/* pie by category */
const catMap = {};
ITEMS.forEach(i => { catMap[i.cat] = (catMap[i.cat]||0) + 1; });
const catPie = Object.entries(catMap).map(([name, value]) => ({ name, value }));
 
/* dept bar */
const deptMap = {};
ITEMS.forEach(i => { deptMap[i.dept] = (deptMap[i.dept]||0) + 1; });
const deptData = Object.entries(deptMap).map(([dept, count]) => ({ dept, count })).sort((a,b) => b.count - a.count);
 
export default function ItemMasterPage() {
  const [filterCat, setFilterCat] = useState('');
  const [search,    setSearch]    = useState('');
  const [showDrug,  setShowDrug]  = useState(false); // toggle extra pharma columns
 
  const filtered = useMemo(() => {
    return ITEMS.filter(item => {
      const matchSearch = !search || (item.code + item.name + item.dept + item.generic).toLowerCase().includes(search.toLowerCase());
      const matchCat =
        !filterCat             ? true :
        filterCat === 'rev'    ? item.rev :
        filterCat === 'nonrev' ? !item.rev :
        item.cat === filterCat;
      return matchSearch && matchCat;
    });
  }, [search, filterCat]);
 
  const hasDrugCols = filtered.some(i => i.cat === 'Drug' || i.cat === 'Fluid');
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🗂 Item Master</h2>
          <p className={styles.pageMeta}>Central catalogue of all drugs, consumables & reagents — with pharmaceutical fields, revenue classification & vendor data</p>
        </div>
      </div>
 
      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Items"         value={totalItems}  delta="All categories"       deltaType="up"   color="blue"   />
        <KPICard label="Drugs & Fluids"      value={drugsCount}  delta="Pharmaceutical items" deltaType="up"   color="green"  />
        <KPICard label="Revenue-Generating"  value={revCount}    delta="Billable to patients" deltaType="up"   color="purple" />
        <KPICard label="Departments Covered" value={deptsCount}  delta="Unique departments"   deltaType="up"   color="amber"  />
        <KPICard label="Consumables & Other" value={totalItems - drugsCount} delta="Non-pharma" deltaType="up"  color="blue"   />
        <KPICard label="Non-Revenue Items"   value={totalItems - revCount}   delta="Internal use only" deltaType="warn" color="red"    />
      </div>
 
      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Items by Category</div>
          <RevenuePieChart data={catPie} colors={COLORS} />
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Items by Department</div>
          <div style={{ padding:'8px 0' }}>
            {deptData.map((d, i) => {
              const pct = (d.count / totalItems * 100).toFixed(0);
              return (
                <div key={d.dept} style={{ marginBottom:9 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
                    <span style={{ fontWeight:600 }}>{d.dept}</span>
                    <span style={{ color:'var(--muted)' }}>{d.count} items ({pct}%)</span>
                  </div>
                  <div style={{ height:7, background:'#e8ecf0', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, background:COLORS[i % COLORS.length], width:`${pct}%`, transition:'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
 
      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:14 }}>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          style={{ padding:'6px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none', minWidth:170 }}
        >
          {FILTER_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search code / name / dept / generic…"
          style={{ padding:'6px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none', flex:1, minWidth:220 }}
        />
        {hasDrugCols && (
          <button
            onClick={() => setShowDrug(s => !s)}
            style={{ padding:'6px 12px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer',
              background: showDrug ? 'var(--teal)' : '#fff', color: showDrug ? '#fff' : 'var(--text)', borderColor: showDrug ? 'var(--teal)' : 'var(--border)' }}
          >
            💊 {showDrug ? 'Hide' : 'Show'} Pharma Fields
          </button>
        )}
        <button style={{ padding:'6px 12px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
          ⬇ Download Catalogue
        </button>
        <button style={{ padding:'6px 12px', background:'var(--navy)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
          ⬆ Bulk Import
        </button>
        <span style={{ fontSize:11, color:'var(--muted)', whiteSpace:'nowrap' }}>{filtered.length} of {totalItems} items</span>
      </div>
 
      {/* Table */}
      <div className={tableStyles.tableBox}>
        <div className={tableStyles.tableTitle}>Item Catalogue</div>
        <div style={{ overflowX:'auto' }}>
          <table className={tableStyles.table} style={{ minWidth: showDrug ? 1400 : 900 }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>Department</th>
                <th>Rev-Gen</th>
                <th>Cost (₦)</th>
                <th>Selling (₦)</th>
                <th>Reorder</th>
                <th>Min</th>
                <th>Max</th>
                <th>Pref. Vendor</th>
                {showDrug && <>
                  <th>Generic Name</th>
                  <th>Strength</th>
                  <th>Drug Type</th>
                  <th>Drug Group</th>
                  <th>Disp. Unit</th>
                  <th>Recv. Unit</th>
                  <th>Pack Size</th>
                  <th>Batch Track</th>
                  <th>Income Head</th>
                </>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={showDrug ? 21 : 11} style={{ textAlign:'center', padding:24, color:'var(--muted)' }}>No items match the current filter.</td></tr>
              )}
              {filtered.map(item => {
                const catBadge =
                  item.cat === 'Drug'       ? tableStyles.green  :
                  item.cat === 'Fluid'      ? tableStyles.blue   :
                  item.cat === 'Reagent'    ? tableStyles.purple :
                  tableStyles.amber;
 
                return (
                  <tr key={item.code}>
                    <td style={{ fontWeight:700, color:'var(--navy)', fontSize:10 }}>{item.code}</td>
                    <td style={{ fontWeight:600 }}>{item.name}</td>
                    <td><span className={`${tableStyles.badge} ${catBadge}`}>{item.cat}</span></td>
                    <td style={{ fontSize:11, color:'var(--muted)' }}>{item.dept}</td>
                    <td>
                      <span className={`${tableStyles.badge} ${item.rev ? tableStyles.green : tableStyles.red}`}>
                        {item.rev ? '✓ Yes' : 'No'}
                      </span>
                    </td>
                    <td style={{ fontWeight:600 }}>{fmt(item.cost)}</td>
                    <td>{item.sell ? fmt(item.sell) : '—'}</td>
                    <td style={{ color:'var(--muted)' }}>{item.reorder.toLocaleString()}</td>
                    <td style={{ color:'var(--muted)' }}>{item.min.toLocaleString()}</td>
                    <td style={{ color:'var(--muted)' }}>{item.max.toLocaleString()}</td>
                    <td style={{ fontSize:10, color:'var(--muted)' }}>{item.vendor}</td>
                    {showDrug && <>
                      <td style={{ fontStyle: item.generic ? 'normal' : 'italic', color: item.generic ? 'var(--text)' : 'var(--muted)' }}>
                        {item.generic || '—'}
                      </td>
                      <td style={{ fontWeight: item.strength ? 600 : 400 }}>{item.strength || '—'}</td>
                      <td>
                        {item.drugType
                          ? <span className={`${tableStyles.badge} ${tableStyles.blue}`}>{item.drugType}</span>
                          : <span style={{ color:'var(--muted)' }}>—</span>}
                      </td>
                      <td style={{ fontSize:10, color:'var(--muted)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {item.drugGroup || '—'}
                      </td>
                      <td style={{ fontSize:10 }}>{item.dispUnit || '—'}</td>
                      <td style={{ fontSize:10 }}>{item.recvUnit || '—'}</td>
                      <td style={{ color:'var(--muted)' }}>{item.packSize || '—'}</td>
                      <td>
                        <span className={`${tableStyles.badge} ${item.batchTracked ? tableStyles.green : tableStyles.amber}`}>
                          {item.batchTracked ? '✓ Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ fontSize:10, color:'var(--muted)' }}>{item.incomeHead}</td>
                    </>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
 
      {/* Legend */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:12, marginTop:4 }}>
        {[
          { label:'Revenue-Generating', desc:'Billed directly to patients / HMO', color:'var(--teal)' },
          { label:'Non-Revenue',        desc:'Internal consumption, not billed',   color:'var(--red)'  },
          { label:'Batch Tracked',      desc:'Expiry & lot number recorded per SRV', color:'var(--navy)' },
          { label:'Income Head',        desc:'COA account for GL auto-posting',    color:'var(--purple)'},
        ].map(item => (
          <div key={item.label} style={{ background:'var(--card)', borderRadius:8, padding:'12px 14px', boxShadow:'var(--shadow-sm)', borderLeft:`3px solid ${item.color}` }}>
            <div style={{ fontWeight:700, fontSize:11, color:'var(--navy)', marginBottom:3 }}>{item.label}</div>
            <div style={{ fontSize:10, color:'var(--muted)' }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}