'use client';

// Small shared helpers for reading what the CURRENTLY LOGGED IN department
// is allowed to see, straight out of sessionStorage — set once at login
// (see LoginPage.jsx's handleLogin) and read here by anything that needs
// to filter its UI based on it: Sidebar, the Settings connections list,
// and eventually the dashboard route guard.
//
// Deliberately synchronous and cheap (no network call) — Sidebar in
// particular calls this on every render, and it needs to be instant.
//
// HONEST LIMITATION: if a session somehow has none of these keys set
// (e.g. a very old session from before this feature existed, or someone
// poking at sessionStorage directly), these default to FULL ACCESS
// ('*') rather than hiding everything. That's a visual fail-open, not a
// real security boundary — nothing here replaces the server-side
// enforcement (checking permissions inside the API routes themselves)
// that this whole system still doesn't have. Anyone with browser dev
// tools open can already edit these values directly regardless of what
// this file does; it exists to make the UI usable and honest for normal
// use, not to stop a determined bad actor.

function readJSON(key, fallback) {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

export function getAllowedPages() {
    return readJSON('rhv_allowed_pages', ['*']);
}

export function getAllowedConnections() {
    return readJSON('rhv_allowed_connections', ['*']);
}

export function canManagePermissions() {
    return typeof window !== 'undefined' && sessionStorage.getItem('rhv_can_manage_permissions') === '1';
}

// A '*' entry means "everything" — every check in the app should go
// through this function rather than re-implementing the '*' check inline,
// so the meaning of wildcard access stays consistent everywhere.
export function hasAccess(list, value) {
    return Array.isArray(list) && (list.includes('*') || list.includes(value));
}