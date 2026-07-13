'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useConfig, getApiKey, saveApiKey } from '../lib/useConfig';
import { testSheetConnection, extractSheetId } from '../lib/GoogleSheets';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';

// ─── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { key: 'sheets',  label: '🔗 Google Sheets'   },
  { key: 'profile', label: '🏥 Hospital Profile' },
  { key: 'pins',    label: '🔐 PINs & Roles'     },
];

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 18px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap', background: 'transparent', border: 'none', fontFamily: 'inherit',
      borderBottom: `2px solid ${active ? 'var(--teal)' : 'transparent'}`,
      color: active ? 'var(--teal)' : 'var(--muted)', marginBottom: -2,
    }}>{children}</button>
  );
}

// ─── VIZ type options ─────────────────────────────────────────
const VIZ_TYPES = [
  { value: 'kpi',   label: '🔢 KPI Card'    },
  { value: 'bar',   label: '📊 Bar Chart'   },
  { value: 'pie',   label: '🥧 Pie Chart'   },
  { value: 'table', label: '📋 Table'       },
  { value: 'line',  label: '📈 Line Chart'  },
];

const AGG_TYPES = ['sum','count','avg','max','min','latest'];
const FORMATS   = ['currency','number','percent','text'];
const COLORS_   = ['blue','green','red','amber','purple','navy'];
const PAGES     = ['inventory','pharmacy','store','overview','revenue','cashbook','expenses','grn','supplychain','debtors','assets','kpi','weekly'];

// ─── Empty connection template ────────────────────────────────
const EMPTY_CONN = {
  id: '', dept: '', module: '', label: '',
  sheetId: '', tabName: '', range: 'A:Z', headerRow: 1,
  periodSource: 'dateColumn',
  columnMap: {}, visualizations: [],
  feeds: [{ page: '', section: '', requiredFields: [] }],
};

const EMPTY_VIZ = {
  id: '', type: 'kpi', label: '', title: '',
  field: '', agg: 'sum', format: 'currency', color: 'blue',
  xField: '', yField: '', catField: '', valField: '',
  limit: 10, sort: 'desc', orientation: 'horizontal',
  targetLine: null,
};

