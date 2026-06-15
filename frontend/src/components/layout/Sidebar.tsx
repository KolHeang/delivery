'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getUser, clearAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdDashboard, MdStorefront, MdPeople, MdLocalShipping,
  MdAccountBalanceWallet, MdReceipt, MdSettings,
  MdKeyboardArrowDown, MdKeyboardArrowUp, MdBarChart,
} from 'react-icons/md';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);

  const menuGroups = [
    {
      key: 'summary',
      label: t('summaryMenu'),
      icon: MdBarChart,
      items: [
        { href: '/summary/shop', label: t('shopSummary') },
        { href: '/summary/delivery', label: t('deliverySummary') },
        { href: '/summary/pickup', label: t('pickupSummary') },
      ],
    },
    {
      key: 'delivery',
      label: t('manageDelivery'),
      icon: MdLocalShipping,
      items: [
        { href: '/delivery/entry_data_item', label: t('batchEntryData') },
        { href: '/delivery', label: t('listOfDelivery') },
        { href: '/delivery/list_print_qrcode', label: t('printInvoiceDelivery') },
        { href: '/delivery/assigndeliveryby', label: t('processForAssign') },
        { href: '/delivery/complete', label: t('completePackage') },
        { href: '/delivery/tracking_delivery', label: t('tracking') },
      ],
    },
    {
      key: 'shops',
      label: t('manageShops'),
      icon: MdStorefront,
      items: [
        { href: '/client', label: t('shopList') },
        { href: '/client/create', label: t('createShop') },
      ],
    },
    {
      key: 'staff',
      label: t('manageStaff') || 'Manage Staff',
      icon: MdPeople,
      items: [
        { href: '/staff', label: t('staffList') || 'List Staff' },
        { href: '/staff/create', label: t('createStaff') || 'Create Staff' },
      ],
    },
    {
      key: 'payment',
      label: t('paymentProcess'),
      icon: MdAccountBalanceWallet,
      items: [
        { href: '/payment/staff', label: t('paymentWithDelivery') || 'Payment with Delivery' },
        { href: '/payment/shop', label: t('paymentWithShop') },
      ],
    },
    {
      key: 'accounting',
      label: t('accounting'),
      icon: MdReceipt,
      items: [
        { href: '/expense/create', label: t('addExpense') },
        { href: '/expense', label: t('expenseList') },
        { href: '/income/create', label: t('addIncome') },
        { href: '/income', label: t('incomeList') },
        { href: '/income/type', label: t('typeOfIncome') },
        { href: '/expense/type', label: t('typeOfExpense') },
      ],
    },
    {
      key: 'reports',
      label: t('report'),
      icon: MdBarChart,
      items: [
        { href: '/report/financial', label: t('financialReport') },
        { href: '/report/operation', label: t('operationReport') },
      ],
    },
    {
      key: 'settings',
      label: t('settings'),
      icon: MdSettings,
      items: [
        { href: '/setting/zone_type', label: t('zoneType') },
        { href: '/setting/role', label: t('permission') },
        { href: '/setting/organisation', label: t('organizationSetting') },
        { href: '/setting/general', label: t('generalSettings') },
      ],
    },
  ];

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    shops: true,
    delivery: true,
    payment: true,
    accounting: true,
    reports: true,
    settings: true,
  });

  // Load user client-side and set up listeners
  useEffect(() => {
    setUser(getUser());

    const handleUserUpdate = () => {
      setUser(getUser());
    };
    window.addEventListener('storage', handleUserUpdate);
    window.addEventListener('user-updated', handleUserUpdate);

    return () => {
      window.removeEventListener('storage', handleUserUpdate);
      window.removeEventListener('user-updated', handleUserUpdate);
    };
  }, []);

  // Auto-expand active group on load
  useEffect(() => {
    const activeGroup = menuGroups.find(group =>
      group.items.some(item => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
    );
    if (activeGroup) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.key]: true }));
    }
  }, [pathname]);

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="sidebar" style={{ width: 260 }}>
      {/* Brand Logo */}
      <div className="sidebar-logo" style={{ height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg, var(--accent), #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 22, boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          flexShrink: 0
        }}>
          📦
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '0.5px', lineHeight: 1.1 }}>EBS<span style={{ color: '#93c5fd' }}>Express</span></span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginTop: 2, letterSpacing: '0.2px' }}>Delivery System</span>
        </div>
      </div>

      {/* Navigation list */}
      <div className="sidebar-nav" style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {/* Dashboard Link */}
        <Link
          href="/dashboard"
          className={`sidebar-item ${pathname === '/dashboard' ? 'active' : ''}`}
          style={{ marginBottom: 4 }}
        >
          <span className="sidebar-item-icon"><MdDashboard size={18} /></span>
          {t('dashboard')}
        </Link>


        {menuGroups.map(group => {
          const Icon = group.icon;
          const isOpen = openGroups[group.key];
          const isGroupActive = group.items.some(item =>
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          );

          return (
            <div key={group.key} style={{ marginBottom: 8 }}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className="sidebar-item"
                style={{
                  justifyContent: 'space-between',
                  background: isGroupActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                  color: isGroupActive ? '#fff' : 'var(--sidebar-text)',
                  fontWeight: 600,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="sidebar-item-icon"><Icon size={18} /></span>
                  {group.label}
                </div>
                {isOpen ? <MdKeyboardArrowUp size={16} /> : <MdKeyboardArrowDown size={16} />}
              </button>

              {/* Group Sub-items */}
              {isOpen && (
                <div style={{ paddingLeft: 24, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {group.items.map(item => {
                    const exactActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-item ${exactActive ? 'active' : ''}`}
                        style={{
                          fontSize: '13.5px',
                          padding: '8px 12px',
                          opacity: exactActive ? 1 : 0.85,
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </aside>
  );
}
