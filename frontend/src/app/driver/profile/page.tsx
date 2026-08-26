'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuth } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdPhone,
  MdEmail,
  MdLogout,
  MdTranslate,
  MdBadge,
  MdAttachMoney,
  MdWc,
  MdCalendarToday,
  MdDashboard,
  MdAssignment,
  MdCheckCircle,
  MdInventory2,
  MdError,
  MdPerson,
  MdLock,
  MdKey,
  MdClose,
  MdCameraAlt,
  MdEdit,
  MdAccountBalanceWallet,
  MdReceiptLong
} from 'react-icons/md';

const profileTranslations = {
  en: {
    title: 'My Profile',
    personalInfo: 'Personal Information',
    languageSetting: 'App Language',
    changePasswordBtn: 'Change Password',
    logout: 'Log Out',
    loading: 'Loading profile...',
    phoneLabel: 'Phone Number',
    emailLabel: 'Email Address',
    salaryLabel: 'Base Salary',
    genderLabel: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    joinDateLabel: 'Join Date',
    dobLabel: 'Date of Birth',
  },
  km: {
    title: 'គណនីរបស់ខ្ញុំ',
    personalInfo: 'ព័ត៌មានផ្ទាល់ខ្លួន',
    languageSetting: 'ភាសាកម្មវិធី / Language',
    changePasswordBtn: 'ផ្លាស់ប្តូរលេខសម្ងាត់',
    logout: 'ចាកចេញ',
    loading: 'កំពុងផ្ទុកព័ត៌មានគណនី...',
    phoneLabel: 'លេខទូរស័ព្ទ',
    emailLabel: 'អ៊ីមែល',
    salaryLabel: 'ប្រាក់បៀវត្សរ៍',
    genderLabel: 'ភេទ',
    genderMale: 'ប្រុស (Male)',
    genderFemale: 'ស្រី (Female)',
    joinDateLabel: 'ថ្ងៃចូលធ្វើការ',
    dobLabel: 'ថ្ងៃខែឆ្នាំកំណើត',
  }
};

