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
  MdEdit
} from 'react-icons/md';

const profileTranslations = {
  en: {
    title: 'My Profile',
    tabSummary: 'Dashboard Summary',
    tabInfo: 'Personal Information',
    dashSummary: 'Dashboard Summary',
    dashSub: 'Quick overview of wallets and delivery performance',
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
    usdWallet: 'COD Collected (USD)',
    khrWallet: 'COD Collected (KHR)',
    totalPackages: 'Total Packages',
    successfulDeliveries: 'Successful',
    pendingPickups: 'Pending Pickups',
    problems: 'Problem / Returns',
  },
  km: {
    title: 'គណនីរបស់ខ្ញុំ',
    tabSummary: 'ផ្ទាំងសង្ខេបការងារ',
    tabInfo: 'ព័ត៌មានផ្ទាល់ខ្លួន',
    dashSummary: 'ផ្ទាំងសង្ខេបការងារ & កាបូបប្រាក់',
    dashSub: 'សេចក្ដីសង្ខេបប្រាក់ COD និងលទ្ធផលដឹកជញ្ជូន',
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
    usdWallet: 'ប្រមូលបាន COD (ដុល្លារ)',
    khrWallet: 'ប្រមូលបាន COD (រៀល)',
    totalPackages: 'កញ្ចប់អីវ៉ាន់សរុប',
    successfulDeliveries: 'ដឹកជញ្ជូនជោគជ័យ',
    pendingPickups: 'រង់ចាំទទួល',
    problems: 'មានបញ្ហា / ត្រឡប់',
  }
};

