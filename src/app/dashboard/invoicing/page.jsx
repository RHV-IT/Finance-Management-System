'use client';
 
import DashboardLayout from '../../components/DashboardLayout';
import KPICard from '../../components/KPICard';
import { CashFlowChart, CumulativeCashChart } from '../../components/Charts';
import { MONTHS, REVENUE_2025, EXPENSES_2025, fmt, fmtM } from '../lib/data';
import styles from '../../styles/Layout.module.css';
import tableStyles from '../../styles/Table.module.css';


export default function InvoicingPage() {
    return(
        <div>
            <DashboardLayout>
                <div className={styles.pageHeader}>
                    <div>
                        <h2 className={styles.pageTitle}>🧾Invoicing</h2>
                        <p className={styles.pageMeta}>Create invoices, send to customers/vendors, track payment status.</p>
                    </div>
                </div>

                {/* ── KPIs ─────────────────────────────────── */}
                <div className={styles.kpiGrid}>
                    <KPICard label="Total invoiced" color="green" />
                    <KPICard label="Paid" color="red" />
                    <KPICard
                    label="Outstanding"
                    />
                </div>

                <div>
                    
                </div>

                <div className={tableStyles.tableBox}>
                    <div className={tableStyles.tableTitle}>Full Year Monthly Summary</div>
                        <table className={tableStyles.table}>
                            <thead>
                            <tr>
                                <th>#</th>
                                <th>INVOICE NO</th>
                                <th>DATE</th>
                                <th>CUSTOMER</th>
                                <th>PAYER</th>
                                <th>TOTAL</th>
                                <th>DUE</th>
                                <th>STATUS</th>
                                <th>ACTIONS</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <td style={{ fontWeight: 600 }}></td>
                                <td style={{ color: 'var(--teal)', fontWeight: 600 }}></td>
                                <td style={{ color: 'var(--red)' }}></td>
                                <td style={{ fontWeight: 700}}> </td>
                                <td style={{  }}> </td>
                                <td> </td>
                                <td> </td>
                                <td> </td>
                                <td> </td>
                            </tr>
                            
                            </tbody>
                        </table>
                    </div>
            </DashboardLayout>
        </div>
    )
}