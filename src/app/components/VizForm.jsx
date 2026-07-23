'use client';
 
/**
 * components/VizForm.jsx
 *
 * Add / edit a visualization for a connection.
 * Field pickers show the connection's actual column names as options.
 *
 * Props:
 *   initial      — existing viz object to edit, or null for new
 *   connection   — the connection object (used to extract field options)
 *   onSave       — async (viz) => void
 *   onCancel     — () => void
 *   saving       — bool
 */
 
import { useState, useMemo } from 'react';
 
const iStyle = {
    width: '100%', padding: '8px 10px',
    border: '1.5px solid var(--border)', borderRadius: 7,
    fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#fff',
};
 
const VIZ_TYPES = [
    { value: 'kpi',         label: '🔢 KPI Card'          },
    { value: 'bar',         label: '📊 Bar Chart'         },
    { value: 'grouped_bar', label: '📊 Grouped Bar Chart' },
    { value: 'line',        label: '📈 Line Chart'        },
    { value: 'pie',         label: '🥧 Pie Chart'         },
    { value: 'table',       label: '📋 Table'             },
];
 
const AGG_TYPES  = ['sum', 'count', 'avg', 'max', 'min', 'latest'];
const FORMATS    = ['currency', 'number', 'percent', 'text'];
const COLORS     = ['blue', 'green', 'red', 'amber', 'purple', 'navy'];
const SORT_OPTS  = [
    { value: 'desc', label: 'Highest first' },
    { value: 'asc',  label: 'Lowest first'  },
    { value: 'none', label: 'No sort'        },
];
 
const EMPTY_VIZ = {
    id: '', type: 'kpi', label: '', title: '',
    field: '', agg: 'sum', format: 'number', color: 'blue',
    xField: '', yField: '', yFields: [], catField: '', valField: '',
    columns: [],
    limit: 10, sort: 'desc', orientation: 'horizontal',
    targetLine: null, defaultLimit: 20,
};
 
function Field({ label, children, span }) {
    return (
        <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
            <label style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                color: 'var(--navy)', marginBottom: 5,
                textTransform: 'uppercase', letterSpacing: 0.4,
            }}>{label}</label>
            {children}
        </div>
    );
}
 
/**
 * FieldPicker — an input with a datalist showing all available fields.
 * Falls back to a plain input if no fields available.
 */
function FieldPicker({ id, value, onChange, placeholder, fields }) {
    const listId = `field-list-${id}`;
    return (
        <>
            <input
                list={listId}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder || 'Select or type a field…'}
                style={iStyle}
            />
            {fields.length > 0 && (
                <datalist id={listId}>
                    {fields.map(f => <option key={f} value={f} />)}
                </datalist>
            )}
            {fields.length > 0 && (
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
                    Available: {fields.join(' · ')}
                </div>
            )}
        </>
    );
}
 
