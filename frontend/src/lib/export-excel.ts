export interface ExcelExportOptions {
  title?: string;
  subtitle?: string;
  sheetName?: string;
  totalRowIndices?: number[];
}

/**
 * Resolve the active tenant brand color (--sidebar-bg) as an ARGB hex string (e.g. "FF0F766E")
 * for styling Excel headers consistently with the current theme.
 */
function getBrandArgb(): string {
  const fallback = 'FF0F766E';
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--sidebar-bg')
      .trim();
    if (!raw) return fallback;

    if (raw.startsWith('#')) {
      const hex = raw.slice(1);
      if (hex.length === 3) {
        const full = hex
          .split('')
          .map((c) => c + c)
          .join('')
          .toUpperCase();
        return `FF${full}`;
      }
      if (hex.length === 6) {
        return `FF${hex.toUpperCase()}`;
      }
    }

    const rgbMatch = raw.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (rgbMatch) {
      const toHex = (n: string) =>
        Math.max(0, Math.min(255, parseInt(n, 10)))
          .toString(16)
          .padStart(2, '0')
          .toUpperCase();
      return `FF${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
    }
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Estimate visual column width taking Khmer Unicode characters into account.
 */
function measureDisplayWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) || 0;
    // Khmer block (U+1780 - U+17FF)
    if (code >= 0x1780 && code <= 0x17ff) {
      // Subscript/diacritic marks take minimal horizontal width, base consonants slightly wider
      if (
        (code >= 0x17b6 && code <= 0x17d3) ||
        code === 0x17d2 ||
        code === 0x17dd
      ) {
        width += 0.35;
      } else {
        width += 1.25;
      }
    } else if (code > 0x2e80) {
      width += 1.6;
    } else {
      width += 1.0;
    }
  }
  return width;
}

function detectPageTitle(fallbackFilename: string): string {
  if (typeof document === 'undefined') return fallbackFilename;
  const selectors = [
    '.report-header h1',
    '.report-header h2',
    '.page-header h1',
    '.page-title',
    'main h1',
    'h1',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const txt = el?.textContent?.replace(/\s+/g, ' ').trim();
    if (txt && txt.length >= 2 && txt.length <= 120) {
      return txt;
    }
  }
  return fallbackFilename
    .replace(/\.(xlsx|csv)$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

function detectDateSubtitle(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const exportedAt = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  if (typeof document !== 'undefined') {
    const dateInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="date"]'),
    )
      .map((i) => i.value)
      .filter(Boolean);

    if (dateInputs.length >= 2) {
      return `កាលបរិច្ឆេទ / Date: ${dateInputs[0]} → ${dateInputs[1]}   |   នាំចេញ / Exported: ${exportedAt}`;
    }
    if (dateInputs.length === 1) {
      return `កាលបរិច្ឆេទ / Date: ${dateInputs[0]}   |   នាំចេញ / Exported: ${exportedAt}`;
    }
  }
  return `នាំចេញ / Exported: ${exportedAt}`;
}

function isTotalLikeRow(row: Array<string | number | null | undefined>): boolean {
  for (let i = 0; i < Math.min(3, row.length); i++) {
    const s = String(row[i] ?? '').trim().toLowerCase();
    if (
      s === 'សរុប' ||
      s.startsWith('សរុប') ||
      s === 'total' ||
      s.startsWith('total ') ||
      s.startsWith('grand total')
    ) {
      return true;
    }
  }
  return false;
}

function isNumericOrCurrencyString(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;
  // Exclude phone numbers (leading 0 with 8+ digits) and tracking codes
  if (/^0\d{7,}$/.test(trimmed)) return false;
  if (/^[A-Za-z]{2,}\d+/.test(trimmed)) return false;
  // Currency, percentages, or formatted amounts
  return (
    /^[-+]?\$?\s?[\d,]+(\.\d+)?\s?(%|៛|USD|KHR)?$/i.test(trimmed) ||
    /^[-+]?[\d,]+(\.\d+)?\s?៛$/.test(trimmed) ||
    /^\$[\d,.]+\s*\/\s*[\d,.]+/.test(trimmed)
  );
}

function isCenterHeader(header: string): boolean {
  const h = header.trim().toLowerCase();
  return (
    h === '#' ||
    h === 'no' ||
    h === 'no.' ||
    h === 'ល.រ' ||
    h.includes('កាលបរិច្ឆេទ') ||
    h.includes('date') ||
    h.includes('ថ្ងៃ') ||
    h.includes('ស្ថានភាព') ||
    h.includes('status') ||
    h.includes('រូបិយប័ណ្ណ') ||
    h.includes('currency')
  );
}

function isRightHeader(header: string): boolean {
  const h = header.trim().toLowerCase();
  return (
    h.includes('ទឹកប្រាក់') ||
    h.includes('សេវា') ||
    h.includes('តម្លៃ') ||
    h.includes('ប្រាក់') ||
    h.includes('cod') ||
    h.includes('fee') ||
    h.includes('amount') ||
    h.includes('total') ||
    h.includes('សរុប') ||
    h.includes('កម្រៃ') ||
    h.includes('commission') ||
    h.includes('ចំណូល') ||
    h.includes('ចំណាយ') ||
    h.includes('rate') ||
    h.includes('អត្រា')
  );
}

/**
 * Export tabular report data to a professionally styled native .xlsx Excel workbook
 * with tenant brand header, auto-fit columns, Khmer font (Battambang), borders,
 * zebra rows, highlighted totals, and text-safe phone/tracking numbers.
 */
export async function exportToExcel(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  options?: ExcelExportOptions,
) {
  if (typeof window === 'undefined') return;

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Delivery Management System';
  workbook.created = new Date();

  const rawSheetName = (options?.sheetName || filename)
    .replace(/\.(xlsx|csv)$/i, '')
    .replace(/[:\\/?*[\]]/g, ' ')
    .trim()
    .slice(0, 31) || 'Report';

  const sheet = workbook.addWorksheet(rawSheetName, {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.45,
        bottom: 0.45,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  const colCount = Math.max(
    headers.length,
    ...rows.map((r) => r.length),
    1,
  );
  const brandArgb = getBrandArgb();
  const fontName = 'Battambang';

  // Row 1: Report Title Banner
  const titleText = options?.title || detectPageTitle(filename);
  const titleRow = sheet.addRow([titleText]);
  sheet.mergeCells(1, 1, 1, colCount);
  titleRow.height = 30;
  const titleCell = titleRow.getCell(1);
  titleCell.font = {
    name: fontName,
    size: 14,
    bold: true,
    color: { argb: brandArgb },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 2: Subtitle (date range & exported timestamp)
  const subtitleText = options?.subtitle || detectDateSubtitle();
  const subRow = sheet.addRow([subtitleText]);
  sheet.mergeCells(2, 1, 2, colCount);
  subRow.height = 20;
  const subCell = subRow.getCell(1);
  subCell.font = {
    name: fontName,
    size: 10,
    italic: true,
    color: { argb: 'FF64748B' },
  };
  subCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 3: Spacer
  const spacerRow = sheet.addRow([]);
  spacerRow.height = 8;

  // Row 4: Styled Table Header
  const paddedHeaders = Array.from({ length: colCount }, (_, i) => headers[i] ?? '');
  const headerRow = sheet.addRow(paddedHeaders);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: brandArgb },
    };
    cell.font = {
      name: fontName,
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: brandArgb } },
      bottom: { style: 'medium', color: { argb: brandArgb } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  // Track max display width per column for auto-sizing
  const colWidths = paddedHeaders.map((h) => Math.max(8, measureDisplayWidth(String(h)) + 4));

  const totalIndexSet = new Set(options?.totalRowIndices || []);

  // Data Rows
  rows.forEach((rawRow, rowIdx) => {
    const isTotal = totalIndexSet.has(rowIdx) || isTotalLikeRow(rawRow);
    const normalizedRow = Array.from({ length: colCount }, (_, colIdx) => {
      const val = rawRow[colIdx];
      if (val === null || val === undefined) return '';
      if (typeof val === 'number') return val;
      return String(val).trim();
    });

    const excelRow = sheet.addRow(normalizedRow);
    excelRow.height = isTotal ? 26 : 23;

    const bgArgb = isTotal
      ? 'FFEFF6FF'
      : rowIdx % 2 === 1
        ? 'FFF8FAFC'
        : 'FFFFFFFF';

    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colIdx = colNumber - 1;
      const headerLabel = paddedHeaders[colIdx] || '';
      const rawVal = normalizedRow[colIdx];
      const strVal = String(rawVal ?? '');

      // Keep strings (especially phone numbers like 098765434 & tracking codes) as text so Excel never converts to 3.46E+08
      if (typeof rawVal === 'string') {
        cell.numFmt = '@';
      }

      // Measure width
      const measured = measureDisplayWidth(strVal) + 4;
      if (measured > colWidths[colIdx]) {
        colWidths[colIdx] = measured;
      }

      // Determine alignment
      let horizontal: 'left' | 'center' | 'right' = 'left';
      if (
        typeof rawVal === 'number' &&
        !isCenterHeader(headerLabel)
      ) {
        horizontal = 'right';
      } else if (isRightHeader(headerLabel) || isNumericOrCurrencyString(strVal)) {
        horizontal = 'right';
      } else if (isCenterHeader(headerLabel)) {
        horizontal = 'center';
      }

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb },
      };

      cell.font = {
        name: fontName,
        size: isTotal ? 11 : 10.5,
        bold: isTotal,
        color: { argb: isTotal ? 'FF0F172A' : 'FF1E293B' },
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal,
        wrapText: true,
      };

      cell.border = isTotal
        ? {
            top: { style: 'medium', color: { argb: brandArgb } },
            bottom: { style: 'double', color: { argb: brandArgb } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          }
        : {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
    });
  });

  // Apply auto-calculated column widths with comfortable min/max bounds
  colWidths.forEach((w, idx) => {
    const headerLabel = paddedHeaders[idx] || '';
    const isIndexCol =
      headerLabel === '#' ||
      headerLabel === 'ល.រ' ||
      headerLabel.toLowerCase() === 'no' ||
      headerLabel.toLowerCase() === 'no.';
    const minW = isIndexCol ? 7 : 11;
    const maxW = 42;
    sheet.getColumn(idx + 1).width = Math.min(maxW, Math.max(minW, Math.ceil(w)));
  });

  // Enable AutoFilter on header row (excluding total row if last)
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: colCount },
    };
  }

  // Generate & download .xlsx file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);

  const baseName = filename.replace(/\.(csv|xlsx)$/i, '');
  const safeName = `${baseName}.xlsx`;
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', safeName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Automatically extract the visible report <table> on the page (headers + rows + totals)
 * and download it as a formatted native .xlsx Excel workbook.
 */
export function exportPageTableToExcel(
  filename: string,
  options?: ExcelExportOptions,
) {
  if (typeof document === 'undefined') return;
  const table = document.querySelector('.page-content table, main table, table');
  if (!table) return;

  const extractRowCells = (tr: Element): string[] => {
    const cells: string[] = [];
    tr.querySelectorAll('th, td').forEach((cell) => {
      const text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
      const span = Math.max(
        1,
        parseInt(cell.getAttribute('colspan') || '1', 10) || 1,
      );
      cells.push(text);
      for (let i = 1; i < span; i++) cells.push('');
    });
    return cells;
  };

  const headRows = Array.from(table.querySelectorAll('thead tr'));
  const headers =
    headRows.length > 0 ? extractRowCells(headRows[headRows.length - 1]) : [];

  const bodyRows: string[][] = [];
  const totalRowIndices: number[] = [];

  Array.from(table.querySelectorAll('tbody tr')).forEach((tr) => {
    const cells = extractRowCells(tr);
    if (cells.some((c) => c !== '')) {
      bodyRows.push(cells);
    }
  });

  Array.from(table.querySelectorAll('tfoot tr')).forEach((tr) => {
    const cells = extractRowCells(tr);
    if (cells.some((c) => c !== '')) {
      totalRowIndices.push(bodyRows.length);
      bodyRows.push(cells);
    }
  });

  if (headers.length === 0 && bodyRows.length === 0) return;

  void exportToExcel(filename, headers, bodyRows, {
    ...options,
    totalRowIndices,
  });
}
