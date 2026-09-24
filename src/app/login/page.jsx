'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDepartments } from '../dashboard/lib/useDepartments';
import { warmConnectionsCache } from '../dashboard/lib/useConfig';
import styles from '../styles/Login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { departments, loading, error, reload } = useDepartments();

  const [selectedDept, setSelectedDept] = useState(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleDeptClick = (dept) => {
    setSelectedDept(dept);
    setLoginError('');
    setPin('');
  };

  const handleLogin = () => {
    if (!selectedDept) { setLoginError('Please select your department first.'); return; }
    if (pin.length !== 4) { setLoginError('Enter your 4-digit PIN.'); return; }
    if (pin !== selectedDept.pin) {
      setLoginError('Incorrect PIN. Try again.');
      setPin('');
      return;
    }

    // Store the whole permission shape now, not just the id — the sidebar
    // and the dashboard route guard both need allowedPages/allowedConnections/
    // canManagePermissions, and reading them straight from sessionStorage
    // means neither has to fetch /api/config/departments again just to
    // answer "can this person see page X." The PIN itself is deliberately
    // NOT stored here — nothing after login needs it again.
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('rhv_role', selectedDept.id);
      sessionStorage.setItem('rhv_role_label', selectedDept.name);
      sessionStorage.setItem('rhv_allowed_pages', JSON.stringify(selectedDept.allowedPages || []));
      sessionStorage.setItem('rhv_allowed_connections', JSON.stringify(selectedDept.allowedConnections || []));
      sessionStorage.setItem('rhv_can_manage_permissions', selectedDept.canManagePermissions ? '1' : '0');
    }

    warmConnectionsCache();

    // Send them to a page they can actually see, not blindly to Overview —
    // this was the actual source of "logs in but lands somewhere they
    // can't access": Overview was hardcoded here regardless of whether
    // 'overview' was ever in this department's allowedPages.
    const pages  = selectedDept.allowedPages || [];
    const target = pages.includes('*') || pages.length === 0
        ? '/dashboard/overview' // wildcard → Overview is always valid; empty → nothing else to send them to either, so the layout's own guard (see below) will show the "no pages assigned" screen instead
        : `/dashboard/${pages[0]}`;
    router.push(target);
  };

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <div className={styles.logoMark}>RHV</div>
        </div>
        <h1 className={styles.title}>RHV Hospital</h1>
        <p className={styles.sub}>Enterprise Resource Planning · Secure Login</p>

        {loading && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#7F8C9A', fontSize: 12 }}>
            ⏳ Loading departments…
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '16px', color: '#C0392B', fontSize: 12 }}>
            Could not load departments: {error}
            <button onClick={reload} style={{ display: 'block', margin: '8px auto 0', background: 'none', border: 'none', color: '#117A65', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className={styles.rolesGrid}>
              {departments.map(dept => (
                <div
                  key={dept.id}
                  className={`${styles.roleItem} ${selectedDept?.id === dept.id ? styles.selected : ''}`}
                  onClick={() => handleDeptClick(dept)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleDeptClick(dept)}
                >
                  <span className={styles.roleIcon}>{dept.icon}</span>
                  <div>
                    <div className={styles.roleName}>{dept.name}</div>
                    <div className={styles.roleDesc}>
                      {dept.allowedPages?.includes('*')
                        ? 'Full access · All modules'
                        : `${(dept.allowedPages || []).length} page${(dept.allowedPages || []).length === 1 ? '' : 's'}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedDept && (
              <div className={styles.selectedBanner}>
                ✓ Department selected: {selectedDept.name}
              </div>
            )}

            <p className={styles.step}>
              <strong>Step 1</strong> Click your department above &nbsp;·&nbsp;
              <strong>Step 2</strong> Enter your 4-digit PIN &nbsp;·&nbsp;
              <strong>Step 3</strong> Click Login
            </p>

            <div className={styles.pinRow}>
              <input
                type={showPin ? 'text' : 'password'}
                className={styles.pinInput}
                maxLength={4}
                placeholder="PIN"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                className={styles.pinToggle}
                onClick={() => setShowPin(s => !s)}
                type="button"
                aria-label="Toggle PIN visibility"
              >
                {showPin ? '🙈' : '👁'}
              </button>
            </div>

            <button className={styles.loginBtn} onClick={handleLogin}>
              Login →
            </button>

            {loginError && <div className={styles.error}>{loginError}</div>}

            <p className={styles.hint}>
              {departments.map((d, i) => (
                <span key={d.id}>
                  {d.name}:{d.pin}{i < departments.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </p>
          </>
        )}
      </div>
    </div>
  );
}