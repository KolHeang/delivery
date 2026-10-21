'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface CurrencyItem {
  id: number;
  code: string;
  name: string;
  nameKh: string | null;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
  isActive: boolean;
  decimalDigits: number;
  countryCode: string | null;
  flagEmoji: string | null;
}

export function useCurrencies(activeOnly = true) {
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCurrencies = useCallback(async () => {
    try {
      const res = await api.get(`/settings/currencies${activeOnly ? '?activeOnly=true' : ''}`);
      setCurrencies(res.data || []);
    } catch {
      // fallback to basic defaults
      setCurrencies([
        { id: 1, code: 'USD', name: 'US Dollar', nameKh: 'ដុល្លារអាមេរិក', symbol: '$', exchangeRate: 1, isBase: true, isActive: true, decimalDigits: 2, countryCode: 'US', flagEmoji: '🇺🇸' },
        { id: 2, code: 'KHR', name: 'Cambodian Riel', nameKh: 'រៀលកម្ពុជា', symbol: '៛', exchangeRate: 4050, isBase: false, isActive: true, decimalDigits: 0, countryCode: 'KH', flagEmoji: '🇰🇭' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const baseCurrency = currencies.find(c => c.isBase) || currencies[0];

  const formatAmount = (amount: number | string, currencyCode = 'USD') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0';
    const cur = currencies.find(c => c.code === currencyCode);
    const digits = cur?.decimalDigits ?? (currencyCode === 'KHR' ? 0 : 2);
    const sym = cur?.symbol || (currencyCode === 'KHR' ? '៛' : '$');

    if (currencyCode === 'KHR') {
      return `${Math.round(num).toLocaleString()} ${sym}`;
    }
    return `${sym} ${num.toFixed(digits)}`;
  };

  return {
    currencies,
    loading,
    baseCurrency,
    formatAmount,
    refetchCurrencies: fetchCurrencies,
  };
}
