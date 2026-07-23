'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuth } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdPhone,
  MdEmail,
  MdLocationOn,
  MdLogout,
  MdStore,
  MdLock,
  MdKey,
  MdClose,
  MdCameraAlt,
  MdEdit,
  MdTranslate,
  MdBadge,
  MdAccountBalanceWallet,
  MdAssignment,
  MdCheckCircle,
  MdLocalShipping
} from 'react-icons/md';

const merchantProfileTranslations = {
  en: {
    title: 'Shop Profile',
    personalInfo: 'Contact Information',
    zoneInfo: 'Merchant Zone',
    noZone: 'No zone assigned',
    changePasswordBtn: 'Change Password',
    editProfileBtn: 'Edit Profile',
    logout: 'Log Out',
    loading: 'Loading profile...',
    languageSetting: 'App Language',
    activeStatus: 'Account Status',
    statusActive: 'Active / Open',
    statusInactive: 'Suspended / Closed',
    statsTab: 'Parcels Stats',
    infoTab: 'Shop Details',
    balanceTitle: 'Account Balance',
    totalParcel: 'Total Parcels',
    deliveredParcel: 'Delivered',
    pendingPickup: 'Pending Pickup',
    inTransit: 'In Transit',
    phoneLabel: 'Phone',
    emailLabel: 'Email',
    addressLabel: 'Address',
    zoneLabel: 'Operating Zone'
  },
  km: {
    title: 'ព័ត៌មានហាង',
    personalInfo: 'ព័ត៌មានទំនាក់ទំនងហាង',
    zoneInfo: 'តំបន់របស់ហាង',
    noZone: 'មិនមានព័ត៌មានតំបន់',
    changePasswordBtn: 'ផ្លាស់ប្តូរលេខសម្ងាត់',
    editProfileBtn: 'កែប្រែព័ត៌មាន',
    logout: 'ចាកចេញពីគណនី',
    loading: 'កំពុងផ្ទុកព័ត៌មានហាង...',
    languageSetting: 'ភាសាកម្មវិធី / Language',
    activeStatus: 'ស្ថានភាពគណនី',
    statusActive: 'សកម្ម / បើកដំណើរការ',
    statusInactive: 'ផ្អាក / បិទដំណើរការ',
    statsTab: 'ស្ថិតិកញ្ចប់អីវ៉ាន់',
    infoTab: 'ព័ត៌មានទំនាក់ទំនង',
    balanceTitle: 'សមតុល្យគណនី',
    totalParcel: 'កញ្ចប់អីវ៉ាន់សរុប',
    deliveredParcel: 'ដឹកជញ្ជូនជោគជ័យ',
    pendingPickup: 'រង់ចាំប្រមូល',
    inTransit: 'កំពុងដឹកជញ្ជូន',
    phoneLabel: 'លេខទូរស័ព្ទ',
    emailLabel: 'អ៊ីមែល',
    addressLabel: 'អាសយដ្ឋានហាង',
    zoneLabel: 'តំបន់ប្រតិបត្តិការ'
  }
};

