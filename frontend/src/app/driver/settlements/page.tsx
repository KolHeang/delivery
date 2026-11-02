"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";
import {
  MdCalendarToday,
  MdCheck,
  MdReceiptLong,
  MdRefresh,
  MdArrowBack,
  MdClose,
  MdErrorOutline,
} from "react-icons/md";

export default function DriverSettlementHistoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "pending" | "problem">("all");
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    allCount: 0,
    paidCount: 0,
    pendingCount: 0,
    problemCount: 0,
  });

  // Date range filter states
  const [showDateModal, setShowDateModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedRangeLabel, setSelectedRangeLabel] = useState("");

  const loadSettlements = async (status = activeTab, start = startDate, end = endDate) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.append("status", status);
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);

      const res = await api.get(`/mobile/driver/settlements?${params.toString()}`);
      if (res.data) {
        const list = Array.isArray(res.data)
          ? res.data
          : res.data.data || res.data.result || [];
        setSettlements(list);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error("Failed to load settlements", err);
      // Fallback data in case server is starting
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/driver/login");
      return;
    }
    loadSettlements(activeTab, startDate, endDate);
  }, [activeTab, startDate, endDate]);

  const handleApplyDateRange = () => {
    setShowDateModal(false);
    if (startDate && endDate) {
      setSelectedRangeLabel(`${startDate} ~ ${endDate}`);
    } else if (startDate) {
      setSelectedRangeLabel(`From ${startDate}`);
    } else if (endDate) {
      setSelectedRangeLabel(`Until ${endDate}`);
    } else {
      setSelectedRangeLabel("");
    }
    loadSettlements(activeTab, startDate, endDate);
  };

  const handleClearDateRange = () => {
    setStartDate("");
    setEndDate("");
    setSelectedRangeLabel("");
    setShowDateModal(false);
    loadSettlements(activeTab, "", "");
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid") {
      return {
        color: "#1e293b",
        border: "1px solid #e2e8f0",
        backgroundColor: "#ffffff",
      };
    }
    if (s === "pending") {
      return {
        color: "#475569",
        border: "1px solid #e2e8f0",
        backgroundColor: "#ffffff",
      };
    }
    if (s === "problem") {
      return {
        color: "#dc2626",
        border: "1px solid #fecaca",
        backgroundColor: "#fef2f2",
      };
    }
    return {
      color: "#475569",
      border: "1px solid #e2e8f0",
      backgroundColor: "#ffffff",
    };
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        padding: "16px",
        paddingBottom: "88px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          paddingTop: "6px",
        }}
      >
        <h1
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: "#0f172a",
            margin: 0,
            letterSpacing: "-0.5px",
          }}
        >
          Settlement history
        </h1>

        <button
          onClick={() => loadSettlements(activeTab, startDate, endDate)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            padding: "6px",
          }}
        >
          <MdRefresh size={22} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
          overflowX: "auto",
          paddingBottom: "4px",
          scrollbarWidth: "none",
        }}
      >
        {/* All Tab */}
        <button
          onClick={() => setActiveTab("all")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "8px 16px",
            borderRadius: "10px",
            fontSize: "13.5px",
            fontWeight: "600",
            cursor: "pointer",
            border: activeTab === "all" ? "1px solid #c7d2fe" : "1px solid #e2e8f0",
            backgroundColor: activeTab === "all" ? "#e0e7ff" : "#ffffff",
            color: activeTab === "all" ? "#1e293b" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          {activeTab === "all" && <MdCheck size={16} color="#3b82f6" />}
          <span>All</span>
        </button>

        {/* Paid Tab */}
        <button
          onClick={() => setActiveTab("paid")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "8px 16px",
            borderRadius: "10px",
            fontSize: "13.5px",
            fontWeight: "600",
            cursor: "pointer",
            border: activeTab === "paid" ? "1px solid #c7d2fe" : "1px solid #e2e8f0",
            backgroundColor: activeTab === "paid" ? "#e0e7ff" : "#ffffff",
            color: activeTab === "paid" ? "#1e293b" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          {activeTab === "paid" && <MdCheck size={16} color="#3b82f6" />}
          <span>Paid</span>
        </button>

        {/* Pending Tab */}
        <button
          onClick={() => setActiveTab("pending")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "8px 16px",
            borderRadius: "10px",
            fontSize: "13.5px",
            fontWeight: "600",
            cursor: "pointer",
            border: activeTab === "pending" ? "1px solid #c7d2fe" : "1px solid #e2e8f0",
            backgroundColor: activeTab === "pending" ? "#e0e7ff" : "#ffffff",
            color: activeTab === "pending" ? "#1e293b" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          {activeTab === "pending" && <MdCheck size={16} color="#3b82f6" />}
          <span>Pending</span>
        </button>

        {/* Problem Tab */}
        <button
          onClick={() => setActiveTab("problem")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "8px 16px",
            borderRadius: "10px",
            fontSize: "13.5px",
            fontWeight: "600",
            cursor: "pointer",
            border: activeTab === "problem" ? "1px solid #fecaca" : "1px solid #e2e8f0",
            backgroundColor: activeTab === "problem" ? "#fee2e2" : "#ffffff",
            color: activeTab === "problem" ? "#b91c1c" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          {activeTab === "problem" && <MdCheck size={16} color="#ef4444" />}
          <span>Problem</span>
        </button>
      </div>

      {/* Date Range Button */}
      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={() => setShowDateModal(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            border: selectedRangeLabel ? "1px solid #93c5fd" : "1px solid #cbd5e1",
            backgroundColor: selectedRangeLabel ? "#eff6ff" : "#ffffff",
            color: selectedRangeLabel ? "#1d4ed8" : "#3b82f6",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <MdCalendarToday size={15} color={selectedRangeLabel ? "#1d4ed8" : "#3b82f6"} />
          <span>{selectedRangeLabel || "Date range"}</span>
          {selectedRangeLabel && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleClearDateRange();
              }}
              style={{
                marginLeft: "4px",
                padding: "2px",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <MdClose size={14} color="#64748b" />
            </span>
          )}
        </button>
      </div>

      {/* Settlements List Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {loading ? (
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            Loading settlement history...
          </div>
        ) : settlements.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              padding: "40px 20px",
              border: "1px dashed #cbd5e1",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              color: "#94a3b8",
            }}
          >
            <MdReceiptLong size={36} color="#cbd5e1" />
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#64748b" }}>
              No settlement records found
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              Try changing the filter tabs or clearing the date range.
            </div>
          </div>
        ) : (
          settlements.map((item) => (
            <div
              key={item.id || item.reference}
              onClick={() => router.push(`/driver/payments/${item.id || item.reference}`)}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "18px",
                padding: "18px 20px",
                border: "1px solid #f1f5f9",
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              {/* Row 1: Date & Status Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.3px",
                  }}
                >
                  {item.formattedDate || item.date}
                </div>

                <div
                  style={{
                    ...getStatusBadgeStyle(item.status),
                    padding: "3px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  {item.status || "Paid"}
                </div>
              </div>

              {/* Row 2: Reference & Orders Count (e.g. ST8002 • 1 Orders) */}
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#64748b",
                  marginTop: "6px",
                  marginBottom: "12px",
                }}
              >
                {item.subtitle || `${item.reference || "ST" + item.id} • ${item.orderCount || 1} Orders`}
              </div>

              {/* Row 3: Driver Fee Payout & COD Remittance */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", backgroundColor: "#f8fafc", padding: "8px 12px", borderRadius: "10px", marginTop: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                    កម្រៃជើងសារ (Driver Fee):
                  </span>
                  <span style={{ fontSize: "15px", fontWeight: "800", color: "#16a34a" }}>
                    {item.driverFeeText || (item.currency === "KHR" ? `${Number(item.amount || 0).toLocaleString()} ៛` : `$${Number(item.amount || 0).toFixed(2)}`)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                    ប្រាក់ COD ប្រមូលបាន:
                  </span>
                  <span style={{ fontSize: "13.5px", fontWeight: "700", color: "#0f172a" }}>
                    {item.usdText || `USD ${Number(item.usdAmount || 0).toFixed(2)}`}
                    {Number(item.khrAmount || 0) > 0 && <span style={{ color: "#475569", marginLeft: "4px" }}>/ {item.khrText}</span>}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Date Range Modal */}
      {showDateModal && (
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
              borderRadius: "20px",
              padding: "24px",
              width: "100%",
              maxWidth: "360px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "18px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                Filter by Date Range
              </h3>
              <button
                onClick={() => setShowDateModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px",
                }}
              >
                <MdClose size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                    marginBottom: "4px",
                  }}
                >
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    color: "#0f172a",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                    marginBottom: "4px",
                  }}
                >
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    color: "#0f172a",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleClearDateRange}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  color: "#475569",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
              <button
                onClick={handleApplyDateRange}
                style={{
                  flex: 2,
                  padding: "10px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