export default function VizForm({ initial, connection, onSave, onCancel, saving }) {
    const [form, setForm] = useState({
        ...EMPTY_VIZ,
        ...initial,
        id: initial?.id || `viz-${Date.now()}`,
    });
 
    // Extract available field names from the connection's columnMap
    // These are the internal field names (left side of columnMap)
    const fields = useMemo(() => {
        const map = connection?.columnMap || {};
        return Object.keys(map);
    }, [connection]);
 
    function set(key, value) {
        setForm(f => ({ ...f, [key]: value }));
    }
 
    async function handleSave() {
        await onSave(form);
    }
 
    const isKPI        = form.type === 'kpi';
    const isBar        = form.type === 'bar';
    const isGroupedBar = form.type === 'grouped_bar';
    const isLine       = form.type === 'line';
    const isPie        = form.type === 'pie';
    const isTable      = form.type === 'table';
 
    return (
        <div>
            {/* Available fields hint */}
            {fields.length > 0 && (
                <div style={{
                    background: '#EBF5FB', border: '1px solid #AED6F1',
                    borderRadius: 8, padding: '10px 14px',
                    fontSize: 11, color: 'var(--navy)', marginBottom: 16,
                }}>
                    <strong>Fields available for this connection:</strong>
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {fields.map(f => (
                            <span key={f} style={{
                                padding: '2px 8px', background: '#D6EAF8',
                                borderRadius: 99, fontSize: 10, fontWeight: 600,
                            }}>{f}</span>
                        ))}
                    </div>
                </div>
            )}
 
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
 
                {/* Type */}
                <Field label="Visualization Type">
                    <select value={form.type} onChange={e => set('type', e.target.value)} style={iStyle}>
                        {VIZ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </Field>
 
                {/* Label / Title */}
                <Field label={isKPI ? 'KPI Label' : 'Chart Title'}>
                    <input
                        value={isKPI ? form.label : form.title}
                        onChange={e => set(isKPI ? 'label' : 'title', e.target.value)}
                        placeholder={isKPI ? 'e.g. Total Issued Value' : 'e.g. Top 10 Items by Value'}
                        style={iStyle}
                    />
                </Field>
 
                {/* ── KPI fields ─────────────────────────────── */}
                {isKPI && <>
                    <Field label="Field to aggregate">
                        <FieldPicker
                            id={`kpi-field-${form.id}`}
                            value={form.field}
                            onChange={v => set('field', v)}
                            placeholder="e.g. total, qty, totalValue"
                            fields={fields}
                        />
                    </Field>
 
                    <Field label="Aggregation">
                        <select value={form.agg} onChange={e => set('agg', e.target.value)} style={iStyle}>
                            {AGG_TYPES.map(a => (
                                <option key={a} value={a}>
                                    {a === 'sum'    ? 'Sum (add all values)'          :
                                     a === 'count'  ? 'Count (number of rows)'        :
                                     a === 'avg'    ? 'Average'                        :
                                     a === 'max'    ? 'Maximum (highest value)'        :
                                     a === 'min'    ? 'Minimum (lowest value)'         :
                                     a === 'latest' ? 'Latest (last row value)'        : a}
                                </option>
                            ))}
                        </select>
                    </Field>
 
                    <Field label="Format">
                        <select value={form.format} onChange={e => set('format', e.target.value)} style={iStyle}>
                            <option value="currency">Currency (₦)</option>
                            <option value="number">Number (1,234)</option>
                            <option value="percent">Percent (%)</option>
                            <option value="text">Plain text</option>
                        </select>
                    </Field>
 
                    <Field label="Colour">
                        <select value={form.color} onChange={e => set('color', e.target.value)} style={iStyle}>
                            {COLORS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                            {COLORS.map(c => (
                                <div key={c} onClick={() => set('color', c)} style={{
                                    width: 22, height: 22, borderRadius: 4, cursor: 'pointer',
                                    background: c==='blue'?'#1B4F72':c==='green'?'#117A65':c==='red'?'#C0392B':c==='amber'?'#9A7D0A':c==='purple'?'#6C3483':'#1B2631',
                                    outline: form.color===c ? '2.5px solid var(--teal)' : 'none',
                                    outlineOffset: 2,
                                }} />
                            ))}
                        </div>
                    </Field>
                </>}
 
                {/* ── Bar / Line fields ───────────────────────── */}
                {(isBar || isLine) && !isGroupedBar && <>
                    <Field label="X Axis (categories / labels)">
                        <FieldPicker
                            id={`x-field-${form.id}`}
                            value={form.xField}
                            onChange={v => set('xField', v)}
                            placeholder="e.g. name, date, month"
                            fields={fields}
                        />
                    </Field>
 
                    <Field label="Y Axis (values to plot)">
                        <FieldPicker
                            id={`y-field-${form.id}`}
                            value={form.yField}
                            onChange={v => set('yField', v)}
                            placeholder="e.g. total, qty, totalValue"
                            fields={fields}
                        />
                    </Field>
 
                    {isBar && <>
                        <Field label="Orientation">
                            <select value={form.orientation} onChange={e => set('orientation', e.target.value)} style={iStyle}>
                                <option value="horizontal">Horizontal (items on left, values on right)</option>
                                <option value="vertical">Vertical (items on bottom, values going up)</option>
                            </select>
                        </Field>
 
                        <Field label="Sort order">
                            <select value={form.sort} onChange={e => set('sort', e.target.value)} style={iStyle}>
                                {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </Field>
 
                        <Field label="Limit (max items to show)">
                            <select value={form.limit} onChange={e => set('limit', +e.target.value)} style={iStyle}>
                                {[5, 10, 15, 20, 50, 100].map(l => (
                                    <option key={l} value={l}>Top {l}</option>
                                ))}
                            </select>
                        </Field>
 
                        <Field label="Target line (optional)">
                            <input
                                type="number"
                                value={form.targetLine?.value ?? ''}
                                onChange={e => {
                                    const v = e.target.value;
                                    set('targetLine', v ? { value: +v, label: 'Target' } : null);
                                }}
                                placeholder="Leave blank for no target line"
                                style={iStyle}
                            />
                            {form.targetLine && (
                                <input
                                    value={form.targetLine.label || 'Target'}
                                    onChange={e => set('targetLine', { ...form.targetLine, label: e.target.value })}
                                    placeholder="Target label"
                                    style={{ ...iStyle, marginTop: 6 }}
                                />
                            )}
                        </Field>
                    </>}
                </>}
 
                {/* ── Pie fields ──────────────────────────────── */}
                {isPie && <>
                    <Field label="Category field (slices of the pie)">
                        <FieldPicker
                            id={`cat-field-${form.id}`}
                            value={form.catField}
                            onChange={v => set('catField', v)}
                            placeholder="e.g. dept, classification, vendor"
                            fields={fields}
                        />
                    </Field>
 
                    <Field label="Value field (size of each slice)">
                        <FieldPicker
                            id={`val-field-${form.id}`}
                            value={form.valField}
                            onChange={v => set('valField', v)}
                            placeholder="e.g. total, totalValue, qty"
                            fields={fields}
                        />
                    </Field>
                </>}
 
                {/* ── Grouped Bar fields ─────────────────────── */}
                {isGroupedBar && (
                    <>
                        <Field label="X Axis (category — one group per value)">
                            <FieldPicker
                                id={`gbar-x-${form.id}`}
                                value={form.xField}
                                onChange={v => set('xField', v)}
                                placeholder="e.g. name, dept, month"
                                fields={fields}
                            />
                        </Field>
 
                        <Field label="Sort order">
                            <select value={form.sort} onChange={e => set('sort', e.target.value)} style={iStyle}>
                                {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </Field>
 
                        <Field label="Limit (max groups)" >
                            <select value={form.limit} onChange={e => set('limit', +e.target.value)} style={iStyle}>
                                {[5, 10, 15, 20, 50].map(l => <option key={l} value={l}>Top {l}</option>)}
                            </select>
                        </Field>
 
                        <Field label="Format">
                            <select value={form.format} onChange={e => set('format', e.target.value)} style={iStyle}>
                                <option value="currency">Currency (₦)</option>
                                <option value="number">Number</option>
                                <option value="percent">Percent (%)</option>
                            </select>
                        </Field>
 
                        <Field label="Values to compare (add each bar series)" span>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>
                                Each entry becomes one set of bars. Add 2 or more to compare them side by side.
                            </div>
 
                            {/* Existing yFields */}
                            {(form.yFields || []).map((yf, i) => (
                                <div key={i} style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px',
                                    gap: 8, marginBottom: 8, alignItems: 'center',
                                }}>
                                    <div>
                                        {i === 0 && <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>Field name</div>}
                                        <FieldPicker
                                            id={`yfield-${form.id}-${i}`}
                                            value={yf.field}
                                            onChange={v => {
                                                const next = [...(form.yFields || [])];
                                                next[i] = { ...next[i], field: v };
                                                set('yFields', next);
                                            }}
                                            placeholder="e.g. receipts"
                                            fields={fields}
                                        />
                                    </div>
                                    <div>
                                        {i === 0 && <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>Display label</div>}
                                        <input
                                            value={yf.label || ''}
                                            onChange={e => {
                                                const next = [...(form.yFields || [])];
                                                next[i] = { ...next[i], label: e.target.value };
                                                set('yFields', next);
                                            }}
                                            placeholder="e.g. Receipts"
                                            style={iStyle}
                                        />
                                    </div>
                                    <div>
                                        {i === 0 && <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>Bar colour</div>}
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            {['#117A65','#E74C3C','#1B4F72','#CA6F1E','#6C3483','#888'].map(col => (
                                                <div key={col} onClick={() => {
                                                    const next = [...(form.yFields || [])];
                                                    next[i] = { ...next[i], color: col };
                                                    set('yFields', next);
                                                }} style={{
                                                    width: 18, height: 18, borderRadius: 3,
                                                    background: col, cursor: 'pointer', flexShrink: 0,
                                                    outline: yf.color === col ? '2px solid var(--teal)' : 'none',
                                                    outlineOffset: 1,
                                                }} />
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={() => set('yFields', (form.yFields||[]).filter((_,j)=>j!==i))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16, padding: 0, marginTop: i === 0 ? 16 : 0 }}>
                                        ✕
                                    </button>
                                </div>
                            ))}
 
                            {/* Add new yField */}
                            <button
                                onClick={() => set('yFields', [...(form.yFields || []), { field: '', label: '', color: '#117A65' }])}
                                style={{
                                    width: '100%', padding: '7px 14px',
                                    background: 'transparent', border: '1.5px dashed var(--border)',
                                    borderRadius: 7, fontSize: 11, fontWeight: 600,
                                    cursor: 'pointer', color: 'var(--muted)',
                                }}
                            >
                                + Add series to compare
                            </button>
 
                            {/* Quick-add from available fields */}
                            {fields.length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>Quick add from available fields:</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                        {fields
                                            .filter(f => !(form.yFields||[]).find(yf => yf.field === f))
                                            .map((f, i) => (
                                                <button key={f}
                                                    onClick={() => set('yFields', [...(form.yFields||[]), {
                                                        field: f,
                                                        label: f.charAt(0).toUpperCase() + f.slice(1),
                                                        color: ['#117A65','#E74C3C','#1B4F72','#CA6F1E'][(form.yFields||[]).length % 4],
                                                    }])}
                                                    style={{
                                                        padding: '2px 10px', background: '#E8F8F5',
                                                        border: '1px solid #A9DFBF', borderRadius: 99,
                                                        fontSize: 10, fontWeight: 600, cursor: 'pointer', color: 'var(--teal)',
                                                    }}>
                                                    + {f}
                                                </button>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </Field>
                    </>
                )}
 
                {/* ── Table fields ─────────────────────────────── */}
                {isTable && (
                    <Field label="Columns to show" span>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
                            Select which columns appear in the table. Drag to reorder (or leave blank to show all).
                        </div>
 
                        {/* Selected columns */}
                        <div style={{ marginBottom: 8 }}>
                            {(form.columns || []).map((col, i) => (
                                <div key={col} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '5px 10px', background: '#fff',
                                    border: '1px solid var(--border)', borderRadius: 6, marginBottom: 4,
                                }}>
                                    <span style={{ fontSize: 10, color: 'var(--muted)', width: 16 }}>{i + 1}</span>
                                    <span style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>{col}</span>
                                    <button onClick={() => set('columns', (form.columns || []).filter((_, j) => j !== i))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 14 }}>
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
 
                        {/* Add column from available fields */}
                        {fields.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {fields.filter(f => !(form.columns || []).includes(f)).map(f => (
                                    <button key={f}
                                        onClick={() => set('columns', [...(form.columns || []), f])}
                                        style={{
                                            padding: '3px 10px', background: '#E8F8F5',
                                            border: '1px solid #A9DFBF', borderRadius: 99,
                                            fontSize: 10, fontWeight: 600, cursor: 'pointer', color: 'var(--teal)',
                                        }}>
                                        + {f}
                                    </button>
                                ))}
                            </div>
                        )}
 
                        {/* Manual entry if no fields loaded */}
                        {fields.length === 0 && (
                            <input
                                value={(form.columns || []).join(', ')}
                                onChange={e => set('columns', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                placeholder="name, qty, total, dept (comma-separated)"
                                style={iStyle}
                            />
                        )}
 
                        <Field label="Default rows shown">
                            <select value={form.defaultLimit || 20} onChange={e => set('defaultLimit', +e.target.value)} style={{ ...iStyle, marginTop: 8 }}>
                                {[10, 20, 50, 100].map(l => <option key={l} value={l}>{l} rows</option>)}
                            </select>
                        </Field>
                    </Field>
                )}
            </div>
 
            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button onClick={onCancel}
                    style={{ padding: '8px 18px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                    Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                    style={{ padding: '8px 20px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? '⏳ Saving…' : '💾 Save Visualization'}
                </button>
            </div>
        </div>
    );
}