import { cleanParcelNote } from '../common/note.util';

export type TelegramTopicKey =
  | 'pickup'
  | 'driver_payment'
  | 'merchant_payment'
  | 'parcels';

export type TerminalParcelStatus =
  | 'delivered'
  | 'failed'
  | 'returned'
  | 'cancelled';

export const TERMINAL_PARCEL_STATUSES: ReadonlySet<string> =
  new Set<TerminalParcelStatus>([
    'delivered',
    'failed',
    'returned',
    'cancelled',
  ]);

export function isTerminalParcelStatus(
  status?: string | null,
): status is TerminalParcelStatus {
  return typeof status === 'string' && TERMINAL_PARCEL_STATUSES.has(status);
}

/**
 * Strictly parse a positive integer Telegram Forum Topic / Thread ID.
 * Returns undefined for empty, zero, negative, or non-integer values.
 */
export function normalizeTelegramThreadId(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return undefined;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Normalize a Telegram Chat ID or @username.
 */
export function normalizeTelegramChatId(chatId?: string | null): string {
  const trimmed = (chatId || '').trim();
  if (!trimmed) return '';
  if (!trimmed.match(/^-?\d+$/) && !trimmed.startsWith('@')) {
    return `@${trimmed}`;
  }
  return trimmed;
}

/**
 * Escape HTML special characters for Telegram Bot API parse_mode: 'HTML'.
 */
export function escapeTelegramHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Resolve configured Telegram Forum Topic thread ID for a known domain topic from environment variables.
 */
export function resolveEnvTelegramTopicId(
  topic: TelegramTopicKey,
  env: NodeJS.ProcessEnv = process.env,
): number | undefined {
  switch (topic) {
    case 'pickup':
      return normalizeTelegramThreadId(env.TELEGRAM_TOPIC_PICKUP);
    case 'driver_payment':
      return normalizeTelegramThreadId(env.TELEGRAM_TOPIC_DRIVER_PAYMENT);
    case 'merchant_payment':
      return normalizeTelegramThreadId(env.TELEGRAM_TOPIC_MERCHANT_PAYMENT);
    case 'parcels':
      return normalizeTelegramThreadId(env.TELEGRAM_TOPIC_PARCELS);
    default:
      return undefined;
  }
}

export interface ParcelTelegramSnapshot {
  id?: number;
  trackingCode?: string | null;
  status?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  receiverAddress?: string | null;
  cod?: number | string | null;
  codCurrency?: string | null;
  deliveryFee?: number | string | null;
  paymentMethod?: string | null;
  note?: string | null;
  pickupRequestId?: number | null;
  merchantId?: number | null;
  merchant?: { name?: string | null; nameKh?: string | null } | null;
  driver?: { name?: string | null; nameKh?: string | null; phone?: string | null } | null;
  pickupDriver?: { name?: string | null; nameKh?: string | null; phone?: string | null } | null;
}

export function formatTelegramCodAmount(
  cod?: number | string | null,
  codCurrency?: string | null,
): string {
  const amount = Number(cod) || 0;
  const currency = String(codCurrency || 'USD').toUpperCase();
  if (currency === 'KHR') {
    return `${Math.round(amount).toLocaleString()} រៀល`;
  }
  return `$ ${amount.toFixed(2)}`;
}

function getParcelStatusLabelKh(status?: string | null): string {
  switch (status) {
    case 'pending':
      return 'រង់ចាំចាត់តាំង (Pending)';
    case 'in-warehouse':
      return 'នៅក្នុងឃ្លាំង (In Warehouse)';
    case 'assigned':
      return 'បានចាត់តាំងអ្នកដឹក (Assigned)';
    case 'picked-up':
      return 'បានទទួលទំនិញ (Picked Up)';
    case 'in-transit':
      return 'កំពុងដឹកជញ្ជូន (In Transit)';
    case 'delivered':
      return 'ដឹកជញ្ជូនជោគជ័យ (Delivered)';
    case 'failed':
      return 'ដឹកជញ្ជូនមិនបានសម្រេច (Failed)';
    case 'returned':
      return 'ទំនិញត្រូវបានត្រឡប់ (Returned)';
    case 'cancelled':
      return 'ត្រូវបានបោះបង់ (Cancelled)';
    default:
      return String(status || 'Pending');
  }
}

function getMerchantDisplayName(parcel: ParcelTelegramSnapshot): string {
  return (
    parcel.merchant?.nameKh ||
    parcel.merchant?.name ||
    (parcel.merchantId ? `Shop #${parcel.merchantId}` : '')
  );
}

function getDriverDisplayName(parcel: ParcelTelegramSnapshot): string {
  const drv = parcel.driver || parcel.pickupDriver;
  if (!drv) return '';
  const base = drv.nameKh || drv.name || '';
  if (!base) return '';
  return drv.phone ? `${base} (${drv.phone})` : base;
}

export function formatParcelCreatedTelegramMessage(
  parcel: ParcelTelegramSnapshot,
): string {
  const code = escapeTelegramHtml(
    parcel.trackingCode || (parcel.id ? `#${parcel.id}` : 'N/A'),
  );
  const shopName = getMerchantDisplayName(parcel);
  const driverName = getDriverDisplayName(parcel);
  const cleanNote = cleanParcelNote(parcel.note)?.trim() || '';
  const deliveryFee = Number(parcel.deliveryFee) || 0;

  const lines = [
    `📦 <b>កញ្ចប់ទំនិញថ្មី #${code}</b>`,
    ``,
    ...(shopName ? [`- 🏪 ហាង: ${escapeTelegramHtml(shopName)}`] : []),
    ...(parcel.pickupRequestId
      ? [`- 🛵 ពីសំណើយកទំនិញ: #${parcel.pickupRequestId}`]
      : []),
    ...(parcel.receiverName
      ? [`- 👤 អតិថិជន: ${escapeTelegramHtml(parcel.receiverName)}`]
      : []),
    ...(parcel.receiverPhone
      ? [`- 📞 លេខទូរស័ព្ទ: ${escapeTelegramHtml(parcel.receiverPhone)}`]
      : []),
    ...(parcel.receiverAddress
      ? [`- 📍 អាសយដ្ឋាន: ${escapeTelegramHtml(parcel.receiverAddress)}`]
      : []),
    `- 💰 ប្រាក់ COD: ${escapeTelegramHtml(formatTelegramCodAmount(parcel.cod, parcel.codCurrency))}`,
    ...(deliveryFee > 0 ? [`- 🚚 សេវាដឹក: $ ${deliveryFee.toFixed(2)}`] : []),
    ...(driverName ? [`- 🛵 អ្នកដឹកជញ្ជូន: ${escapeTelegramHtml(driverName)}`] : []),
    `- 📊 ស្ថានភាព: ${escapeTelegramHtml(getParcelStatusLabelKh(parcel.status))}`,
    ...(cleanNote ? [`- 📝 កំណត់ចំណាំ: ${escapeTelegramHtml(cleanNote)}`] : []),
  ];

  return lines.join('\n');
}

export function formatParcelBatchCreatedTelegramMessage(
  parcels: ParcelTelegramSnapshot[],
): string {
  let totalUsd = 0;
  let totalKhr = 0;
  const shopNames = new Set<string>();
  const codes: string[] = [];

  for (const p of parcels) {
    const shop = getMerchantDisplayName(p);
    if (shop) shopNames.add(shop);
    if (p.trackingCode) codes.push(p.trackingCode);

    const codVal = Number(p.cod) || 0;
    if (String(p.codCurrency || 'USD').toUpperCase() === 'KHR') {
      totalKhr += codVal;
    } else {
      totalUsd += codVal;
    }
  }

  const maxCodesToShow = 12;
  const shownCodes = codes.slice(0, maxCodesToShow).map((c) => `#${escapeTelegramHtml(c)}`);
  const remainingCount = Math.max(0, codes.length - maxCodesToShow);

  const codParts: string[] = [];
  if (totalUsd > 0 || totalKhr === 0) {
    codParts.push(`$ ${totalUsd.toFixed(2)}`);
  }
  if (totalKhr > 0) {
    codParts.push(`${Math.round(totalKhr).toLocaleString()} រៀល`);
  }

  const shopList = Array.from(shopNames);
  const shopLine =
    shopList.length === 1
      ? `- 🏪 ហាង: ${escapeTelegramHtml(shopList[0])}`
      : shopList.length > 1
        ? `- 🏪 ចំនួនហាង: ${shopList.length} ហាង (${escapeTelegramHtml(shopList.slice(0, 3).join(', '))}${shopList.length > 3 ? '...' : ''})`
        : '';

  const lines = [
    `📦 <b>បានបង្កើតកញ្ចប់ទំនិញថ្មី (${parcels.length} កញ្ចប់)</b>`,
    ``,
    ...(shopLine ? [shopLine] : []),
    `- 💰 សរុប COD: ${escapeTelegramHtml(codParts.join(' / '))}`,
    ...(shownCodes.length > 0
      ? [
          `- 🔖 លេខកូដ: ${shownCodes.join(', ')}${remainingCount > 0 ? ` ... (+${remainingCount} ទៀត)` : ''}`,
        ]
      : []),
  ];

  return lines.join('\n');
}

export function formatParcelTerminalTelegramMessage(
  parcel: ParcelTelegramSnapshot,
  overrideNote?: string | null,
): string {
  const code = escapeTelegramHtml(
    parcel.trackingCode || (parcel.id ? `#${parcel.id}` : 'N/A'),
  );
  const status = parcel.status || 'delivered';

  let header = `📦 <b>បច្ចុប្បន្នភាពកញ្ចប់ទំនិញ #${code}</b>`;
  if (status === 'delivered') {
    header = `✅ <b>ដឹកជញ្ជូនជោគជ័យ #${code}</b>`;
  } else if (status === 'failed') {
    header = `⚠️ <b>ដឹកជញ្ជូនមិនបានសម្រេច #${code}</b>`;
  } else if (status === 'returned') {
    header = `↩️ <b>ទំនិញត្រូវបានត្រឡប់ #${code}</b>`;
  } else if (status === 'cancelled') {
    header = `🚫 <b>ការដឹកជញ្ជូនត្រូវបានបោះបង់ #${code}</b>`;
  }

  const shopName = getMerchantDisplayName(parcel);
  const driverName = getDriverDisplayName(parcel);
  const cleanNote =
    cleanParcelNote(overrideNote ?? parcel.note)?.trim() || '';
  const receiverLabel = parcel.receiverName
    ? `${parcel.receiverPhone || ''} (${parcel.receiverName})`.trim()
    : parcel.receiverPhone || '';

  const lines = [
    header,
    ``,
    ...(shopName ? [`- 🏪 ហាង: ${escapeTelegramHtml(shopName)}`] : []),
    ...(receiverLabel ? [`- 📞 អ្នកទទួល: ${escapeTelegramHtml(receiverLabel)}`] : []),
    ...(parcel.receiverAddress
      ? [`- 📍 អាសយដ្ឋាន: ${escapeTelegramHtml(parcel.receiverAddress)}`]
      : []),
    ...(driverName ? [`- 🛵 អ្នកដឹកជញ្ជូន: ${escapeTelegramHtml(driverName)}`] : []),
    `- 💰 COD: ${escapeTelegramHtml(formatTelegramCodAmount(parcel.cod, parcel.codCurrency))}${
      parcel.paymentMethod ? ` (${escapeTelegramHtml(parcel.paymentMethod)})` : ''
    }`,
    ...(cleanNote ? [`- 📝 ចំណាំ/មូលហេតុ: ${escapeTelegramHtml(cleanNote)}`] : []),
  ];

  return lines.join('\n');
}

export function formatParcelBatchTerminalTelegramMessage(
  parcels: ParcelTelegramSnapshot[],
): string {
  let deliveredCount = 0;
  let failedCount = 0;
  let returnedCount = 0;
  let cancelledCount = 0;

  for (const p of parcels) {
    if (p.status === 'delivered') deliveredCount += 1;
    else if (p.status === 'failed') failedCount += 1;
    else if (p.status === 'returned') returnedCount += 1;
    else if (p.status === 'cancelled') cancelledCount += 1;
  }

  const summaryParts: string[] = [];
  if (deliveredCount > 0) summaryParts.push(`✅ ជោគជ័យ ${deliveredCount}`);
  if (failedCount > 0) summaryParts.push(`⚠️ មានបញ្ហា ${failedCount}`);
  if (returnedCount > 0) summaryParts.push(`↩️ ត្រឡប់ ${returnedCount}`);
  if (cancelledCount > 0) summaryParts.push(`🚫 បោះបង់ ${cancelledCount}`);

  const maxItems = 15;
  const itemLines = parcels.slice(0, maxItems).map((p) => {
    const icon =
      p.status === 'delivered'
        ? '✅'
        : p.status === 'failed'
          ? '⚠️'
          : p.status === 'returned'
            ? '↩️'
            : '🚫';
    const code = escapeTelegramHtml(
      p.trackingCode || (p.id ? `#${p.id}` : 'N/A'),
    );
    const shop = getMerchantDisplayName(p);
    const cleanNote = cleanParcelNote(p.note)?.trim() || '';
    const extra = [
      p.receiverPhone ? escapeTelegramHtml(p.receiverPhone) : '',
      shop ? escapeTelegramHtml(shop) : '',
    ]
      .filter(Boolean)
      .join(' • ');
    return `• ${icon} #${code}${extra ? ` (${extra})` : ''}${cleanNote ? ` — ${escapeTelegramHtml(cleanNote)}` : ''}`;
  });
  const remaining = Math.max(0, parcels.length - maxItems);

  const lines = [
    `📦 <b>បច្ចុប្បន្នភាពកញ្ចប់ទំនិញ (${parcels.length} កញ្ចប់)</b>`,
    ...(summaryParts.length > 0 ? [summaryParts.join(' | ')] : []),
    ``,
    ...itemLines,
    ...(remaining > 0 ? [`... និង ${remaining} កញ្ចប់ទៀត`] : []),
  ];

  return lines.join('\n');
}

