'use client';

import React from 'react';

export function FlagKm({ size = 22, style }: { size?: number; style?: React.CSSProperties }) {
  const width = size;
  const height = Math.round(size * 0.66);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 640 420"
      style={{
        borderRadius: 3,
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.2)',
        ...style,
      }}
    >
      {/* Top Blue Stripe */}
      <rect width="640" height="105" fill="#032ea6" />
      {/* Middle Red Stripe */}
      <rect y="105" width="640" height="210" fill="#e00025" />
      {/* Bottom Blue Stripe */}
      <rect y="315" width="640" height="105" fill="#032ea6" />
      
      {/* Authentic Angkor Wat Center Motif */}
      <g fill="#ffffff" transform="translate(170, 120) scale(0.65)">
        <path d="M 0 240 L 460 240 L 460 265 L 0 265 Z" />
        <path d="M 25 210 L 435 210 L 435 235 L 25 235 Z" />
        <path d="M 55 165 L 405 165 L 405 205 L 55 205 Z" />
        {/* Center Main Spire */}
        <polygon points="230,10 195,115 265,115" />
        <rect x="205" y="110" width="50" height="55" />
        {/* Left Spire */}
        <polygon points="135,55 110,135 160,135" />
        <rect x="118" y="130" width="34" height="35" />
        {/* Right Spire */}
        <polygon points="325,55 300,135 350,135" />
        <rect x="308" y="130" width="34" height="35" />
        {/* Left Wing Small Spire */}
        <polygon points="75,95 60,155 90,155" />
        <rect x="66" y="150" width="18" height="15" />
        {/* Right Wing Small Spire */}
        <polygon points="385,95 370,155 400,155" />
        <rect x="376" y="150" width="18" height="15" />
      </g>
    </svg>
  );
}

export function FlagEn({ size = 22, style }: { size?: number; style?: React.CSSProperties }) {
  const width = size;
  const height = Math.round(size * 0.66);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 640 420"
      style={{
        borderRadius: 3,
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.2)',
        ...style,
      }}
    >
      <clipPath id="uk-flag-clip">
        <rect width="640" height="420" />
      </clipPath>
      <g clipPath="url(#uk-flag-clip)">
        <path fill="#012169" d="M0 0h640v420H0z" />
        <path fill="#ffffff" d="m0 0 640 420M640 0 0 420" stroke="#ffffff" strokeWidth="65" />
        <path stroke="#c8102e" strokeWidth="26" d="m0 0 640 420M640 0 0 420" />
        <path fill="#ffffff" d="M260 0h120v420H260zM0 150h640v120H0z" />
        <path fill="#c8102e" d="M280 0h80v420H280zM0 170h640v80H0z" />
      </g>
    </svg>
  );
}

export function FlagUs({ size = 22, style }: { size?: number; style?: React.CSSProperties }) {
  const width = size;
  const height = Math.round(size * 0.66);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 640 420"
      style={{
        borderRadius: 3,
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.2)',
        ...style,
      }}
    >
      {/* 13 Stripes */}
      <rect width="640" height="420" fill="#b22234" />
      <rect y="32.3" width="640" height="32.3" fill="#ffffff" />
      <rect y="96.9" width="640" height="32.3" fill="#ffffff" />
      <rect y="161.5" width="640" height="32.3" fill="#ffffff" />
      <rect y="226.1" width="640" height="32.3" fill="#ffffff" />
      <rect y="290.7" width="640" height="32.3" fill="#ffffff" />
      <rect y="355.3" width="640" height="32.3" fill="#ffffff" />
      {/* Blue Canton */}
      <rect width="256" height="226.1" fill="#3c3b6e" />
      {/* Star dots */}
      <g fill="#ffffff" fontSize="24" textAnchor="middle">
        <text x="50" y="55">★</text>
        <text x="128" y="55">★</text>
        <text x="206" y="55">★</text>
        <text x="89" y="115">★</text>
        <text x="167" y="115">★</text>
        <text x="50" y="175">★</text>
        <text x="128" y="175">★</text>
        <text x="206" y="175">★</text>
      </g>
    </svg>
  );
}
