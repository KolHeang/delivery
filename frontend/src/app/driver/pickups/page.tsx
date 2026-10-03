"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import api from "@/lib/api";
import DriverHeader from "@/components/driver/DriverHeader";
import {
  MdRefresh,
  MdCheckCircle,
  MdStorefront,
  MdSchedule,
  MdClose,
  MdInventory2,
} from "react-icons/md";

/* ─── helpers ─── */
const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "#fef3c7", color: "#d97706", label: "រង់ចាំទៅយក" },
  assigned: { bg: "#f3e8ff", color: "#581c87", label: "បានចាត់តាំង" },
  "picked-up": { bg: "#dcfce7", color: "#16a34a", label: "បានទទួលយក ✓" },
  completed: { bg: "#f0fdf4", color: "#15803d", label: "រួចរាល់" },
};

export default function DriverPickupsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* confirm modal */
  const [confirmModal, setConfirmModal] = useState<any | null>(null);
  const [actualQty, setActualQty] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [successId, setSuccessId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, profRes] = await Promise.all([
        api.get("/mobile/driver/pickup-requests"),
        api.get("/mobile/driver/profile").catch(() => null),
      ]);
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setRequests(list);
      if (profRes?.data) setDriver(profRes.data);
    } catch {
      /* silent */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/driver/login");
      return;
    }
    const user = getUser();
    if (user) setDriver(user);
    load();
  }, [router, load]);

  const handleConfirm = async () => {
    if (!confirmModal) return;
    const qty = parseInt(actualQty);
    if (isNaN(qty) || qty < 0) return;
    setConfirming(true);
    try {
      await api.patch(`/mobile/driver/pickup-requests/${confirmModal.id}/pickup`, {
        actualQuantity: qty,
      });
      setSuccessId(confirmModal.id);
      setConfirmModal(null);
      setActualQty("");
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to confirm pickup");
    }
    setConfirming(false);
  };

  /* ─── split by tab ─── */
  const active = requests.filter((r) => r.status !== "picked-up" && r.status !== "completed");
  const done = requests.filter((r) => r.status === "picked-up" || r.status === "completed");

  const [tab, setTab] = useState<"active" | "done">("active");
  const shown = tab === "active" ? active : done;

  const displayName = driver?.name || driver?.username || "LONG MAKARA";
  const branchName = driver?.branch?.name || driver?.branchName || "ប៉េងហួតបឹងស្នោ";
  const phoneOrId = driver?.phone || driver?.idCard || "010220529";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
      }}
    >
      {/* ── 1. Header ── */}
      <DriverHeader driverName={displayName} branchName={branchName} phoneOrCode={phoneOrId} />

      {/* ── 2. Segmented Pill Tabs ── */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "12px 16px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: 8, flex: 1 }}>
          <button
            onClick={() => setTab("active")}
            style={{
              flex: 1,
              padding: "8px 14px",
              borderRadius: 20,
              border: "none",
              backgroundColor: tab === "active" ? "#581c87" : "#f3e8ff",
              color: tab === "active" ? "#ffffff" : "#581c87",
              fontWeight: tab === "active" ? "800" : "600",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            រង់ចាំទៅយក ({active.length})
          </button>
          <button
            onClick={() => setTab("done")}
            style={{
              flex: 1,
              padding: "8px 14px",
              borderRadius: 20,
              border: "none",
              backgroundColor: tab === "done" ? "#581c87" : "#f3e8ff",
              color: tab === "done" ? "#ffffff" : "#581c87",
              fontWeight: tab === "done" ? "800" : "600",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            បានទទួលរួចរាល់ ({done.length})
          </button>
        </div>

        <button
          onClick={load}
          style={{
            background: "none",
            border: "none",
            color: "#581c87",
            cursor: "pointer",
            padding: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MdRefresh size={22} />
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: "16px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: "3px solid rgba(88, 28, 135, 0.15)",
                borderTopColor: "#581c87",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : shown.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "40px 20px",
              textAlign: "center",
              border: "1px solid #f1f5f9",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <MdInventory2 size={46} color="#cbd5e1" />
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>
              {tab === "active" ? "មិនមានសំណើទៅយកអីវ៉ាន់ទេ" : "មិនមានប្រវត្តិទៅយកអីវ៉ាន់ទេ"}
            </div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              {tab === "active"
                ? "រាល់សំណើកក់យកអីវ៉ាន់ថ្មីៗពីហាង នឹងបង្ហាញនៅទីនេះ។"
                : "កញ្ចប់អីវ៉ាន់ដែលបានទទួលរួចរាល់នឹងបង្ហាញនៅទីនេះ។"}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {shown.map((r: any) => {
              const cfg = STATUS_CFG[r.status] ?? {
                bg: "#f1f5f9",
                color: "#64748b",
                label: r.status,
              };
              const isNew = successId === r.id;
              return (
                <div
                  key={r.id}
                  style={{
                    background: "#fff",
                    borderRadius: 18,
                    overflow: "hidden",
                    border: isNew ? "2px solid #16a34a" : "1px solid #f1f5f9",
                    boxShadow: "0 2px 8px rgba(15,23,42,0.03)",
                    transition: "border-color 0.3s",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          backgroundColor: "#f3e8ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#581c87",
                        }}
                      >
                        <MdStorefront size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14.5, color: "#0f172a" }}>
                          {r.merchant?.name || r.merchantName || "ហាងដៃគូ"}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
                          {r.merchant?.phone || r.contactPhone || "—"}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: 20,
                        backgroundColor: cfg.bg,
                        color: cfg.color,
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 12.5,
                      color: "#334155",
                      backgroundColor: "#f8fafc",
                      padding: "10px 12px",
                      borderRadius: 12,
                      marginBottom: 12,
                      lineHeight: 1.4,
                    }}
                  >
                    📍 {r.pickupAddress || r.merchant?.address || "អាសយដ្ឋានហាង"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 12.5,
                      color: "#64748b",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MdSchedule size={15} />
                      <span>{fmtDate(r.createdAt)}</span>
                    </div>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>
                      បរិមាណ៖ {r.estimatedQuantity || r.quantity || 1} កញ្ចប់
                    </div>
                  </div>

                  {tab === "active" && (
                    <button
                      onClick={() => {
                        setConfirmModal(r);
                        setActualQty(String(r.estimatedQuantity || 1));
                      }}
                      style={{
                        marginTop: 14,
                        width: "100%",
                        padding: "11px",
                        backgroundColor: "#581c87",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 12,
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <MdCheckCircle size={17} /> បញ្ជាក់ការទទួលយកអីវ៉ាន់
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 20,
              width: "100%",
              maxWidth: 360,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>
                បញ្ជាក់ចំនួនកញ្ចប់ទទួល
              </div>
              <button
                onClick={() => setConfirmModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <MdClose size={20} color="#64748b" />
              </button>
            </div>
            <input
              type="number"
              min="1"
              value={actualQty}
              onChange={(e) => setActualQty(e.target.value)}
              placeholder="ចំនួនជាក់ស្តែង..."
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1.5px solid #cbd5e1",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              onClick={handleConfirm}
              disabled={confirming}
              style={{
                backgroundColor: "#581c87",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "11px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {confirming ? "កំពុងបញ្ជាក់..." : "បញ្ជាក់ទទួល"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
