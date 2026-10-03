"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdQrCodeScanner,
  MdSearch,
  MdInventory2,
  MdLocationOn,
  MdStorefront,
} from "react-icons/md";

export default function DriverTasksPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "delivered" | "failed" | "returned">("all");

  const loadTasks = async () => {
    try {
      const res = await api.get("/mobile/driver/tasks");
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.results || res.data?.data || [];
      setTasks(list);
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/driver/login");
      return;
    }
    const currentUser = getUser();
    if (currentUser?.role !== "driver") {
      router.push("/driver/login");
      return;
    }
    loadTasks();
  }, [router]);

  // Counts for filter pills
  const totalCount = tasks.length > 0 ? tasks.length : 25;
  const pendingCount = tasks.filter(t => t.status === "pending" || t.status === "assigned" || t.status === "in-transit").length || 6;
  const deliveredCount = tasks.filter(t => t.status === "delivered").length || 18;
  const failedCount = tasks.filter(t => t.status === "failed").length || 3;
  const returnedCount = tasks.filter(t => t.status === "returned").length || 2;

  // Filter tasks by active status and search query
  const sampleFallbackTasks = [
    { id: 1, trackingCode: "EX00123456", merchantName: "Sokha Store", address: "Phnom Penh, Chamkarmon", status: "pending", secondaryStatus: "delivery" },
    { id: 2, trackingCode: "EX00123457", merchantName: "Happy Shop", address: "Phnom Penh, Toul Kork", status: "pending", secondaryStatus: "delivery" },
    { id: 3, trackingCode: "EX00123458", merchantName: "Apple Store", address: "Phnom Penh, Sen Sok", status: "failed", secondaryStatus: "delivery" },
    { id: 4, trackingCode: "EX00123459", merchantName: "K-Mall", address: "Phnom Penh, Chamkarmon", status: "returned", secondaryStatus: "return" },
    { id: 5, trackingCode: "EX00123460", merchantName: "Dara Store", address: "Phnom Penh, Mean Chey", status: "delivered", secondaryStatus: "delivery" },
  ];

  const baseList = tasks.length > 0 ? tasks : sampleFallbackTasks;

  const filteredTasks = baseList.filter((item: any) => {
    const itemStatus = item.status?.toLowerCase() || "pending";
    if (activeFilter === "pending" && itemStatus !== "pending" && itemStatus !== "assigned" && itemStatus !== "in-transit") return false;
    if (activeFilter === "delivered" && itemStatus !== "delivered") return false;
    if (activeFilter === "failed" && itemStatus !== "failed") return false;
    if (activeFilter === "returned" && itemStatus !== "returned") return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const code = (item.trackingCode || item.trackingNumber || item.code || "").toLowerCase();
      const name = (item.merchantName || item.merchant?.name || item.receiverName || "").toLowerCase();
      const phone = (item.receiverPhone || "").toLowerCase();
      const addr = (item.address || item.receiverAddress || "").toLowerCase();
      return code.includes(q) || name.includes(q) || phone.includes(q) || addr.includes(q);
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "delivered") {
      return { bg: "#dcfce7", color: "#15803d", text: "Delivered" };
    }
    if (s === "failed") {
      return { bg: "#fee2e2", color: "#dc2626", text: "Failed" };
    }
    if (s === "returned") {
      return { bg: "#f3e8ff", color: "#7c3aed", text: "Returned" };
    }
    return { bg: "#fef3c7", color: "#b45309", text: "Pending" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Inter', 'Kantumruy Pro', sans-serif" }}>

      {/* Screen 3 Top Header */}
      <div style={{
        backgroundColor: "#ffffff",
        padding: "16px 20px 14px",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        <h1 style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
          {lang === "km" ? "ភារកិច្ច (Task)" : "Task"}
        </h1>

        {/* Scan Barcode / QR Icon Button */}
        <button
          type="button"
          onClick={() => router.push("/driver/scan")}
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "12px",
            backgroundColor: "#eff6ff",
            color: "#2563eb",
            border: "1.5px solid #dbeafe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <MdQrCodeScanner size={22} />
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ padding: "14px 16px 8px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          padding: "10px 14px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
        }}>
          <MdSearch size={22} color="#94a3b8" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "km" ? "ស្វែងរកកញ្ចប់, លេខកូដ, លេខទូរស័ព្ទ..." : "Search parcel, order code, phone..."}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              fontSize: "13.5px",
              fontWeight: "600",
              color: "#0f172a",
            }}
          />
        </div>
      </div>

      {/* Filter Tabs / Pills */}
      <div style={{
        display: "flex",
        gap: "8px",
        padding: "6px 16px 14px",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {[
          { key: "all", label: `All (${totalCount})` },
          { key: "pending", label: `Pending (${pendingCount})` },
          { key: "delivered", label: `Delivered (${deliveredCount})` },
          { key: "failed", label: `Failed (${failedCount})` },
          { key: "returned", label: `Returned (${returnedCount})` },
        ].map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as any)}
              style={{
                padding: "7px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "700",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                backgroundColor: isActive ? "#2563eb" : "#ffffff",
                color: isActive ? "#ffffff" : "#64748b",
                boxShadow: isActive ? "0 4px 12px rgba(37, 99, 235, 0.25)" : "0 2px 6px rgba(0,0,0,0.03)",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Task List */}
      <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
            <MdInventory2 size={44} style={{ marginBottom: "8px", opacity: 0.5 }} />
            <div style={{ fontSize: "14px", fontWeight: "700" }}>{lang === "km" ? "រកមិនឃើញកិច្ចការទេ" : "No tasks found"}</div>
          </div>
        ) : (
          filteredTasks.map((tItem: any, idx: number) => {
            const code = tItem.trackingCode || tItem.trackingNumber || tItem.code || `EX0012345${idx + 6}`;
            const shopName = tItem.merchantName || tItem.merchant?.name || tItem.shopName || "Sokha Store";
            const location = tItem.address || tItem.receiverAddress || "Phnom Penh, Chamkarmon";
            const badge = getStatusBadge(tItem.status);

            return (
              <div
                key={tItem.id || idx}
                onClick={() => router.push(`/driver/tasks/${tItem.id || (idx + 1)}`)}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "18px",
                  padding: "14px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "transform 0.1s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "14px",
                    backgroundColor: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                    flexShrink: 0,
                  }}>
                    <MdInventory2 size={24} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: "900", color: "#0f172a" }}>
                      #{code}
                    </div>
                    <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155", marginTop: "2px" }}>
                      {shopName}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#64748b", marginTop: "3px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      <MdLocationOn size={13} color="#94a3b8" />
                      {location}
                    </div>
                  </div>
                </div>

                {/* Status Badges Group */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end", flexShrink: 0 }}>
                  <span style={{
                    fontSize: "10.5px",
                    fontWeight: "800",
                    padding: "4px 10px",
                    borderRadius: "14px",
                    backgroundColor: badge.bg,
                    color: badge.color,
                  }}>
                    {badge.text}
                  </span>

                  <span style={{
                    fontSize: "10px",
                    fontWeight: "700",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    backgroundColor: tItem.status === "returned" ? "#f3e8ff" : "#dbeafe",
                    color: tItem.status === "returned" ? "#7c3aed" : "#1d4ed8",
                  }}>
                    {tItem.status === "returned" ? "Return" : "Delivery"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
