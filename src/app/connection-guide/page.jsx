/**
 * app/dashboard/settings/connection-guide/page.jsx
 *
 * A guided walkthrough instead of a long page: one small step per screen,
 * with Back / Next buttons. The reader answers two simple questions
 * ("what does your sheet look like?" and "what do you want to show?") and the
 * guide builds the right path for them. A "Need help?" button opens a
 * pick-your-problem list at any time.
 *
 * NOTE: the "Open the connection window" screen describes ConnectionWizard
 * from the tabMode values it hands to ConnectionForm — it hasn't been checked
 * against the wizard's real file. Update that wording if it differs.
 *
 * UPDATED: steps now follow the actual top-to-bottom order of fields inside
 * ConnectionForm.jsx (ID/Department → Page/Label/Module/Section → Sheet
 * link+Test&Load → Range/Header Row → "Which tabs should we fetch from?" box
 * → column mapping → save) instead of jumping around the form. Also adds:
 * the Share-dialog "Ask to send" note, where the Google Sheets tab sits in
 * Settings (left of Guide), exact on-screen position of the Tab Name field,
 * and Department/Page alignment guidance. Four new screenshots are reserved
 * below — see the TODO comments next to each import for exactly what to
 * capture and where to save it.
 *
 * STILL OPEN (see chat): the visualization steps ("Chart Title" field and
 * its position, plus every other VizForm.jsx input) haven't been updated
 * yet — that needs components/VizForm.jsx, which wasn't available when this
 * pass was made.
 */
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import NormalPic from '../../../src/assets/normal_pic.webp';
import NormalPicTabs from '../../../src/assets/normal_multiple_tabs.webp';
import KPI from '../../../src/assets/kpi_sheet.webp';
import KPIMultiTab from '../../../src/assets/KPIMultiple.webp';
import MultipleTables from '../../../src/assets/multiple_tables.webp';

// TODO(Teni): save a screenshot of the Settings page's top tab row (with
// "🔗 Google Sheets" visible on the far left, next to "📖 Guide") at this
// path: src/assets/settings_tabs_row.webp
import SettingsTabsPic from '../../../src/assets/multiple_tables.webp';

// TODO(Teni): save a screenshot of the "Which tabs should we fetch from?"
// box with "1️⃣ One tab" selected and the "Tab Name (exact)" field visible
// right underneath the four cards, at: src/assets/tab_name_single.webp
import TabNameSinglePic from '../../../src/assets/multiple_tables.webp';

// TODO(Teni): save a screenshot of the KPI Scorecard box with its
// "Tab Name (exact)" field (the very first field inside it) visible, at:
// src/assets/tab_name_scorecard.webp
import TabNameScorecardPic from '../../../src/assets/multiple_tables.webp';

// TODO(Teni): save a screenshot of the Google Sheet's Share dialog — ideally
// one showing the "Ask to send" button, and one showing the normal access
// dropdown + Send button, at: src/assets/share_sheet_dialog.webp
import ShareSheetPic from '../../../src/assets/multiple_tables.webp';

