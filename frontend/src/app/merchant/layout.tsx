"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { MdHome, MdLocalShipping, MdAddCircle, MdInventory2, MdPerson } from "react-icons/md";

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
      orders: "Orders",
      newOrder: "New Order",
      pickups: "Pickups",
      profile: "Account",
    },
    km: {
      dashboard: "ទំព័រដើម",
      orders: "កញ្ចប់ផ្ញើ",
      newOrder: "បង្កើតការផ្ញើ",
      pickups: "យកទំនិញ",
      profile: "គណនី",
    },
  };

  const labels = tabLabels[lang as "en" | "km"] || tabLabels.km;

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
            border: "3px solid rgba(88, 28, 135, 0.15)",
            borderTopColor: "#581c87",
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
  const isDashboardActive = pathname === "/merchant/dashboard";
  const isOrdersActive =
    pathname.startsWith("/merchant/orders") && pathname !== "/merchant/orders/create";
  const isNewOrderActive = pathname === "/merchant/orders/create";
  const isPickupsActive = pathname.startsWith("/merchant/pickups");
  const isProfileActive = pathname.startsWith("/merchant/profile");

  const ACTIVE_COLOR = "#581c87";
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
          maxWidth: "480px",
          backgroundColor: "#f8fafc",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "0 20px 50px -10px rgba(15, 23, 42, 0.12)",
          paddingBottom: showBottomNav ? "68px" : "0",
        }}
      >
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>

        {/* 5-Tab Fixed Bottom Navigation matching Driver App Layout */}
        {showBottomNav && (
          <nav
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: "480px",
              height: "66px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              padding: "0 4px",
              zIndex: 100,
              boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.04)",
            }}
          >
            {/* 1. Dashboard / Home */}
            <Link
              href="/merchant/dashboard"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: isDashboardActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                gap: "3px",
                fontSize: "11px",
                fontWeight: isDashboardActive ? "800" : "600",
                transition: "all 0.15s ease",
                flex: 1,
                padding: "6px 0",
              }}
            >
              <MdHome size={24} color={isDashboardActive ? ACTIVE_COLOR : INACTIVE_COLOR} />
              <span>{labels.dashboard}</span>
            </Link>

            {/* 2. Orders */}
            <Link
              href="/merchant/orders"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: isOrdersActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                gap: "3px",
                fontSize: "11px",
                fontWeight: isOrdersActive ? "800" : "600",
                transition: "all 0.15s ease",
                flex: 1,
                padding: "6px 0",
              }}
            >
              <MdLocalShipping size={23} color={isOrdersActive ? ACTIVE_COLOR : INACTIVE_COLOR} />
              <span>{labels.orders}</span>
            </Link>

            {/* 3. New Order (Elevated Action Button) */}
            <Link
              href="/merchant/orders/create"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: isNewOrderActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                gap: "3px",
                fontSize: "11px",
                fontWeight: isNewOrderActive ? "800" : "600",
                transition: "all 0.15s ease",
                flex: 1,
                padding: "6px 0",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: isNewOrderActive ? "#581c87" : "#f3e8ff",
                  color: isNewOrderActive ? "#ffea60" : "#581c87",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isNewOrderActive ? "0 4px 10px rgba(88, 28, 135, 0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <MdAddCircle size={24} />
              </div>
              <span>{labels.newOrder}</span>
            </Link>

            {/* 4. Pickups */}
            <Link
              href="/merchant/pickups"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: isPickupsActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                gap: "3px",
                fontSize: "11px",
                fontWeight: isPickupsActive ? "800" : "600",
                transition: "all 0.15s ease",
                flex: 1,
                padding: "6px 0",
              }}
            >
              <MdInventory2 size={23} color={isPickupsActive ? ACTIVE_COLOR : INACTIVE_COLOR} />
              <span>{labels.pickups}</span>
            </Link>

            {/* 5. Profile */}
            <Link
              href="/merchant/profile"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: isProfileActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                gap: "3px",
                fontSize: "11px",
                fontWeight: isProfileActive ? "800" : "600",
                transition: "all 0.15s ease",
                flex: 1,
                padding: "6px 0",
              }}
            >
              <MdPerson size={24} color={isProfileActive ? ACTIVE_COLOR : INACTIVE_COLOR} />
              <span>{labels.profile}</span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
