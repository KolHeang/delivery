export interface CatalogCurrency {
  code: string;
  name: string;
  nameKh: string;
  symbol: string;
  countryCode: string;
  flagEmoji: string;
  decimalDigits: number;
  defaultRate: number;
}

export const WORLD_CURRENCIES: CatalogCurrency[] = [
  { code: 'USD', name: 'US Dollar', nameKh: 'ដុល្លារអាមេរិក', symbol: '$', countryCode: 'US', flagEmoji: '🇺🇸', decimalDigits: 2, defaultRate: 1.0 },
  { code: 'KHR', name: 'Cambodian Riel', nameKh: 'រៀលកម្ពុជា', symbol: '៛', countryCode: 'KH', flagEmoji: '🇰🇭', decimalDigits: 0, defaultRate: 4050.0 },
  { code: 'THB', name: 'Thai Baht', nameKh: 'បាតថៃ', symbol: '฿', countryCode: 'TH', flagEmoji: '🇹🇭', decimalDigits: 2, defaultRate: 33.62 },
  { code: 'EUR', name: 'Euro', nameKh: 'អឺរ៉ូ', symbol: '€', countryCode: 'EU', flagEmoji: '🇪🇺', decimalDigits: 2, defaultRate: 0.89 },
  { code: 'CNY', name: 'Chinese Yuan', nameKh: 'យ័នចិន', symbol: '¥', countryCode: 'CN', flagEmoji: '🇨🇳', decimalDigits: 2, defaultRate: 6.69 },
  { code: 'VND', name: 'Vietnamese Dong', nameKh: 'ដុងវៀតណាម', symbol: '₫', countryCode: 'VN', flagEmoji: '🇻🇳', decimalDigits: 0, defaultRate: 25800.0 },
  { code: 'SGD', name: 'Singapore Dollar', nameKh: 'ដុល្លារសិង្ហបុរី', symbol: 'S$', countryCode: 'SG', flagEmoji: '🇸🇬', decimalDigits: 2, defaultRate: 1.28 },
  { code: 'JPY', name: 'Japanese Yen', nameKh: 'យេនជប៉ុន', symbol: '¥', countryCode: 'JP', flagEmoji: '🇯🇵', decimalDigits: 0, defaultRate: 158.0 },
  { code: 'GBP', name: 'British Pound', nameKh: 'ផោនអង់គ្លេស', symbol: '£', countryCode: 'GB', flagEmoji: '🇬🇧', decimalDigits: 2, defaultRate: 0.75 },
  { code: 'AUD', name: 'Australian Dollar', nameKh: 'ដុល្លារអូស្ត្រាលី', symbol: 'A$', countryCode: 'AU', flagEmoji: '🇦🇺', decimalDigits: 2, defaultRate: 1.48 },
  { code: 'CAD', name: 'Canadian Dollar', nameKh: 'ដុល្លារកាណាដា', symbol: 'C$', countryCode: 'CA', flagEmoji: '🇨🇦', decimalDigits: 2, defaultRate: 1.35 },
  { code: 'CHF', name: 'Swiss Franc', nameKh: 'ហ្វ្រង់ស្វីស', symbol: 'CHF', countryCode: 'CH', flagEmoji: '🇨🇭', decimalDigits: 2, defaultRate: 0.84 },
  { code: 'HKD', name: 'Hong Kong Dollar', nameKh: 'ដុល្លារហុងកុង', symbol: 'HK$', countryCode: 'HK', flagEmoji: '🇭🇰', decimalDigits: 2, defaultRate: 7.78 },
  { code: 'KRW', name: 'South Korean Won', nameKh: 'វ៉ុនកូរ៉េខាងត្បូង', symbol: '₩', countryCode: 'KR', flagEmoji: '🇰🇷', decimalDigits: 0, defaultRate: 1350.0 },
  { code: 'MYR', name: 'Malaysian Ringgit', nameKh: 'រីងហ្គីតម៉ាឡេស៊ី', symbol: 'RM', countryCode: 'MY', flagEmoji: '🇲🇾', decimalDigits: 2, defaultRate: 4.22 },
  { code: 'PHP', name: 'Philippine Peso', nameKh: 'ប៉េសូហ្វីលីពីន', symbol: '₱', countryCode: 'PH', flagEmoji: '🇵🇭', decimalDigits: 2, defaultRate: 56.5 },
  { code: 'IDR', name: 'Indonesian Rupiah', nameKh: 'រូព្យ៉ាឥណ្ឌូណេស៊ី', symbol: 'Rp', countryCode: 'ID', flagEmoji: '🇮🇩', decimalDigits: 0, defaultRate: 15400.0 },
  { code: 'INR', name: 'Indian Rupee', nameKh: 'រូពីឥណ្ឌា', symbol: '₹', countryCode: 'IN', flagEmoji: '🇮🇳', decimalDigits: 2, defaultRate: 83.5 },
  { code: 'TWD', name: 'New Taiwan Dollar', nameKh: 'ដុល្លារតៃវ៉ាន់', symbol: 'NT$', countryCode: 'TW', flagEmoji: '🇹🇼', decimalDigits: 2, defaultRate: 31.8 },
  { code: 'LAK', name: 'Lao Kip', nameKh: 'គីបឡាវ', symbol: '₭', countryCode: 'LA', flagEmoji: '🇱🇦', decimalDigits: 0, defaultRate: 21800.0 },
  { code: 'MMK', name: 'Myanmar Kyat', nameKh: 'ក្យាតភូមា', symbol: 'K', countryCode: 'MM', flagEmoji: '🇲🇲', decimalDigits: 0, defaultRate: 2100.0 },
  { code: 'NZD', name: 'New Zealand Dollar', nameKh: 'ដុល្លារនូវែលសេឡង់', symbol: 'NZ$', countryCode: 'NZ', flagEmoji: '🇳🇿', decimalDigits: 2, defaultRate: 1.62 },
  { code: 'AED', name: 'UAE Dirham', nameKh: 'ឌៀរហាមអារ៉ាប់រួម', symbol: 'د.إ', countryCode: 'AE', flagEmoji: '🇦🇪', decimalDigits: 2, defaultRate: 3.67 },
  { code: 'SAR', name: 'Saudi Riyal', nameKh: 'រីយ៉ាល់អារ៉ាប៊ីសាអូឌីត', symbol: '﷼', countryCode: 'SA', flagEmoji: '🇸🇦', decimalDigits: 2, defaultRate: 3.75 },
  { code: 'BRL', name: 'Brazilian Real', nameKh: 'រៀលប្រេស៊ីល', symbol: 'R$', countryCode: 'BR', flagEmoji: '🇧🇷', decimalDigits: 2, defaultRate: 5.45 },
  { code: 'RUB', name: 'Russian Ruble', nameKh: 'រូបលរុស្ស៊ី', symbol: '₽', countryCode: 'RU', flagEmoji: '🇷🇺', decimalDigits: 2, defaultRate: 96.0 },
  { code: 'ZAR', name: 'South African Rand', nameKh: 'រ៉ង់អាហ្វ្រិកខាងត្បូង', symbol: 'R', countryCode: 'ZA', flagEmoji: '🇿🇦', decimalDigits: 2, defaultRate: 17.5 },
];
