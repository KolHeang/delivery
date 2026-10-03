"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdHome,
  MdSearch,
  MdAdd,
  MdAccountBalanceWallet,
  MdPerson,
} from "react-icons/md";

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setMounted(true);
    const authStatus = isAuthenticated();
    const user = getUser();
    setIsAuth(Boolean(authStatus && user?.role === "merchant"));
  }, [pathname]);

  const tabLabels = {
    en: {
      dashboard: "Home",
      orders: "Search",
      newBooking: "Create",
      settlement: "Payments",
      profile: "Profile",
    },
    km: {
      dashboard: "ទំព័រដើម",
      orders: "ស្វែងរក",
      newBooking: "កក់ការផ្ញើ",
      settlement: "ទូទាត់ប្រាក់",
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
          fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgba(37, 99, 235, 0.15)",
            borderTopColor: "#2563eb",
            borderRadius: "50%",
            animation: "merchantSpin 0.8s ease-in-out infinite",
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes merchantSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`,
          }}
        />
      </div>
    );
  }

  const isLoginPage = pathname === "/merchant/login" || pathname === "/merchant/auth";
  const showBottomNav = !isLoginPage && isAuth;

  // Active route checks
  const isDashboardActive = pathname === "/merchant/dashboard" || pathname === "/merchant";
  const isOrdersActive =
    pathname.startsWith("/merchant/orders") &&
    pathname !== "/merchant/orders/create" &&
    !pathname.startsWith("/merchant/booking");
  const isCreateBookingActive =
    pathname === "/merchant/orders/create" || pathname.startsWith("/merchant/booking");
  const isSettlementActive =
    pathname.startsWith("/merchant/settlement") || pathname.startsWith("/merchant/payments");
  const isProfileActive = pathname.startsWith("/merchant/profile");

  const ACTIVE_COLOR = "#2563eb";
  const INACTIVE_COLOR = "#94a3b8";

  return (
    <div
      className="mobile-layout-container"
      style={{
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#e2e8f0",
        fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        className="mobile-phone-frame"
        style={{
          width: "100%",
          maxWidth: "430px",
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          position: "relative",
          boxShadow: "0 0 35px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Main View Area */}
        <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {children}
        </main>

        {/* 5-Tab Master Bottom Navigation (E-Express Merchant App V2) */}
        {showBottomNav && (
          <nav
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: "430px",
              height: "72px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              zIndex: 100,
              paddingBottom: "env(safe-area-inset-bottom, 8px)",
            }}
          >
            {/* Tab 1: Home */}
            <Link
              href="/merchant/dashboard"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                textDecoration: "none",
                color: isDashboardActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                flex: 1,
                padding: "8px 0",
              }}
            >
              <MdHome size={24} />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: isDashboardActive ? "800" : "600",
                }}
              >
                {labels.dashboard}
              </span>
            </Link>

            {/* Tab 2: Search / Orders */}
            <Link
              href="/merchant/orders"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                textDecoration: "none",
                color: isOrdersActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                flex: 1,
                padding: "8px 0",
              }}
            >
              <MdSearch size={24} />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: isOrdersActive ? "800" : "600",
                }}
              >
                {labels.orders}
              </span>
            </Link>

            {/* Tab 3: Center Raised Create Booking Button */}
            <Link
              href="/merchant/booking/create"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                flex: 1,
                marginTop: "-24px",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 16px rgba(37, 99, 235, 0.4)",
                  border: "4px solid #ffffff",
                  transition: "transform 0.15s ease",
                }}
              >
                <MdAdd size={28} />
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: isCreateBookingActive ? "800" : "600",
                  color: isCreateBookingActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                  marginTop: "3px",
                }}
              >
                {labels.newBooking}
              </span>
            </Link>

            {/* Tab 4: Payments / Settlement */}
            <Link
              href="/merchant/settlement"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                textDecoration: "none",
                color: isSettlementActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                flex: 1,
                padding: "8px 0",
              }}
            >
              <MdAccountBalanceWallet size={23} />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: isSettlementActive ? "800" : "600",
                }}
              >
                {labels.settlement}
              </span>
            </Link>

            {/* Tab 5: Profile */}
            <Link
              href="/merchant/profile"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                textDecoration: "none",
                color: isProfileActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                flex: 1,
                padding: "8px 0",
              }}
            >
              <MdPerson size={24} />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: isProfileActive ? "800" : "600",
                }}
              >
                {labels.profile}
              </span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
