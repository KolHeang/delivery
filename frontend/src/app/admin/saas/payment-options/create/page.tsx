'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saasApi } from '@/lib/saas-api';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { SaasMasterLayout } from '@/components/layout/SaasMasterLayout';
import { MdArrowBack, MdCloudUpload, MdDeleteOutline, MdQrCode2 } from 'react-icons/md';

export default function CreatePaymentOptionPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'offline' as 'offline' | 'aba' | 'khqr',
    status: 'active' as 'active' | 'pending' | 'inactive',
    bankName: '',
    accountName: '',
    accountNumber: '',
    qrCodeUrl: '',
    instructions: '',
    requiresApproval: true,
    sortOrder: 10,
  });

  const handleQrFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(tr('សូមជ្រើសរើសឯកសាររូបភាពប៉ុណ្ណោះ (PNG, JPG, ...)', 'Please select an image file'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(tr('ទំហំរូបភាពត្រូវតែតូចជាង 5MB', 'Image size must be less than 5MB'));
      return;
    }

    // 1. Immediate Base64 preview & fallback
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, qrCodeUrl: base64 }));
    };
    reader.readAsDataURL(file);

    // 2. Upload to server storage if supported
    const upload = async () => {
      try {
        setQrUploading(true);
        const data = new FormData();
        data.append('file', file);
        const res = await api.post('/mobile/upload/single?folder=payment-options', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.url) {
          setFormData((prev) => ({ ...prev, qrCodeUrl: res.data.url }));
        }
      } catch {
        // Keeps base64 fallback
      } finally {
        setQrUploading(false);
      }
    };
    upload();
  };

  const handleRemoveQr = () => {
    setFormData((prev) => ({ ...prev, qrCodeUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert(tr('សូមបំពេញឈ្មោះជម្រើសទូទាត់', 'Please fill in payment option name'));
      return;
    }

    try {
      setSaving(true);
      await saasApi.createPaymentOption({
        name: formData.name.trim(),
        type: formData.type,
        status: formData.status,
        bankName: formData.bankName.trim() || undefined,
        accountName: formData.accountName.trim() || undefined,
        accountNumber: formData.accountNumber.trim() || undefined,
        qrCodeUrl: formData.qrCodeUrl.trim() || undefined,
        instructions: formData.instructions.trim() || undefined,
        requiresApproval: formData.requiresApproval,
        sortOrder: Number(formData.sortOrder) || 0,
      });

      alert(tr('បានបង្កើតជម្រើសទូទាត់ថ្មីជោគជ័យ!', 'Payment option created successfully!'));
      router.push('/admin/saas/payment-options');
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការបង្កើតជម្រើសទូទាត់', 'Failed to create payment option'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SaasMasterLayout activeTab="payment-options">
      {/* Back Button & Title */}
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/admin/saas/payment-options"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          <MdArrowBack size={16} />
          <span>{tr('ត្រឡប់ទៅបញ្ជីជម្រើសទូទាត់', 'Back to Payment Options')}</span>
        </Link>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          {tr('បង្កើតជម្រើសទូទាត់ប្រាក់ថ្មី', 'Create Payment Option')}
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
          {tr('កំណត់វិធីសាស្ត្រទូទាត់ប្រាក់ គណនីធនាគារ និងលក្ខខណ្ឌអនុម័តសម្រាប់ក្រុមហ៊ុនជាវសេវា', 'Configure payment gateway, bank account, and approval rules for tenant companies')}
        </p>
      </div>

      {/* Form Card — Full width, clean styling matching the rest of the SaaS portal */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">{tr('ព័ត៌មានជម្រើសទូទាត់ប្រាក់', 'Payment Option Details')}</span>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Row 1: Option Name & Sort Order */}
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">
                  {tr('ឈ្មោះជម្រើសទូទាត់', 'Option Name')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={tr('ឧ. Offline Bank Transfer, ABA Direct API, Bakong KHQR', 'e.g. Offline Bank Transfer, ABA Direct API, Bakong KHQR')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">
                  {tr('លំដាប់បង្ហាញ (Sort Order)', 'Sort Order')}
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Row 2: Type & Status */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  {tr('ប្រភេទជម្រើស (Type)', 'Gateway Type')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={formData.type}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setFormData({
                      ...formData,
                      type: newType,
                      requiresApproval: newType === 'offline',
                    });
                  }}
                >
                  <option value="offline">{tr('Offline Bank Transfer (ផ្ទេរតាមធនាគារ)', 'Offline Bank Transfer')}</option>
                  <option value="aba">{tr('ABA Bank Direct API', 'ABA Bank Direct API')}</option>
                  <option value="khqr">{tr('Bakong KHQR', 'Bakong KHQR')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {tr('ស្ថានភាព (Status)', 'Status')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="active">{tr('សកម្ម (Active)', 'Active')}</option>
                  <option value="pending">{tr('រង់ចាំតភ្ជាប់ (Pending API)', 'Pending API')}</option>
                  <option value="inactive">{tr('អសកម្ម (Inactive)', 'Inactive')}</option>
                </select>
              </div>
            </div>

            {/* Row 3: Bank Details */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  {tr('ឈ្មោះធនាគារ (Bank Name)', 'Bank Name')}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ABA Bank, ACLEDA Bank, ..."
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {tr('ឈ្មោះគណនី (Account Name)', 'Account Name')}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="EBS LOGISTICS SAAS CO., LTD."
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {tr('លេខគណនី (Account Number)', 'Account Number')}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="000 123 456"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Row 4: QR Code Image */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdQrCode2 size={18} color="#2563eb" />
                <span>{tr('រូបភាព QR Code / KHQR (QR Code Image)', 'QR Code / KHQR Image')}</span>
              </label>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {formData.qrCodeUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ width: 110, height: 110, borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={formData.qrCodeUrl}
                        alt="QR Code"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                        {tr('រូបភាព QR Code ត្រូវបានជ្រើសរើស', 'QR Code image loaded')}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 10 }}>
                        {tr('QR Code នឹងត្រូវបង្ហាញលើផ្ទាំងទូទាត់សម្រាប់អតិថិជនស្កេន', 'Will be shown on billing checkout for tenants to scan')}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            borderRadius: 6,
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <MdCloudUpload size={14} />
                          <span>{tr('ផ្លាស់ប្តូររូប', 'Change')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveQr}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            borderRadius: 6,
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <MdDeleteOutline size={14} />
                          <span>{tr('លុបចេញ', 'Remove')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: 12,
                      padding: '20px 24px',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      transition: 'all 0.15s',
                      flex: 1,
                      minWidth: 260,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563eb';
                      e.currentTarget.style.background = '#eff6ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                      <MdCloudUpload size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {qrUploading ? tr('កំពុងផ្ទុកឡើង...', 'Uploading...') : tr('ចុចទីនេះដើម្បី Upload រូបភាព QR Code / KHQR', 'Click to upload QR Code image')}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                        {tr('គាំទ្ររូបភាព PNG, JPG, WebP (ទំហំអតិបរមា 5MB)', 'Supports PNG, JPG, WebP (Max 5MB)')}
                      </div>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQrFile}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Direct URL input fallback */}
              <div style={{ marginTop: 8 }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: 12 }}
                  placeholder={tr('ឬបញ្ចូលតំណភ្ជាប់ URL រូបភាព QR Code (https://...)', 'Or enter direct image URL (https://...)')}
                  value={formData.qrCodeUrl}
                  onChange={(e) => setFormData({ ...formData, qrCodeUrl: e.target.value })}
                />
              </div>
            </div>

            {/* Row 5: Customer Instructions */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">
                {tr('ការណែនាំសម្រាប់អតិថិជន (Customer Instructions)', 'Customer Instructions')}
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder={tr('សូមផ្ទេរប្រាក់ទៅកាន់គណនីខាងលើ រួចបញ្ចូលលេខប្រតិបត្តិការ (Transaction ID)...', 'Please transfer to the bank account and enter your Transaction ID...')}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              />
            </div>

            {/* Row 6: Admin Approval Setting */}
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={formData.requiresApproval}
                  onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                  style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#2563eb' }}
                />
                <span>{tr('តម្រូវឱ្យមានការអនុម័តពី Admin SAAS (Requires Admin Approval)', 'Requires Admin SaaS Approval')}</span>
              </label>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 27, marginTop: 2 }}>
                {tr('ប្រសិនបើបើក ការទូទាត់របស់ក្រុមហ៊ុននឹងស្ថិតក្នុងស្ថានភាពរង់ចាំពិនិត្យរហូតដល់ Admin អនុម័ត', 'Tenant offline payments will wait in pending queue until approved by SaaS Admin')}
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <Link
                href="/admin/saas/payment-options"
                className="btn btn-cancel"
                style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
              >
                {tr('បោះបង់', 'Cancel')}
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
              >
                {saving ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('រក្សាទុក', 'Save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SaasMasterLayout>
  );
}
