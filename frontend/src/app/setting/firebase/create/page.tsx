'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdCloudUpload,
  MdCode,
  MdCheckCircle,
  MdErrorOutline,
  MdArrowBack,
  MdSave,
  MdVisibility,
  MdVisibilityOff,
  MdInsertDriveFile,
} from 'react-icons/md';
import { SiFirebase } from 'react-icons/si';
import { FaRegEdit } from 'react-icons/fa';

export default function CreateFirebasePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const isKh = lang === 'km';
  const tr = (km: string, en: string) => (isKh ? km : en);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'manual'>('upload');
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pastedJson, setPastedJson] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);

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
    }
  }, [router]);

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

  const parseJsonObject = (jsonString: string, uploadedName?: string): boolean => {
    try {
      const obj = JSON.parse(jsonString.trim());
      if (!obj.project_id && !obj.projectId) {
        setErrorMsg(tr('JSON នេះខ្វះ `project_id`។ សូមពិនិត្យឯកសារឡើងវិញ។', 'JSON missing `project_id`. Please verify your file.'));
        return false;
      }
      if (!obj.private_key && !obj.privateKey) {
        setErrorMsg(tr('JSON នេះខ្វះ `private_key`។', 'JSON missing `private_key`.'));
        return false;
      }

      setForm((prev) => ({
        ...prev,
        type: obj.type || 'service_account',
        projectId: obj.project_id || obj.projectId || '',
        privateKeyId: obj.private_key_id || obj.privateKeyId || '',
        privateKey: obj.private_key || obj.privateKey || '',
        clientEmail: obj.client_email || obj.clientEmail || '',
        clientId: obj.client_id || obj.clientId || '',
        authUri: obj.auth_uri || obj.authUri || prev.authUri,
        tokenUri: obj.token_uri || obj.tokenUri || prev.tokenUri,
        authProviderX509CertUrl: obj.auth_provider_x509_cert_url || obj.authProviderX509CertUrl || prev.authProviderX509CertUrl,
        clientX509CertUrl: obj.client_x509_cert_url || obj.clientX509CertUrl || prev.clientX509CertUrl,
        universeDomain: obj.universe_domain || obj.universeDomain || prev.universeDomain,
      }));

      if (uploadedName) setFileName(uploadedName);
      setErrorMsg('');
      setSuccessMsg(tr(`បានស្រង់ទិន្នន័យពី JSON ជោគជ័យ! (Project ID: ${obj.project_id || obj.projectId})`, `Extracted JSON successfully! (Project ID: ${obj.project_id || obj.projectId})`));
      setTimeout(() => setSuccessMsg(''), 4000);
      return true;
    } catch {
      setErrorMsg(tr('ទម្រង់ JSON មិនត្រឹមត្រូវ (Invalid JSON)', 'Invalid JSON string'));
      return false;
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setErrorMsg(tr('សូមជ្រើសរើសឯកសារ JSON (.json)', 'Please choose a .json file'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseJsonObject(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let payload = { ...form };

    // Validation based on active tab
    if (activeTab === 'upload') {
      if (!payload.projectId || !payload.privateKey) {
        setErrorMsg(tr('សូម Upload ឯកសារ JSON serviceAccountKey.json ជាមុនសិន', 'Please upload a serviceAccountKey.json file first'));
        return;
      }
    } else if (activeTab === 'paste') {
      if (!pastedJson.trim()) {
        setErrorMsg(tr('សូម Paste កូដ JSON ចូលក្នុងប្រអប់ជាមុនសិន', 'Please paste your JSON code first'));
        return;
      }
      try {
        const obj = JSON.parse(pastedJson.trim());
        if (!obj.project_id && !obj.projectId) {
          setErrorMsg(tr('JSON នេះខ្វះ `project_id`', 'JSON missing `project_id`'));
          return;
        }
        if (!obj.private_key && !obj.privateKey) {
          setErrorMsg(tr('JSON នេះខ្វះ `private_key`', 'JSON missing `private_key`'));
          return;
        }
        payload = {
          type: obj.type || 'service_account',
          projectId: obj.project_id || obj.projectId || '',
          privateKeyId: obj.private_key_id || obj.privateKeyId || '',
          privateKey: obj.private_key || obj.privateKey || '',
          clientEmail: obj.client_email || obj.clientEmail || '',
          clientId: obj.client_id || obj.clientId || '',
          authUri: obj.auth_uri || 'https://accounts.google.com/o/oauth2/auth',
          tokenUri: obj.token_uri || 'https://oauth2.googleapis.com/token',
          authProviderX509CertUrl: obj.auth_provider_x509_cert_url || 'https://www.googleapis.com/oauth2/v1/certs',
          clientX509CertUrl: obj.client_x509_cert_url || '',
          universeDomain: obj.universe_domain || 'googleapis.com',
        };
      } catch {
        setErrorMsg(tr('ទម្រង់ JSON មិនត្រឹមត្រូវ (Invalid JSON)', 'Invalid JSON string'));
        return;
      }
    } else if (activeTab === 'manual') {
      const errs: Record<string, string> = {};
      if (!payload.projectId.trim()) {
        errs.projectId = isKh ? 'សូមបញ្ចូល Project ID' : 'Project ID is required';
      }
      if (!payload.privateKey.trim()) {
        errs.privateKey = isKh ? 'សូមបញ្ចូល Private Key' : 'Private Key is required';
      }
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        setErrorMsg(isKh ? 'សូមបំពេញព័ត៌មានដែលចាំបាច់ (Required fields)' : 'Please fill all required fields');
        return;
      }
    }

    setSaving(true);
    try {
      await api.post('/settings/firebase', payload);
      router.push('/setting/firebase');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || tr('បរាជ័យក្នុងការរក្សាទុក Firebase', 'Failed to save Firebase credentials'));
      setSaving(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={tr('បន្ថែម Firebase ថ្មី (New Firebase)', 'Add Firebase Credentials')}
          subtitle={tr('បង្កើត និងកំណត់ការភ្ជាប់ Google Firebase Service Account ថ្មី', 'Create and configure new Firebase service account')}
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

          {/* Main Card */}
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
                    {tr('ព័ត៌មាន Firebase Service Account', 'Firebase Service Account Details')}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {tr('ជ្រើសរើសវិធីបញ្ចូលទិន្នន័យតាមរយៈ Upload File, Paste JSON ឬវាយដោយដៃ', 'Choose to upload JSON file, paste JSON or enter manually')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => router.push('/setting/firebase')}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <MdArrowBack size={16} />
                {tr('ត្រឡប់ក្រោយ', 'Back to List')}
              </button>
            </div>

            <div className="card-body" style={{ padding: '24px' }}>
              <form onSubmit={handleSubmit} noValidate>

                {/* Method Selector Tabs */}
                <div style={{
                  display: 'flex',
                  gap: 8,
                  backgroundColor: '#f8fafc',
                  padding: 6,
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  marginBottom: 24,
                }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('upload'); setErrorMsg(''); }}
                    style={{
                      flex: 1,
                      padding: '9px 16px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: activeTab === 'upload' ? '#ffffff' : 'transparent',
                      color: activeTab === 'upload' ? '#2563eb' : '#64748b',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: activeTab === 'upload' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <MdCloudUpload size={18} />
                    {tr('១. Upload File .json (ណែនាំ)', '1. Upload .json (Recommended)')}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('paste'); setErrorMsg(''); }}
                    style={{
                      flex: 1,
                      padding: '9px 16px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: activeTab === 'paste' ? '#ffffff' : 'transparent',
                      color: activeTab === 'paste' ? '#2563eb' : '#64748b',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: activeTab === 'paste' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <MdCode size={18} />
                    {tr('២. Paste JSON Code', '2. Paste JSON Code')}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('manual'); setErrorMsg(''); }}
                    style={{
                      flex: 1,
                      padding: '9px 16px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: activeTab === 'manual' ? '#ffffff' : 'transparent',
                      color: activeTab === 'manual' ? '#2563eb' : '#64748b',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: activeTab === 'manual' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <FaRegEdit size={16} />
                    {tr('៣. វាយបញ្ចូលដោយដៃ (Manual)', '3. Manual Entry')}
                  </button>
                </div>

                {/* TAB 1: File Dropzone Only */}
                {activeTab === 'upload' && (
                  <div>
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

                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => {
                        if (fileInputRef.current) fileInputRef.current.click();
                      }}
                      style={{
                        border: isDragOver ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                        borderRadius: 14,
                        padding: '44px 20px',
                        textAlign: 'center',
                        backgroundColor: isDragOver ? '#eff6ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        backgroundColor: isDragOver ? '#dbeafe' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                      }}>
                        <MdCloudUpload size={30} color="#2563eb" />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                        {fileName ? fileName : tr('ទម្លាក់ឯកសារ serviceAccountKey.json ទីនេះ ឬចុចដើម្បី Browse', 'Drop serviceAccountKey.json here, or click to browse')}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
                        {tr('ទាញយកពី Firebase Console > Project Settings > Service accounts', 'Downloaded from Firebase Console > Project Settings > Service accounts')}
                      </div>
                    </div>

                    {/* Show verified file details if loaded */}
                    {form.projectId && (
                      <div style={{
                        marginTop: 18,
                        padding: '16px 20px',
                        borderRadius: 12,
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}>
                        <MdInsertDriveFile size={26} color="#16a34a" />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#166534' }}>
                            {tr(`បានផ្ទៀងផ្ទាត់ឯកសារជោគជ័យ៖ Project ID = ${form.projectId}`, `Verified: Project ID = ${form.projectId}`)}
                          </div>
                          {form.clientEmail && (
                            <div style={{ fontSize: 12.5, color: '#15803d', marginTop: 2 }}>
                              {form.clientEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Paste JSON Only */}
                {activeTab === 'paste' && (
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'block' }}>
                      {tr('Paste មាតិកា JSON ទាំងមូលចូលទីនេះ៖', 'Paste full Service Account JSON content here:')}
                    </label>
                    <textarea
                      rows={10}
                      value={pastedJson}
                      onChange={(e) => {
                        setPastedJson(e.target.value);
                        parseJsonObject(e.target.value);
                      }}
                      className="form-control"
                      style={{ fontFamily: 'monospace', fontSize: 12.5, backgroundColor: '#f8fafc', lineHeight: 1.5 }}
                    />

                    {form.projectId && (
                      <div style={{
                        marginTop: 14,
                        padding: '12px 16px',
                        borderRadius: 10,
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <MdCheckCircle size={18} color="#16a34a" />
                        <span>{tr(`បាន Parse ជោគជ័យ៖ Project ID = ${form.projectId}`, `Parsed Successfully: Project ID = ${form.projectId}`)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Manual Entry Only */}
                {activeTab === 'manual' && (
                  <div>
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
                        rows={5}
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
                  </div>
                )}

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
                    {saving ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('រក្សាទុក និងបង្កើត', 'Save & Create')}
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
