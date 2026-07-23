'use client';
 
import { useState, useEffect, useCallback } from 'react';
 
const API_KEY_STORAGE = 'rhv_google_api_key';
export function getApiKey()   { return typeof window !== 'undefined' ? localStorage.getItem(API_KEY_STORAGE) || '' : ''; }
export function saveApiKey(k) { if (typeof window !== 'undefined') localStorage.setItem(API_KEY_STORAGE, k.trim()); }
 
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
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); }
            catch { throw new Error(`API returned non-JSON: ${text.slice(0, 80)}`); }
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
            await reload();
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
 
// ─── useSheetData ─────────────────────────────────────────────
 
export function useSheetData(connection) {
    const [rows,     setRows]     = useState([]);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState(null);
    const [warnings, setWarnings] = useState([]);
    const [meta,     setMeta]     = useState({});
 
    const fetch_ = useCallback(async () => {
        if (!connection) return;
 
        if (!connection.sheetId || connection.sheetId.includes('YOUR_')) {
            setError(`Sheet not connected for "${connection.label || connection.module}". Add the Sheet ID in Settings.`);
            return;
        }
 
        setLoading(true); setError(null);
 
        try {
            // fetchSheet routes through /api/sheets/fetch — service account handles auth
            const { fetchSheet } = await import('./googleSheets');
            const result = await fetchSheet(connection, null); // apiKey no longer needed
 
            if (result.rows.length === 0 && result.warnings.length > 0) {
                setError(result.warnings.join(' '));
            } else {
                setRows(result.rows);
                setWarnings(result.warnings);
                setMeta(result.meta);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [connection?.id, connection?.sheetId, connection?.tabMode, connection?.tabs?.length]);
 
    useEffect(() => { fetch_(); }, [fetch_]);
 
    return { rows, loading, error, warnings, meta, refetch: fetch_ };
}