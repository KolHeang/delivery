'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function MainLayout({ children, title = '', subtitle }: MainLayoutProps) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={title} subtitle={subtitle} />
        <div className="page-content" style={{ padding: '28px 32px', minHeight: 'calc(100vh - 60px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
