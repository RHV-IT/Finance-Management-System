'use client';
 
/**
 * lib/useConfig.js
 * Client-side. Fetches connections from /api/config/connections (reads Drive).
 * Provides mutations for connections and visualizations.
 */
 
import { useState, useEffect, useCallback } from 'react';
 
// ─── API key (localStorage, device-level) ────────────────────
const API_KEY_STORAGE = 'rhv_google_api_key';
export function getApiKey() {
    // Try env var first (set in .env.local as NEXT_PUBLIC_GOOGLE_API_KEY)
    if (process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
        return process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    }
    // Fall back to localStorage (entered manually in Settings)
    if (typeof window !== 'undefined') {
        return localStorage.getItem('rhv_google_api_key') || '';
    }
    return '';
}

export function saveApiKey(k)  { if (typeof window !== 'undefined') localStorage.setItem(API_KEY_STORAGE, k.trim()); }
 
// ─── useConfig ────────────────────────────────────────────────
export function useConfig() {
    const [connections, setConnections] = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(null);
    const [saving,      setSaving]      = useState(false);
    const [saveError,   setSaveError]   = useState(null);
 
    const reload = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res  = await fetch('/api/config/connections');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            setConnections(Array.isArray(data) ? data : []);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, []);
 
    useEffect(() => { reload(); }, [reload]);
 
    const getByModule = (key)  => connections.find(c => c.module === key) || null;
    const getByPage   = (page) => connections.filter(c => (c.feeds||[]).some(f => f.page === page));
    const groupByDept = ()     => {
        const g = {};
        connections.forEach(c => { const d = c.dept||'Uncategorised'; if(!g[d]) g[d]=[]; g[d].push(c); });
        return g;
    };
 
    async function call(url, method, body) {
        setSaving(true); setSaveError(null);
        try {
            const res  = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
            await reload();
            return { ok: true, data };
        } catch (err) { setSaveError(err.message); return { ok: false, error: err.message }; }
        finally { setSaving(false); }
    }
 
    const mutations = {
        addConnection:       (conn)                => call('/api/config/connections',                        'POST',   conn),
        updateConnection:    (id, updates)          => call(`/api/config/connections/${id}`,                 'PATCH',  updates),
        deleteConnection:    (id)                   => call(`/api/config/connections/${id}`,                 'DELETE', {}),
        upsertVisualization: (connectionId, viz)    => call(`/api/config/visualizations/${connectionId}`,    'PUT',    viz),
        deleteVisualization: (connectionId, vizId)  => call(`/api/config/visualizations/${connectionId}`,    'DELETE', { vizId }),
    };
 
    return { connections, loading, error, saving, saveError, reload, getByModule, getByPage, groupByDept, mutations };
}
 
// ─── useSheetData ─────────────────────────────────────────────
export function useSheetData(connection) {
    const [rows,    setRows]    = useState([]);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(null);
    const [warnings,setWarnings]= useState([]);
 
    const fetch_ = useCallback(async () => {
        if (!connection) return;
        if (!connection.sheetId || connection.sheetId.includes('YOUR_')) {
            setError(`Sheet not connected for "${connection.label||connection.module}". Set the Sheet ID in Settings.`);
            return;
        }
        const apiKey = getApiKey();
        if (!apiKey) { setError('Google API key not set. Go to Settings → Google Sheets.'); return; }
 
        setLoading(true); setError(null);
        try {
            const { fetchSheetTab } = await import('./GoogleSheets');
            const result = await fetchSheetTab(connection, apiKey);
            if (result.rows.length === 0 && result.warnings.length > 0) { setError(result.warnings.join(' ')); }
            else { setRows(result.rows); setWarnings(result.warnings); }
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [connection?.id, connection?.sheetId]);
 
    useEffect(() => { fetch_(); }, [fetch_]);
 
    return { rows, loading, error, warnings, refetch: fetch_ };
}