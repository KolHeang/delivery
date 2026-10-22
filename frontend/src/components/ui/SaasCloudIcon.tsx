'use client';

import React from 'react';

export function SaasCloudIcon({ size = 36, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {/* Cloud Outer Stroke & Fill */}
      <path
        d="M48 24.5C48 16.5 41.5 10 33.5 10C27 10 21.5 14.5 19.8 20.5C18.9 20.2 18 20 17 20C11.5 20 7 24.5 7 30C7 35.2 11 39.5 16 39.9H48C53.5 39.9 58 35.4 58 30C58 24.6 53.6 20.2 48.3 20C48.1 21.5 48 23 48 24.5Z"
        fill="#3b82f6"
        stroke="#0f172a"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />

      {/* Cloud Inner Highlight */}
      <path
        d="M46 25C46 18 40.5 12.5 33.5 12.5C28.5 12.5 24 15.5 22 20C20.5 19.5 19 19.2 17.5 19.2C13.5 19.2 10.2 22.5 10 26.5C14.5 22.5 21 20 28 20C36 20 43 23 46 27.5V25Z"
        fill="#93c5fd"
        opacity="0.9"
      />

      {/* Circuit Nodes inside Cloud */}
      <rect x="23" y="15" width="2.5" height="2.5" rx="0.8" fill="#ffffff" />
      <path d="M24.2 17.5V20.5M24.2 20.5H21M24.2 20.5H27.5V23.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="31" y="14" width="2.5" height="2.5" rx="0.8" fill="#ffffff" />
      <path d="M32.2 16.5V24" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />

      <rect x="39" y="15" width="2.5" height="2.5" rx="0.8" fill="#ffffff" />
      <path d="M40.2 17.5V20.5M40.2 20.5H43.5M40.2 20.5H37V23.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* SAAS Center Signboard */}
      <rect
        x="10.5"
        y="27.5"
        width="43"
        height="19"
        rx="5.5"
        fill="#cffafe"
        stroke="#0f172a"
        strokeWidth="2.8"
      />

      {/* SAAS Bold Typography */}
      <text
        x="32"
        y="41.8"
        fill="#0f172a"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="12.5"
        fontWeight="900"
        textAnchor="middle"
        letterSpacing="1"
      >
        SAAS
      </text>

      {/* Bottom Circuit Branches */}
      {/* Left Node */}
      <path d="M22 46.5V51.5L16.5 55.5" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14.5" cy="57" r="3.2" fill="#60a5fa" stroke="#0f172a" strokeWidth="2.4" />

      {/* Middle Node */}
      <path d="M32 46.5V56" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="58" r="3.2" fill="#60a5fa" stroke="#0f172a" strokeWidth="2.4" />

      {/* Right Node */}
      <path d="M42 46.5V51.5L47.5 55.5" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="49.5" cy="57" r="3.2" fill="#60a5fa" stroke="#0f172a" strokeWidth="2.4" />
    </svg>
  );
}
