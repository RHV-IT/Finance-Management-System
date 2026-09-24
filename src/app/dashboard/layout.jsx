'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import { getAllowedPages, hasAccess } from './lib/permissions';
import styles from '../styles/Layout.module.css';
import { ConfigProvider } from './lib/ConfigProvider';

// Paths under /dashboard that are plain documentation, not real dashboard
// screens — no login required, no Topbar/Sidebar, no page-access guard.
const PUBLIC_PATHS = ['/dashboard/settings/connection-guide'];

// The page to send someone to when they land somewhere outside theirazaa
// allowedPages — their own first allowed page, not a hardcoded default,
// since "Overview" specifically might not be something they're allowed
// to see at all.
function getDefaultPageHref(allowedPages) {
    if (!allowedPages || allowedPages.includes('*')) return '/dashboard/overview';
    return allowedPages.length > 0 ? `/dashboard/${allowedPages[0]}` : null; // null = genuinely nowhere valid to send them
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  const [role, setRole] = useState(null);
  const [checked, setChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isPublic) { setChecked(true); return; }
    const saved = sessionStorage.getItem('rhv_role');
    if (!saved) { router.push('/login'); return; }
    setRole(saved);
    setChecked(true);
  }, [router, isPublic]);

  const allowedPages = checked && !isPublic ? getAllowedPages() : ['*'];
  const hasAnyAccess  = allowedPages.includes('*') || allowedPages.length > 0;

  // Route guard: on every navigation, check whether the CURRENT page is
  // actually in this department's allowedPages, and redirect away if not.
  // This is what actually closes the gap — it fires whether someone got
  // to a restricted page via a typed URL, an old bookmark, or (the case
  // that prompted this) landing on Overview right after login when
  // Overview isn't in their allowedPages at all.
  //
  // Skipped entirely when hasAnyAccess is false — redirecting to
  // getDefaultPageHref() would return null there, and there'd be nowhere
  // valid to send them anyway; that case gets its own screen below
  // instead of an empty-target no-op or a redirect loop.
  useEffect(() => {
    if (!checked || isPublic || !role || !hasAnyAccess) return;
    const slug = pathname.split('/').filter(Boolean)[1]; // '/dashboard/xyz' -> 'xyz'
    if (slug && !hasAccess(allowedPages, slug)) {
      const target = getDefaultPageHref(allowedPages);
      if (target && target !== pathname) router.replace(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, isPublic, role, pathname]);

  if (isPublic) return <>{children}</>;
  if (!checked) return null;

  // A department with zero allowedPages (and no wildcard) has nothing
  // valid to redirect to — rather than loop or silently render a blank
  // main area, say so plainly and point at who can fix it.
  if (!hasAnyAccess) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>No pages assigned yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 360 }}>
            Your department doesn't have any page access configured yet. Ask whoever manages
            Departments in Settings to grant some.
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider>
      <Topbar role={role} onMenuToggle={() => setSidebarOpen(o => !o)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className={styles.main}>{children}</main>
    </ConfigProvider>
  );
}