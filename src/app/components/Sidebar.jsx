'use client';
 
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../styles/Sidebar.module.css';
 
const NAV = [
  { section: 'Overview' },
  { href:'/dashboard/overview',      icon:'📊', label:'Dashboard',         badge: null },
 
  { section: 'Revenue' },
  { href:'/dashboard/revenue',       icon:'💰', label:'Revenue Streams',   badge: null },
  { href:'/dashboard/weekly',        icon:'📅', label:'Weekly / Periodic', badge: null },
  { href:'/dashboard/deptanalysis',  icon:'🏥', label:'Dept Analysis',     badge: null },
 
  { section: 'Financials' },
  { href:'/dashboard/expenses',      icon:'💸', label:'Expenditures',      badge: null },
  { href:'/dashboard/debtors',       icon:'🏦', label:'Debtors',           badge: '⚠' },
  { href:'/dashboard/cashbook',      icon:'📒', label:'Cashbook',          badge: null },
  { href:'/dashboard/invoicing',     icon:'🧾', label:'Invoicing',         badge: null },
  { href:'/dashboard/gl',            icon:'📚', label:'GL / Journals',     badge: null },
  { href:'/dashboard/bankrec',       icon:'🔗', label:'Bank Reconciliation',badge: null },
  { href:'/dashboard/budget',        icon:'🎯', label:'Budget vs Actual',  badge: null },
  { href:'/dashboard/finstmt',       icon:'📑', label:'Financial Statements',badge: null },
 
  { section: 'Operations' },
  { href:'/dashboard/hr',         icon:'', label:'HR', badge: null },
  { href:'/dashboard/store',         icon:'📦', label:'Store / Inventory', badge: null },
  { href:'/dashboard/supplychain',   icon:'🛒', label:'Supply Chain',      badge: null },
  { href:'/dashboard/grn',           icon:'📥', label:'Goods Received',    badge: null },
  { href:'/dashboard/pharmacy',      icon:'💊', label:'Pharmacy',          badge: null },
  { href:'/dashboard/cssd',          icon:'♻️', label:'CSSD',              badge: null },
  { href:'/dashboard/kitchen',       icon:'🍽️', label:'Kitchen Mgmt',     badge: null },
 
  { section: 'Procurement' },
  { href:'/dashboard/p2p',           icon:'🔄', label:'Procure-to-Pay',    badge: null },
  { href:'/dashboard/requisition',   icon:'📝', label:'New Requisition',   badge: null },
  { href:'/dashboard/reqtrack',      icon:'🔎', label:'Request Tracking',  badge: null },
  { href:'/dashboard/itemmaster',      icon:'🔎', label:'Item Master',  badge: null },
  { href:'/dashboard/prosearch',      icon:'🔎', label:'Procurement Search',  badge: null },
  { href:'/dashboard/vendoroutstanding',      icon:'🔎', label:'Vendor Outstanding',  badge: null },
  { href:'/dashboard/vendors',       icon:'🚚', label:'Vendors / SRV',     badge: null },
  { href:'/dashboard/assets',        icon:'🏗',  label:'Asset Register',    badge: null },
  { href:'/dashboard/payables',      icon:'💳', label:'Payables',          badge: null },
 
  { section: 'Communication' },
  { href:'/dashboard/approvals',     icon:'✅', label:'Approvals',         badge: '3' },
  { href:'/dashboard/notifications', icon:'🔔', label:'Notifications',     badge: '6' },
  { href:'/dashboard/audittrail',    icon:'📋', label:'Audit Trail',       badge: null },
 
  { section: 'Reports' },
  { href:'/dashboard/kpi',           icon:'🎯', label:'KPI Scorecard',     badge: null },
  { href:'/dashboard/pharmkpi',      icon:'💊', label:'Pharmacy KPIs',     badge: null },
  { href:'/dashboard/prockpi',       icon:'📦', label:'Procurement KPIs',  badge: null },
  { href:'/dashboard/archive',       icon:'🗃',  label:'Archive',           badge: null },
 
  { section: 'Admin' },
  { href:'/dashboard/settings',      icon:'⚙',  label:'Settings',          badge: null },
];
 
export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
 
  return (
    <>
      {/* Overlay (mobile) */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.show : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
 
      <nav className={`${styles.sidebar} ${isOpen ? styles.open : ''}`} aria-label="Main navigation">
        {NAV.map((item, i) => {
          if (item.section) {
            return (
              <div key={`sec-${i}`} className={styles.section}>
                {item.section}
              </div>
            );
          }
 
          const isActive = pathname === item.href || (item.href !== '/overview' && pathname.startsWith(item.href));
 
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={onClose}
            >
              <span className={styles.icon} aria-hidden="true">{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
              {item.badge && (
                <span className={styles.badge}>{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}