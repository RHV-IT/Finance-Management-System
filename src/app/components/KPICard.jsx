'use client';
 
import styles from '../styles/KPICard.module.css';
import {fmt} from '../dashboard/lib/data';
/**
 * KPICard — coloured metric card
 * props: label, value, delta, deltaType ('up'|'down'|'warn'), badge, badgeType, color
 */
export default function KPICard({
  label, value, delta, deltaType = 'up', deltaIcon,
  badge, badgeType = 'good', color = 'green', style, corner,
}) {
  const icon = deltaIcon || (deltaType === 'up' ? '↑' : deltaType === 'down' ? '↓' : '⚠');
  return (
    <div className={`${styles.card} ${styles[color]}`} style={{ position: 'relative', ...style }}>
      {corner && <div style={{ position: 'absolute', top: 10, right: 10 }}>{corner}</div>}
      <div className={styles.label} style={corner ? { paddingRight: 100 } : undefined}>{label}</div>
      <div className={styles.value}>{value ?? '—'}</div>
      {delta && <div className={`${styles.delta} ${styles[deltaType]}`}>{icon} {delta}</div>}
      {badge && <span className={`${styles.badge} ${styles[badgeType]}`}>{badge}</span>}
    </div>
  );
}