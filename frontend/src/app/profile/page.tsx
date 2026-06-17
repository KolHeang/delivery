'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { MdPerson, MdEmail, MdLock, MdVerifiedUser, MdOutlineCalendarToday } from 'react-icons/md';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    const loadUserData = async () => {
      try {
        const cachedUser = getUser();
        if (!cachedUser) {
          router.push('/');
          return;
        }

        const response = await api.get(`/users/${cachedUser.id}`);
        setCurrentUser(response.data);
        setForm({
          name: response.data.name,
          email: response.data.email,
          password: '',
          confirmPassword: '',
        });
      } catch (err: any) {
        console.error('Failed to load user profile details:', err);
        const cachedUser = getUser();
        if (cachedUser) {
          setCurrentUser(cachedUser);
          setForm({
            name: cachedUser.name,
            email: cachedUser.email,
            password: '',
            confirmPassword: '',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Name cannot be empty' });
      return;
    }
    if (!form.email.trim()) {
      setMessage({ type: 'error', text: 'Email cannot be empty' });
      return;
    }

    if (form.password) {
      if (form.password.length < 6) {
        setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
        return;
      }
      if (form.password !== form.confirmPassword) {
        setMessage({ type: 'error', text: 'Passwords do not match' });
        return;
      }
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload: any = {
        name: form.name.trim(),
        email: form.email.trim(),
      };
      if (form.password) {
        payload.password = form.password;
      }

      const response = await api.patch(`/users/${currentUser.id}`, payload);
      const updatedUser = response.data;

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      window.dispatchEvent(new Event('user-updated'));

      setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="My Profile" subtitle="Manage your account settings and credentials" />
        <div className="page-content">
          {loading ? (
            <div className="loading-wrapper">
              <div className="spinner" />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>

              {/* Profile Card Summary */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">👤 Account Overview</span>
                </div>
                <div className="card-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div className="sidebar-avatar" style={{ width: '80px', height: '80px', fontSize: '32px', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' }}>
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '8px 0 4px' }}>{currentUser?.name}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{currentUser?.email}</p>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', margin: '8px 0' }}>
                    <Badge status={currentUser?.role || 'staff'} />
                    <Badge status={currentUser?.active ? 'active' : 'inactive'} />
                  </div>

                  <hr className="divider" style={{ width: '100%', margin: '8px 0' }} />

                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MdVerifiedUser size={16} style={{ color: 'var(--accent)' }} />
                      <span>Permission Level: <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.role === 'admin' ? 'Administrator' : 'UserMember'}</strong></span>
                    </div>
                    {currentUser?.createdAt && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MdOutlineCalendarToday size={16} style={{ color: 'var(--accent)' }} />
                        <span>Member Since: <strong style={{ color: 'var(--text-primary)' }}>{new Date(currentUser.createdAt).toLocaleDateString()}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Form Card */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">⚙️ Update Details</span>
                </div>
                <form className="card-body" onSubmit={handleSave}>
                  {message && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius)',
                        marginBottom: '20px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        backgroundColor: message.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
                        color: message.type === 'success' ? '#065f46' : '#991b1b',
                        border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      }}
                    >
                      {message.type === 'success' ? '✅ ' : '❌ '} {message.text}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">
                      Full Name <span>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <MdPerson style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '16px' }} />
                      <input
                        type="text"
                        className="form-control"
                        style={{ paddingLeft: '38px' }}
                        value={form.name}
                        onChange={handleChange('name')}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Email Address <span>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <MdEmail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '16px' }} />
                      <input
                        type="email"
                        className="form-control"
                        style={{ paddingLeft: '38px' }}
                        value={form.email}
                        onChange={handleChange('email')}
                        required
                      />
                    </div>
                  </div>

                  <hr className="divider" style={{ margin: '24px 0' }} />

                  <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Change Password</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Leave password fields blank if you do not wish to change your password.</p>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <div style={{ position: 'relative' }}>
                        <MdLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '16px' }} />
                        <input
                          type="password"
                          className="form-control"
                          style={{ paddingLeft: '38px' }}
                          placeholder="Min 6 characters"
                          value={form.password}
                          onChange={handleChange('password')}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <div style={{ position: 'relative' }}>
                        <MdLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '16px' }} />
                        <input
                          type="password"
                          className="form-control"
                          style={{ paddingLeft: '38px' }}
                          placeholder="Repeat password"
                          value={form.confirmPassword}
                          onChange={handleChange('confirmPassword')}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => router.push('/dashboard')}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? 'Saving Changes...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
