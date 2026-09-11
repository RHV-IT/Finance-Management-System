'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { fmt, COLORS } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
 
ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Filler, Tooltip, Legend
);
 
/* ── chart defaults ─────────────────────────────────────────────────────── */
const FONT   = { family: "'Inter','Segoe UI',Arial,sans-serif", size: 10 };
const GRID   = 'rgba(0,0,0,0.05)';
const BASE   = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const X_NONE = { grid: { display: false }, ticks: { font: FONT } };
const Y_BASE = { grid: { color: GRID }, ticks: { font: FONT } };
const Y_NGN  = { grid: { color: GRID }, ticks: { font: FONT, callback: v => '₦' + v + 'M' } };
const Y_DAYS = { grid: { color: GRID }, ticks: { font: FONT, callback: v => v + 'd' } };
const Y_PCT  = { grid: { color: GRID }, ticks: { font: FONT, callback: v => v + '%' } };
const LEG_B  = { display: true, position: 'bottom', labels: { font: FONT, boxWidth: 10 } };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 
/* ── seed data ──────────────────────────────────────────────────────────── */
const MONTHLY_PO_VALUE    = [18.2, 24.8, 20.4, 32.6, 28.9, 21.2, 19.8, 35.4, 31.2, 27.8, 22.4, null];
const MONTHLY_CYCLE_DAYS  = [12,   11,   10,   10,   9,    10,   8,    8,    9,    10,   9,    null];
const MONTHLY_PO_COUNT    = [14,   18,   15,   22,   20,   16,   14,   24,   21,   19,   16,   null];
const MONTHLY_ON_TIME     = [88,   90,   89,   91,   92,   93,   94,   92,   91,   90,   92,   null];
const MONTHLY_SAVINGS_PCT  = [4.2, 5.1,  3.8,  6.2,  5.5,  4.8,  5.0,  6.8,  5.9,  4.4,  5.2,  null];
const MONTHLY_APPROVALS   = [85,   88,   90,   86,   88,   92,   90,   89,   87,   88,   87,   null];
 
const VENDOR_PERFORMANCE = [
  { vendor:'Pharmaplus Nigeria Ltd',    category:'Pharmaceuticals',   orders:24, onTime:23, qualityPass:24, avgLead:2.1, spend:38_500_000, savings:1_925_000, rating:4.8, defects:0 },
  { vendor:'MedEquip Supplies Ltd',     category:'Medical Equipment', orders:14, onTime:13, qualityPass:13, avgLead:3.4, spend:22_800_000, savings:912_000,   rating:4.5, defects:1 },
  { vendor:'HealthCare Distributors',   category:'Consumables',       orders:18, onTime:17, qualityPass:18, avgLead:2.8, spend:18_400_000, savings:736_000,   rating:4.2, defects:0 },
  { vendor:'Lagos Medical Stores',      category:'Pharmaceuticals',   orders:12, onTime:12, qualityPass:12, avgLead:2.0, spend:14_200_000, savings:710_000,   rating:4.6, defects:0 },
  { vendor:'DiagnosTech Nigeria',       category:'Lab Reagents',      orders: 8, onTime: 8, qualityPass: 8, avgLead:3.1, spend: 8_300_000, savings:332_000,   rating:4.7, defects:0 },
  { vendor:'ProMed Nigeria',            category:'Consumables',       orders:16, onTime:14, qualityPass:15, avgLead:4.2, spend:11_600_000, savings:348_000,   rating:3.9, defects:1 },
  { vendor:'Clinix Supplies Ltd',       category:'Surgical Supplies', orders:10, onTime: 9, qualityPass:10, avgLead:3.0, spend: 9_700_000, savings:388_000,   rating:4.1, defects:0 },
  { vendor:'ImageCare Ltd',             category:'Radiology',         orders: 6, onTime: 6, qualityPass: 6, avgLead:3.5, spend: 6_200_000, savings:248_000,   rating:4.4, defects:0 },
];
 
