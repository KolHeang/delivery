'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth, User } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { MdNotifications, MdRefresh, MdPerson, MdLogout, MdKeyboardArrowDown, MdTranslate } from 'react-icons/md';
import Badge from '@/components/ui/Badge';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getUser());

    const handleStorage = () => {
      setUser(getUser());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('user-updated', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('user-updated', handleStorage);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen]);

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  return (
    <>
      <header className="topbar">
        <div />
        <div className="topbar-actions">
          <button className="topbar-btn" title="Notifications">
            <MdNotifications size={18} />
            <span className="notification-dot" />
          </button>

          {/* Language Toggle */}
          <button
            className="topbar-btn"
            title="Switch Language"
            onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              minWidth: 52,
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              padding: '4px 8px',
            }}
          >
            <MdTranslate size={14} />
            {lang === 'en' ? 'KH' : 'EN'}
          </button>

          {user && (
            <div className="profile-dropdown-container" ref={containerRef}>
              <button
                className="profile-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <div className="profile-trigger-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                </div>
                <span className="profile-trigger-name">{user.name}</span>
                <MdKeyboardArrowDown 
                  size={18} 
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    transition: 'transform 0.2s ease', 
                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
                  }} 
                />
              </button>

              {dropdownOpen && (
                <div className="profile-dropdown-menu">
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-header-name">{user.name}</div>
                    <div className="profile-dropdown-header-email">{user.email}</div>
                    <div className="profile-dropdown-header-role">
                      <Badge status={user.role} />
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    className="profile-dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <MdPerson size={16} />
                    {t('myProfile')}
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="profile-dropdown-item profile-dropdown-item-danger"
                  >
                    <MdLogout size={16} />
                    {t('logout')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <div className="page-header-container">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-header-left">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
