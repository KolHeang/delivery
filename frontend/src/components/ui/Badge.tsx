'use client';

import { useLanguage } from '@/lib/LanguageContext';
import { PARCEL_STATUS_LABELS, getParcelStatusLabel } from '@/lib/status';

interface BadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export default function Badge({ status, label, className = '' }: BadgeProps) {
  const { lang } = useLanguage();
  const slug = status?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const resolvedLabel =
    label || (slug && PARCEL_STATUS_LABELS[slug] ? getParcelStatusLabel(slug, lang) : status);
  return (
    <span className={`badge badge-${slug} ${className}`}>
      {resolvedLabel}
    </span>
  );
}
