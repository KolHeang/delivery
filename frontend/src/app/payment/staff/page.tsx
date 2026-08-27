'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentStaffRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/payment/driver');
  }, [router]);
  return null;
}
