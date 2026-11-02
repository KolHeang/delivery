'use client';

import React, { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';
const COLLAPSE_EVENT = 'sidebar-collapsed-change';
const MOBILE_EVENT = 'sidebar-mobile-change';

export function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return (
          document.documentElement.getAttribute('data-sidebar-collapsed') === 'true' ||
          localStorage.getItem(STORAGE_KEY) === 'true'
        );
      } catch {}
    }
    return false;
  });

  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) === 'true';
      setIsCollapsed(saved);
      document.documentElement.setAttribute('data-sidebar-collapsed', saved ? 'true' : 'false');
    } catch {}

    const checkViewport = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobileViewport(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };
    checkViewport();

    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') {
        setIsCollapsed(detail);
      }
    };

    const handleMobileSync = (e: Event) => {
      const detail = (e as CustomEvent<boolean | 'toggle'>).detail;
      if (detail === 'toggle') {
        setIsMobileOpen((prev) => !prev);
      } else if (typeof detail === 'boolean') {
        setIsMobileOpen(detail);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener(COLLAPSE_EVENT, handleSync);
    window.addEventListener(MOBILE_EVENT, handleMobileSync);
    window.addEventListener('resize', checkViewport);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener(COLLAPSE_EVENT, handleSync);
      window.removeEventListener(MOBILE_EVENT, handleMobileSync);
      window.removeEventListener('resize', checkViewport);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const setCollapsed = useCallback((next: boolean) => {
    setIsCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
      document.documentElement.setAttribute('data-sidebar-collapsed', next ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent<boolean>(COLLAPSE_EVENT, { detail: next }));
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 220);
    } catch {}
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
        document.documentElement.setAttribute('data-sidebar-collapsed', next ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent<boolean>(COLLAPSE_EVENT, { detail: next }));
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 220);
      } catch {}
      return next;
    });
  }, []);

  const toggleMobile = useCallback(() => {
    window.dispatchEvent(new CustomEvent(MOBILE_EVENT, { detail: 'toggle' }));
  }, []);

  const closeMobile = useCallback(() => {
    window.dispatchEvent(new CustomEvent(MOBILE_EVENT, { detail: false }));
  }, []);

  // On mobile drawer, always display full labels even if desktop is collapsed
  const effectiveCollapsed = isCollapsed && !isMobileViewport;

  return {
    isCollapsed: effectiveCollapsed,
    rawCollapsed: isCollapsed,
    toggleCollapsed,
    setCollapsed,
    isMobileOpen,
    isMobileViewport,
    toggleMobile,
    closeMobile,
  };
}

export function SidebarToggleIcon({
  collapsed,
  size = 22,
}: {
  collapsed: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <rect x="3" y="3" width="18" height="18" rx="3.2" />
      <line x1="8.5" y1="3" x2="8.5" y2="21" />
      {collapsed ? (
        <polyline points="13.2 9 16.2 12 13.2 15" />
      ) : (
        <polyline points="15.8 9 12.8 12 15.8 15" />
      )}
    </svg>
  );
}
