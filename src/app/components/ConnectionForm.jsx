'use client';
 
import { useState } from 'react';
import { testSheetConnection, extractSheetId, parsePeriodFromString } from '../dashboard/lib/googleSheets';
import { getApiKey } from '../dashboard/lib/useConfig';
 
const iStyle = {
    width: '100%', padding: '8px 10px',
    border: '1.5px solid var(--border)', borderRadius: 7,
    fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#fff',
};
 
const PAGES = ['inventory','pharmacy','store','overview','revenue','cashbook',
               'expenses','grn','supplychain','debtors','assets','kpi','weekly'];
 
// Common field names — left side suggestions
const FIELD_SUGGESTIONS = [
    'date','name','qty','total','dept','vendor','itemCode','unitCost','unitPrice',
    'uom','invoiceRef','recipient','description','status','category','value',
    'openingQty','closingBalance','totalReceipts','totalIssues','reorder',
    'reorderQty','totalValue','classification','pctOfTotal','poNo','grnNo',
];
 
function Field({ label, children, span }) {
    return (
        <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--navy)',
                marginBottom:5, textTransform:'uppercase', letterSpacing:0.4 }}>
                {label}
            </label>
            {children}
        </div>
    );
}
 
// ─── Column Map Builder ───────────────────────────────────────
// Each row: { ourField: string, theirHeader: string }
// Converts to/from { ourField: 'theirHeader' } JSON
 
