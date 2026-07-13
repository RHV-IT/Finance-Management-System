'use client';
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { StreamsBarChart, RevenuePieChart } from '../../components/Charts';
import { STREAMS, COLORS, fmt, fmtM } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const PAYER_DATA = [
  { name: 'Cash',          value: 58 },
  { name: 'HMO/Insurance', value: 22 },
  { name: 'Corporate',     value: 12 },
  { name: 'Mission',       value:  5 },
  { name: 'Govt/NHIS',     value:  3 },
];
const PAYER_COLORS = ['#1B4F72','#117A65','#6C3483','#CA6F1E','#888'];
 
export default function RevenuePage() {
  const [sort, setSort] = useState('hi');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('val'); // 'val' | 'pct'
 
  const total = STREAMS.reduce((s, x) => s + x.ytd, 0);
 
  const sorted = useMemo(() => {
    let arr = STREAMS.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    if (sort === 'hi') arr = [...arr].sort((a, b) => b.ytd - a.ytd);
    else if (sort === 'lo') arr = [...arr].sort((a, b) => a.ytd - b.ytd);
    else arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [sort, search]);
 
  const barData = sorted.slice(0, 10).map(s => ({
    name: s.name.length > 22 ? s.name.slice(0, 22) + '…' : s.name,
    ytdM: fmtM(s.ytd),
  }));
 
  const totalNov  = STREAMS.reduce((s, x) => s + (x.monthly[10] || 0), 0);
 
  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>💰 Revenue Streams</h2>
          <p className={styles.pageMeta}>YTD performance · FY 2025</p>
        </div>
      </div>
 
      {/* ── KPIs ─────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Revenue YTD" value={fmt(total)} color="green" badge="YTD" badgeType="good" />
        <KPICard label="Revenue Streams" value={STREAMS.length} color="blue" />
        <KPICard label="Top Stream" value={STREAMS[0].name.split(' ').slice(0,2).join(' ')} delta={fmt(STREAMS[0].ytd)} deltaType="up" color="purple" />
        <KPICard label="Nov 2025 Revenue" value={fmt(totalNov)} color="amber" />
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
 
      {/* ── Charts ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Top Revenue Streams YTD (₦M)</div>
          <StreamsBarChart data={barData} colors={COLORS} />
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Payer Mix</div>
          <RevenuePieChart data={PAYER_DATA} colors={PAYER_COLORS} />
        </div>
      </div>
 
      {/* ── Table ─────────────────────────────────────── */}
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
              <th>Nov</th>
              <th>MoM Δ</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const pct = total > 0 ? (s.ytd / total * 100).toFixed(1) : 0;
              const nov = s.monthly[10] || 0;
              const oct = s.monthly[9] || 0;
              const mom = oct > 0 ? ((nov - oct) / oct * 100).toFixed(1) : null;
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
                  <td>{fmt(nov)}</td>
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
              <td style={{ fontWeight: 700 }}>{fmt(STREAMS.reduce((s, x) => s + (x.monthly[10] || 0), 0))}</td>
              <td>—</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </DashboardLayout>
  );
}