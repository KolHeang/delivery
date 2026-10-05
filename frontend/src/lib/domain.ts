2/**
 * Multi-tenant Domain Resolution & Workspace URL Helper
 */

export function getPlatformBaseDomain(): string {
  if (process.env.NEXT_PUBLIC_BASE_DOMAIN) {
    return process.env.NEXT_PUBLIC_BASE_DOMAIN;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('rithyboth.work')) {
      return 'new-delivery.rithyboth.work';
    }
    if (hostname.includes('ebsexpress.com')) {
      return 'ebsexpress.com';
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
      const port = window.location.port ? `:${window.location.port}` : ':3000';
      return `localhost${port}`;
    }
  }
  return 'new-delivery.rithyboth.work';
}

/**
 * Detect tenant subdomain from window.location
 * Returns null if currently on root platform (e.g. https://new-delivery.rithyboth.work/ or localhost:3000)
 * Returns tenant slug (e.g. "e-express") if on a tenant subdomain (e.g. https://e-express.new-delivery.rithyboth.work/)
 */
export function detectTenantSubdomain(): string | null {
  if (typeof window === 'undefined') return null;

  const hostname = window.location.hostname.toLowerCase();
  
  // 1. Query parameter override (for development / testing): ?tenant=e-express
  const searchParams = new URLSearchParams(window.location.search);
  const queryTenant = searchParams.get('tenant')?.toLowerCase().trim();
  if (queryTenant) return queryTenant;

  // 2. Localhost subdomain handling: e.g. e-express.localhost:3000
  if (hostname.includes('.localhost')) {
    const sub = hostname.split('.localhost')[0].replace(/\..*$/, '').trim();
    if (sub && !['www', 'app', 'api', 'admin', 'mail'].includes(sub)) {
      return sub;
    }
  }

  // 3. Known base domain: new-delivery.rithyboth.work
  const knownBase = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'new-delivery.rithyboth.work').toLowerCase().replace(/^https?:\/\//, '').split(':')[0];
  
  if (hostname === knownBase || hostname === `www.${knownBase}`) {
    return null; // Root platform
  }

  if (hostname.endsWith(`.${knownBase}`)) {
    const sub = hostname.slice(0, -(knownBase.length + 1)).trim();
    if (sub && !['www', 'app', 'api', 'admin'].includes(sub)) {
      // If multi-level, take the outermost part
      return sub.split('.')[0];
    }
    return null;
  }

  // 4. Fallback for ebsexpress.com
  if (hostname === 'ebsexpress.com' || hostname === 'www.ebsexpress.com') {
    return null;
  }
  if (hostname.endsWith('.ebsexpress.com')) {
    const sub = hostname.slice(0, -'.ebsexpress.com'.length).trim();
    if (sub && !['www', 'app', 'api', 'admin'].includes(sub)) {
      return sub.split('.')[0];
    }
    return null;
  }

  // 5. Bare localhost or IP address
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  if (hostname === 'localhost' || isIp) {
    return null;
  }

  // 6. Generic custom subdomain (e.g. sub.domain.com with 3+ parts)
  const parts = hostname.split('.');
  if (parts.length > 2) {
    const first = parts[0];
    if (!['www', 'app', 'api', 'admin', 'new-delivery'].includes(first)) {
      return first;
    }
  }

  return null;
}

/**
 * Format full tenant workspace URL
 */
export function getTenantWorkspaceUrl(subdomain: string): string {
  if (!subdomain) return '/';

  if (typeof window === 'undefined') {
    const base = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'new-delivery.rithyboth.work';
    return `https://${subdomain}.${base}`;
  }

  const hostname = window.location.hostname.toLowerCase();
  const protocol = window.location.protocol || 'https:';
  const port = window.location.port ? `:${window.location.port}` : '';

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
    return `${protocol}//${subdomain}.localhost${port}`;
  }

  if (hostname.includes('rithyboth.work') || (process.env.NEXT_PUBLIC_BASE_DOMAIN && process.env.NEXT_PUBLIC_BASE_DOMAIN.includes('rithyboth.work'))) {
    return `https://${subdomain}.new-delivery.rithyboth.work`;
  }

  if (hostname.includes('ebsexpress.com')) {
    return `https://${subdomain}.ebsexpress.com`;
  }

  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'new-delivery.rithyboth.work';
  return `https://${subdomain}.${base}`;
}

/**
 * Get display suffix for subdomain input fields (e.g. .new-delivery.rithyboth.work or .localhost:3000)
 */
export function getDomainSuffix(): string {
  if (typeof window === 'undefined') {
    return `.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'new-delivery.rithyboth.work'}`;
  }
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
    return `.localhost:${window.location.port || '3000'}`;
  }
  if (hostname.includes('rithyboth.work')) {
    return '.new-delivery.rithyboth.work';
  }
  if (hostname.includes('ebsexpress.com')) {
    return '.ebsexpress.com';
  }
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'new-delivery.rithyboth.work';
  return `.${base}`;
}
