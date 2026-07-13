/**
 * lib/driveConfig.js
 * Server-side only — runs in Next.js API routes.
 */

import { google } from 'googleapis';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key:  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

const FILE_ID = () => process.env.GOOGLE_CONFIG_FILE_ID;

export const DEFAULT_CONFIG = {
  connections: [],
  meta: { version: 1, updatedAt: new Date().toISOString(), updatedBy: 'system' },
};

export async function getConfig() {
  const drive    = getDrive();
  const response = await drive.files.get(
    { fileId: FILE_ID(), alt: 'media' },
    { responseType: 'text' }
  );
  try { return JSON.parse(response.data); }
  catch { return { ...DEFAULT_CONFIG }; }
}

export async function saveConfig(config) {
  const drive = getDrive();
  await drive.files.update({
    fileId: FILE_ID(),
    media:  { mimeType: 'application/json', body: JSON.stringify(config, null, 2) },
  });
}

export async function getConnections() {
  const config = await getConfig();
  return config.connections || [];
}

function bumpMeta(config) {
  return {
    ...config,
    meta: {
      ...config.meta,
      updatedAt: new Date().toISOString(),
      version:   (config.meta?.version || 0) + 1,
    },
  };
}

export async function addConnection(connection) {
  const config  = await getConfig();
  const newConn = {
    ...connection,
    id:             connection.id || `conn-${Date.now()}`,
    visualizations: connection.visualizations || [],
    feeds:          connection.feeds || [],
    createdAt:      new Date().toISOString(),
  };
  const updated = bumpMeta({ ...config, connections: [...(config.connections || []), newConn] });
  await saveConfig(updated);
  return newConn;
}

export async function updateConnection(id, updates) {
  const config  = await getConfig();
  let found = false;
  const connections = (config.connections || []).map(c => {
    if (c.id !== id) return c;
    found = true;
    return { ...c, ...updates, id };
  });
  if (!found) throw new Error(`Connection "${id}" not found.`);
  await saveConfig(bumpMeta({ ...config, connections }));
}

export async function deleteConnection(id) {
  const config = await getConfig();
  const connections = (config.connections || []).filter(c => c.id !== id);
  await saveConfig(bumpMeta({ ...config, connections }));
}

export async function upsertVisualization(connectionId, viz) {
  const config = await getConfig();
  const connections = (config.connections || []).map(c => {
    if (c.id !== connectionId) return c;
    const vizs   = c.visualizations || [];
    const newViz = { ...viz, id: viz.id || `viz-${Date.now()}` };
    const idx    = vizs.findIndex(v => v.id === newViz.id);
    return {
      ...c,
      visualizations: idx >= 0
        ? vizs.map((v, i) => (i === idx ? newViz : v))
        : [...vizs, newViz],
    };
  });
  await saveConfig(bumpMeta({ ...config, connections }));
}

export async function deleteVisualization(connectionId, vizId) {
  const config = await getConfig();
  const connections = (config.connections || []).map(c =>
    c.id !== connectionId ? c : {
      ...c,
      visualizations: (c.visualizations || []).filter(v => v.id !== vizId),
    }
  );
  await saveConfig(bumpMeta({ ...config, connections }));
}

// Client-safe lookup helpers (work on already-fetched config object)
export function getConnectionsForPage(config, page) {
  return (config?.connections || []).filter(c =>
    (c.feeds || []).some(f => f.page === page)
  );
}
export function getConnectionByModule(config, moduleKey) {
  return (config?.connections || []).find(c => c.module === moduleKey) || null;
}
export function groupConnectionsByDept(config) {
  const groups = {};
  (config?.connections || []).forEach(c => {
    const dept = c.dept || 'Uncategorised';
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(c);
  });
  return groups;
}