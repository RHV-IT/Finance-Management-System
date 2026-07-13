'use client';
 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/Login.module.css';
 
const ROLES = [
  { id:'admin',       icon:'👑', name:'Management / Admin',   desc:'Full access · All modules',          pin:'0000' },
  { id:'revenue',     icon:'💰', name:'Revenue / Billing',    desc:'Revenue, debtors, cashbook',          pin:'1111' },
  { id:'store',       icon:'📦', name:'Store Unit',           desc:'Inventory, vendors, assets',          pin:'2222' },
  { id:'payables',    icon:'💳', name:'Payables Unit',        desc:'Supplier invoices, payments',         pin:'3333' },
  { id:'procurement', icon:'🛒', name:'Procurement Unit',     desc:'Purchase orders, requests',           pin:'4444' },
  { id:'pharmacy',    icon:'💊', name:'Pharmacy Unit',        desc:'Drug usage, stock, requests',         pin:'5555' },
  { id:'lab',         icon:'🧪', name:'Laboratory Unit',      desc:'Reagents, test kits requests',        pin:'6666' },
  { id:'radiology',   icon:'🩻', name:'Radiology Unit',       desc:'Contrast media, consumables',         pin:'7777' },
  { id:'cssd',        icon:'♻️', name:'CSSD Unit',            desc:'Sterilization, packs, KPIs',          pin:'9999' },
  { id:'coo',         icon:'📋', name:'COO',                  desc:'Full access · 1st-level approval',    pin:'2020' },
  { id:'ceo',         icon:'👔', name:'CEO',                  desc:'Full access · final approval',        pin:'3030' },
];
 
export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
 
  const handleRoleClick = (role) => {
    setSelectedRole(role);
    setError('');
    setPin('');
  };
 
  const handleLogin = () => {
    if (!selectedRole) { setError('Please select your role first.'); return; }
    if (pin.length !== 4) { setError('Enter your 4-digit PIN.'); return; }
    if (pin !== selectedRole.pin) {
      setError('Incorrect PIN. Try again.');
      setPin('');
      return;
    }
    // Store session (in real app: use proper auth)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('rhv_role', selectedRole.id);
      sessionStorage.setItem('rhv_role_label', selectedRole.name);
    }
    router.push('/dashboard/overview');
  };
 
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <div className={styles.logoMark}>RHV</div>
        </div>
        <h1 className={styles.title}>RHV Hospital</h1>
        <p className={styles.sub}>Enterprise Resource Planning · Secure Login</p>
 
        <div className={styles.rolesGrid}>
          {ROLES.map(role => (
            <div
              key={role.id}
              className={`${styles.roleItem} ${selectedRole?.id === role.id ? styles.selected : ''}`}
              onClick={() => handleRoleClick(role)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleRoleClick(role)}
            >
              <span className={styles.roleIcon}>{role.icon}</span>
              <div>
                <div className={styles.roleName}>{role.name}</div>
                <div className={styles.roleDesc}>{role.desc}</div>
              </div>
            </div>
          ))}
        </div>
 
        {selectedRole && (
          <div className={styles.selectedBanner}>
            ✓ Role selected: {selectedRole.name}
          </div>
        )}
 
        <p className={styles.step}>
          <strong>Step 1</strong> Click a role above &nbsp;·&nbsp;
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
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0,4))}
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
 
        {error && <div className={styles.error}>{error}</div>}
 
        <p className={styles.hint}>
          Default PINs — Admin:0000 · Revenue:1111 · Store:2222 · Payables:3333<br />
          Procurement:4444 · Pharmacy:5555 · Lab:6666 · Radiology:7777 · CSSD:9999<br />
          COO:2020 · CEO:3030
        </p>
      </div>
    </div>
  );
}