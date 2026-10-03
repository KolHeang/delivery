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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
