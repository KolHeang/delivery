'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdCall,
  MdLocationOn,
  MdCheckCircle,
  MdError,
  MdLocalShipping,
  MdArrowBack,
  MdInfoOutline
} from 'react-icons/md';
import Badge from '@/components/ui/Badge';

const taskTranslations = {
  en: {
    title: 'My Tasks',
    activeTab: 'Active Tasks',
    completedTab: 'Completed Tasks',
    noTasks: 'No tasks found',
    loading: 'Loading tasks...',
    cod: 'COD',
    fee: 'Fee',
    note: 'Note',
    btnPickup: 'Start Pick Up',
    btnDeliver: 'Mark Delivered',
    btnProblem: 'Report Problem',
    btnInTransit: 'Start Delivery',
    updating: 'Updating...',
    dialogTitle: 'Select Status',
    dialogDesc: 'Please choose the status update for this parcel:',
    btnFailed: 'Delivery Failed',
    btnReturned: 'Return Package',
    btnCancel: 'Cancel',
    customer: 'Customer',
    merchant: 'Merchant',
  },
  km: {
    title: 'ភារកិច្ចរបស់ខ្ញុំ',
    activeTab: 'ភារកិច្ចកំពុងដំណើរការ',
    completedTab: 'ភារកិច្ចរួចរាល់',
    noTasks: 'មិនមានភារកិច្ចឡើយ',
    loading: 'កំពុងផ្ទុកភារកិច្ច...',
    cod: 'ប្រាក់ COD',
    fee: 'ថ្លៃដឹក',
    note: 'ចំណាំ',
    btnPickup: 'ចាប់ផ្តើមទទួលអីវ៉ាន់',
    btnDeliver: 'បានដឹកជញ្ជូនជោគជ័យ',
    btnProblem: 'រាយការណ៍បញ្ហា',
    btnInTransit: 'ចាប់ផ្ដើមដឹកជញ្ជូន',
    updating: 'កំពុងធ្វើបច្ចុប្បន្នភាព...',
    dialogTitle: 'ជ្រើសរើសស្ថានភាព',
    dialogDesc: 'សូមជ្រើសរើសការផ្លាស់ប្តូរស្ថានភាពកញ្ចប់អីវ៉ាន់នេះ៖',
    btnFailed: 'ដឹកជញ្ជូនមិនបានសម្រេច',
    btnReturned: 'ប្រគល់អីវ៉ាន់ត្រឡប់មកវិញ',
    btnCancel: 'បោះបង់',
    customer: 'អតិថិជន',
    merchant: 'ហាង/អ្នកផ្ញើ',
  }
};

