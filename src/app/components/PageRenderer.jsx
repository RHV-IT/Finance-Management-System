'use client';

/**
 * components/PageRenderer.jsx
 *
 * Drop this into any page — it reads ALL connections configured
 * to feed that page from the Drive JSON, fetches their sheets,
 * and renders their visualizations automatically.
 *
 * USAGE:
 *   <PageRenderer page="inventory" />
 *   <PageRenderer page="inventory" only={['kpi']} />
 *   <PageRenderer page="inventory" section="Stock Register tab" />
 *
 *   // Scope to one (or more) modules — e.g. one tab per module
 *   <PageRenderer page="inventory" module="stock_register" />
 *   <PageRenderer page="inventory" module={['srv_receipts', 'stock_out']} />
 *
 * When a user adds a new connection in Settings pointing to this page,
 * it shows up here automatically — no code changes needed.
 *
 * Individual vizs can also override which pages they appear on:
 *   viz.pages = ["overview", "inventory"]  → shows on both pages
 *
 * A viz with `hidden: true` is skipped entirely — it stays saved with its
 * config intact (toggleable back on from Settings) but never renders.
 *
 * `module` filters on top of `page` — it never widens the result set,
 * only narrows it. A connection must still feed `page` (via feeds[]
 * or viz.pages) AND have connection.module in the requested module(s).
 */

import { useConfig, useSheetData } from '../dashboard/lib/useConfig';
import { DynamicViz, DynamicVizList, detectTimeSeries } from './DynamicViz';
import styles from '../styles/Layout.module.css';

// ─── Helpers ──────────────────────────────────────────────────

