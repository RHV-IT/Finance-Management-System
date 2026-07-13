/**
 * components/DataImporter/sheetConfig.js
 *
 * ════════════════════════════════════════════════════════════════
 *  THIS IS THE ONLY FILE YOU EDIT TO CONNECT A GOOGLE SHEET
 * ════════════════════════════════════════════════════════════════
 *
 * HOW TO CONNECT A DEPARTMENT SHEET:
 * ─────────────────────────────────────────────────────────────
 * 1. Get the sheet URL from the department, e.g.:
 *    https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
 *
 * 2. Extract the Sheet ID (the long string between /d/ and /edit):
 *    1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
 *
 * 3. Find the right entry below for that module.
 *
 * 4. Set sheetId to the extracted ID.
 *
 * 5. Set tabName to the EXACT name of the sheet tab (check the
 *    tab at the bottom of the Google Sheet).
 *
 * 6. Update columnMap: the RIGHT side must match their column
 *    headers EXACTLY (case-insensitive, spaces are ok).
 *
 * 7. Save the file — the sync engine picks up changes automatically.
 *
 * ─────────────────────────────────────────────────────────────
 * PERIOD SOURCE OPTIONS:
 *   'dateColumn' → reads period from the mapped 'date' field in rows
 *   'tabName'    → parses period from the tab name ("Nov 25", "November 2025")
 *   'manual'     → uses the manualPeriod field below
 *
 * COLUMN MAP:
 *   LEFT side  = our internal field name (used by pages and charts)
 *   RIGHT side = exact column header in their Google Sheet
 *                (case-insensitive, fuzzy-matched)
 *
 * FEEDS:
 *   Documents which pages and charts depend on which fields.
 *   The sync engine uses this to warn you when a required field
 *   is missing from the sheet.
 *   You can add/remove feeds freely — it doesn't affect fetching.
 * ─────────────────────────────────────────────────────────────
 */
 
