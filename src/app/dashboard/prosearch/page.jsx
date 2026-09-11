'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { fmt } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
/* ─── Unified procurement data pool ─────────────────────── */
const ALL_RECORDS = [
  /* Requisitions */
  { type:'Requisition', ref:'DR-000001', date:'2025-11-20', dept:'Pharmacy',      item:'Amoxicillin 500mg × 2,000',            vendor:'Pharmaplus Nigeria Ltd',   amount:160000,  status:'Completed',                 priority:'High'   },
  { type:'Requisition', ref:'DR-000002', date:'2025-11-22', dept:'Laboratory',    item:'Blood Glucose Strips × 500 + FBC Kit', vendor:'DiagnosTech',              amount:1445000, status:'PO Created',                priority:'Normal' },
  { type:'Requisition', ref:'DR-000003', date:'2025-11-24', dept:'Radiology',     item:'CT Contrast Media × 30 Vials',         vendor:'—',                        amount:360000,  status:'Approved',                  priority:'High'   },
  { type:'Requisition', ref:'DR-000004', date:'2025-11-25', dept:'CSSD',          item:'Sterilization Pouches × 5,000',        vendor:'—',                        amount:275000,  status:'Pending Management Approval',priority:'Normal' },
  { type:'Requisition', ref:'DR-000005', date:'2025-11-15', dept:'Ophthalmology', item:'Intraocular Lenses × 5',               vendor:'—',                        amount:98000,   status:'Queried',                   priority:'Normal' },
  { type:'Requisition', ref:'DR-000006', date:'2025-11-10', dept:'Pharmacy',      item:'IV Dextrose 5% × 200 Bottles',         vendor:'HealthCare Distributors',  amount:300000,  status:'Goods Received',            priority:'Normal' },
  { type:'Requisition', ref:'DR-000007', date:'2025-10-28', dept:'Laboratory',    item:'Urinalysis Strips × 300',              vendor:'DiagnosTech',              amount:1650000, status:'Completed',                 priority:'Normal' },
  { type:'Requisition', ref:'DR-000008', date:'2025-10-15', dept:'Pharmacy',      item:'Amlodipine 5mg × 3,000',               vendor:'Pharmaplus Nigeria Ltd',   amount:1050000, status:'Completed',                 priority:'Normal' },
 
  /* Purchase Orders */
  { type:'Purchase Order', ref:'PO-0041', date:'2025-11-18', dept:'Store / Procurement', item:'Cannula 18G × 500',              vendor:'MedEquip Supplies',        amount:400000,  status:'Received',                  priority:'Normal' },
  { type:'Purchase Order', ref:'PO-0042', date:'2025-11-19', dept:'Store / Procurement', item:'Metformin 500mg × 2,000',        vendor:'Pharmaplus Nigeria Ltd',   amount:240000,  status:'Received',                  priority:'Normal' },
  { type:'Purchase Order', ref:'PO-0043', date:'2025-11-22', dept:'Store / Procurement', item:'IV Normal Saline 500ml × 400',   vendor:'HealthCare Distributors',  amount:600000,  status:'Approved',                  priority:'Normal' },
  { type:'Purchase Order', ref:'PO-0044', date:'2025-11-24', dept:'Store / Procurement', item:'Blood Glucose Strips × 300',     vendor:'DiagnosTech',              amount:840000,  status:'Sent',                      priority:'Normal' },
  { type:'Purchase Order', ref:'PO-0045', date:'2025-11-25', dept:'Store / Procurement', item:'Oxygen Cylinder Refill × 50',    vendor:'GasSupply Nigeria',        amount:750000,  status:'Approved',                  priority:'Normal' },
  { type:'Purchase Order', ref:'PO-0046', date:'2025-11-26', dept:'Store / Procurement', item:'Surgical Drapes × 200',          vendor:'ProMed Nigeria',           amount:180000,  status:'Draft',                     priority:'Normal' },
  { type:'Purchase Order', ref:'PO-0047', date:'2025-11-26', dept:'Store / Procurement', item:'Exam Gloves S × 1,000',          vendor:'MedEquip Supplies',        amount:650000,  status:'Draft',                     priority:'Normal' },
  { type:'Purchase Order', ref:'PO-0048', date:'2025-11-20', dept:'Store / Procurement', item:'CT Contrast Media × 20',         vendor:'ImageCare Nigeria',        amount:240000,  status:'Cancelled',                 priority:'Normal' },
  { type:'Purchase Order', ref:'PO-0039', date:'2025-11-17', dept:'Store / Procurement', item:'Metformin 500mg × 2,000',        vendor:'Pharmaplus Nigeria Ltd',   amount:240000,  status:'Received',                  priority:'Normal' },
  { type:'Purchase Order', ref:'PO-0037', date:'2025-11-10', dept:'Store / Procurement', item:'IV Normal Saline 500ml × 400',   vendor:'HealthCare Distributors',  amount:600000,  status:'Received',                  priority:'Normal' },
];
 
