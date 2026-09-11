/**
 * app/dashboard/settings/connection-guide/page.jsx
 *
 * SAVE THIS FILE AT EXACTLY THAT PATH so Next.js's App Router turns it into
 * its own page, reachable at /dashboard/settings/connection-guide — that's
 * what lets it open in a brand new browser tab (see the button added to
 * HelpGuide.jsx) so someone can follow along here while doing the actual
 * steps in Settings in the other tab.
 *
 * No custom client-side JavaScript needed — this is plain HTML with in-page
 * "jump link" navigation (the <a href="#section-id"> links below) and native
 * <details>/<summary> accordions for the connection types. Modern browsers
 * automatically expand a <details> element when a fragment link points at
 * content inside it, so clicking a "Jump to" link both scrolls to and opens
 * the right accordion — and the built-in disclosure triangle still lets
 * someone open/close any of them by hand. Works even if something else on
 * the page fails to load.
 *
 * IMAGE PLACEHOLDERS: every <Image> below has a plain-english import
 * describing what screenshot goes there. Drop your real screenshots into
 * /src/assets/ using those exact file names and they'll show up
 * automatically — nothing else to wire up.
 *
 * NOTE: KPIMultiTab below is a NEW placeholder file — Type C and Type D used
 * to share the same screenshot (KPI) even though their captions describe
 * different layouts (one master tab vs. one tab per month). Add a
 * kpi_sheet_multi_tab.webp screenshot to /src/assets/ so this import
 * resolves; until then this line will fail the build.
 */
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

const typeCard = {
    border: '2px solid var(--border, #E0E4EA)', borderRadius: 12,
    padding: 20, marginBottom: 20, background: '#fff',
};
const typeSummary = {
    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
    margin: -20, padding: 20, borderRadius: 12,
};
const typeLabel = {
    display: 'inline-block', fontSize: 11, fontWeight: 800, color: '#fff',
    background: '#117A65', padding: '3px 10px', borderRadius: 99, flexShrink: 0,
};
const typeSummaryTitle = { fontSize: 16, fontWeight: 800, color: 'var(--navy, #1B2631)' };
const typeBody = { paddingTop: 16 };
const imgFrame = {
    border: '1px dashed var(--border, #E0E4EA)', borderRadius: 8,
    padding: 8, background: '#FAFBFC', marginTop: 10, marginBottom: 10,
};
const imgStyle = { width: '100%', height: 'auto', maxWidth: 2000, display: 'block', borderRadius: 6 };
const imgCaption = { fontSize: 11, color: 'var(--muted, #7F8C9A)', marginTop: 6, fontStyle: 'italic' };

const trouble = {
    border: '1px solid #F1948A', background: '#FEECEC', borderRadius: 10,
    padding: '14px 18px', marginBottom: 12,
};
const troubleQ = { fontWeight: 700, color: '#C0392B', fontSize: 13.5, marginBottom: 6 };
const troubleA = { fontSize: 13, color: 'var(--text, #1B2631)' };

/**
 * One collapsible "type of sheet" card, built from a native <details>
 * element so it needs zero client-side JS: the browser opens it on its own
 * when a fragment link points at the anchor placed just inside the body,
 * and the <summary> row is natively clickable to open/close by hand.
 */
function TypeAccordion({ anchorId, typeLetter, title, cardStyle, labelStyle, children }) {
    return (
        <details className="guide-accordion" style={cardStyle || typeCard}>
            <summary style={typeSummary}>
                <span style={labelStyle || typeLabel}>{typeLetter}</span>
                <span style={typeSummaryTitle}>{title}</span>
            </summary>
            <div style={typeBody}>
                {/* Empty anchor placed inside the collapsible content — this is
                    what the browser detects as "hidden inside a closed
                    <details>" and force-opens when a jump link targets it. */}
                <span id={anchorId} />
                {children}
            </div>
        </details>
    );
}

