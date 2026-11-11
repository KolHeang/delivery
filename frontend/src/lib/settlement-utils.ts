export const SETTLEMENT_IN_TRANSIT_STATUSES = [
  'failed',
  'in-transit',
  'picked-up',
  'pending',
] as const;

export const SETTLEMENT_DISPLAY_STATUSES = [
  'delivered',
  'failed',
  'in-transit',
  'picked-up',
  'pending',
  'returned',
] as const;

export function parseLocalDateBoundary(dateStr: string, endOfDay = false): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    const [year, month, day] = parts;
    return endOfDay
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day, 0, 0, 0, 0);
  }
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  if (endOfDay) parsed.setHours(23, 59, 59, 999);
  else parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function getSettlementParcelDate(o: any): Date {
  let dateString = o?.deliveredAt;
  if (
    !dateString &&
    (o?.status === 'failed' ||
      o?.status === 'returned' ||
      o?.status === 'pending' ||
      o?.status === 'in-transit' ||
      o?.status === 'picked-up')
  ) {
    dateString = o?.updatedAt || o?.createdAt;
  }
  return dateString ? new Date(dateString) : new Date(o?.createdAt);
}

export function isWithinSettlementDateRange(
  o: any,
  startDate?: string,
  endDate?: string,
): boolean {
  if (!startDate && !endDate) return true;
  const d = getSettlementParcelDate(o);
  if (startDate) {
    const start = parseLocalDateBoundary(startDate, false);
    if (start && d < start) return false;
  }
  if (endDate) {
    const end = parseLocalDateBoundary(endDate, true);
    if (end && d > end) return false;
  }
  return true;
}

export function isDisplayableSettlementStatus(status: string): boolean {
  return (SETTLEMENT_DISPLAY_STATUSES as readonly string[]).includes(status);
}

export function isInTransitSettlementStatus(status: string): boolean {
  return (SETTLEMENT_IN_TRANSIT_STATUSES as readonly string[]).includes(status);
}

export function matchesDriverPaymentStatus(o: any, statusFilter: string): boolean {
  return (
    o?.driverPaymentStatus === statusFilter ||
    (!o?.driverPaymentStatus && statusFilter === 'unpaid')
  );
}

export function filterDriverSettlementOrders(
  orders: any[],
  filters: {
    driverId?: string;
    statusFilter: string;
    startDate?: string;
    endDate?: string;
  },
): any[] {
  const { driverId, statusFilter, startDate, endDate } = filters;
  return (Array.isArray(orders) ? orders : []).filter((o: any) => {
    if (driverId && String(o?.driverId) !== String(driverId)) return false;
    if (!isDisplayableSettlementStatus(o?.status)) return false;
    if (!matchesDriverPaymentStatus(o, statusFilter)) return false;
    return isWithinSettlementDateRange(o, startDate, endDate);
  });
}

export function matchesMerchantPaymentStatus(o: any, statusFilter: string): boolean {
  return (
    o?.merchantPaymentStatus === statusFilter ||
    (!o?.merchantPaymentStatus && statusFilter === 'unpaid')
  );
}

export function isEligibleMerchantSettlementOrder(o: any, statusFilter: string): boolean {
  if (!isDisplayableSettlementStatus(o?.status)) return false;
  if (!matchesMerchantPaymentStatus(o, statusFilter)) return false;
  if (statusFilter === 'unpaid' && o?.status === 'delivered' && o?.driverPaymentStatus !== 'paid') {
    return false;
  }
  return true;
}

export function filterMerchantSettlementOrders(
  orders: any[],
  filters: {
    merchantId?: string;
    statusFilter: string;
    startDate?: string;
    endDate?: string;
  },
): any[] {
  const { merchantId, statusFilter, startDate, endDate } = filters;
  return (Array.isArray(orders) ? orders : []).filter((o: any) => {
    if (merchantId && String(o?.merchantId) !== String(merchantId)) return false;
    if (!isEligibleMerchantSettlementOrder(o, statusFilter)) return false;
    return isWithinSettlementDateRange(o, startDate, endDate);
  });
}

