/**
 * Standard date formatting utility: DD-MM-YYYY
 */
export function formatDate(dateVal?: string | Date | null): string {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal === 'string' || typeof dateVal === 'number' ? new Date(dateVal) : dateVal;
    if (!(d instanceof Date) || isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return '';
  }
}

export function formatDateTime(dateVal?: string | Date | null): string {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal === 'string' || typeof dateVal === 'number' ? new Date(dateVal) : dateVal;
    if (!(d instanceof Date) || isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${mins}`;
  } catch {
    return '';
  }
}

/**
 * Format remaining days into human-friendly format: Years / Months / Days
 * e.g. 746 days -> "2 years 16 days remaining" or "នៅសល់ 2 ឆ្នាំ 16 ថ្ងៃ ទៀត"
 */
export function formatRemainingDuration(
  days?: number | null,
  lang: 'km' | 'en' | string = 'en'
): string {
  if (days === undefined || days === null) return '';
  const isKm = lang === 'km';
  if (days <= 0) {
    return isKm ? 'ផុតកំណត់' : 'Expired';
  }

  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remDays = days % 365;
    const months = Math.floor(remDays / 30);
    const leftDays = remDays % 30;

    if (isKm) {
      const parts: string[] = [`${years} ឆ្នាំ`];
      if (months > 0) parts.push(`${months} ខែ`);
      if (leftDays > 0 && months === 0) parts.push(`${leftDays} ថ្ងៃ`);
      return `នៅសល់ ${parts.join(' ')} ទៀត`;
    } else {
      const parts: string[] = [`${years} ${years > 1 ? 'years' : 'year'}`];
      if (months > 0) parts.push(`${months} ${months > 1 ? 'months' : 'month'}`);
      if (leftDays > 0 && months === 0) parts.push(`${leftDays} ${leftDays > 1 ? 'days' : 'day'}`);
      return `${parts.join(' ')} remaining`;
    }
  }

  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remDays = days % 30;
    if (isKm) {
      return remDays > 0
        ? `នៅសល់ ${months} ខែ ${remDays} ថ្ងៃ ទៀត`
        : `នៅសល់ ${months} ខែ ទៀត`;
    } else {
      return remDays > 0
        ? `${months} mo ${remDays} ${remDays > 1 ? 'days' : 'day'} remaining`
        : `${months} ${months > 1 ? 'months' : 'month'} remaining`;
    }
  }

  if (isKm) {
    return `នៅសល់ ${days} ថ្ងៃ ទៀត`;
  }
  return `${days} ${days > 1 ? 'days' : 'day'} remaining`;
}

