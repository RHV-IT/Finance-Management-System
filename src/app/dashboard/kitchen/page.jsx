'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { fmt, fmtM, COLORS } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
 
ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Filler, Tooltip, Legend
);
 
/* ── chart defaults ─────────────────────────────────────────────────────── */
const FONT    = { family: "'Inter','Segoe UI',Arial,sans-serif", size: 10 };
const GRID    = 'rgba(0,0,0,0.05)';
const BASE    = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const X_NONE  = { grid: { display: false }, ticks: { font: FONT } };
const Y_BASE  = { grid: { color: GRID }, ticks: { font: FONT } };
const LEGEND_B = { display: true, position: 'bottom', labels: { font: FONT, boxWidth: 10 } };
 
/* ── seed data ──────────────────────────────────────────────────────────── */
const WARDS = ['Ward A','Ward B','Ward C','ICU','Paediatrics','Maternity','Private Wing','VIP Suite'];
const DIET_TYPES = ['Regular','Diabetic','Cardiac','Renal','Paediatric','Soft / Liquid','High Protein','Low Sodium'];
const MEAL_TIMES = ['Breakfast','Lunch','Dinner','Snack','Special Diet'];
 
const SEED_MENU = [
  { code:'MN-001', name:'Jollof Rice & Grilled Chicken',  category:'Lunch / Dinner', diet:'Regular',       cost:750,  sell:1_800, status:'Active'   },
  { code:'MN-002', name:'Pap & Akara',                    category:'Breakfast',      diet:'Regular',       cost:280,  sell:650,   status:'Active'   },
  { code:'MN-003', name:'Vegetable Soup & Eba',           category:'Lunch / Dinner', diet:'Regular',       cost:680,  sell:1_600, status:'Active'   },
  { code:'MN-004', name:'Low-Salt Cardiac Plate',         category:'Lunch / Dinner', diet:'Cardiac',       cost:900,  sell:2_100, status:'Active'   },
  { code:'MN-005', name:'Diabetic Meal Plate',            category:'Lunch / Dinner', diet:'Diabetic',      cost:950,  sell:2_200, status:'Active'   },
  { code:'MN-006', name:'Paediatric Soft Porridge',       category:'Breakfast',      diet:'Paediatric',    cost:420,  sell:950,   status:'Active'   },
  { code:'MN-007', name:'Renal Diet Plate',               category:'Lunch / Dinner', diet:'Renal',         cost:1_100,sell:2_500, status:'Active'   },
  { code:'MN-008', name:'Fruit & Herbal Tea',             category:'Snack',          diet:'Regular',       cost:320,  sell:750,   status:'Active'   },
  { code:'MN-009', name:'High-Protein Recovery Meal',     category:'Lunch / Dinner', diet:'High Protein',  cost:1_200,sell:2_800, status:'Active'   },
  { code:'MN-010', name:'VIP Executive Breakfast',        category:'Breakfast',      diet:'Regular',       cost:1_800,sell:4_500, status:'Active'   },
  { code:'MN-011', name:'Blended Liquid Diet',            category:'Lunch / Dinner', diet:'Soft / Liquid', cost:580,  sell:1_350, status:'Active'   },
  { code:'MN-012', name:'Low-Sodium Evening Meal',        category:'Lunch / Dinner', diet:'Low Sodium',    cost:820,  sell:1_900, status:'Seasonal' },
];
 
