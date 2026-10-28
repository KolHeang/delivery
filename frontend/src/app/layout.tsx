import type { Metadata } from 'next';
import { Suspense } from 'react';
import '@/styles/globals.css';
import { LanguageProvider } from '@/lib/LanguageContext';
import { SettingsProvider } from '@/lib/SettingsContext';
import { TenantProvider } from '@/lib/TenantContext';
import DynamicTitle from '@/components/layout/DynamicTitle';

export const metadata: Metadata = {
  title: 'EBS Express',
  description: 'Professional delivery management system for managing orders, drivers, merchants, and customers.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var color = localStorage.getItem('app-brand-color');
    if (!color) {
      var org = localStorage.getItem('app-org-settings');
      if (org) {
        var parsed = JSON.parse(org);
        if (parsed && (parsed.primaryColor || parsed.primary_color)) {
          color = parsed.primaryColor || parsed.primary_color;
        }
      }
    }
    if (color && /^#[0-9A-Fa-f]{3,6}$/.test(color)) {
      var c = color.trim();
      var clean = c.replace('#', '');
      if (clean.length === 3) clean = clean.split('').map(function(x) { return x + x; }).join('');
      var num = parseInt(clean, 16);
      var r = (num >> 16) & 255;
      var g = (num >> 8) & 255;
      var b = num & 255;
      var amt = Math.round(2.55 * -22);
      var dr = Math.min(255, Math.max(0, r + amt));
      var dg = Math.min(255, Math.max(0, g + amt));
      var db = Math.min(255, Math.max(0, b + amt));
      var dark = '#' + ((1 << 24) + (dr << 16) + (dg << 8) + db).toString(16).slice(1);
      var light = 'rgba(' + r + ',' + g + ',' + b + ',0.12)';
      var glow = 'rgba(' + r + ',' + g + ',' + b + ',0.28)';

      var root = document.documentElement.style;
      root.setProperty('--sidebar-bg', c);
      root.setProperty('--sidebar-active', dark);
      root.setProperty('--accent', c);
      root.setProperty('--accent-dark', dark);
      root.setProperty('--accent-light', light);
      root.setProperty('--accent-glow', glow);
      root.setProperty('--tenant-primary', c);
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <TenantProvider>
          <LanguageProvider>
            <SettingsProvider>
              <Suspense fallback={null}>
                <DynamicTitle />
              </Suspense>
              {children}
            </SettingsProvider>
          </LanguageProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
