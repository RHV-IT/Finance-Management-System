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
const Y_PCT  = { grid: { color: GRID }, ticks: { font: FONT, callback: v => v + '%' } };
const LEG_B  = { display: true, position: 'bottom', labels: { font: FONT, boxWidth: 10 } };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 
/* ── seed data ──────────────────────────────────────────────────────────── */
const MONTHLY_REVENUE   = [22_100_000, 28_700_000, 24_200_000, 30_500_000, 48_200_000, 40_300_000, 39_800_000, 63_200_000, 58_900_000, 47_400_000, 49_800_000, 54_700_000];
const MONTHLY_COGS      = [11_050_000, 14_350_000, 12_100_000, 15_250_000, 24_100_000, 20_150_000, 19_900_000, 31_600_000, 29_450_000, 23_700_000, 24_900_000, 27_350_000];
const MONTHLY_DISPENSED = [4_820, 5_640, 4_950, 6_100, 8_800, 7_600, 7_250, 9_400, 8_950, 7_800, 8_100, 8_600];
const MONTHLY_ERRORS    = [12,    9,     11,    8,     6,     5,     7,     4,     6,     5,     4,     5];
const MONTHLY_STOCKOUTS = [8,     6,     5,     7,     4,     3,     4,     2,     3,     5,     3,     null];
const MONTHLY_TARGET    = 30_000_000;
 
const DRUG_CATEGORIES = [
  { cat:'Antibiotics',         revenue:82_400_000, cogs:38_200_000, dispensed:18_420, stockOuts:4,  topDrug:'Amoxicillin 500mg' },
  { cat:'IV Fluids & Infusion',revenue:71_800_000, cogs:35_900_000, dispensed:14_800, stockOuts:8,  topDrug:'Normal Saline 500ml' },
  { cat:'Analgesics',          revenue:48_200_000, cogs:21_400_000, dispensed:22_600, stockOuts:2,  topDrug:'Paracetamol 500mg' },
  { cat:'Cardiovascular',      revenue:39_600_000, cogs:18_200_000, dispensed:8_900,  stockOuts:3,  topDrug:'Amlodipine 5mg' },
  { cat:'Antidiabetics',       revenue:31_400_000, cogs:14_800_000, dispensed:7_200,  stockOuts:2,  topDrug:'Metformin 500mg' },
  { cat:'Surgical Consumables',revenue:28_900_000, cogs:14_500_000, dispensed:11_200, stockOuts:5,  topDrug:'Surgical Gloves' },
  { cat:'Respiratory',         revenue:16_200_000, cogs:7_400_000,  dispensed:5_800,  stockOuts:1,  topDrug:'Salbutamol Inhaler' },
  { cat:'Vitamins & Supplements',revenue:11_800_000,cogs:5_200_000, dispensed:9_600,  stockOuts:0,  topDrug:'Vitamin C 500mg' },
  { cat:'Antifungals',         revenue:8_900_000,  cogs:4_100_000,  dispensed:3_400,  stockOuts:1,  topDrug:'Fluconazole 150mg' },
  { cat:'Other',               revenue:7_600_000,  cogs:3_600_000,  dispensed:4_200,  stockOuts:2,  topDrug:'Various' },
];
 
