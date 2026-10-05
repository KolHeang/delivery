"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdNotifications,
  MdAddCircle,
  MdInventory2,
  MdCheckCircle,
  MdErrorOutline,
  MdAssignmentReturn,
  MdLocalShipping,
  MdChevronRight,
  MdCalendarToday,
  MdStore,
} from "react-icons/md";

export default function MerchantDashboardPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const t = {
    amountToReceive: lang === "km" ? "ទឹកប្រាក់ត្រូវទទួលបាន" : "Amount to Receive",
    amountCollected: lang === "km" ? "បានទូទាត់រួច" : "Paid / Settled",
    pendingAmount: lang === "km" ? "រង់ចាំទូទាត់" : "Pending Settlement",
    totalPackagesToday: lang === "km" ? "កញ្ចប់អីវ៉ាន់ថ្ងៃនេះ" : "Total Packages Today",
    packages: lang === "km" ? "កញ្ចប់" : "Packages",
    delivered: lang === "km" ? "បានដឹក" : "Delivered",
    failed: lang === "km" ? "មិនបានសម្រេច" : "Failed",
    returned: lang === "km" ? "បានត្រឡប់" : "Returned",
    createNewBooking: lang === "km" ? "បង្កើតការផ្ញើថ្មី" : "Create New Booking",
    recentOrders: lang === "km" ? "ការបញ្ជាទិញថ្មីៗ" : "Recent Delivery Orders",
    seeAll: lang === "km" ? "មើលទាំងអស់ >" : "See All >",
    loading: lang === "km" ? "កំពុងផ្ទុកទិន្នន័យ..." : "Loading...",
  };

  const loadDashboard = async () => {
    try {
      const [dashRes, profRes, parcelRes] = await Promise.all([
        api.get("/mobile/merchant/dashboard").catch(() => null),
        api.get("/mobile/merchant/profile").catch(() => null),
        api.get("/mobile/merchant/parcels?limit=20").catch(() => null),
      ]);

      if (dashRes?.data) setData(dashRes.data);
      if (profRes?.data) setMerchant(profRes.data);
      if (parcelRes?.data) {
        const list = Array.isArray(parcelRes.data)
          ? parcelRes.data
          : parcelRes.data?.results || parcelRes.data?.data || [];
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
    loadDashboard();
  }, [router]);

  const user = getUser() as any;
  const storeName = merchant?.name || merchant?.nameKh || user?.name || (lang === "km" ? "ហាង" : "Store");
  const storePhone = merchant?.phone || user?.phone || "-";

  // Financial calculations from API or defaults to 0
  const amountToReceiveKhr = Number(data?.amountToReceiveKhr) || 0;
  const amountToReceiveUsd = Number(data?.amountToReceiveUsd) || 0;
  const amountCollectedKhr = Number(data?.amountCollectedKhr) || 0;
  const amountCollectedUsd = Number(data?.amountCollectedUsd) || 0;
  const pendingAmountKhr = Number(data?.pendingAmountKhr) || 0;
  const pendingAmountUsd = Number(data?.pendingAmountUsd) || 0;

  // Packages breakdown from API statistics or computed from real orders
  const totalPackages = data?.statistics?.totalParcel ?? orders.length;
  const deliveredCount =
    data?.statistics?.totalDelivered ??
    orders.filter((o) => o.status === "delivered" || o.deliveryStatus === "delivered").length;
  const failedCount =
    data?.statistics?.totalProblem ??
    orders.filter(
      (o) => o.status === "failed" || o.status === "problem" || o.deliveryStatus === "failed"
    ).length;
  const returnedCount =
    data?.statistics?.totalReturn ??
    orders.filter((o) => o.status === "returned" || o.deliveryStatus === "returned").length;

  const displayOrders = orders;

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
      {/* 1. Top Merchant Header */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "16px 20px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Merchant Avatar */}
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: "900",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              overflow: "hidden",
            }}
          >
            {merchant?.photo ? (
              <img
                src={merchant.photo}
                alt={storeName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span>{storeName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "16.5px",
                fontWeight: "900",
                color: "#0f172a",
                letterSpacing: "-0.2px",
              }}
            >
              {storeName}
            </h2>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginTop: "1px" }}>
              {storePhone}
            </div>
          </div>
        </div>

        {/* Right Notification Icon */}
        <button
          onClick={() => alert("No new notifications")}
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#475569",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <MdNotifications size={20} />
          <span
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#ef4444",
              border: "1.5px solid #ffffff",
            }}
          />
        </button>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* 2. Dual-Currency Financial Card (Screen 02 Home Dashboard) */}
        <div
          style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)",
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
          {/* Subtle Watermark Decoration */}
          <div
            style={{
              position: "absolute",
              top: "-30px",
              right: "-30px",
              width: "130px",
              height: "130px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Top Amount to Receive */}
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
                ៛ {amountToReceiveKhr.toLocaleString()}
              </span>
              <span style={{ fontSize: "17px", fontWeight: "700", color: "#dbeafe" }}>
                / ${amountToReceiveUsd.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Sub-row: Collected vs Pending */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              paddingTop: "12px",
              borderTop: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            {/* Amount Collected */}
            <div>
              <div style={{ fontSize: "11px", color: "#bfdbfe", fontWeight: "600" }}>
                {t.amountCollected}
              </div>
              <div style={{ fontSize: "14px", fontWeight: "800", marginTop: "2px" }}>
                ៛ {amountCollectedKhr.toLocaleString()}
              </div>
              <div style={{ fontSize: "12px", color: "#93c5fd", fontWeight: "700" }}>
                ${amountCollectedUsd.toFixed(2)}
              </div>
            </div>

            {/* Pending Amount */}
            <div>
              <div style={{ fontSize: "11px", color: "#fed7aa", fontWeight: "600" }}>
                {t.pendingAmount}
              </div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#fef08a", marginTop: "2px" }}>
                ៛ {pendingAmountKhr.toLocaleString()}
              </div>
              <div style={{ fontSize: "12px", color: "#fde047", fontWeight: "700" }}>
                ${pendingAmountUsd.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Total Packages Today Card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            padding: "16px 18px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdInventory2 size={18} />
              </div>
              <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
                {t.totalPackagesToday}
              </span>
            </div>

            <span style={{ fontSize: "14.5px", fontWeight: "900", color: "#2563eb" }}>
              {totalPackages} {t.packages}
            </span>
          </div>

          {/* 3 Metric Pills */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                backgroundColor: "#f0fdf4",
                borderRadius: "12px",
                padding: "10px 6px",
                border: "1px solid #dcfce7",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "900", color: "#16a34a" }}>
                {deliveredCount}
              </div>
              <div style={{ fontSize: "11px", color: "#15803d", fontWeight: "700", marginTop: "2px" }}>
                {t.delivered}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fef2f2",
                borderRadius: "12px",
                padding: "10px 6px",
                border: "1px solid #fee2e2",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "900", color: "#ef4444" }}>
                {failedCount}
              </div>
              <div style={{ fontSize: "11px", color: "#dc2626", fontWeight: "700", marginTop: "2px" }}>
                {t.failed}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#faf5ff",
                borderRadius: "12px",
                padding: "10px 6px",
                border: "1px solid #f3e8ff",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "900", color: "#8b5cf6" }}>
                {returnedCount}
              </div>
              <div style={{ fontSize: "11px", color: "#7c3aed", fontWeight: "700", marginTop: "2px" }}>
                {t.returned}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Quick Action: + Create New Booking Banner */}
        <Link
          href="/merchant/booking/create"
          style={{
            textDecoration: "none",
            backgroundColor: "#2563eb",
            borderRadius: "18px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#ffffff",
            boxShadow: "0 6px 18px rgba(37, 99, 235, 0.25)",
            transition: "transform 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MdLocalShipping size={24} />
            </div>

            <div>
              <div style={{ fontSize: "16px", fontWeight: "900" }}>{t.createNewBooking}</div>
              <div style={{ fontSize: "12px", color: "#dbeafe", fontWeight: "600", marginTop: "2px" }}>
                Single / Batch Pickup Request
              </div>
            </div>
          </div>

          <MdChevronRight size={26} color="#bfdbfe" />
        </Link>

        {/* 5. Recent Delivery Orders */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 4px",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
              {t.recentOrders}
            </span>
            <Link
              href="/merchant/orders"
              style={{
                textDecoration: "none",
                fontSize: "12.5px",
                fontWeight: "700",
                color: "#2563eb",
              }}
            >
              {t.seeAll}
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {displayOrders.length === 0 ? (
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
                  <MdInventory2 size={24} />
                </div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#64748b" }}>
                  {lang === "km" ? "មិនទាន់មានការបញ្ជាទិញនៅឡើយទេ" : "No recent delivery orders yet"}
                </div>
                <Link
                  href="/merchant/booking/create"
                  style={{
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: "800",
                    color: "#2563eb",
                    marginTop: "4px",
                  }}
                >
                  + {t.createNewBooking}
                </Link>
              </div>
            ) : (
              displayOrders.map((order: any, idx: number) => {
                const orderId = order.trackingCode || order.trackingNumber || order.code || `#${order.id || idx + 1}`;
                const custName = order.receiverName || order.recipientName || order.customerName || (lang === "km" ? "អតិថិជន" : "Customer");
                const custPhone = order.receiverPhone || order.recipientPhone || order.phone || "";
                const rawStatus = order.status || order.deliveryStatus || "pending";
                const isDelivered = rawStatus === "delivered";
                const isInTransit = rawStatus === "in_delivery" || rawStatus === "in-transit" || rawStatus === "assigned";
                const isFailed = rawStatus === "failed" || rawStatus === "problem";
                const isReturned = rawStatus === "returned" || rawStatus === "rejected";

                const badgeBg = isDelivered
                  ? "#dcfce7"
                  : isFailed
                  ? "#fee2e2"
                  : isReturned
                  ? "#f3e8ff"
                  : isInTransit
                  ? "#eff6ff"
                  : "#fef3c7";

                const badgeColor = isDelivered
                  ? "#15803d"
                  : isFailed
                  ? "#dc2626"
                  : isReturned
                  ? "#7c3aed"
                  : isInTransit
                  ? "#2563eb"
                  : "#b45309";

                const statusText = isDelivered
                  ? (lang === "km" ? "បានដឹក" : "Delivered")
                  : isFailed
                  ? (lang === "km" ? "មិនបានសម្រេច" : "Failed")
                  : isReturned
                  ? (lang === "km" ? "បានត្រឡប់" : "Returned")
                  : isInTransit
                  ? (lang === "km" ? "កំពុងដឹក" : "In Delivery")
                  : (lang === "km" ? "រង់ចាំ" : "Pending");

                const amountVal = Number(order.cod ?? order.codAmount ?? order.amount ?? 0);
                const currencySymbol = order.codCurrency === "KHR" ? "៛ " : "$";

                return (
                  <div
                    key={order.id || idx}
                    onClick={() => router.push(`/merchant/orders/${order.id || 1}`)}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "16px",
                      padding: "14px 16px",
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
                          width: "40px",
                          height: "40px",
                          borderRadius: "12px",
                          backgroundColor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#64748b",
                        }}
                      >
                        <MdInventory2 size={20} />
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
                            {orderId.startsWith("#") ? orderId : `#${orderId}`}
                          </span>
                          <span
                            style={{
                              backgroundColor: badgeBg,
                              color: badgeColor,
                              padding: "2px 6px",
                              borderRadius: "6px",
                              fontSize: "10.5px",
                              fontWeight: "800",
                            }}
                          >
                            {statusText}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            fontWeight: "600",
                            marginTop: "2px",
                          }}
                        >
                          {custName} {custPhone ? `• ${custPhone}` : ""}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>
                        {currencySymbol === "៛ " ? `៛ ${amountVal.toLocaleString()}` : `$${amountVal.toFixed(2)}`}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#94a3b8",
                          fontWeight: "600",
                          marginTop: "2px",
                        }}
                      >
                        COD
                      </div>
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
