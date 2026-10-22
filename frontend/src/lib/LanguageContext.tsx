'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Lang, TranslationKey } from './i18n';
import Toast from '@/components/ui/Toast';

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey | string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => (translations['en'] as any)[key] || (key as string),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('app-lang') as Lang | null;
    if (stored === 'en' || stored === 'km') {
      setLangState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalAlert = window.alert;
      window.alert = (message: any) => {
        let msgStr = String(message);
        const isSuccess = msgStr.includes('✅') || msgStr.toLowerCase().includes('success') || msgStr.toLowerCase().includes('ជោគជ័យ');
        const isError = msgStr.includes('❌') || msgStr.toLowerCase().includes('failed') || msgStr.toLowerCase().includes('error') || msgStr.toLowerCase().includes('បរាជ័យ') || msgStr.toLowerCase().includes('មិនបានសម្រេច');
        
        const cleanMsg = msgStr.replace(/^[✅❌]\s*/, '').trim();

        if (lang === 'km') {
          if (cleanMsg.includes('assigned for delivery successfully')) {
            const count = cleanMsg.match(/\d+/)?.[0] || '1';
            msgStr = `បានចាត់ចែងអ្នកដឹកជញ្ជូនចំនួន ${count} កញ្ចប់ជោគជ័យ!`;
          } else if (cleanMsg.includes('pickupAssignSuccess') || cleanMsg.includes('pickup assign success') || cleanMsg.includes('assigned for pickup successfully')) {
            msgStr = `ចាត់ចែងអ្នកទៅទទួលអីវ៉ាន់បានជោគជ័យ!`;
          } else if (cleanMsg === 'Failed to load vehicle details') {
            msgStr = `មិនអាចទាញយកព័ត៌មានយានយន្តបានទេ`;
          } else if (cleanMsg === 'Error updating vehicle') {
            msgStr = `មានកំហុសក្នុងការកែប្រែព័ត៌មានយានយន្ត`;
          } else if (cleanMsg === 'Error creating vehicle') {
            msgStr = `មានកំហុសក្នុងការបង្កើតយានយន្ត`;
          } else if (cleanMsg === 'Cannot delete your own account') {
            msgStr = `មិនអាចលុបគណនីផ្ទាល់ខ្លួនរបស់អ្នកបានទេ`;
          } else if (cleanMsg === 'Error deleting staff') {
            msgStr = `មានកំហុសក្នុងការលុបបុគ្គលិក`;
          } else if (cleanMsg === 'Failed to load Userdetails.') {
            msgStr = `មិនអាចទាញយកព័ត៌មានបុគ្គលិកបានទេ`;
          } else if (cleanMsg === 'Full Name is required') {
            msgStr = `សូមបញ្ចូលឈ្មោះពេញ`;
          } else if (cleanMsg === 'Email is required for Admin/Staff') {
            msgStr = `សូមបញ្ចូលអ៊ីមែលសម្រាប់ Admin/បុគ្គលិក`;
          } else if (cleanMsg === 'Phone number is required for Driver') {
            msgStr = `សូមបញ្ចូលលេខទូរស័ព្ទសម្រាប់អ្នកដឹកជញ្ជូន`;
          } else if (cleanMsg === 'Error saving staff') {
            msgStr = `មានកំហុសក្នុងការរក្សាទុកបុគ្គលិក`;
          } else if (cleanMsg === 'Failed to save settings') {
            msgStr = `ការរក្សាទុកការកំណត់បានបរាជ័យ`;
          } else if (cleanMsg === 'Failed to settle payment.') {
            msgStr = `ការទូទាត់ប្រាក់បានបរាជ័យ`;
          } else if (cleanMsg.includes('assigned successfully')) {
            msgStr = `បានចាត់ចែងដោយជោគជ័យ!`;
          }
        } else {
          if (cleanMsg === 'ធ្វើបច្ចុប្បន្នភាពបានជោគជ័យ!') {
            msgStr = `Updated successfully!`;
          } else if (cleanMsg === 'ធ្វើបច្ចុប្បន្នភាពបានបរាជ័យ') {
            msgStr = `Failed to update`;
          } else if (cleanMsg === 'បានបង្វិលប្រតិបត្តិការដោយជោគជ័យ!') {
            msgStr = `Reversal completed successfully!`;
          } else if (cleanMsg === 'ការបង្វិលប្រតិបត្តិការបានបរាជ័យ') {
            msgStr = `Reversal failed`;
          } else if (cleanMsg === 'សូមជ្រើសរើសយ៉ាងហោចណាស់កញ្ចប់អីវ៉ាន់មួយ ឬមានកញ្ចប់អីវ៉ាន់មិនជោគជ័យដើម្បីទូទាត់។') {
            msgStr = `Please select at least one order to settle.`;
          } else if (cleanMsg === 'សូមជ្រើសរើសបុគ្គលិកដឹកជញ្ជូនជាក់លាក់ណាមួយដើម្បីធ្វើការទូទាត់ប្រាក់។') {
            msgStr = `Please select a specific driver for settlement.`;
          } else if (cleanMsg === 'រក្សាទុកការទូទាត់បានជោគជ័យ!') {
            msgStr = `Payment settled successfully!`;
          } else if (cleanMsg === 'រក្សាទុកការទូទាត់បានបរាជ័យ។') {
            msgStr = `Failed to settle payment.`;
          } else if (cleanMsg === 'បានទទួលចូលឃ្លាំងដោយជោគជ័យ!') {
            msgStr = `Received into warehouse successfully!`;
          } else if (cleanMsg === 'រក្សាទុកទិន្នន័យបានជោគជ័យ!') {
            msgStr = `Saved successfully!`;
          } else if (cleanMsg === 'មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ') {
            msgStr = `Error saving data`;
          }
        }

        setToast({
          message: msgStr.replace(/^[✅❌]\s*/, ''),
          type: isSuccess ? 'success' : isError ? 'error' : 'info'
        });
      };
      return () => {
        window.alert = originalAlert;
      };
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('app-lang', l);
  };

  const t = (key: TranslationKey | string): string => {
    return ((translations[lang] as any)?.[key] ?? (translations['en'] as any)?.[key] ?? key) as string;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
