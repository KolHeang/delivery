"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser, isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdArrowBack,
  MdMoreVert,
  MdPhone,
  MdSend,
  MdLocationOn,
  MdMap,
  MdChat,
  MdLocalShipping,
  MdCheckCircle,
  MdAccessTime,
  MdClose,
  MdCameraAlt,
  MdEdit,
  MdSpeed,
  MdPerson,
  MdInventory2,
} from "react-icons/md";
import { FaTelegram } from "react-icons/fa";

export default function MerchantOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"detail" | "tracking" | "chat">("detail");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showActionsSheet, setShowActionsSheet] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<any[]>([
    {
      id: 1,
      sender: "rider",
      senderName: "Sokha (Rider)",
      text: "Hello shop, how is the parcel?",
      time: "09:02 AM",
    },
    {
      id: 2,
      sender: "merchant",
      senderName: "Little Girl Studio",
      text: "It's ready for pickup at our counter!",
      time: "09:05 AM",
    },
    {
      id: 3,
      sender: "merchant",
      senderName: "Little Girl Studio",
      text: "Please call customer before arriving.",
      time: "09:06 AM",
    },
    {
      id: 4,
      sender: "rider",
      senderName: "Sokha (Rider)",
      text: "Arrived at customer location now.",
      time: "09:20 AM",
      hasLocationCard: true,
      address: "#12, St. 271, Boeng Tumpun, Phnom Penh",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const t = {
    detail: lang === "km" ? "ព័ត៌មានលម្អិត" : "Order Detail",
    tracking: lang === "km" ? "ផែនទី & តាមដាន" : "Map & Tracking",
    chat: lang === "km" ? "ជជែកជាមួយអ្នកដឹក" : "Chat with Rider",
    customerInfo: lang === "km" ? "ព័ត៌មានអតិថិជន" : "Customer Information",
    openMap: lang === "km" ? "បើកផែនទី" : "Open Map",
    parcelInfo: lang === "km" ? "ព័ត៌មានកញ្ចប់អីវ៉ាន់" : "Parcel Information",
    codAmount: lang === "km" ? "ថ្លៃទំនិញ (COD)" : "COD Amount",
    deliveryFee: lang === "km" ? "ថ្លៃដឹកជញ្ជូន" : "Delivery Fee",
    totalValue: lang === "km" ? "តម្លៃសរុប" : "Total Value",
    deliveryNotes: lang === "km" ? "កំណត់ចំណាំការដឹក" : "Delivery Notes",
    deliveryProgress: lang === "km" ? "ដំណើរការដឹកជញ្ជូន" : "Delivery Progress",
    riderInfo: lang === "km" ? "ព័ត៌មានអ្នកដឹក" : "Rider Information",
    callRider: lang === "km" ? "ហៅទូរស័ព្ទ" : "Call",
    orderActions: lang === "km" ? "សកម្មភាពបញ្ជាទិញ" : "Order Actions",
    updateAddress: lang === "km" ? "កែប្រែអាសយដ្ឋាន" : "Update Address",
    editNote: lang === "km" ? "កែប្រែកំណត់ចំណាំ" : "Add/Edit Delivery Note",
    requestSpeedUp: lang === "km" ? "ស្នើសុំពន្លឿនការដឹក" : "Request to Speed Up",
    contactCustomer: lang === "km" ? "ទាក់ទងអតិថិជន" : "Contact Customer",
    close: lang === "km" ? "បិទ" : "Close",
  };

  const orderId = params?.id || "1";

  const loadOrderDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/mobile/merchant/parcels/${orderId}`).catch(() => null);
      if (res?.data) {
        setOrder(res.data);
      } else {
        // Sample fallback matching reference screen 04
        setOrder({
          id: orderId,
          code: "EX10235",
          status: "in_delivery",
          statusText: "In Delivery",
          createdAt: "23 Dec 2024 • 09:15 AM",
          customerName: "Sokha Chan",
          phone: "012 345 678",
          address: "#12, St. 271, Boeng Tumpun, Phnom Penh",
          itemName: "Cosmetics Box (2 items)",
          weight: "1.2 kg",
          codAmount: 28.0,
          deliveryFee: 1.5,
          totalValue: 29.5,
          note: "Handle with care. Call customer before arrival.",
          rider: {
            name: "Sokha",
            phone: "088 123 456",
            rating: "4.9",
          },
        });
      }
    } catch (err) {
      console.error("Failed to load order detail", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/merchant/login");
      return;
    }
    loadOrderDetail();
  }, [orderId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg = {
      id: messages.length + 1,
      sender: "merchant",
      senderName: "Little Girl Studio",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([...messages, newMsg]);
    setChatInput("");
  };

  const displayCode = order?.trackingNumber || order?.code || `EX10235`;
  const custName = order?.recipientName || order?.customerName || "Sokha Chan";
  const custPhone = order?.recipientPhone || order?.phone || "012 345 678";
  const custAddress = order?.recipientAddress || order?.address || "#12, St. 271, Boeng Tumpun, Phnom Penh";
  const codVal = Number(order?.codAmount || 28.0).toFixed(2);
  const feeVal = Number(order?.deliveryFee || 1.5).toFixed(2);
  const totalVal = Number(order?.totalValue || Number(codVal) + Number(feeVal)).toFixed(2);

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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              padding: 0,
            }}
          >
            <MdArrowBack size={24} />
          </button>
          <h1
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "900",
              color: "#0f172a",
              letterSpacing: "-0.3px",
            }}
          >
            #{displayCode}
          </h1>
        </div>

        {/* 3 Dots Menu for Screen 07 Order Actions */}
        <button
          onClick={() => setShowActionsSheet(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            padding: 0,
          }}
        >
          <MdMoreVert size={24} />
        </button>
      </div>

      {/* 2. Top Segmented Tabs: Detail | Tracking | Chat */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 8px",
        }}
      >
        {[
          { key: "detail", label: t.detail },
          { key: "tracking", label: t.tracking },
          { key: "chat", label: t.chat },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                background: "none",
                border: "none",
                borderBottom: isActive ? "3px solid #2563eb" : "3px solid transparent",
                color: isActive ? "#2563eb" : "#64748b",
                fontWeight: isActive ? "800" : "600",
                fontSize: "12.5px",
                padding: "12px 4px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. TAB 1: SCREEN 04 ORDER DETAIL */}
      {activeTab === "detail" && (
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Status Pill Card */}
          <div
            style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "16px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdLocalShipping size={20} />
              </div>
              <div>
                <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#1e40af" }}>
                  In Delivery
                </span>
                <div style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "600", marginTop: "2px" }}>
                  23 Dec 2024 • 09:15 AM
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("tracking")}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #93c5fd",
                color: "#1d4ed8",
                padding: "6px 12px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Track
            </button>
          </div>

          {/* Customer Information Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
              {t.customerInfo}
            </span>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                  {custName}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>
                  📱 {custPhone}
                </div>
              </div>

              {/* Call & Telegram shortcuts */}
              <div style={{ display: "flex", gap: "8px" }}>
                <a
                  href={`tel:${custPhone}`}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                >
                  <MdPhone size={18} />
                </a>

                <a
                  href={`https://t.me/+855${custPhone.replace(/[^0-9]/g, "").replace(/^0/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: "#f0f9ff",
                    color: "#0284c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                >
                  <FaTelegram size={18} />
                </a>
              </div>
            </div>

            {/* Address with Open Map Button */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                padding: "12px",
                border: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <MdLocationOn size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span style={{ fontSize: "13px", color: "#334155", fontWeight: "600", lineHeight: "1.4" }}>
                  {custAddress}
                </span>
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(custAddress)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: "700",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <MdMap size={13} />
                <span>{t.openMap}</span>
              </a>
            </div>
          </div>

          {/* Parcel Information Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
              {t.parcelInfo}
            </span>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                <span>{t.codAmount}</span>
                <span style={{ fontWeight: "800", color: "#0f172a" }}>${codVal}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                <span>{t.deliveryFee}</span>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>${feeVal}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "8px",
                  borderTop: "1px solid #f1f5f9",
                  fontWeight: "900",
                  fontSize: "15px",
                  color: "#2563eb",
                }}
              >
                <span>{t.totalValue}</span>
                <span>${totalVal}</span>
              </div>
            </div>
          </div>

          {/* Delivery Note */}
          <div
            style={{
              backgroundColor: "#fffbeb",
              border: "1px solid #fef3c7",
              borderRadius: "16px",
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: "11.5px", color: "#b45309", fontWeight: "800", textTransform: "uppercase" }}>
              {t.deliveryNotes}
            </div>
            <div style={{ fontSize: "13px", color: "#78350f", fontWeight: "600", marginTop: "4px" }}>
              {order?.note || "Handle with care. Call customer before arrival."}
            </div>
          </div>

          {/* Bottom Action Button */}
          <button
            onClick={() => setShowActionsSheet(true)}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "16px",
              fontSize: "15px",
              fontWeight: "800",
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(37, 99, 235, 0.25)",
            }}
          >
            {t.orderActions}
          </button>
        </div>
      )}

      {/* 4. TAB 2: SCREEN 06 MAP & TRACKING */}
      {activeTab === "tracking" && (
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Interactive Map Preview Card */}
          <div
            style={{
              width: "100%",
              height: "240px",
              borderRadius: "20px",
              backgroundColor: "#e2e8f0",
              overflow: "hidden",
              position: "relative",
              border: "1px solid #cbd5e1",
              backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
              backgroundSize: "16px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(6px)",
                padding: "6px 12px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "800",
                color: "#1e3a8a",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              📍 Phnom Penh Live Route
            </div>

            {/* Store Pickup Pin */}
            <div
              style={{
                position: "absolute",
                left: "25%",
                top: "40%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(37,99,235,0.4)",
                }}
              >
                🏪
              </div>
              <span
                style={{
                  backgroundColor: "#ffffff",
                  fontSize: "10px",
                  fontWeight: "800",
                  padding: "2px 6px",
                  borderRadius: "6px",
                  marginTop: "2px",
                }}
              >
                Store
              </span>
            </div>

            {/* Customer Delivery Pin */}
            <div
              style={{
                position: "absolute",
                right: "25%",
                bottom: "35%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(22,163,74,0.4)",
                }}
              >
                📍
              </div>
              <span
                style={{
                  backgroundColor: "#ffffff",
                  fontSize: "10px",
                  fontWeight: "800",
                  padding: "2px 6px",
                  borderRadius: "6px",
                  marginTop: "2px",
                }}
              >
                Customer
              </span>
            </div>
          </div>

          {/* Delivery Progress Step-by-Step */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "18px",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
              {t.deliveryProgress}
            </span>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { title: "Booking Created", time: "23 Dec 2024 • 08:30 AM", done: true },
                { title: "Pickup from Store", time: "23 Dec 2024 • 09:00 AM", done: true },
                { title: "In Delivery", time: "23 Dec 2024 • 09:15 AM", done: true, current: true },
                { title: "Delivered", time: "Estimated: 09:45 AM", done: false },
              ].map((step, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor: step.done ? "#2563eb" : "#e2e8f0",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "800",
                      flexShrink: 0,
                    }}
                  >
                    {step.done ? "✓" : idx + 1}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span
                      style={{
                        fontSize: "13.5px",
                        fontWeight: step.current ? "900" : "700",
                        color: step.current ? "#2563eb" : "#0f172a",
                      }}
                    >
                      {step.title}
                    </span>
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>{step.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rider Information Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "16px",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: "900",
                }}
              >
                🚴
              </div>
              <div>
                <div style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
                  Sokha (Rider)
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                  ⭐ 4.9 • 088 123 456
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setActiveTab("chat")}
                style={{
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  border: "none",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Chat
              </button>

              <a
                href="tel:088123456"
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <MdPhone size={14} />
                <span>Call</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: SCREEN 05 CHAT WITH RIDER */}
      {activeTab === "chat" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 180px)",
            backgroundColor: "#f8fafc",
          }}
        >
          {/* Chat Messages Thread */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((msg) => {
              const isMe = msg.sender === "merchant";
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isMe ? "flex-end" : "flex-start",
                  }}
                >
                  <span style={{ fontSize: "10.5px", color: "#94a3b8", marginBottom: "3px" }}>
                    {msg.senderName} • {msg.time}
                  </span>

                  <div
                    style={{
                      maxWidth: "80%",
                      backgroundColor: isMe ? "#2563eb" : "#ffffff",
                      color: isMe ? "#ffffff" : "#0f172a",
                      padding: "10px 14px",
                      borderRadius: isMe ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                      fontSize: "13.5px",
                      fontWeight: "600",
                      lineHeight: "1.4",
                    }}
                  >
                    {msg.text}

                    {msg.hasLocationCard && (
                      <div
                        style={{
                          marginTop: "8px",
                          backgroundColor: "#eff6ff",
                          borderRadius: "10px",
                          padding: "8px 10px",
                          border: "1px solid #bfdbfe",
                          color: "#1e3a8a",
                          fontSize: "12px",
                        }}
                      >
                        📍 {msg.address}
                        <button
                          type="button"
                          onClick={() => setActiveTab("tracking")}
                          style={{
                            marginTop: "6px",
                            width: "100%",
                            padding: "6px",
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                        >
                          View Location
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: "12px 16px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <button
              type="button"
              onClick={() => alert("Photo attachment")}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                padding: "6px",
              }}
            >
              <MdCameraAlt size={22} />
            </button>

            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "20px",
                border: "1.5px solid #e2e8f0",
                fontSize: "13.5px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />

            <button
              type="submit"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <MdSend size={18} />
            </button>
          </form>
        </div>
      )}

      {/* 6. SCREEN 07: ORDER ACTIONS BOTTOM SHEET / MODAL */}
      {showActionsSheet && (
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
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
              padding: "20px 20px 32px",
              width: "100%",
              maxWidth: "430px",
              boxShadow: "0 -10px 30px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "10px",
              }}
            >
              <span style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                #{displayCode} Actions
              </span>
              <button
                type="button"
                onClick={() => setShowActionsSheet(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <MdClose size={22} />
              </button>
            </div>

            {/* Action Items List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setShowActionsSheet(false);
                  setActiveTab("chat");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #f1f5f9",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#0f172a",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <MdChat size={20} color="#2563eb" />
                <span>Chat with Rider</span>
              </button>

              <a
                href="tel:088123456"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #f1f5f9",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#0f172a",
                  textDecoration: "none",
                }}
              >
                <MdPhone size={20} color="#16a34a" />
                <span>Call Rider</span>
              </a>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(custAddress)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #f1f5f9",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#0f172a",
                  textDecoration: "none",
                }}
              >
                <MdMap size={20} color="#ef4444" />
                <span>View Location (Open Google Map)</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  alert("Address update requested");
                  setShowActionsSheet(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #f1f5f9",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#0f172a",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <MdEdit size={20} color="#8b5cf6" />
                <span>Update Address</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  alert("Speed up request sent to dispatch operator!");
                  setShowActionsSheet(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#2563eb",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <MdSpeed size={20} color="#2563eb" />
                <span>Request to Speed Up</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
