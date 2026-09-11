'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { fmt, COLORS } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const tip = { background:'#fff', border:'1px solid #E0E4EA', borderRadius:8, fontSize:11 };
 
/* ─── Vendor outstanding data ────────────────────────────── */
const VENDOR_DATA = [
  {
    vendor: 'Pharmaplus Nigeria Ltd',
    cat: 'Drugs & Pharmaceuticals',
    contact: '08012345678 · pharmaplus@email.com',
    purchases: 18500000,
    paid:       15050000,
    buckets:    [1200000, 950000, 800000, 500000],  // 0-30, 31-60, 61-90, 90+
  },
  {
    vendor: 'MedEquip Supplies',
    cat: 'Medical Equipment & Consumables',
    contact: '08023456789 · medequip@email.com',
    purchases: 14200000,
    paid:       12100000,
    buckets:    [900000, 750000, 350000, 100000],
  },
  {
    vendor: 'HealthCare Distributors',
    cat: 'IV Fluids & Infusions',
    contact: '08034567890 · healthcare@email.com',
    purchases: 12800000,
    paid:       11600000,
    buckets:    [700000, 300000, 200000, 0],
  },
  {
    vendor: 'DiagnosTech',
    cat: 'Lab Reagents & Diagnostics',
    contact: '08045678901 · diagnosec@email.com',
    purchases:  9500000,
    paid:        7700000,
    buckets:    [1200000, 450000, 150000, 0],
  },
  {
    vendor: 'GasSupply Nigeria',
    cat: 'Medical Gases',
    contact: '08056789012 · gassupply@email.com',
    purchases:  6200000,
    paid:        5950000,
    buckets:    [180000, 70000, 0, 0],
  },
  {
    vendor: 'ImageCare Nigeria',
    cat: 'Radiology & Imaging',
    contact: '08067890123 · imagecare@email.com',
    purchases:  4800000,
    paid:        4320000,
    buckets:    [280000, 200000, 0, 0],
  },
  {
    vendor: 'ProMed Nigeria',
    cat: 'Surgical Consumables',
    contact: '08078901234 · promed@email.com',
    purchases:  3900000,
    paid:        3720000,
    buckets:    [130000, 50000, 0, 0],
  },
  {
    vendor: 'OptiVision',
    cat: 'Ophthalmology Supplies',
    contact: '08089012345 · optivision@email.com',
    purchases:  2100000,
    paid:        1980000,
    buckets:    [90000, 30000, 0, 0],
  },
];
 
/* ─── Derived totals ─────────────────────────────────────── */
const enriched = VENDOR_DATA.map(v => ({
  ...v,
  outstanding: v.purchases - v.paid,
  total030:    v.buckets[0],
  total3160:   v.buckets[1],
  total6190:   v.buckets[2],
  total90p:    v.buckets[3],
  overdue:     v.buckets[1] + v.buckets[2] + v.buckets[3],
}));
 
const tPurchases  = enriched.reduce((s, v) => s + v.purchases,  0);
const tPaid       = enriched.reduce((s, v) => s + v.paid,       0);
const tOutstanding= enriched.reduce((s, v) => s + v.outstanding, 0);
const tOverdue    = enriched.reduce((s, v) => s + v.overdue,     0);
const tCurrent    = enriched.reduce((s, v) => s + v.total030,    0);
 
/* ─── Aging chart data ───────────────────────────────────── */
const agingChart = enriched
  .filter(v => v.outstanding > 0)
  .sort((a, b) => b.outstanding - a.outstanding)
  .slice(0, 6)
  .map(v => ({
    name:   v.vendor.split(' ')[0],
    '0-30': +(v.total030  / 1e6).toFixed(2),
    '31-60':+(v.total3160 / 1e6).toFixed(2),
    '61-90':+(v.total6190 / 1e6).toFixed(2),
    '90+':  +(v.total90p  / 1e6).toFixed(2),
  }));
 
/* ─── Purchases vs paid chart ────────────────────────────── */
const pvpChart = enriched.map(v => ({
  name:      v.vendor.split(' ')[0],
  purchases: +(v.purchases / 1e6).toFixed(2),
  paid:      +(v.paid      / 1e6).toFixed(2),
}));
 
