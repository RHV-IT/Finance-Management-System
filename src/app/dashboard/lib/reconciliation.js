/**
 * lib/reconciliation.js
 *
 * Runs automatically after every data import (see dataStore.saveData).
 * Compares values between paired modules (defined in importConfig.js
 * via `reconcileWith`) for the same month/department and flags gaps
 * that exceed the configured tolerance.
 *
 * ─── HOW A RULE WORKS ──────────────────────────────────────────
 * Module A says `reconcileWith: { module: 'B', tolerance: 0.05 }`
 * → after any upload to A or B for month M (+ optional department D),
 *   we load both A[M,D] and B[M,D], sum their valueField,
 *   and check |sumA - sumB| / max(sumA, sumB) <= tolerance.
 * → if not, an alert is created/updated.
 *
 * ─── POSTGRES MIGRATION NOTE ───────────────────────────────────
 * This entire engine becomes a SQL view / scheduled job:
 *   CREATE VIEW reconciliation_gaps AS
 *     SELECT ... FROM srv_receipts s
 *     FULL OUTER JOIN payables p ON s.period = p.period
 *     WHERE ABS(s.total - p.total) / GREATEST(s.total, p.total) > tolerance
 */
 
import { loadData, loadReconAlerts, saveReconAlerts } from './dataStore';
import { getReconciliationPairs, getModuleConfig, DEPARTMENTS } from '../../components/DataImporter/importConfig';
 
/**
 * Run all applicable reconciliation rules for a given month
 * (optionally scoped to one department that just changed).
 */
export function runReconciliation(month, changedDepartment = null) {
  if (typeof window === 'undefined') return [];
 
  const pairs = getReconciliationPairs();
  const newAlerts = [];
 
  pairs.forEach(pair => {
    // If this rule applies to a specific department only, and the
    // changed department doesn't match, skip (unless changedDepartment is null = full run)
    if (pair.appliesToDept && changedDepartment && pair.appliesToDept !== changedDepartment) {
      return;
    }
 
    const depts = pair.appliesToDept ? [pair.appliesToDept] : [null]; // null = hospital-wide
 
    depts.forEach(dept => {
      const alert = checkPair(pair, month, dept);
      if (alert) newAlerts.push(alert);
    });
  });
 
  // Merge into existing alert store (keep acknowledged status if same alert reappears)
  mergeAlerts(newAlerts);
 
  return newAlerts;
}
 
/**
 * Check a single reconciliation pair for a month/department.
 * Returns an alert object if gap exceeds tolerance, otherwise null.
 */
function checkPair(pair, month, department) {
  const sourceConfig = getModuleConfig(pair.source);
  const targetConfig = getModuleConfig(pair.target);
  if (!sourceConfig || !targetConfig) return null;
 
  const sourceRows = loadData(pair.source, [], {
    month: sourceConfig.timeAxis === 'monthly' ? month : null,
    department: sourceConfig.deptAxis === 'required' ? department : null,
  });
 
  const targetRows = loadData(pair.target, [], {
    month: targetConfig.timeAxis === 'monthly' ? month : null,
    department: targetConfig.deptAxis === 'required' ? department : null,
  });
 
  // No data on either side yet — nothing to reconcile
  if (sourceRows.length === 0 && targetRows.length === 0) return null;
 
  const sourceTotal = sumField(sourceRows, pair.sourceValueField);
  const targetTotal = sumField(targetRows, targetConfig.valueField);
 
  const maxVal = Math.max(sourceTotal, targetTotal, 1);
  const gap = Math.abs(sourceTotal - targetTotal);
  const gapPct = gap / maxVal;
 
  if (gapPct <= pair.tolerance) return null; // within tolerance, no alert
 
  const severity = gapPct > 0.25 ? 'critical' : gapPct > 0.10 ? 'high' : 'medium';
 
  return {
    id: `${pair.source}__${pair.target}__${month}__${department || 'all'}`,
    month,
    department: department || null,
    sourceModule: pair.source,
    sourceLabel:  pair.sourceLabel,
    sourceValue:  sourceTotal,
    targetModule: pair.target,
    targetLabel:  pair.targetLabel,
    targetValue:  targetTotal,
    gap,
    gapPct: +(gapPct * 100).toFixed(1),
    severity,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
}
 
function sumField(rows, field) {
  if (!field) return 0;
  return rows.reduce((s, r) => s + (parseFloat(r[field]) || 0), 0);
}
 
/**
 * Merge newly computed alerts into the persisted alert store.
 * Preserves 'acknowledged' status if the same alert ID already exists
 * and the gap is unchanged; re-opens it if the gap changed materially.
 */
function mergeAlerts(newAlerts) {
  const existing = loadReconAlerts();
  const existingMap = {};
  existing.forEach(a => { existingMap[a.id] = a; });
 
  newAlerts.forEach(na => {
    const prev = existingMap[na.id];
    if (prev && prev.status === 'acknowledged' && Math.abs(prev.gapPct - na.gapPct) < 1) {
      // Same gap, already acknowledged — keep as-is
      existingMap[na.id] = prev;
    } else {
      existingMap[na.id] = na; // new or materially changed — (re)open
    }
  });
 
  // Remove alerts whose underlying gap has since resolved
  // (i.e. existed before, not in newAlerts, and was for a month we just recalculated)
  const recalculatedIds = new Set(newAlerts.map(a => a.id));
  const monthsRecalculated = new Set(newAlerts.map(a => a.month));
 
  const final = Object.values(existingMap).filter(a => {
    const wasRecalculated = monthsRecalculated.has(a.month);
    const stillFlagged = recalculatedIds.has(a.id);
    return !wasRecalculated || stillFlagged;
  });
 
  saveReconAlerts(final);
}
 
/**
 * Get a summary count of open alerts, grouped by severity.
 * Used for the sidebar badge / topbar notification dot.
 */
export function getAlertSummary({ month, department } = {}) {
  const alerts = loadReconAlerts({ month, department, status: 'open' });
  return {
    total:    alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high:     alerts.filter(a => a.severity === 'high').length,
    medium:   alerts.filter(a => a.severity === 'medium').length,
  };
}
 
/**
 * Run reconciliation across ALL months that have any data.
 * Useful as a "Run full reconciliation" button in Settings.
 */
export function runFullReconciliation() {
  if (typeof window === 'undefined') return [];
 
  const allKeys = Object.keys(localStorage).filter(k => k.includes('__'));
  const months = new Set();
 
  allKeys.forEach(k => {
    const parts = k.split('__');
    if (parts[1] && parts[1] !== 'static' && /^\d{4}-\d{2}$/.test(parts[1])) {
      months.add(parts[1]);
    }
  });
 
  let allAlerts = [];
  months.forEach(month => {
    const alerts = runReconciliation(month, null);
    allAlerts = allAlerts.concat(alerts);
  });
 
  return allAlerts;
}
 
/**
 * Format a human-readable explanation of why an alert fired.
 */
export function explainAlert(alert) {
  const direction = alert.sourceValue > alert.targetValue ? 'exceeds' : 'falls short of';
  const deptStr = alert.department ? ` for ${alert.department}` : '';
  return (
    `${alert.sourceLabel}${deptStr} (₦${(alert.sourceValue/1e6).toFixed(2)}M) ${direction} ` +
    `${alert.targetLabel} (₦${(alert.targetValue/1e6).toFixed(2)}M) by ` +
    `₦${(alert.gap/1e6).toFixed(2)}M (${alert.gapPct}%) for ${formatMonth(alert.month)}.`
  );
}
 
function formatMonth(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-');
  const d = new Date(+y, +m - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}