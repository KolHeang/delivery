"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getUser } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import MerchantHeader from "@/components/merchant/MerchantHeader";
import {
  MdSearch,
  MdLocationOn,
  MdPhone,
  MdPerson,
  MdAddCircle,
  MdAccessTime,
  MdCheckCircle,
  MdErrorOutline,
  MdTwoWheeler,
  MdContentCopy,
} from "react-icons/md";

const ordersTranslations = {
  en: {
    title: "My Parcel Shipments",
    tabAll: "All",
    tabPending: "Pending",
    tabTransit: "In-Transit",
    tabDelivered: "Delivered",
    tabProblem: "Problem",
    tabReturned: "Returned",
    searchPlaceholder: "Search tracking code, phone, name...",
    loading: "Loading shipments...",
    noOrders: "No parcel shipments found",
    receiver: "Receiver",
    cod: "Item COD",
    fee: "Delivery Fee",
    driver: "Assigned Driver",
    noDriver: "Awaiting pickup / driver",
    newOrderBtn: "+ Create Order",
    copySuccess: "Copied code!",
    viewDetail: "View Details",
  },
  km: {
    title: "កញ្ចប់ផ្ញើរបស់ខ្ញុំ",
    tabAll: "ទាំងអស់",
    tabPending: "រង់ចាំ",
    tabTransit: "កំពុងដឹក",
    tabDelivered: "បានដល់",
    tabProblem: "មានបញ្ហា",
    tabReturned: "ត្រឡប់",
    searchPlaceholder: "ស្វែងរកលេខកូដ, លេខទូរស័ព្ទ, ឈ្មោះ...",
    loading: "កំពុងផ្ទុកកញ្ចប់អីវ៉ាន់...",
    noOrders: "មិនមានកញ្ចប់អីវ៉ាន់ឡើយ",
    receiver: "អ្នកទទួល",
    cod: "តម្លៃអីវ៉ាន់ COD",
    fee: "ថ្លៃដឹកជញ្ជូន",
    driver: "អ្នកដឹកជញ្ជូន",
    noDriver: "រង់ចាំចាត់តាំងអ្នកដឹក",
    newOrderBtn: "+ បង្កើតការផ្ញើ",
    copySuccess: "បានចម្លងកូដ!",
    viewDetail: "មើលលម្អិត",
  },
};