const css = `
@keyframes gz-fwd{from{opacity:0;transform:translateX(44px)}to{opacity:1;transform:none}}
@keyframes gz-back{from{opacity:0;transform:translateX(-44px)}to{opacity:1;transform:none}}
@keyframes gz-fade{from{opacity:0}to{opacity:1}}
@keyframes gz-pop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
@keyframes gz-nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}
@keyframes gz-bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-18px)}}
@keyframes gz-glow{0%,100%{box-shadow:0 6px 18px rgba(17,122,101,.35)}50%{box-shadow:0 6px 28px rgba(17,122,101,.65)}}

.gz{max-width:800px;margin:0 auto;padding:28px 20px 60px;font-size:20px;line-height:1.7;color:#1B2631}
.gz *{box-sizing:border-box}
.gz button{font-family:inherit}
.gz button:focus-visible,.gz-choice:focus-visible{outline:4px solid #F5B041;outline-offset:3px}

.gz-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
.gz-brand{font-size:19px;font-weight:800;color:#0E5F4E}
.gz-help{background:#fff;border:2px solid #C0392B;color:#A93226;font-weight:800;font-size:17px;padding:10px 18px;border-radius:99px;cursor:pointer;transition:transform .2s,background .2s,color .2s}
.gz-help:hover{background:#C0392B;color:#fff;transform:translateY(-2px)}

.gz-bar{display:flex;gap:8px;margin-bottom:8px}
.gz-seg{flex:1;height:10px;border-radius:99px;background:#DDE2E8;overflow:hidden}
.gz-seg i{display:block;height:100%;width:0;background:#117A65;border-radius:99px;transition:width .6s ease}
.gz-seg.on i{width:100%}
.gz-where{font-size:16px;color:#4A5866;margin-bottom:18px;min-height:26px}

.gz-card{background:#fff;border:2px solid #D5DAE1;border-radius:24px;padding:36px 34px;box-shadow:0 10px 34px rgba(27,38,49,.08);min-height:360px}
.gz-card.fwd{animation:gz-fwd .45s ease both}
.gz-card.back{animation:gz-back .45s ease both}
.gz-card h1{font-size:34px;line-height:1.25;margin:0 0 16px;font-weight:800}
.gz-card p{margin:0 0 16px}
.gz-emoji{font-size:64px;line-height:1;margin-bottom:14px;display:inline-block;animation:gz-pop .6s ease both}
.gz-emoji.big{animation:gz-bounce 1.4s ease-in-out infinite}
.gz-code{background:#E8ECF1;padding:2px 10px;border-radius:8px;font-family:monospace;font-size:18px;white-space:nowrap}

.gz-note{display:flex;gap:12px;border-radius:16px;padding:16px 20px;margin:18px 0 0;font-size:18px;line-height:1.6;animation:gz-pop .5s .15s ease both}
.gz-note>span:first-child{font-size:26px}
.gz-tip{background:#E3F2FD;border:2px solid #90CAF9;color:#0D3C61}
.gz-warn{background:#FFF6D6;border:2px solid #F2CC4D;color:#6B5200}

.gz-pic{margin:0 0 20px;border:2px dashed #C9CFD8;border-radius:16px;padding:10px;background:#FAFBFC;overflow:hidden;animation:gz-pop .5s ease both}
.gz-pic .w{overflow:hidden;border-radius:8px}
.gz-pic img{display:block;width:100%;height:auto;transition:transform .5s}
.gz-pic:hover img{transform:scale(1.04)}
.gz-cap{font-size:15px;color:#4A5866;font-style:italic;margin-top:8px}

.gz-choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-top:20px}
.gz-choice{text-align:left;background:#fff;border:3px solid #C9CFD8;border-radius:20px;padding:16px;cursor:pointer;font-size:18px;line-height:1.5;color:inherit;position:relative;transition:transform .25s,box-shadow .25s,border-color .25s,background .25s;animation:gz-pop .5s ease both}
.gz-choice:nth-child(2){animation-delay:.06s}.gz-choice:nth-child(3){animation-delay:.12s}.gz-choice:nth-child(4){animation-delay:.18s}.gz-choice:nth-child(5){animation-delay:.24s}
.gz-choice:hover{transform:translateY(-6px);border-color:#117A65;box-shadow:0 14px 28px rgba(17,122,101,.18)}
.gz-choice.sel{border-color:#117A65;background:#EAF6F2;box-shadow:0 10px 26px rgba(17,122,101,.22)}
.gz-choice.sel::after{content:'✓';position:absolute;top:12px;right:14px;width:36px;height:36px;border-radius:50%;background:#117A65;color:#fff;font-weight:800;font-size:20px;display:flex;align-items:center;justify-content:center;animation:gz-pop .3s ease both}
.gz-choice .t{font-weight:800;font-size:20px;margin:8px 0 4px;display:block}
.gz-choice .d{font-size:16px;color:#4A5866;display:block}
.gz-choice .em{font-size:40px;display:block}
.gz-choice .pic{display:block;overflow:hidden;border-radius:10px;border:2px dashed #C9CFD8;margin-bottom:6px}
.gz-choice .pic img{display:block;width:100%;height:auto;transition:transform .5s}
.gz-choice:hover .pic img{transform:scale(1.08)}
.gz-look{display:inline-block;margin-top:10px;background:#E8ECF1;border:none;border-radius:99px;padding:6px 14px;font-size:15px;font-weight:700;cursor:pointer;transition:background .2s,transform .2s}
.gz-look:hover{background:#D5F0E8;transform:scale(1.06)}

.gz-nav{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:26px}
.gz-btn{border:none;border-radius:99px;font-weight:800;font-size:22px;padding:18px 40px;cursor:pointer;background:#117A65;color:#fff;transition:transform .2s,background .2s,box-shadow .2s;display:inline-flex;align-items:center;gap:10px}
.gz-btn:hover:not(:disabled){transform:translateY(-4px);background:#0E6552;box-shadow:0 12px 24px rgba(17,122,101,.35)}
.gz-btn:active:not(:disabled){transform:translateY(0)}
.gz-btn.ready{animation:gz-glow 2s ease-in-out infinite}
.gz-btn.ready .ar{animation:gz-nudge 1.2s ease-in-out infinite}
.gz-btn:disabled{background:#B8C0C9;cursor:not-allowed}
.gz-btn.ghost{background:#fff;color:#0E5F4E;border:3px solid #117A65;padding:15px 30px;font-size:20px}
.gz-btn.ghost:hover:not(:disabled){background:#EAF6F2}
.gz-btn.ghost:disabled{visibility:hidden}
.gz-hint{text-align:center;font-size:16px;color:#4A5866;margin-top:14px}

.gz-prob{display:block;width:100%;text-align:left;background:#FEECEC;border:2px solid #F1948A;border-radius:16px;padding:16px 20px;margin-bottom:12px;font-size:19px;font-weight:700;color:#A93226;cursor:pointer;transition:transform .2s,box-shadow .2s;animation:gz-pop .4s ease both}
.gz-prob:hover{transform:translateX(8px);box-shadow:0 8px 20px rgba(192,57,43,.18)}
.gz-ans{background:#EAF6F2;border:2px solid #117A65;border-radius:18px;padding:20px 24px;animation:gz-pop .4s ease both}

.gz-modal{position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;cursor:zoom-out;animation:gz-fade .25s ease both}
.gz-modal-in{position:relative;max-width:96vw;max-height:94vh;background:#fff;border-radius:16px;padding:16px;cursor:default;animation:gz-pop .3s ease both}
.gz-modal-in img{width:100%;height:auto;max-height:80vh;object-fit:contain;border-radius:8px}
.gz-x{position:absolute;top:-16px;right:-16px;width:48px;height:48px;border-radius:50%;border:3px solid #fff;background:#1B2631;color:#fff;font-size:20px;font-weight:800;cursor:pointer;transition:transform .2s,background .2s}
.gz-x:hover{transform:rotate(90deg) scale(1.1);background:#C0392B}

@media(max-width:600px){
  .gz{font-size:18px;padding:16px 12px 50px}
  .gz-card{padding:24px 18px}.gz-card h1{font-size:27px}
  .gz-btn{font-size:20px;padding:16px 26px}.gz-btn.ghost{padding:13px 20px;font-size:18px}
}
@media(prefers-reduced-motion:reduce){.gz *,.gz-modal,.gz-modal *{animation:none!important;transition:none!important}}
`;

