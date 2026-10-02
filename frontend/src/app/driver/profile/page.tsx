'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuth, getUser } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdPerson,
  MdLanguage,
  MdLogout,
  MdChevronRight,
  MdSettings,
  MdClose,
  MdPhone,
  MdEmail,
  MdBadge,
} from 'react-icons/md';

const profileTranslations = {
  en: {
    title: 'Profile',
    online: 'Online',
    offline: 'Offline',
    personalInfo: 'Personal Information',
    language: 'Language',
    currentLanguage: 'English',
    logout: 'Log Out',
    loading: 'Loading profile...',
    confirmLogoutTitle: 'Log Out Confirmation',
    confirmLogoutDesc: 'Are you sure you want to log out of your driver account?',
    cancel: 'Cancel',
    confirmLogoutBtn: 'Yes, Log Out',
    phone: 'Phone Number',
    email: 'Email',
    riderId: 'Rider ID',
    name: 'Full Name',
    close: 'Close',
    selectLanguage: 'Select Language',
  },
  km: {
    title: 'ប្រវត្តិរូប',
    online: 'កំពុងដំណើរការ',
    offline: 'មិនដំណើរការ',
    personalInfo: 'ព័ត៌មានផ្ទាល់ខ្លួន',
    language: 'ភាសា',
    currentLanguage: 'ភាសាខ្មែរ',
    logout: 'ចាកចេញ',
    loading: 'កំពុងផ្ទុកទិន្នន័យ...',
    confirmLogoutTitle: 'បញ្ជាក់ការចាកចេញ',
    confirmLogoutDesc: 'តើអ្នកប្រាកដជាចង់ចាកចេញពីគណនីអ្នកដឹកជញ្ជូននេះមែនទេ?',
    cancel: 'បោះបង់',
    confirmLogoutBtn: 'យល់ព្រមចាកចេញ',
    phone: 'លេខទូរស័ព្ទ',
    email: 'អ៊ីមែល',
    riderId: 'អត្តលេខអ្នកដឹក',
    name: 'ឈ្មោះពេញ',
    close: 'បិទ',
    selectLanguage: 'ជ្រើសរើសភាសា',
  },
};

export default function DriverProfilePage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const t = profileTranslations[lang as 'en' | 'km'] || profileTranslations.en;

  const loadProfile = async () => {
    try {
      const res = await api.get('/mobile/driver/profile');
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/driver/login');
      return;
    }
    loadProfile();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/driver/login');
  };

  const riderName = profile?.name || 'Sophal Rider';
  const riderIdFormatted = profile?.id ? `RDR${String(profile.id).padStart(3, '0')}` : 'RDR001';
  const isOnline = profile?.isActive !== false;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* 1. Top Header Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ width: '24px' }} />

        <h1 style={{
          fontSize: '18px',
          fontWeight: '800',
          color: '#0f172a',
          margin: 0,
        }}>
          {t.title}
        </h1>

        <button
          type="button"
          onClick={() => setShowLanguageModal(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
        >
          <MdSettings size={22} />
        </button>
      </div>

      {/* Main Content */}
      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* 2. Avatar & Rider Info Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '28px',
        }}>
          {/* Avatar with Badge */}
          <div style={{
            position: 'relative',
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            backgroundColor: '#dbeafe',
            border: '3px solid #ffffff',
            boxShadow: '0 8px 24px rgba(30, 96, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}>
            {profile?.photo ? (
              <img
                src={profile.photo}
                alt="Profile"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '32px',
                fontWeight: '900',
              }}>
                {riderName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Small emblem badge */}
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#1e40af',
              border: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}>
              <MdBadge size={14} />
            </div>
          </div>

          {/* Rider Name */}
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.2px' }}>
            {riderName}
          </div>

          {/* Rider ID */}
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
            {riderIdFormatted}
          </div>

          {/* Online / Offline Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: isOnline ? '#ecfdf5' : '#f1f5f9',
            border: isOnline ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
            color: isOnline ? '#16a34a' : '#64748b',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '700',
            marginTop: '8px',
          }}>
            <div style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#16a34a' : '#94a3b8',
            }} />
            <span>{isOnline ? t.online : t.offline}</span>
          </div>
        </div>

        {/* 3. Minimal Menu List (Personal Information, Language, Log Out only) */}
        <div style={{
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
          overflow: 'hidden',
        }}>
          {/* Row 1: Personal Information */}
          <button
            type="button"
            onClick={() => setShowPersonalInfoModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderBottom: '1px solid #f1f5f9',
              transition: 'background-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e60ff',
              }}>
                <MdPerson size={20} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                {t.personalInfo}
              </span>
            </div>

            <MdChevronRight size={20} color="#94a3b8" />
          </button>

          {/* Row 2: Language */}
          <button
            type="button"
            onClick={() => setShowLanguageModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderBottom: '1px solid #f1f5f9',
              transition: 'background-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e60ff',
              }}>
                <MdLanguage size={20} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                {t.language}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
                {t.currentLanguage}
              </span>
              <MdChevronRight size={20} color="#94a3b8" />
            </div>
          </button>

          {/* Row 3: Log Out */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
              }}>
                <MdLogout size={20} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#dc2626' }}>
                {t.logout}
              </span>
            </div>

            <MdChevronRight size={20} color="#fca5a5" />
          </button>
        </div>
      </div>

      {/* Personal Information Modal */}
      {showPersonalInfoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
            }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {t.personalInfo}
              </span>
              <button
                type="button"
                onClick={() => setShowPersonalInfoModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <MdClose size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '12px 14px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.name}</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {riderName}
                </div>
              </div>

              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '12px 14px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.riderId}</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {riderIdFormatted}
                </div>
              </div>

              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '12px 14px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.phone}</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {profile?.phone || '-'}
                </div>
              </div>

              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '12px 14px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.email}</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {profile?.email || '-'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPersonalInfoModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1e60ff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                marginTop: '18px',
              }}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Language Switcher Modal */}
      {showLanguageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '340px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {t.selectLanguage}
              </span>
              <button
                type="button"
                onClick={() => setShowLanguageModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <MdClose size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setLang('en');
                  setShowLanguageModal(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: lang === 'en' ? '#eff6ff' : '#f8fafc',
                  border: lang === 'en' ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  fontWeight: '700',
                  color: lang === 'en' ? '#1d4ed8' : '#334155',
                }}
              >
                <span>English</span>
                {lang === 'en' && <span style={{ color: '#1d4ed8' }}>✓</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLang('km');
                  setShowLanguageModal(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: lang === 'km' ? '#eff6ff' : '#f8fafc',
                  border: lang === 'km' ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  fontWeight: '700',
                  color: lang === 'km' ? '#1d4ed8' : '#334155',
                }}
              >
                <span>ភាសាខ្មែរ (Khmer)</span>
                {lang === 'km' && <span style={{ color: '#1d4ed8' }}>✓</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Out Confirmation Modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '360px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            textAlign: 'center',
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              margin: '0 auto 14px',
            }}>
              <MdLogout size={26} />
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
              {t.confirmLogoutTitle}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.4 }}>
              {t.confirmLogoutDesc}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {t.cancel}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {t.confirmLogoutBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
