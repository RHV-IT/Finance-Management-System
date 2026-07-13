/**
 * lib/dataStore.js
 *
 * Storage abstraction layer.
 * Currently backed by localStorage.
 *
 * POSTGRES MIGRATION PATH:
 * ─────────────────────────
 * Replace each function body with an API call:
 *
 *   saveData  → POST   /api/data/[key]
 *   loadData  → GET    /api/data/[key]
 *   clearData → DELETE /api/data/[key]
 *
 * The rest of the app (pages, DataImporter) changes nothing.
 */
 
const isServer = typeof window === 'undefined';
 
/**
 * Save an array of records to the store.
 * @param {string} key        - storage key (= future table name)
 * @param {Array}  records    - array of plain objects
 * @param {string} mode       - 'replace' | 'merge'
 * @param {string} mergeKey   - field to deduplicate on when merging (e.g. 'id', 'reqNo')
 */
export async function saveData(key, records, mode = 'replace', mergeKey = null) {
  if (isServer) return;
 
  try {
    let final = records;
 
    if (mode === 'merge' && mergeKey) {
      const existing = await loadData(key, []);
      const map = {};
      existing.forEach(r => { if (r[mergeKey]) map[r[mergeKey]] = r; });
      records.forEach(r  => { if (r[mergeKey]) map[r[mergeKey]] = r; });
      final = Object.values(map);
    } else if (mode === 'merge') {
      // append without dedup
      const existing = await loadData(key, []);
      final = [...existing, ...records];
    }
 
    localStorage.setItem(key, JSON.stringify(final));
 
    // Log import event
    logImport(key, records.length, mode);
 
    return { ok: true, count: final.length };
  } catch (err) {
    console.error('[dataStore] saveData error:', err);
    return { ok: false, error: err.message };
  }
}
 
/**
 * Load records from the store.
 * @param {string} key       - storage key
 * @param {Array}  fallback  - demo/seed data returned when key doesn't exist
 */
export function loadData(key, fallback = []) {
  if (isServer) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
 
/**
 * Clear records for a specific module.
 */
export function clearData(key) {
  if (isServer) return;
  try {
    localStorage.removeItem(key);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
 
/**
 * Check whether a module has user-uploaded data (vs demo seed).
 */
export function hasRealData(key) {
  if (isServer) return false;
  return localStorage.getItem(key) !== null;
}
 
/**
 * Get the row count for a stored module.
 */
export function getRowCount(key) {
  const data = loadData(key, []);
  return data.length;
}
 
// ─── Import history log ───────────────────────────────────────
const HISTORY_KEY = 'rhv_import_history';
 
function logImport(key, count, mode) {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      key,
      count,
      mode,
      ts: new Date().toISOString(),
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  } catch { /* silent */ }
}
 
export function getImportHistory() {
  if (isServer) return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}
 
export function clearImportHistory() {
  if (isServer) return;
  localStorage.removeItem(HISTORY_KEY);
}