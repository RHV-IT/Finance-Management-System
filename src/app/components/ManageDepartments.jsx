'use client';

import { useState } from 'react';
import { useDepartments } from '../dashboard/lib/useDepartments';
import { useConfig } from '../dashboard/lib/useConfig';

const iStyle = {
    width: '100%', padding: '8px 10px',
    border: '1.5px solid var(--border)', borderRadius: 7,
    fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#fff',
};

// Every real page in the app, matched against the Sidebar's actual NAV
// list (slug = last segment of each href) — this is deliberately the FULL
// set, not just the pages a connection can feed, since a department's
// page access should be able to cover any real screen, including ones
// with no sheet connection at all (Approvals, Notifications, etc.).
const ALL_PAGES = [
    { value: 'overview',            label: 'Dashboard' },
    { value: 'revenue',             label: 'Revenue Streams' },
    { value: 'weekly',              label: 'Weekly / Periodic' },
    { value: 'deptanalysis',        label: 'Dept Analysis' },
    { value: 'expenses',            label: 'Expenditures' },
    { value: 'debtors',             label: 'Debtors' },
    { value: 'cashbook',            label: 'Cashbook' },
    { value: 'invoicing',           label: 'Invoicing' },
    { value: 'gl',                  label: 'GL / Journals' },
    { value: 'bankrec',             label: 'Bank Reconciliation' },
    { value: 'budget',              label: 'Budget vs Actual' },
    { value: 'finstmt',             label: 'Financial Statements' },
    { value: 'it',                  label: 'IT' },
    { value: 'hr',                  label: 'HR' },
    { value: 'store',               label: 'Store / Inventory' },
    { value: 'supplychain',         label: 'Supply Chain' },
    { value: 'grn',                 label: 'Goods Received' },
    { value: 'pharmacy',            label: 'Pharmacy' },
    { value: 'cssd',                label: 'CSSD' },
    { value: 'kitchen',             label: 'Kitchen Mgmt' },
    { value: 'p2p',                 label: 'Procure-to-Pay' },
    { value: 'requisition',         label: 'New Requisition' },
    { value: 'reqtrack',            label: 'Request Tracking' },
    { value: 'itemmaster',          label: 'Item Master' },
    { value: 'prosearch',           label: 'Procurement Search' },
    { value: 'vendoroutstanding',   label: 'Vendor Outstanding' },
    { value: 'vendors',             label: 'Vendors / SRV' },
    { value: 'assets',              label: 'Asset Register' },
    { value: 'payables',            label: 'Payables' },
    { value: 'approvals',           label: 'Approvals' },
    { value: 'notifications',       label: 'Notifications' },
    { value: 'audittrail',          label: 'Audit Trail' },
    { value: 'kpi',                 label: 'KPI Scorecard' },
    { value: 'pharmkpi',            label: 'Pharmacy KPIs' },
    { value: 'prockpi',             label: 'Procurement KPIs' },
    { value: 'archive',             label: 'Archive' },
    { value: 'settings',            label: 'Settings' },
];

