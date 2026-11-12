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

const TELEGRAM_REASON_KH_MAP: Record<string, string> = {
  'customer requested to reschedule': 'ភ្ញៀវសុំពន្យារពេល',
  reschedule: 'ភ្ញៀវសុំពន្យារពេល',
  'phone unreachable': 'ទូរស័ព្ទមិនអាចទាក់ទងបាន',
  'no answer': 'ទូរស័ព្ទមិនអាចទាក់ទងបាន',
  'cannot contact customer': 'ទាក់ទងភ្ញៀវមិនបាន',
  'wrong address': 'អាសយដ្ឋានមិនត្រឹមត្រូវ',
  'invalid address': 'អាសយដ្ឋានមិនត្រឹមត្រូវ',
  'customer not at home': 'ភ្ញៀវមិននៅផ្ទះ',
  'not at home': 'ភ្ញៀវមិននៅផ្ទះ',
  'customer refused': 'ភ្ញៀវបដិសេធមិនទទួល',
  refused: 'ភ្ញៀវបដិសេធមិនទទួល',
  'customer cancelled': 'ភ្ញៀវសុំបោះបង់',
  'cancelled by customer': 'ភ្ញៀវសុំបោះបង់',
  duplicate: 'កញ្ចប់ស្ទួន',
};

function translateReasonTagKh(rawReason: string): string {
  const key = rawReason.trim().toLowerCase();
  return TELEGRAM_REASON_KH_MAP[key] || rawReason.trim();
}

export function formatTelegramParcelNote(
  note?: string | null,
  status?: string | null,
  maxLength?: number,
): string {
  let cleaned = (cleanParcelNote(note) || '').trim();
  if (!cleaned) return '';

  // Flatten multiline notes cleanly so batch items don't break awkwardly
  cleaned = cleaned.replace(/\s*\r?\n+\s*/g, ' — ').trim();

  if (status === 'delivered') {
    // Strip stale failure [Reason: ...] tags left from prior attempts
    const reasonMatch = cleaned.match(/^\[Reason:\s*([^\]]+)\]\s*(.*)$/i);
    if (reasonMatch) {
      return '';
    }
    cleaned = cleaned.replace(/\[Reason:\s*[^\]]+\]\s*/gi, '').trim();
  } else {
    cleaned = cleaned.replace(
      /\[Reason:\s*([^\]]+)\](?:\s*(?:—\s*)?)?/gi,
      (_m, rawReason, offset: number, fullStr: string) => {
        const translated = translateReasonTagKh(String(rawReason || ''));
        if (!translated) return '';
        const matchedLen = _m.length;
        const hasMoreText = fullStr.slice(offset + matchedLen).trim().length > 0;
        return hasMoreText ? `${translated} — ` : translated;
      },
    );
    cleaned = cleaned.trim();
  }

  if (maxLength && cleaned.length > maxLength) {
    return `${cleaned.slice(0, maxLength - 3).trim()}...`;
  }
  return cleaned;
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

function formatTotalCodLine(parcels: ParcelTelegramSnapshot[]): string {
  let totalUsd = 0;
  let totalKhr = 0;
  for (const p of parcels) {
    const codVal = Number(p.cod) || 0;
    if (String(p.codCurrency || 'USD').toUpperCase() === 'KHR') {
      totalKhr += codVal;
    } else {
      totalUsd += codVal;
    }
  }
  const parts: string[] = [];
  if (totalUsd > 0 || totalKhr === 0) {
    parts.push(`<b>$ ${totalUsd.toFixed(2)}</b>`);
  }
  if (totalKhr > 0) {
    parts.push(`<b>${Math.round(totalKhr).toLocaleString()} រៀល</b>`);
  }
  return parts.join(' / ');
}

