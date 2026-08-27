'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientCreateRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/merchants/create');
  }, [router]);
  return null;
}
