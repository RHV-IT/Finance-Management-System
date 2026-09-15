/**
 * app/dashboard/settings/connection-guide/page.jsx
 *
 * No client JS needed. Every "type" card below is a native <details>/
 * <summary> — closed by default (so the page doesn't dump everything on
 * screen at once), toggleable by click, AND automatically opened by the
 * browser itself when a jump-link (#type-one-tab etc.) points at it —
 * that's a real, built-in HTML behavior, not something coded here.
 *
 * IMPORTANT: the id goes on a <div> INSIDE each <details>'s content, not
 * on the <details> tag itself. That's deliberate — the browser's
 * "auto-open a closed <details> to reveal a link target" behavior only
 * triggers for ANCESTORS of the linked element, so the id has to sit
 * inside the collapsible content, not on the collapsible element itself,
 * or the auto-open silently won't fire.
 *
 * WIZARD STEP: this section describes the ConnectionWizard component
 * (the picture-based type picker shown before the connection form even
 * opens) based on the tabMode values it hands off to ConnectionForm
 * (single/multi/auto/scorecard) — it hasn't been reviewed against the
 * wizard's actual file yet. If its real wording/images differ, update
 * the "Step ②" content below to match.
 */
"use client";

import { useState } from 'react';
import Image from 'next/image';
import NormalPic from '../../../src/assets/normal_pic.webp';
import NormalPicTabs from '../../../src/assets/normal_multiple_tabs.webp';
import KPI from '../../../src/assets/kpi_sheet.webp';
import KPIMultiTab from '../../../src/assets/KPIMultiple.webp';
import MultipleTables from '../../../src/assets/multiple_tables.webp';

