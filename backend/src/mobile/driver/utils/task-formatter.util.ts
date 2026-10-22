export interface FormattedDriverTask {
  id: number;
  trackingCode: string;
  trackingCodeFormatted: string;
  merchantName: string;
  senderName: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  location: string;
  address: string;
  zone?: string;
  status: string;
  statusKh: string;
  statusLabel: string;
  statusText: string;
  statusBadge: {
    label: string;
    color: string;
    backgroundColor: string;
  };
  badgeColor: string;
  badgeBg: string;
  cod: number;
  codCurrency: string;
  deliveryFee: number;
  driverFee: number;
  note?: string;
  driverRole: 'delivery_driver' | 'pickup_driver' | 'driver';
  createdAt: Date | string;
  assignedAt?: Date | string;
  deliveredAt?: Date | string;
  merchant?: any;
  customer?: any;
  [key: string]: any;
}

export function formatDriverTask(parcel: any, driverId?: number): FormattedDriverTask {
  if (!parcel) {
    return {
      id: 0,
      trackingCode: '',
      trackingCodeFormatted: '',
      merchantName: '',
      senderName: '',
      receiverName: '',
      receiverPhone: '',
      receiverAddress: '',
      location: '',
      address: '',
      status: 'pending',
      statusKh: 'រង់ចាំ',
      statusLabel: 'រង់ចាំ',
      statusText: 'រង់ចាំ',
      statusBadge: {
        label: 'រង់ចាំ',
        color: '#d97706',
        backgroundColor: '#fef3c7',
      },
      badgeColor: '#d97706',
      badgeBg: '#fef3c7',
      cod: 0,
      codCurrency: 'USD',
      deliveryFee: 0,
      driverFee: 0,
      driverRole: 'driver',
      createdAt: new Date(),
    };
  }

  const pDriverId = Number(driverId);
  const isDeliveryDriver = pDriverId && parcel.driverId === pDriverId;
  const isPickupDriver = pDriverId && parcel.pickupDriverId === pDriverId;

  const status = (parcel.status || 'pending').toLowerCase();
  let statusKh = 'រង់ចាំ';
  let badgeColor = '#d97706';
  let badgeBg = '#fef3c7';

  switch (status) {
    case 'delivered':
      statusKh = 'ដឹកដល់';
      badgeColor = '#16a34a';
      badgeBg = '#dcfce7';
      break;
    case 'assigned':
    case 'picked-up':
    case 'picked_up':
      statusKh = 'ទទួលយក';
      badgeColor = '#7c3aed';
      badgeBg = '#ede9fe';
      break;
    case 'in-transit':
    case 'in_transit':
      statusKh = 'កំពុងដឹក';
      badgeColor = '#2563eb';
      badgeBg = '#dbeafe';
      break;
    case 'in-warehouse':
    case 'in_warehouse':
      statusKh = 'ក្នុងឃ្លាំង';
      badgeColor = '#0284c7';
      badgeBg = '#e0f2fe';
      break;
    case 'failed':
      statusKh = 'មានបញ្ហា';
      badgeColor = '#dc2626';
      badgeBg = '#fee2e2';
      break;
    case 'returned':
      statusKh = 'ត្រឡប់មកវិញ';
      badgeColor = '#dc2626';
      badgeBg = '#fee2e2';
      break;
    case 'cancelled':
      statusKh = 'បោះបង់';
      badgeColor = '#6b7280';
      badgeBg = '#f3f4f6';
      break;
    case 'pending':
    default:
      statusKh = 'រង់ចាំ';
      badgeColor = '#d97706';
      badgeBg = '#fef3c7';
      break;
  }

  const rawCode = parcel.trackingCode || '';
  const trackingCodeFormatted = rawCode
    ? rawCode.startsWith('#')
      ? rawCode
      : `#${rawCode}`
    : '';

  const merchantName =
    parcel.merchant?.name ||
    parcel.merchant?.nameKh ||
    parcel.receiverName ||
    'Heang';

  const zoneName = parcel.zone?.name || parcel.zone?.nameKh || '';
  const location =
    parcel.receiverAddress ||
    zoneName ||
    'Phnom Penh';

  return {
    ...parcel,
    id: parcel.id,
    trackingCode: rawCode,
    trackingCodeFormatted,
    merchantName,
    senderName: merchantName,
    receiverName: parcel.receiverName || merchantName,
    receiverPhone: parcel.receiverPhone || '',
    receiverAddress: parcel.receiverAddress || '',
    location,
    address: parcel.receiverAddress || location,
    zone: zoneName,
    status,
    statusKh,
    statusLabel: statusKh,
    statusText: statusKh,
    statusBadge: {
      label: statusKh,
      color: badgeColor,
      backgroundColor: badgeBg,
    },
    badgeColor,
    badgeBg,
    cod: Number(parcel.cod || 0),
    codCurrency: parcel.codCurrency || 'USD',
    deliveryFee: Number(parcel.deliveryFee || 0),
    driverFee: Number(parcel.driverFee || 0),
    driverRole: isDeliveryDriver
      ? 'delivery_driver'
      : isPickupDriver
      ? 'pickup_driver'
      : 'driver',
    createdAt: parcel.createdAt,
    assignedAt: parcel.assignedAt,
    deliveredAt: parcel.deliveredAt,
  };
}
