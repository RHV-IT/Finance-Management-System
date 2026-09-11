'use client';
 
import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import PageRenderer from '../../components/PageRenderer';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import { fmt } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
 
const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
const COLORS = ['#1a2d5a','#2a4080','#C9A84C','#1D9E75','#888','#D85A30','#7F77DD'];
 
const TABS = [
  { id:'overview',     label:'Overview'     },
  { id:'workforce',    label:'Workforce'    },
  { id:'learning',     label:'L&D'          },
  { id:'disciplinary', label:'Disciplinary' },
  { id:'initiatives',  label:'Initiatives'  },
];
 
function SheetError({ label, error, onRefetch }) {
  const notConnected = error?.includes('not connected') || error?.includes('Sheet ID') || error?.includes('No connection');
  return (
    <div style={{ background: notConnected ? '#FFF9E6' : '#FEECEC', border: `1.5px solid ${notConnected ? '#F4D03F' : '#F1948A'}`, borderRadius: 10, padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{notConnected ? '🔗' : '⚠️'}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
        {label}: {notConnected ? 'Not connected yet' : 'Failed to load'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>{error}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <a href="/settings" style={{ padding: '8px 18px', background: 'var(--navy)', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>⚙ Go to Settings</a>
        {onRefetch && !notConnected && (
          <button onClick={onRefetch} style={{ padding: '8px 18px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>↻ Retry</button>
        )}
      </div>
    </div>
  );
}
 
function Loading({ message }) {
  return <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)', fontSize: 12 }}>⏳ {message}</div>;
}
 
function tabGuard(conn, moduleName, state) {
  if (!conn) return <SheetError label={moduleName} error={`No connection with module "${moduleName}" is configured yet. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "hr".`} />;
  if (state.loading) return <Loading message={`Loading "${conn.label}" from Google Sheets…`} />;
  if (state.error) return <SheetError label={conn.label} error={state.error} onRefetch={state.refetch} />;
  if (!state.rows || state.rows.length === 0) return <SheetError label={conn.label} error={`The sheet connected fine, but the "${conn.tabName}" tab returned 0 rows.`} onRefetch={state.refetch} />;
  return null;
}
 
export default function HRPage() {
  const [tab, setTab] = useState('overview');
  const [initFilter, setInitFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('');
 
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const workforceConn = getByModule('hr_workforce');
  const headcountConn = getByModule('hr_headcount');
  const sessionsConn  = getByModule('hr_training_sessions');
  const pillarsConn   = getByModule('hr_training_pillars');
  const elearningConn = getByModule('hr_elearning');
  const disciplineConn= getByModule('hr_disciplinary_cases');
  const initConn      = getByModule('hr_initiatives');
  const blockersConn  = getByModule('hr_blockers');
 
  const workforceState = useSheetData(workforceConn);
  const headcountState = useSheetData(headcountConn);
  const sessionsState  = useSheetData(sessionsConn);
  const pillarsState   = useSheetData(pillarsConn);
  const elearningState = useSheetData(elearningConn);
  const disciplineState= useSheetData(disciplineConn);
  const initState      = useSheetData(initConn);
  const blockersState  = useSheetData(blockersConn);
 
  if (configLoading) return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
  if (configError) return (
    <div>
      <SheetError label="Sheet configuration" error={`Could not load the connections manifest: ${configError}`} onRefetch={reload} />
    </div>
  );
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>👥 HR Unit Dashboard</h2>
          <p className={styles.pageMeta}>Workforce · Learning & Development · Disciplinary · Initiatives</p>
        </div>
      </div>
 
      <div className={styles.tabStrip}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`${styles.tabBtn} ${tab===t.id ? styles.active : ''}`}>{t.label}</button>
        ))}
      </div>
 
      {/* ══ OVERVIEW ══════════════════════════════════════════ */}
      {tab === 'overview' && (() => {
        const hcGuard = tabGuard(workforceConn, 'hr_workforce', workforceState);
        if (hcGuard) return hcGuard;
        const pillarGuard = tabGuard(pillarsConn, 'hr_training_pillars', pillarsState);
        const initGuard = tabGuard(initConn, 'hr_initiatives', initState);
 
        const hc = workforceState.rows;
        const periods = [...new Set(hc.map(r=>r._period).filter(Boolean))].sort();
        const latest = periods[periods.length-1];
        const latestRows = hc.filter(r=>r._period===latest);
        const totalHeadcount = latestRows.reduce((s,r)=>s+n(r.headcount),0);
        const totalNewHires = hc.reduce((s,r)=>s+n(r.newHires),0);
        const totalExits = hc.reduce((s,r)=>s+n(r.exits),0);
        const attritionRate = totalHeadcount>0 ? (totalExits/totalHeadcount*100).toFixed(1) : 0;
        const ldCompletion = !pillarGuard && pillarsState.rows.length
          ? (pillarsState.rows.reduce((s,r)=>s+n(r.completionPct),0)/pillarsState.rows.length).toFixed(0)
          : null;
 
        return (
          <>
            <div style={{ fontSize:10.5, color:'var(--muted)', marginBottom:12 }}>
              "Open roles" and "Punctuality rate" from the original mockup are dropped — neither has a
              real data source anywhere in this system (no vacancy/requisition sheet, no time-clock data).
            </div>
            <div className={styles.kpiGrid} style={{ marginBottom: 14 }}>
              <KPICard label={`Headcount (${latest || 'latest'})`} value={totalHeadcount} delta="active staff" deltaType="neutral" color="navy" />
              <KPICard label="New Hires" value={totalNewHires} delta="across all periods in sheet" deltaType="up" color="teal" />
              <KPICard label="Attrition Rate" value={`${attritionRate}%`} deltaType={+attritionRate>8?'down':'up'} color={+attritionRate>8?'red':'green'} />
              {ldCompletion !== null && <KPICard label="L&D Completion" value={`${ldCompletion}%`} delta="avg across pillars" deltaType="neutral" color="purple" />}
            </div>
 
            <div style={{ marginBottom: 14 }}>
              {/* Reads viz-hrhc-001 — trend mode by default (sum headcount per period) */}
              <PageRenderer page="hr" module="hr_workforce"/>
            </div>
 
            {!initGuard && (
              <div className={styles.card}>
                <div className={styles.cardTitle}>Initiative Status at a Glance</div>
                {initState.rows.slice(0,8).map((i,idx) => (
                  <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize:12 }}>{i.initiative}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{i.owner} · {i.target}</div>
                    </div>
                    <span className={`${tableStyles.badge} ${i.status==='Complete'?tableStyles.green:i.status==='At Risk'?tableStyles.red:i.status==='Planned'?tableStyles.grey:tableStyles.blue}`}>{i.status}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}
 
      {/* ══ WORKFORCE ═════════════════════════════════════════ */}
      {tab === 'workforce' && (() => {
        const guard = tabGuard(headcountConn, 'hr_headcount', headcountState);
        if (guard) return guard;
 
        const hc = headcountState.rows;
        const periods = [...new Set(hc.map(r=>r._period).filter(Boolean))].sort();
        const latest = periods[periods.length-1];
        const latestRows = hc.filter(r=>r._period===latest);
 
        const empType = latestRows.reduce((acc,r)=>{
          acc.permanent += n(r.permanent); acc.contract += n(r.contract); acc.intern += n(r.intern);
          return acc;
        }, { permanent:0, contract:0, intern:0 });
        const empTypeData = [
          { name:'Permanent', value: empType.permanent },
          { name:'Contract', value: empType.contract },
          { name:'Intern/House Officer', value: empType.intern },
        ].filter(d=>d.value>0);
 
        const filteredTable = deptFilter ? latestRows.filter(r=>r.department===deptFilter) : latestRows;
        const depts = [...new Set(hc.map(r=>r.department).filter(Boolean))];
 
        return (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              {/* Same viz as Overview — select a specific period from its dropdown to see dept breakdown */}
              <PageRenderer page="hr" module="hr_headcount" only={['bar']} />
 
              <div className={styles.card}>
                <div className={styles.cardTitle}>Employment Type ({latest})</div>
                {empTypeData.length === 0 ? (
                  <div style={{ textAlign:'center', padding:24, color:'var(--muted)', fontSize:11 }}>No employment-type breakdown for this period.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={empTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {empTypeData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
 
            <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
              <button onClick={()=>setDeptFilter('')} style={{ padding:'4px 12px', borderRadius:99, fontSize:11, border:'1px solid var(--border)', background: !deptFilter?'var(--navy)':'#fff', color: !deptFilter?'#fff':'var(--text)', cursor:'pointer' }}>All</button>
              {depts.map(d => (
                <button key={d} onClick={()=>setDeptFilter(d)} style={{ padding:'4px 12px', borderRadius:99, fontSize:11, border:'1px solid var(--border)', background: deptFilter===d?'var(--navy)':'#fff', color: deptFilter===d?'#fff':'var(--text)', cursor:'pointer' }}>{d}</button>
              ))}
            </div>
 
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Full Headcount Table ({latest})</div>
              <table className={tableStyles.table}>
                <thead><tr><th>Department</th><th className={tableStyles.right}>Headcount</th><th className={tableStyles.right}>New Hires</th><th className={tableStyles.right}>Exits</th><th className={tableStyles.right}>Net Change</th></tr></thead>
                <tbody>
                  {filteredTable.map((r,i) => {
                    const net = n(r.newHires)-n(r.exits);
                    return (
                      <tr key={i}>
                        <td>{r.department}</td>
                        <td className={tableStyles.right}><strong>{n(r.headcount)}</strong></td>
                        <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{n(r.newHires)}</td>
                        <td className={tableStyles.right} style={{ color:'var(--red)' }}>{n(r.exits)}</td>
                        <td className={tableStyles.right} style={{ color: net>=0?'var(--teal)':'var(--red)' }}>{net>=0?'+':''}{net}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
 
            <div className={styles.card} style={{ marginTop:14 }}>
              <div className={styles.cardTitle}>Attrition by Department ({latest})</div>
              {latestRows.map((r,i) => {
                const rate = n(r.headcount)>0 ? (n(r.exits)/n(r.headcount)*100) : 0;
                return (
                  <div key={i} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                      <span>{r.department}</span><span style={{ fontWeight:700 }}>{rate.toFixed(1)}%</span>
                    </div>
                    <div style={{ height:8, background:'#eef0f5', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(100,rate*3)}%`, background: rate>15?'#E24B4A':rate>8?'#C9A84C':'#1D9E75' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
 
      {/* ══ L&D ═══════════════════════════════════════════════ */}
      {tab === 'learning' && (() => {
        const sessGuard = tabGuard(sessionsConn, 'hr_training_sessions', sessionsState);
        const pillarGuard = tabGuard(pillarsConn, 'hr_training_pillars', pillarsState);
        const elGuard = tabGuard(elearningConn, 'hr_elearning', elearningState);
        if (sessGuard && pillarGuard && elGuard) return sessGuard;
 
        const sessions = sessionsState.rows || [];
        const staffTrained = sessions.reduce((s,r)=>s+n(r.participants),0);
        const monthMap = {};
        sessions.forEach(r => { const p = r._period || 'unknown'; monthMap[p] = (monthMap[p]||0)+1; });
        const monthlyCounts = Object.entries(monthMap).sort((a,b)=>a[0].localeCompare(b[0]));
 
        return (
          <>
            {!sessGuard && (
              <>
                <div style={{ fontSize:10.5, color:'var(--muted)', marginBottom:12 }}>
                  "Staff trained" is a sum of per-session participant counts, not distinct people — anyone
                  attending more than one session gets counted each time. A true unique-person count would
                  need one row per (employee, session) instead of one row per session.
                </div>
                <div className={styles.kpiGrid} style={{ marginBottom: 14 }}>
                  <KPICard label="Training Sessions Run" value={sessions.length} color="purple" />
                  <KPICard label="Staff Trained (sum)" value={staffTrained} delta="not distinct people — see note" deltaType="neutral" color="navy" />
                  <KPICard label="Avg Satisfaction" value={(sessions.reduce((s,r)=>s+n(r.satisfaction),0)/(sessions.length||1)).toFixed(1)} delta="out of 5" deltaType="neutral" color="teal" />
                </div>
                <div className={styles.card} style={{ marginBottom:14 }}>
                  <div className={styles.cardTitle}>Monthly Training Sessions</div>
                  <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:120, padding:'8px 0' }}>
                    {monthlyCounts.map(([p,c],i) => {
                      const max = Math.max(...monthlyCounts.map(x=>x[1]),1);
                      return (
                        <div key={p} style={{ flex:1, textAlign:'center' }}>
                          <div style={{ height:`${c/max*90}px`, background:'#7F77DD', borderRadius:'4px 4px 0 0' }} />
                          <div style={{ fontSize:10, marginTop:4 }}>{p}</div>
                          <div style={{ fontSize:10, fontWeight:700 }}>{c}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
 
            {!pillarGuard && (
              <div className={styles.card} style={{ marginBottom:14 }}>
                <div className={styles.cardTitle}>H1 Training Completion by Pillar</div>
                {pillarsState.rows.map((p,i) => (
                  <div key={i} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                      <span>{p.pillar}</span><span style={{ fontWeight:700, color:COLORS[i%COLORS.length] }}>{n(p.completionPct)}%</span>
                    </div>
                    <div style={{ height:8, background:'#eef0f5', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${n(p.completionPct)}%`, background:COLORS[i%COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
 
            {!elGuard && (
              <PageRenderer page="hr" module="hr_elearning" only={['table']} />
            )}
          </>
        );
      })()}
 
      {/* ══ DISCIPLINARY ══════════════════════════════════════ */}
      {tab === 'disciplinary' && (() => {
        const guard = tabGuard(disciplineConn, 'hr_disciplinary_cases', disciplineState);
        if (guard) return guard;
 
        const cases = disciplineState.rows;
        const countByType = t => cases.filter(c => (c.type||'').toLowerCase().includes(t)).length;
        const resolved = cases.filter(c=>c.status==='Resolved').length;
        const pending = cases.filter(c=>c.status==='Pending Panel').length;
 
        const byDept = {};
        cases.forEach(c => { const d = c.dept||'Unspecified'; byDept[d]=(byDept[d]||0)+1; });
        const deptPie = Object.entries(byDept).map(([name,value])=>({name,value}));
 
        return (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:16 }}>
              {[
                { label:'Query Letters', value: countByType('query'), color:'#D85A30', bg:'#FAECE7' },
                { label:'Suspensions', value: countByType('suspension'), color:'#BA7517', bg:'#FAEEDA' },
                { label:'Abscondments', value: countByType('abscond'), color:'#E24B4A', bg:'#FCEBEB' },
                { label:'Cases Resolved', value: resolved, color:'#1D9E75', bg:'#E1F5EE' },
                { label:'Pending Panel', value: pending, color:'#7F77DD', bg:'#EEEDFE' },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'14px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:10, fontWeight:600, color:s.color, marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>
 
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Disciplinary Cases by Department</div>
                {/* Bespoke — VizPie only sums a numeric field, not a row count */}
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={deptPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {deptPie.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
 
              {/* Reads viz-hrdc-001 */}
              <PageRenderer page="hr" module="hr_disciplinary_cases" only={['table']} />
            </div>
          </>
        );
      })()}
 
      {/* ══ INITIATIVES ═══════════════════════════════════════ */}
      {tab === 'initiatives' && (() => {
        const initGuard = tabGuard(initConn, 'hr_initiatives', initState);
        const blockGuard = tabGuard(blockersConn, 'hr_blockers', blockersState);
        if (initGuard && blockGuard) return initGuard;
 
        const filtered = initGuard ? [] : (initFilter === 'all' ? initState.rows : initState.rows.filter(i => i.status === initFilter));
 
        return (
          <>
            {!initGuard && (
              <div className={tableStyles.tableBox} style={{ marginBottom:14 }}>
                <div className={tableStyles.tableTitle}>H1 2026 HR Initiative Tracker</div>
                <div style={{ display:'flex', gap:6, padding:'0 16px 12px', flexWrap:'wrap' }}>
                  {['all','Complete','In Progress','At Risk','Planned'].map(f => (
                    <button key={f} onClick={()=>setInitFilter(f)} style={{ padding:'4px 12px', borderRadius:99, fontSize:11, border:'1px solid var(--border)', background: initFilter===f?'var(--navy)':'#fff', color: initFilter===f?'#fff':'var(--text)', cursor:'pointer' }}>{f === 'all' ? 'All' : f}</button>
                  ))}
                </div>
                <table className={tableStyles.table}>
                  <thead><tr><th>Initiative</th><th>Owner</th><th>Target</th><th>Status</th></tr></thead>
                  <tbody>
                    {filtered.map((i,idx) => (
                      <tr key={idx}>
                        <td>{i.initiative}</td>
                        <td>{i.owner}</td>
                        <td>{i.target}</td>
                        <td><span className={`${tableStyles.badge} ${i.status==='Complete'?tableStyles.green:i.status==='At Risk'?tableStyles.red:i.status==='Planned'?tableStyles.grey:tableStyles.blue}`}>{i.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
 
            {!blockGuard && (
              <div className={styles.card}>
                <div className={styles.cardTitle}>Open Issues & Blockers</div>
                {blockersState.rows.map((b,i) => {
                  const high = (b.severity||'').toLowerCase()==='high';
                  return (
                    <div key={i} style={{ background: high?'#FCEBEB':'#FAEEDA', borderLeft:`3px solid ${high?'#A32D2D':'#854F0B'}`, borderRadius:8, padding:'10px 14px', marginBottom:10 }}>
                      <div style={{ fontSize:12, fontWeight:600, color: high?'#A32D2D':'#854F0B', marginBottom:3 }}>{b.title}</div>
                      <div style={{ fontSize:12, color:'#555' }}>{b.detail}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}