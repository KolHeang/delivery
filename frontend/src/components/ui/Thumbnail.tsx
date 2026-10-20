'use client';

import React, { useState, useEffect } from 'react';

export interface ThumbnailProps {
  src?: string | null;
  alt?: string;
  size?: number | 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'circle' | 'square';
  type?: 'parcel' | 'avatar' | 'merchant' | 'image';
  previewable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  badge?: string;
}

export function Thumbnail({
  src,
  alt = 'Image',
  size = 'md',
  shape = 'rounded',
  type = 'parcel',
  previewable = true,
  className = '',
  style,
  badge,
}: ThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Handle ESC key to close lightbox
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const getSizePx = (): number => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'sm':
        return 28;
      case 'lg':
        return 48;
      case 'md':
      default:
        return 38;
    }
  };

  const px = getSizePx();
  const borderRadius =
    shape === 'circle' ? '50%' : shape === 'square' ? '0px' : '8px';

  // SVG Fallback icons
  const renderFallbackIcon = () => {
    const iconSize = Math.max(14, Math.round(px * 0.45));
    switch (type) {
      case 'avatar':
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: '#64748b' }}
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        );
      case 'merchant':
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: '#2563eb' }}
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case 'parcel':
      default:
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: '#8b5cf6' }}
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        );
    }
  };

  const hasValidImage = Boolean(src && !hasError && src.trim() !== '');

  const handleClick = (e: React.MouseEvent) => {
    if (previewable && hasValidImage) {
      e.stopPropagation();
      setIsOpen(true);
    }
  };

  return (
    <>
      <div
        className={`thumbnail-container ${previewable && hasValidImage ? 'cursor-pointer hover-zoom' : ''} ${className}`}
        onClick={handleClick}
        title={hasValidImage ? (previewable ? `Click to view ${alt}` : alt) : alt}
        style={{
          width: px,
          height: px,
          minWidth: px,
          minHeight: px,
          borderRadius,
          overflow: 'hidden',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: hasValidImage ? '#f1f5f9' : '#f8fafc',
          border: '1px solid #e2e8f0',
          position: 'relative',
          userSelect: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          ...style,
        }}
      >
        {hasValidImage ? (
          <img
            src={src!}
            alt={alt}
            onError={() => setHasError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.2s ease',
            }}
          />
        ) : (
          renderFallbackIcon()
        )}

        {badge && (
          <span
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              fontSize: '9px',
              padding: '1px 3px',
              background: 'rgba(15, 23, 42, 0.75)',
              color: '#ffffff',
              borderRadius: '3px 0 0 0',
              lineHeight: 1,
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div
          className="thumbnail-lightbox-overlay"
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            className="thumbnail-lightbox-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            }}
          >
            {/* Header bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  {alt}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {src && (
                  <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '4px 8px',
                      fontSize: 11,
                      color: '#2563eb',
                      background: '#eff6ff',
                      borderRadius: 4,
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    Open original ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    color: '#64748b',
                    borderRadius: 4,
                  }}
                  title="Close (Esc)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Image body */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                backgroundColor: '#090d16',
                minWidth: 300,
                minHeight: 200,
              }}
            >
              <img
                src={src!}
                alt={alt}
                style={{
                  maxWidth: '85vw',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: 6,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Thumbnail;
