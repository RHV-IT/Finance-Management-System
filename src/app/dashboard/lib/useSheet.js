/**
 * lib/useSheet.js
 *
 * Replaces useData.js entirely.
 * Fetches directly from Google Sheets on mount.
 * No localStorage. No demo data. Google Sheets is the source of truth.
 *
 * USAGE:
 *   const { rows, loading, error, refetch } = useSheet('srv_receipts');
 *
 * Returns:
 *   rows    — array of mapped row objects (empty [] while loading or on error)
 *   loading — true while fetching
 *   error   — string if something went wrong, null otherwise
 *   refetch — call this to manually re-fetch
 *   meta    — { rowCount, period, tabName, fetchedAt }
 *   warnings— non-fatal issues (e.g. unmapped columns)
 */
 
'use client';
 
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchSheetTab } from './GoogleSheets';
import { getConnection } from '../../components/DataImporter/sheetConfig';
 
const API_KEY_STORAGE = 'rhv_google_api_key';
 
function getApiKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(API_KEY_STORAGE) || '';
}
 
/**
 * Main hook — fetch a single module's sheet.
 *
 * @param {string} moduleKey  — matches sheetConfig.js module field
 * @param {object} opts
 * @param {boolean} opts.skip — set true to skip fetching (e.g. tab not visible)
 */