function ColumnMapBuilder({ pairs, onChange, sheetHeaders }) {
    function updatePair(idx, key, value) {
        const next = pairs.map((p, i) => i === idx ? { ...p, [key]: value } : p);
        onChange(next);
    }
 
    function addPair() {
        onChange([...pairs, { ourField: '', theirHeader: '' }]);
    }
 
    function removePair(idx) {
        onChange(pairs.filter((_, i) => i !== idx));
    }
 
    return (
        <div>
            {/* Header labels */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 32px', gap:8, marginBottom:6 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', letterSpacing:0.4 }}>
                    Our field name
                    <span style={{ fontWeight:400, color:'var(--muted)', marginLeft:4 }}>(what pages use)</span>
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', letterSpacing:0.4 }}>
                    Their column header
                    <span style={{ fontWeight:400, color:'var(--muted)', marginLeft:4 }}>(exact text in their sheet)</span>
                </div>
                <div />
            </div>
 
            {pairs.map((pair, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 32px', gap:8, marginBottom:6, alignItems:'center' }}>
                    {/* Our field — datalist for suggestions */}
                    <div>
                        <input
                            list={`field-suggestions-${i}`}
                            value={pair.ourField}
                            onChange={e => updatePair(i, 'ourField', e.target.value)}
                            placeholder="e.g. qty"
                            style={iStyle}
                        />
                        <datalist id={`field-suggestions-${i}`}>
                            {FIELD_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                        </datalist>
                    </div>
 
                    {/* Their header — datalist from sheet if tested */}
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ color:'var(--muted)', fontSize:14, flexShrink:0 }}>↔</span>
                        <input
                            list={`sheet-headers-${i}`}
                            value={pair.theirHeader}
                            onChange={e => updatePair(i, 'theirHeader', e.target.value)}
                            placeholder="e.g. Qty Issued"
                            style={iStyle}
                        />
                        {sheetHeaders.length > 0 && (
                            <datalist id={`sheet-headers-${i}`}>
                                {sheetHeaders.map(h => <option key={h} value={h} />)}
                            </datalist>
                        )}
                    </div>
 
                    <button onClick={() => removePair(i)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', fontSize:16, fontWeight:700, padding:0 }}>
                        ✕
                    </button>
                </div>
            ))}
 
            <button onClick={addPair} style={{
                marginTop:4, padding:'6px 14px', background:'transparent',
                border:'1.5px dashed var(--border)', borderRadius:7,
                fontSize:11, fontWeight:600, cursor:'pointer', color:'var(--muted)', width:'100%',
            }}>
                + Add field mapping
            </button>
 
            {sheetHeaders.length > 0 && (
                <div style={{ marginTop:10, padding:'10px 12px', background:'#F4F6F9', borderRadius:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)', marginBottom:6 }}>
                        Columns found in sheet — click to add:
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {sheetHeaders
                            .filter(h => !pairs.find(p => p.theirHeader === h))
                            .map(h => (
                                <button key={h} onClick={() => onChange([...pairs, { ourField:'', theirHeader:h }])}
                                    style={{ padding:'2px 10px', background:'#fff', border:'1px solid var(--border)',
                                        borderRadius:99, fontSize:10, cursor:'pointer', color:'var(--navy)', fontWeight:600 }}>
                                    + {h}
                                </button>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
    );
}
 
// ─── Helpers ──────────────────────────────────────────────────
 
function pairsToMap(pairs) {
    const map = {};
    pairs.forEach(({ ourField, theirHeader }) => {
        if (ourField.trim() && theirHeader.trim()) {
            map[ourField.trim()] = theirHeader.trim();
        }
    });
    return map;
}
 
function mapToPairs(map) {
    return Object.entries(map || {}).map(([ourField, theirHeader]) => ({ ourField, theirHeader }));
}
 
// ─── Main form ────────────────────────────────────────────────
 
export default function ConnectionForm({ initial, onSave, onCancel, saving }) {
    const isEditing = !!initial?.id;
 
    const [form, setForm] = useState({
        id:             initial?.id             || `conn-${Date.now()}`,
        label:          initial?.label          || '',
        dept:           initial?.dept           || '',
        module:         initial?.module         || '',
        sheetId:        initial?.sheetId        || '',
        range:          initial?.range          || 'A:Z',
        headerRow:      initial?.headerRow      || 1,
        periodSource:   initial?.periodSource   || 'dateColumn',
        tabMode:        initial?.tabMode        || 'single',
        tabName:        initial?.tabName        || '',
        tabs:           initial?.tabs           || [],
        visualizations: initial?.visualizations || [],
        feeds:          initial?.feeds          || [{ page:'', section:'', requiredFields:[] }],
    });
 
    const [colPairs,   setColPairs]   = useState(mapToPairs(initial?.columnMap || {}));
    const [testResult, setTestResult] = useState(null);
    const [testing,    setTesting]    = useState(false);
    const [sheetTabs,  setSheetTabs]  = useState([]);
    const [sheetHeaders, setSheetHeaders] = useState([]); // from first tab fetch
    const [errors,     setErrors]     = useState({});
    const [newTabName, setNewTabName] = useState('');
    const [newTabKey,  setNewTabKey]  = useState('');
 
    function setField(key, value) { setForm(f => ({ ...f, [key]: value })); }
 
    // ── Test sheet ─────────────────────────────────────────────
    async function handleTest() {
        const id = extractSheetId(form.sheetId) || form.sheetId.trim();
        if (!id) { setTestResult({ ok:false, error:'Enter a Sheet ID or URL first.' }); return; }
 
        setTesting(true); setTestResult(null);
        // testSheetConnection now routes through /api/sheets/fetch (service account)
        const r = await testSheetConnection(id, null);
        setTestResult(r);
 
        if (r.ok) {
            setSheetTabs(r.tabs || []);
            if (r.tabs?.length === 1 && !form.tabName) setField('tabName', r.tabs[0]);
 
            // Fetch headers from first tab to help column mapping
            if (r.tabs?.length > 0) {
                const firstTab = r.tabs[0];
                try {
                    // Route through our server so service account auth is used
                    const res = await fetch('/api/sheets/fetch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sheetId: id, tabName: firstTab, range: 'A1:Z1' }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const headers = (data.values?.[0] || []).map(h => String(h).trim()).filter(Boolean);
                        setSheetHeaders(headers);
                        // Pre-populate column pairs if empty
                        if (colPairs.length === 0 && headers.length > 0) {
                            setColPairs(headers.map(h => ({ ourField:'', theirHeader:h })));
                        }
                    }
                } catch {}
            }
        }
        setTesting(false);
    }
 
    // ── Multi tab management ───────────────────────────────────
    function addTab() {
        if (!newTabName.trim()) return;
        const key = newTabKey.trim() || parsePeriodFromString(newTabName) || newTabName;
        setForm(f => ({ ...f, tabs:[...f.tabs, { name:newTabName.trim(), key }] }));
        setNewTabName(''); setNewTabKey('');
    }
 
    function removeTab(idx) { setForm(f => ({ ...f, tabs:f.tabs.filter((_,i)=>i!==idx) })); }
 
    function moveTab(idx, dir) {
        setForm(f => {
            const tabs = [...f.tabs]; const to = idx+dir;
            if (to < 0 || to >= tabs.length) return f;
            [tabs[idx],tabs[to]] = [tabs[to],tabs[idx]];
            return { ...f, tabs };
        });
    }
 
    // ── Save ───────────────────────────────────────────────────
    async function handleSave() {
        const errs = {};
        if (!form.id.trim())      errs.id      = 'Required';
        if (!form.module.trim())  errs.module  = 'Required';
        if (!form.sheetId.trim()) errs.sheetId = 'Required';
        if (form.tabMode === 'single' && !form.tabName.trim()) errs.tabName = 'Required';
        if (form.tabMode === 'multi'  && form.tabs.length === 0) errs.tabs  = 'Add at least one tab';
 
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
 
        await onSave({ ...form, columnMap: pairsToMap(colPairs) });
    }
 
    return (
        <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="ID (unique slug, no spaces)">
                    <input value={form.id} onChange={e=>setField('id',e.target.value)}
                        placeholder="store-siv-issues"
                        style={{ ...iStyle, borderColor:errors.id?'var(--red)':undefined }}
                        disabled={isEditing} />
                    {errors.id && <div style={{ fontSize:10,color:'var(--red)',marginTop:3 }}>{errors.id}</div>}
                </Field>
 
                <Field label="Label">
                    <input value={form.label} onChange={e=>setField('label',e.target.value)}
                        placeholder="SIV Issues" style={iStyle} />
                </Field>
 
                <Field label="Department">
                    <input value={form.dept} onChange={e=>setField('dept',e.target.value)}
                        placeholder="Store" style={iStyle} />
                </Field>
 
                <Field label="Module key">
                    <input value={form.module} onChange={e=>setField('module',e.target.value)}
                        placeholder="stock_out"
                        style={{ ...iStyle, borderColor:errors.module?'var(--red)':undefined }} />
                    {errors.module && <div style={{ fontSize:10,color:'var(--red)',marginTop:3 }}>{errors.module}</div>}
                </Field>
 
                <Field label="Page this feeds" span>
                    <select value={form.feeds?.[0]?.page||''}
                        onChange={e=>setForm(f=>({...f,feeds:[{...f.feeds?.[0],page:e.target.value}]}))}
                        style={iStyle}>
                        <option value="">Select page…</option>
                        {PAGES.map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                </Field>
 
                {/* Sheet URL */}
                <Field label="Google Sheet URL or ID" span>
                    <div style={{ display:'flex', gap:8 }}>
                        <input value={form.sheetId} onChange={e=>setField('sheetId',e.target.value)}
                            placeholder="Paste the full Google Sheets URL here"
                            style={{ ...iStyle, flex:1, borderColor:errors.sheetId?'var(--red)':undefined }} />
                        <button onClick={handleTest} disabled={testing}
                            style={{ padding:'8px 14px', background:'var(--navy)', color:'#fff', border:'none',
                                borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                            {testing ? '⏳' : '🔌 Test & Load'}
                        </button>
                    </div>
                    {errors.sheetId && <div style={{ fontSize:10,color:'var(--red)',marginTop:3 }}>{errors.sheetId}</div>}
                    {testResult && (
                        <div style={{ marginTop:8, padding:'10px 12px', borderRadius:7, fontSize:11,
                            background:testResult.ok?'#E8F8F5':'#FEECEC',
                            border:`1px solid ${testResult.ok?'#A9DFBF':'#F1948A'}`,
                            color:testResult.ok?'var(--teal)':'var(--red)' }}>
                            {testResult.ok ? (
                                <>
                                    ✓ Connected — <strong>{testResult.sheetTitle}</strong>
                                    <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:4 }}>
                                        {testResult.tabs?.map(t=>(
                                            <span key={t}
                                                onClick={()=>form.tabMode==='single'&&setField('tabName',t)}
                                                style={{ padding:'2px 8px', background:'#D5F5E3', borderRadius:99,
                                                    fontSize:10, fontWeight:600,
                                                    cursor:form.tabMode==='single'?'pointer':'default' }}>
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                    {sheetHeaders.length > 0 && (
                                        <div style={{ marginTop:6, fontSize:10, color:'var(--muted)' }}>
                                            Columns found: {sheetHeaders.join(', ')}
                                        </div>
                                    )}
                                </>
                            ) : `✗ ${testResult.error}`}
                        </div>
                    )}
                </Field>
 
                <Field label="Range">
                    <input value={form.range} onChange={e=>setField('range',e.target.value)}
                        placeholder="A:Z" style={iStyle} />
                </Field>
 
                <Field label="Header Row Number">
                    <input type="number" value={form.headerRow}
                        onChange={e=>setField('headerRow',+e.target.value)} style={iStyle} />
                </Field>
            </div>
 
            {/* ── Tab mode ───────────────────────────────────── */}
            <div style={{ margin:'20px 0 0', padding:'16px 20px', background:'#F4F6F9', borderRadius:10, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)', marginBottom:12 }}>
                    📑 Which tabs should we fetch from?
                </div>
 
                <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                    {[
                        { value:'single', icon:'1️⃣', label:'One tab',        desc:'All data is in one sheet tab'              },
                        { value:'multi',  icon:'📅', label:'Multiple tabs',  desc:'Data is split by month/period across tabs' },
                        { value:'auto',   icon:'🔄', label:'All tabs',       desc:'Fetch and merge every tab automatically'   },
                    ].map(opt=>(
                        <div key={opt.value} onClick={()=>setField('tabMode',opt.value)} style={{
                            flex:1, padding:'12px 14px', borderRadius:8, cursor:'pointer',
                            border:`2px solid ${form.tabMode===opt.value?'var(--teal)':'var(--border)'}`,
                            background:form.tabMode===opt.value?'#E8F8F5':'#fff',
                        }}>
                            <div style={{ fontSize:18, marginBottom:4 }}>{opt.icon}</div>
                            <div style={{ fontSize:11, fontWeight:700, color:'var(--navy)' }}>{opt.label}</div>
                            <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{opt.desc}</div>
                        </div>
                    ))}
                </div>
 
                {/* Single */}
                {form.tabMode==='single' && (
                    <div>
                        <label style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', display:'block', marginBottom:5 }}>
                            Tab Name (exact)
                        </label>
                        <input value={form.tabName} onChange={e=>setField('tabName',e.target.value)}
                            list="sheet-tabs-single"
                            placeholder="e.g. SIV Issues — or click a tab from the test result above"
                            style={{ ...iStyle, borderColor:errors.tabName?'var(--red)':undefined }} />
                        <datalist id="sheet-tabs-single">
                            {sheetTabs.map(t=><option key={t} value={t} />)}
                        </datalist>
                        {errors.tabName && <div style={{ fontSize:10,color:'var(--red)',marginTop:3 }}>{errors.tabName}</div>}
                        <div style={{ fontSize:10, color:'var(--muted)', marginTop:8 }}>
                            Period source:
                            <select value={form.periodSource} onChange={e=>setField('periodSource',e.target.value)}
                                style={{ marginLeft:8, fontSize:10, border:'1px solid var(--border)', borderRadius:5, padding:'2px 6px' }}>
                                <option value="dateColumn">There is a date column in the data</option>
                                <option value="tabName">Parse the period from the tab name</option>
                            </select>
                        </div>
                    </div>
                )}
 
                {/* Multi */}
                {form.tabMode==='multi' && (
                    <div>
                        <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)', textTransform:'uppercase', marginBottom:8 }}>
                            Tabs to fetch
                        </div>
                        {errors.tabs && <div style={{ fontSize:10,color:'var(--red)',marginBottom:8 }}>{errors.tabs}</div>}
 
                        {form.tabs.map((tab,i)=>(
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
                                background:'#fff', border:'1px solid var(--border)', borderRadius:6, marginBottom:4 }}>
                                <span style={{ fontSize:10,color:'var(--muted)',width:20,textAlign:'center' }}>{i+1}</span>
                                <div style={{ flex:1 }}>
                                    <span style={{ fontSize:11,fontWeight:600 }}>{tab.name}</span>
                                    <span style={{ fontSize:10,color:'var(--muted)',marginLeft:8 }}>
                                        key: <code style={{ background:'#f0f2f5',padding:'1px 5px',borderRadius:4 }}>{tab.key}</code>
                                    </span>
                                </div>
                                <button onClick={()=>moveTab(i,-1)} disabled={i===0}
                                    style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:12 }}>↑</button>
                                <button onClick={()=>moveTab(i,1)} disabled={i===form.tabs.length-1}
                                    style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:12 }}>↓</button>
                                <button onClick={()=>removeTab(i)}
                                    style={{ background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:14 }}>✕</button>
                            </div>
                        ))}
 
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, alignItems:'end', marginTop:8 }}>
                            <div>
                                <label style={{ fontSize:10,color:'var(--muted)',display:'block',marginBottom:3 }}>Tab name (exact)</label>
                                <input list="multi-tab-suggestions" value={newTabName}
                                    onChange={e=>{
                                        setNewTabName(e.target.value);
                                        if(!newTabKey) setNewTabKey(parsePeriodFromString(e.target.value)||'');
                                    }}
                                    placeholder="January"
                                    style={iStyle} onKeyDown={e=>e.key==='Enter'&&addTab()} />
                                <datalist id="multi-tab-suggestions">
                                    {sheetTabs.filter(t=>!form.tabs.find(ft=>ft.name===t)).map(t=><option key={t} value={t}/>)}
                                </datalist>
                            </div>
                            <div>
                                <label style={{ fontSize:10,color:'var(--muted)',display:'block',marginBottom:3 }}>
                                    Key <span style={{ opacity:0.7 }}>(auto from name)</span>
                                </label>
                                <input value={newTabKey} onChange={e=>setNewTabKey(e.target.value)}
                                    placeholder="2026-01" style={iStyle} />
                            </div>
                            <button onClick={addTab}
                                style={{ padding:'8px 14px',background:'var(--teal)',color:'#fff',border:'none',
                                    borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap' }}>
                                + Add
                            </button>
                        </div>
 
                        {/* Quick-add discovered tabs */}
                        {sheetTabs.filter(t=>!form.tabs.find(ft=>ft.name===t)).length>0 && (
                            <div style={{ marginTop:12 }}>
                                <div style={{ fontSize:10,color:'var(--muted)',marginBottom:6 }}>Quick add from sheet:</div>
                                <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                                    {sheetTabs.filter(t=>!form.tabs.find(ft=>ft.name===t)).map(t=>(
                                        <button key={t} onClick={()=>{
                                            const key=parsePeriodFromString(t)||t;
                                            setForm(f=>({...f,tabs:[...f.tabs,{name:t,key}]}));
                                        }} style={{ padding:'3px 10px',background:'#E8F8F5',border:'1px solid #A9DFBF',
                                            borderRadius:99,fontSize:10,fontWeight:600,cursor:'pointer',color:'var(--teal)' }}>
                                            + {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
 
                {/* Auto */}
                {form.tabMode==='auto' && (
                    <div style={{ padding:'12px 16px',background:'#EBF5FB',borderRadius:8,fontSize:11,color:'var(--navy)',lineHeight:1.8 }}>
                        <strong>All tabs will be fetched and merged automatically.</strong><br/>
                        Period keys are parsed from tab names — "January" → "2026-01", "Feb 25" → "2025-02".<br/>
                        If a tab name can't be parsed as a date, the raw tab name is used as the key.
                    </div>
                )}
            </div>
 
            {/* ── Column mapping ─────────────────────────────── */}
            <div style={{ margin:'20px 0' }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--navy)',marginBottom:4 }}>🗂 Column Mapping</div>
                <div style={{ fontSize:11,color:'var(--muted)',marginBottom:12,lineHeight:1.6 }}>
                    Map the column headers in their Google Sheet to the field names our system uses.
                    {sheetHeaders.length>0
                        ? ' Column headers from their sheet are available in the dropdowns on the right.'
                        : ' Click "Test & Load" above to auto-detect their column headers.'}
                </div>
                <ColumnMapBuilder
                    pairs={colPairs}
                    onChange={setColPairs}
                    sheetHeaders={sheetHeaders}
                />
            </div>
 
            {/* ── Actions ────────────────────────────────────── */}
            <div style={{ display:'flex',justifyContent:'flex-end',gap:10,paddingTop:16,borderTop:'1px solid var(--border)' }}>
                <button onClick={onCancel}
                    style={{ padding:'8px 18px',background:'transparent',border:'1.5px solid var(--border)',borderRadius:8,fontSize:12,cursor:'pointer' }}>
                    Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                    style={{ padding:'8px 20px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer' }}>
                    {saving?'⏳ Saving…':'💾 Save Connection'}
                </button>
            </div>
        </div>
    );
}