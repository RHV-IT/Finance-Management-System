/* lib/config.js */
 
export const TOKENS = {
  'rhv-admin-2024':       'admin',
  'rhv-revenue-2024':     'revenue',
  'rhv-store-2024':       'store',
  'rhv-payables-2024':    'payables',
  'rhv-procurement-2024': 'procurement',
  'rhv-pharmacy-2024':    'pharmacy',
  'rhv-lab-2024':         'lab',
  'rhv-radiology-2024':   'radiology',
  'rhv-ophthal-2024':     'ophthal',
  'rhv-cssd-2024':        'cssd',
};
 
export const ROLE_TOKENS = {
  admin:       'rhv-admin-2024',
  revenue:     'rhv-revenue-2024',
  store:       'rhv-store-2024',
  payables:    'rhv-payables-2024',
  procurement: 'rhv-procurement-2024',
  pharmacy:    'rhv-pharmacy-2024',
  lab:         'rhv-lab-2024',
  radiology:   'rhv-radiology-2024',
  ophthal:     'rhv-ophthal-2024',
  cssd:        'rhv-cssd-2024',
  coo:         'rhv-coo-2024',
  ceo:         'rhv-ceo-2024',
};
 
export const ROLES = {
  admin:       { lbl: 'Management / Admin',   clr: '#117A65', icon: '👑', pages: ['*'] },
  revenue:     { lbl: 'Revenue / Billing',    clr: '#1B4F72', icon: '💰', pages: ['overview','revenue','weekly','deptanalysis','expenses','debtors','cashbook','invoicing','kpi','archive','messages','approvals'] },
  store:       { lbl: 'Store Unit',           clr: '#6C3483', icon: '📦', pages: ['store','supplychain','vendors','assets','archive','messages','approvals'] },
  payables:    { lbl: 'Payables Unit',        clr: '#C0392B', icon: '💳', pages: ['payables','vendors','invoicing','archive','messages','approvals'] },
  procurement: { lbl: 'Procurement Unit',     clr: '#CA6F1E', icon: '🛒', pages: ['p2p','supplychain','prockpi','vendors','assets','approvals','archive','messages'] },
  pharmacy:    { lbl: 'Pharmacy Unit',        clr: '#16A085', icon: '💊', pages: ['pharmacy','pharmkpi','store','approvals','archive','messages'] },
  lab:         { lbl: 'Laboratory Unit',      clr: '#2980B9', icon: '🧪', pages: ['store','approvals','archive','messages'] },
  radiology:   { lbl: 'Radiology Unit',       clr: '#8E44AD', icon: '🩻', pages: ['store','approvals','archive','messages'] },
  ophthal:     { lbl: 'Ophthalmology Unit',   clr: '#16A085', icon: '👁️', pages: ['store','approvals','archive','messages'] },
  cssd:        { lbl: 'CSSD Unit',            clr: '#D4AC0D', icon: '♻️', pages: ['store','approvals','archive','messages'] },
  coo:         { lbl: 'COO',                  clr: '#8E44AD', icon: '📋', pages: ['*'] },
  ceo:         { lbl: 'CEO',                  clr: '#922B21', icon: '👔', pages: ['*'] },
};
 
export const DEFAULT_PINS = {
  admin:'0000', revenue:'1111', store:'2222', payables:'3333',
  procurement:'4444', pharmacy:'5555', lab:'6666', radiology:'7777',
  ophthal:'8888', cssd:'9999', coo:'2020', ceo:'3030',
};
 
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 
export const COLORS = [
  '#1B4F72','#117A65','#6C3483','#CA6F1E','#D85A30',
  '#639922','#1ABC9C','#F39C12','#E74C3C','#3498DB','#9B59B6','#E67E22',
];
 
