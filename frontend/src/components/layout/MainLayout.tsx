import React from 'react';
import Sidebar from './Sidebar';
import styles from './MainLayout.module.css';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