const TOP_DRUGS = [
  { drug:'Normal Saline 0.9% 500ml', cat:'IV Fluid',    qtySold:14_800, revenue:71_800_000, cogs:35_900_000, margin:50.0, stockLevel:420  },
  { drug:'Amoxicillin 500mg Capsule',cat:'Antibiotic',  qtySold:18_420, revenue:36_800_000, cogs:16_200_000, margin:56.0, stockLevel:1_200},
  { drug:'Paracetamol 500mg Tablet', cat:'Analgesic',   qtySold:22_600, revenue:22_600_000, cogs:9_040_000,  margin:60.0, stockLevel:2_800},
  { drug:'Amlodipine 5mg Tablet',    cat:'Cardiovascular',qtySold:8_900,revenue:31_200_000, cogs:14_200_000, margin:54.5, stockLevel:600  },
  { drug:'Dextrose 5% 500ml',        cat:'IV Fluid',    qtySold:6_200,  revenue:32_200_000, cogs:15_500_000, margin:51.9, stockLevel:320  },
  { drug:'Metronidazole 400mg',      cat:'Antibiotic',  qtySold:12_400, revenue:12_400_000, cogs:5_100_000,  margin:58.9, stockLevel:900  },
  { drug:'Metformin 500mg',          cat:'Antidiabetic',qtySold:7_200,  revenue:14_400_000, cogs:6_500_000,  margin:54.9, stockLevel:800  },
  { drug:'Salbutamol Inhaler',       cat:'Respiratory', qtySold:5_800,  revenue:17_400_000, cogs:7_800_000,  margin:55.2, stockLevel:240  },
  { drug:'Fluconazole 150mg',        cat:'Antifungal',  qtySold:3_400,  revenue:10_200_000, cogs:4_600_000,  margin:54.9, stockLevel:480  },
  { drug:'Ciprofloxacin 500mg',      cat:'Antibiotic',  qtySold:9_200,  revenue:18_400_000, cogs:8_100_000,  margin:56.0, stockLevel:720  },
];
 
const STOCK_REGISTER = [
  { drug:'Normal Saline 0.9% 500ml', cat:'IV Fluid',    onHand:420,  reorder:200, unit:'Carton', unitCost:54_000, status:'OK'       },
  { drug:'Amoxicillin 500mg Capsule',cat:'Antibiotic',  onHand:1_200,reorder:500, unit:'Carton', unitCost:85_000, status:'OK'       },
  { drug:'Paracetamol 500mg Tablet', cat:'Analgesic',   onHand:2_800,reorder:800, unit:'Carton', unitCost:18_000, status:'OK'       },
  { drug:'IV Cannula 18G',           cat:'Consumable',  onHand:8,    reorder:50,  unit:'Box',    unitCost:14_000, status:'Critical' },
  { drug:'Dextrose 5% 500ml',        cat:'IV Fluid',    onHand:320,  reorder:200, unit:'Carton', unitCost:62_000, status:'Low'      },
  { drug:'Metformin 500mg',          cat:'Antidiabetic',onHand:800,  reorder:300, unit:'Carton', unitCost:22_000, status:'OK'       },
  { drug:'Salbutamol Inhaler',       cat:'Respiratory', onHand:240,  reorder:100, unit:'Box',    unitCost:18_000, status:'OK'       },
  { drug:'Ciprofloxacin 500mg',      cat:'Antibiotic',  onHand:720,  reorder:250, unit:'Carton', unitCost:65_000, status:'OK'       },
  { drug:'Fluconazole 150mg',        cat:'Antifungal',  onHand:480,  reorder:150, unit:'Box',    unitCost:28_000, status:'OK'       },
  { drug:'Amlodipine 5mg Tablet',    cat:'Cardiovascular',onHand:600,reorder:200, unit:'Carton', unitCost:35_000, status:'OK'       },
  { drug:'Surgical Gloves M',        cat:'Consumable',  onHand:45,   reorder:50,  unit:'Carton', unitCost:28_000, status:'Low'      },
  { drug:'Metronidazole 400mg',      cat:'Antibiotic',  onHand:900,  reorder:300, unit:'Carton', unitCost:22_000, status:'OK'       },
];
 
/* ── helpers ─────────────────────────────────────────────────────────────── */
function ProgressBar({ pct, color, height = 7 }) {
  return (
    <div style={{ background:'#e8ecf0', borderRadius:4, height, overflow:'hidden', width:'100%' }}>
      <div style={{ height:'100%', borderRadius:4, background:color || '#117A65', width:`${Math.min(100,pct)}%`, transition:'width .6s' }} />
    </div>
  );
}
 
function RatingBadge({ val, target, higherIsBad }) {
  const ratio = target ? val / target : 1;
  const good  = higherIsBad ? ratio <= 1 : ratio >= 1;
  const warn  = higherIsBad ? ratio <= 1.2 : ratio >= 0.9;
  const label = good ? 'On Target' : warn ? 'Monitor' : 'Critical';
  const cls   = good ? tableStyles.green : warn ? tableStyles.amber : tableStyles.red;
  return <span className={`${tableStyles.badge} ${cls}`}>{label}</span>;
}
 
