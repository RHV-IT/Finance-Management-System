'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { fmt, COLORS } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const FONT  = { family: "'Inter','Segoe UI',Arial,sans-serif", size: 10 };
const GRID  = 'rgba(0,0,0,0.05)';
const BASE  = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const LEG_B = { display: true, position: 'bottom', labels: { font: FONT, boxWidth: 10 } };

const SEED_NOTIFS = [
  { id:1,  type:'Finance',     priority:'high',   icon:'🔴', title:'Debtor Threshold Exceeded',          body:'Total outstanding receivables ₦37.3M exceeds ₦25M target by ₦12.3M. Immediate collection action required.',             ts:'2025-11-28T10:02:00Z', module:'Debtors',   read:false },
  { id:2,  type:'Stores',      priority:'medium', icon:'🟡', title:'Critical Drug Alert — IV Fluids',    body:'IV fluid stock critically low. Current level at 12% of minimum threshold. Emergency procurement needed.',                 ts:'2025-11-28T09:15:00Z', module:'Store',     read:false },
  { id:3,  type:'Finance',     priority:'high',   icon:'🔴', title:'Payables Overdue — Pharmaplus',      body:'Invoice INV-2025-089 from Pharmaplus Nigeria Ltd (₦3.45M) is now 14 days past due. Supplier relationship at risk.',       ts:'2025-11-28T08:30:00Z', module:'Payables',  read:false },
  { id:4,  type:'Procurement', priority:'medium', icon:'🟡', title:'P2P Gate 1 Pending — 2 Requests',   body:'DR-220104 (Pharmacy, ₦4.5M) and DR-220105 (CSSD, ₦380K) awaiting Management Gate 1 approval.',                          ts:'2025-11-27T16:00:00Z', module:'P2P',       read:false },
  { id:5,  type:'Approvals',   priority:'high',   icon:'🔴', title:'Approval Request — Emergency Drugs', body:'Emergency Drug Procurement (₦4.5M) from Pharmacy Unit has been pending approval for 2 days. Requires immediate action.', ts:'2025-11-27T14:00:00Z', module:'Approvals', read:false },
  { id:6,  type:'Finance',     priority:'info',   icon:'🔵', title:'Revenue Target Achieved — November', body:'November 2025 revenue ₦155.1M exceeded ₦120M monthly target by 29.2%. Excellent performance.',                         ts:'2025-11-27T09:00:00Z', module:'Revenue',   read:true  },
  { id:7,  type:'Billing',     priority:'medium', icon:'🟡', title:'HMO Claims Pending — 30 Days',       body:'5 HMO claims totalling ₦2.8M pending for over 30 days. Follow up with Lagos State HMO and Axa Mansard.',               ts:'2025-11-27T08:20:00Z', module:'Invoicing', read:true  },
  { id:8,  type:'Stores',      priority:'medium', icon:'🟡', title:'Low Stock Alert — Cannula 18G',      body:'Cannula 18G stock at 8 units — below minimum reorder point of 50 units. Raise requisition immediately.',                 ts:'2025-11-26T15:44:00Z', module:'Store',     read:true  },
  { id:9,  type:'System',      priority:'info',   icon:'🔵', title:'Dashboard Auto-Backup Completed',    body:'Scheduled data snapshot completed successfully — November 2025 data archived at 01:00 AM.',                             ts:'2025-11-26T01:00:00Z', module:'System',    read:true  },
  { id:10, type:'Procurement', priority:'info',   icon:'🔵', title:'PO Delivered — SRV-2025-001 Posted', body:'Pharmaplus delivery confirmed. SRV-2025-001 posted. Normal Saline 500ml × 500 cartons received.',                      ts:'2025-11-25T14:30:00Z', module:'Store',     read:true  },
  { id:11, type:'Finance',     priority:'high',   icon:'🔴', title:'Expense Ratio Above 60% — March',   body:'March 2025 expense ratio reached 106% due to capital expenditure. Exceptional item — requires MD review.',              ts:'2025-11-25T08:00:00Z', module:'Expenses',  read:true  },
  { id:12, type:'Approvals',   priority:'medium', icon:'🟡', title:'Equipment Maintenance Contract',     body:'Annual CT scanner maintenance contract (₦1.2M) from Maintenance Dept has been pending 1 day.',                          ts:'2025-11-24T10:00:00Z', module:'Approvals', read:true  },
  { id:13, type:'Billing',     priority:'info',   icon:'🔵', title:'Invoice INV-2025-006 Paid',          body:'Mrs. Chioma Eze settled invoice INV-2025-006 (₦950,000). Receipt RCT-2025-006 auto-generated.',                         ts:'2025-11-24T11:20:00Z', module:'Invoicing', read:true  },
  { id:14, type:'Procurement', priority:'medium', icon:'🟡', title:'Vendor Quotation Required — Lab',    body:'DR-220102 (Laboratory, ₦2.875M) requires 3 vendor quotations before Gate 2 recommendation.',                           ts:'2025-11-24T09:10:00Z', module:'P2P',       read:true  },
  { id:15, type:'Stores',      priority:'info',   icon:'🔵', title:'Asset Register Updated',             body:'6 new assets added this week. Total asset value now ₦31.85M.',                                                          ts:'2025-11-23T14:00:00Z', module:'Assets',    read:true  },
  { id:16, type:'System',      priority:'medium', icon:'🟡', title:'Monthly Close Reminder — 3 Days',   body:'November 2025 monthly financial close due in 3 days. All departmental submissions by Dec 3rd.',                         ts:'2025-11-23T08:00:00Z', module:'System',    read:true  },
  { id:17, type:'Finance',     priority:'info',   icon:'🔵', title:'Q3 2025 Report Generated',           body:'Q3 2025 (Jul–Sep) report generated. Total: ₦475.2M vs target ₦360M (+32%). Available in Archive.',                    ts:'2025-11-22T10:00:00Z', module:'Archive',   read:true  },
];

