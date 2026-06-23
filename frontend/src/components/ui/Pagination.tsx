'use client';

import React from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const { lang } = useLanguage();
  const isKh = lang === 'km';

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const getPages = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPages();
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(totalItems, currentPage * pageSize);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-card)',
      flexWrap: 'wrap',
      gap: 12,
      fontFamily: 'inherit',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }}>
      {/* Entries Info */}
      <div>
        {isKh ? (
          <span>
            បង្ហាញពី {startIndex} ដល់ {endIndex} នៃ {totalItems} ទិន្នន័យ
          </span>
        ) : (
          <span>
            Showing {startIndex} to {endIndex} of {totalItems} entries
          </span>
        )}
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Page Size Select */}
        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{isKh ? 'បង្ហាញ:' : 'Show:'}</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border)',
                outline: 'none',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 12.5,
                transition: 'border-color var(--transition-fast)'
              }}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--border)',
              background: currentPage === 1 ? 'var(--neutral-light)' : 'var(--bg-card)',
              color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast)',
              outline: 'none'
            }}
            title={isKh ? 'ទំព័រមុន' : 'Previous Page'}
          >
            <MdChevronLeft size={20} />
          </button>

          {/* Page Numbers */}
          {pages.map((p) => {
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 32,
                  height: 32,
                  padding: '0 6px',
                  borderRadius: 'var(--radius-sm)',
                  border: isActive ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  background: isActive ? 'var(--accent)' : 'var(--bg-card)',
                  color: isActive ? '#ffffff' : 'var(--text-primary)',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  outline: 'none'
                }}
              >
                {p}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--border)',
              background: currentPage === totalPages ? 'var(--neutral-light)' : 'var(--bg-card)',
              color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast)',
              outline: 'none'
            }}
            title={isKh ? 'ទំព័របន្ទាប់' : 'Next Page'}
          >
            <MdChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