export default function MerchantOrdersPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [merchant, setMerchant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const t = ordersTranslations[lang as "en" | "km"] || ordersTranslations.km;

  const loadOrders = async () => {
    setLoading(true);
    try {
      const [profRes, ordRes] = await Promise.all([
        api.get("/mobile/merchant/profile").catch(() => null),
        api.get("/mobile/merchant/parcels").catch(() => null),
      ]);
      if (profRes?.data) setMerchant(profRes.data);
      if (ordRes?.data) {
        const list = Array.isArray(ordRes.data)
          ? ordRes.data
          : ordRes.data?.results || ordRes.data?.data || [];
        setOrders(list);
      }
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
    const user = getUser();
    if (user?.role !== "merchant") {
      router.push("/merchant/login");
      return;
    }
    setMerchant(user);
    loadOrders();
  }, [router]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const getFilteredOrders = () => {
    return orders.filter((order) => {
      // 1. Search filter
      const searchStr = search.toLowerCase();
      const code = (order.trackingCode || order.code || "").toLowerCase();
      const phone = (order.receiverPhone || "").toLowerCase();
      const name = (order.receiverName || "").toLowerCase();
      const matchesSearch =
        code.includes(searchStr) || phone.includes(searchStr) || name.includes(searchStr);

      if (!matchesSearch) return false;

      // 2. Tab filter
      const s = (order.status || "").toLowerCase();
      if (activeTab === "all") return true;
      if (activeTab === "pending") {
        return s === "pending" || s === "created" || s === "pickup_pending" || s === "assigned";
      }
      if (activeTab === "transit") {
        return (
          s === "in_transit" || s === "in-transit" || s === "out_for_delivery" || s === "picked_up"
        );
      }
      if (activeTab === "delivered") {
        return s === "delivered" || s === "completed";
      }
      if (activeTab === "problem") {
        return s === "failed" || s === "cancelled" || s === "delayed";
      }
      if (activeTab === "returned") {
        return s === "returned" || s === "returning";
      }
      return true;
    });
  };

  const filteredOrders = getFilteredOrders();

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "delivered" || s === "completed") {
      return {
        label: lang === "km" ? "បានប្រគល់ជោគជ័យ" : "Delivered",
        bgColor: "#f0fdf4",
        textColor: "#16a34a",
        borderColor: "#dcfce7",
        icon: <MdCheckCircle size={14} color="#16a34a" />,
      };
    }
    if (s === "in_transit" || s === "in-transit" || s === "out_for_delivery") {
      return {
        label: lang === "km" ? "កំពុងដឹកជញ្ជូន" : "In-Transit",
        bgColor: "#eff6ff",
        textColor: "#2563eb",
        borderColor: "#dbeafe",
        icon: <MdAccessTime size={14} color="#2563eb" />,
      };
    }
    if (s === "failed" || s === "cancelled") {
      return {
        label: lang === "km" ? "មានបញ្ហា / បរាជ័យ" : "Failed",
        bgColor: "#fef2f2",
        textColor: "#ef4444",
        borderColor: "#fee2e2",
        icon: <MdErrorOutline size={14} color="#ef4444" />,
      };
    }
    if (s === "returned") {
      return {
        label: lang === "km" ? "បានត្រឡប់" : "Returned",
        bgColor: "#f8fafc",
        textColor: "#64748b",
        borderColor: "#e2e8f0",
        icon: <MdAccessTime size={14} color="#64748b" />,
      };
    }
    return {
      label: lang === "km" ? "កំពុងរង់ចាំអ្នកដឹក" : "Pending Pickup",
      bgColor: "#fff7ed",
      textColor: "#f97316",
      borderColor: "#ffedd5",
      icon: <MdAccessTime size={14} color="#f97316" />,
    };
  };

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
      {/* 1. Header */}
      <MerchantHeader merchantName={displayName} branchName={branchName} phoneOrCode={phoneOrId} />

      {/* Main Content Area */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Search Bar + Create Button */}
        <div style={{ display: "flex", gap: "8px" }}>
          <div
            style={{
              flex: 1,
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            }}
          >
            <MdSearch size={20} color="#94a3b8" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                padding: "11px 0",
                fontSize: "13px",
                backgroundColor: "transparent",
                color: "#0f172a",
                fontFamily: "inherit",
              }}
            />
          </div>

          <Link
            href="/merchant/orders/create"
            style={{
              backgroundColor: "#581c87",
              color: "#ffffff",
              padding: "0 14px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12.5px",
              fontWeight: "800",
              textDecoration: "none",
              boxShadow: "0 4px 10px rgba(88, 28, 135, 0.25)",
              whiteSpace: "nowrap",
            }}
          >
            {t.newOrderBtn}
          </Link>
        </div>

        {/* 6 Status Horizontal Filter Pills (Exact Match to Driver App) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflowX: "auto",
            paddingBottom: "4px",
            scrollbarWidth: "none",
          }}
        >
          {[
            { id: "all", label: t.tabAll },
            { id: "pending", label: t.tabPending },
            { id: "transit", label: t.tabTransit },
            { id: "delivered", label: t.tabDelivered },
            { id: "problem", label: t.tabProblem },
            { id: "returned", label: t.tabReturned },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  backgroundColor: isActive ? "#581c87" : "#ffffff",
                  color: isActive ? "#ffffff" : "#475569",
                  border: `1.5px solid ${isActive ? "#581c87" : "#e2e8f0"}`,
                  fontSize: "12px",
                  fontWeight: isActive ? "800" : "600",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: isActive ? "0 2px 6px rgba(88, 28, 135, 0.2)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Orders List / Cards */}
        {loading ? (
          <div
            style={{
              padding: "40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "3px solid rgba(88, 28, 135, 0.15)",
                borderTopColor: "#581c87",
                borderRadius: "50%",
                animation: "orderSpin 0.8s linear infinite",
                marginBottom: "10px",
              }}
            />
            <span style={{ fontSize: "13px", fontWeight: "700" }}>{t.loading}</span>
            <style
              dangerouslySetInnerHTML={{
                __html: `@keyframes orderSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`,
              }}
            />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "40px 20px",
              textAlign: "center",
              border: "1px dashed #cbd5e1",
              marginTop: "8px",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📦</div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#334155" }}>
              {t.noOrders}
            </div>
            <Link
              href="/merchant/orders/create"
              style={{
                display: "inline-block",
                marginTop: "12px",
                padding: "8px 16px",
                borderRadius: "12px",
                backgroundColor: "#f3e8ff",
                color: "#581c87",
                fontSize: "12.5px",
                fontWeight: "800",
                textDecoration: "none",
              }}
            >
              {t.newOrderBtn}
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredOrders.map((order, idx) => {
              const code = order.trackingCode || order.code || `CO${idx + 100025}`;
              const badge = getStatusBadge(order.status);
              const receiverName = order.receiverName || "អតិថិជន";
              const receiverPhone = order.receiverPhone || "012345678";
              const address = order.receiverAddress || order.destination || "ភ្នំពេញ";
              const codAmount =
                order.codAmount != null ? `$${Number(order.codAmount).toFixed(2)}` : "$0.00";
              const feeAmount =
                order.deliveryFee != null ? `$${Number(order.deliveryFee).toFixed(2)}` : "$1.25";
              const driverName = order.driver?.name || order.driverName || null;

              return (
                <div
                  key={order.id || idx}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "18px",
                    padding: "14px 16px",
                    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
                    border: "1px solid #f1f5f9",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {/* Top Row: Code + Status Badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      onClick={() => handleCopy(code)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                      title="Click to copy code"
                    >
                      <span style={{ fontSize: "14.5px", fontWeight: "900", color: "#0f172a" }}>
                        {code}
                      </span>
                      <MdContentCopy size={13} color="#94a3b8" />
                      {copiedCode === code && (
                        <span style={{ fontSize: "10.5px", color: "#16a34a", fontWeight: "800" }}>
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        backgroundColor: badge.bgColor,
                        color: badge.textColor,
                        border: `1px solid ${badge.borderColor}`,
                        padding: "3px 8px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: "700",
                      }}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>
                  </div>

                  {/* Middle Section: Receiver + Destination */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <MdPerson size={15} color="#581c87" />
                        <span style={{ fontSize: "13px", fontWeight: "800", color: "#1e293b" }}>
                          {receiverName} ({receiverPhone})
                        </span>
                      </div>
                      <a
                        href={`tel:${receiverPhone}`}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          backgroundColor: "#f0fdf4",
                          color: "#16a34a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textDecoration: "none",
                        }}
                      >
                        <MdPhone size={14} />
                      </a>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#64748b",
                        fontSize: "12px",
                      }}
                    >
                      <MdLocationOn size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {address}
                      </span>
                    </div>

                    {driverName && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "11.5px",
                          color: "#7e22ce",
                          fontWeight: "700",
                          marginTop: "2px",
                        }}
                      >
                        <MdTwoWheeler size={14} />
                        <span>
                          {t.driver}: {driverName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: COD & Delivery Fee */}
                  <div
                    style={{
                      paddingTop: "8px",
                      borderTop: "1px solid #f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                    }}
                  >
                    <div>
                      <span style={{ color: "#64748b" }}>{t.cod}: </span>
                      <span style={{ fontWeight: "900", color: "#15803d" }}>{codAmount}</span>
                    </div>

                    <div>
                      <span style={{ color: "#64748b" }}>{t.fee}: </span>
                      <span style={{ fontWeight: "800", color: "#0f172a" }}>{feeAmount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
