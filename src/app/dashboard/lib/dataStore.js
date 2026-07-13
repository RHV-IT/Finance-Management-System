/**
 * lib/dataStore.js
 *
 * Storage abstraction layer — month + department aware.
 *
 * STORAGE KEY STRUCTURE:
 *   {module}__{YYYY-MM}__{department}   e.g. stock_out__2025-11__Pharmacy
 *   {module}__static                    e.g. asset_register__static  (no time axis)
 *   {module}__{YYYY-MM}__all            e.g. revenue_monthly__2025-11__all
 *
 * POSTGRES MIGRATION:
 *   Replace saveData / loadData / clearData bodies with API calls.
 *   Key structure maps to: table_name, period (DATE), department (VARCHAR)
 */

const isServer = typeof window === 'undefined';

// ─── Key builders ─────────────────────────────────────────────

export function buildKey(module, month, department) {
  if (!month && !department) return `${module}__static`;
  const m = month      || 'all';
  const d = department || 'all';
  return `${module}__${m}__${d}`;
}

export function parseKey(key) {
  const parts = key.split('__');
  if (parts.length === 1) return { module: parts[0], month: null, department: null };
  if (parts[1] === 'static') return { module: parts[0], month: null, department: null };
  return { module: parts[0], month: parts[1] || null, department: parts[2] || null };
}

// ─── Core operations ──────────────────────────────────────────

/**
 * Save records for a specific module + month + department.
 * mode: 'replace' | 'merge'
 */