const SPEND_CATEGORIES = [
  { category:'Pharmaceuticals',   spend:52_700_000, budget:60_000_000, pos:36, savings:2_635_000 },
  { category:'Consumables',       spend:30_000_000, budget:35_000_000, pos:34, savings:1_500_000 },
  { category:'Medical Equipment', spend:22_800_000, budget:25_000_000, pos:14, savings:912_000   },
  { category:'Lab Reagents',      spend: 8_300_000, budget:10_000_000, pos: 8, savings:332_000   },
  { category:'Surgical Supplies', spend: 9_700_000, budget:12_000_000, pos:10, savings:388_000   },
  { category:'Radiology',         spend: 6_200_000, budget: 8_000_000, pos: 6, savings:248_000   },
  { category:'Plant & Machinery', spend: 6_500_000, budget: 8_000_000, pos: 4, savings:260_000   },
  { category:'Office Supplies',   spend: 1_850_000, budget: 2_500_000, pos: 8, savings: 74_000   },
];
 
const REQUISITION_PIPELINE = [
  { stage:'Submitted',                  count:2,  value:4_880_000,  pct:100 },
  { stage:'Gate 1 — Pending Mgmt',      count:2,  value:4_880_000,  pct:100 },
  { stage:'Gate 1 — Approved',          count:18, value:48_200_000, pct:100 },
  { stage:'Procurement Review',         count:3,  value:7_050_000,  pct:100 },
  { stage:'Gate 2 — Approved',          count:14, value:38_600_000, pct:100 },
  { stage:'PO Issued',                  count:11, value:30_200_000, pct:100 },
  { stage:'Delivered',                  count: 9, value:24_800_000, pct:100 },
  { stage:'Goods Received (Store)',     count: 8, value:22_400_000, pct:100 },
  { stage:'Awaiting Payment',           count: 4, value:12_100_000, pct:100 },
  { stage:'Completed',                  count:42, value:92_800_000, pct:100 },
];
 
/* ── helpers ─────────────────────────────────────────────────────────────── */
function ProgressBar({ pct, color = '#117A65', height = 7 }) {
  return (
    <div style={{ background:'#e8ecf0', borderRadius:4, height, overflow:'hidden', width:'100%' }}>
      <div style={{ height:'100%', borderRadius:4, background:color, width:`${Math.min(100,pct)}%`, transition:'width .6s' }} />
    </div>
  );
}
 
function Stars({ rating }) {
  return (
    <span style={{ color:'#F39C12', fontSize:11, fontWeight:700 }}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
      <span style={{ color:'var(--muted)', marginLeft:4, fontSize:10 }}>{rating.toFixed(1)}</span>
    </span>
  );
}
 
function RateBadge({ val, target, higherIsBad, suffix = '' }) {
  const good = higherIsBad ? val <= target : val >= target;
  const warn = higherIsBad ? val <= target * 1.15 : val >= target * 0.9;
  return (
    <span className={`${tableStyles.badge} ${good ? tableStyles.green : warn ? tableStyles.amber : tableStyles.red}`}>
      {good ? '✓ Target' : warn ? 'Monitor' : 'Behind'}
    </span>
  );
}
 
