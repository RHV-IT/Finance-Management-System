'use client';

/**
 * components/HelpGuide.jsx
 *
 * Plain-language reference for the Settings → Guide tab. Written for
 * someone with zero technical background — every section defines its
 * terms before using them, and leans on the pharmacy scorecard sheet as
 * a running concrete example since that's the most complex case in the
 * whole system.
 *
 * Built with native <details>/<summary> — no extra state needed, and
 * it degrades fine even if styles fail to load.
 *
 * NEW: a button linking to the standalone step-by-step guide page at
 * /dashboard/settings/connection-guide (see connection-guide-page.jsx —
 * save it at app/dashboard/settings/connection-guide/page.jsx). It opens
 * in a new browser tab (target="_blank") specifically so someone can keep
 * it open on one side of their screen while actually filling in the
 * connection form in Settings on the other side, without losing their
 * place in either.
 */

const sectionStyle = {
    background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
    marginBottom: 10, overflow: 'hidden',
};
const summaryStyle = {
    padding: '14px 18px', fontSize: 13, fontWeight: 700, color: 'var(--navy)',
    cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8,
};
const bodyStyle = {
    padding: '0 18px 18px', fontSize: 12, color: 'var(--text)', lineHeight: 1.7,
};
const codeStyle = { background: '#F4F6F9', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 };

function Section({ icon, title, children, open }) {
    return (
        <details style={sectionStyle} open={open}>
            <summary style={summaryStyle}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                {title}
            </summary>
            <div style={bodyStyle}>{children}</div>
        </details>
    );
}

