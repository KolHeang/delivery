"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import {
  MdArrowBack,
  MdContentCopy,
  MdCall,
  MdDirections,
  MdCheckCircle,
  MdError,
  MdLocalShipping,
  MdSchedule,
  MdPerson,
  MdStore,
  MdAttachMoney,
  MdLocationOn,
  MdHistory,
  MdCheck,
  MdRefresh,
  MdClose,
  MdDescription,
} from "react-icons/md";

export default function DriverTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id ? Number(params.id) : null;

  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Problem Dialog state
  const [problemOpen, setProblemOpen] = useState(false);
  const [problemReason, setProblemReason] = useState("customer_unreachable");
  const [problemRemark, setProblemRemark] = useState("");

  const loadTaskDetail = async () => {
    if (!taskId) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get(`/mobile/driver/tasks/${taskId}`);
      if (res.data?.data) {
        setTask(res.data.data);
      } else if (res.data) {
        setTask(res.data);
      }
    } catch (err: any) {
      console.warn("Direct task fetch failed, trying list fallback:", err);
      try {
        const listRes = await api.get("/mobile/driver/tasks");
        const list = Array.isArray(listRes.data?.data)
          ? listRes.data.data
          : Array.isArray(listRes.data)
            ? listRes.data
            : [];
        const found = list.find((t: any) => t.id === taskId);
        if (found) {
          setTask(found);
        } else {
          setErrorMsg("រកមិនឃើញកញ្ចប់អីវ៉ាន់នេះទេ (Task not found)");
        }
      } catch (listErr: any) {
        setErrorMsg("មិនអាចទាញយកទិន្នន័យបានទេ");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/driver/login");
      return;
    }
    loadTaskDetail();
  }, [taskId]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateStatus = async (newStatus: string, remark?: string) => {
    if (!taskId || updating) return;
    setUpdating(true);
    try {
      await api.patch(`/mobile/driver/tasks/${taskId}/status`, {
        status: newStatus,
        remark: remark || (newStatus === "in-transit" ? "Driver started delivery" : undefined),
        note: remark,
      });
      await loadTaskDetail();
      if (problemOpen) setProblemOpen(false);
    } catch (err: any) {
      console.error("Status update error:", err);
      alert(err.response?.data?.message || "បរាជ័យក្នុងការកែប្រែស្ថានភាព");
    } finally {
      setUpdating(false);
    }
  };

  const handleReportProblem = async () => {
    const reasonLabels: Record<string, string> = {
      customer_unreachable: "អតិថិជនមិនលើកទូរស័ព្ទ",
      rescheduled: "អតិថិជនសុំពន្យារពេល",
      rejected: "អតិថិជនបដិសេធទទួល",
      wrong_address: "អាសយដ្ឋានមិនត្រឹមត្រូវ",
      damaged: "ទំនិញខូចខាត",
      other: "ផ្សេងៗ",
    };
    const reasonText = reasonLabels[problemReason] || problemReason;
    const finalRemark = problemRemark.trim()
      ? `${reasonText} - ${problemRemark.trim()}`
      : reasonText;
    await handleUpdateStatus("failed", finalRemark);
  };

  const getStatusBadge = (st: string) => {
    if (st === "delivered") {
      return {
        bg: "#10b981",
        textColor: "#065f46",
        lightBg: "#d1fae5",
        border: "#6ee7b7",
        label: "បានដល់អតិថិជន (Delivered)",
        icon: <MdCheckCircle size={18} color="#059669" />,
      };
    }
    if (st === "in-transit" || st === "picked-up") {
      return {
        bg: "#3b82f6",
        textColor: "#1e40af",
        lightBg: "#dbeafe",
        border: "#93c5fd",
        label: "កំពុងដឹកជញ្ជូន (In-Transit)",
        icon: <MdLocalShipping size={18} color="#2563eb" />,
      };
    }
    if (st === "failed") {
      return {
        bg: "#ef4444",
        textColor: "#991b1b",
        lightBg: "#fee2e2",
        border: "#fca5a5",
        label: "មានបញ្ហាដឹកមិនបាន (Failed)",
        icon: <MdError size={18} color="#dc2626" />,
      };
    }
    if (st === "returned") {
      return {
        bg: "#b91c1c",
        textColor: "#7f1d1d",
        lightBg: "#fef2f2",
        border: "#fecaca",
        label: "បានត្រឡប់មកវិញ (Returned)",
        icon: <MdError size={18} color="#b91c1c" />,
      };
    }
    return {
      bg: "#f59e0b",
      textColor: "#92400e",
      lightBg: "#fef3c7",
      border: "#fcd34d",
      label: "កំពុងរង់ចាំអ្នកដឹក (Pending)",
      icon: <MdSchedule size={18} color="#d97706" />,
    };
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3.5px solid #e2e8f0",
            borderTopColor: "#581c87",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "700" }}>
          កំពុងទាញយកព័ត៌មានកញ្ចប់...
        </span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (errorMsg || !task) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
          textAlign: "center",
        }}
      >
        <MdError size={52} color="#ef4444" />
        <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
          {errorMsg || "រកមិនឃើញកញ្ចប់អីវ៉ាន់"}
        </div>
        <button
          onClick={() => router.push("/driver/tasks")}
          style={{
            backgroundColor: "#581c87",
            color: "#ffffff",
            border: "none",
            borderRadius: "14px",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "800",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(88,28,135,0.25)",
          }}
        >
          ត្រឡប់ទៅបញ្ជីកញ្ចប់អីវ៉ាន់
        </button>
      </div>
    );
  }

  const trackingCode = task.trackingCode || `ONE${task.id}`;
  const statusInfo = getStatusBadge(task.status);
  const codVal = Number(task.cod || task.codAmount || task.price || 0).toFixed(2);
  const feeVal = Number(task.deliveryFee || 0).toFixed(2);
  const codRiel = Math.round(
    Number(task.cod || task.codAmount || task.price || 0) * 4100,
  ).toLocaleString();
  const receiverPhone = task.receiverPhone || "092652067";

  // Check if receiverName is valid and not duplicate of phone
  const rawReceiverName = task.receiverName?.trim();
  const isDuplicateOfPhone =
    rawReceiverName === receiverPhone || rawReceiverName === receiverPhone.replace(/\s+/g, "");
  const hasValidReceiverName =
    rawReceiverName &&
    rawReceiverName !== "-" &&
    rawReceiverName !== "—" &&
    rawReceiverName !== "null" &&
    rawReceiverName !== "undefined" &&
    !isDuplicateOfPhone;

  const totalToCollect =
    Number(task.cod || task.codAmount || task.price || 0) +
    (task.deliveryFeePayer === "receiver" ? Number(task.deliveryFee || 0) : 0);
  const totalToCollectRiel = Math.round(totalToCollect * 4100).toLocaleString();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        paddingBottom: "180px",
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
      }}
    >
      {/* ── Top Hero Header with Integrated Tracking Code ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #581c87 0%, #3b0764 100%)",
          color: "#ffffff",
          padding: "14px 18px 24px",
          borderBottomLeftRadius: "24px",
          borderBottomRightRadius: "24px",
          boxShadow: "0 8px 20px rgba(88, 28, 135, 0.25)",
        }}
      >
        {/* Top bar: Back, Title, Refresh */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={() => router.push("/driver/tasks")}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "50%",
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#ffffff",
              backdropFilter: "blur(4px)",
            }}
          >
            <MdArrowBack size={22} />
          </button>

          <span style={{ fontSize: "16.5px", fontWeight: "800", letterSpacing: "0.2px" }}>
            ព័ត៌មានលម្អិតកញ្ចប់អីវ៉ាន់
          </span>

          <button
            onClick={loadTaskDetail}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "50%",
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#ffffff",
              backdropFilter: "blur(4px)",
            }}
          >
            <MdRefresh size={20} />
          </button>
        </div>

        {/* Tracking Code and Status Badge inside Hero Header */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(10px)",
            borderRadius: "18px",
            padding: "14px 16px",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>
                លេខកូដតាមដាន (Tracking Code)
              </div>
              <div
                style={{
                  fontSize: "19px",
                  fontWeight: "900",
                  letterSpacing: "0.5px",
                  marginTop: "2px",
                }}
              >
                {trackingCode}
              </div>
            </div>

            <button
              onClick={() => copyToClipboard(trackingCode)}
              style={{
                backgroundColor: copied ? "#10b981" : "#ffffff",
                color: copied ? "#ffffff" : "#581c87",
                border: "none",
                borderRadius: "10px",
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "all 0.2s ease",
              }}
            >
              {copied ? <MdCheck size={15} /> : <MdContentCopy size={14} />}
              <span>{copied ? "បានចម្លង ✓" : "ចម្លងកូដ"}</span>
            </button>
          </div>

          {/* Status Badge */}
          <div
            style={{
              backgroundColor: statusInfo.lightBg,
              border: `1px solid ${statusInfo.border}`,
              borderRadius: "12px",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {statusInfo.icon}
            <span style={{ fontSize: "13px", fontWeight: "800", color: statusInfo.textColor }}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Cards Body ── */}
      <div
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          marginTop: "-6px",
        }}
      >
        {/* 1. Customer Card (អតិថិជនអ្នកទទួល) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            padding: "18px",
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Card Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                backgroundColor: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MdPerson size={20} color="#2563eb" />
            </div>
            <div>
              <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
                ព័ត៌មានអ្នកទទួល (Customer)
              </span>
              <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                ទាក់ទង និងទីតាំងដឹកជញ្ជូន
              </span>
            </div>
          </div>

          {/* Customer Info Lines */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* If Name is valid and not duplicate of phone */}
            {hasValidReceiverName && (
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ color: "#64748b", fontSize: "13px", fontWeight: "600" }}>
                  ឈ្មោះអ្នកទទួល:
                </span>
                <span style={{ fontWeight: "800", color: "#0f172a", fontSize: "14px" }}>
                  {rawReceiverName}
                </span>
              </div>
            )}

            {/* Phone */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontSize: "13px", fontWeight: "600" }}>
                លេខទូរស័ព្ទ:
              </span>
              <span
                style={{
                  fontWeight: "900",
                  color: "#0f172a",
                  fontSize: "15px",
                  letterSpacing: "0.3px",
                }}
              >
                {receiverPhone}
              </span>
            </div>

            {/* Address */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "2px" }}
            >
              <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "600" }}>
                អាសយដ្ឋានដឹកជញ្ជូន:
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "6px",
                  backgroundColor: "#fff7ed",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: "1px solid #ffedd5",
                }}
              >
                <MdLocationOn
                  size={18}
                  color="#ea580c"
                  style={{ flexShrink: 0, marginTop: "2px" }}
                />
                <span
                  style={{
                    fontSize: "13.5px",
                    fontWeight: "700",
                    color: "#9a3412",
                    lineHeight: 1.4,
                  }}
                >
                  {task.receiverAddress || "មិនមានអាសយដ្ឋាន"}{" "}
                  {task.zone?.name ? `(${task.zone.name})` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons: Call & Maps */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginTop: "2px",
            }}
          >
            <a
              href={`tel:${receiverPhone}`}
              style={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                padding: "12px",
                borderRadius: "14px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: "800",
                fontSize: "14px",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
              }}
            >
              <MdCall size={20} />
              <span>ហៅទូរស័ព្ទ</span>
            </a>

            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(task.receiverAddress || "Phnom Penh")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                padding: "12px",
                borderRadius: "14px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: "800",
                fontSize: "14px",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              }}
            >
              <MdDirections size={20} />
              <span>ផែនទី</span>
            </a>
          </div>
        </div>

        {/* 2. Merchant / Sender Card (អ្នកផ្ញើ / ហាង) */}
        {(task.merchant || task.senderName || task.senderPhone) && (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "16px 18px",
              boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                  backgroundColor: "#fdf4ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdStore size={20} color="#9333ea" />
              </div>
              <div>
                <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
                  ព័ត៌មានអ្នកផ្ញើ / ហាង (Merchant)
                </span>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                  ម្ចាស់ទំនិញដែលបានផ្ញើ
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ color: "#64748b", fontWeight: "600" }}>ឈ្មោះហាង/អ្នកផ្ញើ:</span>
                <span style={{ fontWeight: "800", color: "#0f172a" }}>
                  {task.merchant?.businessName ||
                    task.merchant?.user?.fullName ||
                    task.senderName ||
                    "ហាងទំនិញ"}
                </span>
              </div>

              {(task.merchant?.phone || task.senderPhone) && (
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span style={{ color: "#64748b", fontWeight: "600" }}>លេខទូរស័ព្ទ:</span>
                  <a
                    href={`tel:${task.merchant?.phone || task.senderPhone}`}
                    style={{
                      color: "#2563eb",
                      fontWeight: "800",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      backgroundColor: "#eff6ff",
                      padding: "4px 10px",
                      borderRadius: "8px",
                    }}
                  >
                    <MdCall size={14} />
                    {task.merchant?.phone || task.senderPhone}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Payment & COD Card - Iconic Yellow Highlights */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            padding: "18px",
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                backgroundColor: "#fef9c3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MdAttachMoney size={22} color="#ca8a04" />
            </div>
            <div>
              <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
                ការទូទាត់ប្រាក់ & COD
              </span>
              <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                ចំនួនទឹកប្រាក់ទំនិញ និងថ្លៃសេវាដឹក
              </span>
            </div>
          </div>

          {/* Yellow Banner for Total to Collect */}
          <div
            style={{
              backgroundColor: "#ffea60",
              borderRadius: "16px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 2px 10px rgba(254, 240, 138, 0.5)",
            }}
          >
            <div>
              <span style={{ fontSize: "11.5px", fontWeight: "700", color: "#713f12" }}>
                ទឹកប្រាក់ត្រូវប្រមូលពីភ្ញៀវ
              </span>
              <div style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a" }}>
                ${totalToCollect.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "11px", color: "#713f12", fontWeight: "700" }}>
                ប្រាក់រៀល
              </span>
              <div style={{ fontSize: "17px", fontWeight: "900", color: "#0f172a" }}>
                {totalToCollectRiel} ៛
              </div>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontWeight: "600" }}>តម្លៃទំនិញ (COD):</span>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontWeight: "800", color: "#0f172a" }}>${codVal}</span>
                <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "4px" }}>
                  ({codRiel} ៛)
                </span>
              </div>
            </div>

            <div style={{ height: "1px", backgroundColor: "#f1f5f9" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontWeight: "600" }}>ថ្លៃសេវាដឹកជញ្ជូន:</span>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontWeight: "800", color: "#0f172a" }}>${feeVal}</span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#581c87",
                    fontWeight: "700",
                    marginLeft: "6px",
                  }}
                >
                  ({task.deliveryFeePayer === "receiver" ? "អ្នកទទួលបង់" : "អ្នកផ្ញើបង់"})
                </span>
              </div>
            </div>

            <div style={{ height: "1px", backgroundColor: "#f1f5f9" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontWeight: "600" }}>ស្ថានភាពទូទាត់ COD:</span>
              <span
                style={{
                  fontWeight: "800",
                  fontSize: "12px",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  backgroundColor: task.isCodSettled ? "#dcfce7" : "#fee2e2",
                  color: task.isCodSettled ? "#16a34a" : "#dc2626",
                }}
              >
                {task.isCodSettled ? "បានទូទាត់រួច" : "មិនទាន់ទូទាត់"}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Notes / Instructions */}
        {(task.itemDescription || task.note || task.specialInstructions) && (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "16px 18px",
              boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MdDescription size={18} color="#581c87" />
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                កំណត់សម្គាល់បន្ថែម
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "#475569", margin: 0, lineHeight: 1.5 }}>
              {task.itemDescription || task.note || task.specialInstructions}
            </p>
          </div>
        )}

        {/* 5. Tracking Events Timeline */}
        {Array.isArray(task.events) && task.events.length > 0 && (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "16px 18px",
              boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MdHistory size={20} color="#64748b" />
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                ប្រវត្តិនៃការដឹកជញ្ជូន
              </span>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px", paddingLeft: "6px" }}
            >
              {task.events.map((evt: any, idx: number) => {
                const isLast = idx === task.events.length - 1;
                return (
                  <div
                    key={evt.id || idx}
                    style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}
                  >
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: isLast ? "#581c87" : "#cbd5e1",
                        marginTop: "5px",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>
                        {evt.status || evt.title || "ធ្វើបច្ចុប្បន្នភាព"}
                      </span>
                      {evt.note && (
                        <span style={{ fontSize: "12px", color: "#64748b" }}>{evt.note}</span>
                      )}
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {evt.createdAt ? new Date(evt.createdAt).toLocaleString("km-KH") : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed Action Bar Directly Above the 5-Tab Bottom Menu ── */}
      <div
        style={{
          position: "fixed",
          bottom: "66px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#ffffff",
          padding: "10px 16px",
          borderTop: "1px solid #e2e8f0",
          boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.06)",
          zIndex: 90,
        }}
      >
        {/* If assigned/pending: Start delivery */}
        {task.status !== "in-transit" && task.status !== "delivered" && (
          <button
            disabled={updating}
            onClick={() => handleUpdateStatus("in-transit")}
            style={{
              width: "100%",
              backgroundColor: "#581c87",
              color: "#ffffff",
              padding: "15px",
              borderRadius: "16px",
              border: "none",
              fontWeight: "900",
              fontSize: "15px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 6px 18px rgba(88, 28, 135, 0.35)",
              opacity: updating ? 0.7 : 1,
            }}
          >
            <MdLocalShipping size={22} />
            <span>ចាប់ផ្ដើមដឹកជញ្ជូន (In-Transit)</span>
          </button>
        )}

        {/* If in-transit: Complete delivery & Report issue */}
        {task.status === "in-transit" && (
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              disabled={updating}
              onClick={() => handleUpdateStatus("delivered")}
              style={{
                flex: 1.6,
                backgroundColor: "#10b981",
                color: "#ffffff",
                padding: "14px",
                borderRadius: "16px",
                border: "none",
                fontWeight: "900",
                fontSize: "14.5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 6px 18px rgba(16, 185, 129, 0.3)",
                opacity: updating ? 0.7 : 1,
              }}
            >
              <MdCheckCircle size={20} />
              <span>បានប្រគល់ជោគជ័យ</span>
            </button>

            <button
              disabled={updating}
              onClick={() => setProblemOpen(true)}
              style={{
                flex: 1,
                backgroundColor: "#fee2e2",
                color: "#dc2626",
                padding: "14px",
                borderRadius: "16px",
                border: "1px solid #fecaca",
                fontWeight: "800",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
              }}
            >
              <MdError size={18} />
              <span>រាយការណ៍បញ្ហា</span>
            </button>
          </div>
        )}

        {/* If already delivered */}
        {task.status === "delivered" && (
          <div
            style={{
              backgroundColor: "#d1fae5",
              color: "#065f46",
              padding: "14px",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: "900",
              fontSize: "14.5px",
              border: "1px solid #a7f3d0",
            }}
          >
            <MdCheckCircle size={22} color="#059669" />
            <span>កញ្ចប់អីវ៉ាន់នេះបានប្រគល់ជូនរួចរាល់ ✓</span>
          </div>
        )}

        {/* If failed or returned */}
        {(task.status === "failed" || task.status === "returned") && (
          <div style={{ display: "flex", gap: "10px" }}>
            <div
              style={{
                flex: 1,
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                padding: "12px",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontWeight: "800",
                fontSize: "13px",
                border: "1px solid #fca5a5",
              }}
            >
              <MdError size={18} color="#dc2626" />
              <span>
                {task.status === "returned" ? "កញ្ចប់អីវ៉ាន់បានត្រឡប់" : "កញ្ចប់អីវ៉ាន់មានបញ្ហា"}
              </span>
            </div>
            <button
              disabled={updating}
              onClick={() => handleUpdateStatus("in-transit", "Driver retried delivery")}
              style={{
                backgroundColor: "#581c87",
                color: "#ffffff",
                padding: "12px 16px",
                borderRadius: "14px",
                border: "none",
                fontWeight: "800",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              ដឹកម្តងទៀត
            </button>
          </div>
        )}
      </div>

      {/* ── Problem Dialog Modal ── */}
      {problemOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              padding: "22px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MdError size={24} color="#dc2626" />
                <span style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a" }}>
                  រាយការណ៍បញ្ហាដឹកមិនបាន
                </span>
              </div>
              <button
                onClick={() => setProblemOpen(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <MdClose size={18} color="#64748b" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                មូលហេតុ (Reason)
              </label>
              <select
                value={problemReason}
                onChange={(e) => setProblemReason(e.target.value)}
                style={{
                  padding: "11px 12px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  backgroundColor: "#ffffff",
                }}
              >
                <option value="customer_unreachable">អតិថិជនមិនលើកទូរស័ព្ទ (No answer)</option>
                <option value="rescheduled">អតិថិជនសុំពន្យារពេល (Rescheduled)</option>
                <option value="rejected">អតិថិជនបដិសេធទទួល (Customer rejected)</option>
                <option value="wrong_address">អាសយដ្ឋានមិនត្រឹមត្រូវ (Wrong address)</option>
                <option value="damaged">ទំនិញខូចខាត (Damaged)</option>
                <option value="other">ផ្សេងៗ (Other)</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                កំណត់សម្គាល់បន្ថែម
              </label>
              <textarea
                value={problemRemark}
                onChange={(e) => setProblemRemark(e.target.value)}
                placeholder="បញ្ជាក់លម្អិតបន្ថែម..."
                rows={3}
                style={{
                  padding: "11px 12px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  resize: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                onClick={() => setProblemOpen(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                បោះបង់
              </button>
              <button
                disabled={updating}
                onClick={handleReportProblem}
                style={{
                  flex: 1.2,
                  padding: "12px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  fontWeight: "800",
                  cursor: "pointer",
                  opacity: updating ? 0.7 : 1,
                }}
              >
                {updating ? "កំពុងរក្សាទុក..." : "បញ្ជាក់បញ្ហា"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
