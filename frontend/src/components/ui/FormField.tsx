'use client';

import React from 'react';
import { MdErrorOutline } from 'react-icons/md';

interface FormFieldProps {
  label?: React.ReactNode;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function FormField({
  label,
  required = false,
  error,
  helperText,
  className = '',
  style,
  children,
}: FormFieldProps) {
  const hasError = Boolean(error);

  return (
    <div
      className={`form-group ${hasError ? 'has-error' : ''} ${className}`}
      style={style}
    >
      {label && (
        <label className="form-label">
          {label}
          {required && <span>*</span>}
        </label>
      )}

      <div className="input-error-wrapper">
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          
          const existingClassName = (child.props as any).className || '';
          const isControl = existingClassName.includes('form-control') || child.type === 'input' || child.type === 'select' || child.type === 'textarea';
          
          return React.cloneElement(child as React.ReactElement<any>, {
            className: `${existingClassName} ${isControl && !existingClassName.includes('form-control') ? 'form-control' : ''} ${hasError ? 'is-invalid' : ''}`.trim(),
          });
        })}

        {hasError && (
          <div className="input-error-icon" title={error}>
            <MdErrorOutline size={18} />
          </div>
        )}
      </div>

      {hasError ? (
        <div className="form-error-text">{error}</div>
      ) : helperText ? (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {helperText}
        </div>
      ) : null}
    </div>
  );
}
