import axios from 'axios';
import { detectTenantSubdomain } from '@/lib/domain';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://new-delivery-api.rithyboth.work/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token and Tenant Subdomain to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const detectedSubdomain = detectTenantSubdomain();

    try {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u?.tenantId) {
          config.headers['x-tenant-id'] = u.tenantId.toString();
        }
      }
    } catch {}

    if (detectedSubdomain) {
      config.headers['x-tenant-subdomain'] = detectedSubdomain;
    }
    if (window.location?.host) {
      config.headers['x-tenant-domain'] = window.location.host;
    }
  }
  return config;
});

const sanitizeDashPlaceholders = (val: any): any => {
  if (typeof val === 'string') {
    return /^[-—–]{1,3}$/.test(val.trim()) ? '' : val;
  }
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      val[i] = sanitizeDashPlaceholders(val[i]);
    }
    return val;
  }
  if (val && typeof val === 'object' && Object.prototype.toString.call(val) === '[object Object]') {
    for (const key of Object.keys(val)) {
      val[key] = sanitizeDashPlaceholders(val[key]);
    }
    return val;
  }
  return val;
};

// Redirect to login on 401 (except for SaaS Master admin portal)
api.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === 'object' &&
      'status' in response.data &&
      'data' in response.data &&
      typeof response.data.status === 'boolean'
    ) {
      response.data = response.data.data;
    }
    response.data = sanitizeDashPlaceholders(response.data);
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const isAuthPage =
        pathname === '/auth' ||
        pathname === '/admin/saas/login' ||
        pathname === '/' ||
        pathname.startsWith('/report_payment_customer');
      const isLoginRequest =
        error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/saas/admins/login');

      if (!isAuthPage && !isLoginRequest) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('saas_admin');
        if (pathname.startsWith('/admin/saas')) {
          window.location.href = '/admin/saas/login';
        } else {
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
