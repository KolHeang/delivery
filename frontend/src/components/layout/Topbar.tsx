'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth, User } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import api from '@/lib/api';
import {
  MdNotifications,
  MdDoneAll,
  MdCheckCircle,
  MdLocalShipping,
  MdAccountBalanceWallet,
  MdErrorOutline,
  MdAccessTime,
  MdPerson,
  MdLogout,
  MdKeyboardArrowDown,
  MdInventory,
  MdOpenInNew,
  MdClose,
  MdVolumeUp,
} from 'react-icons/md';
import { FlagKm, FlagEn } from '@/components/ui/Flags';
import Badge from '@/components/ui/Badge';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export interface WebNotification {
  id: number;
  tenantId?: number;
  userId?: number;
  title: string;
  titleKh?: string;
  body: string;
  bodyKh?: string;
  type: string;
  targetType?: string;
  targetId?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();
  const isKh = lang === 'km';

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<WebNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifLoading, setNotifLoading] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  // Floating Toast Alert state
  const [activeToast, setActiveToast] = useState<WebNotification | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  // Native Web Audio Synthesized Chime (Ding-Dong!)
  const playNotificationChime = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5) - gentle bell chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Note 2: 880 Hz (A5) - clear high harmonic
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.22, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.9);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  // Trigger floating alert banner
  const triggerAlert = useCallback(
    (notif: WebNotification) => {
      setActiveToast(notif);
      playNotificationChime();

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setActiveToast(null);
      }, 7000);

      // Also trigger native desktop notification if user allowed
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(isKh ? notif.titleKh || notif.title : notif.title, {
            body: isKh ? notif.bodyKh || notif.body : notif.body,
            icon: '/icon.svg',
          });
        }
      }
    },
    [isKh, playNotificationChime],
  );

  // Sync user state
  useEffect(() => {
    setUser(getUser());

    const handleStorage = () => {
      setUser(getUser());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('user-updated', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('user-updated', handleStorage);
    };
  }, []);

  // Fetch unread notifications count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res: any = await api.get('/notifications/unread-count');
      const count = res?.data?.unreadCount ?? res?.unreadCount ?? 0;
      setUnreadCount(Number(count) || 0);
    } catch {
      // Ignore silently if network/offline
    }
  }, []);

  // Fetch notifications list
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res: any = await api.get('/notifications?page=1&limit=25');
      const data = res?.data || res || {};
      const items: WebNotification[] = data.items || [];
      const count = data.unreadCount ?? 0;
      setNotifications(items);
      setUnreadCount(Number(count) || 0);
    } catch (e) {
      console.warn('Failed to load notifications', e);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // Connect to Real-time SSE stream for live alerts
  useEffect(() => {
    fetchUnreadCount();

    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'https://new-delivery-api.rithyboth.work/api';
    const sseUrl = `${baseUrl.replace(/\/$/, '')}/notifications/realtime`;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'notification' && payload?.notification) {
            const newNotif: WebNotification = payload.notification;
            setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
            setUnreadCount((prev) => prev + 1);
            triggerAlert(newNotif);
          }
        } catch {
          // heartbeat ping or parsing error
        }
      };

      eventSource.onerror = () => {
        // Fallback to polling if SSE drops
      };
    } catch {
      // EventSource not supported
    }

    // Polling unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [fetchUnreadCount, triggerAlert]);

  // Request browser desktop notification permission on first interaction
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifContainerRef.current && !notifContainerRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setNotifOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleToggleNotifications = () => {
    const nextState = !notifOpen;
    setNotifOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (item: WebNotification) => {
    if (!item.isRead) {
      try {
        await api.patch(`/notifications/${item.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {
        console.warn('Failed to mark notification read', e);
      }
    }

    if (item.link) {
      setNotifOpen(false);
      setActiveToast(null);
      router.push(item.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.warn('Failed to mark all read', e);
    }
  };

  const handleTestAlert = () => {
    const demoAlert: WebNotification = {
      id: Date.now(),
      title: 'New Delivery Order #DEMO8899',
      titleKh: 'ការកុម្ម៉ង់ដឹកជញ្ជូនថ្មី #DEMO8899',
      body: 'Customer placed order: 2 parcels ($45.00 COD). Rider assigned!',
      bodyKh: 'អតិថិជនបានកុម្ម៉ង់ដឹក៖ ២ កញ្ចប់ (ប្រាក់ COD: $45.00)។ បានចាត់អ្នកដឹក!',
      type: 'order',
      targetType: 'parcel',
      targetId: 'DEMO8899',
      link: '/delivery',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    triggerAlert(demoAlert);
    setNotifications((prev) => [demoAlert, ...prev]);
    setUnreadCount((prev) => prev + 1);
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60) return isKh ? 'មុននេះបន្តិច' : 'Just now';
      const mins = Math.floor(diff / 60);
      if (mins < 60) return isKh ? `${mins} នាទីមុន` : `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return isKh ? `${hours} ម៉ោងមុន` : `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return isKh ? `${days} ថ្ងៃមុន` : `${days}d ago`;
    } catch {
      return '';
    }
  };

  const getTypeMeta = (type: string) => {
    switch (type) {
      case 'pickup':
        return {
          icon: <MdLocalShipping size={16} />,
          bg: '#FEF3C7',
          color: '#D97706',
          label: isKh ? 'ប្រមូលអីវ៉ាន់' : 'Pickup',
        };
      case 'delivery':
        return {
          icon: <MdCheckCircle size={16} />,
          bg: '#D1FAE5',
          color: '#059669',
          label: isKh ? 'ដឹកជញ្ជូន' : 'Delivery',
        };
      case 'settlement':
        return {
          icon: <MdAccountBalanceWallet size={16} />,
          bg: '#EDE9FE',
          color: '#7C3AED',
          label: isKh ? 'ទូទាត់ប្រាក់' : 'Settlement',
        };
      case 'problem':
        return {
          icon: <MdErrorOutline size={16} />,
          bg: '#FEE2E2',
          color: '#DC2626',
          label: isKh ? 'បញ្ហា' : 'Issue',
        };
      case 'order':
      default:
        return {
          icon: <MdInventory size={16} />,
          bg: '#DBEAFE',
          color: '#2563EB',
          label: isKh ? 'កញ្ចប់អីវ៉ាន់' : 'Order',
        };
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    notifTab === 'unread' ? !n.isRead : true,
  );

  return (
    <>
      {/* ============================================================
          1. REAL-TIME FLOATING TOAST ALERT (Top-Right Popup Banner)
          ============================================================ */}
      {activeToast && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: 86,
            right: 24,
            zIndex: 9999,
            width: 380,
            maxWidth: 'calc(100vw - 32px)',
            background: '#ffffff',
            border: '2px solid var(--accent, #1565D8)',
            borderRadius: 16,
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.3), 0 4px 12px rgba(37, 99, 235, 0.2)',
            padding: '14px 16px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Category Icon */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: getTypeMeta(activeToast.type).bg,
              color: getTypeMeta(activeToast.type).color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {getTypeMeta(activeToast.type).icon}
          </div>

          {/* Toast Message Body */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>
                {isKh ? activeToast.titleKh || activeToast.title : activeToast.title}
              </span>
              <button
                onClick={() => setActiveToast(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Close"
              >
                <MdClose size={16} />
              </button>
            </div>
            <p
              style={{
                margin: '3px 0 0',
                fontSize: 12,
                color: '#475569',
                lineHeight: 1.4,
              }}
            >
              {isKh ? activeToast.bodyKh || activeToast.body : activeToast.body}
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
                paddingTop: 6,
                borderTop: '1px solid #F1F5F9',
              }}
            >
              <span style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 3 }}>
                <MdVolumeUp size={13} color="var(--accent, #1565D8)" />
                {isKh ? 'សំឡេង Alert 🔔' : 'Live Alert 🔔'}
              </span>
              {activeToast.link && (
                <button
                  onClick={() => handleMarkAsRead(activeToast)}
                  style={{
                    background: 'var(--accent, #1565D8)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '3px 10px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  {isKh ? 'ពិនិត្យមើល' : 'View'}
                  <MdOpenInNew size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          2. MASTER BLUE TOPBAR
          ============================================================ */}
      <header className="topbar">
        <div />
        <div className="topbar-actions">
          {/* Notification Bell Button & Interactive Dropdown */}
          <div className="profile-dropdown-container" ref={notifContainerRef} style={{ position: 'relative' }}>
            <button
              className="topbar-btn"
              title={isKh ? 'ការជូនដំណឹង (Notifications)' : 'Notifications'}
              onClick={handleToggleNotifications}
              aria-label="Notifications"
              style={{ position: 'relative' }}
            >
              <MdNotifications size={18} />
              {unreadCount > 0 && <span className="notification-dot" />}
            </button>

            {notifOpen && (
              <div
                className="profile-dropdown-menu"
                style={{
                  width: 390,
                  maxWidth: '92vw',
                  right: 0,
                  top: '100%',
                  marginTop: 8,
                  padding: 0,
                  boxShadow: '0 20px 35px -10px rgba(0,0,0,0.22), 0 10px 15px -5px rgba(0,0,0,0.08)',
                  background: '#ffffff',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  overflow: 'hidden',
                  zIndex: 2000,
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#F8FAFC',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>
                      {isKh ? 'ការជូនដំណឹង' : 'Notifications'}
                    </span>
                    {unreadCount > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: '#EF4444',
                          color: '#ffffff',
                          borderRadius: 20,
                          padding: '1px 7px',
                        }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={handleTestAlert}
                      title="Test Audio Chime & Popup Alert"
                      style={{
                        background: 'rgba(37, 99, 235, 0.08)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        borderRadius: 6,
                        color: '#2563EB',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '2px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <MdVolumeUp size={13} />
                      {isKh ? 'តេស្ត Alert' : 'Test Alert'}
                    </button>

                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563EB',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: 0,
                        }}
                      >
                        <MdDoneAll size={15} />
                        {isKh ? 'អានទាំងអស់' : 'Mark all read'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div
                  style={{
                    display: 'flex',
                    padding: '8px 16px',
                    gap: 8,
                    borderBottom: '1px solid #F1F5F9',
                    background: '#ffffff',
                  }}
                >
                  <button
                    onClick={() => setNotifTab('all')}
                    style={{
                      background: notifTab === 'all' ? 'var(--accent, #1565D8)' : 'transparent',
                      color: notifTab === 'all' ? '#ffffff' : '#64748B',
                      border: 'none',
                      borderRadius: 8,
                      padding: '4px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isKh ? 'ទាំងអស់' : 'All'} ({notifications.length})
                  </button>
                  <button
                    onClick={() => setNotifTab('unread')}
                    style={{
                      background: notifTab === 'unread' ? 'var(--accent, #1565D8)' : 'transparent',
                      color: notifTab === 'unread' ? '#ffffff' : '#64748B',
                      border: 'none',
                      borderRadius: 8,
                      padding: '4px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isKh ? 'មិនទាន់អាន' : 'Unread'} ({unreadCount})
                  </button>
                </div>

                {/* Notification List Body */}
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {notifLoading ? (
                    <div style={{ padding: 30, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                      {isKh ? 'កំពុងផ្ទុកការជូនដំណឹង...' : 'Loading notifications...'}
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                      <MdNotifications size={36} color="#CBD5E1" style={{ marginBottom: 8 }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>
                        {isKh ? 'គ្មានការជូនដំណឹងថ្មីទេ' : 'No notifications'}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>
                        {isKh ? 'អ្នកបានពិនិត្យមើលគ្រប់ការជូនដំណឹងរួចរាល់' : "You're all caught up!"}
                      </div>
                    </div>
                  ) : (
                    filteredNotifications.map((item) => {
                      const meta = getTypeMeta(item.type);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleMarkAsRead(item)}
                          style={{
                            padding: '12px 16px',
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                            borderBottom: '1px solid #F8FAFC',
                            background: item.isRead ? '#ffffff' : '#F0F7FF',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = item.isRead ? '#ffffff' : '#F0F7FF')
                          }
                        >
                          {/* Category Icon Badge */}
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 10,
                              background: meta.bg,
                              color: meta.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            {meta.icon}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 6,
                                marginBottom: 2,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: item.isRead ? 600 : 800,
                                  color: '#1E293B',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {isKh ? item.titleKh || item.title : item.title}
                              </span>
                              {!item.isRead && (
                                <span
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background: 'var(--accent, #1565D8)',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                                color: '#475569',
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {isKh ? item.bodyKh || item.body : item.body}
                            </p>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginTop: 4,
                                fontSize: 11,
                                color: '#94A3B8',
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <MdAccessTime size={12} />
                                {formatTimeAgo(item.createdAt)}
                              </span>
                              {item.link && (
                                <span
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    color: '#2563EB',
                                    fontWeight: 600,
                                  }}
                                >
                                  {isKh ? 'មើល' : 'View'}
                                  <MdOpenInNew size={11} />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Language Toggle */}
          <button
            title="Switch Language"
            onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.02em',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              borderRadius: 10,
              padding: '0 12px',
              height: 36,
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
            }}
          >
            {lang === 'km' ? (
              <>
                <FlagKm size={20} />
                <span>ខ្មែរ</span>
              </>
            ) : (
              <>
                <FlagEn size={20} />
                <span>EN</span>
              </>
            )}
          </button>

          {user && (
            <div className="profile-dropdown-container" ref={containerRef}>
              <button
                className="profile-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <div
                  className="profile-trigger-avatar"
                  style={{
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {user.photo ? (
                    <img
                      src={user.photo}
                      alt={user.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : user.name ? (
                    user.name.charAt(0).toUpperCase()
                  ) : (
                    '?'
                  )}
                </div>
                <span className="profile-trigger-name">{user.name}</span>
                <MdKeyboardArrowDown
                  size={18}
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    transition: 'transform 0.2s ease',
                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {dropdownOpen && (
                <div className="profile-dropdown-menu">
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-header-name">{user.name}</div>
                    <div className="profile-dropdown-header-email">{user.email}</div>
                    <div className="profile-dropdown-header-role">
                      <Badge status={user.role} />
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    className="profile-dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <MdPerson size={16} />
                    {t('myProfile')}
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="profile-dropdown-item profile-dropdown-item-danger"
                  >
                    <MdLogout size={16} />
                    {t('logout')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      {title ? (
        <div className="page-header-container">
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div className="page-header-left">
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