export function useSheet(moduleKey, { skip = false } = {}) {
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(!skip);
  const [error,    setError]    = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [meta,     setMeta]     = useState({});
  const abortRef = useRef(null);
 
  const fetch_ = useCallback(async () => {
    const connection = getConnection(moduleKey);
 
    // No connection configured at all
    if (!connection) {
      setError(`No sheet configuration found for module "${moduleKey}". Add it to sheetConfig.js.`);
      setLoading(false);
      return;
    }
 
    // Sheet ID not set yet
    if (!connection.sheetId || connection.sheetId.includes('YOUR_')) {
      setError(`Sheet not connected yet. Open sheetConfig.js and set sheetId for "${connection.label || moduleKey}".`);
      setLoading(false);
      return;
    }
 
    // API key missing
    const apiKey = getApiKey();
    if (!apiKey) {
      setError('Google API key not set. Go to Settings → Google Sheets and enter your API key.');
      setLoading(false);
      return;
    }
 
    setLoading(true);
    setError(null);
    setWarnings([]);
 
    try {
      const result = await fetchSheetTab(connection, apiKey);
 
      if (result.warnings.length > 0 && result.rows.length === 0) {
        // Fetch failed entirely
        setError(result.warnings.join(' '));
        setRows([]);
      } else {
        setRows(result.rows);
        setWarnings(result.warnings);
        setMeta(result.meta);
      }
    } catch (err) {
      setError(`Failed to fetch "${moduleKey}": ${err.message}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [moduleKey]);
 
  useEffect(() => {
    if (skip) return;
    fetch_();
  }, [moduleKey, skip, fetch_]);
 
  return { rows, loading, error, warnings, meta, refetch: fetch_ };
}
 
/**
 * Fetch multiple modules in parallel.
 * Returns an object keyed by moduleKey.
 *
 * USAGE:
 *   const sheets = useSheets(['stock_register', 'srv_receipts', 'stock_out']);
 *   sheets.stock_register.rows
 *   sheets.srv_receipts.loading
 *   sheets.stock_out.error
 */
export function useSheets(moduleKeys) {
  const [state, setState] = useState(() =>
    Object.fromEntries(moduleKeys.map(k => [k, { rows:[], loading:true, error:null, warnings:[], meta:{} }]))
  );
 
  const fetchAll = useCallback(async () => {
    const apiKey = getApiKey();
 
    await Promise.all(moduleKeys.map(async (moduleKey) => {
      const connection = getConnection(moduleKey);
 
      if (!connection) {
        setState(prev => ({ ...prev, [moduleKey]: { ...prev[moduleKey], loading:false, error:`No config for "${moduleKey}"` } }));
        return;
      }
 
      if (!connection.sheetId || connection.sheetId.includes('YOUR_')) {
        setState(prev => ({ ...prev, [moduleKey]: { ...prev[moduleKey], loading:false, error:`Sheet not connected for "${connection.label || moduleKey}". Set sheetId in sheetConfig.js.` } }));
        return;
      }
 
      if (!apiKey) {
        setState(prev => ({ ...prev, [moduleKey]: { ...prev[moduleKey], loading:false, error:'API key not set. Go to Settings → Google Sheets.' } }));
        return;
      }
 
      try {
        const result = await fetchSheetTab(connection, apiKey);
 
        if (result.warnings.length > 0 && result.rows.length === 0) {
          setState(prev => ({ ...prev, [moduleKey]: { rows:[], loading:false, error:result.warnings.join(' '), warnings:[], meta:{} } }));
        } else {
          setState(prev => ({ ...prev, [moduleKey]: { rows:result.rows, loading:false, error:null, warnings:result.warnings, meta:result.meta } }));
        }
      } catch (err) {
        setState(prev => ({ ...prev, [moduleKey]: { rows:[], loading:false, error:err.message, warnings:[], meta:{} } }));
      }
    }));
  }, [moduleKeys.join(',')]);
 
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
 
  // Attach refetch to each entry
  const result = {};
  moduleKeys.forEach(k => {
    result[k] = { ...state[k], refetch: fetchAll };
  });
 
  return result;
}
 
/**
 * PeriodFilterBar — just the month/dept filter UI, no data logic.
 * Works with any state you pass in.
 */
export function buildMonthOptions(yearsBack = 2) {
  const options = [];
  const anchor  = new Date(2026, 1, 1); // anchor to Feb 2026 (your data)
  for (let i = 0; i < 12 * yearsBack; i++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}
 
const MONTH_OPTIONS = buildMonthOptions(2);
 
export function PeriodFilterBar({
  month, setMonth,
  showMonth = true,
  connected = false,
  loading   = false,
  onRefetch,
}) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
      padding:'10px 14px',
      background: connected ? '#E8F8F5' : '#FFF9E6',
      border:`1px solid ${connected ? '#A9DFBF' : '#F4D03F'}`,
      borderRadius:8, marginBottom:16,
    }}>
      {showMonth && (
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase' }}>Period:</span>
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ padding:'5px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, outline:'none', background:'#fff' }}
          >
            {MONTH_OPTIONS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      )}
 
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
        {/* Connection status */}
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background: connected ? '#117A65' : '#CA6F1E' }} />
          <span style={{ fontSize:11, fontWeight:700, color: connected ? '#117A65' : '#CA6F1E' }}>
            {loading ? 'Loading…' : connected ? '✓ Live from Google Sheets' : 'Sheet not connected'}
          </span>
        </div>
 
        {/* Manual refetch */}
        {connected && onRefetch && (
          <button
            onClick={onRefetch}
            disabled={loading}
            style={{
              padding:'4px 12px', background:'transparent',
              border:'1px solid var(--teal)', borderRadius:6,
              fontSize:10, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
              color:'var(--teal)',
            }}
          >
            {loading ? '⏳' : '↻ Refresh'}
          </button>
        )}
      </div>
    </div>
  );
}
 
/**
 * SheetError — renders a clear error state for a page or section.
 * Use this instead of rendering a broken table.
 */
export function SheetError({ module: moduleKey, error, onRefetch }) {
  const connection = getConnection(moduleKey);
  const isNotConnected = error?.includes('not connected') || error?.includes('sheetId');
  const isNoApiKey     = error?.includes('API key');
 
  return (
    <div style={{
      background: isNotConnected ? '#FFF9E6' : '#FEECEC',
      border:`1.5px solid ${isNotConnected ? '#F4D03F' : '#F1948A'}`,
      borderRadius:10, padding:'24px 28px', textAlign:'center',
    }}>
      <div style={{ fontSize:32, marginBottom:12 }}>
        {isNotConnected ? '🔗' : isNoApiKey ? '🔑' : '⚠️'}
      </div>
      <div style={{ fontSize:14, fontWeight:800, color:'var(--navy)', marginBottom:8 }}>
        {isNotConnected
          ? `${connection?.label || moduleKey} sheet not connected yet`
          : isNoApiKey
            ? 'Google API key not set'
            : 'Failed to load data'}
      </div>
      <div style={{ fontSize:12, color:'var(--muted)', maxWidth:420, margin:'0 auto', lineHeight:1.7 }}>
        {isNotConnected && (
          <>
            Open <code style={{ background:'#f0f0f0', padding:'1px 6px', borderRadius:4 }}>components/DataImporter/sheetConfig.js</code>,
            find the <code style={{ background:'#f0f0f0', padding:'1px 6px', borderRadius:4 }}>{moduleKey}</code> entry,
            and set <code style={{ background:'#f0f0f0', padding:'1px 6px', borderRadius:4 }}>sheetId</code> to the department's Google Sheet ID.
          </>
        )}
        {isNoApiKey && (
          <>
            Go to <strong>Settings → Google Sheets</strong> and enter your Google API key.
            The key is free — get one at <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color:'var(--teal)' }}>console.cloud.google.com</a>.
          </>
        )}
        {!isNotConnected && !isNoApiKey && (
          <span style={{ color:'var(--red)' }}>{error}</span>
        )}
      </div>
      {onRefetch && !isNotConnected && !isNoApiKey && (
        <button
          onClick={onRefetch}
          style={{ marginTop:16, padding:'8px 20px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}
        >
          ↻ Retry
        </button>
      )}
      {(isNotConnected || isNoApiKey) && (
        <a href="/dashboard/settings" style={{ display:'inline-block', marginTop:16, padding:'8px 20px', background:'var(--navy)', color:'#fff', borderRadius:8, fontSize:12, fontWeight:600, textDecoration:'none' }}>
          ⚙ Go to Settings
        </a>
      )}
    </div>
  );
}
 
/**
 * SheetLoading — skeleton loader while fetching.
 */
export function SheetLoading({ rows = 6, cols = 5 }) {
  return (
    <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid var(--border)' }}>
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} style={{ display:'flex', gap:12, padding:'10px 16px', borderBottom:'1px solid var(--border)', background: ri === 0 ? '#f5f7f9' : '#fff' }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <div key={ci} style={{
              flex:1, height:12, borderRadius:4,
              background: ri === 0 ? '#dde1e7' : '#f0f2f5',
              animation:'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}