export const NAV_ITEMS = [
  { section: 'Overview' },
  { id: 'overview',    icon: '📊', label: 'Dashboard' },
  { section: 'Revenue' },
  { id: 'revenue',     icon: '💰', label: 'Revenue Streams' },
  { id: 'weekly',      icon: '📅', label: 'Weekly / Periodic' },
  { id: 'deptanalysis',icon: '🏥', label: 'Dept Analysis' },
  { section: 'Financials' },
  { id: 'expenses',    icon: '💸', label: 'Expenditures' },
  { id: 'debtors',     icon: '🏦', label: 'Debtors' },
  { id: 'cashbook',    icon: '📒', label: 'Cashbook' },
  { id: 'invoicing',   icon: '🧾', label: 'Invoicing' },
  { section: 'Operations' },
  { id: 'store',       icon: '📦', label: 'Store / Inventory' },
  { id: 'supplychain', icon: '🛒', label: 'Supply Chain' },
  { id: 'pharmacy',    icon: '💊', label: 'Pharmacy' },
  { section: 'Procurement' },
  { id: 'p2p',         icon: '🔄', label: 'Procure-to-Pay' },
  { id: 'vendors',     icon: '🚚', label: 'Vendors / SRV' },
  { id: 'assets',      icon: '🏗',  label: 'Asset Register' },
  { id: 'payables',    icon: '💳', label: 'Payables' },
  { section: 'Communication' },
  { id: 'messages',    icon: '✉️',  label: 'Messages' },
  { id: 'approvals',   icon: '✅',  label: 'Approvals' },
  { id: 'execalerts',  icon: '⚠️',  label: 'Exec Alerts' },
  { section: 'Reports' },
  { id: 'pharmkpi',    icon: '💊', label: 'Pharmacy KPIs' },
  { id: 'prockpi',     icon: '📦', label: 'Procurement KPIs' },
  { id: 'kpi',         icon: '🎯', label: 'KPI Scorecard' },
  { id: 'archive',     icon: '🗃',  label: 'Archive' },
  { section: 'AI Assistant' },
  { id: 'ade',         icon: '🤖', label: 'ADE Assistant' },
  { section: 'Admin' },
  { id: 'settings',    icon: '⚙',  label: 'Settings' },
];
 
export const DEMO_DATA = {
  revenue: {
    '2025': {
      monthly: [59115177,83134775,59141562,73836656,125937047,111267326,117226437,180908371,177079945,152835107,155113415,168912241],
      expenses:[22000000,37700000,28200000,125200000,44300000,30300000,32500000,56300000,51000000,72400000,58700000,39600000],
      target: 120000000,
    },
    '2024': {
      monthly: [0,0,0,0,1973552,10863834,21534562,43326015,31003875,35223069,45339511,50181383],
      expenses: Array(12).fill(0),
      target: 100000000,
    },
    '2026': { monthly: Array(12).fill(0), expenses: Array(12).fill(0), target: 180000000 },
  },
  streams: [
    { name:'Drugs & Consumables',   ytd:336800000, dept:'Pharmacy' },
    { name:'Bed Fee (Admission)',    ytd:180600000, dept:'Inpatient / Wards' },
    { name:'Surgery Fee',           ytd:157700000, dept:'Theatre & Surgery' },
    { name:'Lab Services',          ytd:143000000, dept:'Laboratory' },
    { name:'Radiology & Imaging',   ytd:126800000, dept:'Radiology' },
    { name:'Consultation Fee',      ytd:99500000,  dept:'Outpatient' },
    { name:'CT Scan',               ytd:54900000,  dept:'Radiology' },
    { name:'Dialysis',              ytd:61700000,  dept:'Dialysis Unit' },
    { name:'Physiotherapy',         ytd:54000000,  dept:'Physiotherapy' },
    { name:'Cardiology',            ytd:11600000,  dept:'Cardiology' },
  ],
  debtors: {
    found: true,
    categories: ['Regular Patients','Corporates','Mission','Habitation of Hope','Peaceville School','Goshen'],
    months: ['Oct 2025','Nov 2025'],
    data: [[12983960,4412959],[11258707,8920076],[8175926,1746965],[1454902,1569483],[1101563,913890],[465000,374000]],
    totals: [29018311,37326070],
    latest: 37326070,
    prev: 29018311,
    growth: 28.6,
  },
};