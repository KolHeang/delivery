"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
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
  const [deliveryProofPhotos, setDeliveryProofPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&auto=format&fit=crop&q=60",
  ]);
  const [paymentStatus, setPaymentStatus] = useState<"cash" | "bank" | "already_paid">("cash");
  const [deliveryNote, setDeliveryNote] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Screen 6: Report Failed Delivery Modal State
  const [reportFailedOpen, setReportFailedOpen] = useState(false);
  const [failureReason, setFailureReason] = useState("Customer not at home");
  const [failedPhotos, setFailedPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&auto=format&fit=crop&q=60",
  ]);
  const [failedNote, setFailedNote] = useState("");

  // Screen 7: Return Parcel Modal State
  const [returnParcelOpen, setReturnParcelOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("Customer rejected parcel");
  const [returnPhotos, setReturnPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&auto=format&fit=crop&q=60",
  ]);
  const [returnNote, setReturnNote] = useState("");

  // Screen 9: Chat State
  const [messages, setMessages] = useState<any[]>([
    { id: 1, sender: "store", senderName: "Sokha Store", text: "Hello, please call customer before delivery.", time: "09:12 AM" },
    { id: 2, sender: "driver", senderName: "Sophal Rider", text: "Ok, I'm on the way.", time: "09:15 AM" },
    { id: 3, sender: "driver", senderName: "Sophal Rider", text: "Arrived at customer location.", photo: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&auto=format&fit=crop&q=60", time: "10:20 AM" },
  ]);
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
      // Fallback sample parcel matching Screen 4
      setTask({
        id: taskId,
        trackingCode: "EX00123456",
        status: "pending",
        merchant: { name: "Sokha Store", phone: "023 555 678", address: "Phnom Penh, Chamkarmon" },
        receiverName: "Chan Sodany",
        receiverPhone: "012 345 678",
        receiverAddress: "#123, St. 278, Boeung Keng Kang, Phnom Penh",
        codAmount: 20.0,
        weight: "1.2 kg",
        itemsDescription: "Clothes (3 packages)",
        note: "Handle with care",
      });
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
  const handleUpdateStatus = async (newStatus: string, remark?: string) => {
    setUpdating(true);
    try {
      await api.patch(`/mobile/driver/tasks/${taskId}/status`, {
        status: newStatus,
        note: remark,
      });
      setTask((prev: any) => ({ ...prev, status: newStatus }));
      setConfirmDeliveryOpen(false);
      setReportFailedOpen(false);
      setReturnParcelOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Status updated locally");
      setTask((prev: any) => ({ ...prev, status: newStatus }));
      setConfirmDeliveryOpen(false);
      setReportFailedOpen(false);
      setReturnParcelOpen(false);
    } finally {
      setUpdating(false);
    }
  };

  // Canvas Drawing for Signature Pad
  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg = {
      id: messages.length + 1,
      sender: "driver",
      senderName: "Sophal Rider",
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

  const trackingCode = task?.trackingCode || task?.trackingNumber || task?.code || "EX00123456";
  const storeName = task?.merchant?.name || task?.merchantName || "Sokha Store";
  const customerName = task?.receiverName || "Chan Sodany";
  const customerPhone = task?.receiverPhone || "012 345 678";
  const customerAddress = task?.receiverAddress || "#123, St. 278, Boeung Keng Kang, Phnom Penh";
  const cod = task?.codAmount ?? task?.cod ?? 20.0;
  const weight = task?.weight ? `${task.weight} kg` : "1.2 kg";
  const items = task?.itemsDescription || "Clothes (3 packages)";
  const note = task?.note || "Handle with care";
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
            { title: "Parcel Created", time: "08:30 AM", desc: "Merchant prepared package", done: true },
            { title: "Driver Assigned", time: "09:00 AM", desc: "Assigned to Sophal Rider", done: true },
            { title: "In Transit", time: "09:30 AM", desc: "Package out for delivery", done: task?.status === "in-transit" || task?.status === "delivered" },
            { title: "Delivered", time: "10:30 AM", desc: "Delivered to customer successfully", done: task?.status === "delivered" },
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
                <div style={{ fontSize: "11.5px", color: "#64748b" }}>{step.desc} • {step.time}</div>
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
            {messages.map((m) => {
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
            })}
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

            {/* Customer Signature (Optional) */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a" }}>Customer Signature (Optional)</label>
                <button type="button" onClick={clearSignature} style={{ border: "none", background: "none", color: "#2563eb", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>Clear</button>
              </div>
              <div style={{ border: "1.5px solid #cbd5e1", borderRadius: "14px", backgroundColor: "#f8fafc", overflow: "hidden" }}>
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={110}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ width: "100%", height: "110px", display: "block", cursor: "crosshair" }}
                />
              </div>
            </div>

            {/* Payment Status (Radio Selection) */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a", display: "block", marginBottom: "8px" }}>
                Payment Status
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { key: "cash", label: "Cash Collected", icon: "💵" },
                  { key: "bank", label: "Bank Payment", icon: "🏦" },
                  { key: "already_paid", label: "Already Paid to Shop", icon: "🟣" },
                ].map((opt) => (
                  <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "12px", border: paymentStatus === opt.key ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0", backgroundColor: paymentStatus === opt.key ? "#eff6ff" : "#ffffff", cursor: "pointer" }}>
                    <input type="radio" name="paymentStatus" checked={paymentStatus === opt.key} onChange={() => setPaymentStatus(opt.key as any)} style={{ accentColor: "#2563eb" }} />
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{opt.icon} {opt.label}</span>
                  </label>
                ))}
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
              onClick={() => handleUpdateStatus("delivered", deliveryNote)}
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
