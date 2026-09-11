'use client';

/**
 * components/ConnectionWizard.jsx
 *
 * Shown BEFORE the real ConnectionForm when adding a new connection.
 * Asks 1-2 questions in plain language (no "tabMode", no jargon) and
 * translates the answer into the right technical setting, then hands
 * off to ConnectionForm already pointed at the right mode.
 *
 * Props:
 *   onDone(tabMode) — called once an answer resolves to a tab mode.
 *                     Parent should open ConnectionForm with
 *                     initial={{ tabMode }}.
 *   onSkip()        — "just take me to the form" escape hatch, at every step.
 */

import { useState } from 'react';

const SHEET_SHAPES = [
    {
        value: 'single',
        icon: '📋',
        title: 'Each row is one record',
        desc: 'A purchase, a stock item, a staff member, an invoice — one row per thing, with columns describing it. This is what most sheets look like.',
    },
    {
        value: 'multi',
        icon: '📅',
        title: 'Same kind of list, split across several tabs',
        desc: 'Same columns every time, just spread across a few tabs — e.g. one tab per month, each shaped the same way.',
    },
    {
        value: 'scorecard',
        icon: '📊',
        title: "It's a report card",
        desc: 'Each row is a KPI (like "Prescriptions Dispensed"), and time — months or weeks — runs ACROSS the columns instead of stacking downward. One row is that KPI\'s whole year.',
    },
    {
        value: 'unsure',
        icon: '🤷',
        title: "Not sure — let me look myself",
        desc: 'Skip straight to the full form. Nothing here is final — you can change the mode once you\'re in it.',
    },
];

const SCORECARD_SPLIT = [
    {
        value: 'scorecard',
        icon: '1️⃣',
        title: 'One tab',
        desc: 'All the months sit side by side as columns, all in a single tab.',
    },
    {
        value: 'scorecard_multi',
        icon: '📚',
        title: 'Each month is its own tab',
        desc: 'e.g. a tab called "January", another called "February", and so on.',
    },
];

function Card({ opt, onClick }) {
    return (
        <div onClick={onClick} style={{
            padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
            border: '1.5px solid var(--border)', background: '#fff', marginBottom: 10,
            transition: 'border-color .15s, background .15s',
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.background = '#F4FBFA'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}
        >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 26, lineHeight: 1 }}>{opt.icon}</div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>{opt.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55 }}>{opt.desc}</div>
                </div>
            </div>
        </div>
    );
}

export default function ConnectionWizard({ onDone, onSkip }) {
    const [step, setStep] = useState(1);

    function pickShape(value) {
        if (value === 'scorecard') { setStep(2); return; }
        onDone(value === 'unsure' ? 'single' : value);
    }

    return (
        <div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 18, lineHeight: 1.6 }}>
                Answer this once and the right kind of connection gets set up for you —
                you don't need to know any technical terms to answer it.
            </div>

            {step === 1 && (
                <>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>
                        What does your Google Sheet look like?
                    </div>
                    {SHEET_SHAPES.map(opt => (
                        <Card key={opt.value} opt={opt} onClick={() => pickShape(opt.value)} />
                    ))}
                </>
            )}

            {step === 2 && (
                <>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>
                        Is all of your data in one tab, or split across several?
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>
                        You picked "report card" — just need to know how it's laid out across tabs.
                    </div>
                    {SCORECARD_SPLIT.map(opt => (
                        <Card key={opt.value} opt={opt} onClick={() => onDone(opt.value)} />
                    ))}
                    <button onClick={() => setStep(1)} style={{
                        background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11,
                        cursor: 'pointer', textDecoration: 'underline', marginTop: 6, padding: 0,
                    }}>← Back</button>
                </>
            )}

            <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                <button onClick={onSkip} style={{
                    background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11.5,
                    cursor: 'pointer', textDecoration: 'underline', padding: 0,
                }}>Skip — take me straight to the full form</button>
            </div>
        </div>
    );
}