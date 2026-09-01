export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'staff' | 'driver' | 'merchant';
  active: boolean;
  photo?: string;
  permissions?: string[];
  tenantId?: number;
}


export function hasPermission(permission: string | string[]): boolean {
  const user = getUser();
  if (!user) return false;
  if (user.role === 'admin' || user.permissions?.includes('*')) return true;
  if (!user.permissions || user.permissions.length === 0) return false;

  const perms = Array.isArray(permission) 
    ? permission 
    : permission.split(',').map(p => p.trim());

  return perms.some(p => {
    if (user.permissions?.includes(p)) return true;
    const group = p.split('.')[0];
    if (user.permissions?.includes(`${group}.*`)) return true;
    return false;
  });
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function setAuth(token: string, user: User) {
  localStorage.setItem('access_token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
