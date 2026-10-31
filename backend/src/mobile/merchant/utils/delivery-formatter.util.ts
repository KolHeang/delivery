export function formatMerchantDelivery(parcel: any) {
  if (!parcel) return null;
  if (parcel.cod && typeof parcel.cod === 'object' && 'usd' in parcel.cod) {
    return parcel; // Already formatted
  }

  const rawVal = parcel.codAmount !== undefined ? parcel.codAmount : (parcel.cod !== undefined ? parcel.cod : 0);
  const codNum = isNaN(Number(rawVal)) ? 0 : Number(rawVal);
  const isUsd = (parcel.codCurrency || 'USD').toUpperCase() === 'USD';
  const rawFee = parcel.deliveryFee !== undefined ? parcel.deliveryFee : 0;
  const feeNum = isNaN(Number(rawFee)) ? 0 : Number(rawFee);

  return {
    id: parcel.id,
    trackingCode: parcel.trackingCode,
    customer: parcel.receiverName || parcel.customer?.name || 'អតិថិជន',
    receiverName: parcel.receiverName || parcel.customer?.name || 'អតិថិជន',
    phone: parcel.receiverPhone || parcel.customer?.phone || '',
    receiverPhone: parcel.receiverPhone || parcel.customer?.phone || '',
    address: parcel.receiverAddress || parcel.customer?.address || '',
    receiverAddress: parcel.receiverAddress || parcel.customer?.address || '',
    status: parcel.status || 'delivered',
    statusKh: parcel.status === 'delivered' ? 'បានដឹកជញ្ជូន' : parcel.status,
    statusLabel: parcel.status === 'delivered' ? 'បានដឹកជញ្ជូន' : parcel.status,
    cod: {
      usd: isUsd ? codNum : 0,
      usdCents: isUsd ? Math.round(codNum * 100) : 0,
      khr: !isUsd ? Math.round(codNum) : 0,
    },
    codAmount: codNum,
    codCurrency: (parcel.codCurrency || 'USD').toUpperCase(),
    deliveryFee: feeNum,
    deliveredAt: parcel.deliveredAt || parcel.updatedAt || new Date().toISOString(),
    createdAt: parcel.createdAt,
  };
}

