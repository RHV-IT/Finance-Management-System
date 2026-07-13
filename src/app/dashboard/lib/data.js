// lib/data.js — shared demo data
 
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 
export const REVENUE_2025 = [59115177,83134775,59141562,73836656,125937047,111267326,117226437,180908371,177079945,152835107,155113415,168912241];
 
export const EXPENSES_2025 = [22000000,37700000,28200000,125200000,44300000,30300000,32500000,56300000,51000000,72400000,58700000,39600000];
 
export const REVENUE_2024 = [0,0,0,0,1973552,10863834,21534562,43326015,31003875,35223069,45339511,50181383];
 
export const MONTHLY_TARGET = 120000000;
 
export const STREAMS = [
  { name:'Drugs & Consumables',     ytd:336800000, dept:'Pharmacy',          monthly: REVENUE_2025.map(v=>v*0.23) },
  { name:'Bed Fee (Admission)',      ytd:180600000, dept:'Inpatient / Wards', monthly: REVENUE_2025.map(v=>v*0.123) },
  { name:'Surgery Fee',             ytd:157700000, dept:'Theatre & Surgery',  monthly: REVENUE_2025.map(v=>v*0.108) },
  { name:'Lab Services',            ytd:143000000, dept:'Laboratory',         monthly: REVENUE_2025.map(v=>v*0.098) },
  { name:'Radiology & Imaging',     ytd:126800000, dept:'Radiology',          monthly: REVENUE_2025.map(v=>v*0.087) },
  { name:'Consultation Fee',        ytd:99500000,  dept:'Outpatient',         monthly: REVENUE_2025.map(v=>v*0.068) },
  { name:'Dialysis',                ytd:61700000,  dept:'Dialysis Unit',      monthly: REVENUE_2025.map(v=>v*0.042) },
  { name:'Physiotherapy',           ytd:54000000,  dept:'Physiotherapy',      monthly: REVENUE_2025.map(v=>v*0.037) },
  { name:'CT Scan',                 ytd:54900000,  dept:'Radiology',          monthly: REVENUE_2025.map(v=>v*0.037) },
  { name:'Cardiology',              ytd:11600000,  dept:'Cardiology',         monthly: REVENUE_2025.map(v=>v*0.008) },
];
 
export const DEBTORS = {
  categories: ['Regular Patients','Corporates','Mission','Habitation of Hope','Peaceville School','Goshen'],
  months: ['Oct 2025','Nov 2025'],
  data: [[12983960,4412959],[11258707,8920076],[8175926,1746965],[1454902,1569483],[1101563,913890],[465000,374000]],
  totals: [29018311,37326070],
  latest: 37326070,
  prev: 29018311,
  growth: 28.6,
};
 
export const EXPENSE_CATS = [
  { n:'Medical Supplies & Drugs', sh:0.42 },
  { n:'Staff & Personnel',        sh:0.31 },
  { n:'Utilities',                sh:0.12 },
  { n:'Capital Expenditure',      sh:0.06 },
  { n:'Admin & Professional',     sh:0.05 },
  { n:'Repairs & Maintenance',    sh:0.04 },
];
 
export const KPI_RATINGS = [
  { kpi:'Monthly Revenue Achievement', v24:'49.7%', v25:'122.0%', target:'>100%',  rating:'green' },
  { kpi:'Debtor/Revenue Ratio',         v24:'19.0%', v25:'24.1%', target:'<20%',   rating:'red' },
  { kpi:'Estimated Gross Margin',       v24:'~45%',  v25:'~52%',  target:'>45%',   rating:'green' },
  { kpi:'Total Debtors Outstanding',    v24:'₦29M',  v25:'₦37.3M',target:'<₦25M', rating:'red' },
  { kpi:'Store Requisition Rate',       v24:'—',     v25:'96.8%', target:'>95%',   rating:'green' },
  { kpi:'Supplier Payment Compliance',  v24:'—',     v25:'94.2%', target:'>90%',   rating:'green' },
  { kpi:'Inventory Turnover',           v24:'—',     v25:'7.2×',  target:'>6×',    rating:'green' },
  { kpi:'Expired Stock Ratio',          v24:'—',     v25:'0.3%',  target:'<1%',    rating:'green' },
];
 
