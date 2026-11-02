'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MdCheckCircle, MdError, MdWarning, MdInfo, MdClose } from 'react-icons/md';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const SESSION_TOAST_KEY = '__pending_global_toast__';

function detectTone(message: string): ToastTone {
  const m = message.toLowerCase();

  const isError =
    /បរាជ័យ|មិនអាច|កំហុស|រកមិនឃើញ|មិនត្រឹមត្រូវ|អស់សុពលភាព|បដិសេធការចូល|fail|error|invalid|not found|denied|unauthorized|forbidden|cannot/.test(
      m,
    );
  if (isError) return 'error';

  const isWarning =
    /សូមបញ្ចូល|សូមជ្រើសរើស|សូមបំពេញ|សូមពិនិត្យ|មិនទាន់មាន|please |required|warning|must /.test(
      m,
    );
  if (isWarning) return 'warning';

  const isSuccess =
    /ជោគជ័យ|រួចរាល់|បានរក្សាទុក|បានបង្កើត|បានកែប្រែ|បានលុប|បានអនុម័ត|បានចម្លង|បានផ្ញើ|success|successfully|saved|created|updated|deleted|approved|copied/.test(
      m,
    );
  if (isSuccess) return 'success';

  return 'info';
}

const TONE_META: Record<
  ToastTone,
  { accent: string; bgIcon: string; icon: React.ReactNode }
> = {
  success: {
    accent: '#10b981',
    bgIcon: '#ecfdf5',
    icon: <MdCheckCircle size={20} color="#10b981" />,
  },
  error: {
    accent: '#dc2626',
    bgIcon: '#fef2f2',
    icon: <MdError size={20} color="#dc2626" />,
  },
  warning: {
    accent: '#f59e0b',
    bgIcon: '#fffbeb',
    icon: <MdWarning size={20} color="#d97706" />,
  },
  info: {
    accent: '#1565D8',
    bgIcon: '#eff6ff',
    icon: <MdInfo size={20} color="#1565D8" />,
  },
};

export function showGlobalToast(message: string, tone?: ToastTone) {
  if (typeof window === 'undefined' || !message) return;
  const resolvedTone = tone || detectTone(String(message));
  window.dispatchEvent(
    new CustomEvent('app-global-toast', {
      detail: { message: String(message), tone: resolvedTone },
    }),
  );
}

export default function GlobalToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, tone?: ToastTone) => {
      const cleanMsg = String(message ?? '').trim();
      if (!cleanMsg) return;
      const resolvedTone = tone || detectTone(cleanMsg);
      const id = Date.now() + Math.floor(Math.random() * 1000);

      setToasts((prev) => [...prev.slice(-3), { id, message: cleanMsg, tone: resolvedTone }]);

      try {
        sessionStorage.setItem(
          SESSION_TOAST_KEY,
          JSON.stringify({ message: cleanMsg, tone: resolvedTone, ts: Date.now() }),
        );
      } catch {}

      setTimeout(() => {
        removeToast(id);
      }, 4200);
    },
    [removeToast],
  );

  useEffect(() => {
    // Restore toast if triggered immediately prior to a full page reload
    try {
      const raw = sessionStorage.getItem(SESSION_TOAST_KEY);
      if (raw) {
        sessionStorage.removeItem(SESSION_TOAST_KEY);
        const parsed = JSON.parse(raw);
        if (parsed?.message && Date.now() - Number(parsed.ts || 0) < 2500) {
          pushToast(parsed.message, parsed.tone);
        }
      }
    } catch {}

    const handleCustomToast = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; tone?: ToastTone }>).detail;
      if (detail?.message) {
        pushToast(detail.message, detail.tone);
      }
    };

    const originalAlert = window.alert;
    window.alert = (msg?: any) => {
      pushToast(String(msg ?? ''));
    };

    window.addEventListener('app-global-toast', handleCustomToast);
    return () => {
      window.alert = originalAlert;
      window.removeEventListener('app-global-toast', handleCustomToast);
    };
  }, [pushToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="no-print"
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 'min(400px, calc(100vw - 32px))',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((item) => {
        const meta = TONE_META[item.tone];
        return (
          <div
            key={item.id}
            role="status"
            aria-live="polite"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              background: '#ffffff',
              color: '#0f172a',
              padding: '13px 14px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              borderLeft: `4px solid ${meta.accent}`,
              boxShadow: '0 14px 30px -6px rgba(15, 23, 42, 0.16), 0 4px 10px -2px rgba(15, 23, 42, 0.06)',
              animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: meta.bgIcon,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {meta.icon}
            </div>
            <div
              style={{
                flex: 1,
                fontSize: 13.5,
                fontWeight: 600,
                lineHeight: 1.45,
                color: '#1e293b',
                paddingTop: 4,
                wordBreak: 'break-word',
              }}
            >
              {item.message}
            </div>
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              aria-label="Close notification"
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <MdClose size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

