export type StatusLocaleLabel = {
  km: string;
  en: string;
};

/**
 * Canonical parcel status labels keyed by raw database status values.
 * Database status strings must remain unchanged; UI renders localized labels from here.
 */
export const PARCEL_STATUS_LABELS: Record<string, StatusLocaleLabel> = {
  pending: { km: 'កំពុងរង់ចាំ', en: 'Pending' },
  'picked-up': { km: 'បានប្រមូល', en: 'Picked Up' },
  'in-warehouse': { km: 'ក្នុងឃ្លាំង', en: 'In Warehouse' },
  assigned: { km: 'បានចាត់តាំង', en: 'Assigned' },
  'in-transit': { km: 'កំពុងដឹកជញ្ជូន', en: 'In Transit' },
  delivered: { km: 'បានដឹកជោគជ័យ', en: 'Delivered' },
  failed: { km: 'បរាជ័យ', en: 'Failed' },
  returned: { km: 'បានត្រឡប់', en: 'Returned' },
  cancelled: { km: 'បានលុបចោល', en: 'Cancelled' },
};

/**
 * Canonical pickup request status labels in Pickup context.
 */
export const PICKUP_REQUEST_STATUS_LABELS: Record<string, StatusLocaleLabel> = {
  pending: { km: 'កំពុងរង់ចាំ', en: 'Pending' },
  assigned: { km: 'បានចាត់តាំង', en: 'Assigned' },
  'picked-up': { km: 'បានប្រមូល', en: 'Picked Up' },
  picked_up: { km: 'បានប្រមូល', en: 'Picked Up' },
  'in-warehouse': { km: 'ក្នុងឃ្លាំង', en: 'In Warehouse' },
  completed: { km: 'បានបញ្ចប់', en: 'Completed' },
  cancelled: { km: 'បានលុបចោល', en: 'Cancelled' },
};

const PARCEL_STATUS_COLORS: Record<string, string> = {
  pending: '#d97706',
  'picked-up': '#3b82f6',
  'in-warehouse': '#0f766e',
  assigned: '#6366f1',
  'in-transit': '#8b5cf6',
  delivered: '#10b981',
  closed: '#10b981',
  failed: '#ef4444',
  returned: '#f59e0b',
  cancelled: '#ef4444',
};

function resolveLabel(
  table: Record<string, StatusLocaleLabel>,
  status: string | null | undefined,
  lang: string,
): string {
  if (!status) return '';
  const key = status.toLowerCase().trim();
  const entry = table[key];
  if (!entry) return status;
  return lang === 'km' ? entry.km : entry.en;
}

/** Return the localized canonical label for a parcel status code. */
export function getParcelStatusLabel(
  status: string | null | undefined,
  lang: string,
): string {
  return resolveLabel(PARCEL_STATUS_LABELS, status, lang);
}

/** Return the localized canonical label for a pickup request status code. */
export function getPickupRequestStatusLabel(
  status: string | null | undefined,
  lang: string,
): string {
  return resolveLabel(PICKUP_REQUEST_STATUS_LABELS, status, lang);
}

/** Return a consistent solid hex color for a parcel status pill badge. */
export function getParcelStatusBadgeColor(
  status: string | null | undefined,
): string {
  const key = (status || '').toLowerCase().trim();
  return PARCEL_STATUS_COLORS[key] || '#64748b';
}