export default function DriverProfilePage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const t = profileTranslations[lang as 'en' | 'km'] || profileTranslations.en;

  const [activeMainTab, setActiveMainTab] = useState<'summary' | 'info'>('summary');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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

  const loadProfileData = async (p = period, sDate = startDate, eDate = endDate) => {
    try {
      let dashUrl = `/mobile/driver/dashboard?period=${p}`;
      if (p === 'custom') {
        if (sDate) dashUrl += `&startDate=${sDate}`;
        if (eDate) dashUrl += `&endDate=${eDate}`;
      }
      const [profRes, dashRes] = await Promise.all([
        api.get('/mobile/driver/profile'),
        api.get(dashUrl)
      ]);
      setProfile(profRes.data);
      setDashData(dashRes.data);
    } catch (err) {
      console.error('Failed to load driver profile or dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/driver/login');
      return;
    }
    loadProfileData(period, startDate, endDate);
  }, [router]);

  const handlePeriodChange = (newPeriod: 'today' | 'week' | 'month' | 'all' | 'custom') => {
    setPeriod(newPeriod);
    loadProfileData(newPeriod, startDate, endDate);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (period === 'custom') {
      loadProfileData('custom', val, endDate);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (period === 'custom') {
      loadProfileData('custom', startDate, val);
    }
  };

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

  // Wallet balances & stats
  const khrBalance = dashData?.wallets?.find((w: any) => w.currency === 'KHR')?.balance || 0;
  const usdBalance = dashData?.wallets?.find((w: any) => w.currency === 'USD')?.balance || 0;
  const stats = dashData?.statistics || {};
  const deliveryFeeTotal = dashData?.deliveryFeeTotal || 0;
  const totalSuccessful = stats?.totalSuccessful || 0;
  const feePerPkg = totalSuccessful > 0 ? (deliveryFeeTotal / totalSuccessful).toFixed(2) : '0.00';

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
              getInitials(displayName)
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

        {/* Centered User Name */}
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
          {displayName}
        </h2>
      </div>

      {/* Main Content Container */}
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
            onClick={() => setActiveMainTab('summary')}
            style={{
              flex: 1,
              padding: '11px 12px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: activeMainTab === 'summary' ? '#2563eb' : 'transparent',
              color: activeMainTab === 'summary' ? '#ffffff' : '#64748b',
              fontWeight: activeMainTab === 'summary' ? '800' : '600',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: activeMainTab === 'summary' ? '0 4px 14px rgba(37, 99, 235, 0.3)' : 'none'
            }}
          >
            <MdDashboard size={18} />
            {t.tabSummary}
          </button>

          <button
            onClick={() => setActiveMainTab('info')}
            style={{
              flex: 1,
              padding: '11px 12px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: activeMainTab === 'info' ? '#2563eb' : 'transparent',
              color: activeMainTab === 'info' ? '#ffffff' : '#64748b',
              fontWeight: activeMainTab === 'info' ? '800' : '600',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: activeMainTab === 'info' ? '0 4px 14px rgba(37, 99, 235, 0.3)' : 'none'
            }}
          >
            <MdPerson size={18} />
            {t.tabInfo}
          </button>
        </div>

        {/* TAB 1: Dashboard Summary View */}
        {activeMainTab === 'summary' && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '22px',
            padding: '18px',
            boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Period Filter Selector Pills */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '3px',
                display: 'flex',
                gap: '3px',
                border: '1px solid #e2e8f0'
              }}>
                {[
                  { id: 'today', labelEn: 'Today', labelKm: 'ថ្ងៃនេះ' },
                  { id: 'week', labelEn: 'Week', labelKm: 'សប្ដាហ៍' },
                  { id: 'month', labelEn: 'Month', labelKm: 'ខែ' },
                  { id: 'all', labelEn: 'All', labelKm: 'ទាំងអស់' },
                  { id: 'custom', labelEn: 'Custom', labelKm: 'ជ្រើសរើសថ្ងៃ' },
                ].map(item => {
                  const isSelected = period === item.id;
                  const label = lang === 'km' ? item.labelKm : item.labelEn;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handlePeriodChange(item.id as any)}
                      style={{
                        flex: 1,
                        padding: '7px 2px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: isSelected ? '#2563eb' : 'transparent',
                        color: isSelected ? '#ffffff' : '#64748b',
                        fontWeight: isSelected ? '800' : '600',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Start & End Date Inputs */}
              {period === 'custom' && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '14px',
                  padding: '10px 12px',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '9.5px', color: '#64748b', fontWeight: '700' }}>
                      {lang === 'km' ? 'ថ្ងៃចាប់ផ្តើម' : 'Start Date'}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      style={{
                        padding: '5px 6px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#0f172a',
                        outline: 'none',
                        width: '100%',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', marginTop: '12px' }}>➔</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '9.5px', color: '#64748b', fontWeight: '700' }}>
                      {lang === 'km' ? 'ថ្ងៃបញ្ចប់' : 'End Date'}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      style={{
                        padding: '5px 6px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#0f172a',
                        outline: 'none',
                        width: '100%',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Wallets Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              {/* Delivery Fee Total — Full width */}
              <div style={{
                background: 'linear-gradient(135deg, #0f2460 0%, #1e40af 100%)',
                borderRadius: '16px',
                padding: '12px 16px',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(30, 64, 175, 0.30)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src="/3d/3d_cash.png" alt="Fee" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '800', opacity: 0.85, lineHeight: 1.3 }}>
                      {lang === 'km' ? 'ថ្លៃដឹករួម (រយៈពេល)' : 'Total Delivery Fee (Period)'}
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: '900', marginTop: '2px' }}>
                      ${deliveryFeeTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderRadius: '12px',
                  padding: '6px 12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '9px', fontWeight: '800', opacity: 0.85 }}>
                    {lang === 'km' ? '/ 1 កញ្ចប់' : '/ pkg'}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '900' }}>
                    ${feePerPkg}
                  </div>
                </div>
              </div>

              {/* COD Pills Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* USD COD */}
                <div style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <img src="/3d/3d_cash.png" alt="USD" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '800', opacity: 0.85, lineHeight: 1.3 }}>
                      {t.usdWallet}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '900', marginTop: '2px', letterSpacing: '-0.3px' }}>
                      ${usdBalance.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* KHR COD */}
                <div style={{
                  background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <img src="/3d/3d_khr_coin.png" alt="KHR" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '800', opacity: 0.85, lineHeight: 1.3 }}>
                      {t.khrWallet}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '900', marginTop: '2px', letterSpacing: '-0.3px' }}>
                      {khrBalance.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: '700' }}>៛</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }}>
              {/* Total Packages */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <img src="/3d/3d_box.png" alt="Box" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600', lineHeight: 1.2 }}>{t.totalPackages}</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '1px' }}>{stats.totalPackage ?? 0}</div>
                </div>
              </div>

              {/* Successful Deliveries */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#ecfdf5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <img src="/3d/3d_check.png" alt="Check" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600', lineHeight: 1.2 }}>{t.successfulDeliveries}</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '1px' }}>{stats.totalSuccessful ?? 0}</div>
                </div>
              </div>

              {/* Pending Pickups */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#fff7ed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <img src="/3d/3d_shop.png" alt="Shop" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600', lineHeight: 1.2 }}>{t.pendingPickups}</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '1px' }}>{stats.pickupRequest ?? 0}</div>
                </div>
              </div>

              {/* Problems */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#fff1f2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <img src="/3d/3d_cross.png" alt="Problem" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600', lineHeight: 1.2 }}>{t.problems}</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '1px' }}>{(stats.totalProblem ?? 0) + (stats.totalReturn ?? 0)}</div>
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
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
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
                {lang === 'km' ? 'កែប្រែព័ត៌មាន' : 'Edit Profile'}
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
                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800' }}>{profile?.phone || '012-345-678'}</span>
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
                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800' }}>{profile?.email || 'driver@gmail.com'}</span>
                </div>
              </div>

              {/* Salary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#10b981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <MdAttachMoney size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginRight: '6px' }}>{t.salaryLabel}:</span>
                  <span style={{ fontSize: '14px', color: '#059669', fontWeight: '800' }}>{formattedSalary}</span>
                </div>
              </div>

              {/* Gender */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#f5f3ff', color: '#6366f1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <MdWc size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginRight: '6px' }}>{t.genderLabel}:</span>
                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800' }}>{genderText}</span>
                </div>
              </div>

              {/* Join Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <MdCalendarToday size={16} />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginRight: '6px' }}>{t.joinDateLabel}:</span>
                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800' }}>
                    {profile?.joinDate ? formatDate(profile.joinDate) : (lang === 'km' ? 'មិនទាន់កំណត់' : 'Not set')}
                  </span>
                </div>
              </div>

              {/* Date of Birth (DOB) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0284c7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <MdCalendarToday size={16} />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginRight: '6px' }}>{t.dobLabel}:</span>
                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800' }}>
                    {profile?.dob ? formatDate(profile.dob) : (lang === 'km' ? 'មិនទាន់កំណត់' : 'Not set')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card 3: Language Settings */}
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
            <span style={{ fontSize: '14.5px', fontWeight: '800', color: '#1e293b' }}>
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

        {/* Change Password Action Card */}
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
            <span style={{ fontSize: '14.5px', fontWeight: '800', color: '#1e293b' }}>
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

        {/* Centered Floating White Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            background: '#ffffff',
            color: '#ef4444',
            border: 'none',
            padding: '16px 24px',
            borderRadius: '18px',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#fef2f2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MdLogout size={16} />
          </div>
          <span style={{ color: '#ef4444', fontWeight: '800' }}>{t.logout}</span>
        </button>
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
