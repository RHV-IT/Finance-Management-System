import { google } from "googleapis";
 
// ─── Auth — service account ───────────────────────────────────
 
function getAuth() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey  = process.env.GOOGLE_PRIVATE_KEY;
    const fileId      = process.env.GOOGLE_CONFIG_FILE_ID;
 
    if (!clientEmail) throw new Error("Missing env var: GOOGLE_CLIENT_EMAIL");
    if (!privateKey)  throw new Error("Missing env var: GOOGLE_PRIVATE_KEY");
    if (!fileId)      throw new Error("Missing env var: GOOGLE_CONFIG_FILE_ID");
 
    
    const formattedKey = privateKey.includes("\\n")
        ? privateKey.replace(/\\n/g, "\n")
        : privateKey;
 
    return new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key:  formattedKey,
        },
        scopes: ["https://www.googleapis.com/auth/drive"],
    });
}
 
function getDrive() {
    return google.drive({ version: "v3", auth: getAuth() });
}
 
// ─── READ ─────────────────────────────────────────────────────
 
export async function getConfig() {
    console.log("[getConfig] Starting...");
    console.log("[getConfig] FILE_ID:", process.env.GOOGLE_CONFIG_FILE_ID);
    console.log("[getConfig] CLIENT_EMAIL:", process.env.GOOGLE_CLIENT_EMAIL);
    console.log("[getConfig] PRIVATE_KEY exists:", !!process.env.GOOGLE_PRIVATE_KEY);
 
    const drive    = getDrive();
    console.log("[getConfig] Drive instance created");
 
    const response = await drive.files.get(
        { fileId: process.env.GOOGLE_CONFIG_FILE_ID, alt: "media" },
        { responseType: "text" }
    );
 
    console.log("[getConfig] Response received");
    console.log("[getConfig] First 100 chars:", String(response.data).slice(0, 100));
 
    return JSON.parse(response.data);
}
 
export async function getConnections() {
    const config = await getConfig();
    return config.connections || [];
}
 
export async function getConnectionById(id) {
    const connections = await getConnections();
    return connections.find(c => c.id === id) || null;
}
 
// ─── WRITE ────────────────────────────────────────────────────
 
export async function saveConfig(config) {
    const drive = getDrive();
    await drive.files.update({
        fileId: process.env.GOOGLE_CONFIG_FILE_ID,
        media: {
            mimeType: "application/json",
            body:     JSON.stringify(config, null, 2),
        },
    });
}
 
// ─── CONNECTION CRUD ──────────────────────────────────────────
 
export async function addConnection(connection) {
    const config  = await getConfig();
    const newConn = {
        ...connection,
        id:             connection.id || `conn-${Date.now()}`,
        visualizations: connection.visualizations || [],
        createdAt:      new Date().toISOString(),
    };
    config.connections.push(newConn);
    config.meta.updatedAt = new Date().toISOString();
    config.meta.version++;
    await saveConfig(config);
    return newConn;
}
 
export async function updateConnection(id, updates) {
    const config = await getConfig();
    const index  = config.connections.findIndex(c => c.id === id);
    if (index === -1) throw new Error(`Connection "${id}" not found`);
    config.connections[index] = { ...config.connections[index], ...updates, id };
    config.meta.updatedAt = new Date().toISOString();
    config.meta.version++;
    await saveConfig(config);
    return config.connections[index];
}
 
export async function deleteConnection(id) {
    const config = await getConfig();
    config.connections = config.connections.filter(c => c.id !== id);
    config.meta.updatedAt = new Date().toISOString();
    config.meta.version++;
    await saveConfig(config);
}
 
export async function upsertVisualization(connectionId, viz) {
    const config = await getConfig();
    const conn   = config.connections.find(c => c.id === connectionId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    if (!conn.visualizations) conn.visualizations = [];
    const newViz = { ...viz, id: viz.id || `viz-${Date.now()}` };
    const idx    = conn.visualizations.findIndex(v => v.id === newViz.id);
    if (idx >= 0) conn.visualizations[idx] = newViz;
    else          conn.visualizations.push(newViz);
    config.meta.updatedAt = new Date().toISOString();
    config.meta.version++;
    await saveConfig(config);
    return newViz;
}
 
export async function deleteVisualization(connectionId, vizId) {
    const config = await getConfig();
    const conn   = config.connections.find(c => c.id === connectionId);
    if (!conn) throw new Error(`Connection "${connectionId}" not found`);
    conn.visualizations = (conn.visualizations || []).filter(v => v.id !== vizId);
    config.meta.updatedAt = new Date().toISOString();
    config.meta.version++;
    await saveConfig(config);
}
