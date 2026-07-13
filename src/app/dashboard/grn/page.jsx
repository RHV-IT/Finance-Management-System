'use client';

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import ReconciliationAlert from '../../components/ReconciliationAlert';
import { useDataWithMeta, usePeriodFilter, PeriodFilterBar } from '../../dashboard/lib/useData';
import { fmt, DEMO_GRNS } from '../../dashboard/lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';

const MATCH_STYLE = {
  Full:  { cls:tableStyles.green,  label:'✓ Full Match' },
  Short: { cls:tableStyles.amber,  label:'⚠ Short'      },
};
const COND_STYLE  = {
  Good:            { cls:tableStyles.green,  label:'✓ Good'           },
  'Partial Damage':{ cls:tableStyles.amber,  label:'⚠ Partial Damage' },
  Rejected:        { cls:tableStyles.red,    label:'✗ Rejected'       },
};

export default function GRNPage() {
  const [search, setSearch] = useState('');
  const { month, setMonth, monthOptions, availableMonths } = usePeriodFilter('2025-11', 'goods_received');
  const { data: grns, isReal } = useDataWithMeta('goods_received', DEMO_GRNS, { month });

  const filtered = grns.filter(g =>
    !search || (g.grnNo+g.poRef+g.vendor+g.item).toLowerCase().includes(search.toLowerCase())
  );

  // derive match from qty columns if not pre-set
  const enriched = filtered.map(g => ({
    ...g,
    match: g.match || (g.recvQty >= g.poQty ? 'Full' : 'Short'),
  }));

  const full    = enriched.filter(g => g.match === 'Full').length;
  const short   = enriched.filter(g => g.match === 'Short').length;
  const damaged = enriched.filter(g => g.condition && g.condition !== 'Good').length;

  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>📥 Goods Received Notes</h2>
          <p className={styles.pageMeta}>3-way match: PO → GRN → Invoice · {!isReal && 'Showing demo data — upload via Settings'}</p>
        </div>
      </div>

      <ReconciliationAlert month={month} />

      <PeriodFilterBar
        month={month} setMonth={setMonth}
        monthOptions={monthOptions} availableMonths={availableMonths}
        showMonth={true} showDept={false} isRealData={isReal}
      />

      <div className={styles.kpiGrid}>
        <KPICard label="Total GRNs"     value={grns.length}  delta="All periods" deltaType="up" color="blue" />
        <KPICard label="Full Match"     value={full}         delta={`${grns.length>0?(full/grns.length*100).toFixed(0):0}% of GRNs`} deltaType="up" badge="✓ Good" badgeType="good" color="green" />
        <KPICard label="Short Deliveries" value={short}      delta="Qty variance" deltaType={short>0?'warn':'up'} color={short>0?'amber':'green'} />
        <KPICard label="Damaged"        value={damaged}      delta="Quality issues" deltaType={damaged>0?'down':'up'} color={damaged>0?'red':'green'} />
        <KPICard label="3-Way Match Rate" value={grns.length>0?`${(full/grns.length*100).toFixed(0)}%`:'—'} delta="Target >90%" deltaType="up" color="green" />
        <KPICard label="Open POs Pending GRN" value={2} delta="Awaiting delivery" deltaType="warn" color="amber" />
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search GRN / PO / vendor…"
          style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none',flex:1,minWidth:220 }} />
        <span style={{ fontSize:11,color:'var(--muted)' }}>{filtered.length} GRNs</span>
      </div>

      <div className={tableStyles.tableBox}>
        <div className={tableStyles.tableTitle}>Goods Received Notes Register {!isReal && <span style={{color:'var(--amber)',fontSize:10}}>(demo)</span>}</div>
        <div style={{ overflowX:'auto' }}>
          <table className={tableStyles.table} style={{ minWidth:900 }}>
            <thead>
              <tr><th>GRN No</th><th>Date</th><th>PO Ref</th><th>Vendor</th><th>Item</th><th>PO Qty</th><th>Recv Qty</th><th>Recv Value</th><th>Variance</th><th>Match</th><th>Condition</th></tr>
            </thead>
            <tbody>
              {enriched.map((g,i) => {
                const variance = (g.recvQty||0) - (g.poQty||0);
                const mStyle   = MATCH_STYLE[g.match]  || MATCH_STYLE.Full;
                const cStyle   = COND_STYLE[g.condition] || COND_STYLE.Good;
                return (
                  <tr key={g.grnNo||i}>
                    <td style={{ fontWeight:700,color:'var(--navy)' }}>{g.grnNo||'—'}</td>
                    <td>{g.date}</td>
                    <td style={{ color:'var(--teal)',fontWeight:600 }}>{g.poRef||'—'}</td>
                    <td style={{ fontSize:11 }}>{g.vendor}</td>
                    <td style={{ fontWeight:600 }}>{g.item}</td>
                    <td>{(g.poQty||0).toLocaleString()}</td>
                    <td style={{ fontWeight:700 }}>{(g.recvQty||0).toLocaleString()}</td>
                    <td>{fmt(g.recvValue||0)}</td>
                    <td style={{ fontWeight:700,color:variance===0?'var(--teal)':variance<0?'var(--red)':'var(--amber)' }}>
                      {variance===0?'—':(variance>0?'+':'')+variance}
                    </td>
                    <td><span className={`${tableStyles.badge} ${mStyle.cls}`}>{mStyle.label}</span></td>
                    <td><span className={`${tableStyles.badge} ${cStyle.cls}`}>{cStyle.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}