/* ════════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function ProcKPIPage() {
  const [activeTab, setActiveTab] = useState('overview');
 
  /* ── totals ───────────────────────────────────────────────────────── */
  const ytdSpend       = SPEND_CATEGORIES.reduce((s,c) => s + c.spend, 0);
  const ytdBudget      = SPEND_CATEGORIES.reduce((s,c) => s + c.budget, 0);
  const ytdSavings     = SPEND_CATEGORIES.reduce((s,c) => s + c.savings, 0);
  const totalPOs       = MONTHLY_PO_COUNT.filter(v=>v!=null).reduce((s,v)=>s+v,0);
  const avgCycleDays   = +(MONTHLY_CYCLE_DAYS.filter(v=>v!=null).reduce((s,v)=>s+v,0) / MONTHLY_CYCLE_DAYS.filter(v=>v!=null).length).toFixed(1);
  const avgOnTime      = +(MONTHLY_ON_TIME.filter(v=>v!=null).reduce((s,v)=>s+v,0) / MONTHLY_ON_TIME.filter(v=>v!=null).length).toFixed(1);
  const avgApprovalRate= +(MONTHLY_APPROVALS.filter(v=>v!=null).reduce((s,v)=>s+v,0) / MONTHLY_APPROVALS.filter(v=>v!=null).length).toFixed(1);
  const savingsRate    = +(ytdSavings / ytdSpend * 100).toFixed(1);
  const budgetUtil     = +(ytdSpend / ytdBudget * 100).toFixed(1);
  const activeVendors  = VENDOR_PERFORMANCE.length;
  const avgVendorRating= +(VENDOR_PERFORMANCE.reduce((s,v)=>s+v.rating,0)/activeVendors).toFixed(1);
 
  const TABS = [
    { id:'overview',  label:'📊 Overview'           },
    { id:'pipeline',  label:'🔄 P2P Pipeline'        },
    { id:'vendors',   label:'🚚 Vendor Performance'  },
    { id:'spend',     label:'💰 Spend Analysis'      },
    { id:'savings',   label:'💡 Savings Tracker'     },
  ];
 
  function exportCSV() {
    const rows = ['Vendor,Category,Orders,On-Time%,Quality%,Avg Lead(d),Spend,Savings,Rating'];
    VENDOR_PERFORMANCE.forEach(v => {
      const otPct = (v.onTime/v.orders*100).toFixed(0);
      const qPct  = (v.qualityPass/v.orders*100).toFixed(0);
      rows.push(`"${v.vendor}","${v.category}",${v.orders},${otPct}%,${qPct}%,${v.avgLead},${v.spend},${v.savings},${v.rating}`);
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type:'text/csv' }));
    a.download = 'procurement_kpi.csv'; a.click();
  }
 
  return (
    <div>
 
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>📦 Procurement KPIs</h2>
          <p className={styles.pageMeta}>P2P cycle · Vendor performance · Spend vs budget · Savings — FY 2025</p>
        </div>
        <button className={styles.btnGhost} onClick={exportCSV}>⬇ Export CSV</button>
      </div>
 
      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="YTD Spend"             value={fmt(ytdSpend)}           delta={`${budgetUtil}% of budget`}       deltaType={budgetUtil<=100?'up':'warn'}     color="blue"   />
        <KPICard label="Budget Remaining"      value={fmt(ytdBudget-ytdSpend)} delta={`${(100-budgetUtil).toFixed(1)}% unspent`} deltaType="up"                    color="green"  />
        <KPICard label="Cost Savings YTD"      value={fmt(ytdSavings)}         delta={`${savingsRate}% savings rate`}   deltaType={savingsRate>=5?'up':'warn'}      badge={savingsRate>=5?'On Target':'Monitor'} badgeType={savingsRate>=5?'good':'warn'} color={savingsRate>=5?'green':'amber'} />
        <KPICard label="Avg P2P Cycle (Days)"  value={`${avgCycleDays} days`}  delta="Target ≤ 14 days"                 deltaType={avgCycleDays<=14?'up':'warn'}   badge={avgCycleDays<=14?'On Target':'Behind'} badgeType={avgCycleDays<=14?'good':'warn'} color={avgCycleDays<=14?'green':'amber'} />
        <KPICard label="Vendor On-Time Deliv." value={`${avgOnTime}%`}         delta="Target ≥ 90%"                     deltaType={avgOnTime>=90?'up':'warn'}       badge={avgOnTime>=90?'On Target':'Monitor'} badgeType={avgOnTime>=90?'good':'warn'} color={avgOnTime>=90?'green':'amber'} />
        <KPICard label="Approval Rate"         value={`${avgApprovalRate}%`}   delta="Target ≥ 90% within 48hrs"       deltaType={avgApprovalRate>=90?'up':'warn'} color={avgApprovalRate>=90?'green':'amber'} />
        <KPICard label="Purchase Orders YTD"   value={totalPOs.toString()}     delta="Total POs issued"                  deltaType="neutral"                        color="purple" />
        <KPICard label="Avg Vendor Rating"     value={`${avgVendorRating} ★`} delta={`${activeVendors} active vendors`} deltaType={avgVendorRating>=4?'up':'warn'} badge={avgVendorRating>=4?'Good':'Monitor'} badgeType={avgVendorRating>=4?'good':'warn'} color={avgVendorRating>=4?'green':'amber'} />
      </div>
 
      {/* ── Tab Strip ───────────────────────────────────────────────────── */}
      <div className={styles.tabStrip}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`${styles.tabBtn} ${activeTab === t.id ? styles.active : ''}`}>
            {t.label}
          </button>
        ))}
      </div>
 
      {/* ════ TAB: Overview ════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Score banner */}
          <div style={{ background:'linear-gradient(135deg,var(--navy),#CA6F1E)', borderRadius:12, padding:'18px 22px', marginBottom:16, display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <div style={{ fontSize:40, fontWeight:900, color:'#fff' }}>B+</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.7)' }}>Performance</div>
            </div>
            <div style={{ borderLeft:'1px solid rgba(255,255,255,.25)', paddingLeft:20, flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#fff', marginBottom:6 }}>Procurement Unit — FY 2025 Performance</div>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                {[
                  { label:'Budget Utilisation', val:`${budgetUtil}%`,            good:budgetUtil<=100 },
                  { label:'P2P Cycle',           val:`${avgCycleDays}d avg`,      good:avgCycleDays<=14 },
                  { label:'On-Time Delivery',    val:`${avgOnTime}%`,             good:avgOnTime>=90   },
                  { label:'Savings Rate',        val:`${savingsRate}%`,           good:savingsRate>=5  },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:.3 }}>{m.label}</div>
                    <div style={{ fontSize:14, fontWeight:800, color: m.good ? '#4dd0b8' : '#F39C12' }}>{m.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
 
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {/* Spend vs Budget */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Monthly PO Spend Value (₦M)</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{
                    labels: MONTHS.slice(0,11),
                    datasets:[{ data:MONTHLY_PO_VALUE.filter(v=>v!=null), backgroundColor:COLORS, borderRadius:4 }],
                  }}
                  options={{ ...BASE, scales:{ x:X_NONE, y:Y_NGN } }}
                />
              </div>
            </div>
 
            {/* P2P cycle trend */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>P2P Cycle Time — Days (Target ≤ 14)</div>
              <div style={{ height:220 }}>
                <Line
                  data={{
                    labels: MONTHS.slice(0,11),
                    datasets:[
                      { label:'Cycle Days', data:MONTHLY_CYCLE_DAYS.filter(v=>v!=null), borderColor:'#1B4F72', backgroundColor:'rgba(27,79,114,.1)', fill:true, tension:.35, borderWidth:2, pointRadius:3 },
                      { label:'Target 14d', data:Array(11).fill(14), borderColor:'#C0392B', borderDash:[5,4], borderWidth:1.5, pointRadius:0, fill:false },
                    ],
                  }}
                  options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:LEG_B }, scales:{ x:X_NONE, y:Y_DAYS } }}
                />
              </div>
            </div>
          </div>
 
          {/* KPI Summary table */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Procurement KPI Summary — FY 2025</div>
            <table className={tableStyles.table}>
              <thead>
                <tr><th>KPI</th><th className={tableStyles.right}>Target</th><th className={tableStyles.right}>Actual</th><th className={tableStyles.right}>Variance</th><th style={{ minWidth:130 }}>Progress</th><th>Rating</th></tr>
              </thead>
              <tbody>
                {[
                  { name:'YTD Spend vs Budget',         target:ytdBudget,  actual:ytdSpend,        unit:'₦',    higherIsBad:false, note:'Should be ≤ budget' },
                  { name:'Budget Utilisation Rate',      target:100,        actual:+budgetUtil,     unit:'%',    higherIsBad:false },
                  { name:'Cost Savings Rate',            target:5,          actual:savingsRate,     unit:'%',    higherIsBad:false },
                  { name:'Avg P2P Cycle Time',           target:14,         actual:avgCycleDays,    unit:'days', higherIsBad:true  },
                  { name:'Vendor On-Time Delivery',      target:90,         actual:avgOnTime,       unit:'%',    higherIsBad:false },
                  { name:'Requisition Approval Rate',    target:90,         actual:avgApprovalRate, unit:'%',    higherIsBad:false },
                  { name:'Purchase Orders Issued',       target:150,        actual:totalPOs,        unit:'count',higherIsBad:false },
                  { name:'Avg Vendor Rating',            target:4.0,        actual:avgVendorRating, unit:'stars',higherIsBad:false },
                ].map((k,i) => {
                  const pct   = k.target ? (k.actual/k.target*100) : 0;
                  const achPct= k.higherIsBad ? (k.actual<=k.target?100:k.target/k.actual*100) : Math.min(100,pct);
                  const good  = k.higherIsBad ? k.actual<=k.target : pct>=100;
                  const warn  = k.higherIsBad ? pct<=120 : pct>=90;
                  const color = good?'#117A65':warn?'#CA6F1E':'#C0392B';
                  const fmtV  = v => k.unit==='₦'?fmt(v):k.unit==='%'?v.toFixed(1)+'%':k.unit==='days'?v.toFixed(1)+'d':k.unit==='stars'?v.toFixed(1)+' ★':v.toLocaleString();
                  const varV  = k.actual-k.target;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight:600 }}>{k.name}{k.note&&<span style={{ fontSize:9,color:'var(--muted)',marginLeft:6 }}>({k.note})</span>}</td>
                      <td className={tableStyles.right}>{fmtV(k.target)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700, color }}>{fmtV(k.actual)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700, color: k.higherIsBad?(varV<=0?'var(--teal)':'var(--red)'):(varV>=0?'var(--teal)':'var(--red)') }}>
                        {typeof varV==='number'?(varV>0?'+':'')+fmtV(varV):'—'}
                      </td>
                      <td style={{ minWidth:130 }}><ProgressBar pct={achPct} color={color} /></td>
                      <td><span className={`${tableStyles.badge} ${good?tableStyles.green:warn?tableStyles.amber:tableStyles.red}`}>{good?'On Target':warn?'Monitor':'Behind'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: P2P Pipeline ════════════════════════════════════════════ */}
      {activeTab === 'pipeline' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {/* Monthly PO count */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Monthly PO Count — FY 2025</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{ labels:MONTHS.slice(0,11), datasets:[{ data:MONTHLY_PO_COUNT.filter(v=>v!=null), backgroundColor:'#1B4F72', borderRadius:4 }] }}
                  options={{ ...BASE, scales:{ x:X_NONE, y:Y_BASE } }}
                />
              </div>
            </div>
 
            {/* Approval rate trend */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Requisition Approval Rate % (Target ≥ 90%)</div>
              <div style={{ height:220 }}>
                <Line
                  data={{
                    labels: MONTHS.slice(0,11),
                    datasets:[
                      { label:'Approval Rate', data:MONTHLY_APPROVALS.filter(v=>v!=null), borderColor:'#117A65', backgroundColor:'rgba(17,122,101,.1)', fill:true, tension:.35, borderWidth:2, pointRadius:3 },
                      { label:'Target 90%',    data:Array(11).fill(90), borderColor:'#C0392B', borderDash:[5,4], borderWidth:1.5, pointRadius:0, fill:false },
                    ],
                  }}
                  options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:LEG_B }, scales:{ x:X_NONE, y:Y_PCT } }}
                />
              </div>
            </div>
          </div>
 
          {/* Pipeline funnel */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>P2P Pipeline — Current Status (All Requests)</div>
            <table className={tableStyles.table}>
              <thead>
                <tr><th>Stage</th><th className={tableStyles.right}>Count</th><th className={tableStyles.right}>Value</th><th style={{ minWidth:160 }}>Volume</th></tr>
              </thead>
              <tbody>
                {REQUISITION_PIPELINE.map((s,i) => {
                  const pct = REQUISITION_PIPELINE[0].count ? (s.count/REQUISITION_PIPELINE[0].count*100) : 0;
                  const stageColors = ['#1B4F72','#CA6F1E','#117A65','#6C3483','#117A65','#1B4F72','#2980B9','#117A65','#CA6F1E','#27AE60'];
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight:600 }}>{s.stage}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700 }}>{s.count}</td>
                      <td className={tableStyles.right} style={{ fontWeight:600, color:'var(--navy)' }}>{fmt(s.value)}</td>
                      <td style={{ minWidth:160 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, background:'#e8ecf0', borderRadius:4, height:10, overflow:'hidden' }}>
                            <div style={{ height:'100%', borderRadius:4, background:stageColors[i]||'#888', width:`${pct}%`, transition:'width .6s' }} />
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, color:stageColors[i]||'#888', whiteSpace:'nowrap' }}>{s.count}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
 
          {/* Cycle time monthly table */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Monthly P2P Cycle Time Detail</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className={tableStyles.right}>POs Issued</th>
                  <th className={tableStyles.right}>PO Value</th>
                  <th className={tableStyles.right}>Avg Cycle Days</th>
                  <th className={tableStyles.right}>Approval Rate</th>
                  <th className={tableStyles.right}>On-Time %</th>
                  <th>Cycle Rating</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS.slice(0,11).map((m,i) => {
                  const cd  = MONTHLY_CYCLE_DAYS[i];
                  const onT = MONTHLY_ON_TIME[i];
                  const apr = MONTHLY_APPROVALS[i];
                  return (
                    <tr key={m}>
                      <td style={{ fontWeight:600 }}>{m} 2025</td>
                      <td className={tableStyles.right}>{MONTHLY_PO_COUNT[i]}</td>
                      <td className={tableStyles.right}>{fmt((MONTHLY_PO_VALUE[i]||0)*1e6)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700, color:cd<=14?'var(--teal)':'var(--red)' }}>{cd} days</td>
                      <td className={tableStyles.right} style={{ fontWeight:600, color:apr>=90?'var(--teal)':'var(--amber)' }}>{apr}%</td>
                      <td className={tableStyles.right} style={{ fontWeight:600, color:onT>=90?'var(--teal)':'var(--amber)' }}>{onT}%</td>
                      <td><span className={`${tableStyles.badge} ${cd<=10?tableStyles.green:cd<=14?tableStyles.blue:tableStyles.amber}`}>{cd<=10?'Excellent':cd<=14?'On Target':'Monitor'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>AVERAGE</td>
                  <td className={tableStyles.right}>{(totalPOs/11).toFixed(0)}</td>
                  <td className={tableStyles.right}>{fmt(MONTHLY_PO_VALUE.filter(v=>v!=null).reduce((s,v)=>s+v,0)/11*1e6)}</td>
                  <td className={tableStyles.right} style={{ color:avgCycleDays<=14?'var(--teal)':'var(--red)', fontWeight:800 }}>{avgCycleDays}d</td>
                  <td className={tableStyles.right} style={{ color:avgApprovalRate>=90?'var(--teal)':'var(--amber)', fontWeight:800 }}>{avgApprovalRate}%</td>
                  <td className={tableStyles.right} style={{ color:avgOnTime>=90?'var(--teal)':'var(--amber)', fontWeight:800 }}>{avgOnTime}%</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Vendor Performance ══════════════════════════════════════ */}
      {activeTab === 'vendors' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1.2fr 0.8fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Vendor Spend — Top 8</div>
              <div style={{ height:240 }}>
                <Bar
                  data={{ labels:VENDOR_PERFORMANCE.map(v=>v.vendor.slice(0,20)), datasets:[{ data:VENDOR_PERFORMANCE.map(v=>+(v.spend/1e6).toFixed(2)), backgroundColor:COLORS, borderRadius:4 }] }}
                  options={{ ...BASE, indexAxis:'y', scales:{ x:Y_NGN, y:X_NONE } }}
                />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>On-Time Delivery by Vendor</div>
              <div style={{ padding:'4px 0', overflowY:'auto', maxHeight:240 }}>
                {VENDOR_PERFORMANCE.map((v,i) => {
                  const pct = (v.onTime/v.orders*100);
                  return (
                    <div key={i} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                        <span style={{ fontWeight:600, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.vendor.split(' ')[0]}</span>
                        <span style={{ fontWeight:700, color:pct>=90?'var(--teal)':'var(--amber)', whiteSpace:'nowrap' }}>{pct.toFixed(0)}%</span>
                      </div>
                      <ProgressBar pct={pct} color={pct>=90?'#117A65':pct>=80?'#CA6F1E':'#C0392B'} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Vendor Performance Scorecard</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Vendor</th><th>Category</th>
                  <th className={tableStyles.right}>Orders</th>
                  <th className={tableStyles.right}>On-Time %</th>
                  <th className={tableStyles.right}>Quality %</th>
                  <th className={tableStyles.right}>Avg Lead (d)</th>
                  <th className={tableStyles.right}>Spend</th>
                  <th className={tableStyles.right}>Savings</th>
                  <th>Rating</th>
                  <th className={tableStyles.right}>Defects</th>
                </tr>
              </thead>
              <tbody>
                {VENDOR_PERFORMANCE.sort((a,b)=>b.spend-a.spend).map((v,i) => {
                  const otPct = (v.onTime/v.orders*100).toFixed(0);
                  const qPct  = (v.qualityPass/v.orders*100).toFixed(0);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight:700 }}>{v.vendor}</td>
                      <td><span className={`${tableStyles.badge} ${tableStyles.blue}`} style={{ fontSize:9 }}>{v.category}</span></td>
                      <td className={tableStyles.right}>{v.orders}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700, color:+otPct>=90?'var(--teal)':'var(--amber)' }}>{otPct}%</td>
                      <td className={tableStyles.right} style={{ fontWeight:600, color:+qPct>=95?'var(--teal)':'var(--amber)' }}>{qPct}%</td>
                      <td className={tableStyles.right} style={{ color:v.avgLead<=3?'var(--teal)':'var(--amber)' }}>{v.avgLead.toFixed(1)}d</td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(v.spend)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)', fontWeight:700 }}>{fmt(v.savings)}</td>
                      <td><Stars rating={v.rating} /></td>
                      <td className={tableStyles.right} style={{ color:v.defects>0?'var(--red)':'var(--teal)', fontWeight:700 }}>{v.defects}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>TOTAL / AVERAGE</td>
                  <td className={tableStyles.right}>{VENDOR_PERFORMANCE.reduce((s,v)=>s+v.orders,0)}</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{avgOnTime}%</td>
                  <td className={tableStyles.right}>{(VENDOR_PERFORMANCE.reduce((s,v)=>s+v.qualityPass,0)/VENDOR_PERFORMANCE.reduce((s,v)=>s+v.orders,0)*100).toFixed(0)}%</td>
                  <td className={tableStyles.right}>{(VENDOR_PERFORMANCE.reduce((s,v)=>s+v.avgLead,0)/VENDOR_PERFORMANCE.length).toFixed(1)}d</td>
                  <td className={tableStyles.right}>{fmt(VENDOR_PERFORMANCE.reduce((s,v)=>s+v.spend,0))}</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(VENDOR_PERFORMANCE.reduce((s,v)=>s+v.savings,0))}</td>
                  <td>{avgVendorRating} ★</td>
                  <td className={tableStyles.right}>{VENDOR_PERFORMANCE.reduce((s,v)=>s+v.defects,0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Spend Analysis ══════════════════════════════════════════ */}
      {activeTab === 'spend' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Spend vs Budget by Category</div>
              <div style={{ height:240 }}>
                <Bar
                  data={{
                    labels: SPEND_CATEGORIES.map(c=>c.category),
                    datasets:[
                      { label:'Budget', data:SPEND_CATEGORIES.map(c=>+(c.budget/1e6).toFixed(2)), backgroundColor:'#85C1E988', borderRadius:3 },
                      { label:'Actual', data:SPEND_CATEGORIES.map(c=>+(c.spend/1e6).toFixed(2)),  backgroundColor:'#1B4F72',   borderRadius:3 },
                    ],
                  }}
                  options={{ ...BASE, plugins:{ legend:LEG_B }, scales:{ x:X_NONE, y:Y_NGN } }}
                />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Spend Distribution by Category</div>
              <div style={{ height:240 }}>
                <Doughnut
                  data={{ labels:SPEND_CATEGORIES.map(c=>c.category), datasets:[{ data:SPEND_CATEGORIES.map(c=>+(c.spend/1e6).toFixed(2)), backgroundColor:COLORS, borderWidth:2, borderColor:'#fff' }] }}
                  options={{ responsive:true, maintainAspectRatio:false, cutout:'52%', plugins:{ legend:{ display:true, position:'right', labels:{ font:FONT, boxWidth:10 } } } }}
                />
              </div>
            </div>
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Spend Analysis by Category — FY 2025</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th className={tableStyles.right}>Budget</th>
                  <th className={tableStyles.right}>Actual Spend</th>
                  <th className={tableStyles.right}>Remaining</th>
                  <th className={tableStyles.right}>Utilisation</th>
                  <th className={tableStyles.right}>PO Count</th>
                  <th className={tableStyles.right}>Savings</th>
                  <th style={{ minWidth:120 }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {SPEND_CATEGORIES.sort((a,b)=>b.spend-a.spend).map((c,i) => {
                  const util     = (c.spend/c.budget*100).toFixed(1);
                  const remain   = c.budget - c.spend;
                  const utilColor= +util>100?'var(--red)':+util>85?'var(--amber)':'var(--teal)';
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight:700 }}>{c.category}</td>
                      <td className={tableStyles.right}>{fmt(c.budget)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(c.spend)}</td>
                      <td className={tableStyles.right} style={{ color:remain>=0?'var(--teal)':'var(--red)', fontWeight:600 }}>{fmt(Math.abs(remain))}{remain<0?' over':''}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700, color:utilColor }}>{util}%</td>
                      <td className={tableStyles.right}>{c.pos}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)', fontWeight:700 }}>{fmt(c.savings)}</td>
                      <td style={{ minWidth:120 }}>
                        <ProgressBar pct={+util} color={utilColor} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>TOTAL</td>
                  <td className={tableStyles.right}>{fmt(ytdBudget)}</td>
                  <td className={tableStyles.right}>{fmt(ytdSpend)}</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(ytdBudget-ytdSpend)}</td>
                  <td className={tableStyles.right}>{budgetUtil}%</td>
                  <td className={tableStyles.right}>{SPEND_CATEGORIES.reduce((s,c)=>s+c.pos,0)}</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(ytdSavings)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Savings Tracker ═════════════════════════════════════════ */}
      {activeTab === 'savings' && (
        <>
          {/* Summary cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
            {[
              { label:'Total Savings YTD',      val:fmt(ytdSavings),          color:'#117A65', bg:'#d4edda' },
              { label:'Savings Rate',            val:`${savingsRate}%`,        color:'#1B4F72', bg:'#d1ecf1' },
              { label:'Target Rate',             val:'5.0%',                   color:'#6C3483', bg:'#e8d5f5' },
              { label:'Savings vs Target',       val:savingsRate>=5?'✓ Achieved':'Below', color:savingsRate>=5?'#117A65':'#C0392B', bg:savingsRate>=5?'#d4edda':'#f8d7da' },
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'14px 16px', borderLeft:`4px solid ${s.color}` }}>
                <div style={{ fontSize:9, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:.4, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
 
          {/* Monthly savings % chart */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Monthly Savings Rate % (Target ≥ 5%)</div>
              <div style={{ height:200 }}>
                <Bar
                  data={{
                    labels: MONTHS.slice(0,11),
                    datasets:[
                      { label:'Savings %', data:MONTHLY_SAVINGS_PCT.filter(v=>v!=null), backgroundColor:MONTHLY_SAVINGS_PCT.filter(v=>v!=null).map(v=>v>=5?'#117A65':'#CA6F1E'), borderRadius:4 },
                    ],
                  }}
                  options={{ ...BASE, scales:{ x:X_NONE, y:{ ...Y_PCT, ticks:{ font:FONT, callback:v=>v+'%' } } } }}
                />
              </div>
            </div>
 
            <div className={styles.card}>
              <div className={styles.cardTitle}>Savings by Category</div>
              <div style={{ padding:'4px 0' }}>
                {SPEND_CATEGORIES.sort((a,b)=>b.savings-a.savings).map((c,i) => {
                  const pct = ytdSavings > 0 ? (c.savings/ytdSavings*100) : 0;
                  return (
                    <div key={i} style={{ marginBottom:9 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                        <span style={{ fontWeight:600 }}>{c.category}</span>
                        <span style={{ fontWeight:700, color:'var(--teal)' }}>{fmt(c.savings)}</span>
                      </div>
                      <ProgressBar pct={pct} color={COLORS[i % COLORS.length]} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
 
          {/* Savings by vendor table */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Cost Savings by Vendor — FY 2025</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Vendor</th><th>Category</th>
                  <th className={tableStyles.right}>Total Spend</th>
                  <th className={tableStyles.right}>Savings Achieved</th>
                  <th className={tableStyles.right}>Savings Rate</th>
                  <th>Method</th>
                  <th style={{ minWidth:120 }}>Progress to 5% Target</th>
                </tr>
              </thead>
              <tbody>
                {VENDOR_PERFORMANCE.sort((a,b)=>b.savings-a.savings).map((v,i) => {
                  const rate    = (v.savings/v.spend*100).toFixed(1);
                  const onTgt   = +rate >= 5;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight:700 }}>{v.vendor}</td>
                      <td><span className={`${tableStyles.badge} ${tableStyles.blue}`} style={{ fontSize:9 }}>{v.category}</span></td>
                      <td className={tableStyles.right}>{fmt(v.spend)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)', fontWeight:700 }}>{fmt(v.savings)}</td>
                      <td className={tableStyles.right}>
                        <span style={{ fontWeight:700, color:onTgt?'var(--teal)':'var(--amber)' }}>{rate}%</span>
                      </td>
                      <td style={{ fontSize:10, color:'var(--muted)' }}>Competitive bidding</td>
                      <td style={{ minWidth:120 }}>
                        <ProgressBar pct={Math.min(100,+rate/5*100)} color={onTgt?'#117A65':'#CA6F1E'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>TOTAL</td>
                  <td className={tableStyles.right}>{fmt(ytdSpend)}</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)', fontWeight:800 }}>{fmt(ytdSavings)}</td>
                  <td className={tableStyles.right} style={{ fontWeight:800, color:savingsRate>=5?'var(--teal)':'var(--amber)' }}>{savingsRate}%</td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}