export default function DriverProfilePage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const t = profileTranslations[lang as 'en' | 'km'] || profileTranslations.en;

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

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
      const res = await api.patch('/mobile/driver/change-password', {
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

  // Edit Profile Modal State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNameKh, setEditNameKh] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGender, setEditGender] = useState('male');
  const [editDob, setEditDob] = useState('');
  const [editJoinDate, setEditJoinDate] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const openEditProfileModal = () => {
    setEditName(profile?.name || '');
    setEditNameKh(profile?.nameKh || '');
    setEditPhone(profile?.phone || '');
    setEditEmail(profile?.email || '');
    setEditGender(profile?.gender || 'male');
    setEditDob(profile?.dob || '');
    setEditJoinDate(profile?.joinDate || '');
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
      const res = await api.patch('/mobile/driver/profile', {
        name: editName,
        nameKh: editNameKh,
        phone: editPhone,
        email: editEmail,
        gender: editGender,
        dob: editDob,
        joinDate: editJoinDate
      });
      setProfile(res.data);
      setEditSuccess(lang === 'km' ? 'បច្ចុប្បន្នភាពព័ត៌មានជោគជ័យ' : 'Profile updated successfully');
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Photo = reader.result as string;
      try {
        const res = await api.patch('/mobile/driver/profile', { photo: base64Photo });
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to update driver photo', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadProfileData = async () => {
    try {
      const res = await api.get('/mobile/driver/profile');
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to load driver profile data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/driver/login');
      return;
    }
    loadProfileData();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/driver/login');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        minHeight: '80vh',
        backgroundColor: '#f8fafc',
        padding: '24px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3.5px solid rgba(37, 99, 235, 0.15)',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spinProfile 0.8s linear infinite',
          marginBottom: '14px'
        }} />
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{t.loading}</span>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spinProfile { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  // Format Date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Driver initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'D';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const formattedSalary = profile?.salary != null
    ? `$${(Number(profile.salary) || 0).toFixed(2)}`
    : '$149.57';

  const genderText = profile?.gender === 'female'
    ? t.genderFemale
    : t.genderMale;

  const displayName = lang === 'km' && profile?.nameKh ? profile.nameKh : (profile?.name || 'Sok Dara');

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
      {/* Royal Blue Gradient Hero Section */}
      <div style={{
        background: 'linear-gradient(145deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)',
        padding: '24px 20px 38px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        boxShadow: '0 12px 28px rgba(37, 99, 235, 0.22)'
      }}>
        {/* Background Decorative Circles */}
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          left: '-20px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 70%)',
          pointerEvents: 'none'
        }} />

        {/* Centered Avatar with Camera Upload Button */}
        <div style={{ position: 'relative', marginBottom: '10px', zIndex: 1 }}>
          <div style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            color: '#2563eb',
            fontWeight: '900',
            border: '3.5px solid #ffffff',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
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
              getInitials(displayName)
            )}
          </div>

          {/* Camera Upload Button Overlay */}
          <label style={{
            position: 'absolute',
            bottom: '0px',
            right: '0px',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            border: '2px solid #ffffff',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
            zIndex: 3,
            transition: 'transform 0.2s ease'
          }} title={lang === 'km' ? 'ប្តូររូបថត' : 'Upload Photo'}>
            <MdCameraAlt size={15} />
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
          </label>
        </div>

        {/* Centered User Name */}
        <h2 style={{
          fontSize: '20px',
          fontWeight: '900',
          color: '#ffffff',
          margin: '0 0 6px',
          textAlign: 'center',
          letterSpacing: '-0.3px',
          zIndex: 1,
          textShadow: '0 2px 6px rgba(0,0,0,0.12)'
        }}>
          {displayName}
        </h2>

        {/* Role & ID Tag Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1
        }}>
          <span style={{
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '700',
            padding: '3px 10px',
            borderRadius: '12px',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.25)'
          }}>
            🛵 {lang === 'km' ? 'អ្នកដឹកជញ្ជូន' : 'Driver'}
          </span>
          <span style={{
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '700',
            padding: '3px 10px',
            borderRadius: '12px',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.25)'
          }}>
            📱 {profile?.phone || '012-345-678'}
          </span>
        </div>
      </div>

      {/* Main Content Container */}
      <div style={{
        padding: '0 16px',
        marginTop: '-16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Personal Information View */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '22px',
          padding: '18px 20px',
          boxShadow: '0 6px 22px rgba(15, 23, 42, 0.05)',
          border: '1px solid #e8eff7',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '11px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MdBadge size={20} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#0f2460', margin: 0 }}>
                {t.personalInfo}
              </h3>
            </div>

            <button
              onClick={openEditProfileModal}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1px solid #bfdbfe',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontSize: '11.5px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <MdEdit size={15} />
              <span>{lang === 'km' ? 'កែប្រែព័ត៌មាន' : 'Edit Profile'}</span>
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
          }}>
            {/* Phone Tile */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              padding: '11px 12px',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '11px', fontWeight: '700' }}>
                <MdPhone size={14} color="#2563eb" />
                <span>{t.phoneLabel}</span>
              </div>
              <a href={`tel:${profile?.phone || '012345678'}`} style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', textDecoration: 'none' }}>
                {profile?.phone || '012-345-678'}
              </a>
            </div>

            {/* Email Tile */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              padding: '11px 12px',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '11px', fontWeight: '700' }}>
                <MdEmail size={14} color="#8b5cf6" />
                <span>{t.emailLabel}</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={profile?.email || 'driver@gmail.com'}>
                {profile?.email || 'driver@gmail.com'}
              </div>
            </div>

            {/* Salary Tile */}
            <div style={{
              backgroundColor: '#f0fdf4',
              borderRadius: '14px',
              padding: '11px 12px',
              border: '1px solid #dcfce7',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#15803d', fontSize: '11px', fontWeight: '700' }}>
                <MdAttachMoney size={14} color="#16a34a" />
                <span>{t.salaryLabel}</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '900', color: '#166534' }}>
                {formattedSalary}
              </div>
            </div>

            {/* Gender Tile */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              padding: '11px 12px',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '11px', fontWeight: '700' }}>
                <MdWc size={14} color="#6366f1" />
                <span>{t.genderLabel}</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                {genderText}
              </div>
            </div>

            {/* Join Date Tile */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              padding: '11px 12px',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '11px', fontWeight: '700' }}>
                <MdCalendarToday size={14} color="#d97706" />
                <span>{t.joinDateLabel}</span>
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#334155' }}>
                {profile?.joinDate ? formatDate(profile.joinDate) : (lang === 'km' ? 'មិនទាន់កំណត់' : 'Not set')}
              </div>
            </div>

            {/* Date of Birth Tile */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              padding: '11px 12px',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '11px', fontWeight: '700' }}>
                <MdCalendarToday size={14} color="#0284c7" />
                <span>{t.dobLabel}</span>
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#334155' }}>
                {profile?.dob ? formatDate(profile.dob) : (lang === 'km' ? 'មិនទាន់កំណត់' : 'Not set')}
              </div>
            </div>
          </div>
        </div>

        {/* Settings & Security Group Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '22px',
          boxShadow: '0 6px 22px rgba(15, 23, 42, 0.05)',
          border: '1px solid #e8eff7',
          overflow: 'hidden'
        }}>
          {/* Row 1: Language Settings */}
          <div style={{
            padding: '15px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '11px',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MdTranslate size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                  {t.languageSetting}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                  {lang === 'km' ? 'ជ្រើសរើសភាសាប្រើប្រាស់' : 'Choose application language'}
                </div>
              </div>
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
                  cursor: 'pointer',
                  boxShadow: lang === 'en' ? '0 2px 6px rgba(37, 99, 235, 0.2)' : 'none',
                  transition: 'all 0.2s ease'
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
                  cursor: 'pointer',
                  boxShadow: lang === 'km' ? '0 2px 6px rgba(37, 99, 235, 0.2)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                ខ្មែរ
              </button>
            </div>
          </div>

          {/* Row 2: Change Password Action */}
          <div
            onClick={() => setShowPasswordModal(true)}
            style={{
              padding: '15px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              borderBottom: '1px solid #f1f5f9',
              transition: 'background 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '11px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MdLock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                  {t.changePasswordBtn}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                  {lang === 'km' ? 'សុវត្ថិភាពគណនី & លេខកូដ' : 'Account security & credentials'}
                </div>
              </div>
            </div>

            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b'
            }}>
              <MdKey size={16} />
            </div>
          </div>

          {/* Row 3: Log Out Action */}
          <div
            onClick={handleLogout}
            style={{
              padding: '15px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              backgroundColor: '#fff',
              transition: 'background 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '11px',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MdLogout size={19} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444' }}>
                {t.logout}
              </span>
            </div>

            <span style={{ fontSize: '13px', fontWeight: '700', color: '#f87171' }}>
              ➔
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
            border: '1px solid #e2e8f0',
            animation: 'popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  {t.changePasswordBtn}
                </h3>
              </div>

              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <MdClose size={20} />
              </button>
            </div>

            {passwordError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '14px'
              }}>
                ⚠️ {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#16a34a',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '14px'
              }}>
                ✅ {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {lang === 'km' ? 'លេខសម្ងាត់ចាស់' : 'Current Password'}
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {lang === 'km' ? 'លេខសម្ងាត់ថ្មី' : 'New Password'}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {lang === 'km' ? 'ផ្ទៀងផ្ទាត់លេខសម្ងាត់ថ្មី' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={passwordSubmitting}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: passwordSubmitting ? 'not-allowed' : 'pointer',
                  opacity: passwordSubmitting ? 0.7 : 1,
                  boxShadow: '0 6px 18px rgba(37, 99, 235, 0.25)'
                }}
              >
                {passwordSubmitting
                  ? (lang === 'km' ? 'កំពុងផ្លាស់ប្តូរ...' : 'Changing...')
                  : (lang === 'km' ? 'រក្សាទុកលេខសម្ងាត់ថ្មី' : 'Save New Password')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
            border: '1px solid #e2e8f0',
            animation: 'popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  <MdEdit size={22} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  {lang === 'km' ? 'កែប្រែព័ត៌មានគណនី' : 'Edit Profile Info'}
                </h3>
              </div>

              <button
                onClick={() => setShowEditProfileModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <MdClose size={20} />
              </button>
            </div>

            {editError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '14px'
              }}>
                ⚠️ {editError}
              </div>
            )}

            {editSuccess && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#16a34a',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '14px'
              }}>
                ✅ {editSuccess}
              </div>
            )}

            <form onSubmit={handleEditProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {lang === 'km' ? 'ឈ្មោះអ្នកបើកបរ (English)' : 'Driver Name'}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Sok Dara"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {lang === 'km' ? 'ឈ្មោះជាភាសាខ្មែរ' : 'Khmer Name'}
                </label>
                <input
                  type="text"
                  value={editNameKh}
                  onChange={(e) => setEditNameKh(e.target.value)}
                  placeholder="e.g. សុខ តារា"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t.phoneLabel}
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 012345678"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t.emailLabel}
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="e.g. driver@gmail.com"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t.genderLabel}
                </label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    boxSizing: 'border-box',
                    fontWeight: '700'
                  }}
                >
                  <option value="male">{t.genderMale}</option>
                  <option value="female">{t.genderFemale}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t.dobLabel}
                </label>
                <input
                  type="date"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    boxSizing: 'border-box',
                    fontWeight: '700'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t.joinDateLabel}
                </label>
                <input
                  type="date"
                  value={editJoinDate}
                  onChange={(e) => setEditJoinDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    boxSizing: 'border-box',
                    fontWeight: '700'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={editSubmitting}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: editSubmitting ? 'not-allowed' : 'pointer',
                  opacity: editSubmitting ? 0.7 : 1,
                  boxShadow: '0 6px 18px rgba(37, 99, 235, 0.25)'
                }}
              >
                {editSubmitting
                  ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...')
                  : (lang === 'km' ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'Save Changes')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
