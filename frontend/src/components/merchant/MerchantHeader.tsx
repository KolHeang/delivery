"use client";

import React, { useEffect, useState } from "react";
import { MdNotifications } from "react-icons/md";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

interface MerchantHeaderProps {
  merchantName?: string;
  branchName?: string;
  phoneOrCode?: string;
  hasUnreadNotifications?: boolean;
  unreadCount?: number;
  onNotificationClick?: () => void;
}

export default function MerchantHeader({
  merchantName = "He Coffee",
  branchName = "សាខាកណ្តាល",
  phoneOrCode = "012 345 678",
  hasUnreadNotifications,
  unreadCount,
  onNotificationClick,
}: MerchantHeaderProps) {
  const router = useRouter();
  const [internalUnread, setInternalUnread] = useState(0);

  useEffect(() => {
    if (unreadCount !== undefined) {
      setInternalUnread(unreadCount);
      return;
    }
    if (isAuthenticated()) {
      api
        .get("/mobile/merchant/notifications/unread-count")
        .then((res) => {
          if (res?.data?.unreadCount !== undefined) {
            setInternalUnread(res.data.unreadCount);
          }
        })
        .catch(() => {});
    }
  }, [unreadCount]);

  const activeCount = unreadCount !== undefined ? unreadCount : internalUnread;
  const showBadge = hasUnreadNotifications !== undefined ? hasUnreadNotifications : activeCount > 0;

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
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
      }}
    >
      {/* Left: Purple Brand Badge + Merchant Store Info */}
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

        {/* Merchant Store Name & Branch */}
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
              {merchantName}
            </span>
            <span
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#64748b",
              }}
            >
              {branchName}
            </span>
          </div>

          {/* Subtitle: Phone / Store ID */}
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
        onClick={onNotificationClick || (() => router.push("/merchant/notifications"))}
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
        {showBadge && (
          <span
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              minWidth: activeCount > 0 ? "18px" : "8px",
              height: activeCount > 0 ? "18px" : "8px",
              padding: activeCount > 0 ? "0 4px" : "0",
              borderRadius: "10px",
              backgroundColor: "#ef4444",
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: "800",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid #ffffff",
              lineHeight: 1,
            }}
          >
            {activeCount > 0 ? (activeCount > 99 ? "99+" : activeCount) : ""}
          </span>
        )}
      </button>
    </header>
  );
}
