/**
 * components/DataImporter/importConfig.js
 *
 * ─── HOW TO ADD A NEW MODULE ──────────────────────────────────
 * Add one object to IMPORT_MODULES. Nothing else needs to change.
 *
 * ─── NEW FIELDS (month/department awareness) ──────────────────
 *   timeAxis:   'monthly' | 'static'
 *               'monthly' → user must pick a month when uploading
 *               'static'  → snapshot data, no month (e.g. Item Master, Vendors)
 *
 *   deptAxis:   'required' | 'optional' | 'none'
 *               'required' → user must pick a department when uploading
 *               'optional' → department picker shown but "All / Hospital-wide" allowed
 *               'none'     → no department picker (hospital-wide data only)
 *
 *   valueField: the column key whose values get summed for reconciliation
 *               and monthly trend charts (e.g. 'value', 'amount', 'total')
 *
 * ─── POSTGRES MIGRATION NOTE ──────────────────────────────────
 * storageKey  → Postgres TABLE name
 * column.key  → Postgres COLUMN name
 * column.type → Postgres DATA TYPE
 * timeAxis + deptAxis → becomes (period DATE, department VARCHAR) columns
 */

// ─── Shared constants ──────────────────────────────────────────

export const DEPARTMENTS = [
  'Pharmacy',
  'Laboratory',
  'Radiology',
  'Ophthalmology',
  'CSSD',
  'Theatre',
  'ICU',
  'Inpatient / Wards',
  'Outpatient',
  'Dialysis',
  'Physiotherapy',
  'Cardiology',
  'Kitchen',
  'Store',
  'Procurement',
  'Finance',
  'HR',
  'Administration',
  'Maintenance',
];

export function getMonthOptions(yearsBack = 2) {
  const months = [];
  const now = new Date(); // anchor to dataset's "current" period
  for (let i = 0; i < 12 * yearsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }
  return months;
}

// ─── Module definitions ────────────────────────────────────────

