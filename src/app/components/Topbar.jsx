'use client';
 
import Link from 'next/link';
import { useState, useEffect } from 'react';
import styles from '../styles/Topbar.module.css';
 
export default function Topbar({ role, onMenuToggle }) {
  const [time, setTime] = useState('');
  const [year, setYear] = useState('2025');
 
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
 
  const ROLE_LABELS = {
    admin:       'Management / Admin',
    revenue:     'Revenue / Billing',
    store:       'Store Unit',
    payables:    'Payables',
    procurement: 'Procurement',
    pharmacy:    'Pharmacy',
    coo:         'COO',
    ceo:         'CEO',
  };
 
  return (
    <header className={styles.topbar}>
      {/* Hamburger (mobile) */}
      <button
        className={styles.topBtn}
        onClick={onMenuToggle}
        aria-label="Toggle menu"
        style={{ display:'none', fontSize:'18px', padding:'4px 9px' }}
        id="ham-btn"
      >
        ☰
      </button>
 
      {/* Logo */}
      <Link href="dashboard/overview" className={styles.logo}>
        <div className={styles.logoIcon}>RHV</div>
        <span className={styles.logoText}>RHV <span>ERP</span></span>
      </Link>
 
      {/* Status indicator */}
      <div className={`${styles.statusDot} ${styles.demo}`} title="Demo mode" />
      <span className={styles.statusLabel}>Demo</span>
 
      <div className={styles.spacer} />
 
      {/* Year selector */}
      <select
        className={styles.yearSelect}
        value={year}
        onChange={e => setYear(e.target.value)}
        aria-label="Fiscal year"
      >
        <option value="2024">FY 2024</option>
        <option value="2025">FY 2025</option>
        <option value="2026">FY 2026</option>
      </select>
 
      <button className={styles.topBtn} onClick={() => window.print()}>⬇ PDF</button>
      <button className={styles.topBtn}>↻ Refresh</button>
 
      {/* Role badge */}
      {role && (
        <span
          className={styles.roleBadge}
          style={{ background: role === 'ceo' ? '#922B21' : role === 'coo' ? '#8E44AD' : '#117A65' }}
        >
          {ROLE_LABELS[role] || role}
        </span>
      )}
 
      {/* Timestamp */}
      <span className={styles.timestamp}>Updated {time}</span>
 
      {/* Logout */}
      <Link href="/" className={styles.topBtn}>Logout</Link>
    </header>
  );
}