export function formatParcelCreatedTelegramMessage(
  parcel: ParcelTelegramSnapshot,
): string {
  const code = escapeTelegramHtml(
    parcel.trackingCode || (parcel.id ? `${parcel.id}` : 'N/A'),
  );
  const shopName = getMerchantDisplayName(parcel);
  const driverName = getDriverDisplayName(parcel);
  const cleanNote = formatTelegramParcelNote(parcel.note, parcel.status);
  const deliveryFee = Number(parcel.deliveryFee) || 0;

  const lines = [
    `📦 <b>កញ្ចប់ទំនិញថ្មី</b>  <code>${code}</code>`,
    `━━━━━━━━━━━━━━━━━━`,
    ...(shopName ? [`🏪 <b>ហាង:</b> ${escapeTelegramHtml(shopName)}`] : []),
    ...(parcel.pickupRequestId
      ? [`🛵 <b>ពីសំណើយក:</b> #${parcel.pickupRequestId}`]
      : []),
    ...(parcel.receiverName
      ? [`👤 <b>អតិថិជន:</b> ${escapeTelegramHtml(parcel.receiverName)}`]
      : []),
    ...(parcel.receiverPhone
      ? [`📞 <b>ទូរស័ព្ទ:</b> ${escapeTelegramHtml(parcel.receiverPhone)}`]
      : []),
    ...(parcel.receiverAddress
      ? [`📍 <b>អាសយដ្ឋាន:</b> ${escapeTelegramHtml(parcel.receiverAddress)}`]
      : []),
    `💰 <b>ប្រាក់ COD:</b> <b>${escapeTelegramHtml(formatTelegramCodAmount(parcel.cod, parcel.codCurrency))}</b>`,
    ...(deliveryFee > 0 ? [`🚚 <b>សេវាដឹក:</b> $ ${deliveryFee.toFixed(2)}`] : []),
    ...(driverName ? [`🛵 <b>អ្នកដឹក:</b> ${escapeTelegramHtml(driverName)}`] : []),
    `📊 <b>ស្ថានភាព:</b> ${escapeTelegramHtml(getParcelStatusLabelKh(parcel.status))}`,
    ...(cleanNote ? [`📝 <b>ចំណាំ:</b> <i>${escapeTelegramHtml(cleanNote)}</i>`] : []),
  ];

  return lines.join('\n');
}

export function formatParcelBatchCreatedTelegramMessage(
  parcels: ParcelTelegramSnapshot[],
): string {
  const shopNames = new Set<string>();
  for (const p of parcels) {
    const shop = getMerchantDisplayName(p);
    if (shop) shopNames.add(shop);
  }
  const singleShopName = shopNames.size === 1 ? Array.from(shopNames)[0] : '';

  const headerLines = [
    `📦 <b>បានបង្កើតកញ្ចប់ទំនិញថ្មី (${parcels.length} កញ្ចប់)</b>`,
    `━━━━━━━━━━━━━━━━━━`,
    ...(singleShopName
      ? [`🏪 <b>ហាង:</b> ${escapeTelegramHtml(singleShopName)}`]
      : shopNames.size > 1
        ? [`🏪 <b>ចំនួនហាង:</b> ${shopNames.size} ហាង`]
        : []),
    `💰 <b>សរុប COD:</b> ${formatTotalCodLine(parcels)}`,
    `━━━━━━━━━━━━━━━━━━`,
  ];

  const maxItems = 12;
  const itemBlocks: string[] = [];
  let charCount = headerLines.join('\n').length;

  for (let i = 0; i < Math.min(parcels.length, maxItems); i += 1) {
    const p = parcels[i];
    const code = escapeTelegramHtml(p.trackingCode || (p.id ? `${p.id}` : 'N/A'));
    const codText = escapeTelegramHtml(formatTelegramCodAmount(p.cod, p.codCurrency));
    const shop = singleShopName ? '' : getMerchantDisplayName(p);
    const details = [
      shop ? `🏪 ${escapeTelegramHtml(shop)}` : '',
      p.receiverPhone ? `📞 ${escapeTelegramHtml(p.receiverPhone)}` : '',
    ]
      .filter(Boolean)
      .join('  |  ');

    const blockLines = [
      `<b>${i + 1}.</b> <code>${code}</code>  •  <b>${codText}</b>`,
      ...(details ? [`└ ${details}`] : []),
    ];
    const block = blockLines.join('\n');
    if (charCount + block.length + 2 > 3500) break;
    itemBlocks.push(block);
    charCount += block.length + 2;
  }

  const remainingCount = Math.max(0, parcels.length - itemBlocks.length);
  const lines = [
    ...headerLines,
    ...(itemBlocks.length > 0 ? ['', itemBlocks.join('\n\n')] : []),
    ...(remainingCount > 0 ? ['', `... និង <b>${remainingCount} កញ្ចប់ទៀត</b>`] : []),
  ];

  return lines.join('\n');
}

