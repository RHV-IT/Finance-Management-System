'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Shared departments store ───────────────────────────────────
// Identical pattern to useConfig.js's connections store — a plain
// module-level cache, not React state, so it's naturally shared across
// every component that calls useDepartments(), including the login page
// (which sits outside any dashboard layout/provider entirely — this
// works there too, since it's not context-based, just a shared module).

let cache      = null;
let cacheError = null;
let inflight   = null;
const listeners = new Set();

async function fetchFresh() {
    inflight = (async () => {
        try {
            const res  = await fetch('/api/config/departments');
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); }
            catch { throw new Error(`API returned non-JSON: ${text.slice(0, 80)}`); }
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

            cache = Array.isArray(data) ? data : [];
            cacheError = null;
        } catch (err) {
            cacheError = err.message;
        } finally {
            inflight = null;
            listeners.forEach(fn => fn());
        }
    })();
    return inflight;
}

function ensureLoaded() {
    if (cache !== null || inflight) return inflight || Promise.resolve();
    return fetchFresh();
}

function invalidate() {
    cache = null;
    return fetchFresh();
}

// ─── useDepartments ───────────────────────────────────────────

export function useDepartments() {
    const [, forceRerender] = useState(0);
    const [saving,    setSaving]    = useState(false);
    const [saveError, setSaveError] = useState(null);

    useEffect(() => {
        const onChange = () => forceRerender(n => n + 1);
        listeners.add(onChange);
        ensureLoaded();
        return () => listeners.delete(onChange);
    }, []);

    const departments = cache || [];
    const loading      = cache === null && !cacheError;
    const error        = cacheError;

    const reload = useCallback(() => invalidate(), []);

    const getById   = (id)  => departments.find(d => d.id === id) || null;
    const getByPin  = (pin) => departments.find(d => d.pin === String(pin)) || null;

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
            await invalidate();
            return { ok: true, data };
        } catch (err) { setSaveError(err.message); return { ok: false, error: err.message }; }
        finally { setSaving(false); }
    }

    const mutations = {
        addDepartment:    (dept)         => call('/api/config/departments',       'POST',  dept),
        updateDepartment: (id, updates)  => call(`/api/config/departments/${id}`, 'PATCH', updates),
        deleteDepartment: (id)           => call(`/api/config/departments/${id}`, 'DELETE', {}),
    };

    return { departments, loading, error, saving, saveError, reload, getById, getByPin, mutations };
}

// Same idea as warmConnectionsCache() in useConfig.js — call this from the
// login screen if you want departments already fetched before the picker
// even renders. Not required (ensureLoaded() inside the hook handles it on
// first use regardless), but avoids a visible loading flicker on login.
export function warmDepartmentsCache() {
    return ensureLoaded();
}