/* ════════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function PharmKPIPage() {
  const [activeTab, setActiveTab] = useState('overview');
 
  /* ── totals ───────────────────────────────────────────────────────── */
  const ytdRevenue   = MONTHLY_REVENUE.reduce((s,v) => s+v, 0);
  const ytdCogs      = MONTHLY_COGS.reduce((s,v) => s+v, 0);
  const ytdGross     = ytdRevenue - ytdCogs;
  const grossMargin  = (ytdGross / ytdRevenue * 100).toFixed(1);
  const ytdDispensed = MONTHLY_DISPENSED.reduce((s,v) => s+v, 0);
  const ytdErrors    = MONTHLY_ERRORS.reduce((s,v) => s+v, 0);
  const errorRate    = (ytdErrors / ytdDispensed * 100).toFixed(3);
  const dispensingAcc= (100 - parseFloat(errorRate)).toFixed(2);
  const criticalStock= STOCK_REGISTER.filter(r => r.status === 'Critical').length;
  const lowStock     = STOCK_REGISTER.filter(r => r.status === 'Low').length;
  const stockValue   = STOCK_REGISTER.reduce((s,r) => s + r.onHand * r.unitCost, 0);
  const novRevenue   = MONTHLY_REVENUE[10];
  const novTarget    = MONTHLY_TARGET;
 
  const TABS = [
    { id:'overview',   label:'📊 Overview'          },
    { id:'revenue',    label:'💰 Revenue & Margins'  },
    { id:'dispensing', label:'💊 Dispensing'          },
    { id:'stock',      label:'📦 Stock KPIs'          },
    { id:'categories', label:'🗂 Drug Categories'     },
  ];
 
  function exportCSV() {
    const rows = ['Drug,Category,Qty Sold,Revenue,COGS,Margin%,Stock Level'];
    TOP_DRUGS.forEach(d => rows.push(`"${d.drug}","${d.cat}",${d.qtySold},${d.revenue},${d.cogs},${d.margin},${d.stockLevel}`));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type:'text/csv' }));
    a.download = 'pharmacy_kpi.csv'; a.click();
  }
 
  return (
    <DashboardLayout>
 
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>💊 Pharmacy KPIs</h2>
          <p className={styles.pageMeta}>Revenue · Dispensing accuracy · Stock management · Drug category analysis — FY 2025</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className={styles.btnGhost} onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      </div>
 
      {/* ── KPI Summary Cards ───────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Revenue YTD"          value={fmt(ytdRevenue)}         delta="Target ₦360M" deltaType={ytdRevenue>=360e6?'up':'warn'} badge={ytdRevenue>=360e6?'On Target':'Behind'} badgeType={ytdRevenue>=360e6?'good':'warn'} color={ytdRevenue>=360e6?'green':'amber'} />
        <KPICard label="Gross Profit Margin"  value={`${grossMargin}%`}       delta="Target ≥50%"  deltaType={+grossMargin>=50?'up':'warn'}   badge={+grossMargin>=50?'Good':'Monitor'}     badgeType={+grossMargin>=50?'good':'warn'} color={+grossMargin>=50?'green':'amber'} />
        <KPICard label="COGS YTD"             value={fmt(ytdCogs)}            delta="Cost of drugs sold"   deltaType="warn"   color="red"    />
        <KPICard label="Gross Profit YTD"     value={fmt(ytdGross)}           delta="Revenue less COGS"    deltaType="up"     color="green"  />
        <KPICard label="Nov Revenue"          value={fmt(novRevenue)}         delta={`Target ${fmt(novTarget)}`} deltaType={novRevenue>=novTarget?'up':'warn'} badge={novRevenue>=novTarget?'✓ Target':'Behind'} badgeType={novRevenue>=novTarget?'good':'warn'} color={novRevenue>=novTarget?'green':'amber'} />
        <KPICard label="Dispensing Accuracy"  value={`${dispensingAcc}%`}    delta="Target ≥99.5%"        deltaType={+dispensingAcc>=99.5?'up':'warn'} badge={+dispensingAcc>=99.5?'Excellent':'Monitor'} badgeType={+dispensingAcc>=99.5?'good':'warn'} color={+dispensingAcc>=99.5?'green':'amber'} />
        <KPICard label="Dispensing Errors YTD"value={ytdErrors.toString()}   delta={`${errorRate}% error rate`} deltaType={+errorRate<0.05?'up':'warn'} badge={+errorRate<0.05?'Excellent':'Monitor'} badgeType={+errorRate<0.05?'good':'warn'} color={+errorRate<0.05?'green':'amber'} />
        <KPICard label="Critical Stock Items" value={criticalStock.toString()} delta={`${lowStock} low stock`} deltaType={criticalStock>0?'warn':'up'} badge={criticalStock>0?'Action':'Clear'} badgeType={criticalStock>0?'bad':'good'} color={criticalStock>0?'red':'green'} />
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
 
      {/* ════ TAB: Overview ══════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Score banner */}
          <div style={{ background:'linear-gradient(135deg,#117A65,#0d5a4e)', borderRadius:12, padding:'18px 22px', marginBottom:16, display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <div style={{ fontSize:40, fontWeight:900, color:'#fff' }}>A</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.7)' }}>Performance</div>
            </div>
            <div style={{ borderLeft:'1px solid rgba(255,255,255,.25)', paddingLeft:20, flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#fff', marginBottom:6 }}>Pharmacy Unit — FY 2025 Performance</div>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                {[
                  { label:'Revenue Achievement', val:`${(ytdRevenue/360e6*100).toFixed(1)}%`, good:ytdRevenue>=360e6 },
                  { label:'Gross Margin',         val:`${grossMargin}%`,                       good:+grossMargin>=50  },
                  { label:'Dispensing Accuracy',  val:`${dispensingAcc}%`,                     good:+dispensingAcc>=99.5 },
                  { label:'Stock Availability',   val:`${(STOCK_REGISTER.filter(r=>r.status==='OK').length/STOCK_REGISTER.length*100).toFixed(0)}%`, good:criticalStock===0 },
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
            {/* Revenue vs target */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Monthly Revenue vs Target (₦M)</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{
                    labels: MONTHS,
                    datasets: [
                      { label:'Revenue', data:MONTHLY_REVENUE.map(v=>+(v/1e6).toFixed(2)), backgroundColor:MONTHLY_REVENUE.map(v=>v>=MONTHLY_TARGET?'#117A65':'#1B4F72'), borderRadius:3 },
                      { label:'Target',  data:MONTHS.map(()=>+(MONTHLY_TARGET/1e6).toFixed(2)), type:'line', borderColor:'#C0392B', borderDash:[5,4], borderWidth:1.5, pointRadius:0, fill:false },
                    ],
                  }}
                  options={{ ...BASE, plugins:{ legend:LEG_B }, scales:{ x:X_NONE, y:Y_NGN } }}
                />
              </div>
            </div>
 
            {/* Gross margin trend */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Monthly Gross Margin % Trend</div>
              <div style={{ height:220 }}>
                <Line
                  data={{
                    labels: MONTHS,
                    datasets: [
                      { label:'Gross Margin %', data:MONTHLY_REVENUE.map((r,i)=>+((r-MONTHLY_COGS[i])/r*100).toFixed(1)), borderColor:'#117A65', backgroundColor:'rgba(17,122,101,.1)', fill:true, tension:.35, borderWidth:2, pointRadius:3 },
                      { label:'Target 50%',      data:MONTHS.map(()=>50), borderColor:'#C0392B', borderDash:[5,4], borderWidth:1.5, pointRadius:0, fill:false },
                    ],
                  }}
                  options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:LEG_B }, scales:{ x:X_NONE, y:Y_PCT } }}
                />
              </div>
            </div>
          </div>
 
          {/* KPI summary table */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Pharmacy KPI Summary — FY 2025</div>
            <table className={tableStyles.table}>
              <thead>
                <tr><th>KPI</th><th className={tableStyles.right}>Target</th><th className={tableStyles.right}>Actual</th><th className={tableStyles.right}>Variance</th><th>Progress</th><th>Rating</th></tr>
              </thead>
              <tbody>
                {[
                  { name:'YTD Revenue',              target:360_000_000, actual:ytdRevenue,            unit:'₦',    higherIsBad:false },
                  { name:'Gross Profit Margin',       target:50,          actual:+grossMargin,          unit:'%',    higherIsBad:false },
                  { name:'COGS Ratio',                target:50,          actual:+(ytdCogs/ytdRevenue*100).toFixed(1), unit:'%', higherIsBad:true },
                  { name:'Dispensing Accuracy',       target:99.5,        actual:+dispensingAcc,        unit:'%',    higherIsBad:false },
                  { name:'Monthly Dispensing Errors', target:10,          actual:ytdErrors/11,          unit:'avg',  higherIsBad:true  },
                  { name:'Stock-Out Incidents YTD',   target:50,          actual:MONTHLY_STOCKOUTS.filter(v=>v!=null).reduce((s,v)=>s+v,0), unit:'count', higherIsBad:true },
                  { name:'Drug Availability Rate',    target:90,          actual:+(STOCK_REGISTER.filter(r=>r.status==='OK').length/STOCK_REGISTER.length*100).toFixed(1), unit:'%', higherIsBad:false },
                  { name:'Nov Revenue vs Target',     target:MONTHLY_TARGET, actual:novRevenue,         unit:'₦',    higherIsBad:false },
                ].map((k,i) => {
                  const pct = k.target ? (k.actual/k.target*100) : 0;
                  const good = k.higherIsBad ? pct<=100 : pct>=100;
                  const warn = k.higherIsBad ? pct<=120 : pct>=90;
                  const color = good?'#117A65':warn?'#CA6F1E':'#C0392B';
                  const varPct = k.target ? ((k.actual-k.target)/k.target*100).toFixed(1) : '—';
                  const fmtVal = v => k.unit==='₦'?fmt(v):k.unit==='%'?v.toFixed(1)+'%':v.toFixed(1)+' '+k.unit;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight:600 }}>{k.name}</td>
                      <td className={tableStyles.right}>{fmtVal(k.target)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700, color }}>{fmtVal(k.actual)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700, color: k.actual>=k.target?(k.higherIsBad?'var(--red)':'var(--teal)'):(k.higherIsBad?'var(--teal)':'var(--red)') }}>
                        {typeof varPct==='string'?varPct:(+varPct>0?'+':'')+varPct+'%'}
                      </td>
                      <td style={{ minWidth:130 }}>
                        <ProgressBar pct={Math.min(100,pct)} color={color} />
                      </td>
                      <td>
                        <span className={`${tableStyles.badge} ${good?tableStyles.green:warn?tableStyles.amber:tableStyles.red}`}>
                          {good?'On Target':warn?'Monitor':'Critical'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Revenue & Margins ════════════════════════════════════ */}
      {activeTab === 'revenue' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
            {[
              { label:'Revenue YTD',       val:fmt(ytdRevenue),    color:'#1B4F72', bg:'#d1ecf1' },
              { label:'COGS YTD',          val:fmt(ytdCogs),       color:'#C0392B', bg:'#f8d7da' },
              { label:'Gross Profit',      val:fmt(ytdGross),      color:'#117A65', bg:'#d4edda' },
              { label:'Gross Margin',      val:`${grossMargin}%`,  color:'#6C3483', bg:'#e8d5f5' },
            ].map(s => (
              <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'14px 16px', borderLeft:`4px solid ${s.color}` }}>
                <div style={{ fontSize:9, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:.4, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
 
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Revenue vs COGS — Monthly 2025 (₦M)</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{
                    labels: MONTHS,
                    datasets:[
                      { label:'Revenue', data:MONTHLY_REVENUE.map(v=>+(v/1e6).toFixed(2)), backgroundColor:'#117A6599', borderRadius:3 },
                      { label:'COGS',    data:MONTHLY_COGS.map(v=>+(v/1e6).toFixed(2)),    backgroundColor:'#C0392B88', borderRadius:3 },
                    ],
                  }}
                  options={{ ...BASE, plugins:{ legend:LEG_B }, scales:{ x:X_NONE, y:Y_NGN } }}
                />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Gross Profit Monthly (₦M)</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{
                    labels: MONTHS,
                    datasets:[{ data:MONTHLY_REVENUE.map((r,i)=>+((r-MONTHLY_COGS[i])/1e6).toFixed(2)), backgroundColor:COLORS, borderRadius:4 }],
                  }}
                  options={{ ...BASE, scales:{ x:X_NONE, y:Y_NGN } }}
                />
              </div>
            </div>
          </div>
 
          {/* Monthly table */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Monthly Revenue & Margin Detail — FY 2025</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className={tableStyles.right}>Revenue</th>
                  <th className={tableStyles.right}>COGS</th>
                  <th className={tableStyles.right}>Gross Profit</th>
                  <th className={tableStyles.right}>Margin %</th>
                  <th className={tableStyles.right}>vs Target</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS.map((m,i) => {
                  const rev  = MONTHLY_REVENUE[i];
                  const cogs = MONTHLY_COGS[i];
                  const gp   = rev - cogs;
                  const mg   = (gp/rev*100).toFixed(1);
                  const vs   = ((rev-MONTHLY_TARGET)/MONTHLY_TARGET*100).toFixed(1);
                  const onT  = rev >= MONTHLY_TARGET;
                  return (
                    <tr key={m}>
                      <td style={{ fontWeight:600 }}>{m} 2025</td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(rev)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--red)' }}>{fmt(cogs)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)', fontWeight:700 }}>{fmt(gp)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700, color:+mg>=50?'var(--teal)':'var(--amber)' }}>{mg}%</td>
                      <td className={tableStyles.right} style={{ fontWeight:700, color:onT?'var(--teal)':'var(--red)' }}>{+vs>0?'+':''}{vs}%</td>
                      <td><span className={`${tableStyles.badge} ${onT?tableStyles.green:tableStyles.amber}`}>{onT?'On Target':'Below'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>TOTAL</td>
                  <td className={tableStyles.right}>{fmt(ytdRevenue)}</td>
                  <td className={tableStyles.right} style={{ color:'var(--red)' }}>{fmt(ytdCogs)}</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(ytdGross)}</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)', fontWeight:800 }}>{grossMargin}%</td>
                  <td className={tableStyles.right}>{((ytdRevenue-360e6)/360e6*100).toFixed(1)}%</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Dispensing ══════════════════════════════════════════════ */}
      {activeTab === 'dispensing' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Monthly Prescriptions Dispensed</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{ labels:MONTHS, datasets:[{ data:MONTHLY_DISPENSED, backgroundColor:COLORS, borderRadius:4 }] }}
                  options={{ ...BASE, scales:{ x:X_NONE, y:Y_BASE } }}
                />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Monthly Dispensing Errors (Target ≤ 10/month)</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{ labels:MONTHS, datasets:[{ data:MONTHLY_ERRORS, backgroundColor:MONTHLY_ERRORS.map(v=>v>10?'#C0392B':'#117A65'), borderRadius:4 }] }}
                  options={{ ...BASE, scales:{ x:X_NONE, y:{ ...Y_BASE, ticks:{ font:FONT, stepSize:2 } } } }}
                />
              </div>
            </div>
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Top 10 Drugs by Volume Dispensed</div>
            <table className={tableStyles.table}>
              <thead>
                <tr><th>Drug</th><th>Category</th><th className={tableStyles.right}>Qty Sold</th><th className={tableStyles.right}>Revenue</th><th className={tableStyles.right}>COGS</th><th className={tableStyles.right}>Margin %</th><th className={tableStyles.right}>Stock</th></tr>
              </thead>
              <tbody>
                {TOP_DRUGS.sort((a,b)=>b.qtySold-a.qtySold).map((d,i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:700 }}>{d.drug}</td>
                    <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{d.cat}</span></td>
                    <td className={tableStyles.right} style={{ fontWeight:600 }}>{d.qtySold.toLocaleString()}</td>
                    <td className={tableStyles.right} style={{ color:'var(--teal)', fontWeight:600 }}>{fmt(d.revenue)}</td>
                    <td className={tableStyles.right} style={{ color:'var(--red)' }}>{fmt(d.cogs)}</td>
                    <td className={tableStyles.right} style={{ fontWeight:700, color:d.margin>=50?'var(--teal)':'var(--amber)' }}>{d.margin.toFixed(1)}%</td>
                    <td className={tableStyles.right}>{d.stockLevel.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>TOTAL</td>
                  <td className={tableStyles.right}>{TOP_DRUGS.reduce((s,d)=>s+d.qtySold,0).toLocaleString()}</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(TOP_DRUGS.reduce((s,d)=>s+d.revenue,0))}</td>
                  <td className={tableStyles.right} style={{ color:'var(--red)' }}>{fmt(TOP_DRUGS.reduce((s,d)=>s+d.cogs,0))}</td>
                  <td className={tableStyles.right}>{(TOP_DRUGS.reduce((s,d)=>s+(d.revenue-d.cogs),0)/TOP_DRUGS.reduce((s,d)=>s+d.revenue,0)*100).toFixed(1)}%</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Stock KPIs ══════════════════════════════════════════════ */}
      {activeTab === 'stock' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            {[
              { label:'In Stock (OK)',       val:STOCK_REGISTER.filter(r=>r.status==='OK').length,       color:'#117A65', bg:'#d4edda' },
              { label:'Low Stock',           val:STOCK_REGISTER.filter(r=>r.status==='Low').length,      color:'#CA6F1E', bg:'#fff3cd' },
              { label:'Critical / Out',      val:STOCK_REGISTER.filter(r=>r.status==='Critical').length, color:'#C0392B', bg:'#f8d7da' },
            ].map(s => (
              <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'14px 16px', borderLeft:`4px solid ${s.color}` }}>
                <div style={{ fontSize:9, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:.4, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:9, color:s.color, opacity:.7, marginTop:2 }}>drug SKUs</div>
              </div>
            ))}
          </div>
 
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Monthly Stock-Out Incidents (Target ≤ 5)</div>
              <div style={{ height:200 }}>
                <Bar
                  data={{ labels:MONTHS.slice(0,11), datasets:[{ data:MONTHLY_STOCKOUTS.filter(v=>v!=null), backgroundColor:MONTHLY_STOCKOUTS.filter(v=>v!=null).map(v=>v>5?'#C0392B':v>3?'#CA6F1E':'#117A65'), borderRadius:4 }] }}
                  options={{ ...BASE, scales:{ x:X_NONE, y:{ ...Y_BASE, ticks:{ font:FONT, stepSize:2 } } } }}
                />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Stock Level vs Reorder Point</div>
              <div style={{ padding:'4px 0', overflowY:'auto', maxHeight:200 }}>
                {STOCK_REGISTER.map((r,i) => {
                  const pct = Math.min(100, r.onHand / (r.reorder * 2) * 100);
                  return (
                    <div key={i} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                        <span style={{ fontWeight:600, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.drug}</span>
                        <span style={{ fontWeight:700, color: r.status==='Critical'?'var(--red)':r.status==='Low'?'var(--amber)':'var(--teal)', whiteSpace:'nowrap' }}>
                          {r.onHand} {r.unit}
                        </span>
                      </div>
                      <ProgressBar pct={pct} color={r.status==='Critical'?'#C0392B':r.status==='Low'?'#CA6F1E':'#117A65'} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Drug Stock Register</div>
            <table className={tableStyles.table}>
              <thead>
                <tr><th>Drug</th><th>Category</th><th className={tableStyles.right}>On Hand</th><th>Unit</th><th className={tableStyles.right}>Reorder Lvl</th><th className={tableStyles.right}>Unit Cost</th><th className={tableStyles.right}>Stock Value</th><th>Status</th></tr>
              </thead>
              <tbody>
                {STOCK_REGISTER.map((r,i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:600 }}>{r.drug}</td>
                    <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.cat}</span></td>
                    <td className={tableStyles.right} style={{ fontWeight:700, color: r.status==='Critical'?'var(--red)':r.status==='Low'?'var(--amber)':'var(--text)' }}>{r.onHand.toLocaleString()}</td>
                    <td style={{ fontSize:10 }}>{r.unit}</td>
                    <td className={tableStyles.right} style={{ color:'var(--muted)' }}>{r.reorder}</td>
                    <td className={tableStyles.right}>{fmt(r.unitCost)}</td>
                    <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(r.onHand * r.unitCost)}</td>
                    <td><span className={`${tableStyles.badge} ${r.status==='Critical'?tableStyles.red:r.status==='Low'?tableStyles.amber:tableStyles.green}`}>{r.status==='OK'?'In Stock':r.status}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={6}>TOTAL STOCK VALUE</td><td className={tableStyles.right} style={{ color:'var(--navy)' }}>{fmt(stockValue)}</td><td/></tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Drug Categories ══════════════════════════════════════ */}
      {activeTab === 'categories' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Revenue by Drug Category</div>
              <div style={{ height:240 }}>
                <Doughnut
                  data={{ labels:DRUG_CATEGORIES.map(c=>c.cat), datasets:[{ data:DRUG_CATEGORIES.map(c=>+(c.revenue/1e6).toFixed(2)), backgroundColor:COLORS, borderWidth:2, borderColor:'#fff' }] }}
                  options={{ responsive:true, maintainAspectRatio:false, cutout:'52%', plugins:{ legend:{ display:true, position:'right', labels:{ font:FONT, boxWidth:10 } } } }}
                />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Margin % by Category</div>
              <div style={{ height:240 }}>
                <Bar
                  data={{ labels:DRUG_CATEGORIES.map(c=>c.cat), datasets:[{ data:DRUG_CATEGORIES.map(c=>+((c.revenue-c.cogs)/c.revenue*100).toFixed(1)), backgroundColor:DRUG_CATEGORIES.map(c=>(c.revenue-c.cogs)/c.revenue>=0.5?'#117A65':'#CA6F1E'), borderRadius:4 }] }}
                  options={{ ...BASE, indexAxis:'y', scales:{ x:Y_PCT, y:X_NONE } }}
                />
              </div>
            </div>
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Drug Category Performance Table</div>
            <table className={tableStyles.table}>
              <thead>
                <tr><th>Category</th><th>Top Drug</th><th className={tableStyles.right}>Revenue</th><th className={tableStyles.right}>COGS</th><th className={tableStyles.right}>Gross Profit</th><th className={tableStyles.right}>Margin %</th><th className={tableStyles.right}>Dispensed</th><th className={tableStyles.right}>Stock-Outs</th></tr>
              </thead>
              <tbody>
                {DRUG_CATEGORIES.sort((a,b)=>b.revenue-a.revenue).map((c,i) => {
                  const gp  = c.revenue - c.cogs;
                  const mg  = (gp/c.revenue*100).toFixed(1);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight:700 }}>{c.cat}</td>
                      <td style={{ fontSize:10, color:'var(--muted)' }}>{c.topDrug}</td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(c.revenue)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--red)' }}>{fmt(c.cogs)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)', fontWeight:700 }}>{fmt(gp)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700, color:+mg>=50?'var(--teal)':'var(--amber)' }}>{mg}%</td>
                      <td className={tableStyles.right}>{c.dispensed.toLocaleString()}</td>
                      <td className={tableStyles.right} style={{ fontWeight:700, color:c.stockOuts>5?'var(--red)':c.stockOuts>2?'var(--amber)':'var(--teal)' }}>{c.stockOuts}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>TOTAL</td>
                  <td className={tableStyles.right}>{fmt(DRUG_CATEGORIES.reduce((s,c)=>s+c.revenue,0))}</td>
                  <td className={tableStyles.right} style={{ color:'var(--red)' }}>{fmt(DRUG_CATEGORIES.reduce((s,c)=>s+c.cogs,0))}</td>
                  <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(DRUG_CATEGORIES.reduce((s,c)=>s+(c.revenue-c.cogs),0))}</td>
                  <td className={tableStyles.right}>{(DRUG_CATEGORIES.reduce((s,c)=>s+(c.revenue-c.cogs),0)/DRUG_CATEGORIES.reduce((s,c)=>s+c.revenue,0)*100).toFixed(1)}%</td>
                  <td className={tableStyles.right}>{DRUG_CATEGORIES.reduce((s,c)=>s+c.dispensed,0).toLocaleString()}</td>
                  <td className={tableStyles.right}>{DRUG_CATEGORIES.reduce((s,c)=>s+c.stockOuts,0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}