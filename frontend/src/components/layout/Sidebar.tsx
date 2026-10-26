'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUser, hasPermission } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { useTenant } from '@/lib/TenantContext';
import api from '@/lib/api';
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
      permission: 'reports.view, reports.operation_merchant, reports.operation_driver, reports.operation_pickup',
      items: [
        { href: '/summary/shop', label: t('shopSummary'), permission: 'reports.operation_merchant, reports.view' },
        { href: '/summary/delivery', label: t('deliverySummary'), permission: 'reports.operation_driver, reports.view' },
        { href: '/summary/pickup', label: t('pickupSummary'), permission: 'reports.operation_pickup, reports.view' },
      ],
    },
    {
      key: 'delivery',
      label: t('manageDelivery'),
      icon: MdLocalShipping,
      permission: 'parcels.read, parcels.create, parcels.update',
      items: [
        { href: '/delivery/entry_data_item', label: t('batchEntryData'), permission: 'parcels.create' },
        { href: '/delivery', label: t('listOfDelivery'), permission: 'parcels.read' },
        { href: '/delivery/print_invoice', label: t('printInvoiceDelivery'), permission: 'parcels.read' },
        { href: '/delivery/pickup_requests', label: t('pickupRequests'), permission: 'parcels.read' },
        { href: '/delivery/assigndeliveryby', label: t('processForAssign'), permission: 'parcels.update' },
        { href: '/delivery/complete', label: t('completePackage'), permission: 'parcels.update' },
        { href: '/delivery/tracking_delivery', label: t('tracking'), permission: 'parcels.read' },
        { href: '/delivery/live-map', label: lang === 'km' ? 'ផែនទីតាមដាន' : 'Live Fleet Map', permission: 'parcels.read' },
      ],
    },

    {
      key: 'shops',
      label: t('manageShops'),
      icon: MdStorefront,
      permission: 'merchants.read, branches.read',
      items: [
        { href: '/merchants', label: t('shopList'), permission: 'merchants.read' },
        { href: '/merchants/branches', label: lang === 'km' ? 'បញ្ជីសាខា' : 'Branch List', permission: 'branches.read, merchants.read' },
      ],
    },
    {
      key: 'staff',
      label: t('manageStaff') || 'Manage Staff',
      icon: MdPeople,
      permission: 'users.read, vehicles.read',
      items: [
        { href: '/user', label: t('staffList') || 'List Staff', permission: 'users.read' },
        { href: '/vehicles', label: lang === 'km' ? 'យានយន្ត' : 'Vehicles', permission: 'vehicles.read' },
      ],
    },
    {
      key: 'payment',
      label: t('paymentProcess'),
      icon: MdAccountBalanceWallet,
      permission: 'payments.read',
      items: [
        { href: '/payment/driver', label: t('paymentWithDelivery') || 'Payment with Delivery', permission: 'payments.read' },
        { href: '/payment/merchant', label: t('paymentWithShop'), permission: 'payments.read' },
      ],
    },
    {
      key: 'accounting',
      label: t('accounting'),
      icon: MdReceipt,
      permission: 'expenses.read, incomes.read',
      items: [
        { href: '/expense', label: t('expenseList'), permission: 'expenses.read' },
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
      permission: 'reports.view, reports.export, reports.operation_daily, reports.financial_ledger',
    },
    {
      key: 'settings',
      label: t('settings'),
      icon: MdSettings,
      items: [
        { href: '/billing', label: lang === 'km' ? 'គម្រោង & វិក្កយបត្រ' : 'Billing & Plans', permission: 'settings.billing' },
        { href: '/setting/zone_type', label: t('zoneType'), permission: 'settings.zone_type' },
        { href: '/setting/role', label: t('permission'), permission: 'settings.role, roles.read' },
        { href: '/setting/organisation', label: t('organizationSetting'), permission: 'settings.organisation' },
        { href: '/setting/general', label: t('generalSettings'), permission: 'settings.general' },
        { href: '/setting/currency', label: t('currencySettings'), permission: 'settings.general, settings.manage' },
        { href: '/setting/firebase', label: lang === 'km' ? 'ការកំណត់ Firebase' : 'Firebase Settings', permission: 'settings.general, settings.manage' },
        { href: '/setting/telegram', label: lang === 'km' ? 'ការកំណត់ Telegram' : 'Telegram Settings', permission: 'settings.telegram, settings.general, settings.manage' },
        { href: '/setting/activity_log', label: t('activityLogs') || 'Activity Logs', permission: 'settings.activity_log' },
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
  const [orgName, setOrgName] = useState<string>('');
  const [orgLogo, setOrgLogo] = useState<string>('');

  useEffect(() => {
    const updateOrg = () => {
      try {
        const cacheKey = tenant?.subdomain ? `app-org-settings-${tenant.subdomain}` : 'app-org-settings';
        const cached = localStorage.getItem(cacheKey) || (!isTenant ? localStorage.getItem('app-org-settings') : null);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.name) setOrgName(parsed.name);
          if (parsed?.logo !== undefined) setOrgLogo(parsed.logo || '');
        }
      } catch {}
    };
    updateOrg();
    api.get('/settings/organisation').then((res: any) => {
      if (res.data) {
        if (res.data.name) setOrgName(res.data.name);
        if (res.data.logo !== undefined) setOrgLogo(res.data.logo || '');
        if (typeof window !== 'undefined') {
          const cacheKey = tenant?.subdomain ? `app-org-settings-${tenant.subdomain}` : 'app-org-settings';
          localStorage.setItem(cacheKey, JSON.stringify(res.data));
        }
      }
    }).catch(() => {});

    window.addEventListener('org-settings-updated', updateOrg);
    return () => window.removeEventListener('org-settings-updated', updateOrg);
  }, [tenant?.subdomain, isTenant]);

  const activeCompanyName = 
    (isTenant && tenant?.companyName && (!orgName || orgName === 'EBS Digital Solutions'))
      ? tenant.companyName
      : (orgName && orgName !== 'EBS Digital Solutions' ? orgName : (tenant?.companyName || subscription?.companyName || orgName));
  const activeSubdomain = tenant?.subdomain || subscription?.subdomain;

  const currentLogo = tenant?.logoUrl || orgLogo;

  return (
    <aside className="sidebar" style={{ width: 260 }}>
      {/* Brand Logo */}
      <div className="sidebar-logo" style={{ height: 76, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        {currentLogo ? (
          <img
            src={currentLogo}
            alt="Logo"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              objectFit: 'contain',
              background: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: 2,
              flexShrink: 0
            }}
          />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--accent), #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 22, boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
            flexShrink: 0
          }}>
            📦
          </div>
        )}
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
            fontSize: 12,
            color: '#ffffff',
            fontWeight: 700,
            marginTop: 2,
            letterSpacing: '0.2px',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            textShadow: '0 1px 2px rgba(0,0,0,0.15)'
          }}>
            {lang === 'km' ? 'ប្រព័ន្ធដឹកជញ្ជូន' : 'Delivery System'}
          </span>
        </div>
      </div>

      {/* Navigation list */}
      <div className="sidebar-nav" style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {/* Dashboard Link */}
        {(!subscription?.plan?.features || subscription.plan.features.dashboard !== false) && (
          <Link
            href="/dashboard"
            className={`sidebar-item ${pathname === '/dashboard' ? 'active' : ''}`}
            style={{ marginBottom: 4, color: '#ffffff', fontWeight: pathname === '/dashboard' ? 700 : 600 }}
          >
            <span className="sidebar-item-icon" style={{ color: '#ffffff' }}><MdDashboard size={19} /></span>
            <span style={{ color: '#ffffff' }}>{t('dashboard')}</span>
          </Link>
        )}


        {mounted && menuGroups
          .filter(group => {
            const planFeatures = subscription?.plan?.features;
            if (planFeatures && planFeatures[group.key] === false) {
              return false;
            }
            return !group.permission || hasPermission(group.permission);
          })
          .map(group => {
            const Icon = group.icon;

            if ('href' in group && group.href) {
              const isActive = pathname === group.href || (group.href !== '/dashboard' && pathname.startsWith(group.href));
              return (
                <Link
                  key={group.key}
                  href={group.href}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  style={{ marginBottom: 8, color: '#ffffff', fontWeight: isActive ? 700 : 600 }}
                >
                  <span className="sidebar-item-icon" style={{ color: '#ffffff' }}><Icon size={19} /></span>
                  <span style={{ color: '#ffffff' }}>{group.label}</span>
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
                    background: isGroupActive ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                    color: '#ffffff',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="sidebar-item-icon" style={{ color: '#ffffff' }}><Icon size={19} /></span>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>{group.label}</span>
                  </div>
                  {isOpen ? <MdKeyboardArrowUp size={18} color="#ffffff" /> : <MdKeyboardArrowDown size={18} color="#ffffff" />}
                </button>

                {/* Group Sub-items */}
                {isOpen && (
                  <div style={{
                    paddingLeft: 16,
                    marginLeft: 20,
                    borderLeft: '2px solid rgba(255, 255, 255, 0.35)',
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
                            color: '#ffffff',
                            fontWeight: isItemActive ? 700 : 600,
                            borderRadius: 'var(--radius-sm)',
                            position: 'relative',
                            background: isItemActive ? 'rgba(255, 255, 255, 0.22)' : 'transparent',
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            left: -19.75,
                            top: 'calc(50% - 3px)',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isItemActive ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                            boxShadow: isItemActive ? '0 0 8px #ffffff' : 'none',
                            transition: 'all 0.2s ease',
                          }} />
                          <span style={{ color: '#ffffff' }}>{item.label}</span>
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