export default function ConnectionGuidePage() {
    return (
        <div style={page}>
            {/* Minimal styling for the disclosure marker — everything else on
                this page is inline styles, but the ::marker / ::after pseudo
                elements needed for a custom chevron can only be reached with
                real CSS. */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                .guide-accordion > summary { list-style: none; }
                .guide-accordion > summary::-webkit-details-marker { display: none; }
                .guide-accordion > summary::after {
                    content: '▾';
                    margin-left: auto;
                    color: var(--muted, #7F8C9A);
                    transition: transform 0.15s ease;
                }
                .guide-accordion[open] > summary::after { transform: rotate(180deg); }
            `,
                }}
            />

            <h1 style={h1}>📖 How to Connect a Google Sheet — Step by Step</h1>
            <p style={intro}>
                This page walks you through connecting a Google Sheet, from start to finish, in plain
                everyday language — no computer knowledge needed. Keep this tab open, and switch back and
                forth to your Settings tab as you follow along.
            </p>

            {/* ── Jump nav ───────────────────────────────────────── */}
            <div style={navBox}>
                <div style={navTitle}>Jump to a section</div>
                <a href="#before-you-start" style={navLink}>① Before you start (do this no matter what kind of sheet you have)</a>
                <a href="#which-type" style={navLink}>② Which type of sheet do I have? (look at the pictures)</a>
                <a href="#type-one-tab" style={navLink}>&nbsp;&nbsp;&nbsp;→ A. A simple list (One Tab)</a>
                <a href="#type-multi-tab" style={navLink}>&nbsp;&nbsp;&nbsp;→ B. Same list, split across tabs (Multiple Tabs)</a>
                <a href="#type-scorecard" style={navLink}>&nbsp;&nbsp;&nbsp;→ C. A report card (KPI Scorecard)</a>
                <a href="#type-scorecard-multi" style={navLink}>&nbsp;&nbsp;&nbsp;→ D. A report card split by month (KPI Scorecard, multiple tabs)</a>
                <a href="#type-multi-table" style={navLink}>&nbsp;&nbsp;&nbsp;→ E. Several tables stacked in one tab</a>
                <a href="#adding-visualizations" style={navLink}>③ Adding a chart or KPI card</a>
                <a href="#viz-kpi" style={navLink}>&nbsp;&nbsp;&nbsp;→ KPI Card (one big number)</a>
                <a href="#viz-bar-line-pie" style={navLink}>&nbsp;&nbsp;&nbsp;→ Bar / Line / Pie Chart</a>
                <a href="#viz-table" style={navLink}>&nbsp;&nbsp;&nbsp;→ Table</a>
                <a href="#viz-grouped" style={navLink}>&nbsp;&nbsp;&nbsp;→ Grouped Bar / Grouped Line (comparing several things)</a>
                <a href="#viz-scorecard-filter" style={navLink}>&nbsp;&nbsp;&nbsp;→ ⭐ Scorecard connections: the "Filter to specific KPIs" step</a>
                <a href="#viz-scorecard-split" style={navLink}>&nbsp;&nbsp;&nbsp;→ ⭐ Scorecard connections: splitting a squashed KPI into its own bars</a>
                <a href="#viz-scorecard-text" style={navLink}>&nbsp;&nbsp;&nbsp;→ ⭐ Scorecard connections: showing a word instead of a number</a>
                <a href="#troubleshooting" style={navLink}>④ Something's not showing up — help!</a>
            </div>

            {/* ══════════════════════════════════════════════════════ */}
            <section id="before-you-start" style={section}>
                <h2 style={h2}>① Before you start</h2>
                <p style={sub}>These steps are exactly the same no matter what kind of sheet you have. Do these first.</p>

                <div style={step}>
                    <div style={stepNum}>1</div>
                    <div style={stepBody}>
                        <div style={stepTitle}>Open your Google Sheet, and click the blue "Share" button (top-right corner of the sheet).</div>
                        Make sure the special email address your administrator gave you has been added there
                        with at least "Viewer" access. This is what lets our system read your sheet — without
                        this step, nothing will work, even if everything else is perfect.
                    </div>
                </div>

                <div style={step}>
                    <div style={stepNum}>2</div>
                    <div style={stepBody}>
                        <div style={stepTitle}>Copy the sheet's link.</div>
                        Click into the address bar at the top of your browser while the sheet is open, and
                        copy the whole web address. It'll look something like{' '}
                        <span style={code}>https://docs.google.com/spreadsheets/d/......</span>
                    </div>
                </div>

                <div style={step}>
                    <div style={stepNum}>3</div>
                    <div style={stepBody}>
                        <div style={stepTitle}>Go to Settings → Connections, and click "+ Add Connection."</div>
                        This opens the connection form where everything below happens.
                    </div>
                </div>

                <div style={step}>
                    <div style={stepNum}>4</div>
                    <div style={stepBody}>
                        <div style={stepTitle}>Paste your link into "Google Sheet URL or ID," then click "🔌 Test & Load."</div>
                        A green message means it worked and it found your sheet's tabs. A red message means
                        something's wrong — almost always it means Step 1 (sharing) wasn't done, or the link
                        was copied incorrectly.
                    </div>
                </div>

                <div style={tip}>
                    💡 Once "Test & Load" is green, you're ready for the next part — figuring out
                    <strong> which shape your sheet is</strong>, so you fill in the rest of the form correctly.
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════ */}
            <section id="which-type" style={section}>
                <h2 style={h2}>② Which type of sheet do I have?</h2>
                <p style={sub}>
                    Click a card below to open it up and compare it against your sheet (or use the "Jump to"
                    links above — they'll open the right one for you). Only open the one you need at a time
                    so this doesn't turn into a wall of pictures and steps.
                </p>

                {/* ── TYPE A ── */}
                <TypeAccordion anchorId="type-one-tab" typeLetter="TYPE A" title={'A simple list — "One Tab"'}>
                    <p style={{ fontSize: 13, marginBottom: 4 }}>
                        Your sheet has <strong>one row for every single thing</strong> — one row per purchase,
                        one row per staff member, one row per item in stock. All of it lives in a single tab
                        at the bottom of the screen. This is the most common type.
                    </p>
                    <div style={imgFrame}>
                        <Image width={770} height={180} src={NormalPic} alt="Example of a one-tab sheet — one row per record" style={imgStyle} />
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
                            <div style={stepTitle}>Pick "One tab" under "Which tabs should we fetch from?"</div>
                            Then type the exact name of the tab your data is in (the little labels along the
                            bottom of your Google Sheet).
                        </div>
                    </div>

                    <div style={step}>
                        <div style={stepNum}>3</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Set the Range and Header Row.</div>
                            <strong>Range</strong> is which part of the sheet to read. If your whole sheet is
                            one table, leave it as <span style={code}>A:Z</span> (this just means "every column
                            from A to Z"). <strong>Header Row Number</strong> is which row (counting from the
                            very top of the sheet — row 1, row 2, row 3...) has your column titles
                            (like "Name," "Quantity," "Date"). Almost always this is <span style={code}>1</span>.
                        </div>
                        <div style={tip}>
                            💡 If your real data doesn't start at the very top of the sheet — say it starts at
                            row 5 — you can narrow the Range to something like <span style={code}>A5:Z100</span>.
                            If you do that, make sure Header Row Number is the actual row your titles are on
                            (in this example, <span style={code}>5</span>) — not <span style={code}>1</span>.
                            The number you type here should always match what you'd count if you scrolled up
                            to it in the real sheet.
                        </div>
                    </div>

                    <div style={step}>
                        <div style={stepNum}>4</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Map your columns.</div>
                            After "Test & Load," your sheet's real column titles appear as suggestions. For
                            each field our system needs (like "quantity" or "date"), match it to the column
                            title from your sheet. Most of the time you can just click the suggested columns
                            shown at the bottom of this section instead of typing anything.
                        </div>
                    </div>

                    <div style={step}>
                        <div style={stepNum}>5</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Click "💾 Save Connection."</div>
                            You're done with the connection. Next, you'd add a chart or KPI card so the data
                            actually shows on the page — that's a separate "+ Add" button under your saved
                            connection.
                        </div>
                    </div>
                </TypeAccordion>

                {/* ── TYPE B ── */}
                <TypeAccordion anchorId="type-multi-tab" typeLetter="TYPE B" title={'Same list, split across tabs — "Multiple Tabs"'}>
                    <p style={{ fontSize: 13, marginBottom: 4 }}>
                        Same idea as Type A (one row per thing, with column titles), but instead of one big
                        tab, someone split it up — one tab for January, one for February, and so on. The
                        columns look the same in every tab.
                    </p>
                    <div style={imgFrame}>
                        <Image width={770} height={250} src={NormalPicTabs} alt="Example of a sheet split across several tabs, one per month" style={imgStyle} />
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
                            <div style={stepTitle}>Pick "Multiple tabs."</div>
                            Then add each tab one at a time: type the tab's exact name, and a "key" will often
                            fill itself in automatically (e.g. typing "January" fills in{' '}
                            <span style={code}>2026-01</span>). You can also just click the tab names shown
                            under "Quick add from sheet" instead of typing.
                        </div>
                    </div>

                    <div style={step}>
                        <div style={stepNum}>3</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Set Range and Header Row Number — same meaning as Type A.</div>
                            These apply the same way to every tab you added in step 2, since they all share the
                            same layout.
                        </div>
                    </div>

                    <div style={step}>
                        <div style={stepNum}>4</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Map your columns, then Save — same as Type A.</div>
                        </div>
                    </div>
                </TypeAccordion>

                {/* ── TYPE C ── */}
                <TypeAccordion anchorId="type-scorecard" typeLetter="TYPE C" title={'A report card — "KPI Scorecard"'}>
                    <p style={{ fontSize: 13, marginBottom: 4 }}>
                        This one looks different: instead of new <strong>rows</strong> being added over time,
                        each measurement (KPI) has exactly <strong>one row, forever</strong> — and the months
                        run <strong>sideways</strong>, left to right, as columns (JAN, FEB, MAR...).
                    </p>
                    <div style={imgFrame}>
                        <Image width={770} height={180} src={KPI} alt="Example of a KPI scorecard sheet — one row per KPI, months as columns" style={imgStyle} />
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
                            <div style={stepTitle}>Pick "KPI Scorecard," then type the exact tab name.</div>
                        </div>
                    </div>

                    <div style={step}>
                        <div style={stepNum}>3</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Answer 3 simple questions about where things sit:</div>
                            "Which row has the category/measure labels?" (usually something like row 6),
                            "Which row does the actual KPI data start on?" (usually a row or two below that),
                            and "Roughly how many KPI rows total?" (a rough guess is fine — overestimating is safe).
                        </div>
                    </div>

                    <div style={step}>
                        <div style={stepNum}>4</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Click "🔍 Show me the columns in that row."</div>
                            This reads your actual sheet and shows you, side by side, exactly what's written
                            in each column at the row you specified — no guessing.
                        </div>
                    </div>

                    <div style={step}>
                        <div style={stepNum}>5</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>For each column shown, say what it is.</div>
                            Using the dropdown under each column, pick one of: <strong>KPI Category</strong>{' '}
                            (a group name), <strong>Description / Measure</strong> (the actual KPI's name —
                            you must pick this for at least one column), <strong>Unit / Target text</strong>{' '}
                            (extra descriptive text next to the measure), <strong>Time period</strong> (a month
                            or week column — you must pick this for at least one column too), or{' '}
                            <strong>Skip this column</strong> if it's not needed.
                        </div>
                        <div style={warn}>
                            ⚠️ Not every sheet groups its KPIs into categories. If yours doesn't, that's fine —
                            just leave "KPI Category" unset on every column and mark your one label column as
                            "Description / Measure" instead. Every KPI will simply sit under one group.
                        </div>
                    </div>

                    <div style={step}>
                        <div style={stepNum}>6</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Only if you see a squashed-together cell — use the Advanced section.</div>
                            Sometimes one month's box for one KPI isn't just one number — it's several jammed
                            together, like <span style={code}>04:04:01:01</span> meaning 4 of one thing, 4 of
                            another, 1 of another, 1 of another. If you spot cells like that, open "Advanced:
                            some cells pack multiple values together," and describe: which category, which KPI
                            number, what each squashed value means in order (comma-separated), and what
                            character separates them (usually <span style={code}>:</span> or{' '}
                            <span style={code}>---</span>). If you don't see any cells like that in your sheet,
                            skip this entirely — most rows don't need it.
                        </div>
                    </div>

                    <div style={step}>
                        <div style={stepNum}>7</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Click "💾 Save Connection."</div>
                        </div>
                    </div>
                </TypeAccordion>

                {/* ── TYPE D ── */}
                <TypeAccordion anchorId="type-scorecard-multi" typeLetter="TYPE D" title={'A report card, split by month — "KPI Scorecard, multiple tabs"'}>
                    <p style={{ fontSize: 13, marginBottom: 4 }}>
                        This is Type C's layout (one row per KPI, months as columns) — except instead of one
                        "Master" tab holding every month, each month gets its <strong>own tab</strong>, often
                        with an extra weekly breakdown inside that tab (Week 1, Week 2, Week 3, Week 4).
                    </p>
                    <div style={imgFrame}>
                        <Image width={770} height={180} src={KPIMultiTab} alt="Example of a KPI scorecard split into one tab per month, each with a weekly breakdown" style={imgStyle} />
                        <div style={imgCaption}>Example: a report-card sheet, but each month is its own tab.</div>
                    </div>

                    <div style={tip}>
                        💡 This type takes a bit more setup than the others, so if this is your first
                        connection, it's worth asking whoever manages this system to help you set up the first
                        one — after that, adding new months to it is much simpler.
                    </div>

                    <h4 style={{ fontSize: 13, fontWeight: 800, margin: '18px 0 10px' }}>Steps for this type:</h4>

                    <div style={step}>
                        <div style={stepNum}>1</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Everything from Type C's steps 1–2 and 5–7 still applies.</div>
                            The category/measure column setup, the "what is this column" step, and the
                            Advanced squashed-cell section all work exactly the same way.
                        </div>
                    </div>

                    <div style={step}>
                        <div style={stepNum}>2</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>The difference: instead of one tab, you list each month's tab separately.</div>
                            Each month tab gets told which of its own columns are "January," "1st–8th," "9th–15th"
                            and so on — because a different tab's columns can represent different weeks. If
                            you're not confident setting this part up, this is the piece worth asking your
                            administrator to configure once as a starting template.
                        </div>
                    </div>
                </TypeAccordion>

                {/* ── TYPE E ── */}
                <TypeAccordion anchorId="type-multi-table" typeLetter="TYPE E" title="Several tables stacked in one tab">
                    <p style={{ fontSize: 13, marginBottom: 4 }}>
                        Your sheet has just <strong>one tab</strong>, but inside that one tab, someone has
                        placed <strong>several separate tables</strong>, one below another — like a KPI table,
                        then a gap, then a devices table, then a gap, then a subscriptions table — all sharing
                        the same tab.
                    </p>
                    <div style={imgFrame}>
                        <Image width={770} height={250} src={MultipleTables} alt="Example of one tab containing several separate stacked tables" style={imgStyle} />
                        <div style={imgCaption}>Example: one tab, but several distinct tables stacked at different rows.</div>
                    </div>

                    <h4 style={{ fontSize: 13, fontWeight: 800, margin: '18px 0 10px' }}>Steps for this type:</h4>

                    <div style={step}>
                        <div style={stepNum}>1</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Before picking anything else, tick "📑 This sheet contains multiple tables stacked in one tab."</div>
                            This only appears when you're creating a brand-new connection, not when editing an
                            existing one.
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
                            Each table needs its own Page, Module key, Label, Header Row, and Range — because
                            each one starts on a different row of the same tab. For example, if your second
                            table's titles are on row 49 and its data runs to row 82 across columns A to H,
                            you'd set Header Row to <span style={code}>49</span> and Range to{' '}
                            <span style={code}>A49:H82</span> — stopping one row before the next table begins.
                        </div>
                    </div>

                    <div style={step}>
                        <div style={stepNum}>4</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Click "🔍 Detect columns" for each table, map its columns, then Save.</div>
                            This saves all your tables as separate connections in one go.
                        </div>
                    </div>
                </TypeAccordion>
            </section>

            {/* ══════════════════════════════════════════════════════ */}
            <section id="adding-visualizations" style={section}>
                <h2 style={h2}>③ Adding a chart or KPI card</h2>
                <p style={sub}>
                    Saving a connection just brings the data in — it won't show up on the actual page until
                    you also add at least one chart or KPI card. Under your saved connection in Settings,
                    click <strong>+ Add</strong> to open this form. Click a card below (or a "Jump to" link
                    above) to open the one that matches what you're trying to build.
                </p>

                <div style={tip}>
                    💡 There's a live preview at the bottom of this form — as you fill things in, you'll see
                    what the chart or card will actually look like before you save it. Use it as you go: if
                    the preview looks wrong or empty, that's your signal something above it needs adjusting,
                    before you save.
                </div>

                <div style={step}>
                    <div style={stepNum}>1</div>
                    <div style={stepBody}>
                        <div style={stepTitle}>Pick a Visualization Type.</div>
                        Each type answers a different question — pick based on what you're trying to show,
                        not what looks nicest:
                        <ul style={{ paddingLeft: 18, margin: '8px 0 0' }}>
                            <li><strong>🔢 KPI Card</strong> — one big number (or word) on its own, e.g. "Total Prescriptions: 3,541."</li>
                            <li><strong>📊 Bar Chart / 📈 Line Chart</strong> — one thing, compared across categories or over time.</li>
                            <li><strong>🥧 Pie Chart</strong> — how a total splits into parts, as slices.</li>
                            <li><strong>📋 Table</strong> — a plain list of rows, when a chart isn't the point — you just want to see the actual data.</li>
                            <li><strong>📊 Grouped Bar Chart / 📈 Grouped Line Chart</strong> — several things compared side by side at once (e.g. Pharmacist vs. Porter vs. Admin, month by month).</li>
                        </ul>
                    </div>
                </div>

                {/* ── KPI CARD ── */}
                <TypeAccordion anchorId="viz-kpi" typeLetter="KPI CARD" title="🔢 One big number (or word)">
                    <div style={step}>
                        <div style={stepNum}>1</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Give it a KPI Label</div>
                            The short title shown above the number, e.g. "Total Drug Stock Value."
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>2</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Pick the Field to aggregate</div>
                            Which column holds the number you want. For scorecard connections this is
                            almost always <span style={code}>value</span> — that's where every KPI's actual
                            reading lives, no matter which KPI you're showing.
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>3</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Pick an Aggregation</div>
                            This decides how many rows get combined into the one number shown:
                            <strong> Sum</strong> adds them all up, <strong>Average</strong> finds the middle,
                            <strong> Maximum/Minimum</strong> picks the highest/lowest, and{' '}
                            <strong>Latest</strong> just shows the most recent one, with nothing added
                            together.
                        </div>
                        <div style={warn}>
                            ⭐ <strong>For scorecard connections, "Latest" is usually the right choice</strong> —
                            you almost never want July's number added to August's number. Use Latest so the
                            card shows one real month's reading. See the dedicated section below for how to
                            pick exactly which month.
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>4</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Pick a Format</div>
                            Currency, Number, or Percent for a numeric KPI. If the KPI's actual value is
                            <strong> words, not a number</strong> (see the dedicated section below), choose
                            <strong> Plain text</strong> instead.
                        </div>
                    </div>
                </TypeAccordion>

                {/* ── BAR / LINE / PIE ── */}
                <TypeAccordion anchorId="viz-bar-line-pie" typeLetter="BAR · LINE · PIE" title="📊📈🥧 One thing, plotted">
                    <div style={step}>
                        <div style={stepNum}>1</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Bar / Line: pick an X Axis and a Y Axis.</div>
                            X Axis is what runs along the bottom (categories, or months). Y Axis is the
                            number being measured for each of those. For a scorecard connection showing a
                            trend across months, X Axis is usually <span style={code}>_period</span> and
                            Y Axis is usually <span style={code}>value</span>.
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>2</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Pie: pick a Category field and a Value field.</div>
                            Category decides how many slices there are; Value decides how big each slice is.
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>3</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Bar charts only: Orientation, Sort order, Limit, and an optional Target line.</div>
                            These just control how the bars are displayed — try a few and watch the preview
                            update rather than guessing.
                        </div>
                    </div>
                </TypeAccordion>

                {/* ── TABLE ── */}
                <TypeAccordion anchorId="viz-table" typeLetter="TABLE" title="📋 A plain list of rows">
                    <div style={step}>
                        <div style={stepNum}>1</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Pick which Columns to show.</div>
                            Click the ones you want, in the order you want them, from the list of available
                            fields. Leave it blank to show everything.
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>2</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Pick how many rows show at once (Default rows shown).</div>
                            There's a "Load more" / "Show all" option on the actual page too, so this is
                            just what it opens with.
                        </div>
                    </div>
                    <div style={tip}>
                        ⭐ <strong>For scorecard connections:</strong> a Table is the easiest way to see every
                        month's value for one KPI at a glance — e.g. every month's "Most prescribed drug" in
                        one list. Combine this with the "Filter to specific KPIs" step below, scoped to that
                        one measure, and each row of the table becomes one month's answer.
                    </div>
                </TypeAccordion>

                {/* ── GROUPED ── */}
                <TypeAccordion anchorId="viz-grouped" typeLetter="GROUPED BAR · GROUPED LINE" title="📊📈 Comparing several things side by side">
                    <p style={{ fontSize: 13, marginBottom: 4 }}>
                        Use this when you want to compare more than one thing on the same chart — for example,
                        Pharmacist headcount vs. Porter headcount, both shown month by month.
                    </p>

                    <div style={step}>
                        <div style={stepNum}>1</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Pick an X Axis.</div>
                            Usually <span style={code}>_period</span> for a month-by-month comparison.
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>2</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Add one "series" per thing you're comparing, under "Values to compare."</div>
                            Each series becomes one bar/line. Give each one a Display label and a colour so
                            they're easy to tell apart on the chart.
                        </div>
                    </div>
                    <div style={warn}>
                        ⭐ <strong>For scorecard connections comparing things like Pharmacist/Porter/Admin</strong>{' '}
                        — see the dedicated "splitting a squashed KPI" section right below. There's a
                        one-click button that sets all of this up for you automatically.
                    </div>
                </TypeAccordion>

                {/* ── SCORECARD: FILTER ── */}
                <TypeAccordion
                    anchorId="viz-scorecard-filter"
                    typeLetter="⭐ SCORECARD ESSENTIAL"
                    title={'"Filter to specific KPIs" — always do this for scorecards'}
                    cardStyle={{ ...typeCard, borderColor: '#D2B4DE', background: '#FCFAFD' }}
                    labelStyle={{ ...typeLabel, background: '#6C3483' }}
                >
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                        A KPI Scorecard connection holds <strong>every single KPI mixed together</strong> in
                        one place — headcounts, percentages, drug names, all of it. If you build a chart
                        without narrowing it down first, the chart will try to combine all of those
                        different kinds of numbers together, which never means anything (adding a percentage
                        to a headcount, for example). This step is what prevents that.
                    </p>

                    <div style={step}>
                        <div style={stepNum}>1</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Scroll to "Filter to specific KPIs" on the form.</div>
                            This section only appears for scorecard connections.
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>2</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Pick a Category (optional).</div>
                            This narrows the list of metrics below it down to just that group — e.g. picking
                            "Clinical Supervision and Leadership" only shows metrics belonging to that group.
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>3</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Pick the exact Metric(s).</div>
                            These are pulled directly from your real sheet, so you're always clicking a real
                            option rather than typing something that might not match. For a KPI Card or Line
                            Chart, you can only pick one metric — that's intentional, since a single number or
                            line only makes sense for one KPI at a time.
                        </div>
                    </div>
                </TypeAccordion>

                {/* ── SCORECARD: SPLIT ── */}
                <TypeAccordion
                    anchorId="viz-scorecard-split"
                    typeLetter="⭐ SCORECARD ESSENTIAL"
                    title="Splitting a squashed KPI into its own bars"
                    cardStyle={{ ...typeCard, borderColor: '#D2B4DE', background: '#FCFAFD' }}
                    labelStyle={{ ...typeLabel, background: '#6C3483' }}
                >
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                        Some KPIs pack several sub-values into one cell — e.g. "Number of pharmacy staff
                        under supervision" holds Pharmacist, Pharm. Tech., Porter, and Admin counts all
                        squashed into one box (see the KPI Scorecard section above). If you want a chart
                        comparing those four things against each other, follow these steps.
                    </p>

                    <div style={step}>
                        <div style={stepNum}>1</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Pick "Grouped Bar Chart" or "Grouped Line Chart" as the type.</div>
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>2</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Use "Filter to specific KPIs" first — pick the exact category and metric.</div>
                            For example: Category = "Clinical Supervision and Leadership," Metric = "Number
                            of pharmacy staff under supervision." Do this before the next step — it's what
                            tells the system which KPI's sub-values to offer you.
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>3</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Click the "🪄 Auto-split into one series per value" button.</div>
                            This button only appears once step 2 is done, and it reads the real sub-values
                            straight from your sheet (Pharmacist, Pharm. Tech., Porter, Admin) and sets up one
                            bar/line for each of them automatically — colours included. You don't need to
                            know what any of this means underneath; one click fills it all in.
                        </div>
                        <div style={tip}>
                            💡 Watch the preview update the moment you click it — you should immediately see
                            four separate bars/lines appear, one per role.
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>4</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Want to adjust one manually? Use the "Split value" dropdown next to that series.</div>
                            Each series row has its own "Split value" picker if you want to swap out or fine-tune
                            one after using the auto-split button.
                        </div>
                    </div>
                </TypeAccordion>

                {/* ── SCORECARD: TEXT ── */}
                <TypeAccordion
                    anchorId="viz-scorecard-text"
                    typeLetter="⭐ SCORECARD ESSENTIAL"
                    title="Showing a word instead of a number"
                    cardStyle={{ ...typeCard, borderColor: '#D2B4DE', background: '#FCFAFD' }}
                    labelStyle={{ ...typeLabel, background: '#6C3483' }}
                >
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                        Some KPIs aren't numbers at all — "Most prescribed drug" holds a drug name like
                        "Ivf Pcm," and "Highest revenue generating drug" works the same way. Here's how to
                        show one of these as a KPI card.
                    </p>

                    <div style={step}>
                        <div style={stepNum}>1</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Pick "KPI Card" as the type.</div>
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>2</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Use "Filter to specific KPIs" — pick the exact category and that metric.</div>
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>3</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Set Aggregation to "Latest," and Format to "Plain text."</div>
                            "Latest" shows the most recent month's answer rather than trying to add drug
                            names together (which isn't possible). "Plain text" tells the card to just
                            display the word as-is.
                        </div>
                    </div>
                    <div style={step}>
                        <div style={stepNum}>4</div>
                        <div style={stepBody}>
                            <div style={stepTitle}>Want one specific month instead of "most recent"?</div>
                            Once the card is on the actual page, it has its own small month dropdown in the
                            corner — switch that to the exact month you want (e.g. "2026-01" for January),
                            and it'll show that month's answer instead.
                        </div>
                    </div>
                    <div style={tip}>
                        💡 Want to see the drug name for <strong>every</strong> month at once instead of just
                        one? Use a <strong>Table</strong> instead of a KPI Card — see the Table section above.
                    </div>
                </TypeAccordion>
            </section>

            {/* ══════════════════════════════════════════════════════ */}
            <section id="troubleshooting" style={section}>
                <h2 style={h2}>④ Something's not showing up — help!</h2>
                <p style={sub}>Find the situation that matches what you're seeing, and try the fix listed under it.</p>

                <div style={trouble}>
                    <div style={troubleQ}>"I saved everything but the page still says nothing's connected."</div>
                    <div style={troubleA}>
                        Go back and check: did "Test & Load" actually turn green? A red result means the sheet
                        isn't shared correctly, or the link was copied wrong — go back to Step 1 in "Before you
                        start" above.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"It says the tab wasn't found, but I can see the tab in my sheet."</div>
                    <div style={troubleA}>
                        Tab names have to match <strong>exactly</strong> — including capital letters and
                        spacing. "master" and "Master" are treated as different tabs. Copy the tab name
                        directly from the little tab label at the bottom of your Google Sheet rather than
                        typing it from memory.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"I picked just part of my sheet (like B5:P45) and now my columns/numbers look wrong or repeated."</div>
                    <div style={troubleA}>
                        This almost always means Header Row Number doesn't match where your Range actually
                        starts. Header Row Number should always be the real row number you'd count if you
                        scrolled up to it in the sheet — not "1" just because it's the first row you're
                        fetching. If your Range starts at row 5, and row 5 really is your header row, Header
                        Row Number should be <span style={code}>5</span>, not <span style={code}>1</span>.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"One of my KPI numbers looks like '04:04:01:01' or '171---78' instead of splitting apart."</div>
                    <div style={troubleA}>
                        Two things to check: first, make sure the column next to your measure (usually the one
                        with small helper text) was picked up during "Show me the columns" — it needs a role
                        assigned, since that's often where the split labels live. Second, if the values are
                        separated by something other than a colon (like <span style={code}>---</span>), you'll
                        need to describe that row in the "Advanced: some cells pack multiple values together"
                        section — see Type C, Step 6 above.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"My KPI card shows '0' but the actual value in my sheet is a word, like a drug name or a person's name."</div>
                    <div style={troubleA}>
                        On the chart/KPI setup screen, change "Aggregation" to <strong>Latest</strong> and
                        "Format" to <strong>Plain text</strong>. KPI cards add numbers together by default,
                        which doesn't make sense for words — these two settings tell it to just show the
                        actual text instead.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"My connection saved, but it's sitting in the wrong tab of the page, or under 'Uncategorised.'"</div>
                    <div style={troubleA}>
                        Open the connection again and double check both the <strong>Page</strong> and{' '}
                        <strong>Module key</strong> fields — Module key specifically controls which internal
                        tab it lands in, and it needs to match what that page is actually looking for.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"A chart I made isn't showing up anywhere, even though I saved it."</div>
                    <div style={troubleA}>
                        Check for a grayed-out "Hidden" tag next to it in the connection's visualization list
                        — there's a small eye icon that toggles a chart on/off without deleting it. It might
                        have been switched off by accident.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"I made a Grouped Bar/Line chart to compare things like Pharmacist vs. Porter, but every bar shows the exact same number."</div>
                    <div style={troubleA}>
                        Each series you add needs to be told which sub-value it represents, using the
                        "Split value" dropdown — otherwise every series just reads the same overall number.
                        The easiest fix: delete the series you added, use "Filter to specific KPIs" to pick
                        the exact category and metric first, then click the{' '}
                        <strong>"🪄 Auto-split into one series per value"</strong> button — it sets all of
                        this up correctly in one click. See "Splitting a squashed KPI into its own bars"
                        above.
                    </div>
                </div>

                <div style={trouble}>
                    <div style={troubleQ}>"My scorecard chart is mixing numbers from completely different KPIs together."</div>
                    <div style={troubleA}>
                        Scorecard connections hold every KPI in one place, so any chart built from one needs
                        to be told which specific KPI(s) to look at. On the chart setup screen, use the
                        "Filter to specific KPIs" section to pick a category and/or exact metric — without
                        this, the chart adds unrelated numbers together (like a percentage plus a headcount),
                        which is never meaningful.
                    </div>
                </div>
            </section>

            <div style={{ ...tip, textAlign: 'center', marginTop: 40 }}>
                Still stuck after trying the steps above? Reach out IT department —
                bring a screenshot of exactly what you're seeing, it makes it much faster to help.
            </div>

            <a
                href="#"
                aria-label="Back to top"
                style={{
                    position: 'fixed',
                    right: '3%',
                    bottom: '5%',
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#117A65',
                    fontSize: 18,
                    fontWeight: 800,
                    color: '#ffffff',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    borderRadius: '50%',
                    border: 'none',
                }}
            >
                ↑
            </a>
        </div>
    );
}