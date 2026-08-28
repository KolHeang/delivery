'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUser, hasPermission } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { useTenant } from '@/lib/TenantContext';
import { saasApi } from '@/lib/saas-api';
import {
  MdDashboard, MdStorefront, MdPeople, MdLocalShipping,
  MdAccountBalanceWallet, MdReceipt, MdSettings,
  MdKeyboardArrowDown, MdKeyboardArrowUp, MdBarChart,
  MdWorkspacePremium,
} from 'react-icons/md';

export default function Sidebar() {
  const pathname = usePathname();
  const { t, lang } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const menuGroups = [
    {
      key: 'summary',
      label: t('summaryMenu'),
      icon: MdBarChart,
      permission: 'reports.view',
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
      permission: 'orders.read',
      items: [
        { href: '/delivery/entry_data_item', label: t('batchEntryData'), permission: 'orders.create' },
        { href: '/delivery', label: t('listOfDelivery') },
        { href: '/delivery/print_invoice', label: t('printInvoiceDelivery') },
        { href: '/delivery/pickup_requests', label: t('pickupRequests'), permission: 'orders.read' },
        // { href: '/delivery/assignpickup', label: t('processForPickup'), permission: 'orders.update' },
        { href: '/delivery/assigndeliveryby', label: t('processForAssign'), permission: 'orders.update' },
        { href: '/delivery/complete', label: t('completePackage'), permission: 'orders.update' },
        { href: '/delivery/tracking_delivery', label: t('tracking') },
      ],
    },

    {
      key: 'shops',
      label: t('manageShops'),
      icon: MdStorefront,
      permission: 'merchants.read',
      items: [
        { href: '/merchants', label: t('shopList') },
      ],
    },
    {
      key: 'staff',
      label: t('manageStaff') || 'Manage Staff',
      icon: MdPeople,
      permission: 'users.read',
      items: [
        { href: '/user', label: t('staffList') || 'List Staff' },
      ],
    },
    {
      key: 'payment',
      label: t('paymentProcess'),
      icon: MdAccountBalanceWallet,
      permission: 'payments.read',
      items: [
        { href: '/payment/driver', label: t('paymentWithDelivery') || 'Payment with Delivery' },
        { href: '/payment/merchant', label: t('paymentWithShop') },
      ],
    },
    {
      key: 'accounting',
      label: t('accounting'),
      icon: MdReceipt,
      permission: 'expenses.read',
      items: [
        { href: '/expense', label: t('expenseList') },
        { href: '/income', label: t('incomeList'), permission: 'incomes.read' },
        { href: '/income/type', label: t('typeOfIncome'), permission: 'incomes.read' },
        { href: '/expense/type', label: t('typeOfExpense'), permission: 'expenses.read' },
      ],
    },
    {
      key: 'reports',
      label: t('report'),
      icon: MdBarChart,
      href: '/report',
      permission: 'reports.view',
    },
    {
      key: 'settings',
      label: t('settings'),
      icon: MdSettings,
      permission: 'settings.manage',
      items: [
        { href: '/billing', label: lang === 'km' ? 'គម្រោង & វិក្កយបត្រ' : 'Billing & Plans' },
        { href: '/setting/zone_type', label: t('zoneType'), permission: 'zones.read' },
        { href: '/setting/role', label: t('permission'), permission: 'users.manage' },
        { href: '/setting/organisation', label: t('organizationSetting') },
        { href: '/setting/general', label: t('generalSettings') },
        { href: '/setting/activity_log', label: t('activityLogs') || 'Activity Logs' },
      ],
    },
  ];

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    summary: false,
    shops: false,
    delivery: false,
    staff: false,
    payment: false,
    accounting: false,
    settings: false,
  });

  const [subscription, setSubscription] = useState<any>(null);

  // Load user client-side and set up listeners
  useEffect(() => {
    setMounted(true);
    setUser(getUser());

    const loadSubscription = async () => {
      try {
        const sub = await saasApi.getMySubscription();
        if (sub && sub.hasSubscription) {
          setSubscription(sub);
        }
      } catch (err) {
        // Ignore if not subscribed
      }
    };
    loadSubscription();

    const handleUserUpdate = () => {
      setUser(getUser());
      loadSubscription();
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
      'items' in group && group.items && group.items.some(item => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
    );
    if (activeGroup) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.key]: true }));
    }
  }, [pathname]);

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const { tenant, isTenant } = useTenant();
  const activeCompanyName = tenant?.companyName || subscription?.companyName;
  const activeSubdomain = tenant?.subdomain || subscription?.subdomain;

  return (
    <aside className="sidebar" style={{ width: 260 }}>
      {/* Brand Logo */}
      <div className="sidebar-logo" style={{ height: 76, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg, var(--accent), #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 22, boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          flexShrink: 0
        }}>
          📦
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, overflow: 'hidden' }}>
          <span style={{
            fontSize: 16,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '0.5px',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            textTransform: activeCompanyName ? 'capitalize' : 'none'
          }}>
            {activeCompanyName || (
              <>EBS<span style={{ color: '#93c5fd' }}>Express</span></>
            )}
          </span>
          <span style={{
            fontSize: 11,
            color: activeSubdomain ? '#93c5fd' : 'rgba(255,255,255,0.65)',
            fontWeight: 600,
            marginTop: 2,
            letterSpacing: '0.2px',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
          }}>
            {activeSubdomain ? `${activeSubdomain}.ebsexpress.com` : (lang === 'km' ? 'ប្រព័ន្ធដឹកជញ្ជូន' : 'Delivery System')}
          </span>
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


        {mounted && menuGroups
          .filter(group => !group.permission || hasPermission(group.permission))
          .map(group => {
            const Icon = group.icon;

            if ('href' in group && group.href) {
              const isActive = pathname === group.href || (group.href !== '/dashboard' && pathname.startsWith(group.href));
              return (
                <Link
                  key={group.key}
                  href={group.href}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  style={{ marginBottom: 8 }}
                >
                  <span className="sidebar-item-icon"><Icon size={18} /></span>
                  {group.label}
                </Link>
              );
            }

            const isOpen = openGroups[group.key];
            const isGroupActive = 'items' in group && group.items && group.items.some(item =>
              pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            );

            const visibleItems = 'items' in group && group.items
              ? (group.items as any[]).filter((item: any) => !item.permission || hasPermission(item.permission))
              : [];

            if (visibleItems.length === 0) return null;

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
                  <div style={{
                    paddingLeft: 16,
                    marginLeft: 20,
                    borderLeft: '1.5px solid rgba(255, 255, 255, 0.15)',
                    marginTop: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    {visibleItems.map(item => {
                      const isItemActive = pathname === item.href || (
                        item.href !== '/dashboard' &&
                        pathname.startsWith(item.href + '/') &&
                        !visibleItems.some(other => other.href !== item.href && other.href.startsWith(item.href) && (pathname === other.href || pathname.startsWith(other.href + '/')))
                      );

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`sidebar-item ${isItemActive ? 'active' : ''}`}
                          style={{
                            fontSize: '13.5px',
                            padding: '8px 12px',
                            opacity: isItemActive ? 1 : 0.85,
                            borderRadius: 'var(--radius-sm)',
                            position: 'relative',
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            left: -19.75,
                            top: 'calc(50% - 3px)',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isItemActive ? '#c084fc' : 'rgba(255, 255, 255, 0.25)',
                            boxShadow: isItemActive ? '0 0 6px #c084fc' : 'none',
                            transition: 'all 0.2s ease',
                          }} />
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
