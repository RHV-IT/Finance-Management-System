'use client';

import { useParams } from 'next/navigation';
import PageRenderer from '../../components/PageRenderer';
import { useDepartments } from '../lib/useDepartments';
import styles from '../../styles/Layout.module.css';

export default function DynamicDepartmentPage() {
  const { slug } = useParams();
  const { departments, loading } = useDepartments();

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>⏳ Loading…</div>;

  // Only departments that opted into a page (have a section) count.
  const dept = departments.find(d => d.id === slug && d.section);
  if (!dept) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
        No page exists at <code>/dashboard/{slug}</code>.
      </div>
    );
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>{dept.icon} {dept.name}</h2>
          <p className={styles.pageMeta}>{dept.section}</p>
        </div>
      </div>
      <PageRenderer page={slug} />
    </div>
  );
}