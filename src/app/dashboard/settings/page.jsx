'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import ConnectionForm from '../../components/ConnectionForm';
import ConnectionWizard from '../../components/Connectionwizard';
import HelpGuide from '../../components/HelpGuide';
import VizForm from '../../components/VizForm';
import { getApiKey, saveApiKey, useConfig } from '../../dashboard/lib/useConfig';
//import { useConfig } from '../lib/ConfigProvider';
import { testSheetConnection, extractSheetId } from '../../dashboard/lib/googleSheets';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';

// ─── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { key: 'sheets',  label: '🔗 Google Sheets'   },
  { key: 'guide',   label: '📖 Guide'           },
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

// ─── Modal wrapper ─────────────────────────────────────────────
function Modal({ onClose, title, children, wide }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', padding: '32px 16px', overflowY: 'auto',
    }}>
      <div style={{
        background: '#fff', borderRadius: 14,
        width: '100%', maxWidth: wide ? 800 : 680,
        boxShadow: '0 20px 60px rgba(0,0,0,.2)', padding: '24px 28px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Connection card ───────────────────────────────────────────
function ConnectionCard({ conn, onEdit, onDelete, onAddViz, onEditViz, onDeleteViz, onToggleVizHidden, saving }) {
  const [showVizs, setShowVizs] = useState(false);
  const isConnected = conn.sheetId && !conn.sheetId.includes('YOUR_');

  const modeLabel = conn.tabMode === 'multi'
    ? `${conn.tabs?.length || 0} tabs`
    : conn.tabMode === 'auto'
    ? 'All tabs (auto)'
    : conn.tabMode === 'scorecard'
    ? `Scorecard — "${conn.tabName}"`
    : conn.tabMode === 'scorecard_multi'
    ? `Scorecard — ${conn.tabs?.length || 0} tabs`
    : `Tab: "${conn.tabName}"`;

  return (
    <div style={{
      background: 'var(--card)', borderRadius: 10,
      border: '1px solid var(--border)', marginBottom: 10,
      overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#117A65' : '#CA6F1E', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>{conn.label || conn.module}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            {isConnected ? modeLabel : 'Not connected — edit to add Sheet ID'}
            {' · '}<code style={{ fontSize: 9 }}>{conn.module}</code>
            {' · '}<span>{conn.dept}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setShowVizs(s => !s)} style={{
            padding: '4px 10px', fontSize: 10, fontWeight: 600,
            background: showVizs ? '#E8F8F5' : 'transparent',
            border: `1px solid ${showVizs ? 'var(--teal)' : 'var(--border)'}`,
            borderRadius: 6, cursor: 'pointer',
            color: showVizs ? 'var(--teal)' : 'var(--navy)',
          }}>
            📊 {(conn.visualizations || []).length} viz{(conn.visualizations || []).length !== 1 ? 's' : ''}
          </button>
          <button onClick={onEdit} style={{
            padding: '4px 10px', fontSize: 10, fontWeight: 600,
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 6, cursor: 'pointer', color: 'var(--navy)',
          }}>✏ Edit</button>
          <button onClick={onDelete} disabled={saving} style={{
            padding: '4px 10px', fontSize: 10, fontWeight: 600,
            background: 'transparent', border: '1px solid #F1948A',
            borderRadius: 6, cursor: 'pointer', color: 'var(--red)',
          }}>🗑</button>
        </div>
      </div>

      {showVizs && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: '#fafcff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>Visualizations</span>
            <button onClick={onAddViz} style={{
              padding: '4px 12px', background: 'var(--teal)', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
            }}>+ Add</button>
          </div>
          {(conn.visualizations || []).length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
              No visualizations yet — click + Add to configure charts for this sheet.
            </div>
          )}
          {(conn.visualizations || []).map(viz => (
            <div key={viz.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', background: viz.hidden ? '#F7F7F7' : '#fff',
              border: `1px solid ${viz.hidden ? '#E5E5E5' : 'var(--border)'}`, borderRadius: 7, marginBottom: 6,
              opacity: viz.hidden ? 0.65 : 1,
            }}>
              <span style={{ fontSize: 16 }}>
                {viz.type === 'kpi' ? '🔢' : viz.type === 'bar' ? '📊' : viz.type === 'line' ? '📈' : viz.type === 'pie' ? '🥧' : '📋'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {viz.label || viz.title || viz.type}
                  {viz.hidden && (
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#9A7D0A', background: '#FEF9E7', border: '1px solid #F9E79F', borderRadius: 99, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Hidden
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>
                  {viz.type === 'kpi'   && `${viz.agg}(${viz.field}) · ${viz.format} · ${viz.color}`}
                  {viz.type === 'bar'   && `X: ${viz.xField} · Y: ${viz.yField} · top ${viz.limit} · ${viz.orientation}`}
                  {viz.type === 'line'  && `X: ${viz.xField} · Y: ${viz.yField}`}
                  {viz.type === 'pie'   && `category: ${viz.catField} · value: ${viz.valField}`}
                  {viz.type === 'table' && `cols: ${(viz.columns || []).join(', ') || 'all'} · default ${viz.defaultLimit || 20} rows`}
                  {viz.targetLine && ` · target @ ${viz.targetLine.value}`}
                </div>
              </div>
              <button onClick={() => onToggleVizHidden(viz)} disabled={saving} title={viz.hidden ? 'Show on pages again' : 'Hide from pages (keeps the config)'} style={{
                padding: '3px 9px', fontSize: 9, fontWeight: 600,
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 5, cursor: 'pointer',
              }}>{viz.hidden ? '🙈' : '👁'}</button>
              <button onClick={() => onEditViz(viz)} style={{
                padding: '3px 9px', fontSize: 9, fontWeight: 600,
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 5, cursor: 'pointer',
              }}>✏</button>
              <button onClick={() => onDeleteViz(viz.id)} disabled={saving} style={{
                padding: '3px 9px', fontSize: 9, fontWeight: 600,
                background: 'transparent', border: '1px solid #F1948A',
                borderRadius: 5, cursor: 'pointer', color: 'var(--red)',

              }}>🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab,        setTab]       = useState('sheets');
  const [apiKey,     setApiKey_]   = useState('');
  const [keySaved,   setKeySaved]  = useState(false);
  const [testUrl,    setTestUrl]   = useState('');
  const [testResult, setTestResult]= useState(null);
  const [testing,    setTesting]   = useState(false);

  // Connection modal
  const [showConnModal, setShowConnModal] = useState(false);
  const [editingConn,   setEditingConn]   = useState(null); // null = add new
  const [showWizard,    setShowWizard]    = useState(false);
  const [wizardTabMode, setWizardTabMode] = useState(null); // pre-selected mode from the wizard, for a brand-new connection

  // Viz modal
  const [vizConn,     setVizConn]     = useState(null); // the connection being edited
  const [editingViz,  setEditingViz]  = useState(null); // null = add new

  const { connections, loading, error, saving, saveError, reload, mutations } = useConfig();

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

  // ── Connection handlers ────────────────────────────────────
  function openAddConn() {
    setEditingConn(null);
    setWizardTabMode(null);
    setShowWizard(true);
  }

  function handleWizardDone(tabMode) {
    setWizardTabMode(tabMode);
    setShowWizard(false);
    setShowConnModal(true);
  }

  function handleWizardSkip() {
    setWizardTabMode(null);
    setShowWizard(false);
    setShowConnModal(true);
  }

  function openEditConn(conn) {
    setEditingConn(conn);
    setShowConnModal(true);
  }

  // FIX: ConnectionForm's onSave can be called two different ways:
  //   - a single connection object (every normal save — single tab, multi
  //     tab, scorecard, edit)
  //   - an ARRAY of connection objects (only when someone used the
  //     "multiple tables in one tab" checkbox — that flow builds several
  //     connections from one sheet in one go)
  //
  // Previously this always forwarded `payload` straight into
  // mutations.addConnection(payload), which expects ONE connection object.
  // When payload was actually an array, it got added as a single garbage
  // entry (an array has no .dept, so it fell into "Uncategorised"; it has
  // no .id/.label either, so editing it opened a blank form). Looping over
  // the array here and adding each table as its own connection is the fix.
  async function handleSaveConn(payload) {
    if (Array.isArray(payload)) {
      for (const item of payload) {
        await mutations.addConnection(item);
      }
    } else if (editingConn) {
      await mutations.updateConnection(editingConn.id, payload);
    } else {
      await mutations.addConnection(payload);
    }
    setShowConnModal(false);
    setEditingConn(null);
  }

  async function handleDeleteConn(id) {
    if (!confirm('Delete this connection? This cannot be undone.')) return;
    await mutations.deleteConnection(id);
  }

  // ── Viz handlers ───────────────────────────────────────────
  function openAddViz(conn) {
    setVizConn(conn);
    setEditingViz(null);
  }

  function openEditViz(conn, viz) {
    setVizConn(conn);
    setEditingViz(viz);
  }

  function closeVizModal() {
    setVizConn(null);
    setEditingViz(null);
  }

  async function handleSaveViz(viz) {
    if (!vizConn) return;
    await mutations.upsertVisualization(vizConn.id, viz);
    closeVizModal();
  }

  async function handleDeleteViz(connectionId, vizId) {
    if (!confirm('Delete this visualization?')) return;
    await mutations.deleteVisualization(connectionId, vizId);
  }

  // Quick show/hide toggle — same upsert mutation used for a full edit,
  // just flipping one field, so no full form round-trip is needed.
  async function handleToggleVizHidden(connectionId, viz) {
    await mutations.upsertVisualization(connectionId, { ...viz, hidden: !viz.hidden });
  }

  // ── Group connections by dept ──────────────────────────────
  // Guard against any already-corrupted entries from the bug above (a
  // stray array sitting in the connections list instead of an object) so
  // the page doesn't crash on old bad data while you clean it up.
  const byDept = {};
  connections.forEach(c => {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return;
    const d = c.dept || 'Uncategorised';
    if (!byDept[d]) byDept[d] = [];
    byDept[d].push(c);
  });

  const corruptedCount = connections.filter(c => !c || typeof c !== 'object' || Array.isArray(c)).length;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>⚙ Settings</h2>
          <p className={styles.pageMeta}>Google Sheets connections · Hospital profile · Access control</p>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(t => <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</TabBtn>)}
      </div>

      {/* ══════════ GOOGLE SHEETS ═══════════════════════════════ */}
      {tab === 'sheets' && (
        <>
          {/* API Key */}
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: '20px 24px', marginBottom: 16, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', marginBottom: 4 }}>🔑 Google API Key</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
              Required to read live data from Google Sheets. Free at{' '}
              <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', fontWeight: 600 }}>
                console.cloud.google.com
              </a>. Stored on this device only.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="password" value={apiKey} onChange={e => setApiKey_(e.target.value)}
                placeholder="AIzaSy…"
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
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
              Paste a Google Sheet URL to verify the API key works and see tab names.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={testUrl} onChange={e => setTestUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {testResult.tabs?.map(t => (
                        <span key={t} style={{ padding: '2px 8px', background: '#D5F5E3', borderRadius: 99, fontWeight: 600, fontSize: 10 }}>{t}</span>
                      ))}
                    </div>
                  </>
                ) : `✗ ${testResult.error}`}
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

          {corruptedCount > 0 && (
            <div style={{ background: '#FFF9E6', border: '1px solid #F4D03F', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#9A7D0A', marginBottom: 12, lineHeight: 1.6 }}>
              ⚠ Found {corruptedCount} malformed entr{corruptedCount === 1 ? 'y' : 'ies'} in your connections list —
              likely left over from the multi-table save bug (now fixed). These aren't shown below since they
              have no valid id or fields to display. You'll need to open the underlying Drive JSON directly and
              remove them, since there's no valid id to target with the delete button.
            </div>
          )}

          {saveError && (
            <div style={{ background: '#FEECEC', border: '1px solid #F1948A', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--red)', marginBottom: 12 }}>
              ✗ {saveError}
            </div>
          )}

          {error && (
            <div style={{ background: '#FEECEC', border: '1px solid #F1948A', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--red)', marginBottom: 12 }}>
              Failed to load from Drive: {error}
              <button onClick={reload} style={{ marginLeft: 10, fontSize: 10, color: 'var(--navy)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
            </div>
          )}

          {!loading && connections.length === 0 && !error && (
            <div style={{ background: '#F4F6F9', border: '1px solid var(--border)', borderRadius: 10, padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
              No connections yet. Click <strong>+ Add Connection</strong> to link a department's Google Sheet.
            </div>
          )}

          {Object.entries(byDept).map(([dept, conns]) => (
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
                  onAddViz={() => openAddViz(conn)}
                  onEditViz={(viz) => openEditViz(conn, viz)}
                  onDeleteViz={(vizId) => handleDeleteViz(conn.id, vizId)}
                  onToggleVizHidden={(viz) => handleToggleVizHidden(conn.id, viz)}
                  saving={saving}
                />
              ))}
            </div>
          ))}

          {/* ── Connection modal ─────────────────────────────── */}
          {showWizard && (
            <Modal onClose={() => setShowWizard(false)} title="What kind of sheet are you connecting?">
              <ConnectionWizard onDone={handleWizardDone} onSkip={handleWizardSkip} />
            </Modal>
          )}

          {showConnModal && (
            <Modal
              onClose={() => { setShowConnModal(false); setEditingConn(null); }}
              title={editingConn ? `Edit — ${editingConn.label || editingConn.module}` : 'Add Connection'}
              wide
            >
              <ConnectionForm
                key={editingConn?.id || (wizardTabMode ? `new-${wizardTabMode}` : 'new')}
                initial={editingConn || (wizardTabMode ? { tabMode: wizardTabMode } : null)}
                onSave={handleSaveConn}
                onCancel={() => { setShowConnModal(false); setEditingConn(null); }}
                onRestartWizard={!editingConn ? () => { setShowConnModal(false); setShowWizard(true); } : undefined}
                saving={saving}
              />
            </Modal>
          )}

          {/* ── Viz modal ────────────────────────────────────── */}
          {vizConn && (
            <Modal
              onClose={closeVizModal}
              title={editingViz
                ? `Edit Visualization — ${editingViz.label || editingViz.title || editingViz.type}`
                : `Add Visualization — ${vizConn.label || vizConn.module}`}
            >
              {/* Show which connection this is for */}
              <div style={{ background: '#F4F6F9', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 11, color: 'var(--navy)' }}>
                📊 Configuring visualization for: <strong>{vizConn.label || vizConn.module}</strong>
                {Object.keys(vizConn.columnMap || {}).length > 0 && (
                  <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
                    ({Object.keys(vizConn.columnMap).length} fields available)
                  </span>
                )}
              </div>

              <VizForm
                initial={editingViz}
                connection={vizConn}
                onSave={handleSaveViz}
                onCancel={closeVizModal}
                saving={saving}
              />
            </Modal>
          )}
        </>
      )}

      {/* ══════════ PROFILE ═════════════════════════════════════ */}
      {/* ══════════ GUIDE ═══════════════════════════════════════ */}
      {tab === 'guide' && <HelpGuide />}

      {tab === 'profile' && (
        <div className={tableStyles.tableBox}>
          <div className={tableStyles.tableTitle}>Hospital Profile</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '8px 0' }}>
            {[
              { label: 'Display Name',   placeholder: 'Redeemers Health Village' },
              { label: 'Legal Name',     placeholder: 'RHV Hospital Ltd'          },
              { label: 'RC Number',      placeholder: 'CAC / RC No.'              },
              { label: 'Phone',          placeholder: '+234…'                      },
              { label: 'Email',          placeholder: 'admin@rhv.com'             },
              { label: 'Address',        placeholder: 'Lagos, Nigeria'            },
              { label: 'Financial Year', placeholder: 'January – December'        },
              { label: 'Currency',       placeholder: 'NGN (₦)'                  },
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

      {/* ══════════ PINS ════════════════════════════════════════ */}
      {tab === 'pins' && (
        <div className={tableStyles.tableBox}>
          <div className={tableStyles.tableTitle}>Role PINs</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { role: 'Admin',    icon: '👑', desc: 'Full access'              },
              { role: 'Finance',  icon: '💰', desc: 'Revenue, cashbook, KPIs'  },
              { role: 'Store',    icon: '📦', desc: 'Inventory & supply chain' },
              { role: 'Pharmacy', icon: '💊', desc: 'Pharmacy & dispensing'    },
              { role: 'Payables', icon: '💳', desc: 'Payables & vendors'       },
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
    </div>
  );
}