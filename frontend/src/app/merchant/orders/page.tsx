"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdSearch,
  MdClose,
  MdInventory2,
  MdChevronRight,
  MdFilterList,
  MdCalendarToday,
} from "react-icons/md";

export default function MerchantOrdersPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const t = {
    title: lang === "km" ? "ស្វែងរក និងបញ្ជីកញ្ចប់" : "Search Orders",
    searchPlaceholder:
      lang === "km"
        ? "ស្វែងរកតាមឈ្មោះ, លេខកូដ, លេខទូរស័ព្ទ..."
        : "Search by customer name, order ID, phone",
    all: lang === "km" ? "ទាំងអស់" : "All",
    inDelivery: lang === "km" ? "កំពុងដឹក" : "In Delivery",
    delivered: lang === "km" ? "បានដឹក" : "Delivered",
    failed: lang === "km" ? "មិនបានសម្រេច" : "Failed",
    returned: lang === "km" ? "បានត្រឡប់" : "Returned",
    noOrders: lang === "km" ? "មិនមានទិន្នន័យកញ្ចប់ផ្ញើឡើយ" : "No orders found",
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/mobile/merchant/parcels?limit=100");
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.results || res.data?.data || [];
      setOrders(list);
    } catch (err) {
      console.error("Failed to load merchant orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/merchant/login");
      return;
    }
    loadOrders();
  }, [router]);

  const filteredOrders = useMemo(() => {
    return orders.filter((item: any) => {
      const code = (item.trackingCode || item.trackingNumber || item.code || `${item.id}`).toLowerCase();
      const name = (item.receiverName || item.recipientName || item.customerName || "").toLowerCase();
      const phone = (item.receiverPhone || item.recipientPhone || item.phone || "").toLowerCase();
      const q = search.trim().toLowerCase();

      const matchesSearch = !q || code.includes(q) || name.includes(q) || phone.includes(q);

      const rawStatus = (item.status || item.deliveryStatus || "").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "in_delivery") {
        matchesStatus = rawStatus === "in_delivery" || rawStatus === "in-transit" || rawStatus === "assigned";
      } else if (statusFilter === "delivered") {
        matchesStatus = rawStatus === "delivered";
      } else if (statusFilter === "failed") {
        matchesStatus = rawStatus === "failed" || rawStatus === "problem";
      } else if (statusFilter === "returned") {
        matchesStatus = rawStatus === "returned" || rawStatus === "rejected";
      }

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

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
      {/* 1. Header with Search Bar */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "16px 16px 12px",
          borderBottom: "1px solid #f1f5f9",
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "#f1f5f9",
            borderRadius: "14px",
            padding: "10px 14px",
          }}
        >
          <MdSearch size={22} color="#64748b" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "13.5px",
              fontWeight: "600",
              color: "#0f172a",
              fontFamily: "inherit",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
            >
              <MdClose size={18} />
            </button>
          )}
        </div>

        {/* 2. 5 Status Filter Pills */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: "2px",
          }}
        >
          {[
            { key: "all", label: t.all },
            { key: "in_delivery", label: t.inDelivery },
            { key: "delivered", label: t.delivered },
            { key: "failed", label: t.failed },
            { key: "returned", label: t.returned },
          ].map((pill) => {
            const isActive = statusFilter === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setStatusFilter(pill.key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: isActive ? "1px solid #2563eb" : "1px solid #e2e8f0",
                  backgroundColor: isActive ? "#2563eb" : "#ffffff",
                  color: isActive ? "#ffffff" : "#475569",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Orders List */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredOrders.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 20px",
              color: "#94a3b8",
            }}
          >
            <MdInventory2 size={48} />
            <span style={{ marginTop: "12px", fontSize: "14px", fontWeight: "600" }}>
              {t.noOrders}
            </span>
          </div>
        ) : (
          filteredOrders.map((order: any, idx: number) => {
            const orderId = order.trackingCode || order.trackingNumber || order.code || `#${order.id || idx + 1}`;
            const custName = order.receiverName || order.recipientName || order.customerName || (lang === "km" ? "អតិថិជន" : "Customer");
            const custPhone = order.receiverPhone || order.recipientPhone || order.phone || "";
            const rawStatus = (order.status || order.deliveryStatus || "pending").toLowerCase();
            const isDelivered = rawStatus === "delivered";
            const isInTransit = rawStatus === "in_delivery" || rawStatus === "in-transit" || rawStatus === "assigned";
            const isFailed = rawStatus === "failed" || rawStatus === "problem";
            const isReturned = rawStatus === "returned" || rawStatus === "rejected";

            const badgeBg = isDelivered
              ? "#dcfce7"
              : isInTransit
              ? "#eff6ff"
              : isFailed
              ? "#fef2f2"
              : isReturned
              ? "#faf5ff"
              : "#fef3c7";
            const badgeColor = isDelivered
              ? "#15803d"
              : isInTransit
              ? "#2563eb"
              : isFailed
              ? "#ef4444"
              : isReturned
              ? "#8b5cf6"
              : "#b45309";
            const statusText = isDelivered
              ? (lang === "km" ? "បានដឹក" : "Delivered")
              : isInTransit
              ? (lang === "km" ? "កំពុងដឹក" : "In Delivery")
              : isFailed
              ? (lang === "km" ? "មិនបានសម្រេច" : "Failed")
              : isReturned
              ? (lang === "km" ? "បានត្រឡប់" : "Returned")
              : (lang === "km" ? "រង់ចាំការយក" : "Pending Pickup");

            const rawAmount = Number(order.cod ?? order.codAmount ?? order.amount ?? 0);
            const isKhrCurrency = order.codCurrency === "KHR";
            const amountUsd = isKhrCurrency ? (rawAmount / 4100).toFixed(2) : rawAmount.toFixed(2);
            const amountKhr = isKhrCurrency ? rawAmount.toLocaleString() : Math.round(rawAmount * 4100).toLocaleString();

            return (
              <div
                key={order.id || idx}
                onClick={() => router.push(`/merchant/orders/${order.id || 1}`)}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
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
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#2563eb",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    <MdInventory2 size={22} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
                        {orderId.startsWith("#") ? orderId : `#${orderId}`}
                      </span>
                      <span
                        style={{
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "10.5px",
                          fontWeight: "800",
                        }}
                      >
                        {statusText}
                      </span>
                    </div>

                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                      {custName}
                    </div>

                    {custPhone && (
                      <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
                        {custPhone}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>
                    ${amountUsd}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>
                    ៛ {amountKhr}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