export const IMPORT_MODULES = [

  // ── REVENUE & FINANCIALS (hospital-wide, monthly) ────────────

  {
    key:        'revenue_monthly',
    label:      'Revenue & Expenses (Monthly)',
    icon:       '💰',
    group:      'Revenue & Financials',
    storageKey: 'revenue_monthly',
    description:'Monthly revenue, expense and target figures — hospital-wide.',
    mergeKey:   'month',
    timeAxis:   'monthly',
    deptAxis:   'none',
    valueField: 'revenue',
    columns: [
      { key:'month',    label:'Month',          required:true,  type:'string',  example:'Jan 2025'   },
      { key:'revenue',  label:'Revenue (₦)',     required:true,  type:'number',  example:'59115177'    },
      { key:'expenses', label:'Expenses (₦)',    required:true,  type:'number',  example:'22000000'    },
      { key:'target',   label:'Monthly Target (₦)',required:false,type:'number', example:'120000000'   },
    ],
  },

  {
    key:        'revenue_streams',
    label:      'Revenue Streams (by Dept)',
    icon:       '📊',
    group:      'Revenue & Financials',
    storageKey: 'revenue_streams',
    description:'Revenue streams — upload one file per department per month.',
    mergeKey:   'name',
    timeAxis:   'monthly',
    deptAxis:   'required',
    valueField: 'amount',
    columns: [
      { key:'name',   label:'Stream Name',  required:true,  type:'string', example:'Drug Sales'  },
      { key:'amount', label:'Amount (₦)',    required:true,  type:'number', example:'28000000'     },
      { key:'payer',  label:'Payer Type',   required:false, type:'enum',  values:['Cash','HMO','Corporate','Mission','NHIS'], example:'Cash' },
    ],
  },

  {
    key:        'debtors',
    label:      'Debtors / Receivables',
    icon:       '🏦',
    group:      'Revenue & Financials',
    storageKey: 'debtors',
    description:'Outstanding balances per debtor category — hospital-wide, monthly snapshot.',
    mergeKey:   'category',
    timeAxis:   'monthly',
    deptAxis:   'none',
    valueField: 'amount',
    columns: [
      { key:'category', label:'Category / Patient Group', required:true,  type:'string', example:'Corporates' },
      { key:'amount',   label:'Outstanding Amount (₦)',    required:true,  type:'number', example:'8920076'    },
      { key:'contact',  label:'Contact',                   required:false, type:'string', example:'08012345678' },
      { key:'priority', label:'Priority',                  required:false, type:'enum',   values:['High','Medium','Low'], example:'High' },
    ],
  },

  {
    key:        'invoices',
    label:      'Invoices',
    icon:       '🧾',
    group:      'Revenue & Financials',
    storageKey: 'invoices',
    description:'Customer invoices — hospital-wide, monthly.',
    mergeKey:   'invNo',
    timeAxis:   'monthly',
    deptAxis:   'none',
    valueField: 'amount',
    columns: [
      { key:'invNo',      label:'Invoice No',  required:true,  type:'string', example:'INV-2025-001' },
      { key:'date',       label:'Date',        required:true,  type:'date',   example:'2025-11-01'   },
      { key:'customer',   label:'Customer',    required:true,  type:'string', example:'Adeyemi J.'  },
      { key:'payerType',  label:'Payer Type',  required:true,  type:'enum',   values:['Cash','HMO','Corporate','Mission','NHIS'], example:'Cash' },
      { key:'description',label:'Description', required:false, type:'string', example:'Ward admission' },
      { key:'amount',     label:'Amount (₦)',   required:true,  type:'number', example:'85000'        },
      { key:'dueDate',    label:'Due Date',     required:false, type:'date',   example:'2025-11-30'   },
      { key:'status',     label:'Status',       required:false, type:'enum',   values:['Draft','Sent','Paid','Overdue','Pending Approval'], example:'Paid' },
    ],
  },

  {
    key:        'payables',
    label:      'Accounts Payable',
    icon:       '💳',
    group:      'Revenue & Financials',
    storageKey: 'payables',
    description:'Supplier invoices and payment status — hospital-wide, monthly. This is the FINANCE-side counterpart to Store Receiving (SRV) — values should reconcile.',
    mergeKey:   'invNo',
    timeAxis:   'monthly',
    deptAxis:   'none',
    valueField: 'amount',
    reconcileWith: { module: 'srv_receipts', label: 'Store Receiving (SRV)', tolerance: 0.02 },
    columns: [
      { key:'supplier', label:'Supplier Name', required:true,  type:'string', example:'Pharmaplus Nigeria Ltd' },
      { key:'invNo',    label:'Invoice No',    required:true,  type:'string', example:'PHM-INV-089' },
      { key:'date',     label:'Invoice Date',  required:true,  type:'date',   example:'2025-11-01'  },
      { key:'amount',   label:'Amount (₦)',     required:true,  type:'number', example:'3450000'     },
      { key:'dueDate',  label:'Due Date',       required:true,  type:'date',   example:'2025-12-01'  },
      { key:'status',   label:'Status',         required:false, type:'enum',   values:['Pending','Paid','Overdue','Disputed'], example:'Pending' },
    ],
  },

  // ── STORE & INVENTORY (mostly monthly + department) ───────────

  {
    key:        'stock_register',
    label:      'Stock Register',
    icon:       '📦',
    group:      'Store & Inventory',
    storageKey: 'stock_register',
    description:'Current stock levels — snapshot, no month/dept axis (latest upload wins).',
    mergeKey:   'item',
    timeAxis:   'static',
    deptAxis:   'none',
    valueField: 'qty',
    columns: [
      { key:'item',     label:'Item Name',       required:true,  type:'string', example:'Cannula 18G' },
      { key:'category', label:'Category',        required:true,  type:'string', example:'Consumables'  },
      { key:'qty',      label:'Qty on Hand',     required:true,  type:'number', example:'2380'         },
      { key:'unit',     label:'Unit',            required:false, type:'string', example:'Pcs'          },
      { key:'unitCost', label:'Unit Cost (₦)',    required:true,  type:'number', example:'800'          },
      { key:'reorder',  label:'Reorder Level',   required:false, type:'number', example:'50'           },
      { key:'expiry',   label:'Expiry Date',     required:false, type:'date',   example:'2026-08-01'   },
      { key:'vendor',   label:'Preferred Vendor',required:false, type:'string', example:'MedEquip Supplies' },
    ],
  },

  {
    key:        'srv_receipts',
    label:      'Store Receiving (SRV)',
    icon:       '📥',
    group:      'Store & Inventory',
    storageKey: 'srv_receipts',
    description:'Goods received into store — upload per department per month. This is the STORE-side counterpart to Accounts Payable — values should reconcile.',
    mergeKey:   'srvNo',
    timeAxis:   'monthly',
    deptAxis:   'required',
    valueField: 'value',  // computed: qty * unitCost
    reconcileWith: { module: 'payables', label: 'Accounts Payable', tolerance: 0.02 },
    columns: [
      { key:'srvNo',     label:'SRV No',       required:true,  type:'string', example:'SRV-001'     },
      { key:'date',      label:'Date',         required:true,  type:'date',   example:'2025-11-20'  },
      { key:'item',      label:'Item Name',    required:true,  type:'string', example:'Cannula 18G' },
      { key:'qty',       label:'Qty Received', required:true,  type:'number', example:'500'         },
      { key:'unit',      label:'Unit',         required:false, type:'string', example:'Pcs'         },
      { key:'unitCost',  label:'Unit Cost (₦)', required:true,  type:'number', example:'800'         },
      { key:'vendor',    label:'Vendor',       required:true,  type:'string', example:'MedEquip Supplies' },
      { key:'poRef',     label:'PO Reference', required:false, type:'string', example:'PO-0041'     },
      { key:'expiry',    label:'Expiry Date',  required:false, type:'date',   example:'2026-08-01'  },
    ],






    sheetConfig: {
      // Paste the sheet ID from the URL:
      // https://docs.google.com/spreadsheets/d/[THIS_PART]/edit
      sheetId:   '',            // e.g. '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'
      tabName:   'Sheet1',      // or 'Pharmacy Dispensing', whatever they named the tab
      range:     'A:Z',         // columns to fetch — A:Z gets everything
      headerRow: 1,             // which row has the column headers (usually 1)
    },

    columnMap: {
      date:       'Date',   // their column → our field
      vendor:       'Vendor',
      item_code:        'Item Code',
      unit_of_measure:      'UOM',
      invoice_waybill:    'Invoice/Waybill',
      qty_received: 'Qty Received',
      unit_price:      'Unit Price',
      total:     'Total',
    },

    // ── Where this data flows ────────────────────────────────
    // This tells the system which visualizations use this module
    // so we know what MUST be mapped vs what's optional
    feeds: [
      { page: 'pharmacy',  chart: 'Dispensing Records table',    requiredFields: ['date','vendor','item_code','value'] },
      { page: 'pharmacy',  chart: 'Dispensing by Type bar chart',requiredFields: ['dtype'] },
      { page: 'overview',  chart: 'Revenue KPI cards',           requiredFields: ['value'] },
      { page: 'revenue',   chart: 'Revenue Streams table',       requiredFields: ['value'] },
      { page: 'expenditure', }
    ],
  },

  {
    key:        'stock_out',
    label:      'Stock Issues / Stock-Out',
    icon:       '📤',
    group:      'Store & Inventory',
    storageKey: 'stock_out',
    description:'Items issued from store to a department — upload per department per month. This is the STORE-side counterpart to that department\'s consumption (e.g. Pharmacy Dispensing).',
    mergeKey:   'issueNo',
    timeAxis:   'monthly',
    deptAxis:   'required',
    valueField: 'value',
    reconcileWith: { module: 'drug_dispensing', label: 'Drug Dispensing', tolerance: 0.05, appliesToDept: 'Pharmacy' },
    columns: [
      { key:'issueNo', label:'Issue No',   required:true,  type:'string', example:'ISS-001'      },
      { key:'date',    label:'Date',       required:true,  type:'date',   example:'2025-11-25'   },
      { key:'item',    label:'Item Name',  required:true,  type:'string', example:'Cannula 18G'  },
      { key:'qty',     label:'Qty Issued', required:true,  type:'number', example:'20'            },
      { key:'value',   label:'Value (₦)',   required:true,  type:'number', example:'16000'         },
      { key:'purpose', label:'Purpose',    required:false, type:'string', example:'Ward stock'    },
    ],
  },

  {
    key:        'purchase_orders',
    label:      'Purchase Orders',
    icon:       '🛒',
    group:      'Store & Inventory',
    storageKey: 'purchase_orders',
    description:'Purchase orders raised — upload per month (procurement is hospital-wide).',
    mergeKey:   'poNo',
    timeAxis:   'monthly',
    deptAxis:   'none',
    valueField: 'total',
    reconcileWith: { module: 'goods_received', label: 'Goods Received (GRN)', tolerance: 0.01 },
    columns: [
      { key:'poNo',         label:'PO No',            required:true,  type:'string', example:'PO-0041'     },
      { key:'date',         label:'Date',             required:true,  type:'date',   example:'2025-11-18'  },
      { key:'vendor',       label:'Vendor',           required:true,  type:'string', example:'MedEquip Supplies' },
      { key:'item',         label:'Item / Description',required:true, type:'string', example:'Cannula 18G' },
      { key:'qty',          label:'Quantity',         required:true,  type:'number', example:'500'         },
      { key:'total',        label:'Total Value (₦)',   required:true,  type:'number', example:'400000'      },
      { key:'expectedDate', label:'Expected Delivery',required:false, type:'date',   example:'2025-11-22'  },
      { key:'status',       label:'Status',           required:false, type:'enum',   values:['Draft','Approved','Sent','Received','Cancelled'], example:'Received' },
    ],
  },

  {
    key:        'goods_received',
    label:      'Goods Received Notes (GRN)',
    icon:       '✅',
    group:      'Store & Inventory',
    storageKey: 'goods_received',
    description:'3-way match — upload per month. This is the STORE-side counterpart to Purchase Orders — quantities & values should reconcile.',
    mergeKey:   'grnNo',
    timeAxis:   'monthly',
    deptAxis:   'none',
    valueField: 'recvValue',
    columns: [
      { key:'grnNo',     label:'GRN No',            required:true,  type:'string', example:'GRN-001'     },
      { key:'date',      label:'Date',              required:true,  type:'date',   example:'2025-11-20'  },
      { key:'poRef',     label:'PO Reference',      required:true,  type:'string', example:'PO-0041'     },
      { key:'vendor',    label:'Vendor',            required:true,  type:'string', example:'MedEquip Supplies' },
      { key:'item',      label:'Item',              required:true,  type:'string', example:'Cannula 18G' },
      { key:'poQty',     label:'PO Quantity',       required:true,  type:'number', example:'500'         },
      { key:'recvQty',   label:'Received Quantity', required:true,  type:'number', example:'500'         },
      { key:'recvValue', label:'Received Value (₦)', required:true,  type:'number', example:'400000'      },
      { key:'condition', label:'Condition',         required:false, type:'enum',   values:['Good','Partial Damage','Rejected'], example:'Good' },
    ],
  },

  // ── VENDORS & ASSETS (static — no time/dept axis) ─────────────

  {
    key:        'vendors',
    label:      'Vendors / Suppliers',
    icon:       '🚚',
    group:      'Vendors & Assets',
    storageKey: 'vendors',
    description:'Vendor master list — static, no month/dept axis.',
    mergeKey:   'name',
    timeAxis:   'static',
    deptAxis:   'none',
    valueField: 'totalPurchases',
    columns: [
      { key:'name',          label:'Vendor Name',    required:true,  type:'string', example:'Pharmaplus Nigeria Ltd' },
      { key:'category',      label:'Category',       required:false, type:'string', example:'Drugs & Pharmaceuticals' },
      { key:'contactPerson', label:'Contact Person', required:false, type:'string', example:'Chukwu Emeka' },
      { key:'phone',         label:'Phone',          required:false, type:'string', example:'08012345678' },
      { key:'email',         label:'Email',          required:false, type:'string', example:'info@pharmaplus.com' },
      { key:'paymentTerms',  label:'Payment Terms',  required:false, type:'string', example:'30 Days' },
    ],
  },

  {
    key:        'asset_register',
    label:      'Asset Register',
    icon:       '🏗',
    group:      'Vendors & Assets',
    storageKey: 'asset_register',
    description:'Fixed assets — static snapshot, no month axis. Department picker shown for filtering.',
    mergeKey:   'id',
    timeAxis:   'static',
    deptAxis:   'optional',
    valueField: 'cost',
    columns: [
      { key:'id',     label:'Asset ID',     required:false, type:'string', example:'AST-001' },
      { key:'asset',  label:'Asset Name',   required:true,  type:'string', example:'Ventilator Machine' },
      { key:'cat',    label:'Category',     required:true,  type:'string', example:'Medical Equipment' },
      { key:'pd',     label:'Purchase Date',required:true,  type:'date',   example:'2025-08-15' },
      { key:'vendor', label:'Vendor',       required:false, type:'string', example:'MedEquip Supplies' },
      { key:'cost',   label:'Cost (₦)',      required:true,  type:'number', example:'4500000' },
      { key:'status', label:'Status',       required:false, type:'enum',   values:['Active','Under Repair','Idle','Disposed'], example:'Active' },
    ],
  },

  // ── PHARMACY & CLINICAL (monthly + department) ────────────────

  {
    key:        'item_master',
    label:      'Item Master (Drug Catalogue)',
    icon:       '🗂',
    group:      'Pharmacy & Clinical',
    storageKey: 'item_master',
    description:'Central drug/item catalogue — static, no month axis.',
    mergeKey:   'code',
    timeAxis:   'static',
    deptAxis:   'optional',
    valueField: 'cost',
    columns: [
      { key:'code',  label:'Item Code',  required:false, type:'string', example:'DRG-0001' },
      { key:'name',  label:'Item Name',  required:true,  type:'string', example:'Amoxicillin 500mg' },
      { key:'cat',   label:'Category',   required:true,  type:'enum',   values:['Drug','Fluid','Consumable','Reagent','Equipment'], example:'Drug' },
      { key:'cost',  label:'Cost Price (₦)',required:true,type:'number',example:'80' },
      { key:'sell',  label:'Selling Price (₦)',required:false,type:'number',example:'200' },
    ],
  },

  {
    key:        'drug_dispensing',
    label:      'Drug Dispensing Records',
    icon:       '💊',
    group:      'Pharmacy & Clinical',
    storageKey: 'drug_dispensing',
    description:'Drugs dispensed to patients — upload per month (always Pharmacy department). This is the FINANCE-side counterpart to Store Issues to Pharmacy — values should reconcile.',
    mergeKey:   'ref',
    timeAxis:   'monthly',
    deptAxis:   'none', // always pharmacy implicitly
    valueField: 'value',
    reconcileWith: { module: 'stock_out', label: 'Store Issues (Pharmacy)', tolerance: 0.05, appliesToDept: 'Pharmacy' },
    columns: [
      { key:'ref',        label:'Dispensing Ref', required:false, type:'string', example:'DSP-001' },
      { key:'date',       label:'Date',           required:true,  type:'date',   example:'2025-11-25' },
      { key:'drug',       label:'Drug / Item',    required:true,  type:'string', example:'Amoxicillin 500mg' },
      { key:'qty',        label:'Quantity',       required:true,  type:'number', example:'30' },
      { key:'patient',    label:'Patient / Ward', required:false, type:'string', example:'Ward 2' },
      { key:'value',      label:'Total Value (₦)', required:true,  type:'number', example:'2400' },
    ],
  },

  // ── PROCUREMENT (monthly + department) ────────────────────────

  {
    key:        'requisitions',
    label:      'Requisitions',
    icon:       '📝',
    group:      'Procurement',
    storageKey: 'requisitions',
    description:'Departmental procurement requests — upload per department per month.',
    mergeKey:   'reqNo',
    timeAxis:   'monthly',
    deptAxis:   'required',
    valueField: 'estValue',
    columns: [
      { key:'reqNo',    label:'Request No',         required:false, type:'string', example:'DR-000001' },
      { key:'date',     label:'Date',               required:true,  type:'date',   example:'2025-11-20' },
      { key:'item',     label:'Item / Description', required:true,  type:'string', example:'Amoxicillin 500mg × 2,000' },
      { key:'priority', label:'Priority',           required:false, type:'enum',   values:['High','Normal','Urgent'], example:'High' },
      { key:'status',   label:'Status',             required:false, type:'enum',   values:['Submitted','Approved','Pending Procurement','PO Created','Goods Received','Completed','Rejected','Queried'], example:'Completed' },
      { key:'estValue', label:'Estimated Value (₦)',required:false, type:'number', example:'160000' },
    ],
  },

  // ── OPERATIONS (monthly + department) ─────────────────────────

  {
    key:        'cssd_batches',
    label:      'CSSD Batches',
    icon:       '♻️',
    group:      'Operations',
    storageKey: 'cssd_batches',
    description:'Sterilisation batches — upload per department served per month. CSSD expense should reconcile with cost allocation in the receiving department.',
    mergeKey:   'batch',
    timeAxis:   'monthly',
    deptAxis:   'required', // department SERVED, e.g. Theatre
    valueField: 'expense',
    columns: [
      { key:'batch',      label:'Batch No',         required:false, type:'string', example:'CSSD-001' },
      { key:'date',       label:'Date',             required:true,  type:'date',   example:'2025-11-20' },
      { key:'processed',  label:'Packs Processed',  required:true,  type:'number', example:'120' },
      { key:'sterilized', label:'Packs Sterilised', required:true,  type:'number', example:'118' },
      { key:'revenue',    label:'Revenue (₦)',       required:false, type:'number', example:'0' },
      { key:'expense',    label:'Expense (₦)',       required:false, type:'number', example:'45000' },
    ],
  },

  {
    key:        'kitchen_menu',
    label:      'Kitchen Menu',
    icon:       '📖',
    group:      'Operations',
    storageKey: 'kitchen_menu',
    description:'Menu items — static, no month/dept axis.',
    mergeKey:   'name',
    timeAxis:   'static',
    deptAxis:   'none',
    valueField: 'cost',
    columns: [
      { key:'name', label:'Meal Item',         required:true,  type:'string', example:'Jollof Rice & Chicken' },
      { key:'cost', label:'Cost per Plate (₦)',required:true,  type:'number', example:'700' },
      { key:'sell', label:'Selling Price (₦)', required:false, type:'number', example:'1500' },
    ],
  },

  {
    key:        'kitchen_orders',
    label:      'Kitchen Meal Orders',
    icon:       '🍽️',
    group:      'Operations',
    storageKey: 'kitchen_orders',
    description:'Patient meal orders — upload per ward/department per month.',
    mergeKey:   'orderNo',
    timeAxis:   'monthly',
    deptAxis:   'required', // ward
    valueField: 'cost',
    columns: [
      { key:'orderNo', label:'Order No',  required:false, type:'string', example:'MO-001' },
      { key:'date',    label:'Date',      required:true,  type:'date',   example:'2025-11-25' },
      { key:'meal',    label:'Menu Item', required:true,  type:'string', example:'Jollof Rice & Chicken' },
      { key:'qty',     label:'Quantity',  required:true,  type:'number', example:'1' },
      { key:'cost',    label:'Total Cost (₦)',required:false,type:'number',example:'700' },
    ],
  },

  // ── KPI & REPORTING ────────────────────────────────────────────

  {
    key:        'kpi_scorecard',
    label:      'KPI Scorecard',
    icon:       '🎯',
    group:      'KPI & Reporting',
    storageKey: 'kpi_scorecard',
    description:'Hospital KPI performance — upload per month, hospital-wide.',
    mergeKey:   'kpi',
    timeAxis:   'monthly',
    deptAxis:   'none',
    valueField: null,
    columns: [
      { key:'kpi',    label:'KPI Name', required:true,  type:'string', example:'Monthly Revenue Achievement' },
      { key:'value',  label:'Value',    required:false, type:'string', example:'122.0%' },
      { key:'target', label:'Target',   required:false, type:'string', example:'>100%' },
      { key:'rating', label:'Rating',   required:false, type:'enum',   values:['green','amber','red'], example:'green' },
    ],
  },

  {
    key:        'audit_trail',
    label:      'Audit Trail',
    icon:       '📋',
    group:      'KPI & Reporting',
    storageKey: 'audit_trail',
    description:'System change log — upload per month.',
    mergeKey:   null,
    timeAxis:   'monthly',
    deptAxis:   'optional',
    valueField: null,
    columns: [
      { key:'date',   label:'Date / Time', required:true,  type:'string', example:'2025-11-28 10:44' },
      { key:'user',   label:'User',        required:true,  type:'string', example:'C. Mensah' },
      { key:'module', label:'Module',      required:true,  type:'string', example:'Finance' },
      { key:'action', label:'Action',      required:true,  type:'string', example:'Revenue Updated' },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────

export function getModuleConfig(key) {
  return IMPORT_MODULES.find(m => m.key === key) || null;
}

export function getGroups() {
  const seen = new Set();
  return IMPORT_MODULES
    .map(m => m.group)
    .filter(g => { if (seen.has(g)) return false; seen.add(g); return true; });
}

/**
 * Get all module pairs that have a reconciliation relationship defined.
 * Used by the reconciliation engine to know which checks to run.
 */
export function getReconciliationPairs() {
  return IMPORT_MODULES
    .filter(m => m.reconcileWith)
    .map(m => ({
      source: m.key,
      sourceLabel: m.label,
      sourceValueField: m.valueField,
      target: m.reconcileWith.module,
      targetLabel: m.reconcileWith.label,
      tolerance: m.reconcileWith.tolerance ?? 0.05,
      appliesToDept: m.reconcileWith.appliesToDept || null,
    }));
}