"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdAccountBalanceWallet,
  MdCalendarToday,
  MdReceiptLong,
  MdChevronRight,
  MdPrint,
  MdShare,
  MdClose,
  MdCheckCircle,
  MdInventory2,
  MdHistory,
} from "react-icons/md";

export default function MerchantSettlementPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("all");

  const t = {
    title: lang === "km" ? "ការទូទាត់ និងវិក្កយបត្រ" : "Payments",
    amountToReceive: lang === "km" ? "ទឹកប្រាក់ត្រូវទទួលបាន" : "Amount to Receive",
    amountCollected: lang === "km" ? "បានទូទាត់រួច" : "Paid / Settled",
    pendingAmount: lang === "km" ? "រង់ចាំទូទាត់" : "Pending Settlement",
    paymentHistory: lang === "km" ? "ប្រវត្តិវិក្កយបត្រទូទាត់" : "Payment History",
    seeAll: lang === "km" ? "មើលទាំងអស់ >" : "See All >",
    all: lang === "km" ? "ទាំងអស់" : "All",
    thisMonth: lang === "km" ? "ខែនេះ" : "This Month",
    thisWeek: lang === "km" ? "សប្តាហ៍នេះ" : "This Week",
    receiptDetail: lang === "km" ? "ព័ត៌មានវិក្កយបត្រ" : "Payment Receipt",
    ordersInReceipt: lang === "km" ? "បញ្ជីកញ្ចប់ក្នុងវិក្កយបត្រ" : "Orders in Receipt",
    printReceipt: lang === "km" ? "បោះពុម្ពវិក្កយបត្រ" : "Print Receipt",
    shareReceipt: lang === "km" ? "ចែករំលែក" : "Share Receipt",
    close: lang === "km" ? "បិទ" : "Close",
  };

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profRes, settRes, dashRes] = await Promise.all([
        api.get("/mobile/merchant/profile").catch(() => null),
        api.get("/mobile/merchant/settlements").catch(() => null),
        api.get("/mobile/merchant/dashboard").catch(() => null),
      ]);
      if (profRes?.data) setProfile(profRes.data);
      if (dashRes?.data) setDashboardData(dashRes.data);
      if (settRes?.data) {
        const list = Array.isArray(settRes.data)
          ? settRes.data
          : settRes.data?.data || settRes.data?.results || [];
        const formattedList = list.map((rec: any, idx: number) => {
          return {
            id: rec.id || rec.reference || `REC${String(idx + 1).padStart(6, "0")}`,
            date: rec.date
              ? new Date(rec.date).toLocaleDateString()
              : rec.createdAt
              ? new Date(rec.createdAt).toLocaleDateString()
              : "N/A",
            period: rec.period || "Settlement Payout",
            totalOrders: rec.totalOrders || (rec.orders ? rec.orders.length : 0),
            totalAmount: Number(rec.totalAmount ?? rec.amount ?? 0),
            totalAmountKhr: Number(rec.totalAmountKhr ?? rec.amountKHR ?? 0),
            paymentMethod: rec.paymentMethod || "Bank Transfer / Cash",
            transferRef: rec.transferRef || rec.reference || "-",
            status: rec.status || "Paid",
            orders: rec.orders || [],
          };
        });
        setSettlements(formattedList);
      } else {
        setSettlements([]);
      }
    } catch (err) {
      console.error("Failed to load settlement data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/merchant/login");
      return;
    }
    loadData();
  }, [router]);

  const user = getUser() as any;
  const storeName = profile?.name || profile?.nameKh || user?.name || (lang === "km" ? "ហាង" : "Store");
  const storePhone = profile?.phone || user?.phone || "-";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, sans-serif",
        paddingBottom: "88px",
      }}
    >
      {/* 1. Header Bar */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "16px 20px",
          borderBottom: "1px solid #f1f5f9",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: "900",
            color: "#0f172a",
            letterSpacing: "-0.3px",
          }}
        >
          {t.title}
        </h1>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* 2. Dual Currency Financial Card (Screen 13 Match) */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)",
            borderRadius: "22px",
            padding: "20px 18px",
            color: "#ffffff",
            boxShadow: "0 8px 24px rgba(37, 99, 235, 0.25)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "#bfdbfe", fontWeight: "700", textTransform: "uppercase" }}>
              {t.amountToReceive}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "10px",
                marginTop: "4px",
              }}
            >
              <span style={{ fontSize: "24px", fontWeight: "900", letterSpacing: "-0.5px" }}>
                ៛ {(Number(dashboardData?.amountToReceiveKhr) || 0).toLocaleString()}
              </span>
              <span style={{ fontSize: "17px", fontWeight: "700", color: "#dbeafe" }}>
                / ${(Number(dashboardData?.amountToReceiveUsd) || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              paddingTop: "12px",
              borderTop: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "#bfdbfe", fontWeight: "600" }}>
                {t.amountCollected}
              </div>
              <div style={{ fontSize: "14px", fontWeight: "800", marginTop: "2px" }}>
                ៛ {(Number(dashboardData?.amountCollectedKhr) || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: "12px", color: "#93c5fd", fontWeight: "700" }}>
                ${(Number(dashboardData?.amountCollectedUsd) || 0).toFixed(2)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#fed7aa", fontWeight: "600" }}>
                {t.pendingAmount}
              </div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#fef08a", marginTop: "2px" }}>
                ៛ {(Number(dashboardData?.pendingAmountKhr) || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: "12px", color: "#fde047", fontWeight: "700" }}>
                ${(Number(dashboardData?.pendingAmountUsd) || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Filter Pills: All | This Month | This Week */}
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { key: "all", label: t.all },
            { key: "month", label: t.thisMonth },
            { key: "week", label: t.thisWeek },
          ].map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setDateFilter(pill.key)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                border: dateFilter === pill.key ? "1px solid #2563eb" : "1px solid #e2e8f0",
                backgroundColor: dateFilter === pill.key ? "#2563eb" : "#ffffff",
                color: dateFilter === pill.key ? "#ffffff" : "#475569",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* 4. Payment Receipt History List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14.5px",
              fontWeight: "800",
              color: "#334155",
            }}
          >
            <MdHistory size={18} color="#64748b" />
            <span>{t.paymentHistory}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {settlements.length === 0 ? (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "32px 20px",
                  border: "1px dashed #cbd5e1",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#f1f5f9",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdReceiptLong size={24} />
                </div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#64748b" }}>
                  {lang === "km" ? "មិនទាន់មានប្រវត្តិវិក្កយបត្រទូទាត់នៅឡើយទេ" : "No payment receipts yet"}
                </div>
              </div>
            ) : (
              settlements.map((rec: any, idx: number) => {
                const recId = rec.receiptNumber || rec.code || rec.id || `REC${idx + 1}`;
                const isPaid = String(rec.status || "").toLowerCase() === "paid";
                const statusLabel = isPaid
                  ? lang === "km"
                    ? "បានទូទាត់"
                    : "Paid"
                  : lang === "km"
                  ? "រង់ចាំ"
                  : "Pending";
                const totalAmt = Number(rec.totalAmount ?? rec.totalAmountUsd ?? rec.amount ?? 0);
                const totalAmtKhr = Number(rec.totalAmountKhr ?? rec.amountKHR ?? 0);
                const orderCount = rec.totalOrders || (Array.isArray(rec.orders) ? rec.orders.length : (Array.isArray(rec.parcels) ? rec.parcels.length : 0));
                const dateStr = rec.date || (rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : "");

                return (
                  <div
                    key={rec.id || idx}
                    onClick={() => router.push(`/merchant/settlement/${rec.id || rec.reference}`)}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "18px",
                      padding: "16px",
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "12px",
                          backgroundColor: "#eff6ff",
                          color: "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MdReceiptLong size={22} />
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
                            #{recId}
                          </span>
                          <span
                            style={{
                              backgroundColor: isPaid ? "#dcfce7" : "#fef3c7",
                              color: isPaid ? "#15803d" : "#b45309",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "800",
                            }}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>
                          {dateStr} • {orderCount} {lang === "km" ? "កញ្ចប់" : "Orders"}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "16px", fontWeight: "900", color: "#16a34a" }}>
                        +${totalAmt.toFixed(2)}
                      </div>
                      {totalAmtKhr > 0 && (
                        <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", marginTop: "2px" }}>
                          ៛ {totalAmtKhr.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
