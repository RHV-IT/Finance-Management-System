'use client';

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { DynamicVizList, DynamicViz } from '../../components/DynamicViz';
import { useConfig, useSheetData } from '../lib/useConfig';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';

const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;

const TABS = [
  { key: 'overview',     label: '📊 Overview'         },
  { key: 'workforce',    label: '👥 Workforce'        },
  { key: 'lnd',        labe: 'L & D'                },
  { key: 'attendance',   label: '🕐 Attendance'       },
  { key: 'leave',        label: '🏖 Leave Requests'   },
  { key: 'initiatives',        label: '🏖 Initiatives'   },
  { key: 'payroll',      label: '💰 Payroll'          },
  { key: 'recruitment',  label: '📋 Recruitment'      },
  { key: 'discilinary',  label: '📋 Disciplinary'      },
];

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', cursor: 'pointer', fontSize: 11,
      fontWeight: 600, whiteSpace: 'nowrap', background: 'transparent',
      border: 'none', fontFamily: 'inherit',
      borderBottom: `2px solid ${active ? 'var(--teal)' : 'transparent'}`,
      color: active ? 'var(--teal)' : 'var(--muted)', marginBottom: -2,
    }}>{children}</button>
  );
}

function SheetError({ error, onRefetch }) {
  const notConnected = error?.includes('not connected') || error?.includes('Sheet ID');
  return (
    <div style={{ background: notConnected ? '#FFF9E6' : '#FEECEC', border: `1.5px solid ${notConnected ? '#F4D03F' : '#F1948A'}`, borderRadius: 10, padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{notConnected ? '🔗' : '⚠️'}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
        {notConnected ? 'Sheet not connected yet' : 'Failed to load data'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>{error}</div>
      {notConnected
        ? <a href="/settings" style={{ padding: '8px 18px', background: 'var(--navy)', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>⚙ Go to Settings</a>
        : onRefetch && <button onClick={onRefetch} style={{ padding: '8px 18px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}>↻ Retry</button>
      }
    </div>
  );
}

function Loading() {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: i === 0 ? '#f5f7f9' : '#fff' }}>
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} style={{ flex: 1, height: 12, borderRadius: 4, background: i === 0 ? '#dde1e7' : '#f0f2f5', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

export default function HRPage() {
  const [tab, setTab] = useState('overview');

  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();

  const staffConn      = getByModule('hr_staff');
  const attendanceConn = getByModule('hr_attendance');
  const leaveConn      = getByModule('hr_leave');
  const payrollConn    = getByModule('hr_payroll');
  const recruitConn    = getByModule('hr_recruitment');

  const staff      = useSheetData(staffConn);
  const attendance = useSheetData(attendanceConn);
  const leave      = useSheetData(leaveConn);
  const payroll    = useSheetData(payrollConn);
  const recruit    = useSheetData(recruitConn);

  const anyLoading = configLoading || [staff, attendance, leave, payroll, recruit].some(s => s.loading);
  const anyConnected = [staff, attendance, leave, payroll, recruit].some(s => s.rows.length > 0);

  // ── KPI derivations ──────────────────────────────────────
  const totalStaff     = staff.rows.length;
  const activeStaff    = staff.rows.filter(r => (r.status || '').toLowerCase() === 'active').length;
  const depts          = [...new Set(staff.rows.map(r => r.dept).filter(Boolean))].length;
  const totalPayroll   = payroll.rows.reduce((s, r) => s + n(r.netPay || r.amount), 0);
  const pendingLeave   = leave.rows.filter(r => (r.status || '').toLowerCase() === 'pending').length;
  const openPositions  = recruit.rows.filter(r => (r.status || '').toLowerCase().includes('open')).length;

  const fmt = v => `₦${Number(v).toLocaleString()}`;

  if (configLoading) return (
    <DashboardLayout>
      <div style={{ textAlign: 'center', padding: 64, color: 'var(--muted)' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Loading HR configuration…</div>
      </div>
    </DashboardLayout>
  );

  if (configError) return (
    <DashboardLayout>
      <div style={{ padding: 24 }}>
        <SheetError error={`Config error: ${configError}`} onRefetch={reload} />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>👥 Human Resources</h2>
          <p className={styles.pageMeta}>Staff management · Attendance · Leave · Payroll · Recruitment</p>
        </div>
        <button
          onClick={() => { staff.refetch(); attendance.refetch(); leave.refetch(); payroll.refetch(); recruit.refetch(); }}
          disabled={anyLoading}
          style={{ padding: '7px 16px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: anyLoading ? 'wait' : 'pointer' }}
        >{anyLoading ? '⏳ Loading…' : '↻ Refresh All'}</button>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 16,
        background: anyConnected ? '#E8F8F5' : '#FFF9E6',
        border: `1px solid ${anyConnected ? '#A9DFBF' : '#F4D03F'}`, borderRadius: 8,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: anyConnected ? '#117A65' : '#CA6F1E' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: anyConnected ? '#117A65' : '#CA6F1E' }}>
          {anyLoading ? 'Loading…' : anyConnected ? '✓ Live from Google Sheets' : 'Sheets not connected — go to Settings'}
        </span>
        {!anyConnected && <a href="/settings" style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: 'var(--navy)', textDecoration: 'none' }}>⚙ Settings →</a>}
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <KPICard label="Total Staff"       value={totalStaff}    delta="All employees"         deltaType="up"   color="blue"   />
        <KPICard label="Active Staff"      value={activeStaff}   delta="Currently employed"    deltaType="up"   color="green"  />
        <KPICard label="Departments"       value={depts}         delta="Covered"               deltaType="up"   color="purple" />
        <KPICard label="Monthly Payroll"   value={fmt(totalPayroll)} delta="Net pay this month" deltaType="warn" color="amber"  />
        <KPICard label="Pending Leave"     value={pendingLeave}
          delta="Awaiting approval" deltaType={pendingLeave > 0 ? 'warn' : 'up'}
          badge={pendingLeave > 0 ? '⚠ Action' : '✓ Clear'}
          badgeType={pendingLeave > 0 ? 'warn' : 'good'} color={pendingLeave > 0 ? 'amber' : 'green'} />
        <KPICard label="Open Positions"    value={openPositions}
          delta="Vacancies" deltaType={openPositions > 0 ? 'warn' : 'up'} color="red" />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16, overflowX: 'auto' }}>
        {TABS.map(t => <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</TabBtn>)}
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div>
          {staffConn?.visualizations?.length > 0
            ? <DynamicVizList connection={staffConn} rows={staff.rows} only={['bar', 'pie']} />
            : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Dept breakdown from staff rows */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Staff by Department</div>
                  {staff.loading ? <Loading /> : staff.error ? <SheetError error={staff.error} onRefetch={staff.refetch} /> : (
                    <div>
                      {Object.entries(
                        staff.rows.reduce((acc, r) => { const d = r.dept || 'Unknown'; acc[d] = (acc[d] || 0) + 1; return acc; }, {})
                      ).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
                        <div key={dept} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                          <span style={{ fontWeight: 600 }}>{dept}</span>
                          <span style={{ color: 'var(--muted)' }}>{count} staff</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Leave summary */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Leave Summary</div>
                  {leave.loading ? <Loading /> : leave.error ? <SheetError error={leave.error} onRefetch={leave.refetch} /> : (
                    <div>
                      {Object.entries(
                        leave.rows.reduce((acc, r) => { const s = r.status || 'Unknown'; acc[s] = (acc[s] || 0) + 1; return acc; }, {})
                      ).map(([status, count]) => {
                        const color = status.toLowerCase() === 'approved' ? '#117A65' : status.toLowerCase() === 'pending' ? '#CA6F1E' : '#C0392B';
                        return (
                          <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                            <span style={{ fontWeight: 600, color }}>{status}</span>
                            <span style={{ color: 'var(--muted)' }}>{count} requests</span>
                          </div>
                        );
                      })}
                      {leave.rows.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>No leave data</div>}
                    </div>
                  )}
                </div>
              </div>
            )
          }
        </div>
      )}

      {/* ══ STAFF REGISTER ════════════════════════════════════ */}
      {tab === 'staff' && (
        staff.error ? <SheetError error={staff.error} onRefetch={staff.refetch} />
        : staff.loading ? <Loading />
        : staffConn?.visualizations?.find(v => v.type === 'table')
          ? <DynamicVizList connection={staffConn} rows={staff.rows} only={['table']} />
          : (
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Staff Register — {totalStaff} employees</div>
              <div style={{ overflowX: 'auto' }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr><th>Staff ID</th><th>Name</th><th>Department</th><th>Role / Position</th><th>Employment Type</th><th>Date Joined</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {staff.rows.map((r, i) => {
                      const statusColor = (r.status || '').toLowerCase() === 'active' ? tableStyles.green : tableStyles.red;
                      return (
                        <tr key={i}>
                          <td style={{ fontSize: 10, color: 'var(--muted)' }}>{r.staffId || r.id || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{r.name || '—'}</td>
                          <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.dept || r.department || '—'}</span></td>
                          <td>{r.role || r.position || '—'}</td>
                          <td style={{ fontSize: 10 }}>{r.employmentType || r.type || '—'}</td>
                          <td style={{ fontSize: 10, color: 'var(--muted)' }}>{r.dateJoined || r.startDate || '—'}</td>
                          <td><span className={`${tableStyles.badge} ${statusColor}`}>{r.status || '—'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}

      {/* ══ ATTENDANCE ════════════════════════════════════════ */}
      {tab === 'attendance' && (
        attendance.error ? <SheetError error={attendance.error} onRefetch={attendance.refetch} />
        : attendance.loading ? <Loading />
        : attendanceConn?.visualizations?.length > 0
          ? <DynamicVizList connection={attendanceConn} rows={attendance.rows} />
          : (
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Attendance Records — {attendance.rows.length} entries</div>
              <div style={{ overflowX: 'auto' }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr><th>Date</th><th>Staff Name</th><th>Department</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {attendance.rows.map((r, i) => {
                      const statusColor = (r.status || '').toLowerCase() === 'present' ? tableStyles.green
                        : (r.status || '').toLowerCase() === 'absent' ? tableStyles.red : tableStyles.amber;
                      return (
                        <tr key={i}>
                          <td>{r.date || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{r.name || r.staffName || '—'}</td>
                          <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.dept || r.department || '—'}</span></td>
                          <td>{r.timeIn || '—'}</td>
                          <td>{r.timeOut || '—'}</td>
                          <td>{r.hours || r.hoursWorked || '—'}</td>
                          <td><span className={`${tableStyles.badge} ${statusColor}`}>{r.status || '—'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}

      {/* ══ LEAVE ═════════════════════════════════════════════ */}
      {tab === 'leave' && (
        leave.error ? <SheetError error={leave.error} onRefetch={leave.refetch} />
        : leave.loading ? <Loading />
        : leaveConn?.visualizations?.length > 0
          ? <DynamicVizList connection={leaveConn} rows={leave.rows} />
          : (
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Leave Requests — {pendingLeave} pending</div>
              <div style={{ overflowX: 'auto' }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr><th>Staff Name</th><th>Department</th><th>Leave Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Approved By</th></tr>
                  </thead>
                  <tbody>
                    {leave.rows.map((r, i) => {
                      const statusColor = (r.status || '').toLowerCase() === 'approved' ? tableStyles.green
                        : (r.status || '').toLowerCase() === 'pending' ? tableStyles.amber : tableStyles.red;
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{r.name || r.staffName || '—'}</td>
                          <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.dept || r.department || '—'}</span></td>
                          <td>{r.leaveType || r.type || '—'}</td>
                          <td>{r.startDate || r.from || '—'}</td>
                          <td>{r.endDate || r.to || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{r.days || '—'}</td>
                          <td><span className={`${tableStyles.badge} ${statusColor}`}>{r.status || '—'}</span></td>
                          <td style={{ fontSize: 10, color: 'var(--muted)' }}>{r.approvedBy || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}

      {/* ══ PAYROLL ═══════════════════════════════════════════ */}
      {tab === 'payroll' && (
        payroll.error ? <SheetError error={payroll.error} onRefetch={payroll.refetch} />
        : payroll.loading ? <Loading />
        : payrollConn?.visualizations?.length > 0
          ? <DynamicVizList connection={payrollConn} rows={payroll.rows} />
          : (
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Payroll — {fmt(totalPayroll)} net total</div>
              <div style={{ overflowX: 'auto' }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr><th>Staff Name</th><th>Department</th><th>Gross Pay</th><th>Deductions</th><th>Net Pay</th><th>Month</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {payroll.rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.name || r.staffName || '—'}</td>
                        <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.dept || r.department || '—'}</span></td>
                        <td>{fmt(n(r.grossPay || r.gross))}</td>
                        <td style={{ color: 'var(--red)' }}>{fmt(n(r.deductions || r.deduction))}</td>
                        <td style={{ fontWeight: 700 }}>{fmt(n(r.netPay || r.net || r.amount))}</td>
                        <td style={{ fontSize: 10, color: 'var(--muted)' }}>{r.month || r.period || '—'}</td>
                        <td><span className={`${tableStyles.badge} ${(r.status||'').toLowerCase() === 'paid' ? tableStyles.green : tableStyles.amber}`}>{r.status || '—'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ fontWeight: 700 }}>TOTAL NET PAY</td>
                      <td style={{ fontWeight: 700 }}>{fmt(totalPayroll)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )
      )}

      {/* ══ RECRUITMENT ═══════════════════════════════════════ */}
      {tab === 'recruitment' && (
        recruit.error ? <SheetError error={recruit.error} onRefetch={recruit.refetch} />
        : recruit.loading ? <Loading />
        : recruitConn?.visualizations?.length > 0
          ? <DynamicVizList connection={recruitConn} rows={recruit.rows} />
          : (
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Recruitment Pipeline — {openPositions} open positions</div>
              <div style={{ overflowX: 'auto' }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr><th>Position</th><th>Department</th><th>Applicants</th><th>Stage</th><th>Date Posted</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {recruit.rows.map((r, i) => {
                      const statusColor = (r.status || '').toLowerCase().includes('open') ? tableStyles.green
                        : (r.status || '').toLowerCase().includes('close') ? tableStyles.red : tableStyles.amber;
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{r.position || r.role || r.title || '—'}</td>
                          <td><span className={`${tableStyles.badge} ${tableStyles.blue}`}>{r.dept || r.department || '—'}</span></td>
                          <td style={{ fontWeight: 600 }}>{r.applicants || r.count || '—'}</td>
                          <td>{r.stage || r.phase || '—'}</td>
                          <td style={{ fontSize: 10, color: 'var(--muted)' }}>{r.datePosted || r.date || '—'}</td>
                          <td><span className={`${tableStyles.badge} ${statusColor}`}>{r.status || '—'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}
    </DashboardLayout>
  );
}