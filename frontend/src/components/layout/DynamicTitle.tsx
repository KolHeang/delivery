'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTenant } from '@/lib/TenantContext';

export default function DynamicTitle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tenant } = useTenant();
  const [orgName, setOrgName] = useState<string>('');

  // Listen to organization name updates in localStorage
  useEffect(() => {
    const updateLocalOrg = () => {
      try {
        const cached = localStorage.getItem('app-org-settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.name) {
            setOrgName(parsed.name);
          }
        }
      } catch {}
    };

    updateLocalOrg();
    window.addEventListener('org-settings-updated', updateLocalOrg);
    window.addEventListener('storage', updateLocalOrg);

    return () => {
      window.removeEventListener('org-settings-updated', updateLocalOrg);
      window.removeEventListener('storage', updateLocalOrg);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. SaaS Master Admin Portal -> Only show clean name "EBS Master SaaS"
    if (pathname?.startsWith('/admin/saas')) {
      document.title = 'EBS Master SaaS';
      return;
    }

    // 2. Identify Company / Tenant Name
    let company = '';

    if (orgName) {
      company = orgName;
    } else if (tenant?.companyName) {
      company = tenant.companyName;
    } else {
      // Detect subdomain from hostname (e.g., esb-express.localhost, ankor-express.localhost)
      const hostname = window.location.hostname;
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      if (!isIp && hostname !== 'localhost') {
        const parts = hostname.split('.');
        if (parts.length > 1) {
          const first = parts[0].toLowerCase();
          if (first !== 'www' && first !== 'app' && first !== 'api') {
            company = first
              .split('-')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');
          }
        }
      }
    }

    // Secondary fallback: check ?tenant= query param
    if (!company && searchParams?.get('tenant')) {
      const t = searchParams.get('tenant')!;
      company = t
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    // Pure clean title with NO suffixes ("— Tenants Management", "— Delivery Management", etc.)
    document.title = company || 'EBS Express';

    // 3. Update Favicon if tenant has custom logo
    if (tenant?.logoUrl) {
      let iconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0]?.appendChild(iconLink);
      }
      iconLink.href = tenant.logoUrl;
    }
  }, [pathname, searchParams, tenant, orgName]);

  return null;
}
