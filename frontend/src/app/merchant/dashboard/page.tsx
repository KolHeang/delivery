"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import MerchantHeader from "@/components/merchant/MerchantHeader";
import {
  MdAddCircle,
  MdInventory2,
  MdFormatListBulleted,
  MdChevronRight,
  MdLocalShipping,
  MdCheckCircle,
  MdErrorOutline,
  MdSchedule,
} from "react-icons/md";

const dashboardTranslations = {
  en: {
    walletTitle: "Merchant Wallet & Balance",
    walletSub: "Available balance for payout / settlement",
    exchangeRateTitle: "Today's Exchange Rate",
    trackingTitle: "My Parcel Shipments Tracking",
    totalParcels: "Total Parcels",
    pendingPickup: "Pending Pickup",
    inTransit: "Out for Delivery",
    delivered: "Delivered",
    problem: "Problem / Failed",
    returned: "Returned",
    createOrderBtn: "Create New Order",
    requestPickupBtn: "Request Pickup",
    viewOrdersBtn: "View All Orders",
    quickActions: "Quick Actions",
    loading: "Loading Dashboard...",
  },
  km: {
    walletTitle: "កាបូបប្រាក់ / សមតុល្យគណនី",
    walletSub: "សមតុល្យទឹកប្រាក់ដែលអាចដក ឬទូទាត់បាន",
    exchangeRateTitle: "អត្រាប្តូរប្រាក់ថ្ងៃនេះ",
    trackingTitle: "តាមដានការផ្ញើកញ្ចប់អីវ៉ាន់របស់ខ្ញុំ",
    totalParcels: "កញ្ចប់អីវ៉ាន់សរុប",
    pendingPickup: "រង់ចាំទៅយក",
    inTransit: "កំពុងដឹកជញ្ជូន",
    delivered: "ដឹកជោគជ័យ",
    problem: "មានបញ្ហា / បរាជ័យ",
    returned: "កញ្ចប់បានត្រឡប់",
    createOrderBtn: "បង្កើតការផ្ញើថ្មី",
    requestPickupBtn: "ស្នើសុំឱ្យទៅយកទំនិញ",
    viewOrdersBtn: "មើលបញ្ជីផ្ញើទាំងអស់",
    quickActions: "សកម្មភាពរហ័ស",
    loading: "កំពុងផ្ទុកទិន្នន័យ...",
  },
};