export default function DriverTasksPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  // Problem Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const t = taskTranslations[lang] || taskTranslations['en'];

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/mobile/driver/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to load driver tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/driver/login');
      return;
    }
    loadTasks();
  }, [router]);

  const updateStatus = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    setShowDialog(false);
    try {
      await api.patch(`/mobile/driver/tasks/${id}/status`, { status: newStatus });
      // Reload task list
      const res = await api.get('/mobile/driver/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to update task status', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const isActiveTask = (task: any) => {
    const s = task.status;
    return s === 'assigned' || s === 'picked-up' || s === 'pending' || s === 'in-transit';
  };

  const isCompletedTask = (task: any) => {
    const s = task.status;
    return s === 'delivered' || s === 'failed' || s === 'returned' || s === 'problem' || s === 'rejected';
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'active') {
      return isActiveTask(task);
    } else {
      return isCompletedTask(task);
    }
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      flex: 1
    }}>
      {/* Top Header */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button
          onClick={() => router.push('/driver/dashboard')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#0f172a',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16px'
          }}
        >
          <MdArrowBack size={24} />
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
          {t.title}
        </h2>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 8px'
      }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            flex: 1,
            padding: '16px 8px',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'active' ? '#2f55a5' : '#64748b',
            fontWeight: '700',
            fontSize: '13.5px',
            borderBottom: activeTab === 'active' ? '3px solid #2f55a5' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {t.activeTab}
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          style={{
            flex: 1,
            padding: '16px 8px',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'completed' ? '#2f55a5' : '#64748b',
            fontWeight: '700',
            fontSize: '13.5px',
            borderBottom: activeTab === 'completed' ? '3px solid #2f55a5' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {t.completedTab}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 0',
            flex: 1
          }}>
            <div className="spinner" style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(47, 85, 165, 0.1)',
              borderTopColor: '#2f55a5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '12px'
            }} />
            <span style={{ fontSize: '13px', color: '#64748b' }}>{t.loading}</span>
            <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px' }}>
              {t.noTasks}
            </h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredTasks.map((task) => (
              <div key={task.id} style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}>
                {/* Task Header: Tracking Code and Status */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px'
                }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#2f55a5',
                    backgroundColor: '#eef2fa',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontFamily: 'monospace'
                  }}>
                    {task.trackingCode}
                  </span>
                  <Badge status={task.status} />
                </div>

                {/* Sender/Merchant Details */}
                {task.merchant && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginBottom: '10px',
                    fontSize: '13px',
                    color: '#475569'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', minWidth: '70px', marginTop: '2px' }}>
                      {t.merchant}:
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{task.merchant.name}</div>
                      {task.merchant.phone && (
                        <a href={`tel:${task.merchant.phone}`} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#2f55a5',
                          textDecoration: 'none',
                          fontWeight: '600',
                          marginTop: '4px'
                        }}>
                          <MdCall size={14} /> {task.merchant.phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '8px 0 12px' }} />

                {/* Receiver / Customer details */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', minWidth: '70px', marginTop: '2px' }}>
                    {t.customer}:
                  </div>
                  <div style={{ flex: 1, fontSize: '13.5px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{task.receiverName}</div>
                    {task.receiverPhone && (
                      <a href={`tel:${task.receiverPhone}`} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#2f55a5',
                        textDecoration: 'none',
                        fontWeight: '600',
                        margin: '6px 0'
                      }}>
                        <MdCall size={14} /> {task.receiverPhone}
                      </a>
                    )}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '4px',
                      color: '#64748b',
                      fontSize: '12.5px',
                      marginTop: '4px',
                      lineHeight: '1.4'
                    }}>
                      <MdLocationOn size={16} style={{ color: '#64748b', flexShrink: 0, marginTop: '2px' }} />
                      <span>{task.receiverAddress} {task.zone ? `(${task.zone.name})` : ''}</span>
                    </div>
                  </div>
                </div>

                {/* COD and Delivery Fee info */}
                <div style={{
                  display: 'flex',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '12px',
                  gap: '16px',
                  marginBottom: '14px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.cod}</div>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: Number(task.cod) > 0 ? '#f16222' : '#64748b',
                      marginTop: '2px'
                    }}>
                      {task.codCurrency === 'KHR'
                        ? `${(Number(task.cod) || 0).toLocaleString()} ៛`
                        : `$${(Number(task.cod) || 0).toFixed(2)}`}
                    </div>
                  </div>
                  <div style={{ width: '1px', backgroundColor: '#e2e8f0' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.fee}</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                      ${(Number(task.deliveryFee) || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Note */}
                {task.note && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <MdInfoOutline size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                    <span><strong>{t.note}:</strong> {task.note}</span>
                  </div>
                )}

                {/* Action Buttons */}
                {isActiveTask(task) && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    {task.status === 'assigned' && (
                      <button
                        onClick={() => updateStatus(task.id, 'picked-up')}
                        disabled={updatingId === task.id}
                        style={{
                          flex: 1,
                          background: '#2f55a5',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px',
                          borderRadius: '12px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 6px rgba(47, 85, 165, 0.1)'
                        }}
                      >
                        <MdLocalShipping size={18} />
                        {updatingId === task.id ? t.updating : t.btnPickup}
                      </button>
                    )}

                    {task.status === 'picked-up' && (
                      <button
                        onClick={() => updateStatus(task.id, 'in-transit')}
                        disabled={updatingId === task.id}
                        style={{
                          flex: 1,
                          background: '#e2e8f0',
                          color: '#0f172a',
                          border: '1.5px solid #cbd5e1',
                          padding: '12px',
                          borderRadius: '12px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <MdLocalShipping size={18} style={{ color: '#2f55a5' }} />
                        {updatingId === task.id ? t.updating : t.btnInTransit}
                      </button>
                    )}

                    {(task.status === 'in-transit' || task.status === 'pending') && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setShowDialog(true);
                          }}
                          disabled={updatingId === task.id}
                          style={{
                            background: '#ffffff',
                            color: '#ef4444',
                            border: '1.5px solid #fecaca',
                            padding: '12px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <MdError size={18} />
                          {t.btnProblem}
                        </button>
                        <button
                          onClick={() => updateStatus(task.id, 'delivered')}
                          disabled={updatingId === task.id}
                          style={{
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            flex: 1.2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 6px rgba(16, 185, 129, 0.1)'
                          }}
                        >
                          <MdCheckCircle size={18} />
                          {updatingId === task.id ? t.updating : t.btnDeliver}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Problem Modal Dialog */}
      {showDialog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '360px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
              {t.dialogTitle}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: '1.5' }}>
              {t.dialogDesc}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => selectedTaskId && updateStatus(selectedTaskId, 'failed')}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {t.btnFailed}
              </button>
              <button
                onClick={() => selectedTaskId && updateStatus(selectedTaskId, 'returned')}
                style={{
                  background: '#6b7280',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {t.btnReturned}
              </button>
              <button
                onClick={() => {
                  setShowDialog(false);
                  setSelectedTaskId(null);
                }}
                style={{
                  background: 'transparent',
                  color: '#475569',
                  border: '1.5px solid #cbd5e1',
                  padding: '11px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                {t.btnCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