const C = ({ children }) => <span className="gz-code">{children}</span>;
const b = t => <strong>{t}</strong>;

// One screen of the walkthrough: st(part, title, body, { tip, warn, img, cap })
const st = (part, title, body, x = {}) => ({ kind: 'step', part, title, body, ...x });

// ── Steps shared across sheet types, in the SAME order the real fields sit
// in ConnectionForm.jsx: ID/Department → Page/Label/Module/Section →
// Sheet link+Test&Load → Range/Header Row → "Which tabs..." box → column
// mapping → save. Reordered so the reader never has to scroll up and down
// the form out of sequence.
const ID_DEPT = st(3, 'Fill in the ID and Department', <>
    {b('ID')} is a short one-off code just for this connection — letters, numbers and dashes, for example
    "store-siv-issues". Right beside it, {b('Department')} is which team the sheet belongs to.
</>, { warn: <>
    {b('Department:')} if you're logged in with {b('full access')}, this is a dropdown — pick the right
    department from the list. If you're logged in as {b('one specific department')} (Store, Pharmacy,
    Finance, and so on), it fills itself in already and you can't change it — that's expected, it just means
    the connection is automatically saved under your department.
</> });

const PAGE_MODULE = st(3, 'Fill in Page, Label and Module key', <>
    {b('Page')} is the screen in the app that will show this data — it's also where any chart you build from
    it later will appear, so make sure it's the right one before moving on. {b('Label')} is just a name for
    you to recognise it by later (for example "Kitchen Stock"). Once you pick a Page, a list appears for
    {b(' Module key')} — pick one from it, you don't need to type anything.
</>, { warn: <>
    {b('Page should match Department.')} A Pharmacy sheet should feed a Pharmacy page, not Overview or a
    different team's page — that Page is also where your chart will show up, so pick it with that in mind.
    If you're logged in as a specific department, the Page dropdown only lists pages that department can
    use (or it may already be filled in for you); full access logins see every page.
</> });

const SHEET_LINK = st(3, 'Paste your sheet link and test it', <>
    Scroll down to the box labelled {b('"Google Sheet URL or ID"')} — it has a {b('🔌 Test & Load')} button
    right beside it. Paste the sheet address you copied in Part 1 into the box, then click{' '}
    {b('🔌 Test & Load')}. A green message means it worked and shows your tab names; a red one means the
    sheet isn't shared properly yet — go back and check Part 1.
</>);

const RANGE_HEADER = st(3, 'Say which part to read', <>
    Two boxes appear just under the sheet link: {b('Range')} and {b('Header Row Number')}. Leave Range as
    <C> A:Z</C> if the whole tab is one table, and Header Row Number as <C>1</C> if your column titles sit
    in the very first row — that's right for most sheets.
</>, { tip: <>Data starting lower down, say row 5? Set Range to <C>A5:Z100</C> and Header Row Number to <C>5</C>. The two must point at the same row.</> });

