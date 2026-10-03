import axios from 'axios';

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

    const hostname = window.location.hostname;
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    let detectedSubdomain: string | null = null;

    if (!isIp) {
      const parts = hostname.split('.');
      if (parts.length > 1) {
        const first = parts[0].toLowerCase();
        if (first !== 'www' && first !== 'localhost' && first !== 'app' && first !== 'api') {
          detectedSubdomain = first;
        }
      }
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (!detectedSubdomain && searchParams.get('tenant')) {
      detectedSubdomain = searchParams.get('tenant');
    }

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
  }
  return config;
});

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
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const isAuthPage =
        pathname === '/auth' ||
        pathname === '/driver/login' ||
        pathname === '/merchant/login' ||
        pathname === '/admin/saas/login' ||
        pathname === '/';
      const isLoginRequest =
        error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/saas/admins/login') ||
        error.config?.url?.includes('/mobile/auth/');

      if (!isAuthPage && !isLoginRequest) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
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