export const COLORS = [
  '#1B4F72','#117A65','#6C3483','#CA6F1E',
  '#D85A30','#639922','#1ABC9C','#F39C12',
  '#E74C3C','#3498DB','#9B59B6','#E67E22',
];
 
// Formatters
export const fmt = (n) => {
  if (!n || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return '₦' + (n/1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return '₦' + (n/1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return '₦' + (n/1e3).toFixed(0) + 'K';
  return '₦' + Math.round(n).toLocaleString();
};
 
export const fmtM = (n) => +(n/1e6).toFixed(1);









// ─── Named demo exports for every module ──────────────────────
// Pages import these as fallback. useData() returns these when
// nothing has been uploaded yet for that module/month/dept.

export const DEMO_REVENUE_MONTHLY = MONTHS.map((m, i) => ({
  month:    `${m} 2025`,
  revenue:  REVENUE_2025[i],
  expenses: EXPENSES_2025[i],
  target:   MONTHLY_TARGET,
}));

export const DEMO_REVENUE_STREAMS = STREAMS.map(s => ({
  name:   s.name,
  dept:   s.dept,
  ytd:    s.ytd,
  amount: s.ytd,
}));

export const DEMO_DEBTORS = DEBTORS.categories.map((cat, i) => ({
  category: cat,
  amount:   DEBTORS.data[i][1],
  priority: i < 2 ? 'High' : 'Medium',
}));

export const DEMO_STOCK = [
  { item:'Cannula 18G',            category:'Consumables', qty:2380, unit:'Pcs',    unitCost:800,   reorder:50,  expiry:'2026-08-01', vendor:'MedEquip Supplies'   },
  { item:'Metformin 500mg',        category:'Drugs',       qty:6180, unit:'Tablet', unitCost:120,   reorder:500, expiry:'2026-12-01', vendor:'Pharmaplus Nigeria Ltd'},
  { item:'IV Normal Saline 500ml', category:'Fluids',      qty:1780, unit:'Bottle', unitCost:1500,  reorder:200, expiry:'2026-06-01', vendor:'HealthCare Distributors'},
  { item:'Surgical Gloves M',      category:'Consumables', qty:3550, unit:'Pcs',    unitCost:850,   reorder:300, expiry:'2027-01-01', vendor:'MedEquip Supplies'   },
  { item:'Amlodipine 5mg',         category:'Drugs',       qty:4790, unit:'Tablet', unitCost:350,   reorder:300, expiry:'2026-11-01', vendor:'Pharmaplus Nigeria Ltd'},
  { item:'Blood Glucose Strips',   category:'Lab',         qty:1150, unit:'Strip',  unitCost:2800,  reorder:100, expiry:'2026-05-01', vendor:'DiagnosTech'         },
  { item:'Amoxicillin 500mg',      category:'Drugs',       qty:45,   unit:'Tablet', unitCost:80,    reorder:500, expiry:'2025-12-15', vendor:'Pharmaplus Nigeria Ltd'},
  { item:'CT Contrast Media',      category:'X-Ray',       qty:12,   unit:'Vial',   unitCost:12000, reorder:15,  expiry:'2026-03-01', vendor:'ImageCare Nigeria'   },
];

export const DEMO_SRV = [
  { srvNo:'SRV-001', date:'2025-11-20', item:'Cannula 18G',            category:'Consumables', qty:500,  unit:'Pcs',    unitCost:800,  vendor:'MedEquip Supplies',       poRef:'PO-0041', expiry:'2026-08-01' },
  { srvNo:'SRV-002', date:'2025-11-18', item:'Metformin 500mg',        category:'Drugs',       qty:2000, unit:'Tablet', unitCost:120,  vendor:'Pharmaplus Nigeria Ltd',   poRef:'PO-0039', expiry:'2026-12-01' },
  { srvNo:'SRV-003', date:'2025-11-15', item:'IV Normal Saline 500ml', category:'Fluids',      qty:400,  unit:'Bottle', unitCost:1500, vendor:'HealthCare Distributors',  poRef:'PO-0037', expiry:'2026-06-01' },
  { srvNo:'SRV-004', date:'2025-11-10', item:'Surgical Gloves M',      category:'Consumables', qty:1000, unit:'Pcs',    unitCost:850,  vendor:'MedEquip Supplies',       poRef:'PO-0035', expiry:'2027-01-01' },
  { srvNo:'SRV-005', date:'2025-11-05', item:'Oxygen Cylinder Refill', category:'Medical Gas', qty:50,   unit:'Pcs',    unitCost:15000,vendor:'GasSupply Nigeria',        poRef:'PO-0033', expiry:''           },
];

export const DEMO_STOCK_OUT = [
  { issueNo:'ISS-001', date:'2025-11-25', item:'Cannula 18G',           qty:20,  value:16000,  dept:'ICU',        purpose:'Ward stock replenishment' },
  { issueNo:'ISS-002', date:'2025-11-24', item:'Metformin 500mg',       qty:200, value:24000,  dept:'Outpatient', purpose:'Prescription dispensing'  },
  { issueNo:'ISS-003', date:'2025-11-23', item:'Surgical Gloves M',     qty:50,  value:42500,  dept:'Theatre',    purpose:'Surgery packs'            },
  { issueNo:'ISS-004', date:'2025-11-22', item:'Amoxicillin 500mg',     qty:60,  value:4800,   dept:'Pharmacy',   purpose:'Patient dispensing'       },
  { issueNo:'ISS-005', date:'2025-11-21', item:'IV Normal Saline 500ml',qty:30,  value:45000,  dept:'ICU',        purpose:'IV hydration'             },
];

export const DEMO_POS = [
  { poNo:'PO-0041', date:'2025-11-18', vendor:'MedEquip Supplies',      item:'Cannula 18G',            category:'Consumables', qty:500,  total:400000,  expectedDate:'2025-11-22', status:'Received'  },
  { poNo:'PO-0042', date:'2025-11-19', vendor:'Pharmaplus Nigeria Ltd', item:'Metformin 500mg',        category:'Drugs',       qty:2000, total:240000,  expectedDate:'2025-11-22', status:'Received'  },
  { poNo:'PO-0043', date:'2025-11-22', vendor:'HealthCare Distributors',item:'IV Normal Saline 500ml', category:'Fluids',      qty:400,  total:600000,  expectedDate:'2025-11-26', status:'Approved'  },
  { poNo:'PO-0044', date:'2025-11-24', vendor:'DiagnosTech',            item:'Blood Glucose Strips',   category:'Lab',         qty:300,  total:840000,  expectedDate:'2025-11-28', status:'Sent'      },
  { poNo:'PO-0045', date:'2025-11-25', vendor:'GasSupply Nigeria',      item:'Oxygen Cylinder Refill', category:'Medical Gas', qty:50,   total:750000,  expectedDate:'2025-11-27', status:'Approved'  },
];

export const DEMO_GRNS = [
  { grnNo:'GRN-001', date:'2025-11-20', poRef:'PO-0041', vendor:'MedEquip Supplies',      item:'Cannula 18G',            category:'Consumables', poQty:500,  recvQty:500,  recvValue:400000, condition:'Good'           },
  { grnNo:'GRN-002', date:'2025-11-18', poRef:'PO-0039', vendor:'Pharmaplus Nigeria Ltd', item:'Metformin 500mg',        category:'Drugs',       poQty:2000, recvQty:2000, recvValue:240000, condition:'Good'           },
  { grnNo:'GRN-003', date:'2025-11-15', poRef:'PO-0037', vendor:'HealthCare Distributors',item:'IV Normal Saline 500ml', category:'Fluids',      poQty:400,  recvQty:380,  recvValue:570000, condition:'Good'           },
  { grnNo:'GRN-004', date:'2025-10-20', poRef:'PO-0028', vendor:'ImageCare Nigeria',      item:'CT Contrast Media',      category:'X-Ray',       poQty:20,   recvQty:15,   recvValue:180000, condition:'Partial Damage' },
];

export const DEMO_DISPENSING = [
  { ref:'DSP-001', date:'2025-11-25', drug:'Amoxicillin 500mg',     qty:30,  unit:'Tablet', patient:'Ward 2 / Adeyemi J.',  value:2400   },
  { ref:'DSP-002', date:'2025-11-25', drug:'Metformin 500mg',        qty:60,  unit:'Tablet', patient:'OPD / Fashola M.',      value:7200   },
  { ref:'DSP-003', date:'2025-11-24', drug:'Amlodipine 5mg',         qty:30,  unit:'Tablet', patient:'Ward 1 / Bello T.',     value:10500  },
  { ref:'DSP-004', date:'2025-11-24', drug:'IV Normal Saline 500ml', qty:4,   unit:'Bottle', patient:'ICU / Eze K.',          value:6000   },
  { ref:'DSP-005', date:'2025-11-23', drug:'Hydrochlorothiazide',    qty:28,  unit:'Tablet', patient:'OPD / Nwankwo E.',      value:3360   },
];

export const DEMO_REQUISITIONS = [
  { reqNo:'DR-000001', date:'2025-11-20', dept:'Pharmacy',  item:'Amoxicillin 500mg × 2,000',            qty:2000, priority:'High',   status:'Completed',                  estValue:160000  },
  { reqNo:'DR-000002', date:'2025-11-22', dept:'Laboratory',item:'Blood Glucose Strips × 500 + FBC Kit', qty:510,  priority:'Normal', status:'PO Created',                 estValue:1445000 },
  { reqNo:'DR-000003', date:'2025-11-24', dept:'Radiology', item:'CT Contrast Media × 30 Vials',         qty:30,   priority:'High',   status:'Approved',                   estValue:360000  },
  { reqNo:'DR-000004', date:'2025-11-25', dept:'CSSD',      item:'Sterilization Pouches × 5,000',        qty:5000, priority:'Normal', status:'Pending Management Approval', estValue:275000  },
];

export const DEMO_VENDORS = [
  { name:'Pharmaplus Nigeria Ltd',   category:'Drugs & Pharmaceuticals',       phone:'08012345678', email:'pharmaplus@email.com',   paymentTerms:'30 Days' },
  { name:'MedEquip Supplies',        category:'Medical Equipment & Consumables',phone:'08023456789', email:'medequip@email.com',      paymentTerms:'30 Days' },
  { name:'HealthCare Distributors',  category:'IV Fluids & Infusions',          phone:'08034567890', email:'healthcare@email.com',    paymentTerms:'45 Days' },
  { name:'DiagnosTech',              category:'Lab Reagents & Diagnostics',     phone:'08045678901', email:'diagnotech@email.com',    paymentTerms:'30 Days' },
  { name:'GasSupply Nigeria',        category:'Medical Gases',                  phone:'08056789012', email:'gassupply@email.com',     paymentTerms:'COD'     },
  { name:'ImageCare Nigeria',        category:'Radiology & Imaging',            phone:'08067890123', email:'imagecare@email.com',     paymentTerms:'30 Days' },
];

export const DEMO_ASSETS = [
  { id:'AST-001', asset:'Ventilator Machine (ICU)',        cat:'Medical Equipment',    pd:'2025-08-15', rd:'2025-08-20', vendor:'MedEquip Supplies',    cost:4500000,  dept:'ICU',       status:'Active',       useful:10 },
  { id:'AST-002', asset:'Ultrasound Machine (Portable)',   cat:'Medical Equipment',    pd:'2025-07-10', rd:'2025-07-15', vendor:'ImageCare Nigeria',     cost:2800000,  dept:'Radiology', status:'Active',       useful:8  },
  { id:'AST-003', asset:'Operating Table (Theatre 1)',     cat:'Medical Equipment',    pd:'2025-09-05', rd:'2025-09-12', vendor:'Clinix Supplies Ltd',   cost:1200000,  dept:'Theatre',   status:'Active',       useful:15 },
  { id:'AST-004', asset:'Generator — 150KVA (Main)',       cat:'Plant & Machinery',    pd:'2025-04-01', rd:'2025-04-10', vendor:'PowerSystems Nigeria',  cost:6500000,  dept:'Maintenance',status:'Active',      useful:15 },
  { id:'AST-005', asset:'CT Scanner — 16-Slice',           cat:'Medical Equipment',    pd:'2023-11-01', rd:'2023-11-20', vendor:'ImageCare Nigeria',     cost:45000000, dept:'Radiology', status:'Active',       useful:15 },
  { id:'AST-006', asset:'Toyota HiAce Ambulance',          cat:'Vehicle',              pd:'2024-05-10', rd:'2024-05-15', vendor:'Toyota Nigeria Ltd',    cost:12000000, dept:'Maintenance',status:'Active',      useful:10 },
  { id:'AST-007', asset:'Dialysis Machine (Unit 1)',        cat:'Medical Equipment',    pd:'2024-03-15', rd:'2024-03-22', vendor:'MedEquip Supplies',     cost:3800000,  dept:'Dialysis',  status:'Under Repair', useful:10 },
];

export const DEMO_PAYABLES = [
  { supplier:'Pharmaplus Nigeria Ltd',   invNo:'PHM-INV-089', date:'2025-11-01', amount:3450000, dueDate:'2025-12-01', status:'Pending' },
  { supplier:'MedEquip Supplies',        invNo:'MEQ-INV-044', date:'2025-11-05', amount:1250000, dueDate:'2025-12-05', status:'Pending' },
  { supplier:'HealthCare Distributors',  invNo:'HCD-INV-031', date:'2025-11-08', amount:900000,  dueDate:'2025-12-08', status:'Paid'    },
  { supplier:'DiagnosTech',              invNo:'DGT-INV-017', date:'2025-11-10', amount:840000,  dueDate:'2025-12-10', status:'Pending' },
  { supplier:'GasSupply Nigeria',        invNo:'GAS-INV-009', date:'2025-11-12', amount:750000,  dueDate:'2025-11-26', status:'Overdue' },
];

export const DEMO_CSSD = [
  { batch:'CSSD-001', date:'2025-11-20', dept:'Theatre',    processed:120, sterilized:118, revenue:0,     expense:45000  },
  { batch:'CSSD-002', date:'2025-11-19', dept:'ICU',        processed:80,  sterilized:80,  revenue:0,     expense:28000  },
  { batch:'CSSD-003', date:'2025-11-18', dept:'Outpatient', processed:60,  sterilized:58,  revenue:0,     expense:18000  },
  { batch:'CSSD-004', date:'2025-11-17', dept:'Theatre',    processed:100, sterilized:98,  revenue:0,     expense:38000  },
];

export const DEMO_KITCHEN_ORDERS = [
  { orderNo:'MO-001', date:'2025-11-25', ward:'Ward 1', meal:'Jollof Rice & Chicken',  diet:'Regular', qty:12, cost:8400  },
  { orderNo:'MO-002', date:'2025-11-25', ward:'Ward 2', meal:'Boiled Yam & Egg Sauce', diet:'Diabetic',qty:8,  cost:4800  },
  { orderNo:'MO-003', date:'2025-11-25', ward:'ICU',    meal:'Soft Porridge',           diet:'Soft/Liquid',qty:5,cost:2000},
  { orderNo:'MO-004', date:'2025-11-24', ward:'Ward 1', meal:'Fried Rice & Fish',       diet:'Regular', qty:10, cost:7500  },
];

export const DEMO_KPI = KPI_RATINGS.map(k => ({
  kpi:    k.kpi,
  value:  k.v25,
  target: k.target,
  rating: k.rating,
}));