const SEED_ORDERS = [
  { orderNo:'MO-001', date:'2025-11-28', patient:'Mr. Emeka Obi',       ward:'Ward A',    mealTime:'Breakfast', meal:'Pap & Akara',                qty:1, unitCost:280,  cost:280,    diet:'Regular',   status:'Served'   },
  { orderNo:'MO-002', date:'2025-11-28', patient:'Mrs. Amaka Nwosu',    ward:'Maternity', mealTime:'Lunch',     meal:'Vegetable Soup & Eba',       qty:1, unitCost:680,  cost:680,    diet:'Regular',   status:'Served'   },
  { orderNo:'MO-003', date:'2025-11-28', patient:'Mr. Tunde Adeyemi',   ward:'ICU',       mealTime:'Lunch',     meal:'Blended Liquid Diet',        qty:2, unitCost:580,  cost:1_160,  diet:'Soft / Liquid',status:'Prepared'},
  { orderNo:'MO-004', date:'2025-11-28', patient:'Chief Olawale Bello', ward:'VIP Suite', mealTime:'Breakfast', meal:'VIP Executive Breakfast',    qty:1, unitCost:1_800,cost:1_800,  diet:'Regular',   status:'Ordered'  },
  { orderNo:'MO-005', date:'2025-11-28', patient:'Mrs. Grace Eze',      ward:'Ward B',    mealTime:'Dinner',    meal:'Diabetic Meal Plate',        qty:1, unitCost:950,  cost:950,    diet:'Diabetic',  status:'Served'   },
  { orderNo:'MO-006', date:'2025-11-27', patient:'Baby Adaeze Okafor',  ward:'Paediatrics',mealTime:'Breakfast',meal:'Paediatric Soft Porridge',  qty:1, unitCost:420,  cost:420,    diet:'Paediatric',status:'Served'   },
  { orderNo:'MO-007', date:'2025-11-27', patient:'Mr. Chidi Mensah',    ward:'Ward C',    mealTime:'Lunch',     meal:'Low-Salt Cardiac Plate',     qty:1, unitCost:900,  cost:900,    diet:'Cardiac',   status:'Served'   },
  { orderNo:'MO-008', date:'2025-11-27', patient:'Mrs. Ngozi Peters',   ward:'Private Wing',mealTime:'Dinner',  meal:'High-Protein Recovery Meal', qty:1, unitCost:1_200,cost:1_200,  diet:'High Protein',status:'Served' },
  { orderNo:'MO-009', date:'2025-11-27', patient:'Mr. Babatunde Fashola',ward:'Ward A',  mealTime:'Snack',     meal:'Fruit & Herbal Tea',         qty:2, unitCost:320,  cost:640,    diet:'Regular',   status:'Served'   },
  { orderNo:'MO-010', date:'2025-11-26', patient:'Mrs. Funmi Adesanya', ward:'Maternity', mealTime:'Lunch',     meal:'Renal Diet Plate',           qty:1, unitCost:1_100,cost:1_100,  diet:'Renal',     status:'Served'   },
  { orderNo:'MO-011', date:'2025-11-26', patient:'Mr. Seun Abiodun',    ward:'Ward B',    mealTime:'Breakfast', meal:'Jollof Rice & Grilled Chicken',qty:1,unitCost:750, cost:750,    diet:'Regular',   status:'Served'   },
  { orderNo:'MO-012', date:'2025-11-26', patient:'Mrs. Chioma Ike',     ward:'ICU',       mealTime:'Dinner',    meal:'Blended Liquid Diet',        qty:1, unitCost:580,  cost:580,    diet:'Soft / Liquid',status:'Served'},
];
 
const SEED_STORE = [
  { item:'Rice (50kg bag)',              category:'Grains',      qty:18,  unit:'bag',      cost:78_000, reorder:5  },
  { item:'Vegetable Oil (25L keg)',      category:'Oils & Fats', qty:10,  unit:'keg',      cost:52_000, reorder:3  },
  { item:'Chicken (frozen, per kg)',     category:'Protein',     qty:95,  unit:'kg',       cost:3_400,  reorder:30 },
  { item:'Tomato Paste (carton)',        category:'Condiments',  qty:6,   unit:'carton',   cost:19_500, reorder:2  },
  { item:'Crayfish (per kg)',            category:'Condiments',  qty:12,  unit:'kg',       cost:8_500,  reorder:3  },
  { item:'Cooking Gas (12.5kg)',         category:'Fuel',        qty:8,   unit:'cylinder', cost:16_200, reorder:3  },
  { item:'Eggs (crates)',                category:'Protein',     qty:22,  unit:'crate',    cost:6_200,  reorder:5  },
  { item:'Milk – Full Cream (carton)',   category:'Dairy',       qty:14,  unit:'carton',   cost:14_800, reorder:4  },
  { item:'Plantain (bunch)',             category:'Vegetables',  qty:30,  unit:'bunch',    cost:2_500,  reorder:8  },
  { item:'Onions (bag)',                 category:'Vegetables',  qty:4,   unit:'bag',      cost:18_000, reorder:2  },
  { item:'Palm Oil (25L)',               category:'Oils & Fats', qty:5,   unit:'keg',      cost:45_000, reorder:2  },
  { item:'Stockfish (per kg)',           category:'Protein',     qty:8,   unit:'kg',       cost:7_500,  reorder:2  },
  { item:'Flour (50kg bag)',             category:'Grains',      qty:3,   unit:'bag',      cost:42_000, reorder:2  },
  { item:'Sugar (50kg bag)',             category:'Grains',      qty:2,   unit:'bag',      cost:58_000, reorder:2  },
];
 