const PRIORITY_CONFIG = {
  high:   { label:'Critical', bg:'#FEECEC', border:'#F1948A', badgeCls:'red',   dot:'#C0392B' },
  medium: { label:'Warning',  bg:'#FFF9E6', border:'#F4D03F', badgeCls:'amber', dot:'#CA6F1E' },
  info:   { label:'Info',     bg:'#EBF5FB', border:'#85C1E9', badgeCls:'blue',  dot:'#1B4F72' },
};

const MODULE_ICONS = {
  Debtors:'🏦', Store:'📦', Payables:'💳', P2P:'🔄', Revenue:'💰',
  Invoicing:'🧾', Assets:'🏗', System:'⚙️', Expenses:'💸', Archive:'🗃',
  Approvals:'✅', Billing:'🧾',
};

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

export default function NotificationsPage() {
  const [notifs,     setNotifs]     = useState(SEED_NOTIFS);
  const [activeTab,  setActiveTab]  = useState('all');
  const [typeFilter, setTypeFilter] = useState('All');
  const [priFilter,  setPriFilter]  = useState('All');
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);

  /* ── KPIs ─────────────────────────────────────────────────────────── */
  const unread      = notifs.filter(n => !n.read).length;
  const critical    = notifs.filter(n => n.priority === 'high').length;
  const warnings    = notifs.filter(n => n.priority === 'medium').length;
  const infoCount   = notifs.filter(n => n.priority === 'info').length;
  const unreadCrit  = notifs.filter(n => !n.read && n.priority === 'high').length;
  const approvalNotifs = notifs.filter(n => n.type === 'Approvals').length;

  /* ── filtered list ────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return notifs
      .filter(n =>
        (activeTab === 'all'       ? true :
         activeTab === 'unread'    ? !n.read :
         activeTab === 'critical'  ? n.priority === 'high' :
         activeTab === 'approvals' ? n.type === 'Approvals' : true) &&
        (typeFilter === 'All' || n.type === typeFilter) &&
        (priFilter  === 'All' || n.priority === priFilter) &&
        (!q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.type.toLowerCase().includes(q))
      )
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }, [notifs, activeTab, typeFilter, priFilter, search]);

  /* ── actions ──────────────────────────────────────────────────────── */
  function markRead(id)   { setNotifs(p => p.map(n => n.id === id ? { ...n, read:true } : n)); if (selected?.id === id) setSelected(s => ({...s, read:true})); }
  function markAllRead()  { setNotifs(p => p.map(n => ({...n, read:true}))); }
  function deleteNotif(id){ setNotifs(p => p.filter(n => n.id !== id)); if (selected?.id === id) setSelected(null); }
  function clearRead()    { setNotifs(p => p.filter(n => !n.read)); setSelected(null); }

  /* ── analytics ────────────────────────────────────────────────────── */
  const byType = useMemo(() => {
    const m = {};
    notifs.forEach(n => { m[n.type] = (m[n.type]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [notifs]);

  const byPriority = [
    { label:'Critical', count:critical,  color:'#C0392B', bg:'#f8d7da' },
    { label:'Warning',  count:warnings,  color:'#CA6F1E', bg:'#fff3cd' },
    { label:'Info',     count:infoCount, color:'#1B4F72', bg:'#d1ecf1' },
  ];

  const allTypes = ['All', ...new Set(notifs.map(n=>n.type))];

  const TABS = [
    { id:'all',       label:'All',           count:notifs.length         },
    { id:'unread',    label:'Unread',         count:unread                },
    { id:'critical',  label:'🔴 Critical',    count:critical              },
    { id:'approvals', label:'✅ Approvals',   count:approvalNotifs        },
  ];

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🔔 Notifications</h2>
          <p className={styles.pageMeta}>System alerts · Finance · Stores · Procurement · Approvals · Billing</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {unread > 0 && (
            <button className={styles.btnSecondary} onClick={markAllRead}>✓ Mark All Read ({unread})</button>
          )}
          <button className={styles.btnGhost} onClick={clearRead}>🗑 Clear Read</button>
          <button className={styles.btnGhost} onClick={() => {
            const rows = ['ID,Type,Priority,Title,Module,Time,Read'];
            notifs.forEach(n => rows.push(`${n.id},"${n.type}","${n.priority}","${n.title.replace(/"/g,'""')}","${n.module}","${n.ts}",${n.read}`));
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));
            a.download='notifications.csv'; a.click();
          }}>⬇ Export</button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Unread"          value={unread.toString()}         delta="Require attention"      deltaType={unread>0?'warn':'up'}      badge={unread>0?'Action':'Clear'} badgeType={unread>0?'warn':'good'} color={unread>0?'amber':'green'} />
        <KPICard label="Critical Alerts" value={critical.toString()}       delta={`${unreadCrit} unread`} deltaType={unreadCrit>0?'warn':'up'}  badge={unreadCrit>0?'Unread':'All Read'} badgeType={unreadCrit>0?'bad':'good'} color={critical>0?'red':'green'} />
        <KPICard label="Warnings"        value={warnings.toString()}       delta="Medium priority"        deltaType={warnings>0?'warn':'up'}    color="amber"  />
        <KPICard label="Info"            value={infoCount.toString()}      delta="Informational"          deltaType="neutral"                   color="blue"   />
        <KPICard label="Approval Alerts" value={approvalNotifs.toString()} delta="Approval notifications" deltaType={approvalNotifs>0?'warn':'neutral'} color="purple" />
        <KPICard label="Total"           value={notifs.length.toString()}  delta="All notifications"      deltaType="neutral"                   color="blue"   />
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap:14, alignItems:'start' }}>

        <div>
          {/* Tab strip */}
          <div className={styles.tabStrip}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setActiveTab(t.id)}
                className={`${styles.tabBtn} ${activeTab===t.id?styles.active:''}`}>
                {t.label}
                {t.count > 0 && (
                  <span style={{ marginLeft:5, padding:'1px 6px', borderRadius:8, fontSize:9, fontWeight:700,
                    background: activeTab===t.id ? 'var(--teal)' : 'var(--border)',
                    color: activeTab===t.id ? '#fff' : 'var(--muted)' }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className={styles.toolbar}>
            <input className={styles.toolbarSearch}
              placeholder="🔍 Search notifications…"
              value={search} onChange={e=>setSearch(e.target.value)} />
            <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
              value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
              {allTypes.map(t=><option key={t}>{t}</option>)}
            </select>
            <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
              value={priFilter} onChange={e=>setPriFilter(e.target.value)}>
              <option value="All">All Priorities</option>
              <option value="high">Critical</option>
              <option value="medium">Warning</option>
              <option value="info">Info</option>
            </select>
            <span className={styles.spacer}/>
            <span style={{ fontSize:11, color:'var(--muted)' }}>{filtered.length} notifications</span>
          </div>

          {/* Notification list */}
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:48, color:'var(--muted)', background:'#fff', borderRadius:10, boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🔔</div>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>No notifications</div>
              <div style={{ fontSize:11 }}>All clear — no alerts match your current filters.</div>
            </div>
          ) : (
            filtered.map(n => {
              const cfg = PRIORITY_CONFIG[n.priority];
              const isSelected = selected?.id === n.id;
              return (
                <div key={n.id}
                  onClick={() => { setSelected(n); if (!n.read) markRead(n.id); }}
                  style={{
                    display:'flex', gap:12, padding:'12px 14px', borderRadius:10, marginBottom:8, cursor:'pointer',
                    background: isSelected ? '#EBF5FB' : n.read ? '#fff' : cfg.bg,
                    border: `1px solid ${isSelected ? 'var(--teal)' : n.read ? 'var(--border)' : cfg.border}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,.05)', transition:'all .15s',
                  }}>

                  {/* Icon + unread dot */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, flexShrink:0, paddingTop:2 }}>
                    <span style={{ fontSize:20 }}>{n.icon}</span>
                    {!n.read && <span style={{ width:7, height:7, borderRadius:'50%', background:cfg.dot, display:'block' }}/>}
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                      <span style={{ fontWeight:n.read?600:800, fontSize:12, color:'var(--navy)', lineHeight:1.3 }}>{n.title}</span>
                      <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                        <span className={`${tableStyles.badge} ${tableStyles[cfg.badgeCls]}`}>{cfg.label}</span>
                        <span className={`${tableStyles.badge} ${tableStyles.grey}`}>{n.type}</span>
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {n.body}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
                      <span style={{ fontSize:10, color:'var(--muted)' }}>
                        {MODULE_ICONS[n.module]||'📌'} {n.module} · {timeAgo(n.ts)}
                      </span>
                      <div style={{ display:'flex', gap:5 }}>
                        {!n.read && (
                          <button onClick={e=>{e.stopPropagation();markRead(n.id);}}
                            style={{ padding:'2px 7px',background:'none',border:'1px solid var(--border)',borderRadius:5,fontSize:9,fontWeight:700,cursor:'pointer',color:'var(--navy)' }}>
                            Mark Read
                          </button>
                        )}
                        <button onClick={e=>{e.stopPropagation();deleteNotif(n.id);}}
                          style={{ padding:'2px 7px',background:'none',border:'1px solid #f5c6c6',borderRadius:5,fontSize:9,fontWeight:700,cursor:'pointer',color:'var(--red)' }}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Detail side panel ──────────────────────────────────────── */}
        {selected && (
          <div style={{ position:'sticky', top:72 }}>
            <div className={styles.card} style={{ border:`1.5px solid ${PRIORITY_CONFIG[selected.priority].border}`, marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <span style={{ fontSize:28 }}>{selected.icon}</span>
                <button onClick={()=>setSelected(null)} style={{ background:'none',border:'none',fontSize:18,cursor:'pointer',color:'var(--muted)',lineHeight:1 }}>✕</button>
              </div>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--navy)', lineHeight:1.4, marginBottom:8 }}>{selected.title}</div>
              <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                <span className={`${tableStyles.badge} ${tableStyles[PRIORITY_CONFIG[selected.priority].badgeCls]}`}>
                  {PRIORITY_CONFIG[selected.priority].label}
                </span>
                <span className={`${tableStyles.badge} ${tableStyles.blue}`}>{selected.type}</span>
                <span className={`${tableStyles.badge} ${selected.read ? tableStyles.green : tableStyles.amber}`}>
                  {selected.read ? 'Read' : 'Unread'}
                </span>
              </div>
              <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.7, marginBottom:14 }}>{selected.body}</div>
              <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px', marginBottom:14 }}>
                {[
                  ['Module', `${MODULE_ICONS[selected.module]||''} ${selected.module}`],
                  ['Time',   new Date(selected.ts).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})],
                  ['Status', selected.read ? 'Read' : 'Unread'],
                ].map(([k,v])=>(
                  <div key={k} style={{ display:'flex',justifyContent:'space-between',fontSize:10,padding:'4px 0',borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontWeight:700, color:'var(--muted)' }}>{k}</span>
                    <span style={{ fontWeight:600, color:'var(--navy)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8, flexDirection:'column' }}>
                {!selected.read && (
                  <button onClick={()=>markRead(selected.id)} className={styles.btnSecondary}>✓ Mark as Read</button>
                )}
                <button onClick={()=>deleteNotif(selected.id)}
                  style={{ padding:'6px 14px',background:'#fff',color:'var(--red)',border:'1.5px solid var(--red)',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer' }}>
                  🗑 Dismiss
                </button>
              </div>
            </div>

            {/* Priority breakdown mini-cards */}
            <div>
              <div style={{ fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.4,marginBottom:8 }}>Priority Breakdown</div>
              {byPriority.map(p=>(
                <div key={p.label} style={{ background:p.bg,borderRadius:8,padding:'8px 12px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <span style={{ fontSize:11,fontWeight:700,color:p.color }}>{p.label}</span>
                  <span style={{ fontSize:16,fontWeight:800,color:p.color }}>{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Analytics ───────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:20 }}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Notifications by Type</div>
          <div style={{ height:200 }}>
            <Bar
              data={{ labels:byType.map(e=>e[0]), datasets:[{ data:byType.map(e=>e[1]), backgroundColor:COLORS, borderRadius:4 }] }}
              options={{ ...BASE, scales:{ x:{grid:{display:false},ticks:{font:FONT}}, y:{grid:{color:GRID},ticks:{font:FONT,stepSize:1}} } }}
            />
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Notifications by Priority</div>
          <div style={{ height:200 }}>
            <Doughnut
              data={{ labels:byPriority.map(p=>p.label), datasets:[{ data:byPriority.map(p=>p.count), backgroundColor:['#C0392B','#CA6F1E','#1B4F72'], borderWidth:2, borderColor:'#fff' }] }}
              options={{ responsive:true,maintainAspectRatio:false,cutout:'58%',plugins:{ legend:LEG_B } }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}