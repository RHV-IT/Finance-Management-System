'use client';
 
/**
 * components/SyncStatus.jsx
 *
 * Two modes:
 *   <SyncStatus module="stock_register" />     → compact badge for a single module
 *   <SyncStatus showAll />                     → full panel showing all connections
 */
 
import { useState, useEffect, useCallback } from 'react';
import { getSyncState, syncModule, syncAll, isModuleConnected } from '../dashboard/lib/syncEngine';
import { getConnectionsByDept, SHEET_CONNECTIONS } from './DataImporter/sheetConfig';
import tableStyles from '../styles/Table.module.css';
 
function timeAgo(isoString) {
  if (!isoString) return 'Never';
  const diff = (Date.now() - new Date(isoString)) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
 
const STATUS_STYLE = {
  ok:      { color:'var(--teal)', bg:'#E8F8F5', border:'#A9DFBF', icon:'✓', label:'Synced'   },
  warning: { color:'#856404',    bg:'#FFF9E6', border:'#F4D03F', icon:'⚠', label:'Warning'  },
  error:   { color:'var(--red)', bg:'#FEECEC', border:'#F1948A', icon:'✗', label:'Error'     },
  syncing: { color:'var(--navy)',bg:'#EBF5FB', border:'#AED6F1', icon:'⏳',label:'Syncing…'  },
  never:   { color:'var(--muted)',bg:'var(--bg)',border:'var(--border)',icon:'○',label:'Not synced'},
};
 
// ─── Compact single-module badge ──────────────────────────────
 
export function SyncBadge({ module: moduleKey }) {
  const [state, setState]   = useState({});
  const [syncing, setSyncing] = useState(false);
 
  const refresh = useCallback(() => {
    const all = getSyncState();
    setState(all[moduleKey] || {});
  }, [moduleKey]);
 
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [refresh]);
 
  const connected = isModuleConnected(moduleKey);
  if (!connected) return null;
 
  const s = STATUS_STYLE[state.status || 'never'];
 
  const handleSync = async () => {
    setSyncing(true);
    await syncModule(moduleKey);
    refresh();
    setSyncing(false);
  };
 
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'4px 10px',
      background:s.bg, border:`1px solid ${s.border}`,
      borderRadius:99, fontSize:10, fontWeight:600,
    }}>
      <span style={{ color:s.color }}>{syncing ? '⏳' : s.icon}</span>
      <span style={{ color:s.color }}>
        {syncing ? 'Syncing…' : state.lastSynced ? `Synced ${timeAgo(state.lastSynced)}` : 'Not synced'}
      </span>
      {state.rowCount != null && (
        <span style={{ color:'var(--muted)' }}>({state.rowCount} rows)</span>
      )}
      <button
        onClick={handleSync}
        disabled={syncing}
        style={{
          marginLeft:2, padding:'1px 7px',
          background:'transparent', border:`1px solid ${s.border}`,
          borderRadius:99, fontSize:9, fontWeight:700, cursor:'pointer',
          color:s.color,
        }}
      >↻ Sync</button>
    </div>
  );
}
 
// ─── Full panel (used in Settings) ────────────────────────────
 
