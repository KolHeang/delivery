"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { isAuthenticated, getUser } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdArrowBack,
  MdCall,
  MdNearMe,
  MdDirections,
  MdLocationOn,
  MdStorefront,
  MdAttachMoney,
  MdScale,
  MdInventory2,
  MdChat,
  MdTimeline,
  MdInfo,
  MdChatBubbleOutline,
  MdAddAPhoto,
  MdClose,
  MdSend,
  MdAttachFile,
  MdCheckCircle,
  MdError,
  MdAssignmentReturn,
  MdCheck,
} from "react-icons/md";

export default function DriverTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id ? Number(params.id) : null;
  const { lang } = useLanguage();

  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<"detail" | "timeline" | "chat">("detail");

  // Screen 5: Confirm Delivery Modal State
  const [confirmDeliveryOpen, setConfirmDeliveryOpen] = useState(false);
  const [deliveryProofPhotos, setDeliveryProofPhotos] = useState<string[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<"cash" | "bank" | "already_paid">("cash");
  const [selectedBank, setSelectedBank] = useState<"aba" | "acleda" | "wing" | "bakong">("aba");
  const [deliveryNote, setDeliveryNote] = useState("");

  // Screen 6: Report Failed Delivery Modal State
  const [reportFailedOpen, setReportFailedOpen] = useState(false);
  const [failureReason, setFailureReason] = useState("Customer not at home");
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);
  const [failedNote, setFailedNote] = useState("");

  // Screen 7: Return Parcel Modal State
  const [returnParcelOpen, setReturnParcelOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("Customer rejected parcel");
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
  const [returnNote, setReturnNote] = useState("");

  // Screen 9: Chat State
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");

  const loadTaskDetail = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await api.get(`/mobile/driver/tasks/${taskId}`);
      if (res.data?.data) {
        setTask(res.data.data);
      } else if (res.data) {
        setTask(res.data);
      }
    } catch {
      setTask(null);
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

  // Status updates
  const handleUpdateStatus = async (newStatus: string, remark?: string, extra?: any) => {
    setUpdating(true);
    try {
      const payload: any = {
        status: newStatus,
        note: remark,
        ...extra,
      };
      if (newStatus === 'delivered') {
        payload.paymentStatus = 'paid';
        payload.paymentMethod = paymentStatus === 'bank' ? `bank_${selectedBank}` : paymentStatus;
      }
      await api.patch(`/mobile/driver/tasks/${taskId}/status`, payload);
      setTask((prev: any) => ({ ...prev, status: newStatus, ...(newStatus === 'delivered' ? { paymentStatus: 'paid' } : {}) }));
      setConfirmDeliveryOpen(false);
      setReportFailedOpen(false);
      setReturnParcelOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Status updated locally");
      setTask((prev: any) => ({ ...prev, status: newStatus, ...(newStatus === 'delivered' ? { paymentStatus: 'paid' } : {}) }));
      setConfirmDeliveryOpen(false);
      setReportFailedOpen(false);
      setReturnParcelOpen(false);
    } finally {
      setUpdating(false);
    }
  };


  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg = {
      id: messages.length + 1,
      sender: "driver",
      senderName: currentDriverName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, newMsg]);
    setChatInput("");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", backgroundColor: "#f8fafc" }}>
        <div style={{ width: "36px", height: "36px", border: "3px solid #bfdbfe", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  const user = getUser() as any;
  const currentDriverName = user?.name || user?.username || "Driver";

  const trackingCode = task?.trackingCode || task?.trackingNumber || task?.code || `#${taskId || ""}`;
  const storeName = task?.merchant?.name || task?.merchantName || (lang === "km" ? "ហាង" : "Store");
  const storePhone = task?.merchant?.phone || task?.merchantPhone || "-";
  const customerName = task?.receiverName || "N/A";
  const customerPhone = task?.receiverPhone || "N/A";
  const customerAddress = task?.receiverAddress || task?.address || "N/A";
  const cod = Number(task?.codAmount ?? task?.cod) || 0.0;
  const weight = task?.weight ? `${task.weight} kg` : "-";
  const items = task?.itemsDescription || task?.itemType || "-";
  const note = task?.note || "-";
  const isPending = task?.status !== "delivered" && task?.status !== "failed" && task?.status !== "returned";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Inter', 'Kantumruy Pro', sans-serif", paddingBottom: "80px" }}>

      {/* Screen 4 Top Header */}
      <div style={{
        backgroundColor: "#ffffff",
        padding: "16px 18px",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={() => router.push("/driver/tasks")}
            style={{ border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "#0f172a", padding: 0 }}
          >
            <MdArrowBack size={24} />
          </button>
          <span style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a" }}>
            #{trackingCode}
          </span>
        </div>

        {/* Status Chip */}
        <span style={{
          fontSize: "11.5px",
          fontWeight: "800",
          padding: "4px 12px",
          borderRadius: "20px",
          backgroundColor: task?.status === "delivered" ? "#dcfce7" : task?.status === "failed" ? "#fee2e2" : task?.status === "returned" ? "#f3e8ff" : "#fef3c7",
          color: task?.status === "delivered" ? "#15803d" : task?.status === "failed" ? "#dc2626" : task?.status === "returned" ? "#7c3aed" : "#b45309",
        }}>
          {task?.status === "delivered" ? "Delivered" : task?.status === "failed" ? "Failed" : task?.status === "returned" ? "Returned" : "Pending"}
        </span>
      </div>

      {/* 3 Segmented Tabs: Detail, Timeline, Chat */}
      <div style={{ display: "flex", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "0 16px" }}>
        {[
          { key: "detail", label: "Detail" },
          { key: "timeline", label: "Timeline" },
          { key: "chat", label: "Chat" },
        ].map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              style={{
                flex: 1,
                padding: "12px 0",
                fontSize: "13.5px",
                fontWeight: isActive ? "800" : "600",
                color: isActive ? "#2563eb" : "#64748b",
                border: "none",
                background: "none",
                borderBottom: isActive ? "2.5px solid #2563eb" : "2.5px solid transparent",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DETAIL (Screen 4) */}
      {activeTab === "detail" && (
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Store Card Header */}
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            padding: "14px 16px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", backgroundColor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                <MdInventory2 size={24} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>{storeName}</span>
            </div>
            <span style={{ fontSize: "11px", fontWeight: "800", padding: "4px 10px", borderRadius: "12px", backgroundColor: "#dbeafe", color: "#1d4ed8" }}>
              Delivery
            </span>
          </div>

          {/* Customer Information Card */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", padding: "16px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <h3 style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a", margin: "0 0 12px 0" }}>
              Customer Information
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", fontWeight: "700", color: "#0f172a" }}>
                <span style={{ color: "#2563eb" }}>👤</span> {customerName}
              </div>

              {/* Phone with Call & Chat Buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", fontWeight: "700", color: "#334155" }}>
                  <span style={{ color: "#2563eb" }}>📞</span> {customerPhone}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <a
                    href={`tel:${customerPhone}`}
                    style={{ width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", textDecoration: "none" }}
                  >
                    <MdCall size={18} />
                  </a>
                  <a
                    href={`https://t.me/+855${customerPhone.replace(/^0/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", textDecoration: "none" }}
                  >
                    <MdNearMe size={18} />
                  </a>
                </div>
              </div>

              {/* Address with View in Maps */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "12.5px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>
                <span style={{ color: "#ef4444", marginTop: "1px" }}>📍</span>
                <span>{customerAddress}</span>
              </div>

              {/* View in Maps Button */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customerAddress)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: "6px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  alignSelf: "flex-end",
                }}
              >
                <MdDirections size={16} /> View in Maps
              </a>
            </div>
          </div>

          {/* Merchant Information Card */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", padding: "16px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Merchant Information</div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>🏪 {storeName}</div>
            </div>
            <a
              href={`tel:${task?.merchant?.phone || "023555678"}`}
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "700", color: "#2563eb", textDecoration: "none" }}
            >
              <MdCall size={16} /> {task?.merchant?.phone || "023 555 678"}
            </a>
          </div>

          {/* Parcel Information Card */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", padding: "16px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <h3 style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a", margin: "0 0 12px 0" }}>
              Parcel Information
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: "600" }}>COD Amount</span>
                <span style={{ fontWeight: "900", color: "#2563eb", fontSize: "15px" }}>${Number(cod).toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: "600" }}>Weight</span>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>{weight}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: "600" }}>Items</span>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>{items}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: "600" }}>Note</span>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>{note}</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons (Screen 4) */}
          {isPending && (
            <div style={{
              position: "fixed",
              bottom: "64px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: "430px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              padding: "12px 16px",
              display: "flex",
              gap: "12px",
              zIndex: 40,
            }}>
              <button
                type="button"
                onClick={() => setReportFailedOpen(true)}
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: "14px",
                  border: "1.5px solid #ef4444",
                  backgroundColor: "#ffffff",
                  color: "#ef4444",
                  fontSize: "13.5px",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Report Problem
              </button>

              <button
                type="button"
                onClick={() => setConfirmDeliveryOpen(true)}
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: "14px",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "13.5px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                }}
              >
                Complete Delivery
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TIMELINE */}
      {activeTab === "timeline" && (
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { title: "Parcel Created", time: task?.createdAt ? new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-", desc: "Merchant prepared package", done: true },
            { title: "Driver Assigned", time: task?.assignedAt ? new Date(task.assignedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-", desc: `Assigned to ${task?.driver?.nameKh || task?.driver?.name || currentDriverName}`, done: true },
            { title: "In Transit", time: task?.pickedUpAt ? new Date(task.pickedUpAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-", desc: "Package out for delivery", done: task?.status === "in-transit" || task?.status === "delivered" },
            { title: "Delivered", time: task?.deliveredAt ? new Date(task.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-", desc: "Delivered to customer successfully", done: task?.status === "delivered" },
          ].map((step, idx) => (
            <div key={idx} style={{ display: "flex", gap: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: step.done ? "#2563eb" : "#e2e8f0", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800" }}>
                  {step.done ? "✓" : idx + 1}
                </div>
                {idx < 3 && <div style={{ width: "2px", height: "36px", backgroundColor: step.done ? "#2563eb" : "#e2e8f0", margin: "4px 0" }} />}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>{step.title}</div>
                <div style={{ fontSize: "11.5px", color: "#64748b" }}>{step.desc} {step.time !== "-" ? `• ${step.time}` : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: CHAT (Screen 9) */}
      {activeTab === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "65vh" }}>
          {/* Chat Messages */}
          <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto" }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <MdChatBubbleOutline size={32} color="#cbd5e1" />
                <div style={{ fontSize: "13px", fontWeight: "600" }}>{lang === "km" ? "មិនទាន់មានសារនៅឡើយទេ" : "No messages yet"}</div>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender === "driver";
                return (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "75%",
                      borderRadius: "18px",
                      padding: "10px 14px",
                      backgroundColor: isMe ? "#2563eb" : "#ffffff",
                      color: isMe ? "#ffffff" : "#0f172a",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                      border: isMe ? "none" : "1px solid #e2e8f0",
                      borderBottomRightRadius: isMe ? "4px" : "18px",
                      borderBottomLeftRadius: isMe ? "18px" : "4px",
                    }}>
                      {m.photo && (
                        <img src={m.photo} alt="Attachment" style={{ width: "100%", borderRadius: "12px", marginBottom: "6px", objectFit: "cover", maxHeight: "160px" }} />
                      )}
                      <div style={{ fontSize: "13px", fontWeight: "500", lineHeight: 1.4 }}>{m.text}</div>
                    </div>
                    <span style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px", padding: "0 4px" }}>{m.time}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input Bar */}
          <div style={{
            position: "fixed",
            bottom: "64px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "430px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 40,
          }}>
            <button type="button" style={{ border: "none", background: "none", color: "#64748b", cursor: "pointer", display: "flex" }}>
              <MdAttachFile size={22} />
            </button>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message..."
              style={{ flex: 1, padding: "10px 14px", borderRadius: "20px", border: "1.5px solid #e2e8f0", outline: "none", fontSize: "13px" }}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#ffffff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <MdSend size={18} />
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 5: CONFIRM DELIVERY MODAL */}
      {confirmDeliveryOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#ffffff", borderTopLeftRadius: "28px", borderTopRightRadius: "28px", width: "100%", maxWidth: "430px", maxHeight: "90vh", overflowY: "auto", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "900", color: "#0f172a", margin: 0 }}>Confirm Delivery</h3>
              <button onClick={() => setConfirmDeliveryOpen(false)} style={{ border: "none", background: "none", cursor: "pointer" }}><MdClose size={22} color="#64748b" /></button>
            </div>

            {/* Delivery Proof (Required) */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a", display: "block", marginBottom: "8px" }}>
                Delivery Proof (Required)
              </label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {deliveryProofPhotos.map((p, i) => (
                  <img key={i} src={p} alt="Proof" style={{ width: "70px", height: "70px", borderRadius: "12px", objectFit: "cover", border: "1px solid #e2e8f0" }} />
                ))}
                <button
                  type="button"
                  onClick={() => alert("Open camera or upload photo")}
                  style={{ width: "70px", height: "70px", borderRadius: "12px", border: "2px dashed #93c5fd", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", fontSize: "10px", fontWeight: "700" }}
                >
                  <MdAddAPhoto size={20} />
                  Add Photo
                </button>
              </div>
            </div>


            {/* Payment Status (Radio Selection) */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a", display: "block", marginBottom: "8px" }}>
                Payment Status
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Cash */}
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: paymentStatus === "cash" ? "1.5px solid #16a34a" : "1.5px solid #e2e8f0",
                  backgroundColor: paymentStatus === "cash" ? "#f0fdf4" : "#ffffff",
                  cursor: "pointer",
                }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                    💵 Cash Collected
                  </span>
                  <input type="radio" name="paymentStatus" checked={paymentStatus === "cash"} onChange={() => setPaymentStatus("cash")} style={{ accentColor: "#16a34a" }} />
                </label>

                {/* Bank Payment Container */}
                <div style={{
                  borderRadius: "12px",
                  border: paymentStatus === "bank" ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0",
                  backgroundColor: paymentStatus === "bank" ? "#f0f7ff" : "#ffffff",
                  overflow: "hidden",
                  transition: "all 0.15s ease",
                }}>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    cursor: "pointer",
                  }}>
                    <div>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                        🏦 Bank Payment
                      </span>
                      {paymentStatus === "bank" && (
                        <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700", marginLeft: "28px" }}>
                          ({selectedBank === "aba" ? "ABA Bank" : selectedBank === "acleda" ? "ACLEDA Bank" : selectedBank === "wing" ? "Wing Bank" : "Bakong / KHQR"})
                        </span>
                      )}
                    </div>
                    <input type="radio" name="paymentStatus" checked={paymentStatus === "bank"} onChange={() => setPaymentStatus("bank")} style={{ accentColor: "#2563eb" }} />
                  </label>

                  {/* Sub Bank Selection Grid */}
                  {paymentStatus === "bank" && (
                    <div style={{
                      padding: "0 12px 12px",
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "8px",
                      borderTop: "1px solid #dbeafe",
                      paddingTop: "10px",
                      maxHeight: "220px",
                      overflowY: "auto",
                    }}>
                      {[
                        { id: "aba", name: "ABA Bank", sub: "ABA PAY / KHQR", color: "#005477", badgeBg: "#005477" },
                        { id: "acleda", name: "ACLEDA Bank", sub: "Unity / KHQR", color: "#183c7d", badgeBg: "#183c7d" },
                        { id: "wing", name: "Wing Bank", sub: "Wing KHQR", color: "#0f9d58", badgeBg: "#0f9d58" },
                        { id: "bakong", name: "Bakong / KHQR", sub: "National KHQR", color: "#d32f2f", badgeBg: "#d32f2f" },
                        { id: "canadia", name: "Canadia Bank", sub: "Canadia KHQR", color: "#cc1f2e", badgeBg: "#cc1f2e" },
                        { id: "prince", name: "Prince Bank", sub: "Prince PAY", color: "#d39e00", badgeBg: "#d39e00" },
                        { id: "chipmong", name: "Chip Mong Bank", sub: "CMB KHQR", color: "#0284c7", badgeBg: "#0284c7" },
                        { id: "sathapana", name: "Sathapana Bank", sub: "SPN Mobile", color: "#0369a1", badgeBg: "#0369a1" },
                        { id: "truemoney", name: "TrueMoney", sub: "TrueMoney", color: "#ea580c", badgeBg: "#ea580c" },
                        { id: "jtrust", name: "J Trust Royal", sub: "J Trust KHQR", color: "#1e3a8a", badgeBg: "#1e3a8a" },
                        { id: "other", name: "Other Bank / KHQR", sub: "Any KHQR", color: "#475569", badgeBg: "#475569" },
                      ].map((b) => {
                        const isSel = selectedBank === b.id;
                        return (
                          <div
                            key={b.id}
                            onClick={() => setSelectedBank(b.id as any)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "10px",
                              backgroundColor: isSel ? "#ffffff" : "#f8fafc",
                              border: isSel ? `2px solid ${b.color}` : "1.5px solid #e2e8f0",
                              boxShadow: isSel ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "9px", fontWeight: "800", padding: "1px 5px", borderRadius: "4px", backgroundColor: b.badgeBg, color: "#ffffff" }}>
                                {b.id.toUpperCase()}
                              </span>
                              <div style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                border: isSel ? `3.5px solid ${b.color}` : "1.5px solid #cbd5e1",
                                backgroundColor: isSel ? "#ffffff" : "transparent",
                              }} />
                            </div>
                            <div style={{ fontSize: "11px", fontWeight: "800", color: "#0f172a", marginTop: "3px" }}>
                              {b.name}
                            </div>
                            <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "500" }}>
                              {b.sub}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Already Paid */}
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: paymentStatus === "already_paid" ? "1.5px solid #9333ea" : "1.5px solid #e2e8f0",
                  backgroundColor: paymentStatus === "already_paid" ? "#faf5ff" : "#ffffff",
                  cursor: "pointer",
                }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                    🟣 Already Paid to Shop
                  </span>
                  <input type="radio" name="paymentStatus" checked={paymentStatus === "already_paid"} onChange={() => setPaymentStatus("already_paid")} style={{ accentColor: "#9333ea" }} />
                </label>
              </div>
            </div>

            {/* Note (Optional) */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a", display: "block", marginBottom: "6px" }}>Note (Optional)</label>
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="Add note..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "13px", outline: "none" }}
              />
            </div>

            {/* Confirm Delivery Submit Button */}
            <button
              type="button"
              disabled={updating}
              onClick={() => {
                const bankLabel = selectedBank === "aba" ? "ABA Bank" : selectedBank === "acleda" ? "ACLEDA Bank" : selectedBank === "wing" ? "Wing Bank" : "Bakong/KHQR";
                const payPrefix = paymentStatus === "bank" ? `[Bank: ${bankLabel}]` : paymentStatus === "cash" ? "[Cash]" : "[Already Paid]";
                handleUpdateStatus("delivered", deliveryNote ? `${payPrefix} ${deliveryNote}` : payPrefix);
              }}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "none", backgroundColor: "#2563eb", color: "#ffffff", fontSize: "14.5px", fontWeight: "800", cursor: "pointer", boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)" }}
            >
              {updating ? "Saving..." : "Confirm Delivery"}
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 6: REPORT FAILED DELIVERY MODAL */}
      {reportFailedOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#ffffff", borderTopLeftRadius: "28px", borderTopRightRadius: "28px", width: "100%", maxWidth: "430px", maxHeight: "90vh", overflowY: "auto", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "900", color: "#0f172a", margin: 0 }}>Report Failed Delivery</h3>
              <button onClick={() => setReportFailedOpen(false)} style={{ border: "none", background: "none", cursor: "pointer" }}><MdClose size={22} color="#64748b" /></button>
            </div>

            {/* Select Failure Reason */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a", display: "block", marginBottom: "8px" }}>
                Select Failure Reason
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  "Customer not at home",
                  "Wrong address",
                  "Customer refused",
                  "Phone unreachable",
                  "Item damaged / broken",
                  "Customer requested to reschedule",
                  "Other",
                ].map((reason) => (
                  <label key={reason} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "10px", border: failureReason === reason ? "1.5px solid #ef4444" : "1px solid #e2e8f0", backgroundColor: failureReason === reason ? "#fef2f2" : "#ffffff", cursor: "pointer" }}>
                    <input type="radio" name="failureReason" checked={failureReason === reason} onChange={() => setFailureReason(reason)} style={{ accentColor: "#ef4444" }} />
                    <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#0f172a" }}>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Add Photo (Optional) */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a", display: "block", marginBottom: "8px" }}>Add Photo (Optional)</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {failedPhotos.map((p, i) => (
                  <img key={i} src={p} alt="Proof" style={{ width: "64px", height: "64px", borderRadius: "12px", objectFit: "cover", border: "1px solid #e2e8f0" }} />
                ))}
                <button
                  type="button"
                  onClick={() => alert("Upload proof")}
                  style={{ width: "64px", height: "64px", borderRadius: "12px", border: "2px dashed #fca5a5", backgroundColor: "#fef2f2", color: "#ef4444", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", cursor: "pointer", fontSize: "10px", fontWeight: "700" }}
                >
                  <MdAddAPhoto size={18} />
                  Add Photo
                </button>
              </div>
            </div>

            {/* Note (Optional) with character count */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a" }}>Note (Optional)</label>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>{failedNote.length}/200</span>
              </div>
              <textarea
                rows={3}
                maxLength={200}
                value={failedNote}
                onChange={(e) => setFailedNote(e.target.value)}
                placeholder="Add more details..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "13px", outline: "none", fontFamily: "inherit" }}
              />
            </div>

            {/* Submit Failed Button */}
            <button
              type="button"
              disabled={updating}
              onClick={() => handleUpdateStatus("failed", `${failureReason}: ${failedNote}`)}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "none", backgroundColor: "#ef4444", color: "#ffffff", fontSize: "14.5px", fontWeight: "800", cursor: "pointer", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)" }}
            >
              {updating ? "Saving..." : "Submit Failed"}
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 7: RETURN PARCEL MODAL */}
      {returnParcelOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#ffffff", borderTopLeftRadius: "28px", borderTopRightRadius: "28px", width: "100%", maxWidth: "430px", maxHeight: "90vh", overflowY: "auto", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "900", color: "#0f172a", margin: 0 }}>Return Parcel</h3>
              <button onClick={() => setReturnParcelOpen(false)} style={{ border: "none", background: "none", cursor: "pointer" }}><MdClose size={22} color="#64748b" /></button>
            </div>

            {/* Merchant Information */}
            <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "14px", marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Merchant Information</div>
              <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>🏪 {storeName}</div>
              <div style={{ fontSize: "12px", color: "#475569" }}>📞 {task?.merchant?.phone || "023 555 678"}</div>
            </div>

            {/* Return Reason Dropdown */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a", display: "block", marginBottom: "6px" }}>Return Reason</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "13px", fontWeight: "600", outline: "none" }}
              >
                <option value="Customer rejected parcel">Customer rejected parcel</option>
                <option value="Wrong item sent">Wrong item sent</option>
                <option value="Damaged during transit">Damaged during transit</option>
                <option value="Unreachable after multiple attempts">Unreachable after multiple attempts</option>
              </select>
            </div>

            {/* Add Photo (Required) */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a", display: "block", marginBottom: "8px" }}>Add Photo (Required)</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {returnPhotos.map((p, i) => (
                  <img key={i} src={p} alt="Proof" style={{ width: "64px", height: "64px", borderRadius: "12px", objectFit: "cover", border: "1px solid #e2e8f0" }} />
                ))}
                <button
                  type="button"
                  style={{ width: "64px", height: "64px", borderRadius: "12px", border: "2px dashed #c084fc", backgroundColor: "#faf5ff", color: "#7c3aed", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", cursor: "pointer", fontSize: "10px", fontWeight: "700" }}
                >
                  <MdAddAPhoto size={18} />
                  Add Photo
                </button>
              </div>
            </div>

            {/* Note */}
            <div style={{ marginBottom: "18px" }}>
              <textarea
                rows={3}
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                placeholder="Add more details..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "13px", outline: "none", fontFamily: "inherit" }}
              />
            </div>

            {/* Confirm Return Submit Button */}
            <button
              type="button"
              disabled={updating}
              onClick={() => handleUpdateStatus("returned", `${returnReason}: ${returnNote}`)}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "none", backgroundColor: "#7c3aed", color: "#ffffff", fontSize: "14.5px", fontWeight: "800", cursor: "pointer", boxShadow: "0 4px 14px rgba(124, 58, 237, 0.35)" }}
            >
              {updating ? "Saving..." : "Confirm Return"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
