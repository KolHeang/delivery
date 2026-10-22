'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdCloudUpload,
  MdCheckCircle,
  MdErrorOutline,
  MdArrowBack,
  MdSave,
  MdVisibility,
  MdVisibilityOff,
  MdRefresh,
} from 'react-icons/md';
import { SiFirebase } from 'react-icons/si';

export default function EditFirebasePage() {
  const router = useRouter();
  const params = useParams();
  const { lang, t } = useLanguage();
  const isKh = lang === 'km';
  const tr = (km: string, en: string) => (isKh ? km : en);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: 'service_account',
    projectId: '',
    privateKeyId: '',
    privateKey: '',
    clientEmail: '',
    clientId: '',
    authUri: 'https://accounts.google.com/o/oauth2/auth',
    tokenUri: 'https://oauth2.googleapis.com/token',
    authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
    clientX509CertUrl: '',
    universeDomain: 'googleapis.com',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    const loadItem = async () => {
      try {
        const res = await api.get(`/settings/firebase/${params.id}`);
        if (res.data) {
          setForm({
            type: res.data.type || 'service_account',
            projectId: res.data.projectId || '',
            privateKeyId: res.data.privateKeyId || '',
            privateKey: res.data.privateKey || '',
            clientEmail: res.data.clientEmail || '',
            clientId: res.data.clientId || '',
            authUri: res.data.authUri || 'https://accounts.google.com/o/oauth2/auth',
            tokenUri: res.data.tokenUri || 'https://oauth2.googleapis.com/token',
            authProviderX509CertUrl: res.data.authProviderX509CertUrl || 'https://www.googleapis.com/oauth2/v1/certs',
            clientX509CertUrl: res.data.clientX509CertUrl || '',
            universeDomain: res.data.universeDomain || 'googleapis.com',
          });
        }
      } catch (err: any) {
        alert(tr('មិនអាចទាញយកទិន្នន័យ Firebase បានទេ', 'Failed to load Firebase credentials'));
        router.push('/setting/firebase');
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [params.id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setErrorMsg(tr('សូមជ្រើសរើសឯកសារ JSON (.json)', 'Please choose a .json file'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const obj = JSON.parse(text);
        setForm((prev) => ({
          ...prev,
          type: obj.type || prev.type,
          projectId: obj.project_id || obj.projectId || prev.projectId,
          privateKeyId: obj.private_key_id || obj.privateKeyId || prev.privateKeyId,
          privateKey: obj.private_key || obj.privateKey || prev.privateKey,
          clientEmail: obj.client_email || obj.clientEmail || prev.clientEmail,
          clientId: obj.client_id || obj.clientId || prev.clientId,
          authUri: obj.auth_uri || obj.authUri || prev.authUri,
          tokenUri: obj.token_uri || obj.tokenUri || prev.tokenUri,
          authProviderX509CertUrl: obj.auth_provider_x509_cert_url || obj.authProviderX509CertUrl || prev.authProviderX509CertUrl,
          clientX509CertUrl: obj.client_x509_cert_url || obj.clientX509CertUrl || prev.clientX509CertUrl,
          universeDomain: obj.universe_domain || obj.universeDomain || prev.universeDomain,
        }));
        setFileName(file.name);
        setErrors({});
        setSuccessMsg(tr(`បានបញ្ចូលទិន្នន័យថ្មីពីឯកសារ ${file.name}!`, `Loaded new values from ${file.name}!`));
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch {
        setErrorMsg(tr('ឯកសារ JSON មិនត្រឹមត្រូវ', 'Invalid JSON file'));
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.projectId.trim()) {
      errs.projectId = isKh ? 'សូមបញ្ចូល Project ID' : 'Project ID is required';
    }
    if (!form.privateKey.trim()) {
      errs.privateKey = isKh ? 'សូមបញ្ចូល Private Key' : 'Private Key is required';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setErrorMsg(isKh ? 'សូមបំពេញព័ត៌មានដែលចាំបាច់ (Required fields)' : 'Please fill all required fields');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      await api.put(`/settings/firebase/${params.id}`, form);
      router.push('/setting/firebase');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || tr('បរាជ័យក្នុងការកែប្រែ Firebase', 'Failed to update Firebase credentials'));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <div className="loading-wrapper"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={tr(`កែប្រែ Firebase (${form.projectId})`, `Edit Firebase (${form.projectId})`)}
          subtitle={tr('កែសម្រួលព័ត៌មាន Google Firebase Service Account', 'Update Firebase service account credentials')}
        />

        <div className="page-content">

          {/* Feedback messages */}
          {successMsg && (
            <div style={{
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              padding: '12px 18px',
              borderRadius: 12,
              marginBottom: 16,
              fontSize: 13.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #a7f3d0',
            }}>
              <MdCheckCircle size={20} color="#10b981" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              padding: '12px 18px',
              borderRadius: 12,
              marginBottom: 16,
              fontSize: 13.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #fecaca',
            }}>
              <MdErrorOutline size={20} color="#ef4444" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#fff7ed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <SiFirebase size={22} color="#f59e0b" />
                </div>
                <div>
                  <h3 className="card-title" style={{ margin: 0, fontSize: 16 }}>
                    {tr('កែប្រែទិន្នន័យ Firebase Service Account', 'Edit Firebase Service Account')}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {tr('អ្នកអាចកែប្រែដោយដៃ ឬ Upload ឯកសារ JSON ថ្មីដើម្បី Overwrite', 'Edit manually or upload a new JSON file to replace fields')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <MdRefresh size={16} />
                  {fileName ? fileName : tr('Upload JSON ថ្មី', 'Replace with JSON')}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => router.push('/setting/firebase')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <MdArrowBack size={16} />
                  {tr('ត្រឡប់ក្រោយ', 'Back')}
                </button>
              </div>
            </div>

            <div className="card-body" style={{ padding: '24px' }}>
              <form onSubmit={handleSubmit} noValidate>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                  {/* Project ID */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>
                      Project ID <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="projectId"
                      value={form.projectId}
                      onChange={handleChange}
                      className={`form-control ${errors.projectId ? 'is-invalid' : ''}`}
                    />
                    {errors.projectId && (
                      <div className="form-error-text" style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                        {errors.projectId}
                      </div>
                    )}
                  </div>

                  {/* Client Email */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>
                      Client Email
                    </label>
                    <input
                      type="text"
                      name="clientEmail"
                      value={form.clientEmail}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>

                  {/* Private Key ID */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>
                      Private Key ID
                    </label>
                    <input
                      type="text"
                      name="privateKeyId"
                      value={form.privateKeyId}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>

                  {/* Client ID */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>
                      Client ID
                    </label>
                    <input
                      type="text"
                      name="clientId"
                      value={form.clientId}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                </div>

                {/* Private Key Textarea */}
                <div className="form-group" style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>
                      Private Key <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {showPrivateKey ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                      {showPrivateKey ? tr('លាក់ Private Key', 'Hide Key') : tr('បង្ហាញ Private Key', 'Show Key')}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    name="privateKey"
                    value={form.privateKey}
                    onChange={handleChange}
                    className={`form-control ${errors.privateKey ? 'is-invalid' : ''}`}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 11.5,
                      backgroundColor: '#f8fafc',
                      filter: showPrivateKey ? 'none' : 'blur(3px)',
                      transition: 'filter 0.2s',
                    }}
                  />
                  {errors.privateKey && (
                    <div className="form-error-text" style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                      {errors.privateKey}
                    </div>
                  )}
                </div>

                {/* Submit and Cancel Buttons */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 28,
                  paddingTop: 18,
                  borderTop: '1px solid #f1f5f9',
                }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => router.push('/setting/firebase')}
                    style={{ fontWeight: 700 }}
                  >
                    {t('cancel') || tr('បោះបង់', 'Cancel')}
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, padding: '10px 24px' }}
                  >
                    <MdSave size={18} />
                    {saving ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('រក្សាទុកការកែប្រែ', 'Save Changes')}
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