export async function saveData(module, records, { month, department, mode = 'replace', mergeKey = null } = {}) {
  if (isServer) return { ok: false, error: 'Server side' };

  try {
    const key = buildKey(module, month, department);
    let final = records;

    if (mode === 'merge' && mergeKey) {
      const existing = loadData(module, [], { month, department });
      const map = {};
      existing.forEach(r => { if (r[mergeKey]) map[r[mergeKey]] = r; });
      records.forEach(r  => { if (r[mergeKey]) map[r[mergeKey]] = r; });
      final = Object.values(map);
    } else if (mode === 'merge') {
      const existing = loadData(module, [], { month, department });
      final = [...existing, ...records];
    }

    localStorage.setItem(key, JSON.stringify(final));
    logImport({ module, month, department, count: final.length, mode, key });

    // Run reconciliation after every save
    if (month) {
      const { runReconciliation } = await import('./reconciliation');
      runReconciliation(month, department);
    }

    return { ok: true, count: final.length, key };
  } catch (err) {
    console.error('[dataStore] saveData error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Load records for a specific module + month + department.
 * Falls back to demo data if nothing stored.
 */
export function loadData(module, fallback = [], { month, department } = {}) {
  if (isServer) return fallback;
  try {
    const key = buildKey(module, month, department);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    }

    // If specific month/dept not found, try aggregating across all matching keys
    if (month || department) {
      const allKeys = getAllStoredKeys();
      const matching = allKeys.filter(k => {
        const p = parseKey(k);
        return p.module === module &&
          (!month      || p.month      === month) &&
          (!department || p.department === department || p.department === 'all');
      });

      if (matching.length > 0) {
        const combined = matching.flatMap(k => {
          try { return JSON.parse(localStorage.getItem(k)) || []; }
          catch { return []; }
        });
        return combined.length > 0 ? combined : fallback;
      }
    }

    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Load data aggregated across ALL months for a module+dept.
 * Used for YTD views.
 */
export function loadYTD(module, fallback = [], { department, year } = {}) {
  if (isServer) return fallback;
  const allKeys = getAllStoredKeys();
  const matching = allKeys.filter(k => {
    const p = parseKey(k);
    return p.module === module &&
      (!year       || (p.month && p.month.startsWith(year))) &&
      (!department || p.department === department || p.department === 'all');
  });

  if (matching.length === 0) return fallback;

  return matching.flatMap(k => {
    try { return JSON.parse(localStorage.getItem(k)) || []; }
    catch { return []; }
  });
}

/**
 * Load aggregated totals by month for charting.
 * Returns: [{ month: '2025-01', total: 59115177 }, ...]
 */
export function loadMonthlyTotals(module, valueField, { department, year = '2025' } = {}) {
  if (isServer) return [];
  const allKeys = getAllStoredKeys();
  const byMonth = {};

  allKeys.forEach(k => {
    const p = parseKey(k);
    if (p.module !== module) return;
    if (year && p.month && !p.month.startsWith(year)) return;
    if (department && p.department !== department && p.department !== 'all') return;

    try {
      const rows = JSON.parse(localStorage.getItem(k)) || [];
      const total = rows.reduce((s, r) => s + (parseFloat(r[valueField]) || 0), 0);
      byMonth[p.month] = (byMonth[p.month] || 0) + total;
    } catch {}
  });

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}

/**
 * Get all available months that have data for a module.
 */
export function getAvailableMonths(module, department) {
  if (isServer) return [];
  const allKeys = getAllStoredKeys();
  const months  = new Set();
  allKeys.forEach(k => {
    const p = parseKey(k);
    if (p.module !== module) return;
    if (department && p.department !== department && p.department !== 'all') return;
    if (p.month) months.add(p.month);
  });
  return [...months].sort().reverse(); // most recent first
}

/**
 * Get all available departments that have data for a module + month.
 */
export function getAvailableDepts(module, month) {
  if (isServer) return [];
  const allKeys = getAllStoredKeys();
  const depts   = new Set();
  allKeys.forEach(k => {
    const p = parseKey(k);
    if (p.module !== module) return;
    if (month && p.month !== month) return;
    if (p.department && p.department !== 'all') depts.add(p.department);
  });
  return [...depts].sort();
}

/**
 * Check whether real data exists for a module (any month/dept).
 */
export function hasRealData(module, { month, department } = {}) {
  if (isServer) return false;
  if (month || department) {
    const key = buildKey(module, month, department);
    return localStorage.getItem(key) !== null;
  }
  // Check any key for this module
  return getAllStoredKeys().some(k => parseKey(k).module === module);
}

/**
 * Get row count for a stored module.
 */
export function getRowCount(module, { month, department } = {}) {
  return loadData(module, [], { month, department }).length;
}

/**
 * Clear data for a module (optionally scoped to month/dept).
 */
export function clearData(module, { month, department } = {}) {
  if (isServer) return;
  if (month || department) {
    localStorage.removeItem(buildKey(module, month, department));
  } else {
    // Clear all keys for this module
    getAllStoredKeys()
      .filter(k => parseKey(k).module === module)
      .forEach(k => localStorage.removeItem(k));
  }
}

// ─── Internal helpers ─────────────────────────────────────────

function getAllStoredKeys() {
  try {
    return Object.keys(localStorage).filter(k => k.includes('__'));
  } catch {
    return [];
  }
}

// ─── Import history ───────────────────────────────────────────

const HISTORY_KEY = 'rhv_import_history';

function logImport(entry) {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({ ...entry, ts: new Date().toISOString() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 200)));
  } catch {}
}

export function getImportHistory() {
  if (isServer) return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

export function clearImportHistory() {
  if (isServer) return;
  localStorage.removeItem(HISTORY_KEY);
}

// ─── Reconciliation alert store ───────────────────────────────

const RECON_KEY = 'rhv_recon_alerts';

export function saveReconAlerts(alerts) {
  if (isServer) return;
  try { localStorage.setItem(RECON_KEY, JSON.stringify(alerts)); } catch {}
}

export function loadReconAlerts({ month, department, status } = {}) {
  if (isServer) return [];
  try {
    const all = JSON.parse(localStorage.getItem(RECON_KEY) || '[]');
    return all.filter(a =>
      (!month      || a.month      === month) &&
      (!department || a.department === department || !a.department) &&
      (!status     || a.status     === status)
    );
  } catch { return []; }
}

export function acknowledgeAlert(alertId, note) {
  if (isServer) return;
  try {
    const all = JSON.parse(localStorage.getItem(RECON_KEY) || '[]');
    const updated = all.map(a =>
      a.id === alertId
        ? { ...a, status: 'acknowledged', acknowledgedAt: new Date().toISOString(), note }
        : a
    );
    localStorage.setItem(RECON_KEY, JSON.stringify(updated));
  } catch {}
}