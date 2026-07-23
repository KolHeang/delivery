import React, { useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

export const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateToDDMMYYYY = (dateStr: string | Date) => {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

interface DateInputProps {
  labelEn?: string;
  labelKh?: string;
  value: string;
  onChange: (val: string) => void;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  allowEmpty?: boolean;
}

export default function DateInput({ labelEn, labelKh, value, onChange, style, inputStyle, allowEmpty }: DateInputProps) {
  const { lang } = useLanguage();
  const [textValue, setTextValue] = React.useState('');

  React.useEffect(() => {
    if (!value && !allowEmpty) {
      onChange(getLocalDateString());
    }
  }, [value, onChange, allowEmpty]);

  React.useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setTextValue(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    } else {
      setTextValue('');
    }
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw.length > 8) raw = raw.slice(0, 8);
    
    let formatted = raw;
    if (raw.length > 2) {
      formatted = raw.slice(0, 2) + '-' + raw.slice(2);
    }
    if (raw.length > 4) {
      formatted = formatted.slice(0, 5) + '-' + formatted.slice(5);
    }
    
    setTextValue(formatted);
    
    if (raw.length === 8) {
      const d = raw.slice(0, 2);
      const m = raw.slice(2, 4);
      const y = raw.slice(4, 8);
      if (parseInt(d) <= 31 && parseInt(m) <= 12) {
        onChange(`${y}-${m}-${d}`);
      }
    } else if (raw.length === 0) {
      onChange('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {(labelEn || labelKh) && (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
          {lang === 'km' ? labelKh : labelEn}
        </span>
      )}
      <div style={{ position: 'relative', width: '100%', minWidth: inputStyle?.minWidth || 150, height: inputStyle?.height || 38, ...inputStyle }}>
        <input
          type="text"
          value={textValue}
          onChange={handleTextChange}
          placeholder="DD-MM-YYYY"
          className="form-control"
          style={{
            width: '100%',
            height: '100%',
            padding: '0 32px 0 12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: 14,
            boxSizing: 'border-box'
          }}
        />
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, cursor: 'pointer', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', pointerEvents: 'none', fontSize: 14, top: 2, right: 4 }}>📅</span>
          <input
            type="date"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            onClick={(e) => {
              if (typeof e.currentTarget.showPicker === 'function') {
                try {
                  e.currentTarget.showPicker();
                } catch (err) {
                  console.error('Error showing picker:', err);
                }
              }
            }}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 2
            }}
          />
        </div>
      </div>
    </div>
  );
}


