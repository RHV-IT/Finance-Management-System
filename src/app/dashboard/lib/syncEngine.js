/**
 * lib/syncEngine.js
 *
 * Manages all Google Sheet connections:
 * - Reads SHEET_CONNECTIONS from importConfig
 * - Fetches each connected tab on demand or on a schedule
 * - Validates required fields against the feeds[] config
 * - Writes clean data to dataStore (localStorage now, Postgres later)
 * - Tracks sync state per module (last synced, errors, warnings)
 *
 * USAGE:
 *   import { syncAll, syncModule, getSyncState } from './syncEngine';
 *
 *   await syncAll();                        // sync every connected module
 *   await syncModule('stock_register');     // sync one module
 *   const state = getSyncState();           // get all sync statuses
 */
 
import { fetchSheetTab } from './GoogleSheets';
import { saveData } from './dataStore';
import { SHEET_CONNECTIONS } from '../../components/DataImporter/sheetConfig';
 
const SYNC_STATE_KEY = 'rhv_sync_state';
const API_KEY_KEY    = 'rhv_google_api_key';
 
// ─── API key management ───────────────────────────────────────
 
export function saveApiKey(key) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(API_KEY_KEY, key);
}
 
export function getApiKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(API_KEY_KEY) || '';
}
 
// ─── Sync state ───────────────────────────────────────────────
 
/**
 * Get current sync state for all modules.
 * Returns a map: { moduleKey: { status, lastSynced, rowCount, warnings, errors, period } }
 */
export function getSyncState() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(SYNC_STATE_KEY) || '{}');
  } catch { return {}; }
}
 
function setSyncState(moduleKey, update) {
  const state = getSyncState();
  state[moduleKey] = { ...state[moduleKey], ...update, updatedAt: new Date().toISOString() };
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
}
 
// ─── Validate required fields ─────────────────────────────────
 
/**
 * Check that all required fields (across all feeds) are present in the fetched rows.
 * Returns { valid: boolean, fieldErrors: [{ field, requiredBy, missing }] }
 */
export function validateRequiredFields(rows, connection) {
  const { feeds = [], columnMap = {} } = connection;
  if (!rows || rows.length === 0) return { valid: true, fieldErrors: [] };
 
  const fieldErrors = [];
  const sampleRow   = rows[0];
 
  // Collect all required fields across all feeds, deduplicated
  const allRequired = new Map(); // field → [{ page, section }]
 
  feeds.forEach(feed => {
    (feed.requiredFields || []).forEach(field => {
      if (!allRequired.has(field)) allRequired.set(field, []);
      allRequired.get(field).push({ page: feed.page, section: feed.section });
    });
  });
 
  allRequired.forEach((usages, field) => {
    const fieldPresent = sampleRow.hasOwnProperty(field) &&
      rows.some(r => r[field] !== '' && r[field] != null);
 
    if (!fieldPresent) {
      const expectedColumnName = columnMap[field] || field;
      fieldErrors.push({
        field,
        expectedColumn: expectedColumnName,
        affectsPages: usages.map(u => `${u.page} → ${u.section}`),
      });
    }
  });
 
  return {
    valid:       fieldErrors.length === 0,
    fieldErrors,
  };
}
 
// ─── Core sync functions ──────────────────────────────────────
 
/**
 * Sync a single module by its key.
 * Returns the sync result.
 */
export async function syncModule(moduleKey) {
  const connection = SHEET_CONNECTIONS.find(c => c.module === moduleKey);
  if (!connection) {
    return { ok: false, error: `No sheet connection configured for module "${moduleKey}".` };
  }
 
  return _syncConnection(connection);
}
 
/**
 * Sync all configured modules that have a sheetId set.
 * Returns array of results.
 */
export async function syncAll() {
  const connected = SHEET_CONNECTIONS.filter(
    c => c.sheetId && c.sheetId !== 'YOUR_SHEET_ID_HERE'
  );
 
  if (connected.length === 0) {
    return [{ ok: false, error: 'No sheets are connected yet. Add sheet IDs in Settings.' }];
  }
 
  const results = await Promise.allSettled(
    connected.map(c => _syncConnection(c))
  );
 
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason?.message, module: connected[i].module }
  );
}
 
/**
 * Sync a single connection config entry.
 */
async function _syncConnection(connection) {
  const { module: moduleKey, dept, tabName, mode = 'replace', mergeKey } = connection;
  const apiKey = getApiKey();
 
  setSyncState(moduleKey, { status: 'syncing', dept, tabName });
 
  try {
    // 1. Fetch from Google Sheets
    const { rows, warnings, meta } = await fetchSheetTab(connection, apiKey);
 
    if (rows.length === 0 && warnings.length > 0) {
      setSyncState(moduleKey, {
        status:     'error',
        errors:     warnings,
        warnings:   [],
        lastSynced: null,
        rowCount:   0,
      });
      return { ok: false, errors: warnings, module: moduleKey };
    }
 
    // 2. Validate required fields
    const { valid, fieldErrors } = validateRequiredFields(rows, connection);
 
    const validationWarnings = fieldErrors.map(e =>
      `⚠ Field "${e.field}" (expected column: "${e.expectedColumn}") not found. ` +
      `Affects: ${e.affectsPages.join(', ')}.`
    );
 
    // 3. Save to dataStore (even if some fields are missing — save what we have)
    await saveData(moduleKey, rows, {
      month:      meta.period?.slice(0, 7) || null,
      department: dept || null,
      mode,
      mergeKey,
    });
 
    // 4. Update sync state
    setSyncState(moduleKey, {
      status:     fieldErrors.length > 0 ? 'warning' : 'ok',
      lastSynced: new Date().toISOString(),
      rowCount:   rows.length,
      period:     meta.period,
      warnings:   [...warnings, ...validationWarnings],
      errors:     [],
      fieldErrors,
      tabName,
      dept,
    });
 
    return {
      ok:        true,
      module:    moduleKey,
      rowCount:  rows.length,
      period:    meta.period,
      warnings:  validationWarnings,
      fieldErrors,
    };
  } catch (err) {
    setSyncState(moduleKey, {
      status:  'error',
      errors:  [err.message],
      warnings:[],
    });
    return { ok: false, module: moduleKey, error: err.message };
  }
}
 
// ─── Auto-poll ────────────────────────────────────────────────
 
let _pollInterval = null;
 
/**
 * Start polling all connected sheets every `intervalMinutes`.
 * Calling this again replaces the existing interval.
 */
export function startPolling(intervalMinutes = 15) {
  stopPolling();
  _pollInterval = setInterval(() => {
    syncAll().catch(console.error);
  }, intervalMinutes * 60 * 1000);
}
 
export function stopPolling() {
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
}
 
// ─── Helpers ──────────────────────────────────────────────────
 
/**
 * Check if a module is connected (has a non-placeholder sheetId).
 */
export function isModuleConnected(moduleKey) {
  const connection = SHEET_CONNECTIONS.find(c => c.module === moduleKey);
  return !!(connection?.sheetId && connection.sheetId !== 'YOUR_SHEET_ID_HERE');
}
 
/**
 * Get all configured connections grouped by department.
 */
export function getConnectionsByDept() {
  const groups = {};
  SHEET_CONNECTIONS.forEach(c => {
    const dept = c.dept || 'Uncategorised';
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(c);
  });
  return groups;
}