export default function SyncStatus() {
  const [syncState, setSyncState] = useState({});
  const [syncing,   setSyncing]   = useState(false);
  const [results,   setResults]   = useState([]);
  const [expanded,  setExpanded]  = useState({});
 
  const refresh = useCallback(() => {
    setSyncState(getSyncState());
  }, []);
 
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [refresh]);
 
  const handleSyncAll = async () => {
    setSyncing(true);
    setResults([]);
    const res = await syncAll();
    setResults(res);
    refresh();
    setSyncing(false);
  };
 
  const handleSyncOne = async (moduleKey) => {
    setSyncing(true);
    await syncModule(moduleKey);
    refresh();
    setSyncing(false);
  };
 
  const byDept = getConnectionsByDept();
  const connectedCount = SHEET_CONNECTIONS.filter(c => isModuleConnected(c.module)).length;
 
  return (
    <div>
      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)' }}>
            Google Sheets Sync
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
            {connectedCount} of {SHEET_CONNECTIONS.length} modules connected
          </div>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={syncing || connectedCount === 0}
          style={{
            padding:'8px 18px',
            background: connectedCount === 0 ? 'var(--border)' : 'var(--teal)',
            color:'#fff', border:'none', borderRadius:8,
            fontSize:12, fontWeight:700, cursor: connectedCount === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {syncing ? '⏳ Syncing…' : '🔄 Sync All Now'}
        </button>
      </div>
 
      {/* Sync results banner */}
      {results.length > 0 && (
        <div style={{ marginBottom:16 }}>
          {results.map((r, i) => (
            <div key={i} style={{
              padding:'8px 14px', marginBottom:6, borderRadius:8, fontSize:11,
              background: r.ok ? '#E8F8F5' : '#FEECEC',
              border:`1px solid ${r.ok ? '#A9DFBF' : '#F1948A'}`,
              color: r.ok ? 'var(--teal)' : 'var(--red)',
            }}>
              {r.ok
                ? `✓ ${r.module}: ${r.rowCount} rows synced${r.period ? ` for ${r.period}` : ''}${r.warnings?.length > 0 ? ` (${r.warnings.length} warnings)` : ''}`
                : `✗ ${r.module || 'Unknown'}: ${r.error || r.errors?.join(', ')}`
              }
            </div>
          ))}
        </div>
      )}
 
      {/* Dept groups */}
      {Object.entries(byDept).map(([dept, connections]) => (
        <div key={dept} style={{ marginBottom:20 }}>
          <div style={{
            fontSize:10, fontWeight:700, color:'var(--muted)',
            textTransform:'uppercase', letterSpacing:1, marginBottom:10,
          }}>
            🏥 {dept} Department
          </div>
 
          <div className={tableStyles.tableBox} style={{ margin:0 }}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Tab Name</th>
                  <th>Status</th>
                  <th>Last Synced</th>
                  <th>Rows</th>
                  <th>Period</th>
                  <th>Warnings</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {connections.map(conn => {
                  const ms      = syncState[conn.module] || {};
                  const conn_ok = isModuleConnected(conn.module);
                  const s       = STATUS_STYLE[conn_ok ? (ms.status || 'never') : 'never'];
                  const warns   = ms.warnings || [];
                  const errs    = ms.errors   || [];
                  const isExp   = expanded[conn.module];
 
                  return [
                    <tr key={conn.module}>
                      <td style={{ fontWeight:700 }}>{conn.label}</td>
                      <td style={{ fontSize:10, color:'var(--muted)' }}>{conn.tabName}</td>
                      <td>
                        {conn_ok ? (
                          <span style={{
                            display:'inline-flex', alignItems:'center', gap:4,
                            padding:'2px 8px', background:s.bg,
                            border:`1px solid ${s.border}`,
                            borderRadius:99, fontSize:9, fontWeight:700, color:s.color,
                          }}>
                            {s.icon} {s.label}
                          </span>
                        ) : (
                          <span style={{ fontSize:10, color:'var(--muted)', fontStyle:'italic' }}>
                            Not connected
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize:10, color:'var(--muted)' }}>
                        {ms.lastSynced ? timeAgo(ms.lastSynced) : '—'}
                      </td>
                      <td style={{ fontWeight: ms.rowCount ? 600 : 400 }}>
                        {ms.rowCount ?? '—'}
                      </td>
                      <td style={{ fontSize:10, color:'var(--muted)' }}>
                        {ms.period || '—'}
                      </td>
                      <td>
                        {warns.length > 0 || errs.length > 0 ? (
                          <button
                            onClick={() => setExpanded(e => ({ ...e, [conn.module]: !e[conn.module] }))}
                            style={{
                              fontSize:10, fontWeight:600, background:'none', border:'none',
                              cursor:'pointer', color: errs.length > 0 ? 'var(--red)' : 'var(--amber)',
                              padding:0,
                            }}
                          >
                            {errs.length > 0 ? `✗ ${errs.length} error${errs.length > 1?'s':''}` : `⚠ ${warns.length} warning${warns.length > 1?'s':''}`}
                          </button>
                        ) : (
                          <span style={{ fontSize:10, color:'var(--muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {conn_ok && (
                          <button
                            onClick={() => handleSyncOne(conn.module)}
                            disabled={syncing}
                            style={{
                              padding:'4px 10px', background:'transparent',
                              border:'1.5px solid var(--border)', borderRadius:6,
                              fontSize:10, fontWeight:600, cursor:'pointer', color:'var(--navy)',
                            }}
                          >↻ Sync</button>
                        )}
                      </td>
                    </tr>,
                    /* Expanded warnings */
                    ...(isExp ? [
                      <tr key={`${conn.module}-details`}>
                        <td colSpan={8} style={{ padding:'0 14px 12px', background:'#fafcff' }}>
                          {errs.map((e, i) => (
                            <div key={i} style={{ padding:'6px 10px', marginBottom:4, background:'#FEECEC', borderRadius:6, fontSize:10, color:'var(--red)' }}>
                              ✗ {e}
                            </div>
                          ))}
                          {warns.map((w, i) => (
                            <div key={i} style={{ padding:'6px 10px', marginBottom:4, background:'#FFF9E6', borderRadius:6, fontSize:10, color:'#856404' }}>
                              ⚠ {w}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ] : []),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
 
      {/* How to connect */}
      {connectedCount === 0 && (
        <div style={{
          background:'#F4F6F9', border:'1px solid var(--border)',
          borderRadius:10, padding:'20px 24px', marginTop:10,
        }}>
          <div style={{ fontWeight:700, fontSize:12, color:'var(--navy)', marginBottom:8 }}>
            📋 How to connect a department sheet
          </div>
          <ol style={{ fontSize:11, color:'var(--muted)', lineHeight:2, paddingLeft:18, margin:0 }}>
            <li>Get the Google Sheet URL from the department head.</li>
            <li>Make sure it's set to <strong>"Anyone with the link can view"</strong>.</li>
            <li>Open <code>components/DataImporter/sheetConfig.js</code> in your code editor.</li>
            <li>Find the right module entry (e.g. <code>module: 'stock_register'</code>).</li>
            <li>Paste the Sheet ID into <code>sheetId</code>.</li>
            <li>Set <code>tabName</code> to the exact tab name in their sheet.</li>
            <li>Update <code>columnMap</code> to match their column headers.</li>
            <li>Come back here and click <strong>Sync Now</strong>.</li>
          </ol>
        </div>
      )}
    </div>
  );
}