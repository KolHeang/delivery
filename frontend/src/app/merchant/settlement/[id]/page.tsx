"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdArrowBack,
  MdPrint,
  MdShare,
  MdReceiptLong,
  MdStorefront,
  MdInventory2,
  MdCheckCircle,
  MdContentCopy,
} from "react-icons/md";

export default function MerchantReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { lang } = useLanguage();
  const resolvedParams = use(params);
  const receiptId = resolvedParams.id;

  const [receipt, setReceipt] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const t = {
    title: lang === "km" ? "ព័ត៌មានវិក្កយបត្រ" : "Payment Receipt",
    receiptNo: lang === "km" ? "លេខវិក្កយបត្រ" : "Receipt No",
    paymentDate: lang === "km" ? "កាលបរិច្ឆេទ" : "Payment Date",
    paidVia: lang === "km" ? "ទូទាត់តាម" : "Paid Via",
    transferRef: lang === "km" ? "លេខយោងប្រតិបត្តិការ" : "Transfer Ref",
    totalNetAmount: lang === "km" ? "ទឹកប្រាក់ទូទាត់សរុប" : "Total Net Amount",
    ordersInReceipt: lang === "km" ? "បញ្ជីកញ្ចប់ក្នុងវិក្កយបត្រ" : "Orders in Receipt",
    printReceipt: lang === "km" ? "បោះពុម្ពវិក្កយបត្រ" : "Print / PDF",
    shareReceipt: lang === "km" ? "ចែករំលែក" : "Share",
    copiedText: lang === "km" ? "បានចម្លង!" : "Copied!",
    paid: lang === "km" ? "បានទូទាត់" : "PAID",
    store: lang === "km" ? "ហាង" : "Store",
    notFound: lang === "km" ? "រកមិនឃើញវិក្កយបត្រនេះទេ" : "Receipt not found",
    backToList: lang === "km" ? "ត្រឡប់ទៅបញ្ជី" : "Back to List",
  };

  const loadReceiptDetail = async () => {
    setLoading(true);
    try {
      const [res, profRes] = await Promise.all([
        api.get(`/mobile/merchant/settlements/${receiptId}`).catch(() => null),
        api.get(`/mobile/merchant/profile`).catch(() => null),
      ]);

      if (profRes?.data) setProfile(profRes.data);

      if (res?.data) {
        setReceipt(res.data?.data || res.data);
      } else {
        // Fallback search in all settlements if direct id isn't single-endpoint
        const listRes = await api.get(`/mobile/merchant/settlements`).catch(() => null);
        const list = Array.isArray(listRes?.data)
          ? listRes.data
          : listRes?.data?.data || listRes?.data?.results || [];
        const found = list.find(
          (item: any) =>
            String(item.id) === String(receiptId) ||
            String(item.reference) === String(receiptId)
        );
        if (found) setReceipt(found);
      }
    } catch (err) {
      console.error("Failed to load receipt detail", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/merchant/login");
      return;
    }
    loadReceiptDetail();
  }, [receiptId]);

  const user = getUser() as any;
  const storeName =
    profile?.name || profile?.nameKh || user?.name || (lang === "km" ? "ហាង" : "Store");
  const storePhone = profile?.phone || user?.phone || "-";

  const handleShare = () => {
    if (!receipt) return;
    const shareText = `E-Express Receipt: #${receipt.id}\nStore: ${storeName}\nAmount: $${(
      Number(receipt.totalAmount) || 0
    ).toFixed(2)}\nDate: ${receipt.date || "N/A"}\nRef: ${receipt.transferRef || "-"}`;

    if (navigator.share) {
      navigator.share({ title: `Receipt #${receipt.id}`, text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid #bfdbfe",
            borderTopColor: "#2563eb",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          padding: "20px",
          textAlign: "center",
          gap: "12px",
        }}
      >
        <MdReceiptLong size={48} color="#94a3b8" />
        <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
          {t.notFound}
        </div>
        <button
          type="button"
          onClick={() => router.push("/merchant/settlement")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          {t.backToList}
        </button>
      </div>
    );
  }

  const totalAmt = Number(receipt.totalAmount ?? receipt.amount ?? 0);
  const totalAmtKhr = Number(receipt.totalAmountKhr ?? receipt.amountKHR ?? 0);
  const ordersList: any[] = receipt.orders || [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, sans-serif",
        paddingBottom: "100px",
        maxWidth: "480px",
        margin: "0 auto",
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={() => router.push("/merchant/settlement")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "#0f172a",
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
            {t.title}
          </h1>
        </div>

        {(() => {
          const isPaid = String(receipt?.status || "").toLowerCase() === "paid";
          return (
            <span
              style={{
                backgroundColor: isPaid ? "#dcfce7" : "#fef3c7",
                color: isPaid ? "#15803d" : "#b45309",
                padding: "4px 10px",
                borderRadius: "10px",
                fontSize: "11px",
                fontWeight: "900",
                letterSpacing: "0.5px",
              }}
            >
              {isPaid
                ? lang === "km"
                  ? "បានទូទាត់"
                  : "PAID"
                : lang === "km"
                ? "រង់ចាំទូទាត់"
                : "PENDING"}
            </span>
          );
        })()}
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* 2. Store Banner Card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            padding: "16px 18px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "14px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0,
              }}
            >
              🏪
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a" }}>
                {storeName}
              </div>
              <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>
                {storePhone}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Main Financial Breakdown Card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            padding: "20px 18px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
            <span style={{ color: "#64748b", fontWeight: "600" }}>{t.receiptNo}:</span>
            <span style={{ fontWeight: "800", color: "#0f172a", fontFamily: "monospace" }}>
              #{receipt.id}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
            <span style={{ color: "#64748b", fontWeight: "600" }}>{t.paymentDate}:</span>
            <span style={{ fontWeight: "700", color: "#0f172a" }}>
              {receipt.date ? new Date(receipt.date).toLocaleDateString() : "N/A"}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
            <span style={{ color: "#64748b", fontWeight: "600" }}>{t.paidVia}:</span>
            <span style={{ fontWeight: "800", color: "#2563eb" }}>
              {receipt.paymentMethod || "Bank Transfer / Cash"}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
            <span style={{ color: "#64748b", fontWeight: "600" }}>{t.transferRef}:</span>
            <span style={{ fontWeight: "700", color: "#0f172a", fontFamily: "monospace" }}>
              {receipt.transferRef || "-"}
            </span>
          </div>

          {/* Highlighted Net Total Amount */}
          <div
            style={{
              marginTop: "8px",
              paddingTop: "14px",
              borderTop: "1.5px dashed #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
              {t.totalNetAmount}
            </span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "22px", fontWeight: "900", color: "#16a34a" }}>
                ${totalAmt.toFixed(2)}
              </div>
              {totalAmtKhr > 0 && (
                <div style={{ fontSize: "11.5px", color: "#94a3b8", fontWeight: "600" }}>
                  ៛ {totalAmtKhr.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Orders in Receipt Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14.5px",
              fontWeight: "800",
              color: "#334155",
              paddingLeft: "4px",
            }}
          >
            <MdInventory2 size={18} color="#2563eb" />
            <span>
              {t.ordersInReceipt} ({ordersList.length})
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {ordersList.length === 0 ? (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "20px",
                  textAlign: "center",
                  border: "1px dashed #e2e8f0",
                  color: "#94a3b8",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                No linked orders recorded
              </div>
            ) : (
              ordersList.map((ord: any, idx: number) => {
                const ordAmt = Number(ord.amount ?? ord.cod ?? 0);
                return (
                  <div
                    key={ord.id || idx}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "16px",
                      padding: "12px 16px",
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                        #{ord.id}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          fontWeight: "600",
                          marginTop: "2px",
                        }}
                      >
                        {ord.customerName || "Customer"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "15px", fontWeight: "900", color: "#16a34a" }}>
                        +${ordAmt.toFixed(2)}
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          backgroundColor: "#dcfce7",
                          color: "#15803d",
                          padding: "2px 6px",
                          borderRadius: "6px",
                        }}
                      >
                        {ord.status || "Delivered"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. Fixed Bottom Action Buttons */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          padding: "14px 20px",
          display: "flex",
          gap: "10px",
          zIndex: 50,
          boxShadow: "0 -4px 16px rgba(0,0,0,0.05)",
        }}
      >
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            flex: 1,
            height: "48px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "14px",
            fontSize: "14.5px",
            fontWeight: "800",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
          }}
        >
          <MdPrint size={20} />
          <span>{t.printReceipt}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          style={{
            width: "50px",
            height: "48px",
            backgroundColor: "#f1f5f9",
            color: "#334155",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MdShare size={20} />
        </button>
      </div>
    </div>
  );
}
