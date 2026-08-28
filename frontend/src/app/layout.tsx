import type { Metadata } from 'next';
import '@/styles/globals.css';
import { LanguageProvider } from '@/lib/LanguageContext';
import { SettingsProvider } from '@/lib/SettingsContext';

export const metadata: Metadata = {
  title: {
    default: 'EBS Express — Delivery Management System',
    template: '%s | EBS Express',
  },
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
        <LanguageProvider>
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
