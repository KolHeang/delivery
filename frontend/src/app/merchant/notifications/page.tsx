"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";
import {
  MdArrowBack,
  MdNotifications,
  MdDoneAll,
  MdLocalShipping,
  MdCheckCircle,
  MdErrorOutline,
  MdAssignmentReturn,
  MdChat,
  MdAccountBalanceWallet,
  MdDeleteOutline,
  MdAccessTime,
  MdInfo,
} from "react-icons/md";

interface NotificationItem {
  id: number;
  merchantId: number;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export default function MerchantNotificationsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const isKh = lang === "km";

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotifications = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (pageToLoad === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await api.get(
          `/mobile/merchant/notifications?page=${pageToLoad}&limit=20`,
        );
        const data = res?.data || {};
        const items: NotificationItem[] = data.items || [];
        const totalCount = data.total || 0;
        const unread = data.unreadCount || 0;

        setUnreadCount(unread);
        setTotal(totalCount);
        setHasMore(items.length + (append ? notifications.length : 0) < totalCount);

        if (append) {
          setNotifications((prev) => [...prev, ...items]);
        } else {
          setNotifications(items);
        }
      } catch (err) {
        console.error("Failed to load notifications", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [notifications.length],
  );

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/merchant/login");
      return;
    }
    fetchNotifications(1, false);
  }, []);

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await api.patch(`/mobile/merchant/notifications/${item.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {
        console.error("Failed to mark notification as read", e);
      }
    }

    // Navigate to related resource if applicable
    if (item.data?.parcelId) {
      router.push(`/merchant/orders/${item.data.parcelId}`);
    } else if (item.data?.settlementId) {
      router.push(`/merchant/settlement/${item.data.settlementId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post("/mobile/merchant/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.delete(`/mobile/merchant/notifications/${id}`);
      const deletedItem = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (deletedItem && !deletedItem.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffMin < 1) return isKh ? "អម្បាញ់មិញ" : "Just now";
      if (diffMin < 60) return isKh ? `${diffMin} នាទីមុន` : `${diffMin}m ago`;
      if (diffHrs < 24) return isKh ? `${diffHrs} ម៉ោងមុន` : `${diffHrs}h ago`;
      if (diffDays < 7) return isKh ? `${diffDays} ថ្ងៃមុន` : `${diffDays}d ago`;

      return date.toLocaleDateString(isKh ? "km-KH" : "en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const getNotificationTheme = (type: string, status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "delivered" || type === "delivery_success") {
      return {
        icon: MdCheckCircle,
        bg: "#ecfdf5",
        color: "#059669",
        border: "#a7f3d0",
      };
    }
    if (s === "failed" || s === "cancelled" || type === "delivery_failed") {
      return {
        icon: MdErrorOutline,
        bg: "#fef2f2",
        color: "#dc2626",
        border: "#fecaca",
      };
    }
    if (s === "returned") {
      return {
        icon: MdAssignmentReturn,
        bg: "#fffbeb",
        color: "#d97706",
        border: "#fde68a",
      };
    }
    if (type === "chat_message") {
      return {
        icon: MdChat,
        bg: "#faf5ff",
        color: "#7e22ce",
        border: "#e9d5ff",
      };
    }
    if (type === "payment_settlement") {
      return {
        icon: MdAccountBalanceWallet,
        bg: "#eff6ff",
        color: "#2563eb",
        border: "#bfdbfe",
      };
    }
    if (
      s === "in-transit" ||
      s === "picked-up" ||
      type === "task_assigned" ||
      type === "driver_assigned"
    ) {
      return {
        icon: MdLocalShipping,
        bg: "#f0fdf4",
        color: "#16a34a",
        border: "#bbf7d0",
      };
    }
    return {
      icon: MdNotifications,
      bg: "#f8fafc",
      color: "#64748b",
      border: "#e2e8f0",
    };
  };

  const filteredItems =
    tab === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        paddingBottom: "90px",
      }}
    >
      {/* 1. Header Banner in Royal Purple */}
      <div
        style={{
          background: "linear-gradient(135deg, #3b0764 0%, #581c87 60%, #7e22ce 100%)",
          color: "#ffffff",
          padding: "16px 18px",
          position: "sticky",
          top: 0,
          zIndex: 40,
          boxShadow: "0 4px 16px rgba(88, 28, 135, 0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => router.back()}
              aria-label="Back"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                borderRadius: "12px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              <MdArrowBack size={22} />
            </button>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "800",
                  letterSpacing: "-0.2px",
                }}
              >
                {isKh ? "ការជូនដំណឹង" : "Notifications"}
              </h1>
              <span
                style={{
                  fontSize: "12px",
                  color: "rgba(255, 255, 255, 0.8)",
                  fontWeight: "500",
                }}
              >
                {unreadCount > 0
                  ? isKh
                    ? `${unreadCount} មិនទាន់អាន`
                    : `${unreadCount} unread`
                  : isKh
                  ? "គ្មានសារថ្មីទេ"
                  : "All caught up"}
              </span>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              style={{
                background: "rgba(255, 255, 255, 0.18)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                borderRadius: "10px",
                padding: "6px 12px",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.2s ease",
              }}
            >
              <MdDoneAll size={16} />
              <span>{isKh ? "អានទាំងអស់" : "Mark all read"}</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            borderRadius: "12px",
            padding: "3px",
            gap: "4px",
          }}
        >
          <button
            onClick={() => setTab("all")}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              borderRadius: "10px",
              backgroundColor: tab === "all" ? "#ffffff" : "transparent",
              color: tab === "all" ? "#581c87" : "rgba(255, 255, 255, 0.85)",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <span>{isKh ? "ទាំងអស់" : "All"}</span>
            <span
              style={{
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "8px",
                backgroundColor: tab === "all" ? "#f3e8ff" : "rgba(255, 255, 255, 0.2)",
                color: tab === "all" ? "#6b21a8" : "#ffffff",
                fontWeight: "800",
              }}
            >
              {total}
            </span>
          </button>

          <button
            onClick={() => setTab("unread")}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              borderRadius: "10px",
              backgroundColor: tab === "unread" ? "#ffffff" : "transparent",
              color: tab === "unread" ? "#581c87" : "rgba(255, 255, 255, 0.85)",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <span>{isKh ? "មិនទាន់អាន" : "Unread"}</span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "8px",
                  backgroundColor: tab === "unread" ? "#ef4444" : "#ef4444",
                  color: "#ffffff",
                  fontWeight: "800",
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Notifications List Content */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 20px",
              color: "#94a3b8",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                border: "3px solid #e2e8f0",
                borderTopColor: "#581c87",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span style={{ fontSize: "14px", fontWeight: "600" }}>
              {isKh ? "កំពុងផ្ទុកការជូនដំណឹង..." : "Loading notifications..."}
            </span>
            <style
              dangerouslySetInnerHTML={{
                __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`,
              }}
            />
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 20px",
              textAlign: "center",
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              border: "1px dashed #e2e8f0",
              marginTop: "10px",
            }}
          >
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                backgroundColor: "#f3e8ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#7e22ce",
                marginBottom: "16px",
              }}
            >
              <MdNotifications size={36} />
            </div>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "800",
                color: "#1e293b",
                margin: "0 0 6px 0",
              }}
            >
              {tab === "unread"
                ? isKh
                  ? "គ្មានសារមិនទាន់អានទេ"
                  : "No unread notifications"
                : isKh
                ? "គ្មានការជូនដំណឹងទេ"
                : "No notifications yet"}
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                margin: 0,
                maxWidth: "260px",
                lineHeight: "1.5",
              }}
            >
              {isKh
                ? "អ្នកនឹងទទួលបានការជូនដំណឹងស្វ័យប្រវត្តិនៅពេលកញ្ចប់ទំនិញត្រូវបានទទួល កំពុងដឹកជញ្ជូន ឬដឹកជោគជ័យ។"
                : "You will receive automatic alerts when orders are picked up, in-transit, or successfully delivered."}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const theme = getNotificationTheme(item.type, item.data?.status);
            const Icon = theme.icon;

            return (
              <div
                key={item.id}
                onClick={() => handleMarkAsRead(item)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "14px 14px",
                  backgroundColor: item.isRead ? "#ffffff" : "#fdfaff",
                  borderRadius: "18px",
                  border: item.isRead ? "1px solid #f1f5f9" : "1.5px solid #e9d5ff",
                  boxShadow: item.isRead
                    ? "0 1px 3px rgba(0,0,0,0.02)"
                    : "0 4px 14px rgba(126, 34, 206, 0.08)",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Left Type Icon Box */}
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "14px",
                    backgroundColor: theme.bg,
                    border: `1px solid ${theme.border}`,
                    color: theme.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  <Icon size={22} />
                </div>

                {/* Center Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "6px",
                      marginBottom: "3px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: item.isRead ? "700" : "800",
                        color: item.isRead ? "#1e293b" : "#0f172a",
                        lineHeight: 1.3,
                      }}
                    >
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "#a855f7",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>

                  <p
                    style={{
                      fontSize: "13px",
                      color: item.isRead ? "#64748b" : "#334155",
                      margin: "0 0 6px 0",
                      lineHeight: "1.45",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.body}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {item.data?.trackingCode && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            color: "#581c87",
                            backgroundColor: "#f3e8ff",
                            padding: "2px 8px",
                            borderRadius: "8px",
                            letterSpacing: "0.2px",
                          }}
                        >
                          #{item.data.trackingCode}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#94a3b8",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <MdAccessTime size={13} />
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      title={isKh ? "លុប" : "Delete"}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "6px",
                      }}
                    >
                      <MdDeleteOutline size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Load More Button */}
        {hasMore && !loading && (
          <button
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchNotifications(nextPage, true);
            }}
            disabled={loadingMore}
            style={{
              padding: "12px",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              color: "#581c87",
              fontWeight: "700",
              fontSize: "13px",
              cursor: loadingMore ? "not-allowed" : "pointer",
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            {loadingMore
              ? isKh
                ? "កំពុងផ្ទុកបន្ថែម..."
                : "Loading more..."
              : isKh
              ? "ផ្ទុកបន្ថែម"
              : "Load More"}
          </button>
        )}
      </div>
    </div>
  );
}
