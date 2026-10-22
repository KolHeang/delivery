'use client';

import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  variant?: 'text' | 'circular' | 'rounded' | 'rectangular';
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius,
  variant = 'rounded',
  className = '',
  style,
}: SkeletonProps) {
  const getRadius = () => {
    if (borderRadius !== undefined) return borderRadius;
    switch (variant) {
      case 'circular':
        return '50%';
      case 'text':
        return 4;
      case 'rectangular':
        return 0;
      case 'rounded':
      default:
        return 6;
    }
  };

  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius: getRadius(),
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
}

/**
 * Shimmering table rows for loading state inside <tbody>
 */
export function TableSkeleton({
  columns = 8,
  rows = 6,
  hasThumbnail = false,
}: {
  columns?: number;
  rows?: number;
  hasThumbnail?: boolean;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="skeleton-row">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={cIdx} style={{ padding: '12px 14px' }}>
              {hasThumbnail && cIdx === 1 ? (
                <Skeleton width={38} height={38} borderRadius={8} />
              ) : cIdx === 0 ? (
                <Skeleton width={24} height={14} style={{ margin: '0 auto' }} />
              ) : (
                <Skeleton
                  width={
                    cIdx === 1
                      ? '70%'
                      : cIdx === 2
                      ? '50%'
                      : cIdx === columns - 1
                      ? '60%'
                      : `${50 + ((rIdx * 17 + cIdx * 23) % 40)}%`
                  }
                  height={14}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Shimmering grid of stats cards (e.g. on Dashboard)
 */
export function StatsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 88,
          }}
        >
          <div style={{ flex: 1, marginRight: 12 }}>
            <Skeleton width="55%" height={12} style={{ marginBottom: 10 }} />
            <Skeleton width="40%" height={22} borderRadius={4} />
          </div>
          <Skeleton width={44} height={44} borderRadius={12} />
        </div>
      ))}
    </div>
  );
}

/**
 * Shimmering chart box placeholder
 */
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="card"
      style={{
        padding: 20,
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="35%" height={18} />
        <Skeleton width="20%" height={14} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: height - 90 }}>
        {[40, 65, 30, 85, 55, 95, 70, 45, 60, 80, 50, 75].map((h, i) => (
          <Skeleton
            key={i}
            width={`${100 / 12}%`}
            height={`${h}%`}
            borderRadius="4px 4px 0 0"
          />
        ))}
      </div>
      <Skeleton width="100%" height={12} />
    </div>
  );
}

/**
 * Shimmering form fields placeholder
 */
export function FormSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width="25%" height={14} />
            <Skeleton width="100%" height={38} borderRadius={6} />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <Skeleton width={80} height={36} borderRadius={6} />
          <Skeleton width={110} height={36} borderRadius={6} />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
