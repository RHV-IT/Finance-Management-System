/**
 * components/DataImporter/index.jsx
 *
 * Drop this anywhere in the app to get the full import hub.
 * Now month + department aware — pickers appear based on each
 * module's timeAxis / deptAxis config.
 *
 * USAGE:
 *   <DataImporter />
 *   <DataImporter filterModules={['stock_register','srv_receipts']} />
 *   <DataImporter defaultModule="stock_register" compact />
 */

import { useState, useRef, useCallback } from 'react';
import {
  IMPORT_MODULES, getGroups, getModuleConfig,
  DEPARTMENTS, getMonthOptions,
} from './importConfig';
import { parseFile } from './parsers';
import { mapHeaders, validateRows, buildSummary } from './validators';
import { downloadTemplate, downloadAllTemplates } from './templateGen';
import {
  saveData, loadData, clearData, hasRealData, getRowCount,
  getImportHistory, clearImportHistory, getAvailableMonths,
} from '../../dashboard/lib/dataStore';
import { runReconciliation } from '../../dashboard/lib/reconciliation';
import tableStyles from '../../styles/Table.module.css';

const STEP_COLORS = {
  idle:      { bg:'var(--bg)',    border:'var(--border)' },
  dragging:  { bg:'#EBF5FB',     border:'var(--navy)'   },
  parsing:   { bg:'#FFF9E6',     border:'var(--amber)'  },
  preview:   { bg:'var(--card)', border:'var(--teal)'   },
  importing: { bg:'#EBF5FB',     border:'var(--navy)'   },
  done:      { bg:'#E8F8F5',     border:'var(--teal)'   },
  error:     { bg:'#FEECEC',     border:'var(--red)'    },
};

const GROUP_ICONS = {
  'Revenue & Financials':  '💰',
  'Store & Inventory':     '📦',
  'Vendors & Assets':      '🚚',
  'Pharmacy & Clinical':   '💊',
  'Procurement':           '🛒',
  'Operations':            '⚙',
  'KPI & Reporting':       '🎯',
};

const MONTH_OPTIONS = getMonthOptions(2);