export default function MerchantDashboardPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const t = dashboardTranslations[lang as "en" | "km"] || dashboardTranslations.km;

  const loadDashboard = async () => {
    try {
      const [dashRes, profRes, orderRes] = await Promise.all([
        api.get("/mobile/merchant/dashboard").catch(() => null),
        api.get("/mobile/merchant/profile").catch(() => null),
        api.get("/mobile/merchant/orders?limit=50").catch(() => null),
      ]);

      if (dashRes?.data) setData(dashRes.data);
      if (profRes?.data) setMerchant(profRes.data);
      if (orderRes?.data) {
        const list = Array.isArray(orderRes.data)
          ? orderRes.data
          : orderRes.data?.results || orderRes.data?.data || [];
        setOrders(list);
      }
    } catch (err) {
      console.error("Failed to load merchant dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/merchant/login");
      return;
    }
    const user = getUser();
    if (user?.role !== "merchant") {
      router.push("/merchant/login");
      return;
    }
    setMerchant(user);
    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
          backgroundColor: "#f8fafc",
          padding: "24px",
          fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            border: "3.5px solid rgba(88, 28, 135, 0.15)",
            borderTopColor: "#581c87",
            borderRadius: "50%",
            animation: "dashSpin 0.8s linear infinite",
            marginBottom: "14px",
          }}
        />
        <span style={{ fontSize: "13.5px", color: "#64748b", fontWeight: "700" }}>{t.loading}</span>
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes dashSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`,
          }}
        />
      </div>
    );
  }

  const stats = data?.statistics || {};

  // Live order counts
  const totalCount = orders.length > 0 ? orders.length : (stats.totalParcel ?? 8);
  const pendingCount =
    orders.length > 0
      ? orders.filter(
          (o: any) =>
            o.status === "pending" ||
            o.status === "created" ||
            o.status === "pickup_pending" ||
            o.status === "assigned",
        ).length
      : (stats.pendingPickup ?? 2);

  const inTransitCount =
    orders.length > 0
      ? orders.filter(
          (o: any) =>
            o.status === "in_transit" ||
            o.status === "in-transit" ||
            o.status === "out_for_delivery" ||
            o.status === "picked_up",
        ).length
      : (stats.inTransit ?? 1);

  const deliveredCount =
    orders.length > 0
      ? orders.filter((o: any) => o.status === "delivered").length
      : (stats.totalDelivered ?? 4);

  const problemCount =
    orders.length > 0
      ? orders.filter((o: any) => o.status === "failed" || o.status === "cancelled").length
      : (stats.totalProblem ?? 1);

  const returnCount =
    orders.length > 0
      ? orders.filter((o: any) => o.status === "returned").length
      : (stats.totalReturn ?? 0);

  // Financial balance
  const rawBalance = data?.balance?.amount || 0;
  const rawCurrency = data?.balance?.currency || "USD";
  const usdBalance = rawCurrency === "USD" ? rawBalance : 0;
  const khrBalance = rawCurrency === "KHR" ? rawBalance : 0;

  const displayName = merchant?.storeName || merchant?.name || merchant?.username || "He Coffee";
  const branchName =
    merchant?.branch?.name ||
    merchant?.branchName ||
    (lang === "km" ? "សាខាប៉េងហួតបឹងស្នោ" : "Peng Huoth Boeng Snor");
  const phoneOrId = merchant?.phone || merchant?.idCard || "099 865 327";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
      }}
    >
      {/* 1. Header (Matching Driver App Visual Identity) */}
      <MerchantHeader merchantName={displayName} branchName={branchName} phoneOrCode={phoneOrId} />

      {/* Main Content Area */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* 2. Yellow Balance & Wallet Summary Card */}
        <div
          style={{
            backgroundColor: "#ffea60",
            borderRadius: "20px",
            padding: "18px 18px",
            boxShadow: "0 6px 18px rgba(254, 240, 138, 0.4)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "14.5px",
                fontWeight: "800",
                color: "#1e1b4b",
                letterSpacing: "-0.2px",
              }}
            >
              {t.walletTitle}
            </span>
            <span
              style={{
                backgroundColor: "rgba(30, 27, 75, 0.08)",
                padding: "3px 8px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "700",
                color: "#1e1b4b",
              }}
            >
              COD & Payout
            </span>
          </div>

          <div
            style={{
              fontSize: "22px",
              fontWeight: "900",
              color: "#0f172a",
              letterSpacing: "-0.4px",
              display: "flex",
              alignItems: "baseline",
              gap: "6px",
            }}
          >
            <span>$ {usdBalance.toFixed(2)}</span>
            <span style={{ fontSize: "16px", color: "#64748b", fontWeight: "700" }}>|</span>
            <span>{khrBalance.toLocaleString()} ៛</span>
          </div>

          <span
            style={{
              fontSize: "12px",
              color: "#334155",
              fontWeight: "600",
              lineHeight: 1.3,
            }}
          >
            {t.walletSub}
          </span>
        </div>

        {/* 3. Today's Currency Exchange Rate Box */}
        <div
          style={{
            backgroundColor: "#ffea60",
            borderRadius: "16px",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 14px rgba(254, 240, 138, 0.3)",
          }}
        >
          <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1e1b4b" }}>
            {t.exchangeRateTitle}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: "#ffffff",
                padding: "4px 8px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "800",
                color: "#0f172a",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <span>🇺🇸</span>
              <span>USD 1.00</span>
            </div>
            <span style={{ fontWeight: "900", color: "#1e1b4b" }}>=</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: "#ffffff",
                padding: "4px 8px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "800",
                color: "#0f172a",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <span>🇰🇭</span>
              <span>4,000.00 ៛</span>
            </div>
          </div>
        </div>

        {/* 4. Quick Actions Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {/* Create Order Button */}
          <Link
            href="/merchant/orders/create"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "#581c87",
              color: "#ffffff",
              padding: "14px 14px",
              borderRadius: "16px",
              textDecoration: "none",
              boxShadow: "0 6px 16px rgba(88, 28, 135, 0.22)",
              transition: "transform 0.15s ease",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MdAddCircle size={22} color="#ffea60" />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", lineHeight: 1.2 }}>
                {t.createOrderBtn}
              </span>
              <span style={{ fontSize: "10.5px", color: "#e9d5ff", marginTop: "2px" }}>
                New Parcel ↗
              </span>
            </div>
          </Link>

          {/* Request Pickup Button */}
          <Link
            href="/merchant/pickups"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "#ffffff",
              color: "#0f172a",
              padding: "14px 14px",
              borderRadius: "16px",
              textDecoration: "none",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 3px 10px rgba(0,0,0,0.03)",
              transition: "transform 0.15s ease",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#f3e8ff",
                color: "#581c87",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MdInventory2 size={20} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", lineHeight: 1.2 }}>
                {t.requestPickupBtn}
              </span>
              <span style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                Schedule Driver ↗
              </span>
            </div>
          </Link>
        </div>

        {/* 5. Parcel Statistics Breakdown Card (Exact Match to 6-Category Grid) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            padding: "18px 18px",
            border: "1px solid #e8eff7",
            boxShadow: "0 4px 18px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
              {t.trackingTitle}
            </span>
            <Link
              href="/merchant/orders"
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: "#581c87",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              <span>{t.viewOrdersBtn}</span>
              <MdChevronRight size={16} />
            </Link>
          </div>

          {/* 6 Category Items List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* 1. Total Parcels */}
            <Link
              href="/merchant/orders"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                textDecoration: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "#f3e8ff",
                    color: "#581c87",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdFormatListBulleted size={18} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                  {t.totalParcels}
                </span>
              </div>
              <span style={{ fontSize: "15px", fontWeight: "900", color: "#581c87" }}>
                {totalCount}
              </span>
            </Link>

            {/* 2. Pending Pickup */}
            <Link
              href="/merchant/orders"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                backgroundColor: "#fffbeb",
                borderRadius: "12px",
                textDecoration: "none",
                border: "1px solid #fef3c7",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "#fef3c7",
                    color: "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdSchedule size={18} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#92400e" }}>
                  {t.pendingPickup}
                </span>
              </div>
              <span style={{ fontSize: "15px", fontWeight: "900", color: "#d97706" }}>
                {pendingCount}
              </span>
            </Link>

            {/* 3. In-Transit */}
            <Link
              href="/merchant/orders"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                backgroundColor: "#eff6ff",
                borderRadius: "12px",
                textDecoration: "none",
                border: "1px solid #dbeafe",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "#dbeafe",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdLocalShipping size={18} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e40af" }}>
                  {t.inTransit}
                </span>
              </div>
              <span style={{ fontSize: "15px", fontWeight: "900", color: "#2563eb" }}>
                {inTransitCount}
              </span>
            </Link>

            {/* 4. Delivered */}
            <Link
              href="/merchant/orders"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                backgroundColor: "#f0fdf4",
                borderRadius: "12px",
                textDecoration: "none",
                border: "1px solid #dcfce7",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "#dcfce7",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdCheckCircle size={18} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#166534" }}>
                  {t.delivered}
                </span>
              </div>
              <span style={{ fontSize: "15px", fontWeight: "900", color: "#16a34a" }}>
                {deliveredCount}
              </span>
            </Link>

            {/* 5. Problem */}
            <Link
              href="/merchant/orders"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                backgroundColor: "#fef2f2",
                borderRadius: "12px",
                textDecoration: "none",
                border: "1px solid #fee2e2",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "#fee2e2",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdErrorOutline size={18} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#991b1b" }}>
                  {t.problem}
                </span>
              </div>
              <span style={{ fontSize: "15px", fontWeight: "900", color: "#ef4444" }}>
                {problemCount}
              </span>
            </Link>

            {/* 6. Returned */}
            <Link
              href="/merchant/orders"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                textDecoration: "none",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "#e2e8f0",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdFormatListBulleted size={18} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                  {t.returned}
                </span>
              </div>
              <span style={{ fontSize: "15px", fontWeight: "900", color: "#475569" }}>
                {returnCount}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
