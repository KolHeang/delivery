'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';

export default function OrganisationSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: 'EBS Digital Solutions',
    phone: '+855 78 000 000',
    email: 'info@ebs.com',
    website: 'https://ebs.com',
    address: 'Phnom Penh, Cambodia',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    const load = async () => {
      try {
        const res = await api.get('/settings/organisation');
        if (res.data) {
          setForm({
            name: res.data.name || '',
            phone: res.data.phone || '',
            email: res.data.email || '',
            website: res.data.website || '',
            address: res.data.address || '',
          });
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await api.post('/settings/organisation', form);
      setSuccessMsg('Organisation settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      alert('Failed to save settings');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Organisation Settings" subtitle="Configure business profile and branding metadata" />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">🏢 Organisation Details</span></div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {successMsg && (
                  <div className="badge badge-delivered" style={{ display: 'block', padding: 12, marginBottom: 16, textAlign: 'center', fontSize: 13 }}>
                    {successMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Company Name <span>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone <span>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address <span>*</span></label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.website}
                    onChange={e => setForm({ ...form, website: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address <span>*</span></label>
                  <textarea
                    className="form-control"
                    rows={3}
                    style={{ resize: 'vertical' }}
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginTop: 20, textAlign: 'right' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