export default function DataImporter({ filterModules, defaultModule, compact = false }) {
  const modules = filterModules
    ? IMPORT_MODULES.filter(m => filterModules.includes(m.key))
    : IMPORT_MODULES;

  const groups = getGroups().filter(g => modules.some(m => m.group === g));

  const [activeModule,  setActiveModule]  = useState(defaultModule || null);
  const [selMonth,      setSelMonth]      = useState(MONTH_OPTIONS[1]?.value || ''); // default last month
  const [selDept,       setSelDept]       = useState('');
  const [mode,          setMode]          = useState('replace');
  const [step,          setStep]          = useState('idle');
  const [parsedRows,    setParsedRows]    = useState([]);
  const [mapping,       setMapping]       = useState({});
  const [missing,       setMissing]       = useState([]);
  const [validRows,     setValidRows]     = useState([]);
  const [errorRows,     setErrorRows]     = useState([]);
  const [warnRows,      setWarnRows]      = useState([]);
  const [summary,       setSummary]       = useState([]);
  const [importResult,  setImportResult]  = useState(null);
  const [reconResult,   setReconResult]   = useState(null);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [fileName,      setFileName]      = useState('');
  const [showHistory,   setShowHistory]   = useState(false);
  const [showErrors,    setShowErrors]    = useState(false);

  const fileInputRef = useRef(null);

  const currentModule = modules.find(m => m.key === activeModule);

  const needsMonth = currentModule?.timeAxis === 'monthly';
  const needsDept  = currentModule?.deptAxis === 'required';
  const deptOptional = currentModule?.deptAxis === 'optional';

  const readyToUpload = currentModule &&
    (!needsMonth || selMonth) &&
    (!needsDept  || selDept);

  // ─── File handling ─────────────────────────────────────────

  const processFile = useCallback(async (file) => {
    if (!currentModule || !readyToUpload) return;

    setFileName(file.name);
    setStep('parsing');
    setErrorMsg('');

    try {
      const { headers, rows } = await parseFile(file);
      const { mapping: mp, unmatched, missing: miss } = mapHeaders(headers, currentModule.columns);
      const { valid, errors, warnings } = validateRows(rows, mp, currentModule.columns);
      const sum = buildSummary(valid, errors, warnings, mp, miss);

      setParsedRows(rows);
      setMapping(mp);
      setMissing(miss);
      setValidRows(valid);
      setErrorRows(errors);
      setWarnRows(warnings);
      setSummary(sum);
      setStep('preview');
    } catch (err) {
      setErrorMsg(err.message);
      setStep('error');
    }
  }, [currentModule, readyToUpload]);

  const onFileChange = e => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const onDrop = e => {
    e.preventDefault();
    setStep('idle');
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const onDragOver = e => { e.preventDefault(); if (readyToUpload) setStep('dragging'); };
  const onDragLeave = () => setStep('idle');

  // ─── Import ────────────────────────────────────────────────

  const confirmImport = async () => {
    if (!currentModule || validRows.length === 0) return;
    setStep('importing');

    const result = await saveData(currentModule.storageKey, validRows, {
      month:      needsMonth ? selMonth : null,
      department: needsDept || deptOptional ? (selDept || null) : null,
      mode,
      mergeKey: currentModule.mergeKey,
    });

    setImportResult(result);

    // Run reconciliation explicitly and capture result for display
    if (needsMonth) {
      const alerts = runReconciliation(selMonth, needsDept ? selDept : null);
      setReconResult(alerts);
    }

    setStep('done');
  };

  // ─── Reset ─────────────────────────────────────────────────

  const reset = () => {
    setStep('idle');
    setParsedRows([]);
    setMapping({});
    setMissing([]);
    setValidRows([]);
    setErrorRows([]);
    setWarnRows([]);
    setSummary([]);
    setImportResult(null);
    setReconResult(null);
    setErrorMsg('');
    setFileName('');
    setShowErrors(false);
  };

  const clearModuleData = () => {
    if (!currentModule) return;
    const scope = needsMonth ? ` for ${selMonth}${selDept ? ' / ' + selDept : ''}` : '';
    if (!confirm(`Clear imported data for "${currentModule.label}"${scope}? This resets it to demo data.`)) return;
    clearData(currentModule.storageKey, {
      month: needsMonth ? selMonth : null,
      department: needsDept ? selDept : null,
    });
    reset();
  };

  const history = getImportHistory();
  const zone = STEP_COLORS[step] || STEP_COLORS.idle;

  const currentDataCount = currentModule
    ? getRowCount(currentModule.storageKey, {
        month: needsMonth ? selMonth : null,
        department: needsDept ? selDept : null,
      })
    : 0;

  return (
    <div style={{ fontFamily:'var(--font)' }}>

      {/* ── Module selector ──────────────────────────────────── */}
      {!compact && (
        <div style={{ marginBottom:20 }}>
          {groups.map(group => (
            <div key={group} style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                {GROUP_ICONS[group] || '📁'} {group}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {modules.filter(m => m.group === group).map(m => {
                  const hasData = hasRealData(m.storageKey);
                  const isActive = activeModule === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => { setActiveModule(m.key); reset(); setSelDept(''); }}
                      style={{
                        display:'flex', alignItems:'center', gap:7,
                        padding:'7px 13px',
                        border:`1.5px solid ${isActive ? 'var(--teal)' : hasData ? 'var(--teal)' : 'var(--border)'}`,
                        borderRadius:8,
                        background: isActive ? 'var(--teal)' : hasData ? '#E8F8F5' : 'var(--card)',
                        color: isActive ? '#fff' : 'var(--text)',
                        cursor:'pointer', fontSize:11, fontWeight:600,
                        transition:'all .15s',
                      }}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                      <span style={{ fontSize:8, opacity:0.7 }}>
                        {m.timeAxis === 'monthly' ? '📅' : ''}
                        {m.deptAxis === 'required' ? '🏥' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Active module panel ───────────────────────────────── */}
      {currentModule ? (
        <div style={{ background:'var(--card)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>

          {/* Header */}
          <div style={{ background:'linear-gradient(135deg,var(--navy),#0d6e5a)', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>
                {currentModule.icon} {currentModule.label}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.65)', marginTop:3 }}>
                {currentModule.description}
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button
                onClick={() => downloadTemplate(currentModule)}
                style={{ padding:'7px 14px', background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.3)', borderRadius:7, color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer' }}
              >
                ⬇ Download Template
              </button>
            </div>
          </div>

          <div style={{ padding:'20px' }}>

            {/* ── Month / Department pickers ──────────────────── */}
            {(needsMonth || needsDept || deptOptional) && (
              <div style={{
                display:'flex', gap:12, marginBottom:16, padding:'14px 16px',
                background:'#EBF5FB', border:'1px solid #AED6F1', borderRadius:10, flexWrap:'wrap',
              }}>
                {needsMonth && (
                  <div style={{ flex:1, minWidth:180 }}>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--navy)', marginBottom:5, textTransform:'uppercase', letterSpacing:0.4 }}>
                      📅 Which month is this data for? <span style={{ color:'var(--red)' }}>*</span>
                    </label>
                    <select
                      value={selMonth}
                      onChange={e => setSelMonth(e.target.value)}
                      style={{ width:'100%', padding:'8px 10px', border:'1.5px solid var(--border)', borderRadius:7, fontSize:12, outline:'none', background:'#fff' }}
                    >
                      <option value="">— Select month —</option>
                      {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                )}
                {(needsDept || deptOptional) && (
                  <div style={{ flex:1, minWidth:180 }}>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--navy)', marginBottom:5, textTransform:'uppercase', letterSpacing:0.4 }}>
                      🏥 Which department? {needsDept && <span style={{ color:'var(--red)' }}>*</span>}
                    </label>
                    <select
                      value={selDept}
                      onChange={e => setSelDept(e.target.value)}
                      style={{ width:'100%', padding:'8px 10px', border:'1.5px solid var(--border)', borderRadius:7, fontSize:12, outline:'none', background:'#fff' }}
                    >
                      <option value="">{deptOptional ? '— All / Hospital-wide —' : '— Select department —'}</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                {readyToUpload && currentDataCount > 0 && (
                  <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:2 }}>
                    <div style={{ fontSize:10, color:'var(--navy)', background:'#fff', border:'1px solid #AED6F1', borderRadius:7, padding:'7px 12px', fontWeight:600 }}>
                      ℹ {currentDataCount} existing row{currentDataCount !== 1 ? 's' : ''} for this selection
                    </div>
                  </div>
                )}
              </div>
            )}

            {!readyToUpload && currentModule && (needsMonth || needsDept) && (
              <div style={{ padding:'10px 14px', background:'#FFF9E6', border:'1px solid #F4D03F', borderRadius:8, fontSize:11, color:'#856404', marginBottom:16 }}>
                ⚠ Please select {needsMonth && !selMonth ? 'a month' : ''}{needsMonth && !selMonth && needsDept && !selDept ? ' and ' : ''}{needsDept && !selDept ? 'a department' : ''} before uploading.
              </div>
            )}

            {/* Column spec */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
                Expected Columns
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {currentModule.columns.map(c => (
                  <div key={c.key} style={{
                    display:'flex', alignItems:'center', gap:4,
                    padding:'3px 10px',
                    background: c.required ? '#EBF5FB' : 'var(--bg)',
                    border:`1px solid ${c.required ? '#AED6F1' : 'var(--border)'}`,
                    borderRadius:99, fontSize:10, fontWeight:600,
                    color: c.required ? 'var(--navy)' : 'var(--muted)',
                  }}>
                    {c.label}
                    {c.required && <span style={{ color:'var(--red)', fontSize:9 }}>*</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Reconciliation notice */}
            {currentModule.reconcileWith && (
              <div style={{ padding:'10px 14px', background:'#F4ECF7', border:'1px solid #D2B4DE', borderRadius:8, fontSize:11, color:'#5B2C6F', marginBottom:16 }}>
                🔗 <strong>Linked module:</strong> This data is cross-checked against <strong>{getModuleConfig(currentModule.reconcileWith.module)?.label}</strong>.
                If totals don't match within {(currentModule.reconcileWith.tolerance * 100).toFixed(0)}%, an alert will appear automatically.
              </div>
            )}

            {/* Mode selector */}
            {readyToUpload && (step === 'idle' || step === 'dragging') && (
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', alignSelf:'center' }}>Import mode:</span>
                {[['replace','🔄 Replace'], ['merge','➕ Merge']].map(([k, l]) => (
                  <button key={k} onClick={() => setMode(k)} style={{
                    padding:'6px 13px', border:'1.5px solid', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer',
                    borderColor: mode===k ? 'var(--teal)' : 'var(--border)',
                    background:  mode===k ? 'var(--teal)' : '#fff',
                    color:       mode===k ? '#fff' : 'var(--text)',
                  }}>{l}</button>
                ))}
              </div>
            )}

            {/* ── Upload zone ─────────────────────────────────── */}
            {readyToUpload && (step === 'idle' || step === 'dragging') && (
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border:`2px dashed ${zone.border}`, borderRadius:10, background: zone.bg,
                  padding:'36px 24px', textAlign:'center', cursor:'pointer', transition:'all .2s',
                }}
              >
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }} onChange={onFileChange} />
                <div style={{ fontSize:36, marginBottom:10 }}>{step === 'dragging' ? '📂' : '⬆️'}</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--navy)', marginBottom:4 }}>
                  {step === 'dragging' ? 'Drop your file here' : 'Click to upload or drag & drop'}
                </div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>Supports <strong>.csv</strong> and <strong>.xlsx</strong> files</div>
              </div>
            )}

            {!readyToUpload && currentModule && (step === 'idle' || step === 'dragging') && (
              <div style={{ border:'2px dashed var(--border)', borderRadius:10, padding:'36px 24px', textAlign:'center', opacity:0.5 }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🔒</div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--muted)' }}>Complete the selections above to unlock upload</div>
              </div>
            )}

            {/* ── Parsing / Importing spinners ─────────────────── */}
            {step === 'parsing' && (
              <div style={{ textAlign:'center', padding:'48px 24px' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)' }}>Parsing {fileName}…</div>
              </div>
            )}
            {step === 'importing' && (
              <div style={{ textAlign:'center', padding:'48px 24px' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)' }}>Importing {validRows.length} rows & running reconciliation…</div>
              </div>
            )}

            {/* ── Error state ──────────────────────────────────── */}
            {step === 'error' && (
              <div style={{ background:'#FEECEC', border:'1px solid #F1948A', borderRadius:10, padding:'20px 24px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--red)', marginBottom:8 }}>✗ Could not parse file</div>
                <div style={{ fontSize:12, color:'var(--red)' }}>{errorMsg}</div>
                <button onClick={reset} style={{ marginTop:14, padding:'7px 16px', background:'var(--red)', color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  ↩ Try Again
                </button>
              </div>
            )}

            {/* ── Preview state ────────────────────────────────── */}
            {step === 'preview' && (
              <div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
                  {summary.map((s, i) => (
                    <div key={i} style={{
                      padding:'9px 14px', borderRadius:8, fontSize:12, fontWeight:600,
                      background: s.type==='success' ? '#E8F8F5' : s.type==='error' ? '#FEECEC' : '#FFF9E6',
                      border: `1px solid ${s.type==='success' ? 'var(--teal)' : s.type==='error' ? '#F1948A' : '#F4D03F'}`,
                      color: s.type==='success' ? 'var(--teal)' : s.type==='error' ? 'var(--red)' : '#856404',
                    }}>{s.msg}</div>
                  ))}
                </div>

                {validRows.length > 0 && (
                  <div className={tableStyles.tableBox} style={{ marginBottom:14 }}>
                    <div className={tableStyles.tableTitle}>
                      Preview — first {Math.min(5, validRows.length)} of {validRows.length} valid rows
                      {needsMonth && <span style={{ fontWeight:400, color:'var(--muted)' }}> · {MONTH_OPTIONS.find(m=>m.value===selMonth)?.label}</span>}
                      {selDept && <span style={{ fontWeight:400, color:'var(--muted)' }}> · {selDept}</span>}
                    </div>
                    <div style={{ overflowX:'auto' }}>
                      <table className={tableStyles.table} style={{ minWidth:500 }}>
                        <thead>
                          <tr>{currentModule.columns.filter(c => mapping[c.key]).map(c => <th key={c.key}>{c.label}</th>)}</tr>
                        </thead>
                        <tbody>
                          {validRows.slice(0, 5).map((row, ri) => (
                            <tr key={ri}>
                              {currentModule.columns.filter(c => mapping[c.key]).map(c => (
                                <td key={c.key} style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                  {row[c.key] == null ? <span style={{ color:'var(--muted)', fontStyle:'italic' }}>—</span> : String(row[c.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {errorRows.length > 0 && (
                  <div style={{ marginBottom:14 }}>
                    <button onClick={() => setShowErrors(s => !s)} style={{ fontSize:11, fontWeight:600, color:'var(--red)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                      {showErrors ? '▲ Hide' : '▼ Show'} {errorRows.length} error row{errorRows.length !== 1 ? 's' : ''}
                    </button>
                    {showErrors && (
                      <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:4 }}>
                        {errorRows.slice(0, 10).map((e, i) => (
                          <div key={i} style={{ background:'#FEECEC', border:'1px solid #F1948A', borderRadius:7, padding:'8px 12px', fontSize:11 }}>
                            <strong>Row {e.row}:</strong> {e.errors.join(' · ')}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {validRows.length > 0 && missing.length === 0 && (
                    <button onClick={confirmImport} style={{ padding:'10px 24px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      ✓ Import {validRows.length} Row{validRows.length !== 1 ? 's' : ''}
                    </button>
                  )}
                  <button onClick={reset} style={{ padding:'10px 18px', background:'var(--bg)', color:'var(--text)', border:'1.5px solid var(--border)', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    ↩ Start Over
                  </button>
                </div>
              </div>
            )}

            {/* ── Done state ───────────────────────────────────── */}
            {step === 'done' && importResult && (
              <div style={{ background:'#E8F8F5', border:'1px solid var(--teal)', borderRadius:10, padding:'24px' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>🎉</div>
                <div style={{ fontSize:15, fontWeight:800, color:'var(--teal)', marginBottom:4 }}>Import Successful!</div>
                <div style={{ fontSize:12, color:'var(--text)', marginBottom:8 }}>
                  <strong>{validRows.length}</strong> rows imported into <strong>{currentModule.label}</strong>
                  {needsMonth && <> for <strong>{MONTH_OPTIONS.find(m=>m.value===selMonth)?.label}</strong></>}
                  {selDept && <> / <strong>{selDept}</strong></>}.
                </div>

                {/* Reconciliation result */}
                {reconResult && (
                  reconResult.length > 0 ? (
                    <div style={{ background:'#FFF9E6', border:'1px solid #F4D03F', borderRadius:8, padding:'12px 14px', marginTop:10, marginBottom:14 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#856404', marginBottom:4 }}>
                        ⚠ {reconResult.length} reconciliation alert{reconResult.length !== 1 ? 's' : ''} triggered
                      </div>
                      <div style={{ fontSize:11, color:'#856404' }}>
                        This data doesn't fully match its linked module. Check the Exec Alerts page or the banner on relevant department pages.
                      </div>
                    </div>
                  ) : (
                    <div style={{ background:'#E8F8F5', border:'1px solid var(--teal)', borderRadius:8, padding:'10px 14px', marginTop:10, marginBottom:14, fontSize:11, color:'var(--teal)', fontWeight:600 }}>
                      ✓ Reconciliation check passed — no mismatches found.
                    </div>
                  )
                )}

                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={reset} style={{ padding:'8px 16px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    ↩ Import More
                  </button>
                  <button onClick={() => { reset(); setActiveModule(null); }} style={{ padding:'8px 16px', background:'var(--bg)', color:'var(--text)', border:'1.5px solid var(--border)', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Clear data button (shown once data exists for current selection) */}
            {currentDataCount > 0 && step === 'idle' && (
              <div style={{ marginTop:14, textAlign:'right' }}>
                <button onClick={clearModuleData} style={{ fontSize:10, color:'var(--red)', background:'none', border:'none', cursor:'pointer' }}>
                  🗑 Clear data for this selection
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        !compact && (
          <div style={{ background:'var(--card)', borderRadius:12, border:'2px dashed var(--border)', padding:'48px 24px', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📂</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--navy)', marginBottom:6 }}>Select a module above to begin importing</div>
            <div style={{ fontSize:11, color:'var(--muted)', maxWidth:420, margin:'0 auto', lineHeight:1.7 }}>
              📅 = requires a month selection &nbsp;&nbsp; 🏥 = requires a department selection
            </div>
            <button onClick={() => downloadAllTemplates(modules)} style={{ marginTop:16, padding:'9px 20px', background:'var(--navy)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
              ⬇ Download All Templates (Excel)
            </button>
          </div>
        )
      )}

      {/* ── Import history ───────────────────────────────────── */}
      {!compact && history.length > 0 && (
        <div style={{ marginTop:20 }}>
          <button onClick={() => setShowHistory(s => !s)} style={{ fontSize:11, fontWeight:700, color:'var(--navy)', background:'none', border:'none', cursor:'pointer', padding:0, marginBottom:10 }}>
            {showHistory ? '▲ Hide' : '▼ Show'} Import History ({history.length})
          </button>
          {showHistory && (
            <div className={tableStyles.tableBox}>
              <table className={tableStyles.table}>
                <thead><tr><th>Module</th><th>Month</th><th>Department</th><th>Rows</th><th>Mode</th><th>Timestamp</th></tr></thead>
                <tbody>
                  {history.slice(0, 20).map((h, i) => {
                    const mod = IMPORT_MODULES.find(m => m.storageKey === h.module);
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight:600 }}>{mod ? `${mod.icon} ${mod.label}` : h.module}</td>
                        <td>{h.month || '—'}</td>
                        <td>{h.department || '—'}</td>
                        <td>{h.count}</td>
                        <td><span className={`${tableStyles.badge} ${h.mode === 'replace' ? tableStyles.blue : tableStyles.green}`}>{h.mode}</span></td>
                        <td style={{ fontSize:10, color:'var(--muted)' }}>{new Date(h.ts).toLocaleString('en-GB')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}