export const SHEET_CONNECTIONS = [
 
  // ╔══════════════════════════════════════════════════════════╗
  // ║  STORE / INVENTORY DEPARTMENT                            ║
  // ╚══════════════════════════════════════════════════════════╝
 
  {
    dept:         'Store',
    module:       'stock_register',
    label:        'Stock Register',
    sheetId:      'YOUR_SHEET_ID_HERE',   // ← paste Store sheet ID here
    tabName:      'Stock Register',        // ← exact tab name in the sheet
    range:        'A:M',
    headerRow:    1,
    periodSource: 'tabName',              // tab name = "Stock Register Nov 25"
 
    columnMap: {
      // our field       : their exact column header
      itemCode:          'Item Code',
      name:              'Item Description',
      uom:               'UOM',
      openingQty:        'Opening Qty',
      qty:               'Current Qty in Stock',
      unitCost:          'Unit Cost',
      totalValue:        'Total Stock Value',
      reorder:           'Reorder Level',
      reorderQty:        'Reorder Qty',
      lastReceived:      'Last Receipt Date',
      lastIssued:        'Last Issue Date',
    },
 
    feeds: [
      {
        page:           'inventory',
        section:        'Stock Register tab — main table',
        requiredFields: ['name', 'qty', 'unitCost', 'totalValue'],
        optionalFields: ['itemCode', 'uom', 'reorder', 'reorderQty', 'lastReceived', 'lastIssued'],
      },
      {
        page:           'inventory',
        section:        'KPI — Total Inventory Value',
        requiredFields: ['totalValue'],
        optionalFields: [],
      },
      {
        page:           'inventory',
        section:        'KPI — Items Below Reorder Level',
        requiredFields: ['qty', 'reorder'],
        optionalFields: [],
      },
      {
        page:           'inventory',
        section:        'Top 10 Highest Valued Items chart',
        requiredFields: ['name', 'totalValue'],
        optionalFields: [],
      },
      {
        page:           'inventory',
        section:        'Inventory Valuation tab',
        requiredFields: ['name', 'qty', 'unitCost', 'totalValue'],
        optionalFields: [],
      },
      {
        page:           'overview',
        section:        'KPI — Total Stock Value',
        requiredFields: ['totalValue'],
        optionalFields: [],
      },
    ],
  },
 
  {
    dept:         'Store',
    module:       'srv_receipts',
    label:        'SRV Receipts',
    sheetId:      '12rwCvA2riams6d_Gu31vx8t-DmBS3CctKyAY8iXIMpo',   // ← same Store sheet ID
    tabName:      'SRV Receipts',          // ← exact tab name
    range:        'A:J',
    headerRow:    5,
    periodSource: 'dateColumn',            // reads date from rows
 
    columnMap: {
      date:              'Date',
      vendor:            'Vendor',
      itemCode:          'Item Code',
      name:              'Item Description',
      uom:               'UOM',
      invoiceRef:        'Invoice/Waybill',
      qtyRequested:      'Qty Requested',
      unitPrice:         'Unit Price',
      total:             'Total (Amount)',
    },
 
    feeds: [
      {
        page:           'inventory',
        section:        'SRV Receipts tab — main table',
        requiredFields: ['name', 'qtyRequested', 'total'],
        optionalFields: ['date', 'vendor', 'itemCode', 'uom', 'invoiceRef', 'unitPrice'],
      },
      {
        page:           'inventory',
        section:        'Monthly Receipts chart',
        requiredFields: ['total'],
        optionalFields: ['date'],
      },
      {
        page:           'inventory',
        section:        'Purchase Trend chart',
        requiredFields: ['total'],
        optionalFields: ['date', 'vendor'],
      },
      {
        page:           'inventory',
        section:        'KPI — Total Received Value',
        requiredFields: ['total'],
        optionalFields: [],
      },
    ],
  },
 
  {
    dept:         'Store',
    module:       'stock_out',
    label:        'SIV Issues',
    sheetId:      'YOUR_SHEET_ID_HERE',
    tabName:      'SIV Issues',
    range:        'A:H',
    headerRow:    1,
    periodSource: 'dateColumn',
 
    columnMap: {
      date:              'Date',
      name:              'Item Description',
      qtyRequested:      'Qty Requested',
      unitCost:          'Unit Cost',
      qty:               'Qty Issued',
      total:             'Total',
      dept:              'Department',
      recipient:         'Recipient',
    },
 
    feeds: [
      {
        page:           'inventory',
        section:        'SIV Issues tab — main table',
        requiredFields: ['name', 'qty', 'total'],
        optionalFields: ['date', 'qtyRequested', 'unitCost', 'dept', 'recipient'],
      },
      {
        page:           'inventory',
        section:        'Top 10 Issued Items chart',
        requiredFields: ['name', 'qty'],
        optionalFields: ['total'],
      },
      {
        page:           'inventory',
        section:        'Monthly Issues chart',
        requiredFields: ['total'],
        optionalFields: ['date'],
      },
      {
        page:           'inventory',
        section:        'KPI — Total Issued Value',
        requiredFields: ['total'],
        optionalFields: [],
      },
    ],
  },
 
  {
    dept:         'Store',
    module:       'reorder_alerts',
    label:        'Reorder Alerts',
    sheetId:      'YOUR_SHEET_ID_HERE',
    tabName:      'Reorder Alert',
    range:        'A:F',
    headerRow:    1,
    periodSource: 'tabName',
 
    columnMap: {
      itemCode:          'Item Code',
      name:              'Item Description',
      qty:               'Current Stock',
      reorder:           'Reorder Level',
      qtyRequired:       'Qty Required',
      estReorderValue:   'Est. Reorder Value',
    },
 
    feeds: [
      {
        page:           'inventory',
        section:        'Reorder Alerts tab — main table',
        requiredFields: ['name', 'qty', 'reorder'],
        optionalFields: ['itemCode', 'qtyRequired', 'estReorderValue'],
      },
      {
        page:           'inventory',
        section:        'KPI — Items Below Reorder',
        requiredFields: ['qty', 'reorder'],
        optionalFields: [],
      },
    ],
  },
 
  {
    dept:         'Store',
    module:       'monthly_receipts',
    label:        'Monthly Receipts',
    sheetId:      'YOUR_SHEET_ID_HERE',
    tabName:      'Monthly Receipts',
    range:        'A:D',
    headerRow:    1,
    periodSource: 'tabName',
 
    columnMap: {
      itemCode:          'Item Code',
      name:              'Item Description',
      totalQtyReceived:  'Total Quantity Received',
      totalValueReceived:'Total Value Received',
    },
 
    feeds: [
      {
        page:           'inventory',
        section:        'Monthly Receipts tab',
        requiredFields: ['name', 'totalQtyReceived', 'totalValueReceived'],
        optionalFields: ['itemCode'],
      },
    ],
  },
 
  {
    dept:         'Store',
    module:       'monthly_issues',
    label:        'Monthly Issues',
    sheetId:      'YOUR_SHEET_ID_HERE',
    tabName:      'Monthly Issues',
    range:        'A:D',
    headerRow:    1,
    periodSource: 'tabName',
 
    columnMap: {
      itemCode:          'Item Code',
      name:              'Item Description',
      totalQtyIssued:    'Total Qty Issued',
      totalValueIssued:  'Total Value Issued',
    },
 
    feeds: [
      {
        page:           'inventory',
        section:        'Monthly Issues tab',
        requiredFields: ['name', 'totalQtyIssued', 'totalValueIssued'],
        optionalFields: ['itemCode'],
      },
      {
        page:           'inventory',
        section:        'Top 10 Issued Items (monthly view)',
        requiredFields: ['name', 'totalQtyIssued'],
        optionalFields: ['totalValueIssued'],
      },
    ],
  },
 
  {
    dept:         'Store',
    module:       'stock_movement',
    label:        'Stock Movement',
    sheetId:      'YOUR_SHEET_ID_HERE',
    tabName:      'Stock Movement',
    range:        'A:G',
    headerRow:    1,
    periodSource: 'tabName',
 
    columnMap: {
      itemCode:          'Item Code',
      name:              'Item Description',
      openingBalance:    'Opening Balance',
      totalReceipts:     'Total Receipts',
      totalIssues:       'Total Issues',
      closingBalance:    'Closing Balance',
    },
 
    feeds: [
      {
        page:           'inventory',
        section:        'Stock Movement tab',
        requiredFields: ['name', 'openingBalance', 'totalReceipts', 'totalIssues', 'closingBalance'],
        optionalFields: ['itemCode'],
      },
      {
        page:           'inventory',
        section:        'Monthly Stock Movement chart',
        requiredFields: ['totalReceipts', 'totalIssues'],
        optionalFields: ['name', 'closingBalance'],
      },
    ],
  },
 
  {
    dept:         'Store',
    module:       'inventory_valuation',
    label:        'Inventory Valuation',
    sheetId:      'YOUR_SHEET_ID_HERE',
    tabName:      'Inventory Valuation',
    range:        'A:G',
    headerRow:    1,
    periodSource: 'tabName',
 
    columnMap: {
      itemCode:          'Item Code',
      name:              'Item Description',
      qty:               'Current Qty',
      unitCost:          'Unit Cost',
      totalValue:        'Stock Value',
      pctOfTotal:        '% of Total',
      classification:    'Classification',
    },
 
    feeds: [
      {
        page:           'inventory',
        section:        'Inventory Valuation tab',
        requiredFields: ['name', 'qty', 'unitCost', 'totalValue'],
        optionalFields: ['itemCode', 'pctOfTotal', 'classification'],
      },
      {
        page:           'inventory',
        section:        'Top 10 Highest Valued Items chart',
        requiredFields: ['name', 'totalValue'],
        optionalFields: [],
      },
      {
        page:           'inventory',
        section:        'Classification breakdown (A/B/C analysis)',
        requiredFields: ['classification', 'totalValue'],
        optionalFields: [],
      },
    ],
  },
 
  // ╔══════════════════════════════════════════════════════════╗
  // ║  PHARMACY DEPARTMENT                                     ║
  // ╚══════════════════════════════════════════════════════════╝
 
  {
    dept:         'Pharmacy',
    module:       'drug_dispensing',
    label:        'Drug Dispensing',
    sheetId:      'YOUR_PHARMACY_SHEET_ID_HERE',
    tabName:      'Dispensing',
    range:        'A:J',
    headerRow:    1,
    periodSource: 'dateColumn',
 
    columnMap: {
      date:        'Date',
      drug:        'Drug / Item',
      qty:         'Quantity',
      unit:        'Unit',
      patient:     'Patient / Ward',
      prescriber:  'Prescriber',
      dtype:       'Patient Type',
      value:       'Total Value',
    },
 
    feeds: [
      {
        page:           'pharmacy',
        section:        'Dispensing Records table',
        requiredFields: ['drug', 'qty', 'value'],
        optionalFields: ['date', 'unit', 'patient', 'prescriber', 'dtype'],
      },
      {
        page:           'pharmacy',
        section:        'Dispensing by Type chart',
        requiredFields: ['dtype'],
        optionalFields: ['value'],
      },
      {
        page:           'overview',
        section:        'Revenue KPI — Drug Sales component',
        requiredFields: ['value'],
        optionalFields: [],
      },
    ],
  },
 
  // ╔══════════════════════════════════════════════════════════╗
  // ║  FINANCE DEPARTMENT                                      ║
  // ╚══════════════════════════════════════════════════════════╝
 
  {
    dept:         'Finance',
    module:       'revenue_monthly',
    label:        'Monthly Revenue & Expenses',
    sheetId:      'YOUR_FINANCE_SHEET_ID_HERE',
    tabName:      'Revenue Summary',
    range:        'A:D',
    headerRow:    1,
    periodSource: 'dateColumn',
 
    columnMap: {
      month:    'Month',
      revenue:  'Revenue',
      expenses: 'Expenses',
      target:   'Monthly Target',
    },
 
    feeds: [
      {
        page:           'overview',
        section:        'Revenue vs Target chart + all KPI cards',
        requiredFields: ['month', 'revenue', 'expenses'],
        optionalFields: ['target'],
      },
      {
        page:           'cashbook',
        section:        'Monthly Cash Flow chart + table',
        requiredFields: ['month', 'revenue', 'expenses'],
        optionalFields: [],
      },
      {
        page:           'weekly',
        section:        'Monthly / Quarterly / YoY analysis',
        requiredFields: ['month', 'revenue', 'expenses'],
        optionalFields: ['target'],
      },
    ],
  },
 
  {
    dept:         'Finance',
    module:       'payables',
    label:        'Accounts Payable',
    sheetId:      'YOUR_FINANCE_SHEET_ID_HERE',
    tabName:      'Payables',
    range:        'A:G',
    headerRow:    1,
    periodSource: 'dateColumn',
 
    columnMap: {
      supplier: 'Supplier Name',
      invNo:    'Invoice No',
      date:     'Invoice Date',
      amount:   'Amount',
      dueDate:  'Due Date',
      status:   'Status',
      notes:    'Notes',
    },
 
    feeds: [
      {
        page:           'payables',
        section:        'Payables table',
        requiredFields: ['supplier', 'amount'],
        optionalFields: ['invNo', 'date', 'dueDate', 'status', 'notes'],
      },
      {
        page:           'vendoros',
        section:        'Vendor Outstanding analysis',
        requiredFields: ['supplier', 'amount'],
        optionalFields: ['status'],
      },
    ],
  },
 
  // ╔══════════════════════════════════════════════════════════╗
  // ║  PROCUREMENT DEPARTMENT                                  ║
  // ╚══════════════════════════════════════════════════════════╝
 
  {
    dept:         'Procurement',
    module:       'purchase_orders',
    label:        'Purchase Orders',
    sheetId:      'YOUR_PROCUREMENT_SHEET_ID_HERE',
    tabName:      'Purchase Orders',
    range:        'A:I',
    headerRow:    1,
    periodSource: 'dateColumn',
 
    columnMap: {
      poNo:         'PO No',
      date:         'Date',
      vendor:       'Vendor',
      item:         'Item / Description',
      qty:          'Quantity',
      total:        'Total Value',
      expectedDate: 'Expected Delivery',
      status:       'Status',
    },
 
    feeds: [
      {
        page:           'supplychain',
        section:        'Purchase Orders table',
        requiredFields: ['vendor', 'total'],
        optionalFields: ['poNo', 'date', 'item', 'qty', 'expectedDate', 'status'],
      },
      {
        page:           'supplychain',
        section:        'Vendor spend chart',
        requiredFields: ['vendor', 'total'],
        optionalFields: [],
      },
      {
        page:           'vendoros',
        section:        'Vendor Outstanding — Total Purchases',
        requiredFields: ['vendor', 'total'],
        optionalFields: ['status'],
      },
    ],
  },
 
  {
    dept:         'Procurement',
    module:       'goods_received',
    label:        'Goods Received Notes',
    sheetId:      'YOUR_PROCUREMENT_SHEET_ID_HERE',
    tabName:      'GRN',
    range:        'A:K',
    headerRow:    1,
    periodSource: 'dateColumn',
 
    columnMap: {
      grnNo:     'GRN No',
      date:      'Date',
      poRef:     'PO Reference',
      vendor:    'Vendor',
      item:      'Item',
      poQty:     'PO Quantity',
      recvQty:   'Received Quantity',
      recvValue: 'Received Value',
      condition: 'Condition',
    },
 
    feeds: [
      {
        page:           'grn',
        section:        'GRN Register table',
        requiredFields: ['vendor', 'recvQty', 'recvValue'],
        optionalFields: ['grnNo', 'date', 'poRef', 'item', 'poQty', 'condition'],
      },
    ],
  },
 
  // ╔══════════════════════════════════════════════════════════╗
  // ║  KITCHEN DEPARTMENT                                      ║
  // ╚══════════════════════════════════════════════════════════╝
 
  {
    dept:         'Kitchen',
    module:       'kitchen_orders',
    label:        'Meal Orders',
    sheetId:      'YOUR_KITCHEN_SHEET_ID_HERE',
    tabName:      'Meal Orders',
    range:        'A:I',
    headerRow:    1,
    periodSource: 'dateColumn',
 
    columnMap: {
      orderNo:  'Order No',
      date:     'Date',
      ward:     'Ward / Location',
      meal:     'Menu Item',
      diet:     'Diet Type',
      qty:      'Quantity',
      cost:     'Total Cost',
      status:   'Status',
    },
 
    feeds: [
      {
        page:           'kitchen',
        section:        'Meal Orders table',
        requiredFields: ['meal', 'qty'],
        optionalFields: ['date', 'ward', 'diet', 'cost', 'status'],
      },
    ],
  },
 
  // ╔══════════════════════════════════════════════════════════╗
  // ║  CSSD DEPARTMENT                                         ║
  // ╚══════════════════════════════════════════════════════════╝
 
  {
    dept:         'CSSD',
    module:       'cssd_batches',
    label:        'Sterilisation Batches',
    sheetId:      'YOUR_CSSD_SHEET_ID_HERE',
    tabName:      'Batches',
    range:        'A:I',
    headerRow:    1,
    periodSource: 'dateColumn',
 
    columnMap: {
      batch:       'Batch No',
      date:        'Date',
      dept:        'Department Served',
      processed:   'Packs Processed',
      sterilized:  'Packs Sterilised',
      revenue:     'Revenue',
      expense:     'Expense',
      method:      'Sterilisation Method',
      by:          'Logged By',
    },
 
    feeds: [
      {
        page:           'cssd',
        section:        'Batch Records table',
        requiredFields: ['processed', 'sterilized'],
        optionalFields: ['batch', 'date', 'dept', 'revenue', 'expense', 'method', 'by'],
      },
    ],
  },
];
 
