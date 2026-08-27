'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ClientEditRedirect() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    if (params?.id) {
      router.replace(`/merchants/edit/${params.id}`);
    } else {
      router.replace('/merchants');
    }
  }, [router, params]);
  return null;
}
