'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ListPrintQrcodeRedirect() {
  const router = useRouter();

  useEffect(() => {
    const search = window.location.search;
    router.replace(`/delivery/print_invoice${search}`);
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  );
}
