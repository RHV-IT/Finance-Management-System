import { getConfig, saveConfig } from "./config";

// ─── Departments ────────────────────────────────────────────────
//
// Departments live as a SIBLING top-level array in the exact same
// Drive-backed JSON document connections already use — config.departments,
// right alongside config.connections. Same file, same service-account
// auth, same getConfig()/saveConfig() functions imported from config.js.
// Nothing new to provision (no second Drive file ID, no second env var).
//
// Shape of one department record:
//   {
//     id: 'pharmacy',
//     name: 'Pharmacy Unit',
//     icon: '💊',
//     pin: '5555',
//     allowedPages: ['pharmacy', 'pharmkpi'],   // or ['*'] for "every page"
//     allowedConnections: ['pharmacy-scorecard', 'drug-stock'], // or ['*']
//     canManagePermissions: false,              // true = can change any
//                                                // department's PIN/pages/
//                                                // connections (CEO/COO/
//                                                // Admin/Dev/IT)
//   }
//
// `allowedPages`/`allowedConnections` containing the single string '*'
// means "everything" — that's how full-access departments (CEO, COO,
// Admin, Dev, IT) get full access without any special-cased logic
// anywhere else in the app; the sidebar/route-guard/connections-list code
// just checks `list.includes('*') || list.includes(thing)`.

// ─── READ ─────────────────────────────────────────────────────

export async function getDepartments() {
    const config = await getConfig();
    return config.departments || []; // falls back to [] until seedDepartments() has run once
}

export async function getDepartmentById(id) {
    const departments = await getDepartments();
    return departments.find(d => d.id === id) || null;
}

// Used by the login screen — given a PIN someone typed, find which
// department (if any) it belongs to. Kept as its own function rather than
// making the login page filter the full list itself, so the "how do we
// look someone up" logic lives in one place.
export async function getDepartmentByPin(pin) {
    const departments = await getDepartments();
    return departments.find(d => d.pin === String(pin)) || null;
}

// ─── WRITE / CRUD ───────────────────────────────────────────────

export async function addDepartment(department) {
    const config = await getConfig();
    if (!config.departments) config.departments = [];

    if (config.departments.some(d => d.pin === String(department.pin))) {
        throw new Error(`PIN "${department.pin}" is already used by another department — PINs must be unique, since that's the only thing the login screen has to tell departments apart.`);
    }

    const newDept = {
        id:                    department.id || `dept-${Date.now()}`,
        name:                  department.name,
        icon:                  department.icon || '🏥',
        pin:                   String(department.pin),
        allowedPages:          department.allowedPages || [],
        allowedConnections:    department.allowedConnections || [],
        canManagePermissions:  !!department.canManagePermissions,
        createdAt:             new Date().toISOString(),
    };
    config.departments.push(newDept);
    config.meta.updatedAt = new Date().toISOString();
    config.meta.version++;
    await saveConfig(config);
    return newDept;
}

export async function updateDepartment(id, updates) {
    const config = await getConfig();
    if (!config.departments) config.departments = [];
    const index = config.departments.findIndex(d => d.id === id);
    if (index === -1) throw new Error(`Department "${id}" not found`);

    if (updates.pin !== undefined) {
        const pinTaken = config.departments.some(d => d.id !== id && d.pin === String(updates.pin));
        if (pinTaken) throw new Error(`PIN "${updates.pin}" is already used by another department.`);
    }

    config.departments[index] = { ...config.departments[index], ...updates, id };
    if (updates.pin !== undefined) config.departments[index].pin = String(updates.pin);
    config.meta.updatedAt = new Date().toISOString();
    config.meta.version++;
    await saveConfig(config);
    return config.departments[index];
}

export async function deleteDepartment(id) {
    const config = await getConfig();
    config.departments = (config.departments || []).filter(d => d.id !== id);
    config.meta.updatedAt = new Date().toISOString();
    config.meta.version++;
    await saveConfig(config);
}

// ─── One-time seed ──────────────────────────────────────────────
//
// Populates config.departments for the FIRST time, from the 11 roles
// currently hardcoded in the login page, plus the new Dev and IT
// departments. Deliberately refuses to run if config.departments already
// has anything in it — this prevents accidentally wiping out real edits
// made later through the Manage Departments screen by re-running this by
// mistake. If you genuinely need to reseed, delete config.departments
// from the Drive file by hand first (or add a `force` escape hatch here
// once you're sure you want one).
//
// allowedConnections is left EMPTY for every department below except the
// full-access ones — I don't know your real connection ids well enough to
// safely guess which ones belong to Store vs. Payables vs. Procurement
// etc., and a wrong guess here silently hides real data from someone who
// should see it. Fill these in for real once the Manage Departments
// screen exists (or hand-edit the Drive file directly in the meantime).
export async function seedDepartments() {
    const config = await getConfig();
    if (config.departments && config.departments.length > 0) {
        throw new Error('config.departments already has data — refusing to overwrite it. Delete it manually first if you really want to reseed.');
    }

    config.departments = [
        { id: 'admin',       name: 'Management / Admin', icon: '👑', pin: '0000', allowedPages: ['*'], allowedConnections: ['*'], canManagePermissions: true  },
        { id: 'revenue',     name: 'Revenue / Billing',  icon: '💰', pin: '1111', allowedPages: ['revenue', 'debtors', 'cashbook'],                                    allowedConnections: [], canManagePermissions: false },
        { id: 'store',       name: 'Store Unit',         icon: '📦', pin: '2222', allowedPages: ['store', 'supplychain', 'assets'],                                    allowedConnections: [], canManagePermissions: false },
        { id: 'payables',    name: 'Payables Unit',      icon: '💳', pin: '3333', allowedPages: ['payables'],                                                          allowedConnections: [], canManagePermissions: false },
        { id: 'procurement', name: 'Procurement Unit',   icon: '🛒', pin: '4444', allowedPages: ['p2p', 'requisition', 'reqtrack', 'itemmaster', 'prosearch', 'vendoroutstanding', 'vendors'], allowedConnections: [], canManagePermissions: false },
        { id: 'pharmacy',    name: 'Pharmacy Unit',      icon: '💊', pin: '5555', allowedPages: ['pharmacy', 'pharmkpi'],                                              allowedConnections: [], canManagePermissions: false },
        { id: 'lab',         name: 'Laboratory Unit',    icon: '🧪', pin: '6666', allowedPages: [],                                                                    allowedConnections: [], canManagePermissions: false },
        { id: 'radiology',   name: 'Radiology Unit',     icon: '🩻', pin: '7777', allowedPages: [],                                                                    allowedConnections: [], canManagePermissions: false },
        { id: 'cssd',        name: 'CSSD Unit',          icon: '♻️', pin: '9999', allowedPages: ['cssd'],                                                              allowedConnections: [], canManagePermissions: false },
        { id: 'coo',         name: 'COO',                icon: '📋', pin: '2020', allowedPages: ['*'], allowedConnections: ['*'], canManagePermissions: true },
        { id: 'ceo',         name: 'CEO',                icon: '👔', pin: '3030', allowedPages: ['*'], allowedConnections: ['*'], canManagePermissions: true },
        // New — added this round:
        { id: 'dev',         name: 'Developer',          icon: '🛠️', pin: '7000', allowedPages: ['*'], allowedConnections: ['*'], canManagePermissions: true },
        { id: 'it',          name: 'IT',                 icon: '💻', pin: '8000', allowedPages: ['*'], allowedConnections: ['*'], canManagePermissions: true },
    ];
    config.meta.updatedAt = new Date().toISOString();
    config.meta.version++;
    await saveConfig(config);
    return config.departments;
}