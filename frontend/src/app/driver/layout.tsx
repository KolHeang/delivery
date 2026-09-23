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
      tasks: "Packages",
      scan: "Scan",
      payments: "Payments",
      profile: "Account",
    },
    km: {
      dashboard: "ទំព័រដើម",
      tasks: "កញ្ចប់អីវ៉ាន់",
      scan: "ស្កេន",
      payments: "ការទូទាត់ប្រាក់",
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
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgba(88, 28, 135, 0.15)",
            borderTopColor: "#581c87",
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
  const isTasksActive = pathname.startsWith("/driver/tasks");
  const isScanActive = pathname.startsWith("/driver/scan");
  const isPaymentsActive =
    pathname.startsWith("/driver/payments") || pathname.startsWith("/driver/reports");
  const isProfileActive = pathname.startsWith("/driver/profile");

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
          backgroundColor: "#ffffff",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "0 20px 50px -10px rgba(15, 23, 42, 0.12)",
          paddingBottom: showBottomNav ? "68px" : "0",
        }}
      >
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>

        {/* Clean Bottom Navigation Bar with Tab 3 as SCAN */}
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
              padding: "0 8px",
              zIndex: 100,
              boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.04)",
            }}
          >
            {/* 1. Home (ទំព័រដើម) */}
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
              <MdHome size={24} />
              <span style={{ fontSize: "11px", fontWeight: isHomeActive ? "700" : "500" }}>
                {labels.dashboard}
              </span>
            </Link>

            {/* 2. Tasks / Packages (កញ្ចប់អីវ៉ាន់) */}
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
              <MdCardGiftcard size={23} />
              <span style={{ fontSize: "11px", fontWeight: isTasksActive ? "700" : "500" }}>
                {labels.tasks}
              </span>
            </Link>

            {/* 3. Scanner (ស្កេន) */}
            <Link
              href="/driver/scan"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: isScanActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                gap: "3px",
                flex: 1,
              }}
            >
              <MdQrCodeScanner size={24} />
              <span style={{ fontSize: "11px", fontWeight: isScanActive ? "700" : "500" }}>
                {labels.scan}
              </span>
            </Link>

            {/* 4. Payments (ការទូទាត់ប្រាក់) */}
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
              <MdAttachMoney size={24} />
              <span style={{ fontSize: "11px", fontWeight: isPaymentsActive ? "700" : "500" }}>
                {labels.payments}
              </span>
            </Link>

            {/* 5. Account / Profile (គណនី) */}
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
              <MdPerson size={24} />
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
