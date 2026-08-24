import type { Metadata } from 'next';
import '@/styles/globals.css';
import { LanguageProvider } from '@/lib/LanguageContext';
import { TenantProvider } from '@/lib/TenantContext';

export const metadata: Metadata = {
  title: 'EBS Digital Solutions — Delivery Management System',
  description: 'Professional delivery management system for managing orders, drivers, merchants, and customers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          <TenantProvider>
            {children}
          </TenantProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
