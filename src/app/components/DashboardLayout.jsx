'use client';
 
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import '../styles/Layout.module.css';
import styles from '../styles/Layout.module.css';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [role, setRole] = useState('admin');
  const [sidebarOpen, setSidebarOpen] = useState(false);
 
  useEffect(() => {
    const saved = sessionStorage.getItem('rhv_role');
    if (!saved) { router.push('/login'); return; }
    setRole(saved);
  }, [router]);
 
  return (
    <>
      <Topbar role={role} onMenuToggle={() => setSidebarOpen(o => !o)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className={styles.main}>
        {children}
      </main>
    </>
  );
}