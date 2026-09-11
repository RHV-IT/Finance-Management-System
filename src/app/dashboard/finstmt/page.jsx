'use client';
 
import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import { fmt } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
 
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
 
function printStatement() {
  window.print();
}
 
export default function FinancialStatementsPage() {
  const [tab, setTab] = useState('is');
 
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const revenueConn = getByModule('revenue_monthly');
  const { rows, loading: rowsLoading, error: rowsError, refetch } = useSheetData(revenueConn);
 
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
          <h2 className={styles.pageTitle}>📑 Financial Statements</h2>
          <p className={styles.pageMeta}>Income Statement is real, from your revenue/expense sheet. Balance Sheet is not available yet — see why below.</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={printStatement} className={styles.btnGhost}>🖨 Print / PDF</button>
        </div>
      </div>
 
      <div className={styles.tabStrip} style={{ marginBottom: 14 }}>
        <button onClick={() => setTab('is')} className={`${styles.tabBtn} ${tab === 'is' ? styles.active : ''}`}>📈 Income Statement</button>
        <button onClick={() => setTab('bs')} className={`${styles.tabBtn} ${tab === 'bs' ? styles.active : ''}`}>⚖ Balance Sheet</button>
      </div>
 
      {tab === 'is' && (() => {
        if (!revenueConn) return (
          <SheetError label="Monthly Revenue & Expenses" error={`No connection with module "revenue_monthly" is configured. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "finstmt".`} />
        );
        if (rowsLoading) return <Loading message={`Loading "${revenueConn.label}" from Google Sheets…`} />;
        if (rowsError) return <SheetError label={revenueConn.label} error={rowsError} onRefetch={refetch} />;
        if (!rows?.length) return <SheetError label={revenueConn.label} error={`The "${revenueConn.tabName}" tab returned 0 rows.`} onRefetch={refetch} />;
 
        const monthly = rows.map(r => ({
          month: (r.month || '').slice(0, 3),
          revenue: n(r.revenue),
          expenses: n(r.expenses),
        }));
        const totRev = monthly.reduce((s, r) => s + r.revenue, 0);
        const totExp = monthly.reduce((s, r) => s + r.expenses, 0);
        const netIncome = totRev - totExp;
 
        return (
          <div>
            <div style={{ background:'#EBF5FB', border:'1px solid #AED6F1', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:11, color:'var(--navy)' }}>
              This is a simplified statement — Revenue and Expenses as single line items, since there's no chart
              of accounts to break them into standard sub-categories (Cost of Sales, Operating Expenses, etc.) yet.
            </div>
 
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Income Statement — {monthly.length} month{monthly.length !== 1 ? 's' : ''}</div>
              <table className={tableStyles.table}>
                <tbody>
                  <tr style={{ fontWeight:700, background:'#f0f4f8' }}><td colSpan={2}>Revenue</td></tr>
                  <tr><td style={{ paddingLeft:24 }}>Total Revenue</td><td className={tableStyles.right}>{fmt(totRev)}</td></tr>
                  <tr style={{ fontWeight:700, background:'#f0f4f8' }}><td colSpan={2}>Expenses</td></tr>
                  <tr><td style={{ paddingLeft:24 }}>Total Expenses</td><td className={tableStyles.right} style={{ color:'var(--red)' }}>({fmt(totExp)})</td></tr>
                  <tr style={{ fontWeight:800, background:'#0a5c3a', color:'#fff' }}>
                    <td>NET INCOME</td>
                    <td className={tableStyles.right}>{netIncome >= 0 ? fmt(netIncome) : `(${fmt(Math.abs(netIncome))})`}</td>
                  </tr>
                </tbody>
              </table>
            </div>
 
            <div className={tableStyles.tableBox}>
              <div className={tableStyles.tableTitle}>Monthly Detail</div>
              <table className={tableStyles.table}>
                <thead><tr><th>Month</th><th className={tableStyles.right}>Revenue</th><th className={tableStyles.right}>Expenses</th><th className={tableStyles.right}>Net</th></tr></thead>
                <tbody>
                  {monthly.map((m, i) => {
                    const net = m.revenue - m.expenses;
                    return (
                      <tr key={i}>
                        <td>{m.month}</td>
                        <td className={tableStyles.right} style={{ color:'var(--teal)' }}>{fmt(m.revenue)}</td>
                        <td className={tableStyles.right} style={{ color:'var(--red)' }}>{fmt(m.expenses)}</td>
                        <td className={tableStyles.right} style={{ fontWeight:700, color: net >= 0 ? 'var(--teal)' : 'var(--red)' }}>{net >= 0 ? '+' : ''}{fmt(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
 
      {tab === 'bs' && (
        <div style={{ background:'#FEECEC', border:'1.5px solid #F1948A', borderRadius:10, padding:'24px', textAlign:'center' }}>
          <div style={{ fontSize:28, marginBottom:10 }}>🧱</div>
          <div style={{ fontSize:13, fontWeight:800, color:'var(--navy)', marginBottom:8 }}>Balance Sheet isn't buildable yet</div>
          <div style={{ fontSize:11, color:'var(--muted)', maxWidth:520, marginLeft:'auto', marginRight:'auto', lineHeight:1.7 }}>
            A Balance Sheet needs Assets = Liabilities + Equity, which means tracking account balances from
            a real chart of accounts and double-entry journal postings — not just revenue/expense totals.
            Nothing in this system currently records assets, liabilities, or equity at all, so there's no data
            to build this from, real or otherwise. This needs a genuine general-ledger feature (chart of
            accounts + journal entries + balance rollups), which is a significant piece of new scope, not a
            missing sheet.
          </div>
        </div>
      )}
    </div>
  );
}