export default function HelpGuide() {
    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--navy)', marginBottom: 4 }}>📖 Guide</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    Click any section to expand it. This is meant to be a reference you come back to,
                    not something you read start-to-finish once.
                </div>
            </div>

            {/* Step-by-step guide button — opens its own page in a new tab so it can
                sit alongside the actual connection form while someone follows along. */}
            <a
                href="/connection-guide"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, #117A65, #0E6655)', color: '#fff',
                    borderRadius: 12, padding: '16px 20px', marginBottom: 20,
                    textDecoration: 'none', boxShadow: '0 2px 8px rgba(17,122,101,0.25)',
                }}
            >
                <div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>
                        🧭 Open the full step-by-step guide
                    </div>
                    <div style={{ fontSize: 11.5, opacity: 0.9 }}>
                        Opens in a new tab with pictures — keep it open next to Settings while you set up a connection.
                    </div>
                </div>
                <div style={{ fontSize: 20, flexShrink: 0, marginLeft: 12 }}>↗</div>
            </a>

            <Section icon="🔗" title="What is a 'Connection'?" open>
                <p>
                    A <strong>connection</strong> links one Google Sheet (or one specific tab/section of one)
                    to a page in this app. Once connected, that page automatically pulls live numbers from
                    the sheet — no copy-pasting, no re-uploading. Update the sheet, refresh the page, see
                    the new numbers.
                </p>
                <p>
                    Every connection needs: a <strong>Sheet ID or link</strong>, which <strong>tab</strong> to
                    read from, and which <strong>page</strong> in the app it should feed.
                </p>
            </Section>

            <Section icon="🧭" title="The 3 shapes of sheet, and which mode fits">
                <p>When you click <strong>+ Add Connection</strong>, a short wizard asks what your sheet looks like. Here's what each answer means underneath:</p>
                <p><strong>1. "Each row is one record"</strong> → <em>One tab</em> mode. A purchase log, a stock list, a staff roster — one row per thing, columns describing it. This covers most sheets.</p>
                <p><strong>2. "Same list, split across tabs"</strong> → <em>Multiple tabs</em> mode. Same columns every time, just one tab per month/period. The app fetches each tab and stitches them together.</p>
                <p><strong>3. "It's a report card"</strong> → <em>KPI Scorecard</em> mode. This one's different in kind, not just in size — see the next section, it needs its own explanation.</p>
                <p>There's a 4th option, <em>All tabs</em>, for when you want every tab in the file merged automatically without picking them one by one.</p>
                <p>
                    Not sure which one matches your sheet? The{' '}
                    <a href="/dashboard/settings/connection-guide" target="_blank" rel="noopener noreferrer" style={{ color: '#117A65', fontWeight: 700 }}>
                        step-by-step guide
                    </a>{' '}
                    above has real pictures of each type side by side.
                </p>
            </Section>

            <Section icon="📊" title="KPI Scorecard mode, explained properly">
                <p>
                    A normal sheet adds <strong>more rows</strong> as time passes — a new purchase, a new day.
                    A scorecard sheet is the opposite: each KPI gets exactly <strong>one row, forever</strong>,
                    and new months just add new <strong>columns</strong> going sideways. Picture:
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 10.5, background: '#F4F6F9', padding: '10px 12px', borderRadius: 6, whiteSpace: 'pre' }}>
{`KPI                    | JAN | FEB | MAR
Prescriptions Dispensed| 500 | 520 | 480`}
                </p>
                <p>Setting one of these up asks for a few things a normal connection doesn't:</p>
                <ul style={{ paddingLeft: 18, margin: '6px 0' }}>
                    <li><strong>Which row has the labels</strong> — where "KPI CATEGORY", "Measures" etc. actually sit in the sheet.</li>
                    <li><strong>Which row the real data starts on</strong> — usually a row or two below the labels.</li>
                    <li><strong>What each column is</strong> — you don't type this, you click "Show me the columns" and pick from a dropdown for each one: Category, Description, Time Period, or Skip.</li>
                </ul>
                <p>
                    <strong>Composite cells</strong> — occasionally one month's cell isn't one number, it's several
                    squashed together, like <code style={codeStyle}>04:04:01:01</code> meaning
                    4 pharmacists, 4 pharm techs, 1 porter, 1 admin. There's an optional "Advanced" section
                    for exactly this — you only need it if you actually see cells like that; most rows don't.
                </p>
            </Section>

            <Section icon="🔤" title="Matching columns: by name vs. by letter">
                <p>
                    Normally the app finds your data by the <strong>column's header text</strong> — you type
                    "Qty On Hand" and it looks for a column titled exactly that.
                </p>
                <p>
                    Sometimes that doesn't work: a column has <strong>no header at all</strong>, or its header
                    text <strong>changes</strong> depending on which tab you're looking at (e.g. a column
                    literally called "JAN" in the January tab and "FEB" in the February tab). For those cases,
                    switch that one field's "Match by" to <strong>Column letter</strong> and just type the
                    letter (like <code style={codeStyle}>F</code>) instead — a column's letter position never
                    changes, even when its label does.
                </p>
            </Section>

            <Section icon="🗂️" title="Module key & Page — what they actually do">
                <p>
                    <strong>Page</strong> is which page in the app this connection shows up on (Pharmacy,
                    Debtors, etc.).
                </p>
                <p>
                    Some pages have their own internal tabs (Pharmacy has Dispensing, Drug Stock, My Requests,
                    and a KPI Scorecard). <strong>Module key</strong> is what decides which of those internal
                    tabs a connection lands in. You don't need to invent or type this yourself — once you pick
                    a Page, a dropdown shows you the real tabs that page actually has, and you just pick one.
                </p>
                <p>
                    If a page has no tabs, or only one sensible destination, this often fills itself in
                    automatically — nothing to pick.
                </p>
            </Section>

            <Section icon="📈" title="Adding visualizations (charts & KPI cards)">
                <p>
                    Once a connection is saved, click <strong>+ Add</strong> under it in the connections list
                    to build a chart or KPI card from its data. Pick a type (KPI Card, Bar, Line, Pie, Table,
                    or a grouped version comparing several things at once), then pick which fields feed it —
                    the form shows you the real field names available, you're never typing them blind.
                </p>
                <p>
                    <strong>For KPI Scorecard connections specifically:</strong> every KPI in the whole
                    scorecard lives together in one place, so a chart needs to be told <em>which</em> KPI(s)
                    to look at — otherwise it would mix unrelated numbers together (a percentage added to a
                    headcount means nothing). That's what the "Filter to specific KPIs" section is for: pick a
                    category and/or the exact metric(s) you want, pulled live from the real sheet so there's no
                    risk of a typo matching nothing.
                </p>
                <p>
                    There's also a live preview at the bottom of the visualization form — watch it update as
                    you fill things in, so you catch mistakes before saving. For a full walkthrough of every
                    chart type, especially the scorecard-specific steps (filtering to one KPI, splitting a
                    squashed cell into separate bars, and showing a word instead of a number), see the{' '}
                    <a href="/dashboard/settings/connection-guide#adding-visualizations" target="_blank" rel="noopener noreferrer" style={{ color: '#117A65', fontWeight: 700 }}>
                        visualization section of the full guide
                    </a>.
                </p>
            </Section>

            <Section icon="🙈" title="Hiding a visualization without deleting it">
                <p>
                    Every visualization has a small eye button next to Edit and Delete. Click it to hide a
                    chart from every page instantly — its full configuration stays saved, so you (or someone
                    else) can bring it back later with one click. Use this for old visualizations you don't
                    currently need but don't want to lose.
                </p>
            </Section>

            <Section icon="🛠️" title="Troubleshooting: I saved a connection but nothing shows up">
                <p>Work through these in order — this covers almost every case:</p>
                <ol style={{ paddingLeft: 18, margin: '6px 0' }}>
                    <li><strong>Is the Sheet ID/link filled in and did Test and Load succeed?</strong> A red X means the sheet isn't shared correctly, or the link is wrong.</li>
                    <li><strong>Does the Tab Name match exactly?</strong> Tab names are case- and spelling-sensitive.</li>
                    <li><strong>For Scorecard mode:</strong> did you mark at least one column Description/Measure and at least one Time Period? Both are required — the connection saves fine without them but produces zero usable rows.</li>
                    <li><strong>Does Page + Module match what the page's code is actually looking for?</strong> If it landed in Uncategorised or the wrong tab, re-open it and check both.</li>
                    <li><strong>Is the visualization hidden?</strong> Check for a grayed-out Hidden tag in the connection's visualization list.</li>
                </ol>
                <p>
                    For more detailed, step-by-step troubleshooting (including the trickier scorecard-specific
                    issues), see the{' '}
                    <a href="/dashboard/settings/connection-guide#troubleshooting" target="_blank" rel="noopener noreferrer" style={{ color: '#117A65', fontWeight: 700 }}>
                        troubleshooting section of the full guide
                    </a>.
                </p>
            </Section>
        </div>
    );
}