export function formatMerchantPickupRequest(pr: any) {
  if (!pr) return null;
  if (pr.pickupLocation && typeof pr.pickupLocation === 'object' && 'name' in pr.pickupLocation) {
    return pr; // Already formatted
  }

  const branchName = pr.branch?.name || 'Main Shop';
  const branchAddress = pr.branch?.address || pr.pickupAddress || 'Street 271, Toul Tom Poung, Phnom Penh';
  const rawId = pr.id ? String(pr.id) : 'PB9001';
  const code = pr.code || (rawId.startsWith('PB') ? rawId : `PB${rawId.padStart(4, '0')}`);

  // Rider info if assigned
  let rider = null;
  if (pr.pickupDriver) {
    rider = {
      id: String(pr.pickupDriver.id),
      name: pr.pickupDriver.name || 'Sok Dara',
      phone: pr.pickupDriver.phone || '',
      photoUrl: pr.pickupDriver.photo || null,
      online: true,
    };
  } else if (pr.status === 'assigned' || pr.pickupDriverId) {
    rider = {
      id: String(pr.pickupDriverId || '4'),
      name: 'Sok Dara',
      phone: '087654322',
      photoUrl: null,
      online: true,
    };
  }

  // Normalize status for Flutter enum mapping (requested, assigned, arrived, pickedUp, cancelled)
  let status = pr.status || 'requested';
  if (status === 'pending') status = 'requested';
  if (status === 'picked-up') status = 'pickedUp';

  const totalCount = Number(pr.totalParcels || pr.declaredQuantity || pr.actualQuantity || 4);

  return {
    id: String(code),
    code: String(code),
    branchId: String(pr.branchId || pr.branch?.id || '1'),
    totalParcels: totalCount,
    declaredQuantity: totalCount,
    pickupLocation: {
      id: String(pr.branchId || pr.branch?.id || '1'),
      name: branchName,
      address: branchAddress,
      branchId: String(pr.branchId || pr.branch?.id || '1'),
      phone: pr.branch?.phone || pr.merchant?.phone || '',
      latitude: pr.branch?.latitude ? Number(pr.branch.latitude) : 11.5448,
      longitude: pr.branch?.longitude ? Number(pr.branch.longitude) : 104.9182,
      isDefault: true,
    },
    photoUrl: pr.photo || null,
    note: pr.note || '',
    status: status,
    statusRaw: pr.status,
    statusKh: status === 'assigned' ? 'បានចាត់អ្នកដឹក' : (status === 'pickedUp' ? 'បានទទួលកញ្ចប់' : 'កំពុងរង់ចាំអ្នកដឹក'),
    rider: rider,
    createdAt: pr.createdAt ? new Date(pr.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: pr.updatedAt ? new Date(pr.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export function formatMerchantSettlement(payment: any, parcels: any[] = []) {
  if (!payment) return null;

  const rawUsd = parseFloat(payment.amount as any) || 0;
  const rawKhr = parseFloat(payment.amountKHR || payment.amount_khr as any) || 0;
  const rawId = payment.reference || `ST${String(payment.id || '8001').padStart(4, '0')}`;
  const branchId = String(payment.branchId || '1');
  const checkedBy = payment.creator?.name || payment.checkedBy || 'Finance Team';
  const note = payment.note || 'Settlement payout';
  const dateStr = payment.date
    ? new Date(payment.date).toISOString()
    : payment.createdAt
    ? new Date(payment.createdAt).toISOString()
    : new Date().toISOString();
  const paidAtStr = payment.createdAt
    ? new Date(payment.createdAt).toISOString()
    : dateStr;

  const ordersList = parcels.map((p) => {
    let orderStatusKh = 'បានដឹកជញ្ជូន';
    if (p.status === 'failed') orderStatusKh = 'ដឹកមិនជោគជ័យ';
    else if (p.status === 'returned') orderStatusKh = 'បានត្រឡប់ទៅហាង';
    else if (p.status === 'cancelled') orderStatusKh = 'បានបោះបង់';
    else if (p.status === 'in-transit') orderStatusKh = 'កំពុងដឹកជញ្ជូន';
    else if (p.status === 'pending') orderStatusKh = 'រង់ចាំដឹក';

    return {
      id: p.trackingCode || `ORD-${p.id}`,
      trackingCode: p.trackingCode || `ORD-${p.id}`,
      customerName: p.receiverName || p.customer?.name || 'អតិថិជន',
      phone: p.receiverPhone || p.customer?.phone || '',
      address: p.receiverAddress || p.customer?.address || '',
      amount: parseFloat(p.cod as any) || 0,
      currency: (p.codCurrency || 'USD').toUpperCase(),
      status: p.status || 'delivered',
      statusKh: orderStatusKh,
      deliveredAt: p.deliveredAt || p.updatedAt || dateStr,
    };
  });

  const orderIds: string[] = ordersList.length > 0
    ? ordersList.map((o) => o.trackingCode || o.id)
    : (payment.parcelIds && Array.isArray(payment.parcelIds) ? payment.parcelIds.map(String) : []);

  const settlementStatus = payment.status || 'paid';
  const statusKh = settlementStatus === 'paid' ? 'បានទូទាត់' :
                   (settlementStatus === 'pending' || settlementStatus === 'unpaid') ? 'រង់ចាំទូទាត់' :
                   settlementStatus === 'problem' ? 'មានបញ្ហា' : settlementStatus;

  let totalDeliveryFee = parseFloat(payment.deliveryFee as any || 0);
  if (!totalDeliveryFee && parcels && parcels.length > 0) {
    totalDeliveryFee = parcels.reduce((sum, p) => sum + (parseFloat(p.deliveryFee as any) || 0), 0);
  }

  let calcCodUsd = 0;
  let calcCodKhr = 0;
  if (parcels && parcels.length > 0) {
    for (const p of parcels) {
      const cod = parseFloat(p.cod as any) || 0;
      if ((p.codCurrency || 'USD').toUpperCase() === 'KHR') {
        calcCodKhr += cod;
      } else {
        calcCodUsd += cod;
      }
    }
  }

  const finalCodUsd = payment.codUSD !== undefined && payment.codUSD !== null
    ? parseFloat(payment.codUSD as any) || 0
    : (calcCodUsd > 0 ? Math.round(calcCodUsd * 100) / 100 : Math.round((rawUsd + totalDeliveryFee) * 100) / 100);

  const finalCodKhr = payment.codKHR !== undefined && payment.codKHR !== null
    ? parseFloat(payment.codKHR as any) || 0
    : (calcCodKhr > 0 ? Math.round(calcCodKhr) : Math.round(rawKhr));

  return {
    id: String(rawId),
    rawId: payment.id || 0,
    reference: String(rawId),
    branchId: branchId,
    status: settlementStatus,
    statusKh: statusKh,
    orderIds: orderIds,
    totalOrders: orderIds.length,
    total: {
      usd: rawUsd,
      usdCents: Math.round(rawUsd * 100),
      khr: Math.round(rawKhr),
    },
    totalAmount: rawUsd,
    totalAmountKhr: Math.round(rawKhr),
    deliveryFee: Math.round(totalDeliveryFee * 100) / 100,
    codUSD: finalCodUsd,
    codKHR: finalCodKhr,
    date: dateStr,
    paidAt: (settlementStatus === 'pending' || settlementStatus === 'unpaid' || settlementStatus === 'problem') ? null : paidAtStr,
    paymentDate: dateStr,
    checkedBy: checkedBy,
    note: note,
    paymentMethod: payment.paymentMethod || ((settlementStatus === 'pending' || settlementStatus === 'unpaid') ? 'Pending' : 'Bank Transfer / Cash'),
    transferRef: String(rawId),
    creator: checkedBy,
    orders: ordersList,
  };
}
