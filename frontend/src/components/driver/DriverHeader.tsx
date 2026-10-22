"use client";

import React from "react";
import { MdNotifications } from "react-icons/md";
import { useRouter } from "next/navigation";

interface DriverHeaderProps {
  driverName?: string;
  branchName?: string;
  phoneOrCode?: string;
  hasUnreadNotifications?: boolean;
  onNotificationClick?: () => void;
}

export default function DriverHeader({
  driverName = "mon e",
  branchName = "ប៉េងហួតបឹងស្នោ",
  phoneOrCode = "099865327",
  hasUnreadNotifications = false,
  onNotificationClick,
}: DriverHeaderProps) {
  const router = useRouter();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 18px 12px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #f1f5f9",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left: Purple Brand Badge + Driver Info */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Purple Rounded Logo Box */}
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "16px",
            backgroundColor: "#581c87",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(88, 28, 135, 0.22)",
            color: "#ffffff",
            flexShrink: 0,
          }}
        >
          {/* Stacked 3D diamond layers icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 12 12 17 22 12" />
            <polyline points="2 17 12 22 22 17" />
          </svg>
          <span
            style={{
              fontSize: "7px",
              fontWeight: "900",
              letterSpacing: "0.6px",
              marginTop: "2px",
              lineHeight: 1,
            }}
          >
            EXPRESS
          </span>
        </div>

        {/* Driver / Merchant Name & Branch */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "16px",
                fontWeight: "800",
                color: "#0f172a",
                letterSpacing: "0.2px",
              }}
            >
              {driverName}
            </span>
            <span
              style={{
                fontSize: "13.5px",
                fontWeight: "600",
                color: "#334155",
              }}
            >
              {branchName}
            </span>
          </div>

          {/* Subtitle: Phone / Driver ID */}
          <span
            style={{
              fontSize: "13px",
              color: "#64748b",
              fontWeight: "600",
              letterSpacing: "0.2px",
            }}
          >
            {phoneOrCode}
          </span>
        </div>
      </div>

      {/* Right: Purple Bell Icon */}
      <button
        onClick={onNotificationClick || (() => router.push("/driver/profile"))}
        aria-label="Notifications"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <MdNotifications size={26} color="#581c87" />
        {hasUnreadNotifications && (
          <span
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#ef4444",
            }}
          />
        )}
      </button>
    </header>
  );
}