function SheetError({ label, error, onRefetch }) {
  const notConnected = error?.includes('not connected') || error?.includes('Sheet ID');
  return (
    <div style={{
      background: notConnected ? '#FFF9E6' : '#FEECEC',
      border: `1.5px solid ${notConnected ? '#F4D03F' : '#F1948A'}`,
      borderRadius: 10, padding: '20px 24px', textAlign: 'center', marginBottom: 14,
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{notConnected ? '🔗' : '⚠️'}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>
        {label}: {notConnected ? 'Sheet not connected' : 'Failed to load'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>{error}</div>
      {notConnected
        ? <a href="/dashboard/settings" style={{ padding: '7px 16px', background: 'var(--navy)', color: '#fff', borderRadius: 7, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>⚙ Settings</a>
        : onRefetch && <button onClick={onRefetch} style={{ padding: '7px 16px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>↻ Retry</button>
      }
    </div>
  );
}

function Loading() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ height: 80, background: '#f0f2f5', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

// Normalizes the `module` prop (string | string[] | undefined) into an array,
// or null when no module filter was requested.
function normalizeModules(module) {
  if (!module) return null;
  return Array.isArray(module) ? module : [module];
}

// ─── Single connection renderer ───────────────────────────────

/**
 * Renders one connection's vizs that are configured for a specific page.
 * Filters vizs by:
 *   1. viz.hidden — always excluded, regardless of anything else
 *   2. viz.pages includes this page (if viz.pages is set)
 *   3. OR connection.feeds includes this page (if viz.pages is not set — falls back to connection-level)
 */
function ConnectionSection({ connection, page, only, section }) {
  const { rows, loading, error, refetch } = useSheetData(connection);

  if (loading) return <Loading />;
  if (error)   return <SheetError label={connection.label || connection.module} error={error} onRefetch={refetch} />;

  // Filter vizs for this page — hidden ones are dropped first, before any
  // other filter, so they never leak through regardless of page/section/only.
  const allVizs = (connection.visualizations || []).filter(v => !v.hidden);
  const vizs = allVizs.filter(viz => {
    // If viz has explicit pages array — use that
    if (viz.pages && viz.pages.length > 0) {
      return viz.pages.includes(page);
    }
    // Otherwise fall back to connection-level feeds
    return (connection.feeds || []).some(f => f.page === page);
  });

  // Filter by type if only[] is provided
  const filtered = only ? vizs.filter(v => only.includes(v.type)) : vizs;

  // Filter by section name if provided
  const sectionFiltered = section
    ? filtered.filter(v => !v.section || v.section === section)
    : filtered;

  if (sectionFiltered.length === 0) return null;

  const kpis   = sectionFiltered.filter(v => v.type === 'kpi');
  const charts = sectionFiltered.filter(v => ['bar','grouped_bar','line','grouped_line','pie'].includes(v.type));
  const tables = sectionFiltered.filter(v => v.type === 'table');

  return (
    <div style={{ marginBottom: 8 }}>
      {/* KPI grid */}
      {kpis.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
          gap: 12, marginBottom: 16,
        }}>
          {kpis.map(viz => <DynamicViz key={viz.id} viz={viz} rows={rows} />)}
        </div>
      )}

      {/* Charts grid */}
      {charts.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: charts.length === 1 ? '1fr' : '1fr 1fr',
          gap: 14, marginBottom: 16,
        }}>
          {charts.map(viz => <DynamicViz key={viz.id} viz={viz} rows={rows} />)}
        </div>
      )}

      {/* Tables */}
      {tables.map(viz => (
        <div key={viz.id} style={{ marginBottom: 16 }}>
          <DynamicViz viz={viz} rows={rows} />
        </div>
      ))}
    </div>
  );
}

// ─── Main renderer ────────────────────────────────────────────

export default function PageRenderer({ page, module, only, section, groupByConnection = false }) {
  const { connections, loading: configLoading, error: configError } = useConfig();
  const wantedModules = normalizeModules(module);

  if (configLoading) return <Loading />;

  if (configError) return (
    <div style={{ background: '#FEECEC', border: '1px solid #F1948A', borderRadius: 8, padding: '12px 16px', fontSize: 11, color: 'var(--red)' }}>
      Failed to load config: {configError} — <a href="/dashboard/settings" style={{ color: 'var(--teal)' }}>Settings</a>
    </div>
  );

  // Find all connections that feed this page
  // A connection feeds a page if:
  //   1. Any of its feeds[] has page === page
  //   2. OR any of its vizs has viz.pages includes page
  const pageConnections = connections.filter(conn => {
    const feedsPage = (conn.feeds || []).some(f => f.page === page);
    const vizFeedsPage = (conn.visualizations || []).some(v => v.pages?.includes(page));
    const matchesPage = feedsPage || vizFeedsPage;

    if (!matchesPage) return false;

    // `module` narrows further — connection.module must be in the requested set.
    // A connection with no `module` field never matches a module-scoped request.
    if (wantedModules) {
      return conn.module != null && wantedModules.includes(conn.module);
    }

    return true;
  });

  if (pageConnections.length === 0) {
    const moduleNote = wantedModules
      ? ` and module "${wantedModules.join('", "')}"`
      : '';
    const moduleHint = wantedModules
      ? ` Check that a connection in Settings has its "module" field set to exactly "${wantedModules.join('" or "')}", and that it (or one of its visualizations) is configured to feed the "${page}" page.`
      : ` Add a connection in Settings whose feeds[] (or a visualization's pages[]) includes "${page}".`;

    return (
      <div style={{ background: '#F4F6F9', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>
        No sheet connections configured for page "{page}"{moduleNote}.
        <div style={{ marginTop: 6, fontSize: 10.5 }}>{moduleHint}</div>
        <a href="/dashboard/settings" style={{ color: 'var(--teal)', fontWeight: 600, display: 'inline-block', marginTop: 8 }}>Go to Settings →</a>
      </div>
    );
  }

  return (
    <div>
      {pageConnections.map(conn => (
        <ConnectionSection
          key={conn.id}
          connection={conn}
          page={page}
          only={only}
          section={section}
        />
      ))}
    </div>
  );
}

/**
 * Convenience: render only KPI cards for a page (optionally scoped to a module)
 * Usage: <PageKPIs page="inventory" />
 *        <PageKPIs page="inventory" module="stock_register" />
 */
export function PageKPIs({ page, module }) {
  return <PageRenderer page={page} module={module} only={['kpi']} />;
}

/**
 * Convenience: render only charts (no KPIs, no tables)
 * Usage: <PageCharts page="inventory" />
 *        <PageCharts page="inventory" module="stock_register" />
 */
export function PageCharts({ page, module }) {
  return <PageRenderer page={page} module={module} only={['bar','grouped_bar','line','grouped_line','pie']} />;
}

/**
 * Convenience: render only tables
 * Usage: <PageTables page="inventory" />
 *        <PageTables page="inventory" module="stock_register" />
 */
export function PageTables({ page, module }) {
  return <PageRenderer page={page} module={module} only={['table']} />;
}