"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import DriverHeader from "@/components/driver/DriverHeader";
import {
  MdSchedule,
  MdChatBubble,
  MdPerson,
  MdChevronRight,
  MdClose,
  MdCall,
  MdDirections,
  MdCheckCircle,
  MdError,
  MdLocalShipping,
  MdRefresh,
  MdLocationOn,
} from "react-icons/md";

export default function DriverTasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "waiting" | "in-transit" | "delivered" | "failed" | "returned"
  >("all");

  // Problem Dialog state
  const [problemDialogOpen, setProblemDialogOpen] = useState(false);
  const [problemRemark, setProblemRemark] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadTasks = async () => {
    try {
      const [taskRes, profRes] = await Promise.all([
        api.get("/mobile/driver/tasks").catch(() => ({ data: { data: [] } })),
        api.get("/mobile/driver/profile").catch(() => null),
      ]);
      const list = Array.isArray(taskRes.data)
        ? taskRes.data
        : taskRes.data?.results || taskRes.data?.data || [];
      setTasks(list);
      if (profRes?.data) {
        setDriver(profRes.data);
      }
    } catch (err) {
      console.error("Failed to load driver tasks", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    setDriver(currentUser);
    loadTasks();
  }, [router]);

    if (searchParams.get('scan') === 'true') {
      setShowScannerModal(true);
    }

    loadTasksAndCounts(activeTab, searchQuery);
  }, [router, activeTab]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    loadTasksAndCounts(activeTab, val);
  };

  const handleTabChange = (tab: 'all' | 'pending' | 'delivered' | 'failed' | 'returned') => {
    setActiveTab(tab);
    setLoading(true);
    loadTasksAndCounts(tab, searchQuery);
  };

  const handleUpdateStatus = async (taskId: number, newStatus: string, note = '') => {
    setActionLoading(true);
    try {
      await api.patch(`/mobile/driver/tasks/${taskId}/status`, {
        status: newStatus,
        note,
      });
      await loadTasks();
      setSelectedTask(null);
      setProblemDialogOpen(false);
      setProblemRemark("");
    } catch (err: any) {
      console.error("Failed to update status", err);
      alert(err.response?.data?.message || "Failed to update task status");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter items according to statusFilter
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "waiting")
      return t.status === "assigned" || t.status === "pending" || t.status === "in-warehouse";
    if (statusFilter === "in-transit") return t.status === "in-transit" || t.status === "picked-up";
    if (statusFilter === "delivered") return t.status === "delivered";
    if (statusFilter === "failed") return t.status === "failed";
    if (statusFilter === "returned") return t.status === "returned";
    return true;
  });

  // Sample tasks fallback if empty to let user inspect UI immediately
  const displayTasks =
    filteredTasks.length > 0
      ? filteredTasks
      : tasks.length === 0 && !loading
        ? [
            {
              id: 101,
              trackingCode: "ONE251109200419",
              status: "assigned",
              receiverPhone: "092652067",
              receiverName: "សង្ឃឹមស្រស់",
              receiverAddress: "បុរីប៉េងហួតបឹងស្នោ ផ្លូវប៉ូឡារីស",
              cod: 13.0,
              deliveryFee: 1.25,
              isCodSettled: false,
              feePayer: "sender",
            },
            {
              id: 102,
              trackingCode: "ONE251109795203",
              status: "assigned",
              receiverPhone: "0967551182",
              receiverName: "ខូកគោត",
              receiverAddress: "សង្កាត់និរោធ ខណ្ឌច្បារអំពៅ",
              cod: 16.0,
              deliveryFee: 1.25,
              isCodSettled: false,
              feePayer: "sender",
            },
            {
              id: 103,
              trackingCode: "ONE251109415097",
              status: "assigned",
              receiverPhone: "0963982517",
              receiverName: "ក្រសួងការពារជាតិ",
              receiverAddress: "វិមានមិត្តភាព កម្ពុជា-វៀតណាម",
              cod: 15.0,
              deliveryFee: 1.25,
              isCodSettled: false,
              feePayer: "sender",
            },
            {
              id: 104,
              trackingCode: "ONE251109881484",
              status: "assigned",
              receiverPhone: "0967504872",
              receiverName: "កំបូល",
              receiverAddress: "ផ្លូវជាតិលេខ ៤ កំបូល",
              cod: 15.0,
              deliveryFee: 1.25,
              isCodSettled: false,
              feePayer: "sender",
            },
          ]
        : [];

  const displayName = driver?.name || driver?.username || "mon e";
  const branchName = driver?.branch?.name || driver?.branchName || "ប៉េងហួតបឹងស្នោ";
  const phoneOrId = driver?.phone || driver?.idCard || "099865327";

  const countAll = tasks.length;
  const countWaiting = tasks.filter(
    (t) => t.status === "assigned" || t.status === "pending" || t.status === "in-warehouse",
  ).length;
  const countInTransit = tasks.filter(
    (t) => t.status === "in-transit" || t.status === "picked-up",
  ).length;
  const countDelivered = tasks.filter((t) => t.status === "delivered").length;
  const countFailed = tasks.filter((t) => t.status === "failed").length;
  const countReturned = tasks.filter((t) => t.status === "returned").length;

  const filterTabs = [
    { key: "all", label: "ទាំងអស់", count: countAll },
    { key: "waiting", label: "រង់ចាំ", count: countWaiting },
    { key: "in-transit", label: "កំពុងដឹក", count: countInTransit },
    { key: "delivered", label: "បានដល់", count: countDelivered },
    { key: "failed", label: "មានបញ្ហា", count: countFailed },
    { key: "returned", label: "ត្រឡប់", count: countReturned },
  ];

  const getStatusBadge = (st: string) => {
    if (st === "delivered") {
      return {
        bg: "#16a34a",
        icon: <MdCheckCircle size={22} color="#ffffff" />,
        textColor: "#16a34a",
        label: "បានដល់អតិថិជន",
      };
    }
    if (st === "in-transit" || st === "picked-up") {
      return {
        bg: "#2563eb",
        icon: <MdLocalShipping size={22} color="#ffffff" />,
        textColor: "#2563eb",
        label: "កំពុងដឹកជញ្ជូន",
      };
    }
    if (st === "failed") {
      return {
        bg: "#ef4444",
        icon: <MdError size={22} color="#ffffff" />,
        textColor: "#ef4444",
        label: "មានបញ្ហា",
      };
    }
    if (st === "returned") {
      return {
        bg: "#b91c1c",
        icon: <MdError size={22} color="#ffffff" />,
        textColor: "#b91c1c",
        label: "បានត្រឡប់",
      };
    }
    return {
      bg: "#f97316",
      icon: <MdSchedule size={22} color="#ffffff" />,
      textColor: "#ea580c",
      label: "កំពុងរង់ចាំអ្នកដឹក",
    };
  };

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
      {/* 1. Header matching Screenshot 2 */}
      <DriverHeader driverName={displayName} branchName={branchName} phoneOrCode={phoneOrId} />

      {/* 2. Filter Tabs (Horizontal scrollable pills matching Screenshot 2) */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflowX: "auto",
          scrollbarWidth: "none",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        {filterTabs.map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              style={{
                flexShrink: 0,
                padding: "7px 14px",
                borderRadius: "20px",
                border: "none",
                backgroundColor: isActive ? "#581c87" : "#f3e8ff",
                color: isActive ? "#ffffff" : "#581c87",
                fontSize: "13px",
                fontWeight: isActive ? "800" : "600",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.15s ease",
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "rgba(88,28,135,0.12)",
                  color: isActive ? "#ffffff" : "#581c87",
                  fontWeight: "800",
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Parcel List Area */}
      <div
        style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 0",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                border: "3.5px solid rgba(88, 28, 135, 0.15)",
                borderTopColor: "#581c87",
                borderRadius: "50%",
                animation: "taskSpin 0.8s linear infinite",
                marginBottom: "12px",
              }}
            />
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "700" }}>
              កំពុងផ្ទុកកញ្ចប់អីវ៉ាន់...
            </span>
            <style
              dangerouslySetInnerHTML={{
                __html: `@keyframes taskSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`,
              }}
            />
          </div>
        ) : displayTasks.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "36px 20px",
              textAlign: "center",
              border: "1px solid #f1f5f9",
              color: "#64748b",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <MdSchedule size={42} color="#cbd5e1" />
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>
              មិនមានកញ្ចប់អីវ៉ាន់ទេ
            </span>
            <button
              onClick={() => {
                setRefreshing(true);
                loadTasks();
              }}
              style={{
                marginTop: "6px",
                padding: "8px 16px",
                borderRadius: "12px",
                backgroundColor: "#581c87",
                color: "#ffffff",
                border: "none",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <MdRefresh size={16} /> ពិនិត្យឡើងវិញ
            </button>
          </div>
        ) : (
          displayTasks.map((task: any) => {
            const badge = getStatusBadge(task.status);
            const codVal = Number(task.cod || task.codAmount || task.price || 13.0).toFixed(2);
            const feeVal = Number(task.deliveryFee || 1.25).toFixed(2);
            const receiverPhone = task.receiverPhone || "092652067";
            const rawName = task.receiverName?.trim();
            const hasValidName =
              rawName &&
              rawName !== "-" &&
              rawName !== "—" &&
              rawName !== "null" &&
              rawName !== "undefined";
            const receiverDisplay = hasValidName ? `${receiverPhone} (${rawName})` : receiverPhone;

            return (
              <div
                key={task.id}
                onClick={() => router.push(`/driver/tasks/${task.id}`)}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  border: "1px solid #e8edf5",
                  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {/* Top Row: Status badge + Code & Status + Chat Action Button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {/* Status round badge matching real status */}
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        backgroundColor: badge.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        flexShrink: 0,
                      }}
                    >
                      {badge.icon}
                    </div>

                    {/* Tracking Code and Status text */}
                    <div
                      onClick={() => router.push(`/driver/tasks/${task.id}`)}
                      style={{ display: "flex", flexDirection: "column", cursor: "pointer" }}
                    >
                      <span
                        style={{
                          fontSize: "15.5px",
                          fontWeight: "800",
                          color: "#0f172a",
                          letterSpacing: "0.2px",
                        }}
                      >
                        {task.trackingCode || `ONE${task.id}`}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          color: badge.textColor,
                          marginTop: "2px",
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle Row: Customer Info + "មើលលម្អិត >" Link */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "13px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#334155",
                      }}
                    >
                      <MdPerson size={17} color="#94a3b8" />
                      <span style={{ fontWeight: "800" }}>{receiverDisplay}</span>
                    </div>

                    <button
                      onClick={() => router.push(`/driver/tasks/${task.id}`)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#581c87",
                        fontSize: "12.5px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        padding: 0,
                      }}
                    >
                      <span>មើលលម្អិត</span>
                      <MdChevronRight size={17} />
                    </button>
                  </div>

                  {/* Receiver Address preview */}
                  {task.receiverAddress && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#64748b",
                        fontSize: "12px",
                        paddingLeft: "2px",
                      }}
                    >
                      <MdLocationOn size={14} color="#f97316" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {task.receiverAddress} {task.zone?.name ? `(${task.zone.name})` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: "1px", backgroundColor: "#e2e8f0", margin: "2px 0" }} />

                {/* Bottom Row: Item Price & Delivery Fee */}
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  {/* Left: តម្លៃអីវ៉ាន់ */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600" }}>
                      តម្លៃអីវ៉ាន់
                    </span>
                    <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a" }}>
                      ${codVal} {task.isCodSettled ? "(បានទូទាត់)" : "(មិនទាន់ទូទាត់)"}
                    </span>
                  </div>

                  {/* Right: ថ្លៃដឹកជញ្ជូន */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      alignItems: "flex-end",
                    }}
                  >
                    <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600" }}>
                      ថ្លៃដឹកជញ្ជូន
                    </span>
                    <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a" }}>
                      ${feeVal} (អ្នកផ្ញើ)
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Task Details Bottom Sheet / Modal ── */}
      {selectedTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(3px)",
            zIndex: 150,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              backgroundColor: "#ffffff",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
              padding: "20px",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
              maxHeight: "85vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                  {selectedTask.trackingCode || `ONE${selectedTask.id}`}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                  ព័ត៌មានលម្អិតកញ្ចប់អីវ៉ាន់
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
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

            {/* Content info */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "16px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
              }}
            >
              <div>
                <strong>អ្នកទទួល:</strong> {selectedTask.receiverName || "សង្ឃឹមស្រស់"}
              </div>
              <div>
                <strong>លេខទូរស័ព្ទ:</strong> {selectedTask.receiverPhone || "092652067"}
              </div>
              <div>
                <strong>អាសយដ្ឋាន:</strong>{" "}
                {selectedTask.receiverAddress || "បុរីប៉េងហួតបឹងស្នោ ផ្លូវប៉ូឡារីស"}
              </div>
              <div>
                <strong>តម្លៃទំនិញ (COD):</strong> ${Number(selectedTask.cod || 13).toFixed(2)}
              </div>
              <div>
                <strong>ថ្លៃសេវាដឹក:</strong> ${Number(selectedTask.deliveryFee || 1.25).toFixed(2)}
              </div>
              <div>
                <strong>ស្ថានភាពបច្ចុប្បន្ន:</strong> {getStatusBadge(selectedTask.status).label}
              </div>
            </div>

            {/* Quick Action Buttons: Call & Maps */}
            <div style={{ display: "flex", gap: "10px" }}>
              <a
                href={`tel:${selectedTask.receiverPhone || "092652067"}`}
                style={{
                  flex: 1,
                  backgroundColor: "#ecfdf5",
                  color: "#059669",
                  border: "1px solid #a7f3d0",
                  padding: "12px",
                  borderRadius: "12px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontWeight: "700",
                  fontSize: "13px",
                }}
              >
                <MdCall size={18} /> ហៅទូរស័ព្ទ
              </a>

              {selectedTask.receiverAddress && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(selectedTask.receiverAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    border: "1px solid #bfdbfe",
                    padding: "12px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontWeight: "700",
                    fontSize: "13px",
                  }}
                >
                  <MdDirections size={18} /> ផែនទី
                </a>
              )}
            </div>

            {/* Status Change Workflow Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {selectedTask.status !== "in-transit" && selectedTask.status !== "delivered" && (
                <button
                  disabled={updatingId === selectedTask.id}
                  onClick={() => updateStatus(selectedTask.id, "in-transit")}
                  style={{
                    width: "100%",
                    backgroundColor: "#581c87",
                    color: "#ffffff",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "none",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(88, 28, 135, 0.25)",
                  }}
                >
                  <MdLocalShipping size={18} /> ចាប់ផ្ដើមដឹកជញ្ជូន (In-Transit)
                </button>
              )}

              {selectedTask.status !== "delivered" && (
                <button
                  disabled={updatingId === selectedTask.id}
                  onClick={() => updateStatus(selectedTask.id, "delivered")}
                  style={{
                    width: "100%",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "none",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
                  }}
                >
                  <MdCheckCircle size={18} /> បានប្រគល់ជោគជ័យ (Mark Delivered)
                </button>
              )}

              <button
                onClick={() => setProblemDialogOpen(true)}
                style={{
                  width: "100%",
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid #fecaca",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <MdError size={16} /> រាយការណ៍បញ្ហា ឬត្រឡប់ (Report Issue)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Problem Dialog Modal ── */}
      {problemDialogOpen && selectedTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(3px)",
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
              borderRadius: "20px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
              រាយការណ៍បញ្ហាការដឹកជញ្ជូន
            </div>

            <textarea
              rows={3}
              value={problemRemark}
              onChange={(e) => setProblemRemark(e.target.value)}
              placeholder="មូលហេតុ (ឧ. ទាក់ទងភ្ញៀវមិនបាន, ភ្ញៀវបដិសេធទទួល, ខុសទីតាំង)..."
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13px",
                fontFamily: "inherit",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                onClick={() => updateStatus(selectedTask.id, "failed", problemRemark)}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "none",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                ដឹកមិនបានសម្រេច (Failed)
              </button>

              <button
                onClick={() => updateStatus(selectedTask.id, "returned", problemRemark)}
                style={{
                  backgroundColor: "#475569",
                  color: "#ffffff",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "none",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                ប្រគល់ត្រឡប់ទៅហាងវិញ (Return)
              </button>

              <button
                onClick={() => setProblemDialogOpen(false)}
                style={{
                  backgroundColor: "#f1f5f9",
                  color: "#64748b",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "none",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                បោះបង់
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
