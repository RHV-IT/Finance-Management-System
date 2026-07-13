/**
 * lib/useData.js
 *
 * The single bridge between localStorage (DataImporter writes here)
 * and every page (reads from here).
 *
 * USAGE ON A PAGE:
 *
 *   import { useData, usePeriodFilter } from '../../lib/useData';
 *   import { DEMO_STOCK } from '../../lib/data';
 *
 *   export default function StorePage() {
 *     const { month, dept, setMonth, setDept, monthOptions } = usePeriodFilter('2025-11');
 *     const stock = useData('stock_register', DEMO_STOCK, { month, dept });
 *     // stock is now either localStorage data or DEMO_STOCK — same shape either way
 *   }
 *
 * POSTGRES MIGRATION:
 *   Replace the localStorage.getItem call inside useData with a
 *   fetch('/api/data/[key]?month=...&dept=...') call.
 *   The page code doesn't change at all.
 */
 
'use client';
 
import { useState, useEffect, useCallback } from 'react';
import { loadData, getAvailableMonths, getAvailableDepts, hasRealData } from './dataStore';
 
// ─── Month label helpers ───────────────────────────────────────
 
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 
export function monthLabel(yyyymm) {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-');
  return `${MONTH_NAMES[+m - 1]} ${y}`;
}
 
export function buildMonthOptions(yearsBack = 2) {
  const options = [];
  const now = new Date(2025, 10, 1); // anchor: Nov 2025
  for (let i = 0; i < 12 * yearsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}
 
// ─── Main hook ────────────────────────────────────────────────
 
/**
 * useData — reads from localStorage if available, falls back to demoData.
 *
 * @param {string}  storageKey  - matches importConfig storageKey (= future table name)
 * @param {Array}   demoData    - fallback seed from lib/data.js
 * @param {object}  options
 * @param {string}  options.month       - 'YYYY-MM' or null for static modules
 * @param {string}  options.department  - department name or null
 * @returns {Array} rows — same shape whether from localStorage or demo
 */
export function useData(storageKey, demoData = [], { month, department } = {}) {
  const [data, setData] = useState(() => {
    // Initialise synchronously on first render to avoid flash
    return loadData(storageKey, demoData, { month, department });
  });
 
  useEffect(() => {
    setData(loadData(storageKey, demoData, { month, department }));
  }, [storageKey, month, department]);
 
  return data;
}
 
/**
 * useDataWithMeta — same as useData but also returns whether real data
 * is loaded (vs demo), and the row count.
 */
export function useDataWithMeta(storageKey, demoData = [], { month, department } = {}) {
  const data    = useData(storageKey, demoData, { month, department });
  const isReal  = hasRealData(storageKey, { month, department });
  return { data, isReal, count: data.length };
}
 
// ─── Period filter hook ────────────────────────────────────────
 
/**
 * usePeriodFilter — manages month + department filter state for a page.
 * Also surfaces which months/depts have real uploaded data.
 *
 * @param {string}  defaultMonth  - 'YYYY-MM', defaults to Nov 2025
 * @param {string}  storageKey    - optional — used to highlight months with data
 * @returns filter state + setters + available options
 */
export function usePeriodFilter(defaultMonth = '2025-11', storageKey = null) {
  const [month, setMonth]   = useState(defaultMonth);
  const [dept,  setDept]    = useState('');
 
  const monthOptions = buildMonthOptions(2);
 
  const availableMonths = storageKey ? getAvailableMonths(storageKey, dept || null) : [];
  const availableDepts  = storageKey ? getAvailableDepts(storageKey, month)         : [];
 
  return {
    month, setMonth,
    dept,  setDept,
    monthOptions,
    availableMonths,  // months that have real uploaded data
    availableDepts,   // depts that have real uploaded data
  };
}
 
// ─── PeriodFilterBar component ────────────────────────────────
 
/**
 * PeriodFilterBar — drop this on any page to get the month/dept pickers.
 * Highlights months that have real uploaded data with a dot.
 *
 * @param {object}  props
 * @param {boolean} props.showMonth       - show month picker
 * @param {boolean} props.showDept        - show dept picker
 * @param {boolean} props.showDataBadge   - show "Real Data" / "Demo Data" badge
 */
export function PeriodFilterBar({
  month, setMonth,
  dept,  setDept,
  monthOptions = [],
  availableMonths = [],
  availableDepts  = [],
  showMonth = true,
  showDept  = false,
  showDataBadge = true,
  isRealData = false,
}) {
  if (!showMonth && !showDept) return null;
 
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      padding: '10px 14px', background: '#F4F6F9',
      border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16,
    }}>
      {showMonth && (
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase' }}>Period:</span>
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{
              padding:'5px 10px', border:'1.5px solid var(--border)', borderRadius:6,
              fontSize:11, outline:'none', background:'#fff',
            }}
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>
                {availableMonths.includes(m.value) ? '● ' : ''}{m.label}
              </option>
            ))}
          </select>
        </div>
      )}
 
      {showDept && (
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase' }}>Dept:</span>
          <select
            value={dept}
            onChange={e => setDept(e.target.value)}
            style={{
              padding:'5px 10px', border:'1.5px solid var(--border)', borderRadius:6,
              fontSize:11, outline:'none', background:'#fff',
            }}
          >
            <option value="">All Departments</option>
            {availableDepts.length > 0
              ? availableDepts.map(d => <option key={d} value={d}>{d}</option>)
              : ['Pharmacy','Laboratory','Radiology','ICU','Theatre','Outpatient','CSSD','Kitchen','Store','Administration'].map(d =>
                  <option key={d} value={d}>{d}</option>
                )
            }
          </select>
        </div>
      )}
 
      {showDataBadge && (
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5 }}>
          <div style={{
            width:7, height:7, borderRadius:'50%',
            background: isRealData ? 'var(--teal)' : 'var(--amber)',
          }} />
          <span style={{ fontSize:10, fontWeight:600, color: isRealData ? 'var(--teal)' : 'var(--amber)' }}>
            {isRealData ? 'Real Data' : 'Demo Data'}
          </span>
          {!isRealData && (
            <span style={{ fontSize:9, color:'var(--muted)' }}>— upload via Settings → Data Import</span>
          )}
        </div>
      )}
    </div>
  );
}