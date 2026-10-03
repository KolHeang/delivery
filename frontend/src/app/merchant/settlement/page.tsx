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
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showOrderListModal, setShowOrderListModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");

  const t = {
    title: lang === "km" ? "ការទូទាត់ និងវិក្កយបត្រ" : "Payments",
    amountToReceive: lang === "km" ? "ទឹកប្រាក់ត្រូវទទួលបាន" : "Amount to Receive",
    amountCollected: lang === "km" ? "ប្រាក់ប្រមូលបាន" : "Amount Collected",
    pendingAmount: lang === "km" ? "ប្រាក់កំពុងរង់ចាំ" : "Pending Amount",
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [profRes, settRes] = await Promise.all([
        api.get("/mobile/merchant/profile").catch(() => null),
        api.get("/mobile/merchant/settlements").catch(() => null),
      ]);
      if (profRes?.data) setProfile(profRes.data);
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

  // Sample settlement history matching reference screens 13, 14, 15, 16, 17
  const sampleReceipts = [
    {
      id: "REC2024103106",
      date: "31 Oct 2024",
      period: "1 Oct 2024 - 31 Oct 2024",
      totalOrders: 17,
      totalAmount: 1274.5,
      totalAmountKhr: 5225450,
      paymentMethod: "ABA Bank",
      transferRef: "#ABA887711",
      status: "Paid",
      orders: [
        { id: "EX10235", customerName: "Sokha Chan", amount: 28.2, status: "Delivered" },
        { id: "EX10234", customerName: "Menglong Ngeth", amount: 42.0, status: "Delivered" },
        { id: "EX10233", customerName: "Kim Seng", amount: 18.5, status: "Delivered" },
        { id: "EX10232", customerName: "Chanthy Roeun", amount: 35.0, status: "Delivered" },
        { id: "EX10231", customerName: "Vanna Long", amount: 22.0, status: "Delivered" },
        { id: "EX10230", customerName: "Dara Som", amount: 15.0, status: "Delivered" },
        { id: "EX10229", customerName: "Phalla Keo", amount: 55.0, status: "Delivered" },
        { id: "EX10228", customerName: "Sreynich Heng", amount: 32.5, status: "Delivered" },
        { id: "EX10227", customerName: "Bopha Pich", amount: 44.0, status: "Delivered" },
        { id: "EX10226", customerName: "Rithy San", amount: 68.0, status: "Delivered" },
      ],
    },
    {
      id: "REC2024093005",
      date: "30 Sep 2024",
      period: "1 Sep 2024 - 30 Sep 2024",
      totalOrders: 12,
      totalAmount: 810.0,
      totalAmountKhr: 3321000,
      paymentMethod: "Wing Bank",
      transferRef: "#WING554433",
      status: "Paid",
      orders: [
        { id: "EX10190", customerName: "Channa Pov", amount: 30.0, status: "Delivered" },
        { id: "EX10189", customerName: "Sopheap Dy", amount: 45.0, status: "Delivered" },
      ],
    },
    {
      id: "REC2024083104",
      date: "31 Aug 2024",
      period: "1 Aug 2024 - 31 Aug 2024",
      totalOrders: 10,
      totalAmount: 735.2,
      totalAmountKhr: 3014320,
      paymentMethod: "ABA Bank",
      transferRef: "#ABA332211",
      status: "Paid",
      orders: [],
    },
  ];

  const user = getUser() as any;
  const storeName = profile?.name || user?.name || "Little Girl Studio";
  const storePhone = profile?.phone || user?.phone || "098 387 7786";

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
                ៛ 2,014,000
              </span>
              <span style={{ fontSize: "17px", fontWeight: "700", color: "#dbeafe" }}>
                / $232.50
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
                ៛ 2,151,000
              </div>
              <div style={{ fontSize: "12px", color: "#93c5fd", fontWeight: "700" }}>
                $550.00
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#fed7aa", fontWeight: "600" }}>
                {t.pendingAmount}
              </div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#fef08a", marginTop: "2px" }}>
                ៛ 724,000
              </div>
              <div style={{ fontSize: "12px", color: "#fde047", fontWeight: "700" }}>
                $185.00
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

        {/* 4. Payment Receipt History List (Screen 13/14 Match) */}
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
            {sampleReceipts.map((rec) => (
              <div
                key={rec.id}
                onClick={() => setSelectedReceipt(rec)}
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
                        #{rec.id}
                      </span>
                      <span
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#15803d",
                          padding: "2px 6px",
                          borderRadius: "6px",
                          fontSize: "10px",
                          fontWeight: "800",
                        }}
                      >
                        {rec.status}
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>
                      {rec.date} • {rec.totalOrders} Orders
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#16a34a" }}>
                    +${rec.totalAmount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", marginTop: "2px" }}>
                    ៛ {rec.totalAmountKhr.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- MODAL 1: SCREEN 15 RECEIPT DETAIL --- */}
      {selectedReceipt && (
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
              maxWidth: "380px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "12px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                {t.receiptDetail}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <MdClose size={22} />
              </button>
            </div>

            {/* Store & Paid Badge */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    fontWeight: "900",
                  }}
                >
                  🏪
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                    {storeName}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{storePhone}</div>
                </div>
              </div>

              <span
                style={{
                  backgroundColor: "#dcfce7",
                  color: "#15803d",
                  padding: "4px 10px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: "800",
                }}
              >
                PAID
              </span>
            </div>

            {/* Breakdown */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "13.5px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Receipt No:</span>
                <span style={{ fontWeight: "800", color: "#0f172a", fontFamily: "monospace" }}>
                  #{selectedReceipt.id}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Payment Date:</span>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>{selectedReceipt.date}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Paid Via:</span>
                <span style={{ fontWeight: "700", color: "#2563eb" }}>
                  {selectedReceipt.paymentMethod}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Transfer Ref:</span>
                <span style={{ fontWeight: "700", color: "#0f172a", fontFamily: "monospace" }}>
                  {selectedReceipt.transferRef}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "8px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <span style={{ fontWeight: "800", color: "#0f172a" }}>Total Net Amount:</span>
                <span style={{ fontWeight: "900", color: "#16a34a", fontSize: "16px" }}>
                  ${selectedReceipt.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* View Order List (17) Button */}
            <button
              type="button"
              onClick={() => setShowOrderListModal(true)}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                border: "1.5px solid #bfdbfe",
                borderRadius: "12px",
                fontSize: "13.5px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <MdInventory2 size={18} />
              <span>View Order List ({selectedReceipt.totalOrders})</span>
            </button>

            {/* Print & Share actions */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <MdPrint size={18} />
                <span>{t.printReceipt}</span>
              </button>

              <button
                type="button"
                onClick={() => alert("Receipt copied to clipboard")}
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdShare size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: SCREEN 16 ORDERS IN RECEIPT --- */}
      {showOrderListModal && selectedReceipt && (
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
            zIndex: 1100,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              padding: "24px",
              width: "100%",
              maxWidth: "380px",
              maxHeight: "80vh",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
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
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                {t.ordersInReceipt}
              </h3>
              <button
                type="button"
                onClick={() => setShowOrderListModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <MdClose size={22} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {selectedReceipt.orders.map((ord: any) => (
                <div
                  key={ord.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a" }}>
                      #{ord.id}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#64748b" }}>{ord.customerName}</div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "#16a34a" }}>
                      +${ord.amount.toFixed(2)}
                    </div>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: "700",
                        color: "#15803d",
                        backgroundColor: "#dcfce7",
                        padding: "1px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowOrderListModal(false)}
              style={{
                width: "100%",
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
      )}

      {/* --- MODAL 3: SCREEN 17 PRINTABLE INVOICE / RECEIPT --- */}
      {showPrintModal && selectedReceipt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              width: "100%",
              maxWidth: "380px",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              fontFamily: "monospace",
            }}
          >
            <div style={{ textAlign: "center", borderBottom: "1.5px dashed #cbd5e1", paddingBottom: "12px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "900", color: "#1e3a8a" }}>
                E-Express
              </h2>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Payment Receipt</div>
            </div>

            <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div>Store: {storeName}</div>
              <div>Phone: {storePhone}</div>
              <div>Date: {selectedReceipt.date}</div>
              <div>Receipt: #{selectedReceipt.id}</div>
              <div>Paid Via: {selectedReceipt.paymentMethod}</div>
            </div>

            <div
              style={{
                borderTop: "1.5px dashed #cbd5e1",
                borderBottom: "1.5px dashed #cbd5e1",
                padding: "8px 0",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800" }}>
                <span>Item</span>
                <span>Amount</span>
              </div>
              {selectedReceipt.orders.slice(0, 5).map((ord: any) => (
                <div
                  key={ord.id}
                  style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}
                >
                  <span>#{ord.id}</span>
                  <span>${ord.amount.toFixed(2)}</span>
                </div>
              ))}
              {selectedReceipt.orders.length > 5 && (
                <div style={{ color: "#64748b", marginTop: "4px" }}>
                  + {selectedReceipt.orders.length - 5} more orders...
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "900" }}>
              <span>Total Paid:</span>
              <span style={{ color: "#16a34a" }}>${selectedReceipt.totalAmount.toFixed(2)}</span>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Print / PDF
              </button>

              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