// ─── Main page ────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab,       setTab]       = useState('sheets');
  const [apiKey,    setApiKey_]   = useState('');
  const [keySaved,  setKeySaved]  = useState(false);
  const [testUrl,   setTestUrl]   = useState('');
  const [testResult,setTestResult]= useState(null);
  const [testing,   setTesting]   = useState(false);

  // Connection form state
  const [showConnForm, setShowConnForm] = useState(false);
  const [editingConn,  setEditingConn]  = useState(null); // null = add new
  const [connForm,     setConnForm]     = useState(EMPTY_CONN);
  const [colMapRaw,    setColMapRaw]    = useState(''); // raw JSON string for columnMap

  // Viz form state
  const [vizTarget,   setVizTarget]   = useState(null); // connectionId
  const [vizForm,     setVizForm]     = useState(EMPTY_VIZ);
  const [editingViz,  setEditingViz]  = useState(null); // null = add new

  const {
    connections, loading, error,
    saving, saveError,
    reload, mutations,
  } = useConfig();

  useEffect(() => { setApiKey_(getApiKey()); }, []);

  // ── API key ────────────────────────────────────────────────
  function handleSaveKey() {
    saveApiKey(apiKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  }

  // ── Test connection ────────────────────────────────────────
  async function handleTest() {
    const id = extractSheetId(testUrl) || testUrl.trim();
    if (!id)     { setTestResult({ ok: false, error: 'Paste a Google Sheet URL above.' }); return; }
    if (!apiKey) { setTestResult({ ok: false, error: 'Save your API key first.' });         return; }
    setTesting(true); setTestResult(null);
    const r = await testSheetConnection(id, apiKey);
    setTestResult(r);
    setTesting(false);
  }

  // ── Connection form handlers ───────────────────────────────
  function openAddConn() {
    setEditingConn(null);
    setConnForm({ ...EMPTY_CONN, id: `conn-${Date.now()}` });
    setColMapRaw('{}');
    setShowConnForm(true);
  }

  function openEditConn(conn) {
    setEditingConn(conn.id);
    setConnForm({ ...conn });
    setColMapRaw(JSON.stringify(conn.columnMap || {}, null, 2));
    setShowConnForm(true);
  }

  async function handleSaveConn() {
    let columnMap = {};
    try { columnMap = JSON.parse(colMapRaw); } catch { alert('Column map is not valid JSON.'); return; }
    const payload = { ...connForm, columnMap };

    if (editingConn) {
      await mutations.updateConnection(editingConn, payload);
    } else {
      await mutations.addConnection(payload);
    }
    setShowConnForm(false);
  }

  async function handleDeleteConn(id) {
    if (!confirm('Delete this connection? This cannot be undone.')) return;
    await mutations.deleteConnection(id);
  }

  // ── Viz form handlers ──────────────────────────────────────
  function openAddViz(connectionId) {
    setVizTarget(connectionId);
    setEditingViz(null);
    setVizForm({ ...EMPTY_VIZ, id: `viz-${Date.now()}` });
  }

  function openEditViz(connectionId, viz) {
    setVizTarget(connectionId);
    setEditingViz(viz.id);
    setVizForm({ ...EMPTY_VIZ, ...viz });
  }

  async function handleSaveViz() {
    if (!vizTarget) return;
    await mutations.upsertVisualization(vizTarget, vizForm);
    setVizTarget(null);
    setEditingViz(null);
    setVizForm(EMPTY_VIZ);
  }

  async function handleDeleteViz(connectionId, vizId) {
    if (!confirm('Delete this visualization?')) return;
    await mutations.deleteVisualization(connectionId, vizId);
  }

  // ── Column map shortcut — paste sheet URL to prefill ──────
  async function prefillFromSheet() {
    const id = extractSheetId(connForm.sheetId) || connForm.sheetId;
    if (!id || !apiKey) { alert('Enter a sheet ID and save your API key first.'); return; }
    const r = await testSheetConnection(id, apiKey);
    if (!r.ok) { alert(r.error); return; }
    // Auto-fill tabName if only one tab
    if (r.tabs?.length === 1) setConnForm(f => ({ ...f, tabName: r.tabs[0] }));
    alert(`Sheet found: "${r.sheetTitle}"\nTabs: ${r.tabs?.join(', ')}\n\nCopy the exact tab name into the Tab Name field above.`);
  }

  // ── Feed rows helper ───────────────────────────────────────
  function setFeed(idx, key, value) {
    setConnForm(f => {
      const feeds = [...(f.feeds || [])];
      feeds[idx] = { ...feeds[idx], [key]: value };
      return { ...f, feeds };
    });
  }

  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>⚙ Settings</h2>
          <p className={styles.pageMeta}>Google Sheets connections · Hospital profile · Access control</p>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(t => <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</TabBtn>)}
      </div>

      {/* ══════════ GOOGLE SHEETS TAB ═══════════════════════════════ */}
      {tab === 'sheets' && (
        <>
          {/* API Key */}
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: '20px 24px', marginBottom: 16, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', marginBottom: 4 }}>🔑 Google API Key</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
              Required to read from Google Sheets. Get one free at{' '}
              <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', fontWeight: 600 }}>console.cloud.google.com</a>.
              Stored on this device only — never sent to Google Drive.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="password" value={apiKey} onChange={e => setApiKey_(e.target.value)} placeholder="AIzaSy…"
                style={{ flex: 1, padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'monospace', outline: 'none' }} />
              <button onClick={handleSaveKey}
                style={{ padding: '9px 20px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {keySaved ? '✓ Saved' : '💾 Save Key'}
              </button>
            </div>
          </div>

          {/* Test connection */}
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: '20px 24px', marginBottom: 16, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', marginBottom: 4 }}>🧪 Test a Sheet Connection</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>Paste a Google Sheet URL to check the API key works and see available tab names.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={testUrl} onChange={e => setTestUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…"
                style={{ flex: 1, padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 11, outline: 'none' }} />
              <button onClick={handleTest} disabled={testing}
                style={{ padding: '9px 18px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {testing ? '⏳ Testing…' : '🔌 Test'}
              </button>
            </div>
            {testResult && (
              <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 8, fontSize: 11, background: testResult.ok ? '#E8F8F5' : '#FEECEC', border: `1px solid ${testResult.ok ? '#A9DFBF' : '#F1948A'}`, color: testResult.ok ? 'var(--teal)' : 'var(--red)' }}>
                {testResult.ok ? (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>✓ Connected — "{testResult.sheetTitle}"</div>
                    <div>Tabs: {testResult.tabs?.map((t, i) => (
                      <span key={i} style={{ display: 'inline-block', margin: '2px 4px', padding: '1px 8px', background: '#D5F5E3', borderRadius: 99, fontWeight: 600, fontSize: 10 }}>{t}</span>
                    ))}</div>
                    <div style={{ marginTop: 6, color: 'var(--muted)' }}>Use these exact tab names in your connection config below.</div>
                  </>
                ) : <span>✗ {testResult.error}</span>}
              </div>
            )}
          </div>

          {/* Connections list */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>
              Connected Sheets
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>
                {loading ? 'Loading…' : `${connections.length} connection${connections.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            <button onClick={openAddConn}
              style={{ padding: '7px 16px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              + Add Connection
            </button>
          </div>

          {saveError && (
            <div style={{ background: '#FEECEC', border: '1px solid #F1948A', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--red)', marginBottom: 12 }}>
              ✗ {saveError}
            </div>
          )}

          {error && (
            <div style={{ background: '#FEECEC', border: '1px solid #F1948A', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--red)', marginBottom: 12 }}>
              Failed to load connections from Google Drive: {error}
              <button onClick={reload} style={{ marginLeft: 10, fontSize: 10, color: 'var(--navy)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
            </div>
          )}

          {/* Group by dept */}
          {!loading && connections.length === 0 && (
            <div style={{ background: '#F4F6F9', border: '1px solid var(--border)', borderRadius: 10, padding: '28px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
              No connections yet. Click <strong>+ Add Connection</strong> to link a department's Google Sheet.
            </div>
          )}

          {(() => {
            const groups = {};
            connections.forEach(c => {
              const d = c.dept || 'Uncategorised';
              if (!groups[d]) groups[d] = [];
              groups[d].push(c);
            });
            return Object.entries(groups).map(([dept, conns]) => (
              <div key={dept} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  🏥 {dept}
                </div>
                {conns.map(conn => (
                  <ConnectionCard
                    key={conn.id}
                    conn={conn}
                    onEdit={() => openEditConn(conn)}
                    onDelete={() => handleDeleteConn(conn.id)}
                    onAddViz={() => openAddViz(conn.id)}
                    onEditViz={(viz) => openEditViz(conn.id, viz)}
                    onDeleteViz={(vizId) => handleDeleteViz(conn.id, vizId)}
                    saving={saving}
                  />
                ))}
              </div>
            ));
          })()}

          {/* ── Connection form modal ────────────────────────────── */}
          {showConnForm && (
            <Modal onClose={() => setShowConnForm(false)} title={editingConn ? 'Edit Connection' : 'Add Connection'}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="ID (unique slug, no spaces)">
                  <input value={connForm.id} onChange={e => setConnForm(f => ({ ...f, id: e.target.value }))} placeholder="store-stock-register" style={iStyle} />
                </Field>
                <Field label="Label (display name)">
                  <input value={connForm.label} onChange={e => setConnForm(f => ({ ...f, label: e.target.value }))} placeholder="Stock Register" style={iStyle} />
                </Field>
                <Field label="Department">
                  <input value={connForm.dept} onChange={e => setConnForm(f => ({ ...f, dept: e.target.value }))} placeholder="Store" style={iStyle} />
                </Field>
                <Field label="Module key">
                  <input value={connForm.module} onChange={e => setConnForm(f => ({ ...f, module: e.target.value }))} placeholder="stock_register" style={iStyle} />
                </Field>
                <Field label="Google Sheet ID">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={connForm.sheetId} onChange={e => setConnForm(f => ({ ...f, sheetId: e.target.value }))} placeholder="1BxiMVs0XRA5nF…" style={{ ...iStyle, flex: 1 }} />
                    <button onClick={prefillFromSheet} style={{ padding: '6px 10px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>Test</button>
                  </div>
                </Field>
                <Field label="Tab Name (exact)">
                  <input value={connForm.tabName} onChange={e => setConnForm(f => ({ ...f, tabName: e.target.value }))} placeholder="SRV Receipts" style={iStyle} />
                </Field>
                <Field label="Range">
                  <input value={connForm.range} onChange={e => setConnForm(f => ({ ...f, range: e.target.value }))} placeholder="A:Z" style={iStyle} />
                </Field>
                <Field label="Header Row">
                  <input type="number" value={connForm.headerRow} onChange={e => setConnForm(f => ({ ...f, headerRow: +e.target.value }))} style={iStyle} />
                </Field>
                <Field label="Period Source">
                  <select value={connForm.periodSource} onChange={e => setConnForm(f => ({ ...f, periodSource: e.target.value }))} style={iStyle}>
                    <option value="dateColumn">Date column in data</option>
                    <option value="tabName">Tab name (snapshot sheets)</option>
                    <option value="manual">Manual period</option>
                  </select>
                </Field>
                <Field label="Page (feeds)">
                  <select value={connForm.feeds?.[0]?.page || ''} onChange={e => setFeed(0, 'page', e.target.value)} style={iStyle}>
                    <option value="">Select page…</option>
                    {PAGES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Column Map (JSON — left: our field, right: their column header)">
                <textarea
                  value={colMapRaw}
                  onChange={e => setColMapRaw(e.target.value)}
                  rows={8}
                  style={{ ...iStyle, fontFamily: 'monospace', fontSize: 11, resize: 'vertical' }}
                  placeholder={'{\n  "name": "Item Description",\n  "qty": "Current Qty in Stock",\n  "unitCost": "Unit Cost",\n  "totalValue": "Total Stock Value"\n}'}
                />
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                  Left side = field names your page uses. Right side = exact column headers in their Google Sheet.
                </div>
              </Field>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setShowConnForm(false)}
                  style={{ padding: '8px 18px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleSaveConn} disabled={saving}
                  style={{ padding: '8px 20px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? '⏳ Saving…' : '💾 Save to Drive'}
                </button>
              </div>
            </Modal>
          )}

          {/* ── Viz form modal ───────────────────────────────────── */}
          {vizTarget && (
            <Modal onClose={() => { setVizTarget(null); setVizForm(EMPTY_VIZ); }} title={editingViz ? 'Edit Visualization' : 'Add Visualization'}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Type">
                  <select value={vizForm.type} onChange={e => setVizForm(f => ({ ...f, type: e.target.value }))} style={iStyle}>
                    {VIZ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label={vizForm.type === 'kpi' ? 'KPI Label' : 'Chart Title'}>
                  <input value={vizForm.type === 'kpi' ? vizForm.label : vizForm.title}
                    onChange={e => setVizForm(f => ({ ...f, [f.type === 'kpi' ? 'label' : 'title']: e.target.value }))}
                    placeholder={vizForm.type === 'kpi' ? 'Total Inventory Value' : 'Top 10 Valued Items'} style={iStyle} />
                </Field>

                {/* KPI fields */}
                {vizForm.type === 'kpi' && <>
                  <Field label="Field (column to aggregate)">
                    <input value={vizForm.field} onChange={e => setVizForm(f => ({ ...f, field: e.target.value }))} placeholder="totalValue" style={iStyle} />
                  </Field>
                  <Field label="Aggregation">
                    <select value={vizForm.agg} onChange={e => setVizForm(f => ({ ...f, agg: e.target.value }))} style={iStyle}>
                      {AGG_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </Field>
                  <Field label="Format">
                    <select value={vizForm.format} onChange={e => setVizForm(f => ({ ...f, format: e.target.value }))} style={iStyle}>
                      {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Field>
                  <Field label="Color">
                    <select value={vizForm.color} onChange={e => setVizForm(f => ({ ...f, color: e.target.value }))} style={iStyle}>
                      {COLORS_.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </>}

                {/* Bar / Line fields */}
                {(vizForm.type === 'bar' || vizForm.type === 'line') && <>
                  <Field label="X Axis Field">
                    <input value={vizForm.xField} onChange={e => setVizForm(f => ({ ...f, xField: e.target.value }))} placeholder="name" style={iStyle} />
                  </Field>
                  <Field label="Y Axis Field">
                    <input value={vizForm.yField} onChange={e => setVizForm(f => ({ ...f, yField: e.target.value }))} placeholder="totalValue" style={iStyle} />
                  </Field>
                  {vizForm.type === 'bar' && <>
                    <Field label="Orientation">
                      <select value={vizForm.orientation} onChange={e => setVizForm(f => ({ ...f, orientation: e.target.value }))} style={iStyle}>
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical</option>
                      </select>
                    </Field>
                    <Field label="Limit (top N rows)">
                      <input type="number" value={vizForm.limit} onChange={e => setVizForm(f => ({ ...f, limit: +e.target.value }))} style={iStyle} />
                    </Field>
                    <Field label="Sort">
                      <select value={vizForm.sort} onChange={e => setVizForm(f => ({ ...f, sort: e.target.value }))} style={iStyle}>
                        <option value="desc">Descending (highest first)</option>
                        <option value="asc">Ascending (lowest first)</option>
                        <option value="none">No sort</option>
                      </select>
                    </Field>
                    <Field label="Target Line (optional — enter a number or leave blank)">
                      <input value={vizForm.targetLine?.value ?? ''} onChange={e => {
                        const v = e.target.value;
                        setVizForm(f => ({ ...f, targetLine: v ? { value: +v, label: 'Target' } : null }));
                      }} placeholder="e.g. 1000000" style={iStyle} />
                    </Field>
                  </>}
                </>}

                {/* Pie fields */}
                {vizForm.type === 'pie' && <>
                  <Field label="Category Field">
                    <input value={vizForm.catField} onChange={e => setVizForm(f => ({ ...f, catField: e.target.value }))} placeholder="classification" style={iStyle} />
                  </Field>
                  <Field label="Value Field">
                    <input value={vizForm.valField} onChange={e => setVizForm(f => ({ ...f, valField: e.target.value }))} placeholder="totalValue" style={iStyle} />
                  </Field>
                </>}

                {/* Table fields */}
                {vizForm.type === 'table' && (
                  <Field label="Columns to show (comma-separated field names)">
                    <input
                      value={Array.isArray(vizForm.columns) ? vizForm.columns.join(', ') : ''}
                      onChange={e => setVizForm(f => ({ ...f, columns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                      placeholder="name, qty, unitCost, totalValue" style={iStyle} />
                  </Field>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button onClick={() => { setVizTarget(null); setVizForm(EMPTY_VIZ); }}
                  style={{ padding: '8px 18px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleSaveViz} disabled={saving}
                  style={{ padding: '8px 20px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? '⏳ Saving…' : '💾 Save Visualization'}
                </button>
              </div>
            </Modal>
          )}
        </>
      )}

      {/* ══════════ PROFILE TAB ═══════════════════════════════════ */}
      {tab === 'profile' && (
        <div className={tableStyles.tableBox}>
          <div className={tableStyles.tableTitle}>Hospital Profile</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '8px 0' }}>
            {[
              { label: 'Display Name',    placeholder: 'Redeemers Health Village'       },
              { label: 'Legal Name',      placeholder: 'RHV Hospital Ltd'               },
              { label: 'RC Number',       placeholder: 'CAC / RC No.'                   },
              { label: 'Phone',           placeholder: '+234…'                           },
              { label: 'Email',           placeholder: 'admin@rhv.com'                  },
              { label: 'Address',         placeholder: 'Lagos, Nigeria'                 },
              { label: 'Financial Year',  placeholder: 'January – December'             },
              { label: 'Currency',        placeholder: 'NGN (₦)'                       },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, textTransform: 'uppercase' }}>{f.label}</label>
                <input placeholder={f.placeholder} style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <button style={{ marginTop: 14, padding: '9px 20px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            💾 Save Profile
          </button>
        </div>
      )}

      {/* ══════════ PINS TAB ══════════════════════════════════════ */}
      {tab === 'pins' && (
        <div className={tableStyles.tableBox}>
          <div className={tableStyles.tableTitle}>Role PINs</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { role: 'Admin',    icon: '👑', desc: 'Full access'             },
              { role: 'Finance',  icon: '💰', desc: 'Revenue, cashbook, KPIs' },
              { role: 'Store',    icon: '📦', desc: 'Inventory & supply chain' },
              { role: 'Pharmacy', icon: '💊', desc: 'Pharmacy & dispensing'   },
              { role: 'Payables', icon: '💳', desc: 'Payables & vendors'      },
            ].map(item => (
              <div key={item.role} style={{ background: 'var(--bg)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)', marginBottom: 2 }}>{item.icon} {item.role}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>{item.desc}</div>
                <input type="password" maxLength={4} placeholder="••••"
                  style={{ width: 80, padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 18, letterSpacing: 6, outline: 'none', textAlign: 'center' }} />
              </div>
            ))}
          </div>
          <button style={{ marginTop: 14, padding: '9px 20px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            💾 Update PINs
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function ConnectionCard({ conn, onEdit, onDelete, onAddViz, onEditViz, onDeleteViz, saving }) {
  const [showVizs, setShowVizs] = useState(false);
  const isConnected = conn.sheetId && !conn.sheetId.includes('YOUR_');

  return (
    <div style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 10, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#117A65' : '#CA6F1E', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>{conn.label || conn.module}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            {isConnected ? `Tab: "${conn.tabName}"` : 'Sheet not connected — edit to add Sheet ID'}
            {' · '}<code style={{ fontSize: 9 }}>{conn.module}</code>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setShowVizs(s => !s)}
            style={{ padding: '4px 10px', fontSize: 10, fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--navy)' }}>
            📊 {(conn.visualizations || []).length} viz{(conn.visualizations||[]).length !== 1 ? 's' : ''}
          </button>
          <button onClick={onEdit}
            style={{ padding: '4px 10px', fontSize: 10, fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--navy)' }}>
            ✏ Edit
          </button>
          <button onClick={onDelete} disabled={saving}
            style={{ padding: '4px 10px', fontSize: 10, fontWeight: 600, background: 'transparent', border: '1px solid #F1948A', borderRadius: 6, cursor: 'pointer', color: 'var(--red)' }}>
            🗑
          </button>
        </div>
      </div>

      {showVizs && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: '#fafcff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>Visualizations</span>
            <button onClick={onAddViz}
              style={{ padding: '4px 12px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
              + Add
            </button>
          </div>
          {(conn.visualizations || []).length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>No visualizations yet. Click + Add to configure charts for this sheet.</div>
          )}
          {(conn.visualizations || []).map(viz => (
            <div key={viz.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#fff', borderRadius: 7, border: '1px solid var(--border)', marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{VIZ_TYPES.find(t => t.value === viz.type)?.label?.split(' ')[0] || '📊'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)' }}>{viz.label || viz.title || viz.type}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>
                  {viz.type === 'kpi'   && `${viz.agg}(${viz.field}) · ${viz.format} · ${viz.color}`}
                  {viz.type === 'bar'   && `X: ${viz.xField} · Y: ${viz.yField} · top ${viz.limit} · ${viz.orientation}`}
                  {viz.type === 'pie'   && `cat: ${viz.catField} · val: ${viz.valField}`}
                  {viz.type === 'table' && `cols: ${(viz.columns||[]).join(', ')}`}
                  {viz.type === 'line'  && `X: ${viz.xField} · Y: ${viz.yField}`}
                  {viz.targetLine && ` · target @ ${viz.targetLine.value}`}
                </div>
              </div>
              <button onClick={() => onEditViz(viz)}
                style={{ padding: '3px 9px', fontSize: 9, fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer' }}>
                ✏
              </button>
              <button onClick={() => onDeleteViz(viz.id)} disabled={saving}
                style={{ padding: '3px 9px', fontSize: 9, fontWeight: 600, background: 'transparent', border: '1px solid #F1948A', borderRadius: 5, cursor: 'pointer', color: 'var(--red)' }}>
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({ onClose, title, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(0,0,0,.2)', padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ gridColumn: label?.includes('Column Map') || label?.includes('Columns to show') ? '1 / -1' : undefined }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</label>
      {children}
    </div>
  );
}

const iStyle = {
  width: '100%', padding: '8px 10px',
  border: '1.5px solid var(--border)', borderRadius: 7,
  fontSize: 12, outline: 'none', boxSizing: 'border-box',
  background: '#fff',
};