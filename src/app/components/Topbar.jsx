'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from '../styles/Topbar.module.css';

// "pharmacy" -> "Pharmacy", "vendor-outstanding" -> "Vendor Outstanding"
function humanize(slug) {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function Topbar({ onMenuToggle }) {
  const pathname = usePathname();
  const slug = pathname.split('/').filter(Boolean)[1] || 'overview';
  const pageTitle = humanize(slug);

  const [time, setTime] = useState('');
  const [today, setToday] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [roleIcon, setRoleIcon] = useState('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      setToday(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // sessionStorage doesn't exist on the server, so read it in an effect.
  useEffect(() => {
    setRoleLabel(sessionStorage.getItem('rhv_role_label') || '');
    setRoleIcon(sessionStorage.getItem('rhv_role_icon') || '');
  }, []);

  function handleExport() {
    // Chrome/Edge use document.title as the default PDF filename.
    const prevTitle = document.title;
    document.title = `RHV - ${pageTitle} - ${new Date().toISOString().slice(0, 10)}`;
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    // Small delay so the title change lands before the print dialog opens.
    setTimeout(() => window.print(), 150);
  }

  function handleLogout() {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith('rhv_'))
      .forEach(k => sessionStorage.removeItem(k));
  }

  return (
    <>
      <header className={styles.topbar} data-print="hide">
        <button className={styles.menuBtn} onClick={onMenuToggle} aria-label="Toggle menu">☰</button>

        <Link href="/dashboard/overview" className={styles.logo}>
          <span className={styles.logoMark}>RHV</span>
          <span className={styles.logoText}>ERP</span>
        </Link>

        <span className={styles.divider} />
        <h1 className={styles.pageTitle}>{pageTitle}</h1>

        <div className={styles.spacer} />

        <button className={styles.exportBtn} onClick={handleExport} title="Save this page as a PDF">
          <span aria-hidden="true">⬇</span> Export PDF
        </button>

        <span className={styles.clock}>{time}</span>

        {roleLabel && (
          <div className={styles.user}>
            <span className={styles.userIcon}>{roleIcon || '🏥'}</span>
            <span className={styles.userName}>{roleLabel}</span>
          </div>
        )}

        <Link href="/" className={styles.logout} onClick={handleLogout}>Logout</Link>
      </header>

      {/* Invisible on screen, shown only on the printed page */}
      <div className={styles.printHeader} data-print="only">
        <div>
          <div className={styles.printBrand}>RHV Hospital · ERP</div>
          <div className={styles.printTitle}>{pageTitle}</div>
        </div>
        <div className={styles.printMeta}>
          <div>{roleLabel}</div>
          <div>{today}</div>
        </div>
      </div>
    </>
  );
}