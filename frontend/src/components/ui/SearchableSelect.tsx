'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

export interface SearchableOption {
  value: string | number;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  name?: string;
  id?: string;
  error?: boolean;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '-- ជ្រើសរើស --',
  className = 'form-control',
  style,
  disabled = false,
  id,
  error = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; showAbove: boolean }>({
    top: 0,
    left: 0,
    width: 240,
    showAbove: false,
  });

  const triggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find(o => String(o.value) === String(value));
  }, [options, value]);

  // Update popup coordinates based on trigger element
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 270;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setCoords({
      top: showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      width: Math.max(rect.width, 220),
      showAbove,
    });
  };

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    setSearchTerm('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchTerm('');
  };

  // Close when clicking outside or scrolling
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        triggerRef.current.contains(e.target as Node)
      ) {
        return;
      }
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      handleClose();
    };

    const handleScrollOrResize = (e: Event) => {
      // Don't close if scrolling inside the dropdown menu itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      handleClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
    }
  }, [isOpen]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase().trim();
    return options.filter(o => {
      const labelMatch = o.label.toLowerCase().includes(q);
      const subMatch = o.subLabel ? o.subLabel.toLowerCase().includes(q) : false;
      const valMatch = String(o.value).toLowerCase().includes(q);
      return labelMatch || subMatch || valMatch;
    });
  }, [options, searchTerm]);

  const handleSelectOption = (val: string | number) => {
    onChange(String(val));
    handleClose();
  };

  // Extract border shorthand if present to prevent conflicting shorthand/longhand React warnings
  const {
    border,
    borderWidth = '1px',
    borderStyle = 'solid',
    borderColor: customBorderColor,
    ...restStyle
  } = style || {};

  let parsedWidth = borderWidth;
  let parsedStyle = borderStyle;
  let parsedColor = customBorderColor;

  if (border && typeof border === 'string') {
    const parts = border.trim().split(/\s+/);
    if (parts.length >= 1) parsedWidth = parts[0];
    if (parts.length >= 2) parsedStyle = parts[1];
    if (parts.length >= 3) parsedColor = parts.slice(2).join(' ');
  }

  const activeBorderColor = error
    ? '#ef4444'
    : isOpen
    ? '#3b82f6'
    : (parsedColor || '#ced4da');

  // Combine custom style with native form-control appearance using separate non-conflicting longhands
  const triggerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    backgroundColor: disabled ? '#f8fafc' : '#ffffff',
    borderWidth: parsedWidth,
    borderStyle: parsedStyle,
    borderColor: activeBorderColor,
    boxShadow: isOpen ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
    ...restStyle,
  };

  return (
    <>
      <div
        ref={triggerRef}
        id={id}
        className={className}
        style={triggerStyle}
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            handleOpen();
          }
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: selectedOption ? 'inherit' : '#9ca3af',
            fontSize: 'inherit',
            fontWeight: 'inherit',
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          stroke="#64748b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        >
          <path d="M5 7.5L10 12.5L15 7.5" />
        </svg>
      </div>

      {mounted && isOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            maxHeight: 270,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'Kantumruy Pro, Inter, sans-serif',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Search Box Header */}
          <div
            style={{
              padding: '8px',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '13px', color: '#64748b' }}>🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="វាយស្វែងរក... (Search)"
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '5px 8px',
                fontSize: '12.5px',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#1e293b',
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && filteredOptions.length > 0) {
                  e.preventDefault();
                  handleSelectOption(filteredOptions[0].value);
                }
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0 4px',
                  fontSize: '13px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Options Scrollable List */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '210px',
              padding: '4px 0',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '16px 12px',
                  textAlign: 'center',
                  fontSize: '12.5px',
                  color: '#94a3b8',
                }}
              >
                គ្មានទិន្នន័យ (No results)
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => handleSelectOption(opt.value)}
                    style={{
                      padding: '7px 12px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      color: isSelected ? '#1d4ed8' : '#1e293b',
                      fontWeight: isSelected ? 600 : 400,
                      borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
                      transition: 'background-color 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {opt.label}
                      </span>
                      {opt.subLabel && (
                        <span style={{ fontSize: '11.5px', color: '#64748b', flexShrink: 0 }}>
                          ({opt.subLabel})
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span style={{ color: '#2563eb', fontSize: '13px', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
