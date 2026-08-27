'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentShopRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/payment/merchant');
  }, [router]);
  return null;
}
