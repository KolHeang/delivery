"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdReceiptLong,
  MdCalendarToday,
  MdCheckCircle,
  MdErrorOutline,
  MdAssignmentReturn,
  MdAttachMoney,
  MdAccountBalanceWallet,
  MdChevronRight,
  MdClose,
  MdHistory,
  MdInfoOutline,
} from "react-icons/md";

export default function DriverPaymentsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState({
    total: 24,
    delivered: 18,
    failed: 4,
    returned: 2,
    feePerParcel: 1.0,
    totalFee: 24.0,
    deduction: 2.0,
    netTotal: 22.0,
    status: "Pending", // "Pending" | "Completed"
  });

  const t = {
    title: lang === "km" ? "ការទូទាត់" : "Payment",
    dailyInvoice: lang === "km" ? "វិក្កយបត្រដឹកជញ្ជូនប្រចាំថ្ងៃ" : "Daily Delivery Invoice",
    completed: lang === "km" ? "បានបញ្ចប់" : "Completed",
    pending: lang === "km" ? "រង់ចាំទូទាត់" : "Pending",
    riderName: lang === "km" ? "ឈ្មោះអ្នកដឹក" : "Rider Name",
    riderId: lang === "km" ? "អត្តលេខ" : "Rider ID",
    total: lang === "km" ? "សរុប" : "Total",
    delivered: lang === "km" ? "បានដឹក" : "Delivered",
    failed: lang === "km" ? "មិនបានសម្រេច" : "Failed",
    returned: lang === "km" ? "បានប្រគល់មកវិញ" : "Returned",
    deliveryFee: lang === "km" ? "ថ្លៃឈ្នួលដឹកក្នុង ១ កញ្ចប់" : "Delivery Fee",
    totalFee: lang === "km" ? "ថ្លៃដឹកសរុប" : "Total",
    deduction: lang === "km" ? "កាត់កង / ពិន័យ" : "Deduction",
    netTotal: lang === "km" ? "ទឹកប្រាក់ទូទាត់សុទ្ធ" : "Net Total Amount",
    paymentStatus: lang === "km" ? "ស្ថានភាពទូទាត់" : "Payment Status",
    history: lang === "km" ? "ប្រវត្តិវិក្កយបត្រកន្លងមក" : "Invoice History",
    selectDate: lang === "km" ? "ជ្រើសរើសកាលបរិច្ឆេទ" : "Select Date",
    today: lang === "km" ? "ថ្ងៃនេះ" : "Today",
    close: lang === "km" ? "បិទ" : "Close",
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [profRes, dashRes, taskRes] = await Promise.all([
        api.get("/mobile/driver/profile").catch(() => null),
        api.get("/mobile/driver/dashboard?period=all").catch(() => null),
        api.get("/mobile/driver/tasks").catch(() => null),
      ]);

      if (profRes?.data) {
        setProfile(profRes.data?.data || profRes.data);
      }

      let taskList: any[] = [];
      if (taskRes?.data) {
        taskList = Array.isArray(taskRes.data)
          ? taskRes.data
          : taskRes.data?.results || taskRes.data?.data || [];
      }

      // Calculate dynamic stats from actual tasks if available
      if (taskList.length > 0) {
        const deliveredCount = taskList.filter(
          (t) => t.status === "delivered" || t.deliveryStatus === "delivered"
        ).length;
        const failedCount = taskList.filter(
          (t) => t.status === "failed" || t.status === "problem" || t.deliveryStatus === "failed"
        ).length;
        const returnedCount = taskList.filter(
          (t) => t.status === "returned" || t.deliveryStatus === "returned"
        ).length;
        const totalCount = taskList.length;

        const fee = 1.0;
        const subtotal = totalCount * fee;
        const ded = failedCount > 0 ? failedCount * 0.5 : 0;
        const net = Math.max(0, subtotal - ded);

        setDailyStats({
          total: totalCount,
          delivered: deliveredCount,
          failed: failedCount,
          returned: returnedCount,
          feePerParcel: fee,
          totalFee: subtotal,
          deduction: ded,
          netTotal: net,
          status: "Pending",
        });
      }

      // Populate history invoices
      setInvoices([
        {
          id: "INV-20241222",
          date: "Sun, 22 Dec 2024",
          totalParcels: 28,
          delivered: 26,
          netAmount: 26.0,
          status: "Completed",
        },
        {
          id: "INV-20241221",
          date: "Sat, 21 Dec 2024",
          totalParcels: 32,
          delivered: 30,
          netAmount: 30.0,
          status: "Completed",
        },
        {
          id: "INV-20241220",
          date: "Fri, 20 Dec 2024",
          totalParcels: 20,
          delivered: 19,
          netAmount: 18.5,
          status: "Completed",
        },
      ]);
    } catch (err) {
      console.error("Failed to load driver payment data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/driver/login");
      return;
    }
    loadData();
  }, [router]);

  const user = getUser() as any;
  const riderName =
    profile?.name || user?.name || user?.username || "Sophal Rider";
  const riderCode =
    profile?.code || (profile?.id ? `DRV-${String(profile.id).padStart(3, "0")}` : "RDR001");

  const formattedSelectedDate = (() => {
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  })();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, sans-serif",
        paddingBottom: "90px",
        maxWidth: "430px",
        margin: "0 auto",
        boxShadow: "0 0 25px rgba(0,0,0,0.05)",
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: "800",
            color: "#0f172a",
            letterSpacing: "-0.3px",
          }}
        >
          {t.title}
        </h1>

        {/* Date Selector Pill */}
        <button
          onClick={() => setShowCalendarModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#eff6ff",
            color: "#2563eb",
            border: "1px solid #dbeafe",
            borderRadius: "20px",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          <MdCalendarToday size={14} />
          <span>{formattedSelectedDate}</span>
        </button>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* 2. Main Daily Delivery Invoice Card (Screen 8 Match) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            padding: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Card Header: Title & Completed Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #f1f5f9",
              paddingBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: "#eff6ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2563eb",
                }}
              >
                <MdReceiptLong size={20} />
              </div>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "800",
                  color: "#0f172a",
                }}
              >
                {t.dailyInvoice}
              </span>
            </div>

            <span
              style={{
                backgroundColor: "#dcfce7",
                color: "#15803d",
                padding: "4px 10px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: "800",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              {t.completed}
            </span>
          </div>

          {/* Rider Info Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "13.5px",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                {t.riderName}
              </div>
              <div style={{ fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
                {riderName}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                {t.riderId}
              </div>
              <div
                style={{
                  fontWeight: "800",
                  color: "#2563eb",
                  marginTop: "2px",
                  fontFamily: "monospace",
                  fontSize: "13px",
                }}
              >
                {riderCode}
              </div>
            </div>
          </div>

          {/* 4 Metrics Strip */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              borderRadius: "14px",
              padding: "12px 8px",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "4px",
              textAlign: "center",
              border: "1px solid #f1f5f9",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>{t.total}</div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "900",
                  color: "#0f172a",
                  marginTop: "2px",
                }}
              >
                {dailyStats.total}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700" }}>
                {t.delivered}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "900",
                  color: "#16a34a",
                  marginTop: "2px",
                }}
              >
                {dailyStats.delivered}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#ef4444", fontWeight: "700" }}>{t.failed}</div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "900",
                  color: "#ef4444",
                  marginTop: "2px",
                }}
              >
                {dailyStats.failed}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#8b5cf6", fontWeight: "700" }}>
                {t.returned}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "900",
                  color: "#8b5cf6",
                  marginTop: "2px",
                }}
              >
                {dailyStats.returned}
              </div>
            </div>
          </div>

          {/* Breakdown Lines */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "13.5px",
              padding: "0 2px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
              <span>{t.deliveryFee}</span>
              <span style={{ fontWeight: "700", color: "#0f172a" }}>
                ${dailyStats.feePerParcel.toFixed(2)}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
              <span>{t.totalFee}</span>
              <span style={{ fontWeight: "700", color: "#0f172a" }}>
                ${dailyStats.totalFee.toFixed(2)}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
              <span>{t.deduction}</span>
              <span style={{ fontWeight: "700", color: "#ef4444" }}>
                -${dailyStats.deduction.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Highlighted Net Total Amount Box */}
          <div
            style={{
              backgroundColor: "#eff6ff",
              border: "1.5px dashed #93c5fd",
              borderRadius: "14px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "#1e40af", fontWeight: "700" }}>
                {t.netTotal}
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "900",
                  color: "#1d4ed8",
                  letterSpacing: "-0.5px",
                  marginTop: "2px",
                }}
              >
                ${dailyStats.netTotal.toFixed(2)}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "2px",
              }}
            >
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>
                {t.paymentStatus}
              </div>
              <span
                style={{
                  backgroundColor: "#fef3c7",
                  color: "#b45309",
                  padding: "3px 10px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: "800",
                }}
              >
                {t.pending}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Invoice History Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14px",
              fontWeight: "800",
              color: "#334155",
              paddingLeft: "4px",
            }}
          >
            <MdHistory size={18} color="#64748b" />
            <span>{t.history}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {invoices.map((inv) => (
              <div
                key={inv.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a" }}>
                      {inv.id}
                    </span>
                    <span
                      style={{
                        backgroundColor: "#dcfce7",
                        color: "#15803d",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: "700",
                      }}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600" }}>
                    {inv.date} • {inv.delivered}/{inv.totalParcels} {t.delivered}
                  </span>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "15px", fontWeight: "900", color: "#16a34a" }}>
                    +${inv.netAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Date Picker Modal */}
      {showCalendarModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              padding: "24px",
              width: "100%",
              maxWidth: "360px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <span style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                {t.selectDate}
              </span>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <MdClose size={22} />
              </button>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1.5px solid #e2e8f0",
                fontSize: "14px",
                fontWeight: "600",
                outline: "none",
                marginBottom: "16px",
                fontFamily: "inherit",
              }}
            />

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split("T")[0]);
                  setShowCalendarModal(false);
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  border: "1px solid #bfdbfe",
                  borderRadius: "12px",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {t.today}
              </button>

              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
