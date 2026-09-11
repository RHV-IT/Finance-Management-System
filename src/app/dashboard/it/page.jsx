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

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'kpi', label: '📈 KPI Tracker' },
  { id: 'devices', label: '💻 Devices & Equipment' },
  { id: 'subscriptions', label: '📄 Subscriptions' },
  { id: 'downtime', label: '🔌 Downtime' },
  { id: 'projects', label: '🛠 Projects' },
  { id: 'risk', label: '⚠ Risk Register' },
  { id: 'emrkpi', label: '🏥 EMR KPIs' },
];

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

function tabGuard(conn, moduleName, state) {
  if (!conn) return <SheetError label={moduleName} error={`No connection with module "${moduleName}" is configured yet. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "it".`} />;
  if (state.loading) return <Loading message={`Loading "${conn.label}" from Google Sheets…`} />;
  if (state.error) return <SheetError label={conn.label} error={state.error} onRefetch={state.refetch} />;
  if (!state.rows || state.rows.length === 0) return <SheetError label={conn.label} error={`The sheet connected fine, but the "${conn.tabName}" tab returned 0 rows.`} onRefetch={state.refetch} />;
  return null;
}

function latestPeriodRows(rows) {
  const periods = [...new Set(rows.map(r => r._period).filter(Boolean))].sort();
  const latest = periods[periods.length - 1];
  return { latest, rows: latest ? rows.filter(r => r._period === latest) : rows };
}