const page = {
    maxWidth: 880, margin: '0 auto', padding: '32px 24px 80px',
    fontFamily: 'inherit', color: 'var(--text, #1B2631)', lineHeight: 1.75,
};
const h1 = { fontSize: 24, fontWeight: 800, color: 'var(--navy, #1B2631)', marginBottom: 6 };
const intro = { fontSize: 14, color: 'var(--muted, #7F8C9A)', marginBottom: 28, maxWidth: 640 };
const navBox = {
    background: '#F4F6F9', border: '1px solid var(--border, #E0E4EA)', borderRadius: 12,
    padding: '18px 22px', marginBottom: 36,
};
const navTitle = { fontSize: 12, fontWeight: 800, color: 'var(--navy, #1B2631)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 };
const navLink = { display: 'block', fontSize: 13, color: '#117A65', textDecoration: 'none', padding: '4px 0', fontWeight: 600 };

const section = { marginBottom: 44, scrollMarginTop: 24 };
const h2 = { fontSize: 19, fontWeight: 800, color: 'var(--navy, #1B2631)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 };
const sub = { fontSize: 13, color: 'var(--muted, #7F8C9A)', marginBottom: 18 };

const step = { display: 'flex', gap: 14, marginBottom: 18, alignItems: 'flex-start' };
const stepNum = {
    flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
    background: '#117A65', color: '#fff', fontWeight: 800, fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const stepBody = { fontSize: 13.5, paddingTop: 4 };
const stepTitle = { fontWeight: 700, color: 'var(--navy, #1B2631)', marginBottom: 3, fontSize: 14 };

const code = { background: '#F4F6F9', padding: '1px 7px', borderRadius: 5, fontFamily: 'monospace', fontSize: 12.5 };
const tip = {
    background: '#EBF5FB', border: '1px solid #AED6F1', borderRadius: 8,
    padding: '10px 14px', fontSize: 12.5, color: '#1B4F72', margin: '10px 0',
};
const warn = {
    background: '#FEF9E7', border: '1px solid #F9E79F', borderRadius: 8,
    padding: '10px 14px', fontSize: 12.5, color: '#9A7D0A', margin: '10px 0',
};

// ── Accordion (native <details>/<summary>) ──────────────────────────
const accordionCard = {
    border: '2px solid var(--border, #E0E4EA)', borderRadius: 12,
    marginBottom: 14, background: '#fff', overflow: 'hidden',
};
const accordionCardPurple = { ...accordionCard, borderColor: '#D2B4DE' };
const accordionSummary = {
    padding: '16px 20px', cursor: 'pointer', listStyle: 'none',
    display: 'flex', alignItems: 'center', gap: 12,
};
const accordionBody = { padding: '0 20px 20px', scrollMarginTop: 24 };
const typeLabel = {
    display: 'inline-block', fontSize: 11, fontWeight: 800, color: '#fff',
    background: '#117A65', padding: '3px 10px', borderRadius: 99, flexShrink: 0,
};
const typeLabelPurple = { ...typeLabel, background: '#6C3483' };
const summaryTitle = { fontSize: 15, fontWeight: 800, color: 'var(--navy, #1B2631)', flex: 1 };
const chevron = { fontSize: 12, color: 'var(--muted, #7F8C9A)', flexShrink: 0 };

const imgFrame = {
    border: '1px dashed var(--border, #E0E4EA)', borderRadius: 8,
    padding: 8, background: '#FAFBFC', marginTop: 10, marginBottom: 10,
};
const imgStyle = {
    height: '100%', maxWidth: 1220, display: 'block', borderRadius: 6,
    // Screenshots of spreadsheets are mostly thin text and grid lines — the
    // browser's default smoothing filter (meant for photos) blurs that kind
    // of flat, high-contrast content when shrinking it. These hints ask the
    // browser to favor sharp edges over smoothing when scaling instead.
    imageRendering: '-webkit-optimize-contrast',
    msInterpolationMode: 'nearest-neighbor',
};
const imgCaption = { fontSize: 11, color: 'var(--muted, #7F8C9A)', marginTop: 6, fontStyle: 'italic' };

const trouble = {
    border: '1px solid #F1948A', background: '#FEECEC', borderRadius: 10,
    padding: '14px 18px', marginBottom: 12,
};
const troubleQ = { fontWeight: 700, color: '#C0392B', fontSize: 13.5, marginBottom: 6 };
const troubleA = { fontSize: 13, color: 'var(--text, #1B2631)' };

// Small helper so every accordion header looks identical without repeating
// the same style props on every single <summary> below.
function AccordionHeader({ badge, badgeStyle = typeLabel, title }) {
    return (
        <summary style={accordionSummary}>
            <span style={badgeStyle}>{badge}</span>
            <span style={summaryTitle}>{title}</span>
            <span style={chevron}>▾ click to expand</span>
        </summary>
    );
}

export default function ConnectionGuidePage() {
    const [zoomedImg, setZoomedImg] = useState(null);
    const pulseKeyframes = `
    @keyframes zoomPulse {
    0%, 100% { opacity: 0.9; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.06); }
    }
    `;

    <style>{pulseKeyframes}</style>

    return (
        <div style={page}>
            <h1 style={h1}>📖 How to Connect a Google Sheet — Step by Step</h1>
            <p style={intro}>
                This page walks you through connecting a Google Sheet and building your first chart, from
                start to finish, in plain everyday language — no computer knowledge needed. Keep this tab
                open, and switch back and forth to your Settings tab as you follow along. Sections below are
                collapsed — click one to open it, or use a jump link to open the right one automatically.
            </p>

            {/* ── Jump nav ───────────────────────────────────────── */}
            <div style={navBox}>
                <div style={navTitle}>Jump to a section</div>
                <a href="#before-you-start" style={navLink}>① Share your sheet (do this first, no matter what)</a>
                <a href="#wizard-step" style={navLink}>② Click "+ Add Connection" — pick your sheet's shape</a>
                <a href="#which-type" style={navLink}>③ Follow the steps for your shape</a>
                <a href="#type-one-tab" style={navLink}>&nbsp;&nbsp;&nbsp;→ A. A simple list (One Tab)</a>
                <a href="#type-multi-tab" style={navLink}>&nbsp;&nbsp;&nbsp;→ B. Same list, split across tabs (Multiple Tabs)</a>
                <a href="#type-scorecard" style={navLink}>&nbsp;&nbsp;&nbsp;→ C. A report card (KPI Scorecard)</a>
                <a href="#type-scorecard-multi" style={navLink}>&nbsp;&nbsp;&nbsp;→ D. A report card split by month (KPI Scorecard, multiple tabs)</a>
                <a href="#type-multi-table" style={navLink}>&nbsp;&nbsp;&nbsp;→ E. Several tables stacked in one tab (a checkbox, not a wizard option)</a>
                <a href="#adding-visualizations" style={navLink}>④ Adding a chart or KPI card</a>
                <a href="#viz-kpi" style={navLink}>&nbsp;&nbsp;&nbsp;→ KPI Card (one big number)</a>
                <a href="#viz-bar-line-pie" style={navLink}>&nbsp;&nbsp;&nbsp;→ Bar / Line / Pie Chart</a>
                <a href="#viz-table" style={navLink}>&nbsp;&nbsp;&nbsp;→ Table</a>
                <a href="#viz-grouped" style={navLink}>&nbsp;&nbsp;&nbsp;→ Grouped Bar / Grouped Line (comparing several things)</a>
                <a href="#viz-scorecard-filter" style={navLink}>&nbsp;&nbsp;&nbsp;→ ⭐ Scorecard: "Filter to specific KPIs"</a>
                <a href="#viz-scorecard-split" style={navLink}>&nbsp;&nbsp;&nbsp;→ ⭐ Scorecard: splitting a squashed KPI into its own bars</a>
                <a href="#viz-scorecard-text" style={navLink}>&nbsp;&nbsp;&nbsp;→ ⭐ Scorecard: showing a word instead of a number</a>
                <a href="#troubleshooting" style={navLink}>⑤ Something's not showing up — help!</a>
            </div>

            {/* ══════════════════════════════════════════════════════ */}
            <section id="before-you-start" style={section}>
                <h2 style={h2}>① Share your sheet</h2>
                <p style={sub}>Do this before anything else — it's the one step that has to happen no matter what your sheet looks like.</p>

                <div style={step}>
                    <div style={stepNum}>1</div>
                    <div style={stepBody}>
                        <div style={stepTitle}>Open your Google Sheet, and click the blue "Share" button (top-right corner).</div>
                        Add the special email address your administrator gave you, with at least "Viewer"
                        access. This is what lets our system read your sheet — without this, nothing else in
                        this guide will work, even if every other step is done perfectly.
                    </div>
                </div>

                <div style={step}>
                    <div style={stepNum}>2</div>
                    <div style={stepBody}>
                        <div style={stepTitle}>Copy the sheet's link.</div>
                        Click into the address bar at the top of your browser while the sheet is open, and
                        copy the whole web address — something like{' '}
                        <span style={code}>https://docs.google.com/spreadsheets/d/......</span>
                    </div>
                </div>

                <div style={tip}>
                    💡 Once your sheet is shared and you've got the link copied, you're ready for the next
                    step — telling the system what kind of sheet it is.
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════ */}
            <section id="wizard-step" style={section}>
                <h2 style={h2}>② Click "+ Add Connection" — pick your sheet's shape</h2>
                <p style={sub}>
                    This happens BEFORE you paste your link anywhere. Clicking <strong>+ Add Connection</strong>{' '}
                    in Settings first shows you a small window with a few pictures, asking what your sheet
                    looks like. Pick the one that matches — it decides which version of the connection form
                    opens next, so everything downstream is already set up correctly for your sheet's shape.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 16 }}>
                    {[
                        { icon: '1️⃣', label: 'One tab', desc: 'All my data is in one sheet tab', img: NormalPic },
                        { icon: '📅', label: 'Multiple tabs', desc: 'My data is split by month/period across tabs', img: NormalPicTabs },
                        { icon: '📊', label: 'KPI Scorecard', desc: "One row per measurement, months running across as columns", img: KPI },
                    ].map(opt => (
                        <div key={opt.label} style={{ border: '2px solid var(--border, #E0E4EA)', borderRadius: 10, padding: 14, background: '#fff', minHeight: 250 }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>{opt.icon}</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy, #1B2631)' }}>{opt.label}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--muted, #7F8C9A)', marginTop: 2 }}>{opt.desc}</div>
                            {opt.img && (
                                <div
                                    style={{ ...imgFrame, position: 'relative', cursor: 'zoom-in' }}
                                    onClick={() => setZoomedImg({ src: opt.img, label: opt.label })}
                                    onMouseEnter={e => {
                                        const overlay = e.currentTarget.querySelector('.zoom-overlay');
                                        if (overlay) overlay.style.opacity = 1;
                                    }}
                                    onMouseLeave={e => {
                                        const overlay = e.currentTarget.querySelector('.zoom-overlay');
                                        if (overlay) overlay.style.opacity = 0;
                                    }}
                                >
                                    <Image
                                        width={300}
                                        height={200}
                                        src={opt.img}
                                        alt={`Example of a "${opt.label}" sheet`}
                                        style={imgStyle}
                                    />
                                    {/* CTA overlay */}
                                    <div
                                        className="zoom-overlay"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'rgba(27, 38, 49, 0.45)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 8,
                                            opacity: 0,
                                            transition: 'opacity 0.15s ease',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            🔍 Click to enlarge
                                        </span>
                                    </div>
                                    {/* Always-visible subtle badge so users know it's clickable even without hovering (mobile) */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 6,
                                            right: 6,
                                            width: 22,
                                            height: 22,
                                            borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.9)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 11,
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                            animation: 'zoomPulse 2s ease-in-out infinite',
                                        }}
                                    >
                                        🔍
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Modal */}
                {zoomedImg && (
                    <div
                        onClick={() => setZoomedImg(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.75)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: 24,
                            cursor: 'zoom-out',
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: 'relative',
                                maxWidth: '90vw',
                                maxHeight: '90vh',
                                background: '#fff',
                                borderRadius: 12,
                                padding: 16,
                                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                            }}
                        >
                            <button
                                onClick={() => setZoomedImg(null)}
                                style={{
                                    position: 'absolute',
                                    top: -14,
                                    right: -14,
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: '#1B2631',
                                    color: '#fff',
                                    fontSize: 16,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                }}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#1B2631', marginBottom: 10 }}>
                                {zoomedImg.label}
                            </div>
                            <Image
                                width={900}
                                height={600}
                                src={zoomedImg.src}
                                alt={`Larger view of "${zoomedImg.label}" sheet`}
                                style={{ width: '100%', height: 'auto', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
                            />
                        </div>
                    </div>
                )}

                <div style={warn}>
                    ⭐ Not sure which picture matches? Scroll down to Step ③ below — each type has its own
                    full-size screenshot and a written description, which is often easier to compare against
                    your real sheet than a small icon.
                </div>

                <div style={tip}>
                    💡 <strong>One more shape that ISN'T in this picture-picker:</strong> if your sheet has{' '}
                    <em>several separate tables stacked in one tab</em> (see Type E below), you still pick{' '}
                    <strong>"One tab"</strong> here first — that extra shape is a checkbox you tick <em>inside</em>{' '}
                    the form afterward, not one of these four pictures.
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════ */}
            <section id="which-type" style={section}>
                <h2 style={h2}>③ Follow the steps for your shape</h2>
                <p style={sub}>
                    Click the section below matching what you picked in Step ② (or click a jump link above —
                    it'll open the right one for you automatically).
                </p>

                {/* ── TYPE A ── */}
                <details style={accordionCard}>
                    <AccordionHeader badge="TYPE A" title='A simple list — "One Tab"' />
                    <div id="type-one-tab" style={accordionBody}>
                        <p style={{ fontSize: 13, marginBottom: 4 }}>
                            Your sheet has <strong>one row for every single thing</strong> — one row per purchase,
                            one row per staff member, one row per item in stock. All of it lives in a single tab
                            at the bottom of the screen. This is the most common type.
                        </p>
                        <div style={imgFrame}>
                            <Image src={NormalPic} alt="Example of a one-tab sheet — one row per record" style={imgStyle} />
                            <div style={imgCaption}>Example: a simple list sheet. Each row = one record.</div>
                        </div>

                        <h4 style={{ fontSize: 13, fontWeight: 800, margin: '18px 0 10px' }}>Steps for this type:</h4>

                        <div style={step}>
                            <div style={stepNum}>1</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Fill in the Label, Page, and Module key.</div>
                                <strong>Label</strong> is just a name for your own reference (e.g. "Kitchen Stock").
                                <strong> Page</strong> is which screen in the app this should show up on. Once you
                                pick a page, a dropdown appears for <strong>Module key</strong> — just pick from
                                that list, you don't need to type anything here.
                            </div>
                        </div>

                        <div style={step}>
                            <div style={stepNum}>2</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Type the exact name of your tab.</div>
                                The little labels along the bottom of your Google Sheet.
                            </div>
                        </div>

                        <div style={step}>
                            <div style={stepNum}>3</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Set the Range and Header Row, THEN click "Test & Load."</div>
                                <strong>Range</strong> is which part of the sheet to read — leave it as{' '}
                                <span style={code}>A:Z</span> if your whole sheet is one table.{' '}
                                <strong>Header Row Number</strong> is which row (counting from the very top of the
                                sheet) has your column titles — almost always <span style={code}>1</span>. Paste
                                your sheet's link into "Google Sheet URL or ID" and click{' '}
                                <strong>🔌 Test & Load</strong> once these are set.
                            </div>
                            <div style={tip}>
                                💡 If your real data starts partway down the sheet — say row 5 — narrow the
                                Range to something like <span style={code}>A5:Z100</span> AND set Header Row
                                Number to <span style={code}>5</span> to match. The system reads exactly the row
                                you specify here, so these two numbers should always describe the same real row
                                in your sheet.
                            </div>
                        </div>

                        <div style={step}>
                            <div style={stepNum}>4</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Check the column mapping — it's already filled in for you.</div>
                                After Test & Load, the system reads your sheet's real column titles AND takes
                                its best guess at what to call each one internally — you'll see both sides of
                                "Our field name ↔ Their column" already populated. Just glance through and fix
                                any guess that doesn't look right; you don't need to type anything from scratch
                                unless a guess is wrong.
                            </div>
                        </div>

                        <div style={step}>
                            <div style={stepNum}>5</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Click "💾 Save Connection."</div>
                                Next, add a chart or KPI card so the data actually shows on the page — see
                                Step ④ below.
                            </div>
                        </div>
                    </div>
                </details>

                {/* ── TYPE B ── */}
                <details style={accordionCard}>
                    <AccordionHeader badge="TYPE B" title='Same list, split across tabs — "Multiple Tabs"' />
                    <div id="type-multi-tab" style={accordionBody}>
                        <p style={{ fontSize: 13, marginBottom: 4 }}>
                            Same idea as Type A (one row per thing, with column titles), but instead of one big
                            tab, it's split up — one tab for January, one for February, and so on. The columns
                            look the same in every tab.
                        </p>
                        <div style={imgFrame}>
                            <Image src={NormalPicTabs} alt="Example of a sheet split across several tabs, one per month" style={imgStyle} />
                            <div style={imgCaption}>Example: the same kind of table, but a separate tab per month.</div>
                        </div>

                        <h4 style={{ fontSize: 13, fontWeight: 800, margin: '18px 0 10px' }}>Steps for this type:</h4>

                        <div style={step}>
                            <div style={stepNum}>1</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Fill in Label, Page, and Module key — same as Type A.</div>
                            </div>
                        </div>

                        <div style={step}>
                            <div style={stepNum}>2</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Add each tab one at a time.</div>
                                Type a tab's exact name — a "key" often fills itself in automatically (typing
                                "January" fills in <span style={code}>2026-01</span>). You can also click the
                                tab names shown under "Quick add from sheet" instead of typing.
                            </div>
                        </div>

                        <div style={step}>
                            <div style={stepNum}>3</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Set Range and Header Row Number — same meaning as Type A, applied to every tab you added.</div>
                            </div>
                        </div>

                        <div style={step}>
                            <div style={stepNum}>4</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Check the column mapping (already guessed for you), then Save — same as Type A.</div>
                            </div>
                        </div>
                    </div>
                </details>

                {/* ── TYPE C ── */}
                <details style={accordionCard}>
                    <AccordionHeader badge="TYPE C" title='A report card — "KPI Scorecard"' />
                    <div id="type-scorecard" style={accordionBody}>
                        <p style={{ fontSize: 13, marginBottom: 4 }}>
                            Instead of new <strong>rows</strong> being added over time, each measurement (KPI)
                            has exactly <strong>one row, forever</strong> — and the months run{' '}
                            <strong>sideways</strong>, left to right, as columns (JAN, FEB, MAR...).
                        </p>
                        <div style={imgFrame}>
                            <Image src={KPI} alt="Example of a KPI scorecard sheet — one row per KPI, months as columns" style={imgStyle} />
                            <div style={imgCaption}>Example: a report-card style sheet. One row per measurement, months going across.</div>
                        </div>

                        <h4 style={{ fontSize: 13, fontWeight: 800, margin: '18px 0 10px' }}>Steps for this type:</h4>

                        <div style={step}>
                            <div style={stepNum}>1</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Fill in Label, Page, and Module key — same as before.</div>
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>2</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Type the exact tab name.</div>
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>3</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Answer 3 simple questions about where things sit:</div>
                                "Which row has the category/measure labels?" (usually around row 6), "Which row
                                does the actual KPI data start on?" (a row or two below that), and "Roughly how
                                many KPI rows total?" (a rough guess is fine).
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>4</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Click "🔍 Show me the columns in that row."</div>
                                This reads your actual sheet and shows exactly what's written in each column
                                at the row you specified — no guessing.
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>5</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>For each column shown, say what it is.</div>
                                Pick one of: <strong>KPI Category</strong>, <strong>Description / Measure</strong>{' '}
                                (required for at least one column — this names each KPI), <strong>Unit / Target
                                text</strong>, <strong>Time period</strong> (required for at least one column),
                                or <strong>Skip this column</strong>.
                            </div>
                            <div style={warn}>
                                ⚠️ No categories in your sheet? Leave "KPI Category" unset everywhere and mark
                                your one label column as "Description / Measure" instead — every KPI will sit
                                under one group.
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>6</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Only if you see a squashed-together cell — use the Advanced section.</div>
                                Sometimes one month's box for one KPI holds several numbers jammed together,
                                like <span style={code}>04:04:01:01</span>. If a column right next to your
                                measure already lists labels separated by a colon (like "Pharmacist: Pharm.
                                Tech.: Porter: Admin"), the system splits squashed cells like this{' '}
                                <strong>automatically</strong> — nothing to configure. Only open "Advanced: some
                                cells pack multiple values together" if your squashed cell uses a different
                                separator (like <span style={code}>---</span>) or has no label column to read
                                from — describe which category, which KPI number, the labels in order, and the
                                separator used.
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>7</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Click "💾 Save Connection."</div>
                            </div>
                        </div>
                    </div>
                </details>

                {/* ── TYPE D ── */}
                <details style={accordionCard}>
                    <AccordionHeader badge="TYPE D" title='A report card, split by month — "KPI Scorecard, multiple tabs"' />
                    <div id="type-scorecard-multi" style={accordionBody}>
                        <p style={{ fontSize: 13, marginBottom: 4 }}>
                            Type C's layout (one row per KPI, months as columns) — except each month gets its{' '}
                            <strong>own tab</strong>, often with an extra weekly breakdown inside (Week 1, Week
                            2, Week 3, Week 4).
                        </p>
                        <div style={imgFrame}>
                            <Image src={KPIMultiTab} alt="Example of a KPI scorecard split into one tab per month, each with a weekly breakdown" style={imgStyle} />
                            <div style={imgCaption}>Example: a report-card sheet, but each month is its own tab.</div>
                        </div>

                        <div style={tip}>
                            💡 This type takes more setup than the others — worth asking whoever manages this
                            system to help set up the first one. After that, adding new months is simpler.
                        </div>

                        <h4 style={{ fontSize: 13, fontWeight: 800, margin: '18px 0 10px' }}>Steps for this type:</h4>

                        <div style={step}>
                            <div style={stepNum}>1</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Everything from Type C's steps 1–2 and 5–7 still applies.</div>
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>2</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>The difference: instead of one tab, you list each month's tab separately, each with its own column meanings.</div>
                                A different tab's columns can represent different weeks, so each month tab
                                needs its own quick setup — this piece is worth asking your administrator to
                                configure once as a starting template.
                            </div>
                        </div>
                    </div>
                </details>

                {/* ── TYPE E ── */}
                <details style={accordionCard}>
                    <AccordionHeader badge="TYPE E" title="Several tables stacked in one tab (a checkbox, not a wizard picture)" />
                    <div id="type-multi-table" style={accordionBody}>
                        <p style={{ fontSize: 13, marginBottom: 4 }}>
                            Your sheet has just <strong>one tab</strong>, but inside it there are{' '}
                            <strong>several separate tables</strong> stacked one below another — a KPI table,
                            then a gap, then a devices table, then a gap, then a subscriptions table.
                        </p>
                        <div style={imgFrame}>
                            <Image src={MultipleTables} alt="Example of one tab containing several separate stacked tables" style={imgStyle} />
                            <div style={imgCaption}>Example: one tab, but several distinct tables stacked at different rows.</div>
                        </div>

                        <div style={warn}>
                            ⭐ Remember: pick <strong>"One tab"</strong> in the Step ② picture-picker for this
                            type — this shape is a checkbox INSIDE the form, not one of the four pictures.
                        </div>

                        <h4 style={{ fontSize: 13, fontWeight: 800, margin: '18px 0 10px' }}>Steps for this type:</h4>

                        <div style={step}>
                            <div style={stepNum}>1</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Before filling anything else in, tick "📑 This sheet contains multiple tables stacked in one tab."</div>
                                This only appears when creating a brand-new connection, not when editing an existing one.
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>2</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Fill in the Sheet ID and Tab Name once — it's shared by every table below.</div>
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>3</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>For each table, click "+ Add another table" and fill in its own block.</div>
                                Each table needs its own Page, Module key, Label, Header Row, and Range — since
                                each one starts on a different row of the same tab. Example: a second table
                                starting at row 49, columns A to H — Header Row <span style={code}>49</span>,
                                Range <span style={code}>A49:H82</span> (stop one row before the next table starts).
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>4</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Click "🔍 Detect columns" for each table, check the guessed mapping, then Save.</div>
                                This saves all your tables as separate connections in one go.
                            </div>
                        </div>
                    </div>
                </details>
            </section>

            {/* ══════════════════════════════════════════════════════ */}
            <section id="adding-visualizations" style={section}>
                <h2 style={h2}>④ Adding a chart or KPI card</h2>
                <p style={sub}>
                    Saving a connection just brings the data in — it won't show up on the actual page until
                    you also add at least one chart or KPI card. Under your saved connection in Settings,
                    click <strong>+ Add</strong> to open this form.
                </p>

                <div style={tip}>
                    💡 There's a live preview at the bottom of this form — as you fill things in, you'll see
                    what the chart or card will actually look like before you save it. If the preview looks
                    wrong or empty, that's your signal something above it needs adjusting.
                </div>

                <div style={step}>
                    <div style={stepNum}>1</div>
                    <div style={stepBody}>
                        <div style={stepTitle}>Pick a Visualization Type.</div>
                        <ul style={{ paddingLeft: 18, margin: '8px 0 0' }}>
                            <li><strong>🔢 KPI Card</strong> — one big number (or word) on its own.</li>
                            <li><strong>📊 Bar Chart / 📈 Line Chart</strong> — one thing, compared across categories or over time.</li>
                            <li><strong>🥧 Pie Chart</strong> — how a total splits into parts, as slices.</li>
                            <li><strong>📋 Table</strong> — a plain list of rows.</li>
                            <li><strong>📊 Grouped Bar / 📈 Grouped Line</strong> — several things compared side by side at once.</li>
                        </ul>
                    </div>
                </div>

                {/* ── KPI CARD ── */}
                <details style={accordionCard}>
                    <AccordionHeader badge="KPI CARD" title="🔢 One big number (or word)" />
                    <div id="viz-kpi" style={accordionBody}>
                        <div style={step}>
                            <div style={stepNum}>1</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Give it a KPI Label</div>
                                E.g. "Total Drug Stock Value."
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>2</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Pick the Field to aggregate</div>
                                For scorecard connections this is almost always <span style={code}>value</span>.
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>3</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Pick an Aggregation</div>
                                <strong>Sum</strong> adds rows up, <strong>Average</strong> finds the middle,
                                <strong> Maximum/Minimum</strong> picks highest/lowest, <strong>Latest</strong>{' '}
                                shows just the most recent one.
                            </div>
                            <div style={warn}>
                                ⭐ For scorecard connections, "Latest" is usually right — you rarely want July's
                                number added to August's.
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>4</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Pick a Format</div>
                                Currency/Number/Percent for a numeric KPI, or <strong>Plain text</strong> if the
                                value is words (see the "showing a word" section below).
                            </div>
                        </div>
                    </div>
                </details>

                {/* ── BAR / LINE / PIE ── */}
                <details style={accordionCard}>
                    <AccordionHeader badge="BAR · LINE · PIE" title="📊📈🥧 One thing, plotted" />
                    <div id="viz-bar-line-pie" style={accordionBody}>
                        <div style={step}>
                            <div style={stepNum}>1</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Bar / Line: pick an X Axis and a Y Axis.</div>
                                For a scorecard trend across months, X Axis is usually{' '}
                                <span style={code}>_period</span> and Y Axis is usually{' '}
                                <span style={code}>value</span>.
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>2</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Pie: pick a Category field and a Value field.</div>
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>3</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Bar charts only: Orientation, Sort order, Limit, and an optional Target line.</div>
                                Try a few and watch the preview update rather than guessing.
                            </div>
                        </div>
                    </div>
                </details>

                {/* ── TABLE ── */}
                <details style={accordionCard}>
                    <AccordionHeader badge="TABLE" title="📋 A plain list of rows" />
                    <div id="viz-table" style={accordionBody}>
                        <div style={step}>
                            <div style={stepNum}>1</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Pick which Columns to show.</div>
                                Leave blank to show everything.
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>2</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Pick how many rows show at once.</div>
                                There's a "Load more"/"Show all" option on the page too.
                            </div>
                        </div>
                        <div style={tip}>
                            ⭐ For scorecards: a Table is the easiest way to see every month's value for one
                            KPI at a glance. Combine with "Filter to specific KPIs" below.
                        </div>
                    </div>
                </details>

                {/* ── GROUPED ── */}
                <details style={accordionCard}>
                    <AccordionHeader badge="GROUPED BAR · GROUPED LINE" title="📊📈 Comparing several things side by side" />
                    <div id="viz-grouped" style={accordionBody}>
                        <div style={step}>
                            <div style={stepNum}>1</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Pick an X Axis.</div>
                                Usually <span style={code}>_period</span> for month-by-month.
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>2</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Add one "series" per thing you're comparing.</div>
                                Each becomes one bar/line — give each a label and colour.
                            </div>
                        </div>
                        <div style={warn}>
                            ⭐ Comparing scorecard sub-values (Pharmacist/Porter/Admin)? See the "splitting a
                            squashed KPI" section below — one click sets it all up.
                        </div>
                    </div>
                </details>

                {/* ── SCORECARD: FILTER ── */}
                <details style={accordionCardPurple}>
                    <AccordionHeader badge="⭐ SCORECARD ESSENTIAL" badgeStyle={typeLabelPurple} title='"Filter to specific KPIs" — always do this for scorecards' />
                    <div id="viz-scorecard-filter" style={accordionBody}>
                        <p style={{ fontSize: 13, marginBottom: 12 }}>
                            A KPI Scorecard connection holds <strong>every single KPI mixed together</strong>.
                            Without narrowing it down, a chart tries to combine unrelated numbers (a percentage
                            plus a headcount) into one meaningless total.
                        </p>
                        <div style={step}>
                            <div style={stepNum}>1</div>
                            <div style={stepBody}><div style={stepTitle}>Scroll to "Filter to specific KPIs."</div></div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>2</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Pick a Category (optional).</div>
                                Narrows the metric list below to just that group.
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>3</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Pick the exact Metric(s).</div>
                                Pulled directly from your real sheet. KPI Cards and Line Charts only allow one
                                metric at a time.
                            </div>
                        </div>
                    </div>
                </details>

                {/* ── SCORECARD: SPLIT ── */}
                <details style={accordionCardPurple}>
                    <AccordionHeader badge="⭐ SCORECARD ESSENTIAL" badgeStyle={typeLabelPurple} title="Splitting a squashed KPI into its own bars" />
                    <div id="viz-scorecard-split" style={accordionBody}>
                        <p style={{ fontSize: 13, marginBottom: 12 }}>
                            Some KPIs pack several sub-values into one cell (Pharmacist/Pharm. Tech./Porter/
                            Admin). Compare those against each other with these steps.
                        </p>
                        <div style={step}>
                            <div style={stepNum}>1</div>
                            <div style={stepBody}><div style={stepTitle}>Pick "Grouped Bar Chart" or "Grouped Line Chart."</div></div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>2</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Use "Filter to specific KPIs" first.</div>
                                Pick the exact category and metric before the next step.
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>3</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Click "🪄 Auto-split into one series per value."</div>
                                Reads the real sub-values from your sheet and sets up one bar/line for each,
                                colours included — one click.
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>4</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Want to adjust one manually?</div>
                                Use the "Split value" dropdown next to that series.
                            </div>
                        </div>
                    </div>
                </details>

                {/* ── SCORECARD: TEXT ── */}
                <details style={accordionCardPurple}>
                    <AccordionHeader badge="⭐ SCORECARD ESSENTIAL" badgeStyle={typeLabelPurple} title="Showing a word instead of a number" />
                    <div id="viz-scorecard-text" style={accordionBody}>
                        <p style={{ fontSize: 13, marginBottom: 12 }}>
                            Some KPIs aren't numbers — "Most prescribed drug" holds a drug name. Here's how to
                            show one as a KPI card.
                        </p>
                        <div style={step}>
                            <div style={stepNum}>1</div>
                            <div style={stepBody}><div style={stepTitle}>Pick "KPI Card."</div></div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>2</div>
                            <div style={stepBody}><div style={stepTitle}>Filter to the exact category and metric.</div></div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>3</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Set Aggregation to "Latest," Format to "Plain text."</div>
                            </div>
                        </div>
                        <div style={step}>
                            <div style={stepNum}>4</div>
                            <div style={stepBody}>
                                <div style={stepTitle}>Want one specific month?</div>
                                Once on the page, use the card's own month dropdown in the corner.
                            </div>
                        </div>
                        <div style={tip}>
                            💡 Want every month's answer at once instead of just one? Use a{' '}
                            <strong>Table</strong> instead.
                        </div>
                    </div>
                </details>
            </section>

            {/* ══════════════════════════════════════════════════════ */}
            <section id="troubleshooting" style={section}>
                <h2 style={h2}>⑤ Something's not showing up — help!</h2>
                <p style={sub}>Find the situation that matches what you're seeing, and try the fix listed under it.</p>

                <div style={trouble}>
                    <div style={troubleQ}>"I saved everything but the page still says nothing's connected."</div>
                    <div style={troubleA}>
                        Check that "Test & Load" turned green. A red result means the sheet isn't shared
                        correctly, or the link was copied wrong — see Step ① above.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"It says the tab wasn't found, but I can see the tab in my sheet."</div>
                    <div style={troubleA}>
                        Tab names have to match <strong>exactly</strong>, capital letters included. Copy the
                        name directly from the tab label at the bottom of your Google Sheet.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"One of my KPI numbers looks like '04:04:01:01' or '171---78' instead of splitting apart."</div>
                    <div style={troubleA}>
                        Make sure the column next to your measure (the one with small helper text) was given a
                        role during "Show me the columns" — that's usually where the split labels live. If the
                        values are separated by something other than a colon, describe that row in the
                        "Advanced" section — see Type C above.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"My KPI card shows '0' but the actual value is a word, like a drug name."</div>
                    <div style={troubleA}>
                        Set "Aggregation" to <strong>Latest</strong> and "Format" to <strong>Plain text</strong> —
                        see "showing a word instead of a number" above.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"I made a Grouped Bar/Line chart to compare things like Pharmacist vs. Porter, but every bar shows the exact same number."</div>
                    <div style={troubleA}>
                        Each series needs a "Split value" set — otherwise every series just reads the same
                        overall number. Delete the series, filter to the exact category/metric first, then
                        click <strong>"🪄 Auto-split into one series per value."</strong>
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"My scorecard chart is mixing numbers from completely different KPIs together."</div>
                    <div style={troubleA}>
                        Use "Filter to specific KPIs" to pick a category and/or exact metric — without it, a
                        chart adds unrelated numbers together, which is never meaningful.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"My connection saved, but it's sitting in the wrong tab of the page, or under 'Uncategorised.'"</div>
                    <div style={troubleA}>
                        Open the connection again and check both <strong>Page</strong> and{' '}
                        <strong>Module key</strong> — Module key controls which internal tab it lands in.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"A chart I made isn't showing up anywhere, even though I saved it."</div>
                    <div style={troubleA}>
                        Check for a grayed-out "Hidden" tag next to it — there's a small eye icon that toggles
                        a chart on/off without deleting it.
                    </div>
                </div>
            </section>

            <div style={{ ...tip, textAlign: 'center', marginTop: 40 }}>
                Still stuck after trying the steps above? Reach out to whoever manages this system for you —
                bring a screenshot of exactly what you're seeing, it makes it much faster to help.
            </div>
        </div>
    );
}