// ─── Lookup helpers ───────────────────────────────────────────
 
export function getConnection(moduleKey) {
  return SHEET_CONNECTIONS.find(c => c.module === moduleKey) || null;
}
 
export function getConnectionsByDept() {
  const groups = {};
  SHEET_CONNECTIONS.forEach(c => {
    const dept = c.dept || 'Uncategorised';
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(c);
  });
  return groups;
}
 
export function isConnected(moduleKey) {
  const conn = getConnection(moduleKey);
  return !!(conn?.sheetId && conn.sheetId !== 'YOUR_SHEET_ID_HERE' && !conn.sheetId.includes('YOUR_'));
}
 
/**
 * Get all unique required fields for a module across all its feeds.
 * This is what the sync engine validates after fetching.
 */
export function getRequiredFields(moduleKey) {
  const conn = getConnection(moduleKey);
  if (!conn) return [];
  const required = new Set();
  (conn.feeds || []).forEach(feed => {
    (feed.requiredFields || []).forEach(f => required.add(f));
  });
  return [...required];
}
 
/**
 * Get optional fields for a module (union across feeds).
 */
export function getOptionalFields(moduleKey) {
  const conn = getConnection(moduleKey);
  if (!conn) return [];
  const optional = new Set();
  (conn.feeds || []).forEach(feed => {
    (feed.optionalFields || []).forEach(f => optional.add(f));
  });
  return [...optional];
}
 
/**
 * Get the "impact map" — which pages/sections break if a field is missing.
 * Used by the sync engine to generate targeted warnings.
 */
export function getFieldImpactMap(moduleKey) {
  const conn = getConnection(moduleKey);
  if (!conn) return {};
  const map = {};
  (conn.feeds || []).forEach(feed => {
    (feed.requiredFields || []).forEach(field => {
      if (!map[field]) map[field] = [];
      map[field].push({ page: feed.page, section: feed.section });
    });
  });
  return map;
}