// lib/ConfigProvider.jsx
'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ConfigContext = createContext(null);

export function ConfigProvider({ children }) {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch('/api/config/connections');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            setConnections(Array.isArray(data) ? data : []);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { reload(); }, [reload]); // now runs ONCE per app session, not once per page

    const getByModule = (key) => connections.find(c => c.module === key) || null;
    // ...same helpers as before...

    return (
        <ConfigContext.Provider value={{ connections, loading, error, reload, getByModule, /* ... */ }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const ctx = useContext(ConfigContext);
    if (!ctx) throw new Error('useConfig must be used inside <ConfigProvider>');
    return ctx;
}