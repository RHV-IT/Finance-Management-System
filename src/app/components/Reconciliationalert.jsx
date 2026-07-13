'use client';
 
/**
 * components/ReconciliationAlert.jsx
 *
 * Shows a banner of open reconciliation alerts.
 * Drop it at the top of any page (Overview, Exec Alerts, Pharmacy, etc.)
 *
 * USAGE:
 *   <ReconciliationAlert />                                    // all open alerts
 *   <ReconciliationAlert month="2025-11" />                    // scoped to a month
 *   <ReconciliationAlert department="Pharmacy" />               // scoped to a dept
 *   <ReconciliationAlert month="2025-11" department="Pharmacy" compact />
 */
 
import { useState, useEffect } from 'react';
import { loadReconAlerts, acknowledgeAlert } from '../dashboard/lib/dataStore'; 
import { explainAlert } from '../dashboard/lib/reconciliation';

const SEVERITY_STYLE = {
  critical: { bg:'#FEECEC', border:'#C0392B', text:'#C0392B', icon:'🔴', label:'Critical' },
  high:     { bg:'#FFF3E0', border:'#CA6F1E', text:'#CA6F1E', icon:'🟠', label:'High'     },
  medium:   { bg:'#FFF9E6', border:'#D4AC0D', text:'#856404', icon:'🟡', label:'Medium'   },
};
 
export default function ReconciliationAlert({ month, department, compact = false }) {
  const [alerts,   setAlerts]   = useState([]);
  const [expanded, setExpanded] = useState(!compact);
  const [noteFor,  setNoteFor]  = useState(null);
  const [noteText, setNoteText] = useState('');
 
  useEffect(() => {
    refresh();
  }, [month, department]);
 
  function refresh() {
    const open = loadReconAlerts({ month, department, status: 'open' });
    setAlerts(open.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2 };
      return order[a.severity] - order[b.severity];
    }));
  }
 
  function handleAcknowledge(alert) {
    acknowledgeAlert(alert.id, noteText || 'Acknowledged without note');
    setNoteFor(null);
    setNoteText('');
    refresh();
  }
 
  if (alerts.length === 0) return null;
 
  const critCount = alerts.filter(a => a.severity === 'critical').length;
  const headerBg  = critCount > 0 ? '#FEECEC' : '#FFF9E6';
  const headerBorder = critCount > 0 ? '#C0392B' : '#D4AC0D';
 
  return (
    <div style={{
      background: headerBg,
      border: `1.5px solid ${headerBorder}`,
      borderRadius: 10,
      marginBottom: 18,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 16px', cursor:'pointer',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>{critCount > 0 ? '🔴' : '🟡'}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color: critCount > 0 ? '#C0392B' : '#856404' }}>
              {alerts.length} Reconciliation Alert{alerts.length !== 1 ? 's' : ''} Need Attention
            </div>
            <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>
              Cross-department values don't match — click to {expanded ? 'collapse' : 'review'}
            </div>
          </div>
        </div>
        <span style={{ fontSize:14, color:'var(--muted)' }}>{expanded ? '▲' : '▼'}</span>
      </div>
 
      {/* Body */}
      {expanded && (
        <div style={{ padding:'0 16px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {alerts.map(alert => {
            const style = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.medium;
            return (
              <div
                key={alert.id}
                style={{
                  background:'#fff',
                  border:`1px solid ${style.border}`,
                  borderRadius:8,
                  padding:'12px 14px',
                }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:240 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                      <span>{style.icon}</span>
                      <span style={{ fontSize:11, fontWeight:800, color:style.text, textTransform:'uppercase', letterSpacing:0.5 }}>
                        {style.label} Mismatch
                      </span>
                      {alert.department && (
                        <span style={{ fontSize:9, fontWeight:700, background:'#EBF5FB', color:'var(--navy)', padding:'1px 8px', borderRadius:99 }}>
                          {alert.department}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>
                      {explainAlert(alert)}
                    </div>
                    <div style={{ display:'flex', gap:16, marginTop:8, fontSize:11 }}>
                      <div>
                        <span style={{ color:'var(--muted)' }}>{alert.sourceLabel}: </span>
                        <strong style={{ color:'var(--navy)' }}>₦{(alert.sourceValue/1e6).toFixed(2)}M</strong>
                      </div>
                      <div>
                        <span style={{ color:'var(--muted)' }}>{alert.targetLabel}: </span>
                        <strong style={{ color:'var(--navy)' }}>₦{(alert.targetValue/1e6).toFixed(2)}M</strong>
                      </div>
                      <div>
                        <span style={{ color:'var(--muted)' }}>Gap: </span>
                        <strong style={{ color:style.text }}>₦{(alert.gap/1e6).toFixed(2)}M ({alert.gapPct}%)</strong>
                      </div>
                    </div>
                  </div>
 
                  <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                    {noteFor === alert.id ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:200 }}>
                        <textarea
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="Explain the gap (e.g. approved wastage, pending invoice)…"
                          rows={2}
                          style={{ fontSize:10, padding:'6px 8px', border:'1px solid var(--border)', borderRadius:6, outline:'none', resize:'vertical' }}
                        />
                        <div style={{ display:'flex', gap:6 }}>
                          <button
                            onClick={() => handleAcknowledge(alert)}
                            style={{ flex:1, padding:'5px 10px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:6, fontSize:10, fontWeight:600, cursor:'pointer' }}
                          >
                            ✓ Confirm
                          </button>
                          <button
                            onClick={() => { setNoteFor(null); setNoteText(''); }}
                            style={{ padding:'5px 10px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, fontSize:10, cursor:'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setNoteFor(alert.id)}
                        style={{
                          padding:'6px 14px', background:'#fff', border:`1.5px solid ${style.border}`,
                          color:style.text, borderRadius:7, fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                        }}
                      >
                        Acknowledge / Explain
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}