// app/dashboard/layout.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import { ConfigProvider } from './lib/ConfigProvider';
import styles from '../styles/Layout.module.css';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  // null = "we haven't checked yet" — never a real role. This is the fix:
  // nobody is treated as ANY role, admin included, until we've actually
  // confirmed one from sessionStorage.
  const [role, setRole] = useState(null);
  const [checked, setChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('rhv_role');
    if (!saved) { router.push('/login'); return; }
    setRole(saved);
    setChecked(true);
  }, [router]);

  // Render NOTHING until we know for sure. This is what stops the
  // sidebar/topbar (and anything admin-only inside them) from flashing on
  // screen for a moment before the redirect to /login fires.
  if (!checked) return null; // swap for a spinner/loading screen if you'd like something visible

  return (
    <ConfigProvider>
      <Topbar role={role} onMenuToggle={() => setSidebarOpen(o => !o)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className={styles.main}>{children}</main>
    </ConfigProvider>
  );
}