"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdCalendarToday,
  MdCheck,
  MdClose,
  MdRefresh,
  MdReceiptLong,
  MdArrowBack,
  MdChevronRight,
  MdLocalShipping,
  MdPhone,
  MdLocationOn,
} from "react-icons/md";

// Helper for formatting date into Khmer (e.g. "ពុធ, 28 តុលា 2026")
function formatKhmerDate(dateInput: string | Date): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const khmerDays = [
      "អាទិត្យ",
      "ច័ន្ទ",
      "អង្គារ",
      "ពុធ",
      "ព្រហស្បតិ៍",
      "សុក្រ",
      "សៅរ៍",
    ];
    const khmerMonths = [
      "មករា",
      "កុម្ភៈ",
      "មីនា",
      "មេសា",
      "ឧសភា",
      "មិថុនា",
      "កក្កដា",
      "សីហា",
      "កញ្ញា",
      "តុលា",
      "វិច្ឆិកា",
      "ធ្នូ",
    ];

    const dayName = khmerDays[d.getDay()];
    const day = d.getDate();
    const monthName = khmerMonths[d.getMonth()];
    const year = d.getFullYear();

    return `${dayName}, ${day} ${monthName} ${year}`;
  } catch {
    return String(dateInput);
  }
}

export default function DriverPaymentsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"daily" | "history">("daily");

  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Daily statistics state
  const [dailyStats, setDailyStats] = useState({
    total: 25,
    delivered: 22,
    failed: 2,
    returned: 1,
    incomeKhr: 22000,
    incomeUsd: 5.05,
    codCollectedKhr: 1777600,
    codCollectedUsd: 444.4,
    codSettlementKhr: 1755600,
    codSettlementUsd: 438.9,
    driverFeeDeductionKhr: 22000,
    exchangeRate: 4000,
    invoiceStatus: "Completed",
    parcelsList: [] as any[],
  });

  // History tab state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"all" | "paid" | "pending" | "problem">("all");

  const loadData = async (targetDate?: string) => {
    setLoading(true);
    const dateQuery = targetDate || selectedDate;
    try {
      const [profRes, dailyRes, settlementsRes] = await Promise.all([
        api.get("/mobile/driver/profile").catch(() => null),
        api.get(`/mobile/driver/invoices/daily?date=${dateQuery}`).catch(() => null),
        api.get(`/mobile/driver/settlements`).catch(() => api.get("/mobile/driver/payments").catch(() => null)),
      ]);

      if (profRes?.data) {
        setProfile(profRes.data?.data || profRes.data);
      }

      if (dailyRes?.data) {
        const d = dailyRes.data?.data || dailyRes.data;
        const parcels = d.parcels || {};
        const fin = d.financial || {};
        const rate = Number(fin.exchangeRate) || 4000;

        const totalParcels = Number(parcels.total) || 0;
        const delivered = Number(parcels.delivered) || 0;
        const failed = Number(parcels.failed) || 0;
        const returned = Number(parcels.returned) || 0;

        const incKhr = fin.incomeKhr !== undefined ? Number(fin.incomeKhr) : Number(fin.totalDeliveryFee) || delivered * 1000;
        const incUsd = fin.incomeUsd !== undefined ? Number(fin.incomeUsd) : (incKhr > 0 ? Number((incKhr / rate).toFixed(2)) : 0);

        const rawCodUsd = Number(fin.totalCodUsd) || 0;
        const rawCodKhr = Number(fin.totalCodKhr) || 0;

        const codCollKhr = fin.codCollectedKhr !== undefined ? Number(fin.codCollectedKhr) : Math.round(rawCodKhr + rawCodUsd * rate);
        const codCollUsd = fin.codCollectedUsd !== undefined ? Number(fin.codCollectedUsd) : (codCollKhr > 0 ? Number((codCollKhr / rate).toFixed(2)) : 0);

        const codSetKhr = fin.codSettlementKhr !== undefined ? Number(fin.codSettlementKhr) : Math.max(0, codCollKhr - incKhr);
        const codSetUsd = fin.codSettlementUsd !== undefined ? Number(fin.codSettlementUsd) : (codSetKhr > 0 ? Number((codSetKhr / rate).toFixed(2)) : 0);

        setDailyStats({
          total: totalParcels,
          delivered: delivered,
          failed: failed,
          returned: returned,
          incomeKhr: incKhr,
          incomeUsd: incUsd,
          codCollectedKhr: codCollKhr,
          codCollectedUsd: codCollUsd,
          codSettlementKhr: codSetKhr,
          codSettlementUsd: codSetUsd,
          driverFeeDeductionKhr: incKhr,
          exchangeRate: rate,
          invoiceStatus: d.invoiceStatus || (delivered > 0 ? "Completed" : "Pending"),
          parcelsList: Array.isArray(d.parcelsList) ? d.parcelsList : [],
        });
      }

      // History settlements list
      if (settlementsRes?.data) {
        const raw = settlementsRes.data?.data || settlementsRes.data?.result || settlementsRes.data;
        const list = Array.isArray(raw) ? raw : [];
        setInvoices(list);
      }
    } catch (err) {
      console.error("Failed to load driver payment info", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/driver/login");
      return;
    }
    loadData(selectedDate);
  }, [router, selectedDate]);

  const user = getUser() as any;
  const riderName =
    profile?.nameKh || profile?.name || user?.name || user?.username || "Driver";
  const riderCode =
    profile?.code ||
    (profile?.id
      ? `DRV-${String(profile.id).padStart(3, "0")}`
      : user?.id
      ? `DRV-${String(user.id).padStart(3, "0")}`
      : "DRV-001");

  const khmerFormattedDate = formatKhmerDate(selectedDate);

  // Filter history items
  const filteredHistory = invoices.filter((item) => {
    if (historyFilter === "all") return true;
    const st = (item.status || "").toLowerCase();
    if (historyFilter === "paid") return st === "paid" || st === "completed";
    if (historyFilter === "pending") return st === "pending" || st === "unpaid";
    if (historyFilter === "problem") return st === "problem" || st === "failed";
    return true;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, sans-serif",
        paddingBottom: "84px",
        maxWidth: "430px",
        margin: "0 auto",
        boxShadow: "0 0 25px rgba(0,0,0,0.06)",
      }}
    >
      {/* 1. TOP HEADER BANNER (Blue background matching design) */}
      <div
        style={{
          background: "linear-gradient(180deg, #1d4ed8 0%, #2563eb 100%)",
          padding: "24px 20px 20px 20px",
          color: "#ffffff",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: "800",
              letterSpacing: "-0.3px",
              color: "#ffffff",
            }}
          >
            ការទូទាត់ប្រាក់
          </h1>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "13px",
              color: "rgba(255, 255, 255, 0.85)",
              fontWeight: "500",
            }}
          >
            ប្រាក់ចំណូល និងការទូទាត់ COD
          </p>
        </div>

        {/* Top Right Action (View receipt icon) */}
        <button
          onClick={() => setShowInvoiceModal(true)}
          title="មើលវិក្កយបត្រ"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <rect x="8.5" y="8.5" width="7" height="7" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>

      {/* 2. SEGMENTED TABS: ប្រចាំថ្ងៃ (Daily) / ប្រវត្តិ (History) */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          padding: "4px",
          margin: "16px 16px 0 16px",
          display: "flex",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
        }}
      >
        <button
          onClick={() => setActiveTab("daily")}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            backgroundColor: activeTab === "daily" ? "#2563eb" : "transparent",
            color: activeTab === "daily" ? "#ffffff" : "#64748b",
            fontSize: "14px",
            fontWeight: "700",
            transition: "all 0.2s ease",
          }}
        >
          ប្រចាំថ្ងៃ
        </button>

        <button
          onClick={() => setActiveTab("history")}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            backgroundColor: activeTab === "history" ? "#2563eb" : "transparent",
            color: activeTab === "history" ? "#ffffff" : "#64748b",
            fontSize: "14px",
            fontWeight: "700",
            transition: "all 0.2s ease",
          }}
        >
          ប្រវត្តិ
        </button>
      </div>

      {/* ===================== TAB 1: DAILY VIEW (ប្រចាំថ្ងៃ) ===================== */}
      {activeTab === "daily" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* 3. DATE SELECTOR PILL */}
          <div
            onClick={() => setShowCalendarModal(true)}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "12px 18px",
              margin: "14px 16px 0 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            }}
          >
            {/* Left Calendar Grid Icon */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
            </svg>

            <span
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#0f172a",
                letterSpacing: "-0.2px",
              }}
            >
              {khmerFormattedDate}
            </span>

            {/* Right Calendar Grid Icon */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
            </svg>
          </div>

          {/* 4. DARK BLUE GRADIENT INCOME CARD */}
          <div
            style={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
              borderRadius: "20px",
              padding: "22px 20px",
              margin: "14px 16px 0 16px",
              color: "#ffffff",
              boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.35)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#93c5fd",
                fontWeight: "600",
              }}
            >
              ប្រាក់ចំណូលថ្ងៃនេះ
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginTop: "4px",
              }}
            >
              {/* Amounts Column */}
              <div>
                <div
                  style={{
                    fontSize: "30px",
                    fontWeight: "900",
                    color: "#ffffff",
                    letterSpacing: "-0.5px",
                    lineHeight: "1.2",
                  }}
                >
                  {dailyStats.incomeKhr.toLocaleString()} ៛
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "800",
                    color: "#ffffff",
                    letterSpacing: "-0.5px",
                    marginTop: "2px",
                  }}
                >
                  {String(dailyStats.incomeUsd.toFixed(2)).padStart(5, "0")} $
                </div>
              </div>

              {/* Subtitle / Note Column */}
              <div
                style={{
                  fontSize: "10px",
                  lineHeight: "1.4",
                  color: "#94a3b8",
                  maxWidth: "175px",
                  textAlign: "right",
                  paddingBottom: "4px",
                }}
              >
                គណនាតាមតម្លៃកញ្ចប់ដែលបានដឹកជោគជ័យ និងអត្រាប្តូរប្រាក់ System
              </div>
            </div>
          </div>

          {/* 5. DELIVERY SUMMARY (សង្ខេបការដឹកជញ្ជូន) */}
          <div style={{ margin: "20px 16px 0 16px" }}>
            <h2
              style={{
                margin: "0 0 12px 0",
                fontSize: "16px",
                fontWeight: "800",
                color: "#0f172a",
                letterSpacing: "-0.2px",
              }}
            >
              សង្ខេបការដឹកជញ្ជូន
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
              }}
            >
              {/* Card 1: ដឹកជោគជ័យ (Green check) */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    backgroundColor: "#dcfce7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#16a34a",
                    flexShrink: 0,
                  }}
                >
                  <MdCheck size={22} style={{ strokeWidth: 1.5 }} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "900",
                      color: "#0f172a",
                      lineHeight: "1.1",
                    }}
                  >
                    {dailyStats.delivered}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#64748b",
                      marginTop: "2px",
                    }}
                  >
                    ដឹកជោគជ័យ
                  </div>
                </div>
              </div>

              {/* Card 2: បរាជ័យ (Orange exclamation) */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    backgroundColor: "#fef3c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#d97706",
                    fontSize: "20px",
                    fontWeight: "900",
                    flexShrink: 0,
                  }}
                >
                  !
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "900",
                      color: "#0f172a",
                      lineHeight: "1.1",
                    }}
                  >
                    {dailyStats.failed}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#64748b",
                      marginTop: "2px",
                    }}
                  >
                    បរាជ័យ
                  </div>
                </div>
              </div>

              {/* Card 3: បានត្រឡប់ (Blue swap arrow) */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    backgroundColor: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 14 4 9 9 4" />
                    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "900",
                      color: "#0f172a",
                      lineHeight: "1.1",
                    }}
                  >
                    {dailyStats.returned}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#64748b",
                      marginTop: "2px",
                    }}
                  >
                    បានត្រឡប់
                  </div>
                </div>
              </div>

              {/* Card 4: កញ្ចប់សរុប (Blue square) */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    backgroundColor: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "900",
                      color: "#0f172a",
                      lineHeight: "1.1",
                    }}
                  >
                    {dailyStats.total}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#64748b",
                      marginTop: "2px",
                    }}
                  >
                    កញ្ចប់សរុប
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. COD SETTLEMENT SECTION (ការទូទាត់ COD) */}
          <div style={{ margin: "20px 16px 0 16px" }}>
            <h2
              style={{
                margin: "0 0 12px 0",
                fontSize: "16px",
                fontWeight: "800",
                color: "#0f172a",
                letterSpacing: "-0.2px",
              }}
            >
              ការទូទាត់ COD
            </h2>

            {/* Card 1: COD ប្រមូលបានពីអតិថិជន */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "16px 18px",
                border: "1px solid #f1f5f9",
                boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#64748b",
                  marginBottom: "6px",
                }}
              >
                COD ប្រមូលបានពីអតិថិជន
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: "900",
                    color: "#0f172a",
                    letterSpacing: "-0.4px",
                  }}
                >
                  {dailyStats.codCollectedKhr.toLocaleString()} ៛
                </div>

                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "800",
                    color: "#2563eb",
                    letterSpacing: "-0.4px",
                  }}
                >
                  ${dailyStats.codCollectedUsd.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Card 2: COD ត្រូវទូទាត់ទៅក្រុមហ៊ុន */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "16px 18px",
                border: "1px solid #f1f5f9",
                boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#64748b",
                  marginBottom: "6px",
                }}
              >
                COD ត្រូវទូទាត់ទៅក្រុមហ៊ុន
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: "900",
                    color: "#2563eb",
                    letterSpacing: "-0.4px",
                  }}
                >
                  {dailyStats.codSettlementKhr.toLocaleString()} ៛
                </div>

                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "800",
                    color: "#2563eb",
                    letterSpacing: "-0.4px",
                  }}
                >
                  ${dailyStats.codSettlementUsd.toFixed(2)}
                </div>
              </div>

              {/* Subtitle note: ក្រោយកាត់កម្រៃដឹកជញ្ជូន 22,000 ៛ រួច */}
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontWeight: "500",
                  marginTop: "6px",
                }}
              >
                ក្រោយកាត់កម្រៃដឹកជញ្ជូន {dailyStats.driverFeeDeductionKhr.toLocaleString()} ៛ រួច
              </div>
            </div>
          </div>

          {/* 7. ACTION BUTTON: មើលវិក្កយបត្រ (View Invoice) */}
          <div style={{ margin: "22px 16px 12px 16px" }}>
            <button
              onClick={() => setShowInvoiceModal(true)}
              style={{
                width: "100%",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                borderRadius: "16px",
                padding: "16px",
                border: "none",
                fontSize: "16px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(37, 99, 235, 0.28)",
                transition: "all 0.2s ease",
              }}
            >
              មើលវិក្កយបត្រ
            </button>

            <div
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                textAlign: "center",
                marginTop: "8px",
                fontWeight: "500",
              }}
            >
              ទិន្នន័យ COD និងវិក្កយបត្រ ទាញពី System តាមថ្ងៃដែលបានជ្រើស
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: HISTORY VIEW (ប្រវត្តិ) ===================== */}
      {activeTab === "history" && (
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* History Status Filters */}
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
            {(
              [
                { id: "all", label: "ទាំងអស់" },
                { id: "paid", label: "បានទូទាត់" },
                { id: "pending", label: "រង់ចាំទូទាត់" },
                { id: "problem", label: "មានបញ្ហា" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setHistoryFilter(tab.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                  border: "1px solid",
                  cursor: "pointer",
                  backgroundColor: historyFilter === tab.id ? "#2563eb" : "#ffffff",
                  borderColor: historyFilter === tab.id ? "#2563eb" : "#e2e8f0",
                  color: historyFilter === tab.id ? "#ffffff" : "#64748b",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* History List */}
          {filteredHistory.length === 0 ? (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "40px 20px",
                textAlign: "center",
                border: "1px solid #e2e8f0",
                marginTop: "12px",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px auto",
                }}
              >
                <MdReceiptLong size={28} />
              </div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                មិនទាន់មានប្រវត្តិវិក្កយបត្រទេ
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                វិក្កយបត្រដែលបានបញ្ចប់នឹងបង្ហាញនៅទីនេះ
              </div>
            </div>
          ) : (
            filteredHistory.map((item, idx) => {
              const refCode = item.reference || `ST${8000 + (item.id || idx + 1)}`;
              const isPaid = (item.status || "").toLowerCase() === "paid";
              return (
                <div
                  key={item.id || idx}
                  onClick={() => setShowInvoiceModal(true)}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    padding: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>
                        {refCode}
                      </span>
                      <span
                        style={{
                          backgroundColor: isPaid ? "#dcfce7" : "#fef3c7",
                          color: isPaid ? "#16a34a" : "#d97706",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "10.5px",
                          fontWeight: "700",
                        }}
                      >
                        {isPaid ? "បានទូទាត់" : "រង់ចាំ"}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                      {item.date ? new Date(item.date).toLocaleDateString("en-GB") : selectedDate}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>កម្រៃសរុប</div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                        {(Number(item.amount) || Number(item.totalAmount) || 22000).toLocaleString()} ៛
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>COD សរុប</div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "#2563eb" }}>
                        ${(Number(item.totalCodUsd) || 444.4).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===================== DATE PICKER MODAL ===================== */}
      {showCalendarModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            zIndex: 100,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setShowCalendarModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              width: "100%",
              maxWidth: "430px",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
              padding: "24px",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
              animation: "slideUp 0.25s ease-out",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                ជ្រើសរើសកាលបរិច្ឆេទ
              </h3>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <MdClose size={22} />
              </button>
            </div>

            {/* Quick buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
              {[
                { label: "ថ្ងៃនេះ", days: 0 },
                { label: "ម្សិលមិញ", days: 1 },
                { label: "៧ ថ្ងៃមុន", days: 7 },
              ].map((btn, i) => {
                const target = new Date();
                target.setDate(target.getDate() - btn.days);
                const str = target.toISOString().split("T")[0];
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedDate(str);
                      setShowCalendarModal(false);
                    }}
                    style={{
                      padding: "10px",
                      borderRadius: "12px",
                      backgroundColor: selectedDate === str ? "#eff6ff" : "#f8fafc",
                      border: selectedDate === str ? "1px solid #2563eb" : "1px solid #e2e8f0",
                      color: selectedDate === str ? "#2563eb" : "#0f172a",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>

            {/* Native Date Picker */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  setShowCalendarModal(false);
                }
              }}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                border: "1.5px solid #2563eb",
                fontSize: "15px",
                fontWeight: "700",
                color: "#0f172a",
                outline: "none",
                marginBottom: "16px",
              }}
            />

            <button
              onClick={() => setShowCalendarModal(false)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                fontSize: "15px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              យល់ព្រម
            </button>
          </div>
        </div>
      )}

      {/* ===================== INVOICE DETAILS MODAL (មើលវិក្កយបត្រ) ===================== */}
      {showInvoiceModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            zIndex: 110,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              width: "100%",
              maxWidth: "430px",
              maxHeight: "88vh",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.2)",
              animation: "slideUp 0.25s ease-out",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdReceiptLong size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                    វិក្កយបត្រដឹកជញ្ជូនប្រចាំថ្ងៃ
                  </h3>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                    {khmerFormattedDate}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowInvoiceModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px",
                }}
              >
                <MdClose size={22} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 0",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* Rider Info Card */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>អ្នកដឹក</div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
                    {riderName}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>អត្តលេខ</div>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: "#2563eb", fontFamily: "monospace" }}>
                    {riderCode}
                  </div>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "14px",
                  padding: "16px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>
                  ការគណនាទូទាត់ប្រាក់
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#64748b" }}>កញ្ចប់ដឹកជោគជ័យ</span>
                  <span style={{ fontWeight: "700", color: "#0f172a" }}>{dailyStats.delivered} កញ្ចប់</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#64748b" }}>កម្រៃដឹកសរុប (ប្រាក់ចំណូល)</span>
                  <span style={{ fontWeight: "800", color: "#16a34a" }}>
                    +{dailyStats.incomeKhr.toLocaleString()} ៛ (${dailyStats.incomeUsd.toFixed(2)})
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#64748b" }}>COD ប្រមូលបានពីអតិថិជន</span>
                  <span style={{ fontWeight: "800", color: "#0f172a" }}>
                    {dailyStats.codCollectedKhr.toLocaleString()} ៛ (${dailyStats.codCollectedUsd.toFixed(2)})
                  </span>
                </div>

                <div
                  style={{
                    borderTop: "1px dashed #e2e8f0",
                    paddingTop: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ fontWeight: "800", color: "#0f172a" }}>COD ត្រូវទូទាត់ជូនក្រុមហ៊ុន</span>
                  <span style={{ fontWeight: "900", color: "#2563eb" }}>
                    {dailyStats.codSettlementKhr.toLocaleString()} ៛ (${dailyStats.codSettlementUsd.toFixed(2)})
                  </span>
                </div>
              </div>

              {/* Parcels List */}
              {dailyStats.parcelsList && dailyStats.parcelsList.length > 0 && (
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>
                    បញ្ជីកញ្ចប់ទំនិញ ({dailyStats.parcelsList.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {dailyStats.parcelsList.map((p: any, index: number) => (
                      <div
                        key={p.id || index}
                        style={{
                          backgroundColor: "#f8fafc",
                          borderRadius: "12px",
                          padding: "10px 12px",
                          border: "1px solid #f1f5f9",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700" }}>
                          <span style={{ color: "#2563eb" }}>{p.trackingCode || `#${p.id}`}</span>
                          <span style={{ color: "#0f172a" }}>
                            {p.cod} {p.codCurrency || "USD"}
                          </span>
                        </div>
                        <div style={{ color: "#64748b", marginTop: "2px" }}>
                          {p.receiverName || "អតិថិជន"} • {p.receiverPhone || ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <button
              onClick={() => setShowInvoiceModal(false)}
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                borderRadius: "14px",
                border: "none",
                fontSize: "15px",
                fontWeight: "800",
                cursor: "pointer",
                marginTop: "10px",
              }}
            >
              បិទ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
