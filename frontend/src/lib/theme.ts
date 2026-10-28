/**
 * Theme & Brand Color Management Utility
 * Ensures custom organization colors dynamically update across:
 * - Sidebar, Topbar, and Shell layouts
 * - Tables, thead, th, and tr backgrounds
 * - Primary buttons, save buttons, and submit buttons
 * - Active tabs, pagination items, focus rings, and accents
 */

export function adjustColorBrightness(hex: string, percent: number): string {
  if (!hex || typeof hex !== 'string') return hex;
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length !== 3 && cleanHex.length !== 6) return hex;

  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  const num = parseInt(fullHex, 16);
  if (isNaN(num)) return hex;

  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));

  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || typeof hex !== 'string') return `rgba(37, 99, 235, ${alpha})`;
  const cleanHex = hex.replace('#', '').trim();
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  if (fullHex.length !== 6) return `rgba(37, 99, 235, ${alpha})`;
  const num = parseInt(fullHex, 16);
  if (isNaN(num)) return `rgba(37, 99, 235, ${alpha})`;

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyBrandTheme(color: string | undefined | null) {
  if (!color || typeof document === 'undefined') return;
  const trimmed = color.trim();
  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed)) return;

  const dark = adjustColorBrightness(trimmed, -22);
  const light = hexToRgba(trimmed, 0.12);
  const glow = hexToRgba(trimmed, 0.28);
  const subtle = hexToRgba(trimmed, 0.06);

  const root = document.documentElement.style;
  root.setProperty('--sidebar-bg', trimmed);
  root.setProperty('--sidebar-active', dark);
  root.setProperty('--accent', trimmed);
  root.setProperty('--accent-dark', dark);
  root.setProperty('--accent-light', light);
  root.setProperty('--accent-glow', glow);
  root.setProperty('--accent-subtle', subtle);
  root.setProperty('--tenant-primary', trimmed);
  root.setProperty('--tenant-primary-dark', dark);
}

export function getSavedBrandColor(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const directColor = localStorage.getItem('app-brand-color');
    if (directColor && /^#[0-9A-Fa-f]{3,6}$/.test(directColor)) {
      return directColor;
    }
    const cached = localStorage.getItem('app-org-settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.primaryColor && /^#[0-9A-Fa-f]{3,6}$/.test(parsed.primaryColor)) {
        return parsed.primaryColor;
      }
    }
  } catch {}
  return null;
}

export function initBrandTheme() {
  const color = getSavedBrandColor();
  if (color) {
    applyBrandTheme(color);
  }
}

