'use client';

import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import ReconciliationAlert from '../../components/ReconciliationAlert';
import { useData, usePeriodFilter, PeriodFilterBar } from '../../dashboard/lib/useData';
import {
  RevenueVsTargetChart, RevenueVsExpensesChart,
  SurplusChart, DebtorsTrendChart, RevenuePieChart,
} from '../../components/Charts';
import {
  MONTHS, REVENUE_2025, EXPENSES_2025, MONTHLY_TARGET,
  STREAMS, DEBTORS, COLORS, DEMO_REVENUE_MONTHLY, DEMO_DEBTORS,
  fmt, fmtM,
} from '../../dashboard/lib/data';
import styles from '../../styles/Layout.module.css';

export default function OverviewPage() {
  const { month, setMonth, monthOptions, availableMonths } = usePeriodFilter('2025-11', 'revenue_monthly');

  // Load uploaded revenue data; fall back to built-in arrays
  const revenueRows = useData('revenue_monthly', DEMO_REVENUE_MONTHLY);
  const debtorRows  = useData('debtors', DEMO_DEBTORS, { month });

  // Aggregate from loaded rows when real data exists; else use demo arrays
  const hasUploadedRev = revenueRows.length > 0 && revenueRows[0].revenue !== undefined;

  const tRev = hasUploadedRev
    ? revenueRows.reduce((s,r) => s+(parseFloat(r.revenue)||0), 0)
    : REVENUE_2025.reduce((a,b)=>a+b, 0);

  const tExp = hasUploadedRev
    ? revenueRows.reduce((s,r) => s+(parseFloat(r.expenses)||0), 0)
    : EXPENSES_2025.reduce((a,b)=>a+b, 0);

  const tSur  = tRev - tExp;
  const tDeb  = debtorRows.reduce((s,r)=>s+(parseFloat(r.amount||r.period2||0)||0), 0) || DEBTORS.latest;
  const debR  = tRev > 0 ? tDeb / (tRev/11) : 0;
  const gm    = tRev > 0 ? (tRev - tExp*0.52) / tRev : 0;
  const expR  = tRev > 0 ? tExp / tRev : 0;
  const ach   = MONTHLY_TARGET > 0 ? tRev / (MONTHLY_TARGET * 11) : 0;

  // Chart data — from uploaded rows or demo
  const monthlyChartData = hasUploadedRev
    ? revenueRows.map(r => ({
        month:    (r.month||'').slice(0,3),
        revenue:  fmtM(parseFloat(r.revenue)||0),
        expenses: fmtM(parseFloat(r.expenses)||0),
        target:   fmtM(parseFloat(r.target)||MONTHLY_TARGET),
        surplus:  fmtM((parseFloat(r.revenue)||0)-(parseFloat(r.expenses)||0)),
      }))
    : MONTHS.map((m,i) => ({
        month:    m,
        revenue:  fmtM(REVENUE_2025[i]),
        expenses: fmtM(EXPENSES_2025[i]),
        target:   fmtM(MONTHLY_TARGET),
        surplus:  fmtM(REVENUE_2025[i]-EXPENSES_2025[i]),
      }));

  const debtorChartData = DEBTORS.categories.map((cat,i) => ({
    period: cat.length > 14 ? cat.slice(0,14)+'…' : cat,
    oct:    fmtM(DEBTORS.data[i][0]),
    nov:    fmtM(DEBTORS.data[i][1]),
  }));

  const pieData = STREAMS.slice(0,6).map(s => ({
    name:  s.name.length>18?s.name.slice(0,18)+'…':s.name,
    value: fmtM(s.ytd),
  }));

  return (
    <DashboardLayout>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>🏥 RHV Executive Dashboard</h2>
          <p className={styles.pageMeta}>RHV Finance · FY 2025</p>
        </div>
      </div>

      <ReconciliationAlert />

      <PeriodFilterBar
        month={month} setMonth={setMonth}
        monthOptions={monthOptions} availableMonths={availableMonths}
        showMonth={true} showDept={false}
        isRealData={hasUploadedRev}
      />

      <div className={styles.kpiGrid}>
        <KPICard label="Total Revenue YTD"    value={fmt(tRev)} delta={`${(ach*100).toFixed(0)}% of annual target`} deltaType={ach>=1?'up':'warn'} badge={ach>=1?'✓ On Track':'Monitor'} badgeType={ach>=1?'good':'warn'} color="green" />
        <KPICard label="Outstanding Receivables" value={fmt(tDeb)} delta="Target < ₦25M" deltaType={tDeb>25e6?'down':'up'} badge={tDeb>25e6?'⚠ Action':'✓ OK'} badgeType={tDeb>25e6?'bad':'good'} color={tDeb>25e6?'red':'green'} />
        <KPICard label="Debtor / Revenue Ratio"  value={`${(debR*100).toFixed(1)}%`} delta="Target < 20%" deltaType={debR>0.2?'down':'up'} color={debR>0.2?'red':'green'} />
        <KPICard label="Est. Gross Margin"       value={`${(gm*100).toFixed(1)}%`} delta="Target > 45%" deltaType={gm>0.45?'up':'warn'} color="gold" />
        <KPICard label="Operating Margin"        value={tRev>0?`${(tSur/tRev*100).toFixed(1)}%`:'—'} delta={tSur>0?'Positive surplus':'Deficit'} deltaType={tSur>0?'up':'down'} badge={tSur>0?'Surplus':'Deficit'} badgeType={tSur>0?'good':'bad'} color={tSur>0?'green':'red'} />
        <KPICard label="Expense Ratio"           value={`${(expR*100).toFixed(1)}%`} delta="Target < 60%" deltaType={expR<0.6?'up':'down'} color={expR<0.6?'green':'amber'} />
        <KPICard label="Net Surplus / (Deficit)" value={fmt(tSur)} delta="After all expenses" deltaType={tSur>0?'up':'down'} badge={tSur>0?'Positive':'Deficit'} badgeType={tSur>0?'good':'bad'} color={tSur>0?'green':'red'} />
        <KPICard label="Total Expenditure"       value={fmt(tExp)} delta="YTD expenses" deltaType="warn" color="amber" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <div className={styles.card}><div className={styles.cardTitle}>Monthly Revenue vs Target</div><RevenueVsTargetChart data={monthlyChartData} /></div>
        <div className={styles.card}><div className={styles.cardTitle}>Revenue vs Expenditure</div><RevenueVsExpensesChart data={monthlyChartData} /></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:14, marginBottom:14 }}>
        <div className={styles.card}><div className={styles.cardTitle}>Monthly Surplus / (Deficit)</div><SurplusChart data={monthlyChartData} /></div>
        <div className={styles.card}><div className={styles.cardTitle}>Debtors Trend</div><DebtorsTrendChart data={debtorChartData} /></div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Revenue Mix</div>
          <RevenuePieChart data={pieData} colors={COLORS} />
        </div>
      </div>
    </DashboardLayout>
  );
}