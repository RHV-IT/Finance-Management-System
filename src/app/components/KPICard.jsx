'use client';
 
import styles from '../styles/KPICard.module.css';
 
/**
 * KPICard — coloured metric card
 * props: label, value, delta, deltaType ('up'|'down'|'warn'), badge, badgeType, color
 */
export default function KPICard({
  label,
  value,
  delta,
  deltaType = 'up',
  badge,
  badgeType = 'good',
  color = 'green',
  style,
}) {
  return (
    <div className={`${styles.card} ${styles[color]}`} style={style}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value ?? '—'}</div>
      {delta && (
        <div className={`${styles.delta} ${styles[deltaType]}`}>
          {deltaType === 'up' ? '↑' : deltaType === 'down' ? '↓' : '⚠'} {delta}
        </div>
      )}
      {badge && (
        <span className={`${styles.badge} ${styles[badgeType]}`}>{badge}</span>
      )}
    </div>
  );
}