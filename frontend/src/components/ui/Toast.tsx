import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bg = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';

  return (
    <div
      className="no-print"
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        background: bg,
        color: '#fff',
        padding: '12px 20px',
        borderRadius: 8,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        zIndex: 9999,
        fontSize: 14,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        animation: 'slideIn 0.3s ease-out',
        fontFamily: "'Kantumruy Pro', sans-serif"
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <span>{type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span>{message}</span>
    </div>
  );
}