export default function MerchantProfilePage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<'stats' | 'info'>('stats');

  const t = merchantProfileTranslations[lang as 'en' | 'km'] || merchantProfileTranslations.en;

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Edit Profile Modal State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/merchant/login');
      return;
    }

    const loadProfileData = async () => {
      try {
        const [profRes, dashRes] = await Promise.all([
          api.get('/mobile/merchant/profile'),
          api.get('/mobile/merchant/dashboard')
        ]);
        setProfile(profRes.data);
        setDashData(dashRes.data);
      } catch (err) {
        console.error('Failed to load merchant profile data', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/merchant/login');
  };

  const getInitials = (name: string) => {
    if (!name) return 'M';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Photo = reader.result as string;
      try {
        const res = await api.patch('/mobile/merchant/profile', { photo: base64Photo });
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to update merchant photo', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const openEditProfileModal = () => {
    setEditName(profile?.name || '');
    setEditPhone(profile?.phone || '');
    setEditEmail(profile?.email || '');
    setEditAddress(profile?.address || '');
    setEditError('');
    setEditSuccess('');
    setShowEditProfileModal(true);
  };

  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setEditSubmitting(true);
    try {
      const res = await api.patch('/mobile/merchant/profile', {
        name: editName,
        phone: editPhone,
        email: editEmail,
        address: editAddress
      });
      setProfile(res.data);
      setEditSuccess(lang === 'km' ? 'បច្ចុប្បន្នភាពព័ត៌មានហាងជោគជ័យ' : 'Profile updated successfully');
      setTimeout(() => {
        setShowEditProfileModal(false);
        setEditSuccess('');
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.message || (lang === 'km' ? 'ការបច្ចុប្បន្នភាពមិនជោគជ័យទេ' : 'Failed to update profile');
      setEditError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword) {
      setPasswordError(lang === 'km' ? 'សូមបញ្ចូលលេខសម្ងាត់ចាស់' : 'Please enter current password');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError(lang === 'km' ? 'លេខសម្ងាត់ថ្មីយ៉ាងហោចណាស់ ៦ ខ្ទង់' : 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(lang === 'km' ? 'លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ' : 'New passwords do not match');
      return;
    }

    setPasswordSubmitting(true);
    try {
      const res = await api.patch('/mobile/merchant/change-password', {
        oldPassword,
        newPassword
      });
      setPasswordSuccess(res.data?.message || (lang === 'km' ? 'ប្តូរលេខសម្ងាត់ជោគជ័យ' : 'Password changed successfully'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || (lang === 'km' ? 'ការប្តូរលេខសម្ងាត់មិនជោគជ័យទេ' : 'Failed to change password');
      setPasswordError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: '24px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(37, 99, 235, 0.1)',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '12px'
        }} />
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>{t.loading}</span>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  const balanceAmount = dashData?.balance?.amount || 0;
  const stats = dashData?.statistics || {};

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f4f7fc',
      fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
      paddingBottom: '36px',
      position: 'relative'
    }}>
      {/* Royal Blue Gradient Hero Section matching Driver UI 100% */}
      <div style={{
        background: 'linear-gradient(165deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
        padding: '28px 20px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        boxShadow: '0 12px 28px rgba(37, 99, 235, 0.25)'
      }}>
        {/* Background Decorative Pattern */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 70%)',
          pointerEvents: 'none'
        }} />

        {/* Centered Avatar with Camera Upload Button & Gold Ring */}
        <div style={{ position: 'relative', marginBottom: '12px', zIndex: 1 }}>
          <div style={{
            width: '92px',
            height: '92px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            color: '#2563eb',
            fontWeight: '900',
            border: '3.5px solid #f59e0b',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.18)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {profile?.photo ? (
              <img
                src={profile.photo.startsWith('http') || profile.photo.startsWith('data:') ? profile.photo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/uploads/${profile.photo}`}
                alt={profile.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              getInitials(profile?.name)
            )}
          </div>

          {/* Camera Upload Button Overlay */}
          <label style={{
            position: 'absolute',
            bottom: '0px',
            right: '0px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            border: '2.5px solid #ffffff',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
            zIndex: 3,
            transition: 'transform 0.2s ease'
          }} title={lang === 'km' ? 'ប្តូររូបថត' : 'Upload Photo'}>
            <MdCameraAlt size={16} />
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
          </label>
        </div>

        {/* Centered Merchant Name */}
        <h2 style={{
          fontSize: '22px',
          fontWeight: '900',
          color: '#ffffff',
          margin: 0,
          textAlign: 'center',
          letterSpacing: '-0.4px',
          zIndex: 1,
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {profile?.name || 'Shop Name'}
        </h2>

        {/* Merchant Status Badge Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '8px',
          zIndex: 1
        }}>
          <span style={{
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            backdropFilter: 'blur(8px)',
            color: '#fef3c7',
            fontSize: '11px',
            fontWeight: '800',
            padding: '4px 12px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            🏪 ហាងទំនិញ • {profile?.active ? t.statusActive : t.statusInactive}
          </span>
        </div>
      </div>

      {/* Main Content Container matching Driver UI */}
      <div style={{
        padding: '0 16px',
        marginTop: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Profile Main Segmented Tab Switcher */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          padding: '4px',
          display: 'flex',
          gap: '4px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          border: '1px solid #e2e8f0'
        }}>
          <button
            onClick={() => setActiveMainTab('stats')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: activeMainTab === 'stats' ? '#2563eb' : 'transparent',
              color: activeMainTab === 'stats' ? '#ffffff' : '#64748b',
              fontSize: '12.5px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeMainTab === 'stats' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
            }}
          >
            📊 {t.statsTab}
          </button>

          <button
            onClick={() => setActiveMainTab('info')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: activeMainTab === 'info' ? '#2563eb' : 'transparent',
              color: activeMainTab === 'info' ? '#ffffff' : '#64748b',
              fontSize: '12.5px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeMainTab === 'info' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
            }}
          >
            👤 {t.infoTab}
          </button>
        </div>

        {/* TAB 1: Parcels Stats Grid View */}
        {activeMainTab === 'stats' && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '22px',
            padding: '18px 20px',
            boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b', margin: '0 0 14px' }}>
              {t.statsTab}
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              {/* Account Balance */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#ecfdf5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <img src="/3d/3d_cash.png" alt="Cash" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700' }}>{t.balanceTitle}</div>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#059669', marginTop: '1px' }}>${balanceAmount.toFixed(2)}</div>
                </div>
              </div>

              {/* Total Parcels */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <img src="/3d/3d_box.png" alt="Box" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700' }}>{t.totalParcel}</div>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', marginTop: '1px' }}>{stats.totalParcel ?? 0}</div>
                </div>
              </div>

              {/* Delivered */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#ecfdf5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <img src="/3d/3d_check.png" alt="Check" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700' }}>{t.deliveredParcel}</div>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#16a34a', marginTop: '1px' }}>{stats.totalDelivered ?? 0}</div>
                </div>
              </div>

              {/* Pending Pickup */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fff7ed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <img src="/3d/3d_shop.png" alt="Shop" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700' }}>{t.pendingPickup}</div>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#ea580c', marginTop: '1px' }}>{stats.pendingPickup ?? 0}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Personal Information View */}
        {activeMainTab === 'info' && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '22px',
            padding: '20px',
            boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MdBadge size={22} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b', margin: 0 }}>
                  {t.personalInfo}
                </h3>
              </div>

              <button
                onClick={openEditProfileModal}
                style={{
                  padding: '7px 12px',
                  borderRadius: '10px',
                  border: '1px solid #bfdbfe',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  fontSize: '12px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <MdEdit size={16} />
                {t.editProfileBtn}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '4px' }}>
              {/* Phone */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#2563eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <MdPhone size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginRight: '6px' }}>{t.phoneLabel}:</span>
                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800' }}>{profile?.phone || '—'}</span>
                </div>
              </div>

              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#8b5cf6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <MdEmail size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginRight: '6px' }}>{t.emailLabel}:</span>
                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800' }}>{profile?.email || '—'}</span>
                </div>
              </div>

              {/* Address */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <MdLocationOn size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginRight: '6px' }}>{t.addressLabel}:</span>
                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800' }}>{profile?.address || (profile?.zone ? `${profile.zone.name} (${profile.zone.code})` : t.noZone)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Password Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '22px',
          padding: '16px 20px',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }} onClick={() => setShowPasswordModal(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MdLock size={22} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
              {t.changePasswordBtn}
            </span>
          </div>

          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b'
          }}>
            <MdKey size={18} />
          </div>
        </div>

        {/* Language Selection Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '22px',
          padding: '16px 20px',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MdTranslate size={22} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
              {t.languageSetting}
            </span>
          </div>

          <div style={{
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '3px',
            display: 'flex',
            gap: '3px'
          }}>
            <button
              onClick={() => setLang('en')}
              style={{
                background: lang === 'en' ? '#2563eb' : 'transparent',
                border: 'none',
                color: lang === 'en' ? '#ffffff' : '#64748b',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '800',
                borderRadius: '9px',
                cursor: 'pointer'
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLang('km')}
              style={{
                background: lang === 'km' ? '#2563eb' : 'transparent',
                border: 'none',
                color: lang === 'km' ? '#ffffff' : '#64748b',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '800',
                borderRadius: '9px',
                cursor: 'pointer'
              }}
            >
              ខ្មែរ
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            background: '#ffffff',
            color: '#ef4444',
            border: 'none',
            padding: '16px 24px',
            borderRadius: '20px',
            fontSize: '15px',
            fontWeight: '800',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)'
          }}
        >
          <MdLogout size={18} />
          {t.logout}
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            width: '100%',
            maxWidth: '380px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MdEdit size={22} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  {lang === 'km' ? 'កែប្រែព័ត៌មានហាង' : 'Edit Shop Profile'}
                </h3>
              </div>
              <button onClick={() => setShowEditProfileModal(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <MdClose size={20} />
              </button>
            </div>

            {editError && <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>⚠️ {editError}</div>}
            {editSuccess && <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>✅ {editSuccess}</div>}

            <form onSubmit={handleEditProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>{lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'}</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Shop Name" required style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>លេខទូរស័ព្ទ</label>
                <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="096..." required style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>អ៊ីមែល</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@example.com" style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>អាសយដ្ឋានហាង</label>
                <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Address" style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }} />
              </div>

              <button type="submit" disabled={editSubmitting} style={{ marginTop: '8px', width: '100%', background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#ffffff', border: 'none', borderRadius: '16px', padding: '14px', fontSize: '14px', fontWeight: '800', cursor: editSubmitting ? 'not-allowed' : 'pointer', opacity: editSubmitting ? 0.7 : 1, boxShadow: '0 6px 18px rgba(37, 99, 235, 0.25)' }}>
                {editSubmitting ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'Save Changes')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            width: '100%',
            maxWidth: '380px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MdLock size={22} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  {t.changePasswordBtn}
                </h3>
              </div>
              <button onClick={() => setShowPasswordModal(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <MdClose size={20} />
              </button>
            </div>

            {passwordError && <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>⚠️ {passwordError}</div>}
            {passwordSuccess && <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>✅ {passwordSuccess}</div>}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>{lang === 'km' ? 'លេខសម្ងាត់ចាស់' : 'Current Password'}</label>
                <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>{lang === 'km' ? 'លេខសម្ងាត់ថ្មី' : 'New Password'}</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required minLength={6} style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>{lang === 'km' ? 'ផ្ទៀងផ្ទាត់លេខសម្ងាត់ថ្មី' : 'Confirm New Password'}</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6} style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }} />
              </div>

              <button type="submit" disabled={passwordSubmitting} style={{ marginTop: '8px', width: '100%', background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#ffffff', border: 'none', borderRadius: '16px', padding: '14px', fontSize: '14px', fontWeight: '800', cursor: passwordSubmitting ? 'not-allowed' : 'pointer', opacity: passwordSubmitting ? 0.7 : 1, boxShadow: '0 6px 18px rgba(37, 99, 235, 0.25)' }}>
                {passwordSubmitting ? (lang === 'km' ? 'កំពុងផ្លាស់ប្តូរ...' : 'Changing...') : (lang === 'km' ? 'រក្សាទុកលេខសម្ងាត់ថ្មី' : 'Save New Password')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
