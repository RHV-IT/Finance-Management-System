'use client';

import { useState, useEffect, useCallback } from 'react';

const API_KEY_STORAGE = 'rhv_google_api_key';
export function getApiKey()   { return typeof window !== 'undefined' ? localStorage.getItem(API_KEY_STORAGE) || '' : ''; }
export function saveApiKey(k) { if (typeof window !== 'undefined') localStorage.setItem(API_KEY_STORAGE, k.trim()); }

// ─── Shared connections store ──────────────────────────────────
//
// Plain module-level state — NOT React state, and not tied to any one
// component's lifecycle. A JS module is only ever evaluated once per page
// load, no matter how many components `import` it, so this object is
// naturally shared and naturally survives every navigation between pages
// — that's what actually eliminates the "refetch on every page switch"
// slowness, rather than just caching per-page like before.
//
// Every `useConfig()` call below subscribes to this store instead of
// fetching independently. Whichever page/component asks first triggers
// the real fetch; everyone else either gets the already-cached result
// instantly, or piggybacks on the same in-flight request instead of
// firing a second one.

let cache      = null;   // the connections array, once successfully fetched
let cacheError = null;   // last fetch error, if the most recent attempt failed
let inflight   = null;   // the in-progress fetch promise, if one is currently running
const listeners = new Set(); // subscribed components, notified on every change

async function fetchFresh() {
    inflight = (async () => {
        try {
            const res  = await fetch('/api/config/connections');
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); }
            catch { throw new Error(`API returned non-JSON: ${text.slice(0, 80)}`); }
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

            cache = Array.isArray(data) ? data : [];
            cacheError = null;
        } catch (err) {
            cacheError = err.message;
            // Deliberately NOT clearing `cache` on a failed refetch — if we
            // already had good data, keep showing it rather than blanking
            // every page out just because one refresh attempt failed.
        } finally {
            inflight = null;
            listeners.forEach(fn => fn());
        }
    })();
    return inflight;
}

// The one function every page actually calls to get connections.
//   - Already cached?      → return instantly, no network call.
//   - Fetch in progress?   → piggyback on that same promise (no duplicate request).
//   - Neither?             → this call becomes the one that actually fetches.
function ensureLoaded() {
    if (cache !== null || inflight) return inflight || Promise.resolve();
    return fetchFresh();
}

// Call this after ANY mutation (add/update/delete a connection, or
// add/update/delete a visualization) — forces the next read to hit the
// server again, and immediately re-fetches so every subscribed page's
// view of the data updates together, not just the page that made the change.
function invalidate() {
    cache = null;
    return fetchFresh();
}

// ─── useConfig ────────────────────────────────────────────────

export function useConfig() {
    const [, forceRerender] = useState(0);
    const [saving,    setSaving]    = useState(false);
    const [saveError, setSaveError] = useState(null);

    useEffect(() => {
        const onChange = () => forceRerender(n => n + 1);
        listeners.add(onChange);
        ensureLoaded(); // instant if already cached; fetches once if this is the first caller
        return () => listeners.delete(onChange);
    }, []);

    const connections = cache || [];
    const loading      = cache === null && !cacheError;
    const error        = cacheError;

    const reload = useCallback(() => invalidate(), []);

    const getByModule = (key)  => connections.find(c => c.module === key) || null;
    const getByPage   = (page) => connections.filter(c => (c.feeds || []).some(f => f.page === page));
    const groupByDept = ()     => {
        const g = {};
        connections.forEach(c => { const d = c.dept || 'Uncategorised'; if (!g[d]) g[d] = []; g[d].push(c); });
        return g;
    };

    async function call(url, method, body) {
        setSaving(true); setSaveError(null);
        try {
            const res  = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); }
            catch { throw new Error(`API returned non-JSON (${res.status}): ${text.slice(0, 120)}`); }
            if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
            await invalidate(); // refetch once — every page subscribed via useConfig() picks up the change together
            return { ok: true, data };
        } catch (err) { setSaveError(err.message); return { ok: false, error: err.message }; }
        finally { setSaving(false); }
    }

    const mutations = {
        addConnection:       (conn)               => call('/api/config/connections',                     'POST',   conn),
        updateConnection:    (id, updates)         => call(`/api/config/connections/${id}`,              'PATCH',  updates),
        deleteConnection:    (id)                  => call(`/api/config/connections/${id}`,              'DELETE', {}),
        upsertVisualization: (connectionId, viz)   => call(`/api/config/visualization/${connectionId}`,'PUT',    viz),
        deleteVisualization: (connectionId, vizId) => call(`/api/config/visualization/${connectionId}`,'DELETE', { vizId }),
    };

    return { connections, loading, error, saving, saveError, reload, getByModule, getByPage, groupByDept, mutations };
}

// Exposed so you can "warm up" the cache before the dashboard even mounts —
// e.g. call this from the login screen right after a successful PIN check,
// so by the time someone lands on Overview, the connections list is either
// already sitting in cache or already mid-flight. Nothing bad happens if
// nobody calls this — ensureLoaded() inside useConfig() will just do it
// on first use instead, exactly like before.
export function warmConnectionsCache() {
    return ensureLoaded();
}

// ─── useSheetData ─────────────────────────────────────────────
// Unchanged from what you already have — this part was already correct.

const sheetDataCache = new Map(); // module-level — survives across component mounts, cleared on full page reload

export function useSheetData(connection) {
    const cacheKey = connection?.id;
    const cached = cacheKey ? sheetDataCache.get(cacheKey) : null;

    const [rows,     setRows]     = useState([]);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState(null);
    const [warnings, setWarnings] = useState([]);
    const [meta,     setMeta]     = useState({});

    const fetch_ = useCallback(async (force = false) => {
        if (!connection) return;
        if (!force && sheetDataCache.has(cacheKey)) {
            const c = sheetDataCache.get(cacheKey);
            setRows(c.rows); setWarnings(c.warnings); setMeta(c.meta);
            return; // instant — no network call at all
        }
        setLoading(true); setError(null);
        try {
            const { fetchSheet } = await import('./googleSheets');
            const result = await fetchSheet(connection, null);
            sheetDataCache.set(cacheKey, result);
            setRows(result.rows); setWarnings(result.warnings); setMeta(result.meta);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [cacheKey, connection]);

    useEffect(() => { fetch_(); }, [fetch_]);

    return { rows, loading, error, warnings, meta, refetch: () => fetch_(true) };
}