export default function ITPage() {
  const [tab, setTab] = useState('overview');

  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();

  const kpiConn = getByModule('it_kpi_weekly');
  const devicesConn = getByModule('it_devices');
  const recurSubConn = getByModule('it_recurrent_subscriptions');
  const softSubConn = getByModule('it_software_subscriptions');
  const netDownConn = getByModule('it_network_downtime');
  const emrDownConn = getByModule('it_emr_downtime');
  const projectsConn = getByModule('it_software_projects');
  const riskConn = getByModule('risk_register');
  const emrKpiConn = getByModule('emr_kpi');

  const kpiState = useSheetData(kpiConn);
  const devicesState = useSheetData(devicesConn);
  const recurSubState = useSheetData(recurSubConn);
  const softSubState = useSheetData(softSubConn);
  const netDownState = useSheetData(netDownConn);
  const emrDownState = useSheetData(emrDownConn);
  const projectsState = useSheetData(projectsConn);
  const riskState = useSheetData(riskConn);
  const emrKpiState = useSheetData(emrKpiConn);

  if (configLoading) return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
  if (configError) return (
    <div>
      <SheetError label="Sheet configuration" error={`Could not load the connections manifest: ${configError}`} onRefetch={reload} />
    </div>
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>💻 IT Department</h2>
          <p className={styles.pageMeta}>Weekly KPIs · Devices · Subscriptions · Downtime · Projects</p>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 14px', cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
            background: 'transparent', border: 'none', fontFamily: 'inherit',
            borderBottom: `2px solid ${tab === t.id ? 'var(--teal)' : 'transparent'}`,
            color: tab === t.id ? 'var(--teal)' : 'var(--muted)', marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════ */}
      {tab === 'overview' && (() => {
        const devGuard = tabGuard(devicesConn, 'it_devices', devicesState);
        const netGuard = tabGuard(netDownConn, 'it_network_downtime', netDownState);
        const emrGuard = tabGuard(emrDownConn, 'it_emr_downtime', emrDownState);
        const recurGuard = tabGuard(recurSubConn, 'it_recurrent_subscriptions', recurSubState);
        const softGuard = tabGuard(softSubConn, 'it_software_subscriptions', softSubState);

        let totalDevices = null, faultyDevices = null, inRepair = null;
        if (!devGuard) {
          const { rows } = latestPeriodRows(devicesState.rows);
          totalDevices = rows.reduce((s, r) => s + n(r.statusQty), 0);
          faultyDevices = rows.reduce((s, r) => s + n(r.statusFaulty), 0);
          inRepair = rows.reduce((s, r) => s + n(r.usageInRepair), 0);
        }
        const netTotal = !netGuard ? netDownState.rows.reduce((s, r) => s + n(r.duration), 0) : null;
        const emrTotal = !emrGuard ? emrDownState.rows.reduce((s, r) => s + n(r.duration), 0) : null;

        let expiringSoon = 0;
        if (!recurGuard || !softGuard) {
          const now = new Date();
          const check = (rows) => rows.filter(r => {
            if (!r.renewalDate) return false;
            const days = (new Date(r.renewalDate) - now) / 864e5;
            return days > 0 && days < 30;
          }).length;
          if (!recurGuard) expiringSoon += check(latestPeriodRows(recurSubState.rows).rows);
          if (!softGuard) expiringSoon += check(latestPeriodRows(softSubState.rows).rows);
        }

        return (
          <div className={styles.kpiGrid}>
            {totalDevices !== null && <KPICard label="Total Devices" value={totalDevices} delta={`${faultyDevices} faulty · ${inRepair} in repair`} deltaType={faultyDevices > 0 ? 'warn' : 'up'} color={faultyDevices > 0 ? 'amber' : 'green'} />}
            {netTotal !== null && <KPICard label="Network Downtime (min)" value={netTotal.toLocaleString()} delta="all recorded incidents" deltaType="warn" color="red" />}
            {emrTotal !== null && <KPICard label="EMR Downtime (min)" value={emrTotal.toLocaleString()} delta="all recorded incidents" deltaType="warn" color="red" />}
            {(!recurGuard || !softGuard) && <KPICard label="Expiring Subscriptions" value={expiringSoon} delta="within 30 days" deltaType={expiringSoon > 0 ? 'warn' : 'up'} color={expiringSoon > 0 ? 'amber' : 'green'} />}
            {totalDevices === null && netTotal === null && emrTotal === null && (
              <div style={{ gridColumn: '1/-1' }}><SheetError label="IT Overview" error="None of the underlying connections are ready yet — check the other tabs for specifics." /></div>
            )}
          </div>
        );
      })()}

      {/* ══ KPI TRACKER ═══════════════════════════════════════ */}
      {tab === 'kpi' && (() => {
        const guard = tabGuard(kpiConn, 'it_kpi_weekly', kpiState);
        if (guard) return guard;
        return <PageRenderer page="it" module="it_kpi_weekly" />;
      })()}

      {/* ══ DEVICES & EQUIPMENT ═══════════════════════════════ */}
      {tab === 'devices' && (() => {
        const guard = tabGuard(devicesConn, 'it_devices', devicesState);
        if (guard) return guard;

        const { latest, rows } = latestPeriodRows(devicesState.rows);
        const totQty = rows.reduce((s, r) => s + n(r.statusQty), 0);
        const good = rows.reduce((s, r) => s + n(r.statusGood), 0);
        const faulty = rows.reduce((s, r) => s + n(r.statusFaulty), 0);
        const deployed = rows.reduce((s, r) => s + n(r.usageDeployed), 0);
        const inStore = rows.reduce((s, r) => s + n(r.usageInStore), 0);
        const inRepair = rows.reduce((s, r) => s + n(r.usageInRepair), 0);

        return (
          <>
            <div className={styles.kpiGrid} style={{ marginBottom: 14 }}>
              {/*<KPICard label={`Total (${latest || 'latest'})`} value={totQty} color="blue" />*/}
              <KPICard label="Good" value={good} color="green" />
              <KPICard label="Faulty" value={faulty} deltaType={faulty > 0 ? 'warn' : 'up'} color={faulty > 0 ? 'amber' : 'green'} />
              <KPICard label="Deployed / In Use" value={deployed} color="teal" />
              <KPICard label="In Store" value={inStore} color="purple" />
              <KPICard label="In Repair" value={inRepair} deltaType={inRepair > 0 ? 'warn' : 'up'} color={inRepair > 0 ? 'amber' : 'green'} />
            </div>
            <PageRenderer page="it" module="it_devices" />
            {/*<PageRenderer page="it" module="it_devices" only={['table', 'bar', 'pie']} /> */}
          </>
        );
      })()}

      {/* ══ SUBSCRIPTIONS ═════════════════════════════════════ */}
      {tab === 'subscriptions' && (() => {
        const recurGuard = tabGuard(recurSubConn, 'it_recurrent_subscriptions', recurSubState);
        const softGuard = tabGuard(softSubConn, 'it_software_subscriptions', softSubState);
        if (recurGuard && softGuard) return recurGuard;

        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Recurrent Subscriptions</div>
              {recurGuard || <PageRenderer page="it" module="it_recurrent_subscriptions" only={['table']} />}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Software Subscriptions</div>
              {softGuard || <PageRenderer page="it" module="it_software_subscriptions" only={['table']} />}
            </div>
          </div>
        );
      })()}

      {/* ══ DOWNTIME ═══════════════════════════════════════════ */}
      {tab === 'downtime' && (() => {
        const netGuard = tabGuard(netDownConn, 'it_network_downtime', netDownState);
        const emrGuard = tabGuard(emrDownConn, 'it_emr_downtime', emrDownState);
        if (netGuard && emrGuard) return netGuard;

        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Network Disruption & Internet Down Time</div>
              {netGuard || (
                <>
                  <div style={{ marginBottom: 10 }}><PageRenderer page="it" module="it_network_downtime" only={['kpi']} /></div>
                  <PageRenderer page="it" module="it_network_downtime" only={['table']} />
                </>
              )}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>EMR Downtime</div>
              {emrGuard || (
                <>
                  <div style={{ marginBottom: 10 }}><PageRenderer page="it" module="it_emr_downtime" only={['kpi']} /></div>
                  <PageRenderer page="it" module="it_emr_downtime" only={['table']} />
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══ PROJECTS ═══════════════════════════════════════════ */}
      {tab === 'projects' && (() => {
        const guard = tabGuard(projectsConn, 'it_software_projects', projectsState);
        if (guard) return guard;
        return <PageRenderer page="it" module="it_software_projects" only={['table']} />;
      })()}

      {/* ══ RISK REGISTER ══════════════════════════════════════ */}
      {tab === 'risk' && (() => {
        const guard = tabGuard(riskConn, 'risk_register', riskState);
        if (guard) return guard;
        return <PageRenderer page="it" module="risk_register" only={['table']} />;
      })()}

      {/* ══ EMR KPIs ═══════════════════════════════════════════ */}
      {tab === 'emrkpi' && (() => {
        const guard = tabGuard(emrKpiConn, 'emr_kpi', emrKpiState);
        if (guard) return guard;
        return <PageRenderer page="it" module="emr_kpi" only={['table']} />;
      })()}
    </div>
  );
}
