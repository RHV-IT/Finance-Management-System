'use client';
 
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { KPI_RATINGS } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const green  = KPI_RATINGS.filter(k => k.rating === 'green').length;
const amber  = KPI_RATINGS.filter(k => k.rating === 'amber').length;
const red    = KPI_RATINGS.filter(k => k.rating === 'red').length;
 
const RATING_MAP = {
  green: { emoji: '🟢', label: 'On Track',        cls: tableStyles.green },
  amber: { emoji: '🟡', label: 'Monitor',          cls: tableStyles.amber },
  red:   { emoji: '🔴', label: 'Action Required',  cls: tableStyles.red   },
};
 
const ACTION_MAP = {
  green: 'On track — maintain momentum',
  amber: 'Monitor weekly — intervention may be needed',
  red:   'Immediate action required',
};
 
export default function KPIPage() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🎯 KPI Scorecard</h2>
          <p className={styles.pageMeta}>Hospital performance matrix · FY 2024–2025</p>
        </div>
      </div>
 
      {/* ── Summary cards ─────────────────────────── */}
      <div className={styles.kpiGrid}>
        <KPICard label="On Track" value={green} delta="🟢 Green KPIs" deltaType="up" badge="Good" badgeType="good" color="green" />
        <KPICard label="Monitor" value={amber} delta="🟡 Amber KPIs" deltaType="warn" badge="Watch" badgeType="warn" color="amber" />
        <KPICard label="Action Required" value={red} delta="🔴 Red KPIs" deltaType="down" badge="Act Now" badgeType="bad" color="red" />
        <KPICard label="Total KPIs Tracked" value={KPI_RATINGS.length} color="blue" />
      </div>
 
      {/* ── Visual scorecard ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        {KPI_RATINGS.map(k => {
          const r = RATING_MAP[k.rating];
          return (
            <div key={k.kpi} style={{
              background: 'var(--card)',
              borderRadius: 10,
              padding: '14px 16px',
              boxShadow: 'var(--shadow-sm)',
              borderLeft: `4px solid ${k.rating === 'green' ? 'var(--teal)' : k.rating === 'red' ? 'var(--red)' : 'var(--amber)'}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.4 }}>
                {r.emoji} {r.label}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 8, lineHeight: 1.3 }}>{k.kpi}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 10 }}>
                <div style={{ color: 'var(--muted)' }}>2024: <strong>{k.v24}</strong></div>
                <div style={{ color: 'var(--navy)' }}>2025: <strong>{k.v25}</strong></div>
                <div style={{ color: 'var(--muted)', gridColumn: '1/-1' }}>Target: <strong>{k.target}</strong></div>
              </div>
            </div>
          );
        })}
      </div>
 
      {/* ── Full matrix table ─────────────────────── */}
      <div className={tableStyles.tableBox}>
        <div className={tableStyles.tableTitle}>KPI Performance Matrix</div>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>KPI</th>
              <th>2024</th>
              <th>2025</th>
              <th>Target</th>
              <th>Rating</th>
              <th>Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {KPI_RATINGS.map((k, i) => {
              const r = RATING_MAP[k.rating];
              return (
                <tr key={k.kpi}>
                  <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{k.kpi}</td>
                  <td style={{ color: 'var(--muted)' }}>{k.v24}</td>
                  <td style={{ fontWeight: 700 }}>{k.v25}</td>
                  <td style={{ fontSize: 11 }}>{k.target}</td>
                  <td>
                    <span className={`${tableStyles.badge} ${r.cls}`}>
                      {r.emoji} {r.label}
                    </span>
                  </td>
                  <td style={{ fontSize: 10, color: 'var(--muted)' }}>{ACTION_MAP[k.rating]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}