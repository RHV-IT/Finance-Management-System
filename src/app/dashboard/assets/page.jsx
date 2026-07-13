'use client';

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { useDataWithMeta, usePeriodFilter, PeriodFilterBar } from '../../dashboard/lib/useData';
import { RevenuePieChart } from '../../components/Charts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fmt, COLORS, DEMO_ASSETS } from '../../dashboard/lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';

const tip = { background:'#fff', border:'1px solid #E0E4EA', borderRadius:8, fontSize:11 };

const STATUS_BADGE = { Active:tableStyles.green, 'Under Repair':tableStyles.amber, Disposed:tableStyles.red, Idle:tableStyles.blue };

const depreciated = (cost, useful, purchaseDate) => {
  const years = (new Date() - new Date(purchaseDate)) / (1000*60*60*24*365.25);
  const nbv   = Math.max(0, cost * (1 - (1/useful) * years));
  return { nbv:Math.round(nbv), deprPct:Math.min(100,(1-nbv/cost)*100).toFixed(0) };
};

export default function AssetsPage() {
  const [search,   setSearch]   = useState('');
  const [catFil,   setCatFil]   = useState('');
  const [deptFil,  setDeptFil]  = useState('');
  const [statFil,  setStatFil]  = useState('');
  const [showDepr, setShowDepr] = useState(false);
  const [view,     setView]     = useState('table');

  // Asset register is static — no month axis, optional dept filter
  const { month, setMonth, dept, setDept, monthOptions } = usePeriodFilter('2025-11', 'asset_register');
  const { data: assets, isReal } = useDataWithMeta('asset_register', DEMO_ASSETS, {});

  const CATS    = [...new Set(assets.map(a => a.cat||a.category||'Other'))].sort();
  const DEPTS   = [...new Set(assets.map(a => a.dept||a.department||'Other'))].sort();
  const STATUSES= [...new Set(assets.map(a => a.status||'Active'))].sort();

  const filtered = assets.filter(a =>
    (!search   || (a.asset||a.name||'').toLowerCase().includes(search.toLowerCase())) &&
    (!catFil   || (a.cat||a.category) === catFil) &&
    (!deptFil  || (a.dept||a.department) === deptFil) &&
    (!statFil  || a.status === statFil)
  );

  const totalCost   = assets.reduce((s,a) => s+(parseFloat(a.cost)||0), 0);
  const filterCost  = filtered.reduce((s,a) => s+(parseFloat(a.cost)||0), 0);
  const activeCount = assets.filter(a => (a.status||'Active')==='Active').length;
  const repairCount = assets.filter(a => a.status==='Under Repair').length;

  const catMap = {};
  assets.forEach(a => { const c=a.cat||a.category||'Other'; catMap[c]=(catMap[c]||0)+(parseFloat(a.cost)||0); });
  const catPie = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([name,val]) => ({ name, value:+(val/1e6).toFixed(2) }));

  const deptMap = {};
  assets.forEach(a => { const d=a.dept||a.department||'Other'; deptMap[d]=(deptMap[d]||0)+(parseFloat(a.cost)||0); });
  const deptBar = Object.entries(deptMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([dept,val]) => ({ dept:dept.split(' ')[0], val:+(val/1e6).toFixed(2) }));

  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🏗 Asset Register</h2>
          <p className={styles.pageMeta}>Fixed assets · Depreciation · Department allocation {!isReal&&'— demo data'}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {['table','analytics'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:'6px 14px', border:'1.5px solid', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer',
              borderColor:view===v?'var(--navy)':'var(--border)', background:view===v?'var(--navy)':'#fff', color:view===v?'#fff':'var(--text)',
            }}>{v==='table'?'📋 Register':'📊 Analytics'}</button>
          ))}
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <KPICard label="Total Assets"     value={assets.length}  delta={`${CATS.length} categories`}                         deltaType="up"   color="blue"   />
        <KPICard label="Total Asset Value" value={fmt(totalCost)} delta="At purchase cost"                                    deltaType="up"   color="green"  />
        <KPICard label="Active Assets"    value={activeCount}    delta={`${assets.length>0?(activeCount/assets.length*100).toFixed(0):0}% of register`} deltaType="up"   color="green"  />
        <KPICard label="Under Repair"     value={repairCount}    delta="Needs attention" deltaType={repairCount>0?'warn':'up'} color={repairCount>0?'amber':'green'} />
      </div>

      {view === 'analytics' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}><div className={styles.cardTitle}>Asset Value by Category (₦M)</div><RevenuePieChart data={catPie} colors={COLORS} /></div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Asset Value by Department (₦M)</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart layout="vertical" data={deptBar} margin={{ top:4,right:16,left:8,bottom:0 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(0,0,0,.05)" />
                  <XAxis type="number" tick={{ fontSize:10,fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v=>`₦${v}M`} />
                  <YAxis type="category" dataKey="dept" tick={{ fontSize:10,fill:'#7F8C9A' }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip contentStyle={tip} formatter={v=>`₦${v}M`} />
                  <Bar dataKey="val" radius={[0,3,3,0]}>{deptBar.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {view === 'table' && (
        <>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:14 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search asset…"
              style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none',flex:1,minWidth:180 }} />
            <select value={catFil}  onChange={e=>setCatFil(e.target.value)}  style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}>
              <option value="">All Categories</option>{CATS.map(c=><option key={c}>{c}</option>)}
            </select>
            <select value={deptFil} onChange={e=>setDeptFil(e.target.value)} style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}>
              <option value="">All Departments</option>{DEPTS.map(d=><option key={d}>{d}</option>)}
            </select>
            <select value={statFil} onChange={e=>setStatFil(e.target.value)} style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}>
              <option value="">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
            <button onClick={()=>setShowDepr(s=>!s)} style={{
              padding:'6px 12px', border:'1.5px solid', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer',
              borderColor:showDepr?'var(--teal)':'var(--border)', background:showDepr?'var(--teal)':'#fff', color:showDepr?'#fff':'var(--text)',
            }}>📉 {showDepr?'Hide':'Show'} Depreciation</button>
            <span style={{ fontSize:11,color:'var(--muted)' }}>{filtered.length} assets · {fmt(filterCost)}</span>
          </div>

          <div className={tableStyles.tableBox}>
            <div style={{ overflowX:'auto' }}>
              <table className={tableStyles.table} style={{ minWidth:showDepr?1000:800 }}>
                <thead>
                  <tr>
                    <th>Asset ID</th><th>Asset Name</th><th>Category</th><th>Purchase Date</th>
                    <th>Vendor</th><th>Cost</th><th>Department</th><th>Status</th>
                    {showDepr && <><th>Useful Life</th><th>Est. NBV</th><th>Depreciated</th></>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a,i) => {
                    const cat    = a.cat||a.category||'—';
                    const dept   = a.dept||a.department||'—';
                    const status = a.status||'Active';
                    const cost   = parseFloat(a.cost)||0;
                    const { nbv, deprPct } = depreciated(cost, parseFloat(a.useful)||10, a.pd||a.purchaseDate||'2020-01-01');
                    return (
                      <tr key={a.id||i}>
                        <td style={{ fontWeight:700,color:'var(--navy)',fontSize:10 }}>{a.id||`AST-${String(i+1).padStart(3,'0')}`}</td>
                        <td style={{ fontWeight:600 }}>{a.asset||a.name||'—'}</td>
                        <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{cat}</span></td>
                        <td style={{ fontSize:11 }}>{a.pd||a.purchaseDate||'—'}</td>
                        <td style={{ fontSize:11 }}>{a.vendor||'—'}</td>
                        <td style={{ fontWeight:700 }}>{fmt(cost)}</td>
                        <td style={{ fontSize:11 }}>{dept}</td>
                        <td><span className={`${tableStyles.badge} ${STATUS_BADGE[status]||tableStyles.amber}`}>{status}</span></td>
                        {showDepr && <>
                          <td style={{ color:'var(--muted)' }}>{a.useful||10} yrs</td>
                          <td style={{ fontWeight:700,color:'var(--teal)' }}>{fmt(nbv)}</td>
                          <td>
                            <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                              <div style={{ height:6,borderRadius:3,background:'#e8ecf0',width:50,overflow:'hidden' }}>
                                <div style={{ height:'100%',borderRadius:3,background:+deprPct>75?'var(--red)':+deprPct>40?'var(--amber)':'var(--teal)',width:`${deprPct}%` }} />
                              </div>
                              <span style={{ fontSize:10,fontWeight:600 }}>{deprPct}%</span>
                            </div>
                          </td>
                        </>}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr><td colSpan={5} style={{ fontWeight:700 }}>TOTAL ({filtered.length})</td><td style={{ fontWeight:700 }}>{fmt(filterCost)}</td><td colSpan={showDepr?5:2}></td></tr></tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}