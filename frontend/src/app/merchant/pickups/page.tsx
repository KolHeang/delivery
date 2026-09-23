"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";
import Link from "next/link";
import MerchantHeader from "@/components/merchant/MerchantHeader";
import {
  MdRefresh,
  MdAdd,
  MdCheckCircle,
  MdHourglassEmpty,
  MdDirectionsBike,
  MdLocalShipping,
  MdSchedule,
  MdStorefront,
  MdInventory2,
} from "react-icons/md";

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STATUS_CFG: Record<string, { bg: string; color: string; label: string; icon: any }> = {
  pending: { bg: "#fef3c7", color: "#b45309", label: "រង់ចាំយក (Pending)", icon: MdHourglassEmpty },
  assigned: {
    bg: "#f3e8ff",
    color: "#7e22ce",
    label: "បានចាត់តាំង (Assigned)",
    icon: MdDirectionsBike,
  },
  "picked-up": {
    bg: "#e0e7ff",
    color: "#4338ca",
    label: "បានយក (Picked Up)",
    icon: MdLocalShipping,
  },
  completed: { bg: "#dcfce7", color: "#15803d", label: "ជោគជ័យ (Completed)", icon: MdCheckCircle },
  cancelled: {
    bg: "#fee2e2",
    color: "#b91c1c",
    label: "បានបោះបង់ (Cancelled)",
    icon: MdHourglassEmpty,
  },
};

export default function MerchantPickupsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "done">("active");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/mobile/merchant/pickup-requests");
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/merchant/login");
      return;
    }
    load();
  }, [router, load]);

  const active = requests.filter((r) => r.status !== "completed" && r.status !== "cancelled");
  const done = requests.filter((r) => r.status === "completed" || r.status === "cancelled");
  const shown = tab === "active" ? active : done;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        paddingBottom: "90px",
      }}
    >
      {/* Reusable Merchant Brand Header */}
      <MerchantHeader />

      {/* Hero Tab / Actions Banner in Royal Purple */}
      <div
        style={{
          background: "linear-gradient(135deg, #3b0764 0%, #581c87 60%, #7e22ce 100%)",
          padding: "16px 16px 14px",
          color: "#fff",
          boxShadow: "0 4px 16px rgba(88,28,135,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <MdInventory2 size={20} color="#ffea60" /> ស្នើសុំយកទំនិញ (Pickups)
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
              {active.length} កំពុងដំណើរការ · {done.length} បានបញ្ចប់
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={load}
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "none",
                borderRadius: 10,
                padding: "8px 10px",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <MdRefresh size={18} />
            </button>
            <Link
              href="/merchant/pickups/create"
              style={{
                background: "#ffea60",
                border: "none",
                borderRadius: 10,
                padding: "8px 14px",
                color: "#3b0764",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                textDecoration: "none",
                fontWeight: 800,
                fontSize: 12.5,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <MdAdd size={18} /> ស្នើថ្មី
            </Link>
          </div>
        </div>

        {/* Tab Pills */}
        <div
          style={{
            display: "flex",
            gap: 8,
            background: "rgba(255,255,255,0.12)",
            padding: 4,
            borderRadius: 12,
          }}
        >
          {(["active", "done"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 9,
                border: "none",
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#581c87" : "rgba(255,255,255,0.9)",
                fontWeight: 800,
                fontSize: 12.5,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: tab === t ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {t === "active" ? `កំពុងដំណើរការ (${active.length})` : `ប្រវត្តិ (${done.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content List */}
      <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "60px 0",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                border: "3px solid #f3e8ff",
                borderTopColor: "#581c87",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
              កំពុងផ្ទុកទិន្នន័យ...
            </span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : shown.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1e293b", marginBottom: 6 }}>
              {tab === "active" ? "មិនមានសំណើកំពុងរង់ចាំទេ" : "មិនទាន់មានប្រវត្តិបញ្ចប់នៅឡើយទេ"}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#64748b",
                marginBottom: 20,
                maxWidth: 280,
                lineHeight: 1.5,
              }}
            >
              {tab === "active"
                ? "បង្កើតសំណើដើម្បីឱ្យអ្នកដឹកជញ្ជូនមកទទួលយកកញ្ចប់ទំនិញពីហាងរបស់អ្នក។"
                : "រាល់សំណើដែលបានបញ្ចប់នឹងបង្ហាញនៅទីនេះ។"}
            </div>
            {tab === "active" && (
              <Link
                href="/merchant/pickups/create"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #581c87, #7e22ce)",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: 13.5,
                  boxShadow: "0 4px 14px rgba(88,28,135,0.3)",
                }}
              >
                <MdAdd size={18} color="#ffea60" /> ស្នើសុំយកទំនិញឥឡូវនេះ
              </Link>
            )}
          </div>
        ) : (
          shown.map((r: any) => {
            const cfg = STATUS_CFG[r.status] ?? {
              bg: "#f1f5f9",
              color: "#64748b",
              label: r.status,
              icon: MdHourglassEmpty,
            };
            const Icon = cfg.icon;
            const parcelsCount = r.orders?.length ?? null;

            return (
              <div
                key={r.id}
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  border: "1px solid #f1f5f9",
                  overflow: "hidden",
                  boxShadow: "0 4px 16px rgba(15,23,42,0.04)",
                }}
              >
                {/* Card Top */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f8fafc",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 14, color: "#0f172a" }}>
                      សំណើលេខ #{r.id}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "#64748b",
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <MdSchedule size={13} color="#7e22ce" /> {fmtDate(r.pickupTime)}
                    </div>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      background: cfg.bg,
                      color: cfg.color,
                    }}
                  >
                    <Icon size={13} /> {cfg.label}
                  </span>
                </div>

                {/* Quantities Breakdown */}
                <div
                  style={{
                    padding: "12px 16px",
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                  }}
                >
                  <StatBox
                    label="ចំនួនបានប្រកាស"
                    value={r.declaredQuantity ?? "—"}
                    color="#b45309"
                    bg="#fef3c7"
                  />
                  <StatBox
                    label="ចំនួនជាក់ស្តែង"
                    value={r.actualQuantity ?? "—"}
                    color="#581c87"
                    bg="#f3e8ff"
                  />
                  <StatBox
                    label="កញ្ចប់ក្នុងប្រព័ន្ធ"
                    value={parcelsCount ?? "—"}
                    color="#15803d"
                    bg="#dcfce7"
                  />
                </div>

                {/* Pickup Driver Info */}
                {r.pickupDriver && (
                  <div
                    style={{
                      padding: "0 16px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "#f3e8ff",
                        color: "#581c87",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {r.pickupDriver.name?.charAt(0) || "D"}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                        អ្នកដឹកជញ្ជូនទទួលភារកិច្ច
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>
                        {r.pickupDriver.name}
                      </div>
                    </div>
                  </div>
                )}

                {/* Store Pickup Address */}
                {r.pickupAddress && (
                  <div
                    style={{
                      padding: "8px 16px 12px",
                      fontSize: 12,
                      color: "#64748b",
                      borderTop: "1px solid #f8fafc",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MdStorefront size={15} color="#7e22ce" />
                    <span
                      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {r.pickupAddress}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: any;
  color: string;
  bg: string;
}) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: "8px 6px", textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  );
}
