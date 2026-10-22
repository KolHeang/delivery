"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, clearAuth, getUser } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdStore,
  MdTranslate,
  MdLock,
  MdHeadsetMic,
  MdDescription,
  MdSecurity,
  MdDeleteOutline,
  MdLogout,
  MdChevronRight,
  MdCameraAlt,
  MdClose,
  MdCheckCircle,
  MdPhone,
  MdEmail,
  MdLocationOn,
} from "react-icons/md";
import { FaTelegram } from "react-icons/fa";

export default function MerchantProfilePage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const t = {
    title: lang === "km" ? "គណនីហាង" : "Profile",
    merchantInfo: lang === "km" ? "ព័ត៌មានហាង / អាជីវករ" : "Merchant Information",
    language: lang === "km" ? "ភាសា" : "Language",
    changePassword: lang === "km" ? "ផ្លាស់ប្តូរលេខសម្ងាត់" : "Change Password",
    contactSupport: lang === "km" ? "ទាក់ទងមកកាន់ E-Express" : "Contact E-Express",
    terms: lang === "km" ? "លក្ខខណ្ឌប្រើប្រាស់" : "Terms & Conditions",
    privacy: lang === "km" ? "គោលការណ៍ឯកជនភាព" : "Privacy Policy",
    deleteAccount: lang === "km" ? "លុបគណនី" : "Delete Account",
    logout: lang === "km" ? "ចាកចេញ" : "Log Out",
    logoutConfirm:
      lang === "km"
        ? "តើអ្នកពិតជាចង់ចាកចេញពីគណនីហាងមែនទេ?"
        : "Are you sure you want to log out of your merchant account?",
    cancel: lang === "km" ? "ថយក្រោយ" : "Cancel",
    save: lang === "km" ? "រក្សាទុក" : "Save",
    close: lang === "km" ? "បិទ" : "Close",
    appVersion: "E-Express Merchant App v2.4.0",
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/mobile/merchant/profile").catch(() => null);
      if (res?.data) setProfile(res.data);
    } catch (err) {
      console.error("Failed to load merchant profile", err);
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

  const handleLogout = () => {
    clearAuth();
    router.push("/merchant/login");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      await api.patch("/mobile/merchant/change-password", { oldPassword, newPassword });
      setPasswordSuccess("Password changed successfully");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 1200);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || "Failed to change password");
    }
  };

  const user = getUser() as any;
  const storeName = profile?.name || user?.name || "Little Girl Studio";
  const storePhone = profile?.phone || user?.phone || "098 387 7786";
  const storeAddress = profile?.address || "#45, St. 310, BKK3, Phnom Penh";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, sans-serif",
        paddingBottom: "90px",
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

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* 2. Store Avatar & Identity Card (Screen 18 Match) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            padding: "24px 20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "88px",
              height: "88px",
              borderRadius: "50%",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              fontWeight: "900",
              boxShadow: "0 6px 18px rgba(37, 99, 235, 0.25)",
              border: "3px solid #ffffff",
              overflow: "hidden",
            }}
          >
            {profile?.photo ? (
              <img
                src={profile.photo}
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
                fontSize: "20px",
                fontWeight: "900",
                color: "#0f172a",
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              {storeName}
            </h2>
            <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>
              {storePhone}
            </div>
          </div>
        </div>

        {/* 3. Screen 18 Menu Options */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 3px 14px rgba(0,0,0,0.02)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 1. Merchant Information */}
          <div
            onClick={() => setShowInfoModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdStore size={22} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                {t.merchantInfo}
              </span>
            </div>
            <MdChevronRight size={22} color="#94a3b8" />
          </div>

          {/* 2. Language */}
          <div
            onClick={() => setShowLanguageModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor: "#f0fdf4",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdTranslate size={20} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                {t.language}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#2563eb",
                  backgroundColor: "#eff6ff",
                  padding: "3px 8px",
                  borderRadius: "8px",
                }}
              >
                {lang === "km" ? "ភាសាខ្មែរ" : "English"}
              </span>
              <MdChevronRight size={22} color="#94a3b8" />
            </div>
          </div>

          {/* 3. Change Password */}
          <div
            onClick={() => setShowPasswordModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor: "#faf5ff",
                  color: "#9333ea",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdLock size={20} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                {t.changePassword}
              </span>
            </div>
            <MdChevronRight size={22} color="#94a3b8" />
          </div>

          {/* 4. Contact E-Express */}
          <div
            onClick={() => setShowContactModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor: "#f0f9ff",
                  color: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdHeadsetMic size={20} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                {t.contactSupport}
              </span>
            </div>
            <MdChevronRight size={22} color="#94a3b8" />
          </div>

          {/* 5. Terms & Conditions */}
          <div
            onClick={() => setShowTermsModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdDescription size={20} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                {t.terms}
              </span>
            </div>
            <MdChevronRight size={22} color="#94a3b8" />
          </div>

          {/* 6. Privacy Policy */}
          <div
            onClick={() => setShowPrivacyModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdSecurity size={20} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                {t.privacy}
              </span>
            </div>
            <MdChevronRight size={22} color="#94a3b8" />
          </div>

          {/* 7. Delete Account */}
          <div
            onClick={() => alert("Please contact E-Express administrator to request account deletion.")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor: "#fef2f2",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdDeleteOutline size={20} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#dc2626" }}>
                {t.deleteAccount}
              </span>
            </div>
            <MdChevronRight size={22} color="#fca5a5" />
          </div>

          {/* 8. Log Out */}
          <div
            onClick={() => setShowLogoutModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor: "#fee2e2",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdLogout size={20} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "800", color: "#ef4444" }}>
                {t.logout}
              </span>
            </div>
            <MdChevronRight size={22} color="#fca5a5" />
          </div>
        </div>

        {/* 4. App Version */}
        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}>
          {t.appVersion}
        </div>
      </div>

      {/* --- MODAL 1: Merchant Information --- */}
      {showInfoModal && (
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
              maxWidth: "360px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                {t.merchantInfo}
              </h3>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <MdClose size={22} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px" }}>
              <div>
                <span style={{ color: "#64748b", fontSize: "12px" }}>Store Name</span>
                <div style={{ fontWeight: "800", color: "#0f172a" }}>{storeName}</div>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "12px" }}>Phone Number</span>
                <div style={{ fontWeight: "800", color: "#0f172a" }}>{storePhone}</div>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "12px" }}>Store Pickup Address</span>
                <div style={{ fontWeight: "700", color: "#0f172a" }}>{storeAddress}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
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
                marginTop: "6px",
              }}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Language Modal --- */}
      {showLanguageModal && (
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
              maxWidth: "340px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                Select Language
              </h3>
              <button
                type="button"
                onClick={() => setShowLanguageModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <MdClose size={22} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setLang("en");
                setShowLanguageModal(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px",
                borderRadius: "14px",
                border: lang === "en" ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                backgroundColor: lang === "en" ? "#eff6ff" : "#ffffff",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: "700" }}>🇬🇧 English</span>
              {lang === "en" && <MdCheckCircle size={20} color="#2563eb" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setLang("km");
                setShowLanguageModal(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px",
                borderRadius: "14px",
                border: lang === "km" ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                backgroundColor: lang === "km" ? "#eff6ff" : "#ffffff",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: "700" }}>🇰🇭 ភាសាខ្មែរ (Khmer)</span>
              {lang === "km" && <MdCheckCircle size={20} color="#2563eb" />}
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Contact E-Express --- */}
      {showContactModal && (
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
              maxWidth: "340px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                {t.contactSupport}
              </h3>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <MdClose size={22} />
              </button>
            </div>

            <a
              href="tel:+85523888999"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                borderRadius: "14px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                textDecoration: "none",
                fontWeight: "700",
              }}
            >
              <MdPhone size={22} />
              <span>Hotline: +855 23 888 999</span>
            </a>

            <a
              href="https://t.me/eexpress_support"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                borderRadius: "14px",
                backgroundColor: "#f0f9ff",
                color: "#0284c7",
                textDecoration: "none",
                fontWeight: "700",
              }}
            >
              <FaTelegram size={22} />
              <span>Telegram: @eexpress_support</span>
            </a>
          </div>
        </div>
      )}

      {/* --- MODAL 4: Log Out Confirmation Dialog --- */}
      {showLogoutModal && (
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
              maxWidth: "340px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                backgroundColor: "#fee2e2",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MdLogout size={26} />
            </div>

            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
              {t.logout}
            </h3>

            <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b", lineHeight: "1.5" }}>
              {t.logoutConfirm}
            </p>

            <div style={{ display: "flex", gap: "8px", width: "100%", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {t.cancel}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