export function formatParcelTerminalTelegramMessage(
  parcel: ParcelTelegramSnapshot,
  overrideNote?: string | null,
): string {
  const code = escapeTelegramHtml(
    parcel.trackingCode || (parcel.id ? `${parcel.id}` : 'N/A'),
  );
  const status = parcel.status || 'delivered';

  let header = `📦 <b>បច្ចុប្បន្នភាពកញ្ចប់ទំនិញ</b>  <code>${code}</code>`;
  if (status === 'delivered') {
    header = `✅ <b>ដឹកជញ្ជូនជោគជ័យ</b>  <code>${code}</code>`;
  } else if (status === 'failed') {
    header = `⚠️ <b>ដឹកជញ្ជូនមិនបានសម្រេច</b>  <code>${code}</code>`;
  } else if (status === 'returned') {
    header = `↩️ <b>ទំនិញត្រូវបានត្រឡប់</b>  <code>${code}</code>`;
  } else if (status === 'cancelled') {
    header = `🚫 <b>ការដឹកជញ្ជូនត្រូវបានបោះបង់</b>  <code>${code}</code>`;
  }

  const shopName = getMerchantDisplayName(parcel);
  const driverName = getDriverDisplayName(parcel);
  const cleanNote = formatTelegramParcelNote(overrideNote ?? parcel.note, status);
  const receiverLabel = parcel.receiverName
    ? `${parcel.receiverPhone || ''} (${parcel.receiverName})`.trim()
    : parcel.receiverPhone || '';

  const lines = [
    header,
    `━━━━━━━━━━━━━━━━━━`,
    ...(shopName ? [`🏪 <b>ហាង:</b> ${escapeTelegramHtml(shopName)}`] : []),
    ...(receiverLabel ? [`📞 <b>អ្នកទទួល:</b> ${escapeTelegramHtml(receiverLabel)}`] : []),
    ...(parcel.receiverAddress
      ? [`📍 <b>អាសយដ្ឋាន:</b> ${escapeTelegramHtml(parcel.receiverAddress)}`]
      : []),
    ...(driverName ? [`🛵 <b>អ្នកដឹក:</b> ${escapeTelegramHtml(driverName)}`] : []),
    `💰 <b>COD:</b> <b>${escapeTelegramHtml(formatTelegramCodAmount(parcel.cod, parcel.codCurrency))}</b>${
      parcel.paymentMethod ? ` (${escapeTelegramHtml(parcel.paymentMethod)})` : ''
    }`,
    ...(cleanNote ? [`📝 <b>មូលហេតុ/ចំណាំ:</b> <i>${escapeTelegramHtml(cleanNote)}</i>`] : []),
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

  const shopNames = new Set<string>();
  const driverNames = new Set<string>();
  const deliveredParcels: ParcelTelegramSnapshot[] = [];

  for (const p of parcels) {
    if (p.status === 'delivered') {
      deliveredCount += 1;
      deliveredParcels.push(p);
    } else if (p.status === 'failed') {
      failedCount += 1;
    } else if (p.status === 'returned') {
      returnedCount += 1;
    } else if (p.status === 'cancelled') {
      cancelledCount += 1;
    }

    const shop = getMerchantDisplayName(p);
    if (shop) shopNames.add(shop);
    const drv = getDriverDisplayName(p);
    if (drv) driverNames.add(drv);
  }

  const summaryParts: string[] = [];
  if (deliveredCount > 0) summaryParts.push(`✅ ជោគជ័យ <b>${deliveredCount}</b>`);
  if (failedCount > 0) summaryParts.push(`⚠️ មានបញ្ហា <b>${failedCount}</b>`);
  if (returnedCount > 0) summaryParts.push(`↩️ ត្រឡប់ <b>${returnedCount}</b>`);
  if (cancelledCount > 0) summaryParts.push(`🚫 បោះបង់ <b>${cancelledCount}</b>`);

  const singleShopName = shopNames.size === 1 ? Array.from(shopNames)[0] : '';
  const singleDriverName = driverNames.size === 1 ? Array.from(driverNames)[0] : '';
  const codTarget = deliveredParcels.length > 0 ? deliveredParcels : parcels;
  const codLabel =
    deliveredParcels.length > 0 && deliveredParcels.length < parcels.length
      ? '💰 <b>COD (ជោគជ័យ):</b>'
      : '💰 <b>COD សរុប:</b>';

  const headerLines = [
    `📦 <b>បច្ចុប្បន្នភាពកញ្ចប់ទំនិញ (${parcels.length} កញ្ចប់)</b>`,
    `━━━━━━━━━━━━━━━━━━`,
    ...(summaryParts.length > 0 ? [summaryParts.join('   ')] : []),
    ...(singleDriverName
      ? [`🛵 <b>អ្នកដឹក:</b> ${escapeTelegramHtml(singleDriverName)}`]
      : []),
    ...(singleShopName
      ? [`🏪 <b>ហាង:</b> ${escapeTelegramHtml(singleShopName)}`]
      : []),
    `${codLabel} ${formatTotalCodLine(codTarget)}`,
    `━━━━━━━━━━━━━━━━━━`,
  ];

  const maxItems = 15;
  const itemBlocks: string[] = [];
  let charCount = headerLines.join('\n').length;

  for (let i = 0; i < Math.min(parcels.length, maxItems); i += 1) {
    const p = parcels[i];
    const icon =
      p.status === 'delivered'
        ? '✅'
        : p.status === 'failed'
          ? '⚠️'
          : p.status === 'returned'
            ? '↩️'
            : '🚫';
    const code = escapeTelegramHtml(
      p.trackingCode || (p.id ? `${p.id}` : 'N/A'),
    );
    const codText = escapeTelegramHtml(
      formatTelegramCodAmount(p.cod, p.codCurrency),
    );
    const paySuffix =
      p.status === 'delivered' && p.paymentMethod
        ? ` (${escapeTelegramHtml(p.paymentMethod)})`
        : '';
    const shop = singleShopName ? '' : getMerchantDisplayName(p);
    const contactDetails = [
      shop ? `🏪 ${escapeTelegramHtml(shop)}` : '',
      p.receiverPhone ? `📞 ${escapeTelegramHtml(p.receiverPhone)}` : '',
    ]
      .filter(Boolean)
      .join('  •  ');
    const cleanNote = formatTelegramParcelNote(p.note, p.status, 85);

    const subLines: string[] = [];
    if (contactDetails) {
      subLines.push(`${cleanNote ? '├' : '└'} ${contactDetails}`);
    }
    if (cleanNote) {
      subLines.push(`└ 📝 <i>${escapeTelegramHtml(cleanNote)}</i>`);
    }

    const blockLines = [
      `<b>${i + 1}.</b> ${icon} <code>${code}</code>  •  <b>${codText}</b>${paySuffix}`,
      ...subLines,
    ];
    const block = blockLines.join('\n');
    if (charCount + block.length + 2 > 3500) break;
    itemBlocks.push(block);
    charCount += block.length + 2;
  }

  const remaining = Math.max(0, parcels.length - itemBlocks.length);
  const lines = [
    ...headerLines,
    ...(itemBlocks.length > 0 ? ['', itemBlocks.join('\n\n')] : []),
    ...(remaining > 0 ? ['', `... និង <b>${remaining} កញ្ចប់ទៀត</b>`] : []),
  ];

  return lines.join('\n');
}