const DEPTS    = [...new Set(ALL_RECORDS.map(r => r.dept))].sort();
const STATUSES = [...new Set(ALL_RECORDS.map(r => r.status))].sort();
const VENDORS  = [...new Set(ALL_RECORDS.map(r => r.vendor).filter(v => v !== '—'))].sort();
 
const STATUS_BADGE = {
  Completed:                    tableStyles.green,
  Received:                     tableStyles.green,
  Approved:                     tableStyles.blue,
  Sent:                         tableStyles.blue,
  'PO Created':                 tableStyles.blue,
  'Goods Received':             tableStyles.blue,
  'Pending Management Approval':tableStyles.amber,
  'Pending Procurement':        tableStyles.amber,
  Submitted:                    tableStyles.amber,
  Queried:                      tableStyles.amber,
  Draft:                        tableStyles.amber,
  Rejected:                     tableStyles.red,
  Cancelled:                    tableStyles.red,
};
 
const TYPE_BADGE = {
  'Requisition':    tableStyles.purple,
  'Purchase Order': tableStyles.blue,
};
 
export default function ProcSearchPage() {
  const [text,    setText]    = useState('');
  const [dept,    setDept]    = useState('');
  const [status,  setStatus]  = useState('');
  const [type,    setType]    = useState('');
  const [vendor,  setVendor]  = useState('');
  const [dateFrom,setDateFrom]= useState('');
  const [dateTo,  setDateTo]  = useState('');
 
  const filtered = useMemo(() => {
    return ALL_RECORDS.filter(r => {
      const matchText   = !text   || (r.ref + r.item + r.vendor + r.dept).toLowerCase().includes(text.toLowerCase());
      const matchDept   = !dept   || r.dept === dept;
      const matchStatus = !status || r.status === status;
      const matchType   = !type   || r.type === type;
      const matchVendor = !vendor || r.vendor === vendor;
      const matchFrom   = !dateFrom || r.date >= dateFrom;
      const matchTo     = !dateTo   || r.date <= dateTo;
      return matchText && matchDept && matchStatus && matchType && matchVendor && matchFrom && matchTo;
    });
  }, [text, dept, status, type, vendor, dateFrom, dateTo]);
 
  const totalVal  = filtered.reduce((s, r) => s + r.amount, 0);
  const reqCount  = filtered.filter(r => r.type === 'Requisition').length;
  const poCount   = filtered.filter(r => r.type === 'Purchase Order').length;
  const openVal   = filtered.filter(r => !['Completed','Received','Cancelled'].includes(r.status)).reduce((s,r) => s+r.amount, 0);
 
  const clearFilters = () => { setText(''); setDept(''); setStatus(''); setType(''); setVendor(''); setDateFrom(''); setDateTo(''); };
 
  const activeFilters = [text, dept, status, type, vendor, dateFrom, dateTo].filter(Boolean).length;
 
  const handleExportCSV = () => {
    const headers = 'Type,Ref,Date,Department,Item,Vendor,Amount,Status\n';
    const rows = filtered.map(r =>
      `"${r.type}","${r.ref}","${r.date}","${r.dept}","${r.item}","${r.vendor}",${r.amount},"${r.status}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'RHV_Procurement_Search.csv'; a.click();
    URL.revokeObjectURL(url);
  };
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🔍 Procurement Search</h2>
          <p className={styles.pageMeta}>Search across all requisitions & purchase orders by any criterion · Export to CSV / PDF</p>
        </div>
      </div>
 
      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <KPICard label="Results Found"    value={filtered.length}   delta={`of ${ALL_RECORDS.length} total records`}  deltaType="up" color="blue"   />
        <KPICard label="Total Value"      value={fmt(totalVal)}     delta="Filtered selection"                         deltaType="up" color="green"  />
        <KPICard label="Requisitions"     value={reqCount}          delta="Dept requests"                              deltaType="up" color="purple" />
        <KPICard label="Purchase Orders"  value={poCount}           delta="POs issued"                                 deltaType="up" color="blue"   />
        <KPICard label="Open Value"       value={fmt(openVal)}      delta="Not yet completed/received"                 deltaType="warn" color="amber"  />
        {activeFilters > 0 && (
          <KPICard label="Active Filters"   value={activeFilters}     delta="Click 'Clear All' to reset"                deltaType="warn" color="red"    />
        )}
      </div>
 
      {/* ── Search & filter panel ─────────────────────────────── */}
      <div style={{ background:'var(--card)', borderRadius:10, padding:'16px 18px', boxShadow:'var(--shadow-sm)', marginBottom:16 }}>
        <div style={{ fontWeight:700, fontSize:11, color:'var(--navy)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>
          🔍 Search & Filter
        </div>
 
        {/* Row 1 — text + type + dept */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10, marginBottom:10 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Request / PO number, item name, vendor…"
            style={{ padding:'8px 12px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none' }}
          />
          <select value={type} onChange={e => setType(e.target.value)}
            style={{ padding:'8px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none' }}>
            <option value="">All Types</option>
            <option>Requisition</option>
            <option>Purchase Order</option>
          </select>
          <select value={dept} onChange={e => setDept(e.target.value)}
            style={{ padding:'8px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none' }}>
            <option value="">All Departments</option>
            {DEPTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
 
        {/* Row 2 — status + vendor + date range */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, alignItems:'center' }}>
          <select value={status} onChange={e => setStatus(e.target.value)}
            style={{ padding:'8px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none' }}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={vendor} onChange={e => setVendor(e.target.value)}
            style={{ padding:'8px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none' }}>
            <option value="">All Vendors</option>
            {VENDORS.map(v => <option key={v}>{v}</option>)}
          </select>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ flex:1, padding:'8px 8px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none' }} />
            <span style={{ fontSize:10, color:'var(--muted)', whiteSpace:'nowrap' }}>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ flex:1, padding:'8px 8px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none' }} />
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={handleExportCSV}
              style={{ flex:1, padding:'8px 10px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
              ⬇ CSV
            </button>
            {activeFilters > 0 && (
              <button onClick={clearFilters}
                style={{ flex:1, padding:'8px 10px', background:'var(--red)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                ✕ Clear
              </button>
            )}
          </div>
        </div>
 
        {/* Active filter chips */}
        {activeFilters > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
            {[
              text    && { label:`Text: "${text}"`,        clear:() => setText('')    },
              type    && { label:`Type: ${type}`,          clear:() => setType('')    },
              dept    && { label:`Dept: ${dept}`,          clear:() => setDept('')    },
              status  && { label:`Status: ${status}`,      clear:() => setStatus('')  },
              vendor  && { label:`Vendor: ${vendor}`,      clear:() => setVendor('')  },
              dateFrom&& { label:`From: ${dateFrom}`,      clear:() => setDateFrom('')},
              dateTo  && { label:`To: ${dateTo}`,          clear:() => setDateTo('')  },
            ].filter(Boolean).map((chip, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:4,
                background:'#EBF5FB', border:'1px solid #AED6F1',
                borderRadius:99, padding:'3px 10px', fontSize:10, fontWeight:600, color:'var(--navy)',
              }}>
                {chip.label}
                <button onClick={chip.clear}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--navy)', fontSize:12, padding:0, lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
 
      {/* ── Results table ─────────────────────────────────────── */}
      <div className={tableStyles.tableBox}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div className={tableStyles.tableTitle} style={{ margin:0 }}>
            Search Results — {filtered.length} records · {fmt(totalVal)} total value
          </div>
          <div style={{ fontSize:10, color:'var(--muted)' }}>
            {reqCount} requisition{reqCount !== 1 ? 's' : ''} · {poCount} purchase order{poCount !== 1 ? 's' : ''}
          </div>
        </div>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Ref No</th>
              <th>Date</th>
              <th>Department</th>
              <th>Item / Description</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign:'center', padding:32, color:'var(--muted)' }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
                  No records match your search criteria.{activeFilters > 0 && ' Try clearing some filters.'}
                </td>
              </tr>
            ) : filtered.map((r, i) => (
              <tr key={`${r.type}-${r.ref}`}>
                <td>
                  <span className={`${tableStyles.badge} ${TYPE_BADGE[r.type] || tableStyles.blue}`}
                    style={{ fontSize:9, whiteSpace:'nowrap' }}>
                    {r.type === 'Requisition' ? '📝 Req' : '📋 PO'}
                  </span>
                </td>
                <td style={{ fontWeight:700, color:'var(--navy)', whiteSpace:'nowrap' }}>{r.ref}</td>
                <td style={{ whiteSpace:'nowrap' }}>{r.date}</td>
                <td style={{ fontSize:11 }}>{r.dept}</td>
                <td style={{ fontWeight:600, maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                  title={r.item}>{r.item}</td>
                <td style={{ fontSize:11, color: r.vendor === '—' ? 'var(--muted)' : 'var(--text)' }}>
                  {r.vendor}
                </td>
                <td style={{ fontWeight:700 }}>{fmt(r.amount)}</td>
                <td>
                  <span className={`${tableStyles.badge} ${STATUS_BADGE[r.status] || tableStyles.amber}`}
                    style={{ fontSize:9, whiteSpace:'nowrap' }}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={6} style={{ fontWeight:700 }}>TOTAL ({filtered.length} records)</td>
                <td style={{ fontWeight:700 }}>{fmt(totalVal)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
 
      {/* ── Quick stats breakdown ─────────────────────────────── */}
      {filtered.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:4 }}>
          {/* By status */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Results by Status</div>
            {Object.entries(
              filtered.reduce((acc, r) => { acc[r.status] = (acc[r.status]||0) + 1; return acc; }, {})
            ).sort((a,b) => b[1]-a[1]).map(([status, count]) => (
              <div key={status} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:11 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span className={`${tableStyles.badge} ${STATUS_BADGE[status]||tableStyles.amber}`} style={{ fontSize:9 }}>{status}</span>
                </div>
                <span style={{ fontWeight:700 }}>{count}</span>
              </div>
            ))}
          </div>
 
          {/* By vendor */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Results by Vendor</div>
            {Object.entries(
              filtered.reduce((acc, r) => { if(r.vendor!=='—'){ acc[r.vendor] = (acc[r.vendor]||0) + r.amount; } return acc; }, {})
            ).sort((a,b) => b[1]-a[1]).map(([vendor, val]) => (
              <div key={vendor} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:11 }}>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>{vendor}</span>
                <span style={{ fontWeight:700, color:'var(--navy)' }}>{fmt(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}