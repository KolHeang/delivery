'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { saasApi } from './saas-api';

export interface TenantInfo {
  id: number;
  companyName: string;
  subdomain: string;
  customDomain?: string;
  status: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  plan?: {
    name: string;
    limits?: {
      maxOrders?: number;
      maxDrivers?: number;
      maxUsers?: number;
    };
    features?: Record<string, boolean>;
  };
}

interface TenantContextValue {
  tenant: TenantInfo | null;
  subdomain: string | null;
  isTenant: boolean;
  isNotFound: boolean;
  loading: boolean;
  refetchTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  subdomain: null,
  isTenant: false,
  isNotFound: false,
  loading: true,
  refetchTenant: async () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [isTenant, setIsTenant] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const resolveTenant = async () => {
    if (typeof window === 'undefined') return;

    try {
      // Never intercept SaaS Master Admin routes
      if (window.location.pathname.startsWith('/admin/saas')) {
        setIsTenant(false);
        setTenant(null);
        setIsNotFound(false);
        setLoading(false);
        return;
      }

      const host = window.location.host; // includes port if localhost
      const hostname = window.location.hostname;
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      
      let detectedSubdomain: string | null = null;

      if (!isIp && hostname !== 'localhost') {
        const parts = hostname.split('.');
        if (parts.length > 1) {
          const first = parts[0].toLowerCase();
          if (first !== 'www' && first !== 'app' && first !== 'api') {
            detectedSubdomain = first;
          }
        }
      }

      // Query param fallback for dev testing: ?tenant=ankor
      const searchParams = new URLSearchParams(window.location.search);
      if (!detectedSubdomain && searchParams.get('tenant')) {
        detectedSubdomain = searchParams.get('tenant');
      }

      // Check if not on root platform domain
      const isRootPlatform = (hostname === 'localhost' && !detectedSubdomain) || hostname === 'ebsexpress.com' || hostname === 'www.ebsexpress.com';

      if (!isRootPlatform || detectedSubdomain) {
        if (detectedSubdomain) {
          setSubdomain(detectedSubdomain);
          setIsTenant(true);
          const fallbackName = detectedSubdomain.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          setTenant({
            id: 0,
            companyName: fallbackName,
            subdomain: detectedSubdomain,
            status: 'active',
          });
          document.title = `${fallbackName} | Workspace`;
        }

        setLoading(true);
        // Call Dynamic Domain Resolver
        const domainToResolve = detectedSubdomain || host;
        const res = await saasApi.resolveDomain(domainToResolve).catch(() => null);

        if (res && res.found && res.tenant) {
          setSubdomain(res.tenant.slug);
          setIsTenant(true);
          setTenant({
            id: res.tenant.id,
            companyName: res.tenant.name,
            subdomain: res.tenant.slug,
            logoUrl: res.tenant.logo,
            phone: res.tenant.phone,
            email: res.tenant.email,
            status: res.tenant.status,
            plan: res.plan,
          });
          setIsNotFound(false);
          document.title = `${res.tenant.name} | Workspace`;
        }
      } else {
        setIsTenant(false);
        setTenant(null);
        setIsNotFound(false);
      }
    } catch (err) {
      console.error('Failed to resolve tenant:', err);
      setIsNotFound(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resolveTenant();
  }, []);

  if (isNotFound && subdomain && typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/saas')) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          padding: 24,
          fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
          color: '#fff',
        }}
      >
        <div
          style={{
            maxWidth: 520,
            background: '#ffffff',
            borderRadius: 24,
            padding: '44px 36px',
            textAlign: 'center',
            color: '#0f172a',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              margin: '0 auto 20px',
            }}
          >
            🏢
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px', color: '#0f172a' }}>
            រកមិនឃើញ Workspace នេះទេ
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 28 }}>
            Workspace <strong style={{ color: '#ef4444' }}>{subdomain}.ebsexpress.com</strong> មិនទាន់ត្រូវបានបង្កើត ឬផុតកំណត់។ សូមពិនិត្យមើល URL ឡើងវិញ។
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a
              href="http://localhost:3000/pricing"
              style={{
                padding: '14px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 15,
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              }}
            >
              🚀 បង្កើត Workspace ថ្មីឥឡូវនេះ (Create Workspace)
            </a>
            <a
              href="http://localhost:3000"
              style={{
                padding: '12px',
                borderRadius: 12,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#334155',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              ត្រឡប់ទៅកាន់ទំព័រដើម (Home)
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TenantContext.Provider
      value={{
        tenant,
        subdomain,
        isTenant,
        isNotFound,
        loading,
        refetchTenant: resolveTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
