'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdArrowBack,
  MdSearch,
  MdLocationOn,
  MdPhone,
  MdPerson,
  MdLocalShipping
} from 'react-icons/md';
import Badge from '@/components/ui/Badge';

const ordersTranslations = {
  en: {
    title: 'My Shipments',
    tabAll: 'All',
    tabTransit: 'In Transit',
    tabDelivered: 'Completed',
    tabProblem: 'Problem',
    searchPlaceholder: 'Search phone or tracking...',
    loading: 'Loading shipments...',
    noOrders: 'No shipments found',
    receiver: 'Receiver',
    cod: 'COD',
    fee: 'Fee',
    driver: 'Driver',
    noDriver: 'Not assigned yet',
    note: 'Note',
  },
  km: {
    title: 'បញ្ជីកញ្ចប់អីវ៉ាន់',
    tabAll: 'ទាំងអស់',
    tabTransit: 'កំពុងដឹកជញ្ជូន',
    tabDelivered: 'បានដឹកចប់',
    tabProblem: 'មានបញ្ហា',
    searchPlaceholder: 'ស្វែងរកលេខទូរស័ព្ទ ឬកូដ تعقب...',
    loading: 'កំពុងផ្ទុកបញ្ជីអីវ៉ាន់...',
    noOrders: 'មិនមានកញ្ចប់អីវ៉ាន់ឡើយ',
    receiver: 'អ្នកទទួល',
    cod: 'ប្រាក់ COD',
    fee: 'ថ្លៃដឹក',
    driver: 'អ្នកដឹកជញ្ជូន',
    noDriver: 'មិនទាន់មានការចាត់តាំង',
    note: 'ចំណាំ',
  }
};

export default function MerchantOrdersPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'transit' | 'delivered' | 'problem'>('all');

  const t = ordersTranslations[lang] || ordersTranslations['en'];

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/merchant/login');
      return;
    }

    const loadOrders = async () => {
      setLoading(true);
      try {
        const res = await api.get('/mobile/merchant/orders');
        setOrders(res.data);
      } catch (err) {
        console.error('Failed to load merchant orders', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [router]);

  const getFilteredOrders = () => {
    return orders.filter(order => {
      // 1. Filter by Search
      const searchStr = search.toLowerCase();
      const matchesSearch =
        order.trackingCode?.toLowerCase().includes(searchStr) ||
        order.receiverPhone?.includes(searchStr) ||
        order.receiverName?.toLowerCase().includes(searchStr);

      if (!matchesSearch) return false;

      // 2. Filter by Tab
      const s = order.status;
      if (activeTab === 'transit') {
        return s === 'pending' || s === 'assigned' || s === 'picked-up' || s === 'in-transit';
      } else if (activeTab === 'delivered') {
        return s === 'delivered';
      } else if (activeTab === 'problem') {
        return s === 'failed' || s === 'returned' || s === 'problem' || s === 'rejected';
      }
      return true; // 'all' tab
    });
  };

  const filteredOrders = getFilteredOrders();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      flex: 1
    }}>
      {/* Header */}
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
          onClick={() => router.push('/merchant/dashboard')}
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

      {/* Search Input Box */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <MdSearch style={{
            position: 'absolute',
            left: '14px',
            color: '#94a3b8',
            fontSize: '20px'
          }} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#f1f5f9',
              border: 'none',
              padding: '10px 12px 10px 42px',
              borderRadius: '12px',
              fontSize: '13.5px',
              fontWeight: '500',
              color: '#0f172a',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 4px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'all', label: t.tabAll },
          { id: 'transit', label: t.tabTransit },
          { id: 'delivered', label: t.tabDelivered },
          { id: 'problem', label: t.tabProblem }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '14px 4px',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.id ? '#10b981' : '#64748b',
              fontWeight: '700',
              fontSize: '13px',
              borderBottom: activeTab === tab.id ? '3px solid #10b981' : '3px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List content */}
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
              border: '3px solid rgba(16, 185, 129, 0.1)',
              borderTopColor: '#10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '12px'
            }} />
            <span style={{ fontSize: '13px', color: '#64748b' }}>{t.loading}</span>
            <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: '#0f172a', margin: '0' }}>
              {t.noOrders}
            </h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredOrders.map((order) => (
              <div key={order.id} style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '18px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Header: Tracking Code and Status */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <span style={{
                    fontSize: '12.5px',
                    fontWeight: '700',
                    color: '#047857',
                    backgroundColor: '#ecfdf5',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontFamily: 'monospace'
                  }}>
                    {order.trackingCode}
                  </span>
                  <Badge status={order.status} />
                </div>

                {/* Receiver Info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <MdPerson size={18} style={{ color: '#64748b', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '13.5px', color: '#0f172a' }}>
                    <div style={{ fontWeight: '700' }}>{order.receiverName}</div>
                    <a href={`tel:${order.receiverPhone}`} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#10b981',
                      textDecoration: 'none',
                      fontWeight: '600',
                      margin: '4px 0'
                    }}>
                      <MdPhone size={14} /> {order.receiverPhone}
                    </a>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '4px',
                      color: '#64748b',
                      fontSize: '12px',
                      lineHeight: '1.4'
                    }}>
                      <MdLocationOn size={16} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '1px' }} />
                      <span>{order.receiverAddress} {order.zone ? `(${order.zone.name})` : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Finances (COD, Fee) */}
                <div style={{
                  display: 'flex',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600' }}>{t.cod}</span>
                    <div style={{ fontSize: '14.5px', fontWeight: '800', color: Number(order.cod) > 0 ? '#f16222' : '#64748b', marginTop: '1px' }}>
                      {order.codCurrency === 'KHR'
                        ? `${Number(order.cod).toLocaleString()} ៛`
                        : `$${parseFloat(order.cod).toFixed(2)}`}
                    </div>
                  </div>
                  <div style={{ width: '1px', backgroundColor: '#e2e8f0' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600' }}>{t.fee}</span>
                    <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', marginTop: '1px' }}>
                      ${parseFloat(order.deliveryFee).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Note */}
                {order.note && (
                  <div style={{
                    fontSize: '12px',
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    lineHeight: '1.4'
                  }}>
                    <strong>{t.note}:</strong> {order.note}
                  </div>
                )}

                {/* Driver Info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#64748b',
                  borderTop: '1px dashed #e2e8f0',
                  paddingTop: '10px'
                }}>
                  <MdLocalShipping size={16} />
                  <span>
                    {t.driver}: <strong>{order.driver ? order.driver.name : t.noDriver}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