// Same idea as AccessPicker above, but specifically for connections —
// grouped by each connection's real `dept` field, with a per-department
// "select all" checkbox alongside the individual ones. A flat list made
// sense for pages (there's no natural grouping), but connections already
// carry a department, so showing them grouped — and letting someone
// select or deselect a whole department in one click — matches how
// permissions actually get assigned in practice ("give Pharmacy all of
// Pharmacy's connections," not "tick these 6 specific ones by hand").
function ConnectionAccessPicker({ connections, selected, onChange }) {
    const isWildcard = selected.includes('*');

    function toggleWildcard() {
        onChange(isWildcard ? [] : ['*']);
    }
    function toggleOne(id) {
        onChange(selected.includes(id) ? selected.filter(v => v !== id) : [...selected, id]);
    }
    function toggleDept(deptConns) {
        const ids = deptConns.map(c => c.id);
        const allSelected = ids.every(id => selected.includes(id));
        onChange(allSelected
            ? selected.filter(id => !ids.includes(id))          // all were selected — deselect the whole group
            : [...new Set([...selected, ...ids])]);              // some/none selected — select the whole group
    }

    const byDept = {};
    connections.forEach(c => {
        const d = c.dept || 'Uncategorised';
        if (!byDept[d]) byDept[d] = [];
        byDept[d].push(c);
    });

    return (
        <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={isWildcard} onChange={toggleWildcard} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--navy)' }}>Full access — every connection, including new ones added later</span>
            </label>

            {!isWildcard && (
                <div style={{ maxHeight: 280, overflowY: 'auto', padding: 10, background: '#F4F6F9', borderRadius: 8 }}>
                    {Object.keys(byDept).length === 0 && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>No connections exist yet.</div>
                    )}
                    {Object.entries(byDept).map(([dept, deptConns]) => {
                        const ids = deptConns.map(c => c.id);
                        const allSelected  = ids.length > 0 && ids.every(id => selected.includes(id));
                        const someSelected = ids.some(id => selected.includes(id));
                        return (
                            <div key={dept} style={{ marginBottom: 12 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 4 }}>
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                        onChange={() => toggleDept(deptConns)}
                                        style={{ width: 13, height: 13, cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                        🏥 {dept} — select all
                                    </span>
                                </label>
                                <div style={{ paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {deptConns.map(c => (
                                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleOne(c.id)} style={{ width: 13, height: 13, cursor: 'pointer' }} />
                                            <span>{c.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const EMPTY_DEPT = {
    id: '', name: '', icon: '🏥', pin: '',
    allowedPages: [], allowedConnections: [], canManagePermissions: false,
};

function Field({ label, children }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {label}
            </label>
            {children}
        </div>
    );
}

// Shared checkbox-grid used for both page-access and connection-access —
// a "Full access (*)" toggle up top switches the whole thing into wildcard
// mode (hides the individual checkboxes entirely, since ticking all of
// them by hand would be tedious and '*' already means "everything,
// including anything added later").
function AccessPicker({ options, selected, onChange, allLabel }) {
    const isWildcard = selected.includes('*');

    function toggleWildcard() {
        onChange(isWildcard ? [] : ['*']);
    }
    function toggleOption(value) {
        onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
    }

    return (
        <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={isWildcard} onChange={toggleWildcard} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--navy)' }}>{allLabel}</span>
            </label>

            {!isWildcard && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, maxHeight: 220, overflowY: 'auto', padding: 10, background: '#F4F6F9', borderRadius: 8 }}>
                    {options.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Nothing to pick from yet.</div>
                    )}
                    {options.map(opt => (
                        <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                            <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggleOption(opt.value)} style={{ width: 13, height: 13, cursor: 'pointer', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

function DepartmentForm({ initial, connectionOptions, onSave, onCancel, saving, existingPins }) {
    const [form, setForm] = useState(initial || EMPTY_DEPT);
    const [pinError, setPinError] = useState('');
    const isEditing = !!initial?.id;

    function set(key, value) { setForm(f => ({ ...f, [key]: value })); }

    function handleSave() {
        if (!form.name.trim())            { setPinError(''); return; }
        if (!/^\d{4}$/.test(form.pin))     { setPinError('PIN must be exactly 4 digits.'); return; }
        const pinTaken = existingPins.some(p => p.pin === form.pin && p.id !== form.id);
        if (pinTaken)                      { setPinError('That PIN is already used by another department — PINs must be unique.'); return; }
        setPinError('');
        onSave(form);
    }

    return (
        <div style={{ border: '1.5px solid var(--teal)', borderRadius: 10, padding: 18, marginBottom: 16, background: '#F7FDFB' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 14 }}>
                {isEditing ? `Editing — ${initial.name}` : 'New Department'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                <Field label="Name">
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Radiology Unit" style={iStyle} />
                </Field>
                <Field label="Icon (emoji)">
                    <input value={form.icon} onChange={e => set('icon', e.target.value)} placeholder="🩻" style={iStyle} />
                </Field>
                <Field label="PIN (4 digits)">
                    <input
                        value={form.pin}
                        onChange={e => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="e.g. 7777"
                        maxLength={4}
                        style={{ ...iStyle, fontFamily: 'monospace', letterSpacing: 2 }}
                        disabled={isEditing && form.id === 'admin'} // guard rail: don't let Admin's PIN get changed from this generic form by accident — edit it deliberately if truly needed
                    />
                </Field>
            </div>

            {pinError && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 10 }}>{pinError}</div>}

            <Field label="Which pages can this department see?">
                <AccessPicker
                    options={ALL_PAGES}
                    selected={form.allowedPages || []}
                    onChange={v => set('allowedPages', v)}
                    allLabel="Full access — every page, including new ones added later"
                />
            </Field>

            <Field label="Which connections can this department see and edit?">
                <ConnectionAccessPicker
                    connections={connectionOptions}
                    selected={form.allowedConnections || []}
                    onChange={v => set('allowedConnections', v)}
                />
            </Field>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!form.canManagePermissions} onChange={e => set('canManagePermissions', e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                <span style={{ fontSize: 11.5, color: 'var(--navy)' }}>
                    <strong>Can manage permissions</strong> — this department can add/edit other departments, change PINs, and edit page/connection access (same power as CEO/COO/Admin/Dev/IT).
                </span>
            </label>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onCancel} style={{ padding: '8px 18px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                    Cancel
                </button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? '⏳ Saving…' : '💾 Save Department'}
                </button>
            </div>
        </div>
    );
}

export default function ManageDepartments() {
    const { departments, loading, error, saving, mutations } = useDepartments();
    const { connections } = useConfig();

    const [editingDept, setEditingDept] = useState(null); // department object, or 'new', or null (no form open)

    const connectionOptions = connections
        .filter(c => c && typeof c === 'object' && !Array.isArray(c))
        .map(c => ({ id: c.id, label: c.label || c.module || c.id, dept: c.dept || 'Uncategorised' }));

    async function handleSaveDept(form) {
        if (form.id) {
            await mutations.updateDepartment(form.id, form);
        } else {
            const id = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `dept-${Date.now()}`;
            await mutations.addDepartment({ ...form, id });
        }
        setEditingDept(null);
    }

    async function handleDelete(id, name) {
        if (!confirm(`Delete "${name}"? Anyone still using its PIN will no longer be able to log in.`)) return;
        await mutations.deleteDepartment(id);
    }

    if (loading) return <div style={{ fontSize: 11, color: 'var(--muted)' }}>⏳ Loading departments…</div>;
    if (error)   return <div style={{ fontSize: 11, color: 'var(--red)' }}>Failed to load departments: {error}</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                    🏢 Departments
                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>
                        {departments.length} department{departments.length !== 1 ? 's' : ''}
                    </span>
                </div>
                {editingDept === null && (
                    <button onClick={() => setEditingDept('new')} style={{ padding: '7px 16px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        + Add Department
                    </button>
                )}
            </div>

            {editingDept === 'new' && (
                <DepartmentForm
                    connectionOptions={connectionOptions}
                    existingPins={departments}
                    onSave={handleSaveDept}
                    onCancel={() => setEditingDept(null)}
                    saving={saving}
                />
            )}

            {departments.map(dept => (
                <div key={dept.id}>
                    {editingDept?.id === dept.id ? (
                        <DepartmentForm
                            initial={dept}
                            connectionOptions={connectionOptions}
                            existingPins={departments}
                            onSave={handleSaveDept}
                            onCancel={() => setEditingDept(null)}
                            saving={saving}
                        />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: 20 }}>{dept.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)' }}>
                                    {dept.name}
                                    {dept.canManagePermissions && (
                                        <span style={{ marginLeft: 8, fontSize: 8.5, fontWeight: 700, color: '#6C3483', background: '#F5EEF8', border: '1px solid #D2B4DE', borderRadius: 99, padding: '1px 8px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                            Can manage permissions
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
                                    PIN <code style={{ background: '#F4F6F9', padding: '1px 6px', borderRadius: 4 }}>{dept.pin}</code>
                                    {' · '}
                                    {dept.allowedPages?.includes('*') ? 'All pages' : `${(dept.allowedPages || []).length} page(s)`}
                                    {' · '}
                                    {dept.allowedConnections?.includes('*') ? 'All connections' : `${(dept.allowedConnections || []).length} connection(s)`}
                                </div>
                            </div>
                            <button onClick={() => setEditingDept(dept)} style={{ padding: '5px 12px', fontSize: 10, fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>
                                ✏ Edit
                            </button>
                            <button onClick={() => handleDelete(dept.id, dept.name)} style={{ padding: '5px 12px', fontSize: 10, fontWeight: 600, background: 'transparent', border: '1px solid #F1948A', borderRadius: 6, cursor: 'pointer', color: 'var(--red)' }}>
                                🗑
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}