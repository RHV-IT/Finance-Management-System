'use client';
 
/**
 * app/(dashboard)/pharmkpi/page.jsx  (adjust path to wherever this lives)
 *
 * Real-data KPI breakdown, sourced from the "pharmacy_scorecard" connection
 * (module: pharmacy_scorecard). Unlike pharmacy/page.jsx — which is about
 * operational tabs (Dispensing / Stock / Requests) each with a handful of
 * summary KPIs at the top — this page IS the KPI view: every measure in the
 * scorecard becomes its own card, grouped by category, with a month-over-
 * month delta where the value is numeric.
 *
 * Composite rows (e.g. "Pharmacist:04 / Pharm.Tech:04 / Porter:01 / Admin:01")
 * are already split into separate synthetic rows by scorecardParser.js before
 * they get here — each sub-metric (e.g. "Number of pharmacy staff under
 * supervision — Pharmacist") just shows up as its own card automatically.
 */
 
import { useState, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import styles from '../../styles/Layout.module.css';
 
// ─── Guards (same pattern as the other revamped pages) ────────────────────
 
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
        <a href="/settings" style={{ padding: '8px 18px', background: 'var(--navy)', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>⚙ Go to Settings</a>
        {onRefetch && !notConnected && (
          <button onClick={onRefetch} style={{ padding: '8px 18px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>↻ Retry</button>
        )}
      </div>
    </div>
  );
}
 
function Loading({ message }) {
  return <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)', fontSize: 12 }}>⏳ {message}</div>;
}
 
// ─── Numeric / delta helpers ───────────────────────────────────────────────
 
// Parses "74%", "3,541", "04", "—" etc. Returns null for genuinely non-numeric
// values (e.g. "Ivf Pcm", drug names) so those render as plain text cards.
function toNumber(v) {
  const s = String(v ?? '').replace(/[₦,%]/g, '').trim();
  if (s === '' || s === '-' || s === '—') return null;
  const f = parseFloat(s);
  return isNaN(f) ? null : f;
}
 
const isPercentString = v => typeof v === 'string' && v.trim().endsWith('%');
 
function computeDelta(currRaw, prevRaw) {
  const curr = toNumber(currRaw);
  const prev = toNumber(prevRaw);
  if (curr === null || prev === null || prev === 0) return null;
  const diff = curr - prev;
  return { diff, up: diff > 0, flat: diff === 0 };
}
 
function formatDisplayValue(raw) {
  const num = toNumber(raw);
  if (num === null) return String(raw); // text metric (e.g. "Ivf Pcm")
  if (isPercentString(raw)) return `${num}%`;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
 
// ─── One KPI card per metric — takes that metric's rows across all periods ─
 
function ScorecardKPICard({ metricRows }) {
  const sorted = useMemo(
    () => [...metricRows].sort((a, b) => a._period.localeCompare(b._period)),
    [metricRows]
  );
  const latest = sorted[sorted.length - 1];
  const prev   = sorted.length > 1 ? sorted[sorted.length - 2] : null;
 
  const delta = prev ? computeDelta(latest.value, prev.value) : null;
  const isText = toNumber(latest.value) === null;
 
  return (
    <KPICard
      label={latest.metric}
      value={formatDisplayValue(latest.value)}
      delta={
        isText
          ? latest._monthLabel
          : prev
            ? `${prev._monthLabel} → ${latest._monthLabel}`
            : latest._monthLabel
      }
      deltaType={delta ? (delta.up ? 'up' : delta.flat ? 'neutral' : 'down') : 'neutral'}
      badge={delta ? `${delta.diff > 0 ? '+' : ''}${delta.diff.toFixed(1)}` : undefined}
      badgeType={delta ? (delta.up ? 'good' : 'warn') : undefined}
      color={isText ? 'purple' : 'blue'}
    />
  );
}
 
// ─── Page ───────────────────────────────────────────────────────────────
 
export default function PharmKPIPage() {
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const scorecardConn = getByModule('pharmacy_scorecard');
  const { rows, loading, error, refetch } = useSheetData(scorecardConn);
 
  const [activeCategory, setActiveCategory] = useState(null);
 
  // Group once per rows change: categories (in sheet order), rows-by-category,
  // and the full list of periods present (so we can show a "latest period" tag).
  const { categories, byCategory, periods } = useMemo(() => {
    if (!rows?.length) return { categories: [], byCategory: {}, periods: [] };
 
    const cats = [];
    const grouped = {};
    rows.forEach(r => {
      if (!grouped[r.category]) { grouped[r.category] = []; cats.push(r.category); }
      grouped[r.category].push(r);
    });
 
    const periodSet = [...new Set(rows.map(r => r._period))].sort();
    return { categories: cats, byCategory: grouped, periods: periodSet };
  }, [rows]);
 
  // ── Guards ──
  if (configLoading) return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
 
  if (configError) return (
    <div>
      <SheetError label="Sheet configuration" error={`Could not load the connections manifest: ${configError}`} onRefetch={reload} />
    </div>
  );
 
  if (!scorecardConn) return (
    <div>
      <SheetError
        label="Pharmacy Scorecard"
        error={`No connection with module "pharmacy_scorecard" is configured. Add one in Settings (tabMode: "scorecard") pointing at the 2026 Scorecard sheet.`}
      />
    </div>
  );
 
  if (loading) return <div><Loading message={`Loading "${scorecardConn.label}" from Google Sheets…`} /></div>;
 
  if (error) return (
    <div>
      <SheetError label={scorecardConn.label} error={error} onRefetch={refetch} />
    </div>
  );
 
  if (!rows || rows.length === 0) return (
    <div>
      <SheetError
        label={scorecardConn.label}
        error={`The sheet connected fine, but no KPI rows were parsed. Check the "range" and "scorecard.colMap/monthCols" settings for this connection against the actual sheet layout.`}
        onRefetch={refetch}
      />
    </div>
  );
 
  const currentCategory = categories.includes(activeCategory) ? activeCategory : categories[0];
  const categoryRows    = byCategory[currentCategory] || [];
  const latestPeriod    = periods[periods.length - 1];
 
  // Group this category's rows by metric name — composite sub-metrics
  // (e.g. "... — Pharmacist", "... — Admin") already arrive as distinct
  // `metric` values from the parser, so they naturally become separate cards.
  const metricOrder = [];
  const metricGroups = {};
  categoryRows.forEach(r => {
    if (!metricGroups[r.metric]) { metricGroups[r.metric] = []; metricOrder.push(r.metric); }
    metricGroups[r.metric].push(r);
  });
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>💊 Pharmacy KPI Scorecard</h2>
          <p className={styles.pageMeta}>
            {metricOrder.length} KPIs in "{currentCategory}" · {categories.length} categories total · latest period {latestPeriod}
          </p>
        </div>
      </div>
 
      {/* ── Category tabs — driven entirely by what's in the sheet, no hardcoding ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap', borderBottom: '2px solid var(--border)', paddingBottom: 12 }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '7px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: `1.5px solid ${currentCategory === cat ? 'var(--teal)' : 'var(--border)'}`,
              background: currentCategory === cat ? '#E8F8F5' : '#fff',
              color: currentCategory === cat ? 'var(--teal)' : 'var(--muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {cat}
            <span style={{ marginLeft: 6, opacity: 0.6, fontWeight: 600 }}>
              {Object.keys(metricGroups).length && cat === currentCategory ? metricOrder.length : ''}
            </span>
          </button>
        ))}
      </div>
 
      {/* ── Dense KPI grid — one card per metric (sub-metrics included) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
        {metricOrder.map(metric => (
          <ScorecardKPICard key={metric} metricRows={metricGroups[metric]} />
        ))}
      </div>
    </div>
  );
}
 