export default function VendorOutstandingPage() {
  const [sortBy,  setSortBy]  = useState('outstanding');
  const [search,  setSearch]  = useState('');
 
  const sorted = useMemo(() => {
    const arr = enriched.filter(v =>
      !search || v.vendor.toLowerCase().includes(search.toLowerCase()) || v.cat.toLowerCase().includes(search.toLowerCase())
    );
    return [...arr].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [sortBy, search]);
 
  const handleExport = () => {
    const headers = 'Vendor,Category,Total Purchases,Total Paid,Outstanding,0-30 Days,31-60 Days,61-90 Days,90+ Days\n';
    const rows = sorted.map(v =>
      `"${v.vendor}","${v.cat}",${v.purchases},${v.paid},${v.outstanding},${v.total030},${v.total3160},${v.total6190},${v.total90p}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'RHV_Vendor_Outstanding.csv'; a.click();
    URL.revokeObjectURL(url);
  };
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>📉 Vendor Outstanding</h2>
          <p className={styles.pageMeta}>Purchases vs payments per vendor · Aging analysis · Overdue balances</p>
        </div>
      </div>
 
      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Purchases"    value={fmt(tPurchases)}   delta={`${VENDOR_DATA.length} vendors`}  deltaType="up"   color="blue"   />
        <KPICard label="Total Paid"         value={fmt(tPaid)}        delta={`${(tPaid/tPurchases*100).toFixed(0)}% paid`}       deltaType="up"   color="green"  />
        <KPICard label="Total Outstanding"  value={fmt(tOutstanding)} delta="Unpaid balance"
          deltaType={tOutstanding > 5e6 ? 'down' : 'up'}
          badge={tOutstanding > 5e6 ? '⚠ Review' : '✓ OK'}
          badgeType={tOutstanding > 5e6 ? 'bad' : 'good'}
          color={tOutstanding > 5e6 ? 'red' : 'green'} />
        <KPICard label="Current (0–30 Days)" value={fmt(tCurrent)}   delta="Within terms"  deltaType="up"   color="purple" />
        <KPICard label="Overdue (31+ Days)"  value={fmt(tOverdue)}   delta="Past due date"
          deltaType={tOverdue > 0 ? 'down' : 'up'}
          badge={tOverdue > 0 ? '⚠ Overdue' : '✓ None'}
          badgeType={tOverdue > 0 ? 'bad' : 'good'}
          color={tOverdue > 0 ? 'red' : 'green'} />
        <KPICard label="Payment Rate"       value={`${(tPaid/tPurchases*100).toFixed(1)}%`} delta="Of total purchases" deltaType="up" color="amber" />
      </div>
 
      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:14, marginBottom:16 }}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Outstanding Aging by Vendor (₦M)</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={agingChart} margin={{ top:4, right:8, left:0, bottom:0 }}>
              <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${v}M`} width={44} />
              <Tooltip contentStyle={tip} formatter={v => `₦${v}M`} />
              <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
              <Bar dataKey="0-30"  name="0–30 Days"  stackId="a" fill="#117A65" />
              <Bar dataKey="31-60" name="31–60 Days" stackId="a" fill="#CA6F1E" />
              <Bar dataKey="61-90" name="61–90 Days" stackId="a" fill="#E74C3C" />
              <Bar dataKey="90+"   name="90+ Days"   stackId="a" fill="#7B241C" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Aging Breakdown</div>
          <div style={{ padding:'8px 0' }}>
            {[
              { label:'0–30 Days (Current)',   val: tCurrent,                               color:'#117A65', pct: tOutstanding > 0 ? (tCurrent / tOutstanding * 100).toFixed(0) : 0 },
              { label:'31–60 Days',            val: enriched.reduce((s,v)=>s+v.total3160,0), color:'#CA6F1E', pct: tOutstanding > 0 ? (enriched.reduce((s,v)=>s+v.total3160,0) / tOutstanding * 100).toFixed(0) : 0 },
              { label:'61–90 Days',            val: enriched.reduce((s,v)=>s+v.total6190,0), color:'#E74C3C', pct: tOutstanding > 0 ? (enriched.reduce((s,v)=>s+v.total6190,0) / tOutstanding * 100).toFixed(0) : 0 },
              { label:'90+ Days (Severely Overdue)', val: enriched.reduce((s,v)=>s+v.total90p,0), color:'#7B241C', pct: tOutstanding > 0 ? (enriched.reduce((s,v)=>s+v.total90p,0) / tOutstanding * 100).toFixed(0) : 0 },
            ].map(item => (
              <div key={item.label} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                  <span style={{ fontWeight:600 }}>{item.label}</span>
                  <span style={{ fontWeight:700, color:item.color }}>{fmt(item.val)}</span>
                </div>
                <div style={{ height:8, background:'#e8ecf0', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:4, background:item.color, width:`${item.pct}%`, transition:'width .6s ease' }} />
                </div>
                <div style={{ fontSize:9, color:'var(--muted)', marginTop:2, textAlign:'right' }}>{item.pct}% of outstanding</div>
              </div>
            ))}
          </div>
        </div>
      </div>
 
      {/* Purchases vs Paid */}
      <div className={styles.card} style={{ marginBottom:16 }}>
        <div className={styles.cardTitle}>Total Purchases vs Total Paid by Vendor (₦M)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={pvpChart} margin={{ top:4, right:8, left:0, bottom:0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,.05)" />
            <XAxis dataKey="name" tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:10, fill:'#7F8C9A' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${v}M`} width={44} />
            <Tooltip contentStyle={tip} formatter={v => `₦${v}M`} />
            <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
            <Bar dataKey="purchases" name="Total Purchases" fill="#1B4F72aa" radius={[3,3,0,0]} />
            <Bar dataKey="paid"      name="Total Paid"      fill="#117A65"   radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
 
      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search vendor / category…"
          style={{ padding:'6px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none', minWidth:220, flex:1 }}
        />
        <span style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase' }}>Sort by:</span>
        {[['outstanding','Outstanding'],['overdue','Overdue'],['purchases','Purchases']].map(([k,l]) => (
          <button key={k} onClick={() => setSortBy(k)} style={{
            padding:'5px 11px', border:'1.5px solid', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer',
            borderColor: sortBy===k ? 'var(--teal)' : 'var(--border)',
            background:  sortBy===k ? 'var(--teal)' : '#fff',
            color:       sortBy===k ? '#fff' : 'var(--text)',
          }}>{l}</button>
        ))}
        <button onClick={handleExport}
          style={{ padding:'6px 12px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
          ⬇ Download Report
        </button>
      </div>
 
      {/* Outstanding table */}
      <div className={tableStyles.tableBox}>
        <div className={tableStyles.tableTitle}>Vendor Outstanding — Aging Ledger</div>
        <div style={{ overflowX:'auto' }}>
          <table className={tableStyles.table} style={{ minWidth:900 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Total Purchases</th>
                <th>Total Paid</th>
                <th style={{ color:'var(--red)' }}>Outstanding</th>
                <th>0–30 Days</th>
                <th>31–60 Days</th>
                <th>61–90 Days</th>
                <th>90+ Days</th>
                <th>Payment %</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((v, i) => {
                const payPct   = v.purchases > 0 ? (v.paid / v.purchases * 100).toFixed(0) : 0;
                const isOverdue= v.overdue > 0;
                return (
                  <tr key={v.vendor}>
                    <td style={{ color:'var(--muted)' }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight:700 }}>{v.vendor}</div>
                      <div style={{ fontSize:9, color:'var(--muted)' }}>{v.contact}</div>
                    </td>
                    <td>
                      <span className={`${tableStyles.badge} ${tableStyles.blue}`} style={{ fontSize:9 }}>{v.cat}</span>
                    </td>
                    <td style={{ fontWeight:600 }}>{fmt(v.purchases)}</td>
                    <td style={{ color:'var(--teal)', fontWeight:600 }}>{fmt(v.paid)}</td>
                    <td style={{ fontWeight:800, color: v.outstanding > 2e6 ? 'var(--red)' : 'var(--text)' }}>
                      {fmt(v.outstanding)}
                    </td>
                    <td style={{ color:'var(--teal)' }}>{v.total030  > 0 ? fmt(v.total030)  : '—'}</td>
                    <td style={{ color: v.total3160 > 0 ? 'var(--amber)' : 'var(--muted)' }}>
                      {v.total3160 > 0 ? fmt(v.total3160) : '—'}
                    </td>
                    <td style={{ color: v.total6190 > 0 ? 'var(--red)' : 'var(--muted)' }}>
                      {v.total6190 > 0 ? fmt(v.total6190) : '—'}
                    </td>
                    <td style={{ color: v.total90p > 0 ? '#7B241C' : 'var(--muted)', fontWeight: v.total90p > 0 ? 700 : 400 }}>
                      {v.total90p > 0 ? fmt(v.total90p) : '—'}
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ height:6, borderRadius:3, background:'#e8ecf0', width:60, overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:3, background: +payPct > 90 ? 'var(--teal)' : +payPct > 70 ? 'var(--amber)' : 'var(--red)', width:`${payPct}%` }} />
                        </div>
                        <span style={{ fontSize:10, fontWeight:700 }}>{payPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ fontWeight:700 }}>TOTAL</td>
                <td style={{ fontWeight:700 }}>{fmt(tPurchases)}</td>
                <td style={{ fontWeight:700, color:'var(--teal)' }}>{fmt(tPaid)}</td>
                <td style={{ fontWeight:800, color:'var(--red)' }}>{fmt(tOutstanding)}</td>
                <td>{fmt(tCurrent)}</td>
                <td style={{ color:'var(--amber)' }}>{fmt(enriched.reduce((s,v)=>s+v.total3160,0))}</td>
                <td style={{ color:'var(--red)' }}>{fmt(enriched.reduce((s,v)=>s+v.total6190,0))}</td>
                <td style={{ color:'#7B241C', fontWeight:700 }}>{fmt(enriched.reduce((s,v)=>s+v.total90p,0))}</td>
                <td style={{ fontWeight:700 }}>{(tPaid/tPurchases*100).toFixed(0)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}