/* ── Badge ──────────────────────────────────────────────────────────────── */
function Badge({ status }) {
  const map = {
    Active:'green', Seasonal:'amber', Served:'green',
    Prepared:'blue', Ordered:'amber', Cancelled:'red',
  };
  return (
    <span className={`${tableStyles.badge} ${tableStyles[map[status] ?? 'grey']}`}>
      {status}
    </span>
  );
}
 
/* ── Modal ──────────────────────────────────────────────────────────────── */
function Modal({ title, onClose, onSave, children }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'#fff',borderRadius:12,width:580,maxWidth:'96vw',maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
        <div style={{ padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ fontSize:15,fontWeight:800,color:'var(--navy)' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--muted)',lineHeight:1 }}>✕</button>
        </div>
        <div style={{ padding:20,overflowY:'auto',flex:1 }}>{children}</div>
        <div style={{ padding:'12px 18px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:8 }}>
          <button onClick={onClose} className={styles.btnGhost}>Cancel</button>
          <button onClick={onSave}  className={styles.btnSecondary}>💾 Save</button>
        </div>
      </div>
    </div>
  );
}
 
/* ── Field helpers ──────────────────────────────────────────────────────── */
const inputSt = { padding:'7px 9px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:12,outline:'none',width:'100%',fontFamily:'inherit' };
function Field({ label, children }) {
  return (
    <label style={{ display:'flex',flexDirection:'column',fontSize:10,fontWeight:700,color:'var(--navy)',gap:4 }}>
      {label}
      {children}
    </label>
  );
}
 
/* ════════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function KitchenPage() {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders,    setOrders]    = useState(SEED_ORDERS);
  const [menu,      setMenu]      = useState(SEED_MENU);
  const [store,     setStore]     = useState(SEED_STORE);
  const [search,    setSearch]    = useState('');
  const [mealFilter,setMealFilter]= useState('All');
 
  /* modal state */
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showMenuModal,  setShowMenuModal]  = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
 
  const [orderForm, setOrderForm] = useState({ date: new Date().toISOString().slice(0,10), patient:'', ward:WARDS[0], mealTime:'Lunch', meal:'', diet:'Regular', qty:'1', status:'Ordered' });
  const [menuForm,  setMenuForm]  = useState({ name:'', category:'Lunch / Dinner', diet:'Regular', cost:'', sell:'', status:'Active' });
  const [storeForm, setStoreForm] = useState({ item:'', category:'Grains', qty:'', unit:'', cost:'', reorder:'' });
 
  /* ── KPI totals ─────────────────────────────────────────────────────── */
  const today       = new Date().toISOString().slice(0,10);
  const todayOrders = orders.filter(o => o.date === today);
  const totalCost   = orders.reduce((s,o) => s + (o.cost || 0), 0);
  const totalMeals  = orders.reduce((s,o) => s + (o.qty  || 0), 0);
  const storeValue  = store.reduce((s,r) => s + r.qty * r.cost, 0);
  const lowStock    = store.filter(r => r.qty <= r.reorder).length;
  const servedPct   = orders.length ? (orders.filter(o=>o.status==='Served').length / orders.length * 100).toFixed(0) : 0;
 
  /* ── filtered orders ────────────────────────────────────────────────── */
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(o =>
      (!q || o.patient.toLowerCase().includes(q) || o.ward.toLowerCase().includes(q) || o.meal.toLowerCase().includes(q)) &&
      (mealFilter === 'All' || o.mealTime === mealFilter)
    );
  }, [orders, search, mealFilter]);
 
  /* ── analytics data ─────────────────────────────────────────────────── */
  const byMealTime = useMemo(() => {
    const m = {};
    orders.forEach(o => { m[o.mealTime] = (m[o.mealTime] || 0) + o.qty; });
    return Object.entries(m).sort((a,b) => b[1]-a[1]);
  }, [orders]);
 
  const byWard = useMemo(() => {
    const m = {};
    orders.forEach(o => { m[o.ward] = (m[o.ward] || 0) + o.qty; });
    return Object.entries(m).sort((a,b) => b[1]-a[1]);
  }, [orders]);
 
  const byDiet = useMemo(() => {
    const m = {};
    orders.forEach(o => { m[o.diet] = (m[o.diet] || 0) + o.qty; });
    return Object.entries(m).sort((a,b) => b[1]-a[1]);
  }, [orders]);
 
  const storeByCat = useMemo(() => {
    const m = {};
    store.forEach(r => { m[r.category] = (m[r.category] || 0) + r.qty * r.cost; });
    return Object.entries(m).sort((a,b) => b[1]-a[1]);
  }, [store]);
 
  /* ── save handlers ──────────────────────────────────────────────────── */
  function saveOrder() {
    const menuItem = menu.find(m => m.name === orderForm.meal);
    const unitCost = menuItem ? menuItem.cost : 0;
    setOrders(p => [{
      orderNo: `MO-${String(p.length+1).padStart(3,'0')}`,
      ...orderForm,
      qty: +orderForm.qty || 1,
      unitCost,
      cost: unitCost * (+orderForm.qty || 1),
    }, ...p]);
    setShowOrderModal(false);
    setOrderForm({ date: new Date().toISOString().slice(0,10), patient:'', ward:WARDS[0], mealTime:'Lunch', meal:'', diet:'Regular', qty:'1', status:'Ordered' });
  }
 
  function saveMenu() {
    setMenu(p => [{
      code: `MN-${String(p.length+1).padStart(3,'0')}`,
      ...menuForm,
      cost: +menuForm.cost || 0,
      sell: +menuForm.sell || 0,
    }, ...p]);
    setShowMenuModal(false);
    setMenuForm({ name:'', category:'Lunch / Dinner', diet:'Regular', cost:'', sell:'', status:'Active' });
  }
 
  function saveStore() {
    setStore(p => [{
      ...storeForm,
      qty: +storeForm.qty || 0,
      cost: +storeForm.cost || 0,
      reorder: +storeForm.reorder || 0,
    }, ...p]);
    setShowStoreModal(false);
    setStoreForm({ item:'', category:'Grains', qty:'', unit:'', cost:'', reorder:'' });
  }
 
  function advanceOrder(orderNo) {
    const flow = { Ordered:'Prepared', Prepared:'Served' };
    setOrders(p => p.map(o => o.orderNo === orderNo ? { ...o, status: flow[o.status] || o.status } : o));
  }
 
  function exportCSV(data, filename, cols) {
    const rows = [cols.join(','), ...data.map(r => cols.map(c => `"${r[c] ?? ''}"`).join(','))];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type:'text/csv' }));
    a.download = filename; a.click();
  }
 
  const TABS = [
    { id:'orders',    label:'🧾 Meal Orders'     },
    { id:'menu',      label:'📖 Menu'             },
    { id:'store',     label:'📦 Kitchen Store'    },
    { id:'analytics', label:'📊 Analytics'        },
  ];
 
  return (
    <DashboardLayout>
 
      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showOrderModal && (
        <Modal title="🧾 New Meal Order" onClose={() => setShowOrderModal(false)} onSave={saveOrder}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 16px' }}>
            <Field label="Date"><input type="date" style={inputSt} value={orderForm.date} onChange={e=>setOrderForm(p=>({...p,date:e.target.value}))} /></Field>
            <Field label="Patient / Name"><input type="text" style={inputSt} placeholder="Full name" value={orderForm.patient} onChange={e=>setOrderForm(p=>({...p,patient:e.target.value}))} /></Field>
            <Field label="Ward / Location">
              <select style={inputSt} value={orderForm.ward} onChange={e=>setOrderForm(p=>({...p,ward:e.target.value}))}>
                {WARDS.map(w=><option key={w}>{w}</option>)}
              </select>
            </Field>
            <Field label="Meal Time">
              <select style={inputSt} value={orderForm.mealTime} onChange={e=>setOrderForm(p=>({...p,mealTime:e.target.value}))}>
                {MEAL_TIMES.map(t=><option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Menu Item">
              <select style={inputSt} value={orderForm.meal} onChange={e=>setOrderForm(p=>({...p,meal:e.target.value}))}>
                <option value="">— select —</option>
                {menu.filter(m=>m.status==='Active').map(m=><option key={m.code} value={m.name}>{m.name} ({fmt(m.cost)})</option>)}
              </select>
            </Field>
            <Field label="Diet Type">
              <select style={inputSt} value={orderForm.diet} onChange={e=>setOrderForm(p=>({...p,diet:e.target.value}))}>
                {DIET_TYPES.map(d=><option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Quantity"><input type="number" min={1} style={inputSt} value={orderForm.qty} onChange={e=>setOrderForm(p=>({...p,qty:e.target.value}))} /></Field>
            <Field label="Status">
              <select style={inputSt} value={orderForm.status} onChange={e=>setOrderForm(p=>({...p,status:e.target.value}))}>
                <option>Ordered</option><option>Prepared</option><option>Served</option>
              </select>
            </Field>
          </div>
        </Modal>
      )}
 
      {showMenuModal && (
        <Modal title="📖 Add Menu Item" onClose={() => setShowMenuModal(false)} onSave={saveMenu}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 16px' }}>
            <Field label="Meal Item Name" ><input type="text" style={inputSt} placeholder="e.g. Jollof Rice & Chicken" value={menuForm.name} onChange={e=>setMenuForm(p=>({...p,name:e.target.value}))} /></Field>
            <Field label="Category">
              <select style={inputSt} value={menuForm.category} onChange={e=>setMenuForm(p=>({...p,category:e.target.value}))}>
                {['Breakfast','Lunch / Dinner','Snack','Dessert','Beverage'].map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Diet Type">
              <select style={inputSt} value={menuForm.diet} onChange={e=>setMenuForm(p=>({...p,diet:e.target.value}))}>
                {DIET_TYPES.map(d=><option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select style={inputSt} value={menuForm.status} onChange={e=>setMenuForm(p=>({...p,status:e.target.value}))}>
                <option>Active</option><option>Seasonal</option><option>Discontinued</option>
              </select>
            </Field>
            <Field label="Cost Price (₦)"><input type="number" style={inputSt} placeholder="0" value={menuForm.cost} onChange={e=>setMenuForm(p=>({...p,cost:e.target.value}))} /></Field>
            <Field label="Selling Price (₦)"><input type="number" style={inputSt} placeholder="0" value={menuForm.sell} onChange={e=>setMenuForm(p=>({...p,sell:e.target.value}))} /></Field>
          </div>
        </Modal>
      )}
 
      {showStoreModal && (
        <Modal title="📦 Add Kitchen Stock" onClose={() => setShowStoreModal(false)} onSave={saveStore}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 16px' }}>
            <Field label="Item Name"><input type="text" style={inputSt} placeholder="e.g. Rice (50kg bag)" value={storeForm.item} onChange={e=>setStoreForm(p=>({...p,item:e.target.value}))} /></Field>
            <Field label="Category">
              <select style={inputSt} value={storeForm.category} onChange={e=>setStoreForm(p=>({...p,category:e.target.value}))}>
                {['Grains','Protein','Vegetables','Oils & Fats','Condiments','Dairy','Fuel','Other'].map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Quantity"><input type="number" style={inputSt} placeholder="0" value={storeForm.qty} onChange={e=>setStoreForm(p=>({...p,qty:e.target.value}))} /></Field>
            <Field label="Unit"><input type="text" style={inputSt} placeholder="bag, kg, keg…" value={storeForm.unit} onChange={e=>setStoreForm(p=>({...p,unit:e.target.value}))} /></Field>
            <Field label="Unit Cost (₦)"><input type="number" style={inputSt} placeholder="0" value={storeForm.cost} onChange={e=>setStoreForm(p=>({...p,cost:e.target.value}))} /></Field>
            <Field label="Reorder Level"><input type="number" style={inputSt} placeholder="0" value={storeForm.reorder} onChange={e=>setStoreForm(p=>({...p,reorder:e.target.value}))} /></Field>
          </div>
        </Modal>
      )}
 
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🍽️ Kitchen Management</h2>
          <p className={styles.pageMeta}>Meal orders · Menu · Kitchen store · Analytics — FY 2025</p>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button className={styles.btnSecondary} onClick={()=>setShowOrderModal(true)}>＋ New Meal Order</button>
          <button className={styles.btnGhost}
            onClick={()=>exportCSV(orders,'kitchen_orders.csv',['orderNo','date','patient','ward','mealTime','meal','diet','qty','cost','status'])}>
            ⬇ Export CSV
          </button>
        </div>
      </div>
 
      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Today's Orders"    value={todayOrders.length.toString()}    delta={`${todayOrders.reduce((s,o)=>s+o.qty,0)} meals`} deltaType="up"      color="blue"   />
        <KPICard label="Total Meals Served" value={totalMeals.toLocaleString()}     delta="All-time"                                        deltaType="up"      color="green"  />
        <KPICard label="Total Meal Cost"    value={fmt(totalCost)}                  delta="Kitchen expenditure"                             deltaType="warn"    color="amber"  />
        <KPICard label="Avg Cost / Meal"    value={fmt(totalMeals ? totalCost/totalMeals : 0)} delta="Per plate average"                   deltaType="neutral" color="purple" />
        <KPICard label="Menu Items Active"  value={menu.filter(m=>m.status==='Active').length.toString()} delta={`${menu.length} total`}   deltaType="neutral" color="teal"   />
        <KPICard label="Kitchen Store Value" value={fmt(storeValue)}                delta={`${store.length} ingredient SKUs`}               deltaType="neutral" color="blue"   />
        <KPICard label="Low-Stock Ingredients" value={lowStock.toString()}          delta="Below reorder level"                             deltaType={lowStock>0?'warn':'up'} badge={lowStock>0?'Action':'Clear'} badgeType={lowStock>0?'warn':'good'} color={lowStock>0?'amber':'green'} />
        <KPICard label="Service Rate"       value={`${servedPct}%`}                delta="Orders fully served"                             deltaType={+servedPct>=80?'up':'warn'} badge={+servedPct>=80?'Good':'Monitor'} badgeType={+servedPct>=80?'good':'warn'} color={+servedPct>=80?'green':'amber'} />
      </div>
 
      {/* ── Tab Strip ───────────────────────────────────────────────────── */}
      <div className={styles.tabStrip}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`${styles.tabBtn} ${activeTab===t.id ? styles.active : ''}`}>
            {t.label}
          </button>
        ))}
      </div>
 
      {/* ════ TAB: Meal Orders ════════════════════════════════════════════ */}
      {activeTab === 'orders' && (
        <>
          <div className={styles.toolbar}>
            <button className={styles.btnSecondary} onClick={()=>setShowOrderModal(true)}>＋ New Meal Order</button>
            <input className={styles.toolbarSearch} placeholder="🔍 Search patient / ward / meal…"
              value={search} onChange={e=>setSearch(e.target.value)} />
            <select style={{ padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:11,outline:'none' }}
              value={mealFilter} onChange={e=>setMealFilter(e.target.value)}>
              <option>All</option>
              {MEAL_TIMES.map(t=><option key={t}>{t}</option>)}
            </select>
            <span className={styles.spacer}/>
            <span style={{ fontSize:11,color:'var(--muted)' }}>{filteredOrders.length} orders</span>
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Meal Order Register</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Order No</th><th>Date</th><th>Patient</th><th>Ward</th>
                  <th>Meal Time</th><th>Menu Item</th><th>Diet</th>
                  <th className={tableStyles.right}>Qty</th>
                  <th className={tableStyles.right}>Cost</th>
                  <th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr key={o.orderNo}>
                    <td style={{ fontFamily:'monospace',fontSize:10,fontWeight:700 }}>{o.orderNo}</td>
                    <td style={{ whiteSpace:'nowrap' }}>{o.date}</td>
                    <td style={{ fontWeight:600 }}>{o.patient}</td>
                    <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{o.ward}</span></td>
                    <td>{o.mealTime}</td>
                    <td style={{ fontWeight:500 }}>{o.meal}</td>
                    <td>
                      <span className={`${tableStyles.badge} ${
                        o.diet==='Diabetic'?tableStyles.amber:
                        o.diet==='Cardiac'?tableStyles.red:
                        o.diet==='Renal'?tableStyles.purple:
                        tableStyles.grey
                      }`}>{o.diet}</span>
                    </td>
                    <td className={tableStyles.right}>{o.qty}</td>
                    <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(o.cost)}</td>
                    <td><Badge status={o.status} /></td>
                    <td>
                      {o.status !== 'Served' && o.status !== 'Cancelled' && (
                        <button onClick={()=>advanceOrder(o.orderNo)}
                          style={{ padding:'3px 9px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:5,cursor:'pointer',fontSize:10 }}>
                          {o.status==='Ordered'?'Mark Prepared':'Mark Served'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7}>TOTAL ({filteredOrders.length} orders)</td>
                  <td className={tableStyles.right}>{filteredOrders.reduce((s,o)=>s+o.qty,0)}</td>
                  <td className={tableStyles.right} style={{ color:'var(--navy)' }}>{fmt(filteredOrders.reduce((s,o)=>s+o.cost,0))}</td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Menu ══════════════════════════════════════════════════ */}
      {activeTab === 'menu' && (
        <>
          <div className={styles.toolbar}>
            <button className={styles.btnSecondary} onClick={()=>setShowMenuModal(true)}>＋ Add Menu Item</button>
            <button className={styles.btnGhost}
              onClick={()=>exportCSV(menu,'kitchen_menu.csv',['code','name','category','diet','cost','sell','status'])}>
              ⬇ Download Menu
            </button>
            <span className={styles.spacer}/>
            <span style={{ fontSize:11,color:'var(--muted)' }}>
              {menu.filter(m=>m.status==='Active').length} active · {menu.filter(m=>m.status==='Seasonal').length} seasonal · {menu.length} total
            </span>
          </div>
 
          {/* Menu profitability summary */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16 }}>
            {[
              { label:'Active Items',  value:menu.filter(m=>m.status==='Active').length,  color:'#117A65', bg:'#d4edda' },
              { label:'Avg Cost/Plate',value:`₦${(menu.reduce((s,m)=>s+m.cost,0)/menu.length||0).toFixed(0)}`, color:'#CA6F1E', bg:'#fff3cd' },
              { label:'Avg Sell Price',value:`₦${(menu.reduce((s,m)=>s+m.sell,0)/menu.length||0).toFixed(0)}`, color:'#1B4F72', bg:'#d1ecf1' },
              { label:'Avg Margin',    value:`${((menu.reduce((s,m)=>s+(m.sell-m.cost),0)/menu.reduce((s,m)=>s+m.sell||1,0))*100).toFixed(1)}%`, color:'#6C3483', bg:'#e8d5f5' },
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg,borderRadius:10,padding:'14px 16px',borderLeft:`4px solid ${s.color}` }}>
                <div style={{ fontSize:10,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:.4,marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:20,fontWeight:800,color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Menu Register</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Code</th><th>Menu Item</th><th>Category</th><th>Diet Type</th>
                  <th className={tableStyles.right}>Cost / Plate</th>
                  <th className={tableStyles.right}>Selling Price</th>
                  <th className={tableStyles.right}>Gross Margin</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {menu.map(m => {
                  const margin = m.sell > 0 ? ((m.sell - m.cost) / m.sell * 100).toFixed(1) : 0;
                  return (
                    <tr key={m.code}>
                      <td style={{ fontFamily:'monospace',fontSize:10,fontWeight:700 }}>{m.code}</td>
                      <td style={{ fontWeight:600 }}>{m.name}</td>
                      <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{m.category}</span></td>
                      <td>
                        <span className={`${tableStyles.badge} ${
                          m.diet==='Diabetic'?tableStyles.amber:
                          m.diet==='Cardiac'||m.diet==='Renal'?tableStyles.red:
                          m.diet==='Paediatric'?tableStyles.purple:
                          tableStyles.grey
                        }`}>{m.diet}</span>
                      </td>
                      <td className={tableStyles.right}>{fmt(m.cost)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(m.sell)}</td>
                      <td className={tableStyles.right}>
                        <span style={{ fontWeight:700,color:+margin>50?'var(--teal)':+margin>30?'var(--amber)':'var(--red)' }}>
                          {margin}%
                        </span>
                      </td>
                      <td><Badge status={m.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>TOTALS ({menu.length} items)</td>
                  <td className={tableStyles.right}>{fmt(menu.reduce((s,m)=>s+m.cost,0)/menu.length||0)} avg</td>
                  <td className={tableStyles.right}>{fmt(menu.reduce((s,m)=>s+m.sell,0)/menu.length||0)} avg</td>
                  <td className={tableStyles.right}>
                    {((menu.reduce((s,m)=>s+(m.sell-m.cost),0)/menu.reduce((s,m)=>s+(m.sell||1),0))*100).toFixed(1)}%
                  </td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Kitchen Store ══════════════════════════════════════════ */}
      {activeTab === 'store' && (
        <>
          <div className={styles.toolbar}>
            <button className={styles.btnSecondary} onClick={()=>setShowStoreModal(true)}>＋ Add Stock Item</button>
            <button className={styles.btnGhost}
              onClick={()=>exportCSV(store,'kitchen_store.csv',['item','category','qty','unit','cost','reorder'])}>
              ⬇ Download Store
            </button>
            <span className={styles.spacer}/>
            <span style={{ fontSize:11,color:'var(--muted)' }}>
              Total value: <strong style={{ color:'var(--navy)' }}>{fmt(storeValue)}</strong> · {lowStock} low-stock items
            </span>
          </div>
 
          {/* Store category cards */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:16 }}>
            {storeByCat.map(([cat,val],i) => (
              <div key={cat} style={{ background:'#fff',borderRadius:8,padding:'12px 14px',borderLeft:`3px solid ${COLORS[i%COLORS.length]}`,boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize:9,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.4 }}>{cat}</div>
                <div style={{ fontSize:15,fontWeight:800,color:'var(--navy)',marginTop:3 }}>{fmt(val)}</div>
              </div>
            ))}
          </div>
 
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Ingredient / Kitchen Stock Register</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Item</th><th>Category</th>
                  <th className={tableStyles.right}>Qty on Hand</th>
                  <th>Unit</th>
                  <th className={tableStyles.right}>Unit Cost</th>
                  <th className={tableStyles.right}>Stock Value</th>
                  <th className={tableStyles.right}>Reorder Lvl</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {store.map((r,i) => {
                  const low = r.qty <= r.reorder;
                  const out = r.qty === 0;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight:600 }}>{r.item}</td>
                      <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.category}</span></td>
                      <td className={tableStyles.right}
                        style={{ fontWeight:700,color:out?'var(--red)':low?'var(--amber)':'var(--text)' }}>
                        {r.qty}
                      </td>
                      <td>{r.unit}</td>
                      <td className={tableStyles.right}>{fmt(r.cost)}</td>
                      <td className={tableStyles.right} style={{ fontWeight:600 }}>{fmt(r.qty*r.cost)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--muted)' }}>{r.reorder}</td>
                      <td>
                        <span className={`${tableStyles.badge} ${out?tableStyles.red:low?tableStyles.amber:tableStyles.green}`}>
                          {out?'Out of Stock':low?'Low Stock':'In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>TOTAL ({store.length} items)</td>
                  <td className={tableStyles.right}>{fmt(storeValue)}</td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
 
      {/* ════ TAB: Analytics ════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <>
          {/* Row 1 charts */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Meals by Meal Time</div>
              <div style={{ height:220 }}>
                <Doughnut
                  data={{
                    labels: byMealTime.map(e=>e[0]),
                    datasets:[{ data:byMealTime.map(e=>e[1]), backgroundColor:COLORS, borderWidth:2, borderColor:'#fff' }],
                  }}
                  options={{ responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{ legend:LEGEND_B } }}
                />
              </div>
            </div>
 
            <div className={styles.card}>
              <div className={styles.cardTitle}>Orders by Ward</div>
              <div style={{ height:220 }}>
                <Bar
                  data={{
                    labels: byWard.map(e=>e[0]),
                    datasets:[{ data:byWard.map(e=>e[1]), backgroundColor:COLORS, borderRadius:4 }],
                  }}
                  options={{ ...BASE, indexAxis:'y', scales:{ x:{...Y_BASE}, y:{...X_NONE} } }}
                />
              </div>
            </div>
          </div>
 
          {/* Row 2 charts */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Meals by Diet Type</div>
              <div style={{ height:200 }}>
                <Bar
                  data={{
                    labels: byDiet.map(e=>e[0]),
                    datasets:[{ data:byDiet.map(e=>e[1]), backgroundColor:COLORS, borderRadius:4 }],
                  }}
                  options={{ ...BASE, scales:{ x:X_NONE, y:Y_BASE } }}
                />
              </div>
            </div>
 
            <div className={styles.card}>
              <div className={styles.cardTitle}>Kitchen Store Value by Category</div>
              <div style={{ height:200 }}>
                <Doughnut
                  data={{
                    labels: storeByCat.map(e=>e[0]),
                    datasets:[{ data:storeByCat.map(e=>+(e[1]/1e6).toFixed(2)), backgroundColor:COLORS, borderWidth:2, borderColor:'#fff' }],
                  }}
                  options={{ responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{ legend:{ display:true,position:'right',labels:{ font:FONT,boxWidth:10 } } } }}
                />
              </div>
            </div>
          </div>
 
          {/* Menu profitability table */}
          <div className={tableStyles.tableBox}>
            <div className={tableStyles.tableTitle}>Menu Profitability Summary</div>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Menu Item</th><th>Diet</th>
                  <th className={tableStyles.right}>Cost</th>
                  <th className={tableStyles.right}>Sell Price</th>
                  <th className={tableStyles.right}>Gross Profit</th>
                  <th className={tableStyles.right}>Margin %</th>
                  <th>Profitability</th>
                </tr>
              </thead>
              <tbody>
                {[...menu].sort((a,b)=>(b.sell-b.cost)-(a.sell-a.cost)).map(m=>{
                  const gp  = m.sell - m.cost;
                  const pct = m.sell > 0 ? (gp/m.sell*100).toFixed(1) : 0;
                  return (
                    <tr key={m.code}>
                      <td style={{ fontWeight:600 }}>{m.name}</td>
                      <td><span className={`${tableStyles.badge} ${tableStyles.grey}`}>{m.diet}</span></td>
                      <td className={tableStyles.right}>{fmt(m.cost)}</td>
                      <td className={tableStyles.right}>{fmt(m.sell)}</td>
                      <td className={tableStyles.right} style={{ color:'var(--teal)',fontWeight:600 }}>{fmt(gp)}</td>
                      <td className={tableStyles.right}>
                        <span style={{ fontWeight:700,color:+pct>55?'var(--teal)':+pct>35?'var(--amber)':'var(--red)' }}>{pct}%</span>
                      </td>
                      <td>
                        <div style={{ background:'#e8ecf0',borderRadius:4,height:7,overflow:'hidden',width:100 }}>
                          <div style={{ height:'100%',borderRadius:4,width:`${pct}%`,background:+pct>55?'#117A65':+pct>35?'#CA6F1E':'#C0392B',transition:'width .5s' }}/>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}