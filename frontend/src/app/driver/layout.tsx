"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { MdHome, MdCardGiftcard, MdQrCodeScanner, MdAttachMoney, MdPerson } from "react-icons/md";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setMounted(true);
    const authStatus = isAuthenticated();
    const user = getUser();
    setIsAuth(authStatus && user?.role === "driver");
  }, [pathname]);

  const tabLabels = {
    en: {
      dashboard: "Home",
      tasks: "Parcels",
      payments: "Settlement",
      profile: "Account",
    },
    km: {
      dashboard: "ទំព័រដើម",
      tasks: "កញ្ចប់",
      payments: "ទូទាត់ប្រាក់",
      profile: "គណនី",
    },
  };

  const labels = tabLabels[lang as "en" | "km"] || tabLabels.en;

  if (!mounted) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgba(37, 99, 235, 0.15)",
            borderTopColor: "#2563eb",
            borderRadius: "50%",
            animation: "driverSpin 0.8s ease-in-out infinite",
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes driverSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`,
          }}
        />
      </div>
    );
  }

  const isLoginPage = pathname === "/driver/login" || pathname === "/driver/auth";
  const showBottomNav = !isLoginPage && isAuth;

  // Check active routes
  const isHomeActive = pathname === "/driver/dashboard";
  const isTasksActive = pathname.startsWith("/driver/tasks") || pathname.startsWith("/driver/scan");
  const isPaymentsActive =
    pathname.startsWith("/driver/payments") ||
    pathname.startsWith("/driver/settlements") ||
    pathname.startsWith("/driver/reports");
  const isProfileActive = pathname.startsWith("/driver/profile");

  const ACTIVE_COLOR = "#2563eb";
  const INACTIVE_COLOR = "#94a3b8";

  return (
    <div
      className="mobile-layout-container"
      style={{
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        fontFamily: "'Inter', 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        className="mobile-phone-frame"
        style={{
          width: "100%",
          maxWidth: "430px",
          backgroundColor: "#f8fafc",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.35)",
          paddingBottom: showBottomNav ? "68px" : "0",
        }}
      >
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>

        {/* 4 Bottom Navigation Bar matching design */}
        {showBottomNav && (
          <nav
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: "430px",
              height: "64px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              padding: "0 10px",
              zIndex: 100,
              boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.04)",
            }}
          >
            {/* 1. Home */}
            <Link
              href="/driver/dashboard"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: isHomeActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                gap: "3px",
                flex: 1,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span style={{ fontSize: "11px", fontWeight: isHomeActive ? "700" : "500" }}>
                {labels.dashboard}
              </span>
            </Link>

            {/* 2. Task / Parcels */}
            <Link
              href="/driver/tasks"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: isTasksActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                gap: "3px",
                flex: 1,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 22 12 12 22 2 12" />
              </svg>
              <span style={{ fontSize: "11px", fontWeight: isTasksActive ? "700" : "500" }}>
                {labels.tasks}
              </span>
            </Link>

            {/* 3. Payment / Settlement */}
            <Link
              href="/driver/payments"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: isPaymentsActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                gap: "3px",
                flex: 1,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <rect x="8.5" y="8.5" width="7" height="7" fill="currentColor" stroke="none" />
              </svg>
              <span style={{ fontSize: "11px", fontWeight: isPaymentsActive ? "700" : "500" }}>
                {labels.payments}
              </span>
            </Link>

            {/* 4. Profile / Account */}
            <Link
              href="/driver/profile"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: isProfileActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                gap: "3px",
                flex: 1,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
              <span style={{ fontSize: "11px", fontWeight: isProfileActive ? "700" : "500" }}>
                {labels.profile}
              </span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
