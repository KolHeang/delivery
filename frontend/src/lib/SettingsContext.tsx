'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '@/lib/api';

export interface GeneralSettings {
  currency: string;
  khrRate: number;
  timezone: string;
  taxRate: number;
}

interface SettingsContextType extends GeneralSettings {
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: GeneralSettings = {
  currency: 'USD',
  khrRate: 4100,
  timezone: 'Asia/Phnom_Penh',
  taxRate: 0.10,
};

const SettingsContext = createContext<SettingsContextType>({
  ...DEFAULT_SETTINGS,
  loading: false,
  refreshSettings: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GeneralSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('app-general-settings');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return DEFAULT_SETTINGS;
  });
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings/general');
      const list = res.data || [];
      const map: Record<string, string> = {};
      list.forEach((item: any) => {
        if (item && item.key) {
          map[item.key] = item.value;
        }
      });

      const updated: GeneralSettings = {
        currency: map['currency'] || DEFAULT_SETTINGS.currency,
        khrRate: map['khrRate'] ? parseFloat(map['khrRate']) : DEFAULT_SETTINGS.khrRate,
        timezone: map['timezone'] || DEFAULT_SETTINGS.timezone,
        taxRate: map['taxRate'] ? parseFloat(map['taxRate']) : DEFAULT_SETTINGS.taxRate,
      };

      setSettings(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app-general-settings', JSON.stringify(updated));
      }
    } catch {
      // Keep defaults/cached on error or unauthenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        loading,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
