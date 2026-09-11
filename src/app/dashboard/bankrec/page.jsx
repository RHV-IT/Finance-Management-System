'use client';
 
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { useSheetData } from '../lib/useConfig';
import { useConfig } from '../lib/ConfigProvider';
import { fmt } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';
 
const n = v => parseFloat(String(v || 0).replace(/[₦,]/g, '')) || 0;
const MATCH_WINDOW_DAYS = 3;
 
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
 
// Greedy date+amount match: for each bank line, find an unclaimed cashbook
// entry with the identical signed amount within MATCH_WINDOW_DAYS. Not
// persisted anywhere — recomputed fresh from the two sheets every load,
// since there's no backend to save a manual tick/override to yet.
function autoMatch(bankRows, bookRows) {
  const bookPool = bookRows.map((r, i) => ({ ...r, _idx: i, _claimed: false }));
  const bankResults = [];
  const bookMatchedIdx = new Set();
 
  bankRows.forEach(bankRow => {
    const bankAmt = n(bankRow.amount);
    const bankDate = new Date(bankRow.date);
    let best = null;
    let bestDiff = Infinity;
 
    bookPool.forEach(bookRow => {
      if (bookRow._claimed) return;
      if (n(bookRow.amount) !== bankAmt) return;
      const diffDays = Math.abs((new Date(bookRow.date) - bankDate) / 864e5);
      if (diffDays <= MATCH_WINDOW_DAYS && diffDays < bestDiff) {
        best = bookRow;
        bestDiff = diffDays;
      }
    });
 
    if (best) {
      best._claimed = true;
      bookMatchedIdx.add(best._idx);
      bankResults.push({ ...bankRow, matched: true });
    } else {
      bankResults.push({ ...bankRow, matched: false });
    }
  });
 
  const bookResults = bookRows.map((r, i) => ({ ...r, matched: bookMatchedIdx.has(i) }));
  return { bankResults, bookResults };
}
 
export default function BankRecPage() {
  const { getByModule, loading: configLoading, error: configError, reload } = useConfig();
  const bankConn = getByModule('bank_statement');
  const bookConn = getByModule('cashbook_entries');
 
  const bankState = useSheetData(bankConn);
  const bookState = useSheetData(bookConn);
 
  if (configLoading) return <div><Loading message="Loading sheet configuration from Google Drive…" /></div>;
  if (configError) return (
    <div>
      <SheetError label="Sheet configuration" error={`Could not load the connections manifest: ${configError}`} onRefetch={reload} />
    </div>
  );
 
  if (!bankConn) return (
    <div>
      <SheetError label="Bank Statement" error={`No connection with module "bank_statement" is configured. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "bankrec".`} />
    </div>
  );
  if (!bookConn) return (
    <div>
      <SheetError label="Cashbook Entries" error={`No connection with module "cashbook_entries" is configured. Add one in Settings, and make sure its feeds[] (or a visualization's pages[]) includes "bankrec". Note: revenue_monthly won't work here — it's monthly totals, not line-level entries, so it can't be matched line-by-line against the bank statement.`} />
    </div>
  );
 
  if (bankState.loading || bookState.loading) return <div><Loading message="Loading bank statement and cashbook entries…" /></div>;
  if (bankState.error) return <div><SheetError label={bankConn.label} error={bankState.error} onRefetch={bankState.refetch} /></div>;
  if (bookState.error) return <div><SheetError label={bookConn.label} error={bookState.error} onRefetch={bookState.refetch} /></div>;
  if (!bankState.rows?.length) return <div><SheetError label={bankConn.label} error={`The "${bankConn.tabName}" tab returned 0 rows.`} onRefetch={bankState.refetch} /></div>;
  if (!bookState.rows?.length) return <div><SheetError label={bookConn.label} error={`The "${bookConn.tabName}" tab returned 0 rows.`} onRefetch={bookState.refetch} /></div>;
 
  const { bankResults, bookResults } = autoMatch(bankState.rows, bookState.rows);
 
  const matchedCount = bankResults.filter(r => r.matched).length;
  const bankUnmatched = bankResults.filter(r => !r.matched);
  const bookUnmatched = bookResults.filter(r => !r.matched);
  const bankUnmatchedTotal = bankUnmatched.reduce((s, r) => s + n(r.amount), 0);
  const bookUnmatchedTotal = bookUnmatched.reduce((s, r) => s + n(r.amount), 0);
 
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🏦 Bank Reconciliation</h2>
          <p className={styles.pageMeta}>Live auto-match by date + amount — not saved anywhere, recomputed on every load</p>
        </div>
      </div>
 
      <div style={{ background:'#FFF9E6', border:'1px solid #F4D03F', borderRadius:8, padding:'12px 16px', marginBottom:14, fontSize:11, color:'#856404' }}>
        ⚠ Matching here is computed automatically every time this page loads (date ± {MATCH_WINDOW_DAYS} days, exact amount) —
        there's no manual ticking or persisted match state, since this system has no write-back path yet.
        Manual overrides or a saved match history would need real backend storage, not a spreadsheet.
      </div>
 
      <div className={styles.kpiGrid} style={{ marginBottom: 14 }}>
        <KPICard label="Auto-Matched" value={matchedCount} delta={`of ${bankResults.length} bank lines`} deltaType="up" color="green" />
        <KPICard label="Unmatched (Bank)" value={bankUnmatched.length} delta={fmt(bankUnmatchedTotal)} deltaType={bankUnmatched.length > 0 ? 'warn' : 'up'} color={bankUnmatched.length > 0 ? 'amber' : 'green'} />
        <KPICard label="Unmatched (Book)" value={bookUnmatched.length} delta={fmt(bookUnmatchedTotal)} deltaType={bookUnmatched.length > 0 ? 'warn' : 'up'} color={bookUnmatched.length > 0 ? 'amber' : 'green'} />
        <KPICard label="Unexplained Variance" value={fmt(bankUnmatchedTotal - bookUnmatchedTotal)} color={Math.abs(bankUnmatchedTotal - bookUnmatchedTotal) < 1 ? 'green' : 'red'} />
      </div>
 
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div className={tableStyles.tableBox} style={{ margin:0 }}>
          <div className={tableStyles.tableTitle}>Bank Statement Lines</div>
          <table className={tableStyles.table}>
            <thead><tr><th>Date</th><th>Description</th><th className={tableStyles.right}>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {bankResults.map((r, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace:'nowrap' }}>{r.date}</td>
                  <td>{r.description}</td>
                  <td className={tableStyles.right}>{fmt(n(r.amount))}</td>
                  <td><span className={`${tableStyles.badge} ${r.matched ? tableStyles.green : tableStyles.amber}`}>{r.matched ? 'Matched' : 'Unmatched'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
 
        <div className={tableStyles.tableBox} style={{ margin:0 }}>
          <div className={tableStyles.tableTitle}>Cashbook (Book) Entries</div>
          <table className={tableStyles.table}>
            <thead><tr><th>Date</th><th>Description</th><th className={tableStyles.right}>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {bookResults.map((r, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace:'nowrap' }}>{r.date}</td>
                  <td>{r.description}</td>
                  <td className={tableStyles.right}>{fmt(n(r.amount))}</td>
                  <td><span className={`${tableStyles.badge} ${r.matched ? tableStyles.green : tableStyles.amber}`}>{r.matched ? 'Matched' : 'Unmatched'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}