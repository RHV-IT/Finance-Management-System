'use client';

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import ReconciliationAlert from '../../components/ReconciliationAlert';
import { useDataWithMeta, usePeriodFilter, PeriodFilterBar } from '../../dashboard/lib/useData';
import { RevenuePieChart } from '../../components/Charts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fmt, COLORS, DEMO_POS } from '../../dashboard/lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';

const tip = { background:'#fff', border:'1px solid #E0E4EA', borderRadius:8, fontSize:11 };

const STATUS_BADGE = {
  Received:'green', Approved:'blue', Sent:'blue', Draft:'amber', Cancelled:'red',
};

const TABS = [
  { key:'po',  label:'📋 Purchase Orders'    },
  { key:'kpi', label:'📈 Supply-Chain KPIs'  },
];

export default function SupplyChainPage() {
  const [tab, setTab] = useState('po');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { month, setMonth, dept, setDept, monthOptions, availableMonths } = usePeriodFilter('2025-11', 'purchase_orders');
  const { data: pos, isReal } = useDataWithMeta('purchase_orders', DEMO_POS, { month });

  const filtered = pos.filter(p =>
    (!search || (p.poNo+p.vendor+p.item).toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || p.status === statusFilter)
  );

  const totPO   = filtered.reduce((s,p) => s+(p.total||0), 0);
  const open    = filtered.filter(p => ['Draft','Approved','Sent'].includes(p.status));
  const rcvd    = filtered.filter(p => p.status === 'Received');
  const fillRate= pos.length ? (rcvd.length/pos.length*100).toFixed(0) : 0;
  const vendors = [...new Set(pos.map(p=>p.vendor))].length;

  const vendorSpend = {};
  pos.forEach(p => { vendorSpend[p.vendor||'Unknown'] = (vendorSpend[p.vendor||'Unknown']||0)+(p.total||0); });
  const vendorBar = Object.entries(vendorSpend).sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([v,s]) => ({ name:v.split(' ')[0], spend:+(s/1e6).toFixed(2) }));

  const statusCounts = {};
  pos.forEach(p => { statusCounts[p.status] = (statusCounts[p.status]||0)+1; });
  const statusPie = Object.entries(statusCounts).map(([name,value]) => ({ name, value }));
  const STATUS_COLORS = { Draft:'#CA6F1E', Approved:'#3498DB', Sent:'#1B4F72', Received:'#117A65', Cancelled:'#C0392B' };

  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🛒 Supply Chain & Procurement</h2>
          <p className={styles.pageMeta}>Purchase orders · Delivery tracking · Vendor performance</p>
        </div>
      </div>

      <ReconciliationAlert month={month} />

      <PeriodFilterBar
        month={month} setMonth={setMonth}
        monthOptions={monthOptions} availableMonths={availableMonths}
        showMonth={true} showDept={false}
        isRealData={isReal}
      />

      <div className={styles.kpiGrid}>
        <KPICard label="Total PO Value"   value={fmt(totPO)}       delta={`${pos.length} orders`}                 deltaType="up"   color="blue"   />
        <KPICard label="Open POs"         value={open.length}      delta={fmt(open.reduce((s,p)=>s+(p.total||0),0))+' committed'} deltaType="warn" color="amber" />
        <KPICard label="PO Fill Rate"     value={`${fillRate}%`}   delta={`${rcvd.length} received`}             deltaType={+fillRate>70?'up':'warn'} color={+fillRate>70?'green':'amber'} />
        <KPICard label="Active Vendors"   value={vendors}          delta="In PO history"                         deltaType="up"   color="purple" />
      </div>

      <div style={{ display:'flex', borderBottom:'2px solid var(--border)', marginBottom:16, overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'8px 16px', cursor:'pointer', fontSize:11, fontWeight:600, whiteSpace:'nowrap',
            background:'transparent', border:'none', fontFamily:'inherit',
            borderBottom:`2px solid ${tab===t.key?'var(--teal)':'transparent'}`,
            color:tab===t.key?'var(--teal)':'var(--muted)', marginBottom:-2,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'po' && (
        <>
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search PO / vendor / item…"
              style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none',flex:1,minWidth:200 }} />
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
              style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}>
              <option value="">All Status</option>
              {['Draft','Approved','Sent','Received','Cancelled'].map(s=><option key={s}>{s}</option>)}
            </select>
            {!isReal && <span style={{ fontSize:10,color:'var(--amber)' }}>Showing demo data</span>}
          </div>
          <div className={tableStyles.tableBox}>
            <table className={tableStyles.table}>
              <thead><tr><th>#</th><th>PO No</th><th>Date</th><th>Vendor</th><th>Item</th><th>Qty</th><th>Total</th><th>Expected</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((p,i) => {
                  const bc = STATUS_BADGE[p.status] ? tableStyles[STATUS_BADGE[p.status]] : tableStyles.amber;
                  return (
                    <tr key={p.poNo||i}>
                      <td style={{ color:'var(--muted)' }}>{i+1}</td>
                      <td style={{ fontWeight:700,color:'var(--navy)' }}>{p.poNo||'—'}</td>
                      <td>{p.date}</td>
                      <td style={{ fontWeight:600,fontSize:11 }}>{p.vendor}</td>
                      <td>{p.item}</td>
                      <td>{(p.qty||0).toLocaleString()}</td>
                      <td style={{ fontWeight:700 }}>{fmt(p.total||0)}</td>
                      <td style={{ fontSize:10,color:'var(--muted)' }}>{p.expectedDate||'—'}</td>
                      <td><span className={`${tableStyles.badge} ${bc}`}>{p.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr><td colSpan={6} style={{ fontWeight:700 }}>TOTAL ({filtered.length})</td><td style={{ fontWeight:700 }}>{fmt(totPO)}</td><td colSpan={2}></td></tr></tfoot>
            </table>
          </div>
        </>
      )}

      {tab === 'kpi' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Spend by Vendor (₦M)</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart layout="vertical" data={vendorBar} margin={{ top:4,right:16,left:8,bottom:0 }}>
                <CartesianGrid horizontal={false} stroke="rgba(0,0,0,.05)" />
                <XAxis type="number" tick={{ fontSize:10,fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v=>`₦${v}M`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:10,fill:'#7F8C9A' }} axisLine={false} tickLine={false} width={72} />
                <Tooltip contentStyle={tip} formatter={v=>`₦${v}M`} />
                <Bar dataKey="spend" radius={[0,3,3,0]}>
                  {vendorBar.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>PO Status Breakdown</div>
            <RevenuePieChart data={statusPie} colors={statusPie.map(s=>STATUS_COLORS[s.name]||'#888')} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}