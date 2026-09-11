'use client';
 
import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import PageRenderer from '../../components/PageRenderer';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import { fmt } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
 
// ─── Descriptive error / loading states (same pattern as Weekly/Inventory) ──
 
function SheetError({ label, error, onRefetch }) {
  const notConnected = error?.includes('not connected') || error?.includes('Sheet ID') || error?.includes('No connection');
  return (
    <div style={{ background: notConnected ? '#FFF9E6' : '#FEECEC', border: `1.5px solid ${notConnected ? '#F4D03F' : '#F1948A'}`, borderRadius: 10, padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{notConnected ? '🔗' : '⚠️'}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
        {label}: {notConnected ? 'Not connected yet' : 'Failed to load'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>{error}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <a href="/dashboard/settings" style={{ padding: '8px 18px', background: 'var(--navy)', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>⚙ Go to Settings</a>
        {onRefetch && !notConnected && (
          <button onClick={onRefetch} style={{ padding: '8px 18px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>↻ Retry</button>
        )}
      </div>
    </div>
  );
}
 
function Loading({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)', fontSize: 12 }}>
      ⏳ {message}
    </div>
  );
}
 
export default function RevenuePage() {
  const [sort,   setSort]   = useState('hi');
  const [search, setSearch] = useState('');
  const [view,   setView]   = useState('val'); // 'val' | 'pct'
 
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const ledgerConn = getByModule('revenue_ledger');
  console.log('ledgerConn:', ledgerConn);
  const { rows, loading: rowsLoading, error: rowsError, refetch } = useSheetData(ledgerConn);
 
  // ── Guard states ──
 
  if (configLoading) {
    return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
  }
 
  if (configError) {
    return (
      <div>
        <SheetError label="Sheet configuration" error={`Could not load the connections manifest: ${configError}`} onRefetch={reload} />
      </div>
    );
  }
 
  if (!ledgerConn) {
    return (
      <div>
        <SheetError
          label="Revenue Ledger"
          error={`No connection with module "revenue_ledger" is configured. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "revenue".`}
        />
      </div>
    );
  }
 
  if (rowsLoading) {
    return <div><Loading message={`Loading "${ledgerConn.label}" from Google Sheets…`} /></div>;
  }
 
  if (rowsError) {
    return (
      <div>
        <SheetError label={ledgerConn.label} error={rowsError} onRefetch={refetch} />
      </div>
    );
  }
 
  if (!rows || rows.length === 0) {
    return (
      <div>
        <SheetError
          label={ledgerConn.label}
          error={`The sheet connected fine, but the "${ledgerConn.tabName}" tab returned 0 rows. Check that data starts at header row ${ledgerConn.headerRow} and that the range "${ledgerConn.range}" covers it.`}
          onRefetch={refetch}
        />
      </div>
    );
  }
 
  // ── Real data from here — group the ledger by item to get "streams" ──
  // (This grouping is bespoke because it needs per-item department lookup
  // and period-over-period deltas — DynamicViz's generic bar/table renderers
  // don't have a slot for that kind of derived comparison yet.)
 
  const periods = [...new Set(rows.map(r => r._period).filter(Boolean))].sort();
  const latestPeriod = periods[periods.length - 1];
  const prevPeriod   = periods[periods.length - 2];
 
  const streamMap = {};
  rows.forEach(r => {
    const item = r.item || 'Unspecified';
    if (!streamMap[item]) {
      streamMap[item] = { name: item, depts: new Set(), ytd: 0, latest: 0, prev: 0 };
    }
    const s = streamMap[item];
    if (r.department) s.depts.add(r.department);
    const amt = n(r.amount);
    s.ytd += amt;
    if (r._period === latestPeriod) s.latest += amt;
    if (r._period === prevPeriod)   s.prev   += amt;
  });
 
  const streams = Object.values(streamMap).map(s => ({
    ...s,
    dept: s.depts.size === 0 ? '—' : s.depts.size === 1 ? [...s.depts][0] : 'Multiple depts',
  }));
 
  const total = streams.reduce((s, x) => s + x.ytd, 0);
  const totalLatest = streams.reduce((s, x) => s + x.latest, 0);
  const topStream = [...streams].sort((a, b) => b.ytd - a.ytd)[0];
 
  // Plain computation, not a hook — it runs after the early returns above,
  // so it can't be a real useMemo/useState call (that would break the Rules
  // of Hooks by making a hook conditional).
  let sorted = streams.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  if (sort === 'hi') sorted = [...sorted].sort((a, b) => b.ytd - a.ytd);
  else if (sort === 'lo') sorted = [...sorted].sort((a, b) => a.ytd - b.ytd);
  else sorted = [...sorted].sort((a, b) => a.name.localeCompare(b.name));
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>💰 Revenue Streams</h2>
          <p className={styles.pageMeta}>
            {periods.length > 0 ? `${periods[0]} – ${latestPeriod}` : 'YTD performance'}
          </p>
        </div>
      </div>
 
      {/* ── KPIs — bespoke, needs per-item grouping the config vizs don't do ──── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Revenue YTD" value={fmt(total)} color="green" badge="YTD" badgeType="good" />
        <KPICard label="Revenue Streams" value={streams.length} color="blue" />
        <KPICard label="Top Stream" value={topStream ? topStream.name : '—'} delta={topStream ? fmt(topStream.ytd) : ''} deltaType="up" color="purple" />
        <KPICard label={`${latestPeriod || 'Latest'} Revenue`} value={fmt(totalLatest)} color="amber" />
      </div>
 
      {/* ── Filter toolbar ───────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Sort:</span>
        {[['hi','Highest'], ['lo','Lowest'], ['az','A–Z']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSort(k)}
            style={{
              padding: '5px 12px', border: '1.5px solid', borderRadius: 6,
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              borderColor: sort === k ? 'var(--teal)' : 'var(--border)',
              background: sort === k ? 'var(--teal)' : '#fff',
              color: sort === k ? '#fff' : 'var(--text)',
            }}
          >{l}</button>
        ))}
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginLeft: 10 }}>View:</span>
        {[['val','₦ Value'], ['pct','% Share']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            style={{
              padding: '5px 12px', border: '1.5px solid', borderRadius: 6,
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              borderColor: view === k ? 'var(--teal)' : 'var(--border)',
              background: view === k ? 'var(--teal)' : '#fff',
              color: view === k ? '#fff' : 'var(--text)',
            }}
          >{l}</button>
        ))}
        <input
          type="text"
          placeholder="Search streams…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            marginLeft: 'auto', padding: '6px 10px', border: '1.5px solid var(--border)',
            borderRadius: 6, fontSize: 11, outline: 'none', minWidth: 200,
          }}
        />
      </div>
 
      {/* ── Charts — config-driven via PageRenderer ──────────────────────── */}
      {/* Reads viz-revl-004 (Top Revenue Streams bar) + viz-revl-005 (Payment
          Method Mix pie) from the revenue_ledger connection. Both now group
          and sum correctly across repeated items/payment methods since the
          VizBar fix. */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <PageRenderer page="revenue" module="revenue_ledger" only={['bar']} />
        <PageRenderer page="revenue" module="revenue_ledger" only={['pie']} />
      </div>
 
      {/* ── Table — bespoke per-stream detail (search/sort/%-toggle/MoM) ──── */}
      <div className={tableStyles.tableBox}>
        <div className={tableStyles.tableTitle}>Revenue Streams Detail</div>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Stream</th>
              <th>Department</th>
              <th>YTD Value</th>
              <th>% Share</th>
              <th>{latestPeriod || 'Latest'}</th>
              <th>Period Δ</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const pct = total > 0 ? (s.ytd / total * 100).toFixed(1) : 0;
              const mom = s.prev > 0 ? ((s.latest - s.prev) / s.prev * 100).toFixed(1) : null;
              const display = view === 'pct' ? `${pct}%` : fmt(s.ytd);
              return (
                <tr key={s.name}>
                  <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 10 }}>{s.dept}</td>
                  <td>{display}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--teal)', width: `${Math.min(80, +pct * 1.4)}px`, opacity: 0.7 }} />
                      <span style={{ fontSize: 10 }}>{pct}%</span>
                    </div>
                  </td>
                  <td>{fmt(s.latest)}</td>
                  <td style={{ color: mom > 0 ? 'var(--teal)' : mom < 0 ? 'var(--red)' : 'var(--muted)', fontWeight: 600 }}>
                    {mom !== null ? `${mom > 0 ? '+' : ''}${mom}%` : '—'}
                  </td>
                  <td>
                    <span className={`${tableStyles.badge} ${i < 3 ? tableStyles.green : tableStyles.blue}`}>
                      {i < 3 ? `Top ${i + 1}` : 'Active'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ fontWeight: 700 }}>TOTAL</td>
              <td style={{ fontWeight: 700 }}>{fmt(total)}</td>
              <td style={{ fontWeight: 700 }}>100%</td>
              <td style={{ fontWeight: 700 }}>{fmt(totalLatest)}</td>
              <td>—</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <PageRenderer page="revenue" module="revenue_ledger" only={['table']} />
      </div>
    </div>
  );
}