const TAB_NAME_SINGLE = st(3, "Type your tab's name", <>
    Keep scrolling to the box titled {b('"📑 Which tabs should we fetch from?"')} — it sits below Range and
    Header Row Number. Four cards run across the top of that box; make sure {b('"1️⃣ One tab"')} has the
    teal border (it's selected by default). {b('Right underneath those four cards')}, a field labelled
    {b(' "Tab Name (exact)"')} appears — that's where you type it. Look at the little tabs along the bottom
    of your Google Sheet and type the name exactly as it's written there — capital letters count.
</>, { img: TabNameSinglePic, cap: 'The "Tab Name (exact)" field sits right under the four mode cards, once "One tab" is selected.' });

const TAB_NAME_SCORECARD = st(3, "Pick KPI Scorecard, then type the tab name", <>
    Keep scrolling to the box titled {b('"📑 Which tabs should we fetch from?"')} — it sits below the sheet
    link. Click the fourth card, {b('"📊 KPI Scorecard"')}. A new box opens below the four cards, and
    {b(' "Tab Name (exact)"')} is the very first field inside it. Look at the little tabs along the bottom
    of your Google Sheet and type the name exactly as it's written there — capital letters count.
</>, { img: TabNameScorecardPic, cap: 'The "Tab Name (exact)" field is the first thing inside the KPI Scorecard box.' });

const SAVE = st(3, 'Save it', <>Click {b('💾 Save Connection')}. Nearly done — next we'll choose what to show on the page.</>);
const CHECK_COLS = st(3, 'Check the column names', <>
    After {b('Test & Load')}, the system guesses what each column is called and fills it in for you.
    Look through them, and only change the ones that look wrong.
</>);
const ROLES = st(3, 'Say what each column is', <>
    For each column shown, pick one: {b('KPI Category')}, {b('Description / Measure')} (needed for at least
    one column — it names each KPI), {b('Unit / Target text')}, {b('Time period')} (also needed for at least
    one column), or {b('Skip this column')}.
</>, { warn: <>No categories in your sheet? Leave "KPI Category" empty everywhere and mark your one label column as "Description / Measure". Every KPI will sit in one group.</> });
const SQUASH = st(3, 'Squashed cells (only if you see them)', <>
    Sometimes one box holds several numbers jammed together, like <C>04:04:01:01</C>. If the column next
    to it lists labels with colons (like "Pharmacist: Pharm. Tech.: Porter: Admin"), the system splits
    them {b('automatically')} — do nothing. Only open "Advanced: some cells pack multiple values together"
    if your cell uses another separator (like <C>---</C>) or has no label column. Then describe the
    category, the KPI, the labels in order, and the separator.
</>);

const TYPES = {
    A: {
        name: 'A simple list', pick: 'One tab', img: NormalPic,
        short: 'One row for every item, all in one tab.',
        desc: <>Your sheet has {b('one row for every single thing')} — one per purchase, per staff member, or per item in stock. It all lives in one tab. This is the most common kind.</>,
        steps: [
            ID_DEPT, PAGE_MODULE, SHEET_LINK, RANGE_HEADER, TAB_NAME_SINGLE,
            CHECK_COLS, SAVE,
        ],
    },
    B: {
        name: 'A list split into tabs', pick: 'Multiple tabs', img: NormalPicTabs,
        short: 'Like a simple list, but one tab per month.',
        desc: <>Same as a simple list — one row per thing — but split up: one tab for January, one for February, and so on. The columns look the same in every tab.</>,
        steps: [
            ID_DEPT, PAGE_MODULE, SHEET_LINK, RANGE_HEADER,
            st(3, 'Choose "Multiple tabs" and add your tabs', <>
                In the {b('"📑 Which tabs should we fetch from?"')} box, click the second card,{' '}
                {b('"📅 Multiple tabs"')}. A box for adding tabs opens underneath. Type each tab's exact name
                there. A "key" often fills itself in (typing "January" fills in <C>2026-01</C>). Or just
                click the tab names under "Quick add from sheet".
            </>),
            st(3, 'Check the column names, then save', <>The system has already guessed the column names. Fix any that look wrong, then click {b('💾 Save Connection')}.</>),
        ],
    },
    C: {
        name: 'A report card (KPI Scorecard)', pick: 'KPI Scorecard', img: KPI,
        short: 'One row per measurement, months across the top.',
        desc: <>Instead of adding new rows over time, each measurement (KPI) has {b('one row, forever')}, and the months run {b('sideways')} as columns (JAN, FEB, MAR…).</>,
        steps: [
            ID_DEPT, PAGE_MODULE, SHEET_LINK, TAB_NAME_SCORECARD,
            st(3, 'Tell us where things sit', <>Three quick questions further down in that same box: which row has the category / measure labels (usually around row 6)? Which row does the KPI data start on (a row or two below)? Roughly how many KPI rows are there? A rough guess is fine.</>),
            st(3, 'Show the columns', <>Click {b('🔍 Show me the columns in that row')}. The system reads your sheet and shows what's written in each column — no guessing needed.</>),
            ROLES, SQUASH, SAVE,
        ],
    },
    D: {
        name: 'A report card, one tab per month', pick: 'KPI Scorecard', img: KPIMultiTab,
        short: 'A report card where each month has its own tab.',
        desc: <>Like a report card, except each month gets {b('its own tab')}, often with a weekly breakdown inside (Week 1, 2, 3, 4).</>,
        steps: [
            st(3, 'This one takes a little more setup', <>It's worth asking whoever manages this system to help with your first one. After that, adding new months is much easier.</>, { tip: <>You can still carry on and try it yourself — the next screens show what's involved.</> }),
            ID_DEPT, PAGE_MODULE, SHEET_LINK,
            st(3, "List each month's tab", <>
                In the {b('"📑 Which tabs should we fetch from?"')} box, choose {b('"📊 KPI Scorecard"')},
                then add each month's tab separately instead of just one. Each one needs its own column
                meanings, because different tabs can hold different weeks. Your administrator can set up
                the first as a template.
            </>),
            ROLES, SQUASH, SAVE,
        ],
    },
    E: {
        name: 'Several tables in one tab', pick: 'One tab', img: MultipleTables,
        short: 'One tab with several tables stacked below each other.',
        desc: <>You have just {b('one tab')}, but inside it are {b('several separate tables')} stacked down the page — for example a KPI table, a gap, a devices table, a gap, then a subscriptions table.</>,
        steps: [
            ID_DEPT, SHEET_LINK,
            st(3, 'Tick the stacked-tables box', <>Just below the sheet link, tick {b('"📑 This sheet contains multiple tables stacked in one tab"')}. It only appears when you're making a brand-new connection, not when editing one.</>),
            st(3, 'Pick the tab this sheet is on', <>
                In the {b('"📑 Which tabs should we fetch from?"')} box, leave {b('"1️⃣ One tab"')} selected
                (that's the default) and type the exact tab name into {b('"Tab Name (exact)"')} underneath
                it. This Sheet ID and Tab Name are shared by every table below, so you only set them once.
            </>),
            st(3, 'Add each table', <>
                Scroll to {b('"📑 Tables in this sheet"')}. For each table, click {b('+ Add another table')}
                and fill in its own {b('Page')} (make sure it matches the department that table's data
                belongs to — that's also where its chart will show up), {b('Module key')}, {b('Label')},
                {b(' Header Row')} and {b('Range')} — each table starts on a different row. Example: a table
                starting at row 49, columns A to H, has Header Row <C>49</C> and Range <C>A49:H82</C> (stop
                one row before the next table's header row).
            </>),
            st(3, 'Detect the columns and save', <>Click {b('🔍 Detect columns')} for each table, check the guessed names, then save. All your tables are saved as separate connections at once.</>),
        ],
    },
};

const openApp = k => st(2, 'Open the connection window', <>
    In the app, click {b('Settings')}. Settings opens with a row of tabs across the top — the one you want,
    {b(' "🔗 Google Sheets"')}, sits on the {b('far left')}, right before the {b('"📖 Guide"')} tab you're
    reading this in right now. Click it, then click {b('+ Add Connection')} near the top right of that page.
    A small window with pictures appears — click the one called {b(`"${TYPES[k].pick}"`)}.
    {k === 'E' && <> (This kind of sheet is a tick-box inside the form, not a picture of its own — that's the first step next.)</>}
    {k === 'D' && <> (If you see a picture mentioning multiple tabs for report cards, pick that instead.)</>}
</>, { tip: <>Keep this guide open in one tab and Settings in another, and flip between them.</>, img: SettingsTabsPic, cap: 'The Settings tab row — Google Sheets sits on the far left, just before Guide.' });

// Report-card sheets hold every KPI mixed together, so narrowing down comes first.
const FILTER = [
    st(4, 'Narrow it down first', <>
        Scroll to {b('"Filter to specific KPIs"')} — always do this for report cards. Your connection holds
        every KPI mixed together, and without this a chart adds unrelated numbers (like a percentage and a
        headcount) into one meaningless total.
    </>),
    st(4, 'Pick the category and metric', <>Choose a {b('Category')} (optional) to shorten the list, then the exact {b('Metric')}. They come straight from your sheet. KPI Cards and Line Charts allow only one metric.</>),
];

const VIZ = {
    kpi: { em: '🔢', t: 'One big number', d: 'Like "Total Drug Stock Value".', steps: [
        st(4, 'Name it and pick the field', <>Give it a {b('KPI Label')}, for example "Total Drug Stock Value". Then choose the {b('Field to aggregate')} — for report cards this is almost always <C>value</C>.</>),
        st(4, 'Choose how numbers combine', <>{b('Sum')} adds rows up, {b('Average')} finds the middle, {b('Maximum / Minimum')} picks the highest or lowest, and {b('Latest')} shows just the most recent.</>, { warn: <>For report cards, "Latest" is usually right — you rarely want July's number added to August's.</> }),
        st(4, 'Pick the format', <>Choose Currency, Number or Percent for a numeric KPI.</>),
    ] },
    word: { em: '🔤', t: 'One word', d: 'Like a drug name instead of a number.', steps: [
        st(4, 'Show a word as a KPI card', <>Some KPIs hold words — "Most prescribed drug" holds a drug name. Choose {b('KPI Card')} as the visualization type.</>),
        st(4, 'Two settings that matter', <>Set {b('Aggregation')} to {b('"Latest"')} and {b('Format')} to {b('"Plain text"')}. Without these the card shows 0.</>, { tip: <>Want one particular month? Once the card is on the page, use its own month dropdown in the corner. Want every month at once? Use a Table instead.</> }),
    ] },
    plot: { em: '📈', t: 'One thing, plotted', d: 'A bar, line or pie chart.', steps: [
        st(4, 'Bar or line chart', <>Pick an {b('X Axis')} and a {b('Y Axis')}. For a report-card trend across months, X is usually <C>_period</C> and Y is usually <C>value</C>.</>),
        st(4, 'Pie chart', <>Pick a {b('Category')} field and a {b('Value')} field. The pie shows how the total splits into slices.</>),
        st(4, 'Extra options for bar charts', <>Bar charts also have Orientation, Sort order, Limit and an optional Target line. Try a few and watch the preview change.</>),
    ] },
    table: { em: '📋', t: 'A plain list of rows', d: 'Easy to read every value.', steps: [
        st(4, 'Choose what to show', <>Pick which {b('Columns')} to show — leave it blank to show everything. Then choose how many rows show at once. The page also has "Load more" and "Show all".</>, { tip: <>For report cards, a Table is the easiest way to see every month's value for one KPI at a glance.</> }),
    ] },
    grouped: { em: '📊', t: 'Compare several things', d: 'Grouped bars or lines side by side.', steps: [
        st(4, 'Pick the X Axis', <>Usually <C>_period</C> for a month-by-month view.</>),
        st(4, 'Add one series per thing', <>Each series becomes one bar or line. Give each a label and a colour.</>, { warn: <>Comparing report-card sub-values (Pharmacist / Porter / Admin)? Filter to that KPI first, then click {b('🪄 Auto-split into one series per value')}. It sets up every series and colour in one click. To adjust one, use its "Split value" dropdown.</> }),
    ] },
    // TODO(Teni): VizForm.jsx hasn't been shared yet, so the "Chart Title"
    // field (and its on-screen position) and the rest of VizForm's inputs
    // haven't been added here. Once you share components/VizForm.jsx this
    // block gets a proper pass, same as the connection steps above.
};

const PROBLEMS = [
    ['The page still says nothing is connected', <>Check that "Test & Load" turned green. Red means the sheet isn't shared properly, or the link was copied wrong — go back to Part 1.</>],
    ["It says the tab wasn't found, but I can see it", <>Tab names must match {b('exactly')}, capitals included. Copy the name straight from the tab at the bottom of your Google Sheet.</>],
    ['A number looks like 04:04:01:01 or 171---78', <>Make sure the column next to your measure (the one with small helper text) was given a role in "Show me the columns" — that's where the split labels usually live. For another separator, describe that row in the "Advanced" section.</>],
    ['My KPI card shows 0, but the value is a word', <>Set Aggregation to {b('Latest')} and Format to {b('Plain text')}.</>],
    ['Every bar in my grouped chart is the same number', <>Each series needs a "Split value". Delete the series, filter to the exact category and metric, then click {b('🪄 Auto-split into one series per value')}.</>],
    ['My chart mixes numbers from different KPIs', <>Use "Filter to specific KPIs" to pick a category and/or exact metric. Without it, unrelated numbers get added together.</>],
    ['It saved, but landed in the wrong tab or "Uncategorised"', <>Open the connection again and check both {b('Page')} and {b('Module key')}. The Module key decides which tab it lands in.</>],
    ["A chart I saved isn't showing anywhere", <>Look for a grey "Hidden" tag beside it. The small eye icon switches a chart on or off without deleting it.</>],
];

const PARTS = ['Share your sheet', "Choose your sheet's shape", 'Set up the connection', 'Add a chart'];

// The path depends on the reader's two answers (sheet shape, then what to show).
function buildScreens(sheet, viz) {
    const s = [
        { kind: 'intro', part: 0 },
        st(1, 'Share your sheet', <>
            Open your Google Sheet and click the blue {b('Share')} button (top-right corner). Paste in the
            special email address IT department gave you
            (rhv-hospital-dashboard@trekking-493220.iam.gserviceaccount.com). On some Google accounts,
            you'll see a button that says {b('"Ask to send"')} instead of a normal access dropdown — if you
            see that, click it {b('first')}; only after that will you be able to set an access level for the
            email. Either way, once you can, set the access level to at least {b('"Viewer"')}, then click
            {b(' Send')} to finish — nothing is shared until you do that.
        </>, { warn: <>Nothing else will work until this is done — even if every other step is perfect.</>, img: ShareSheetPic, cap: 'The Share dialog — paste the email, set access to at least Viewer, then click Send (click "Ask to send" first, if that\'s what you see).' }),
        st(1, "Copy your sheet's web address", <>With the sheet open, click the address bar at the top of your browser and copy the whole address. It looks like <C>https://docs.google.com/spreadsheets/d/......</C></>, { tip: <>Keep it handy — you'll paste it soon.</> }),
        { kind: 'pickSheet', part: 2 },
    ];
    if (!sheet) return s;
    const T = TYPES[sheet];
    s.push(
        st(2, `You picked: ${T.name}`, T.desc, { img: T.img, cap: 'Does your sheet look like this? If not, press Back and choose another.' }),
        openApp(sheet), ...T.steps, { kind: 'pickViz', part: 4 },
    );
    if (!viz) return s;
    if (sheet === 'C' || sheet === 'D') s.push(...FILTER);
    s.push(...VIZ[viz].steps, { kind: 'done', part: 5 });
    return s;
}

export default function ConnectionGuidePage() {
    const [i, setI] = useState(0);
    const [dir, setDir] = useState('fwd');
    const [sheet, setSheet] = useState(null);
    const [viz, setViz] = useState(null);
    const [help, setHelp] = useState(false);
    const [prob, setProb] = useState(null);
    const [zoom, setZoom] = useState(null);

    useEffect(() => {
        if (!zoom) return;
        const k = e => e.key === 'Escape' && setZoom(null);
        window.addEventListener('keydown', k);
        return () => window.removeEventListener('keydown', k);
    }, [zoom]);

    const screens = buildScreens(sheet, viz);
    const sc = screens[Math.min(i, screens.length - 1)];
    const atEnd = sc.kind === 'done';
    const needsPick = (sc.kind === 'pickSheet' && !sheet) || (sc.kind === 'pickViz' && !viz);

    const go = d => { setDir(d > 0 ? 'fwd' : 'back'); setI(x => Math.max(0, x + d)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const restart = () => { setDir('back'); setI(0); setSheet(null); setViz(null); };

    // Position inside the current part, e.g. "screen 2 of 5"
    const inPart = screens.filter(s => s.part === sc.part);
    const pos = inPart.indexOf(sc) + 1;

    const pickCards = (items, cur, set, withImg) => (
        <div className="gz-choices">
            {Object.entries(items).map(([k, o]) => (
                <div key={k} role="button" tabIndex={0} className={`gz-choice${cur === k ? ' sel' : ''}`}
                    onClick={() => set(k)} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), set(k))}>
                    {withImg ? <span className="pic"><Image src={o.img} alt={`Example of ${o.name}`} /></span> : <span className="em">{o.em}</span>}
                    <span className="t">{withImg ? o.name : o.t}</span>
                    <span className="d">{withImg ? o.short : o.d}</span>
                    {withImg && (
                        <button type="button" className="gz-look" onClick={e => { e.stopPropagation(); setZoom({ src: o.img, label: o.name }); }}>
                            🔍 Look bigger
                        </button>
                    )}
                </div>
            ))}
        </div>
    );

    let content;
    if (help) {
        content = (
            <div className="gz-card fwd" key="help">
                <h1>🆘 What are you seeing?</h1>
                {prob === null ? <>
                    <p>Tap the one that matches, and we'll show you the fix.</p>
                    {PROBLEMS.map(([q], n) => <button key={n} className="gz-prob" style={{ animationDelay: `${n * .05}s` }} onClick={() => setProb(n)}>{q}</button>)}
                </> : <>
                    <p style={{ fontWeight: 800, color: '#A93226' }}>{PROBLEMS[prob][0]}</p>
                    <div className="gz-ans">{PROBLEMS[prob][1]}</div>
                    <div className="gz-nav"><button className="gz-btn ghost" onClick={() => setProb(null)}>← Other problems</button><span /></div>
                </>}
                <p className="gz-hint" style={{ marginTop: 22 }}>Still stuck? Contact IT department, and show them a screenshot of what you see.</p>
                <div className="gz-nav" style={{ justifyContent: 'center' }}>
                    <button className="gz-btn" onClick={() => { setHelp(false); setProb(null); }}>← Back to the guide</button>
                </div>
            </div>
        );
    } else if (sc.kind === 'intro') {
        content = (
            <div className={`gz-card ${dir}`} key="intro">
                <span className="gz-emoji">📖</span>
                <h1>Let's connect your Google Sheet</h1>
                <p>We'll go one small step at a time, in plain everyday language. You can't get lost — press {b('Back')} whenever you like.</p>
                <p>It takes about 10 minutes. You'll need:</p>
                <p style={{ margin: 0 }}>📄 Your Google Sheet<br />✉️ The email address IT department gave you (rhv-hospital-dashboard@trekking-493220.iam.gserviceaccount.com)</p>
                <div className="gz-note gz-tip"><span>💡</span><span>Keep this guide open in one tab and your Settings in another, and flip between them as you go.</span></div>
            </div>
        );
    } else if (sc.kind === 'step') {
        content = (
            <div className={`gz-card ${dir}`} key={i}>
                {sc.img && <figure className="gz-pic"><div className="w"><Image src={sc.img} alt={sc.title} /></div><div className="gz-cap">{sc.cap}</div></figure>}
                <h1>{sc.title}</h1>
                <p>{sc.body}</p>
                {sc.tip && <div className="gz-note gz-tip"><span>💡</span><span>{sc.tip}</span></div>}
                {sc.warn && <div className="gz-note gz-warn"><span>⭐</span><span>{sc.warn}</span></div>}
            </div>
        );
    } else if (sc.kind === 'pickSheet') {
        content = (
            <div className={`gz-card ${dir}`} key="ps">
                <h1>Which picture looks most like your sheet?</h1>
                <p>Tap the closest match. Not sure? Tap {b('🔍 Look bigger')} to compare it with your own sheet.</p>
                {pickCards(TYPES, sheet, k => { if (k !== sheet) setViz(null); setSheet(k); }, true)}
            </div>
        );
    } else if (sc.kind === 'pickViz') {
        content = (
            <div className={`gz-card ${dir}`} key="pv">
                <h1>Open the visualizations panel</h1>
                <p>
                    Saving a connection only brings your data in — nothing shows on the page until you add a
                    chart or card on top of it. Find your saved connection under {b('🔗 Google Sheets')} in
                    Settings. Beside its {b('✏ Edit')} button sits another button showing a small chart icon
                    and a number, like {b('"📊 0 vizs"')} — click that one first, it's directly to the left of
                    Edit. A panel drops open underneath showing "Visualizations"; click {b('+ Add')} inside
                    it.
                </p>
                <p>A form opens. Pick one of the chart types below to continue.</p>
                {pickCards(VIZ, viz, setViz, false)}
                <div className="gz-note gz-tip"><span>💡</span><span>The form has a live preview at the bottom. If it looks wrong or empty, something above needs a small change.</span></div>
            </div>
        );
    } else {
        content = (
            <div className={`gz-card ${dir}`} key="done" style={{ textAlign: 'center' }}>
                <span className="gz-emoji big">🎉</span>
                <h1>You're all set!</h1>
                <p>Save your chart, then open the page to see it. If something isn't right, the help button will sort it out.</p>
                <div className="gz-nav" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="gz-btn ghost" onClick={restart}>↺ Start over</button>
                    <button className="gz-btn" onClick={() => setHelp(true)}>🆘 Something's wrong</button>
                </div>
            </div>
        );
    }

    return (
        <div className="gz">
            <style>{css}</style>

            <div className="gz-top">
                <span className="gz-brand">📖 Connect a Google Sheet</span>
                {!help && <button className="gz-help" onClick={() => setHelp(true)}>🆘 Need help?</button>}
            </div>

            {!help && sc.part > 0 && sc.part < 5 && <>
                <div className="gz-bar" aria-hidden="true">
                    {PARTS.map((_, n) => (
                        <div key={n} className={`gz-seg${n + 1 < sc.part ? ' on' : ''}`}>
                            <i style={n + 1 === sc.part ? { width: `${(pos / inPart.length) * 100}%` } : undefined} />
                        </div>
                    ))}
                </div>
                <div className="gz-where">Part {sc.part} of 4: {PARTS[sc.part - 1]}{inPart.length > 1 && ` · screen ${pos} of ${inPart.length}`}</div>
            </>}

            {content}

            {!help && !atEnd && <>
                <div className="gz-nav">
                    <button className="gz-btn ghost" disabled={i === 0} onClick={() => go(-1)}>← Back</button>
                    <button className={`gz-btn${needsPick ? '' : ' ready'}`} disabled={needsPick} onClick={() => go(1)}>
                        {sc.kind === 'intro' ? "Let's start" : 'Next'} <span className="ar">→</span>
                    </button>
                </div>
                {needsPick && <div className="gz-hint">Tap one of the choices above to continue.</div>}
            </>}
            {!help && atEnd && <div className="gz-nav"><button className="gz-btn ghost" onClick={() => go(-1)}>← Back</button><span /></div>}

            {zoom && (
                <div className="gz-modal" onClick={() => setZoom(null)} role="dialog" aria-modal="true">
                    <div className="gz-modal-in" onClick={e => e.stopPropagation()}>
                        <button type="button" className="gz-x" onClick={() => setZoom(null)} aria-label="Close">✕</button>
                        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 10 }}>{zoom.label}</div>
                        <Image src={zoom.src} alt={`Larger view of ${zoom.label}`} />
                    </div>
                </div>
            )}
        </div>
    );
}