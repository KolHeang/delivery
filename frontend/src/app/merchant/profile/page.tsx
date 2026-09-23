"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, clearAuth } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import MerchantHeader from "@/components/merchant/MerchantHeader";
import {
  MdStorefront,
  MdLock,
  MdTranslate,
  MdLogout,
  MdChevronRight,
  MdCameraAlt,
  MdClose,
  MdInventory2,
  MdAttachMoney,
  MdPhone,
  MdLocationOn,
  MdVerified,
  MdEmail,
  MdEdit,
} from "react-icons/md";

const profileTranslations = {
  en: {
    loading: "Loading profile...",
    merchantId: "Merchant ID",
    merchantRole: "Verified Store",
    totalParcelsStat: "Total Parcels",
    balanceStat: "Balance",
    myShop: "Shop Information",
    security: "Change Password",
    language: "App Language",
    logout: "Log Out Account",
    phoneLabel: "Phone Number",
    emailLabel: "Email Address",
    addressLabel: "Store Address",
    zoneLabel: "Operating Zone",
    closeBtn: "Close",
    editBtn: "Edit Shop Details",
    saveBtn: "Save Changes",
    currentPasswordLabel: "Current Password",
    newPasswordLabel: "New Password",
    confirmPasswordLabel: "Confirm New Password",
    passwordChangedSuccess: "Password changed successfully",
    profileUpdatedSuccess: "Shop profile updated successfully",
  },
  km: {
    loading: "កំពុងផ្ទុកព័ត៌មាន...",
    merchantId: "អត្តលេខ",
    merchantRole: "ហាងទំនិញផ្លូវការ",
    totalParcelsStat: "កញ្ចប់ផ្ញើសរុប",
    balanceStat: "សមតុល្យគណនី",
    myShop: "ព័ត៌មានហាង",
    security: "ផ្លាស់ប្តូរលេខសម្ងាត់",
    language: "ភាសាកម្មវិធី",
    logout: "ចាកចេញពីគណនី",
    phoneLabel: "លេខទូរស័ព្ទ",
    emailLabel: "អ៊ីមែល",
    addressLabel: "អាសយដ្ឋានហាង",
    zoneLabel: "តំបន់ប្រតិបត្តិការ",
    closeBtn: "បិទ",
    editBtn: "កែប្រែព័ត៌មានហាង",
    saveBtn: "រក្សាទុកការផ្លាស់ប្តូរ",
    currentPasswordLabel: "លេខសម្ងាត់ចាស់",
    newPasswordLabel: "លេខសម្ងាត់ថ្មី",
    confirmPasswordLabel: "ផ្ទៀងផ្ទាត់លេខសម្ងាត់ថ្មី",
    passwordChangedSuccess: "ប្តូរលេខសម្ងាត់ជោគជ័យ",
    profileUpdatedSuccess: "បច្ចុប្បន្នភាពព័ត៌មានជោគជ័យ",
  },
};

export default function MerchantProfilePage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const t = profileTranslations[lang as "en" | "km"] || profileTranslations.en;

  // Modals state
  const [showShopDetailModal, setShowShopDetailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Password Change State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Edit Profile State
  const [showEditShopModal, setShowEditShopModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  const loadProfileData = async () => {
    try {
      const [profRes, dashRes] = await Promise.all([
        api.get("/mobile/merchant/profile"),
        api.get("/mobile/merchant/dashboard"),
      ]);
      setProfile(profRes.data);
      setDashData(dashRes.data);
    } catch (err) {
      console.error("Failed to load merchant profile data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/merchant/login");
      return;
    }
    loadProfileData();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/merchant/login");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Photo = reader.result as string;
      try {
        const res = await api.patch("/mobile/merchant/profile", { photo: base64Photo });
        setProfile(res.data);
      } catch (err) {
        console.error("Failed to update merchant photo", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const openEditShopModal = () => {
    setEditName(profile?.name || "");
    setEditPhone(profile?.phone || "");
    setEditEmail(profile?.email || "");
    setEditAddress(profile?.address || "");
    setEditError("");
    setEditSuccess("");
    setShowEditShopModal(true);
  };

  const handleEditShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");
    setEditSubmitting(true);
    try {
      const res = await api.patch("/mobile/merchant/profile", {
        name: editName,
        phone: editPhone,
        email: editEmail,
        address: editAddress,
      });
      setProfile(res.data);
      setEditSuccess(t.profileUpdatedSuccess);
      setTimeout(() => {
        setShowEditShopModal(false);
        setEditSuccess("");
      }, 1200);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (lang === "km" ? "ការបច្ចុប្បន្នភាពមិនជោគជ័យទេ" : "Failed to update profile");
      setEditError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!oldPassword) {
      setPasswordError(lang === "km" ? "សូមបញ្ចូលលេខសម្ងាត់ចាស់" : "Please enter current password");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError(
        lang === "km"
          ? "លេខសម្ងាត់ថ្មីយ៉ាងហោចណាស់ ៦ ខ្ទង់"
          : "New password must be at least 6 characters",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(
        lang === "km" ? "លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ" : "New passwords do not match",
      );
      return;
    }

    setPasswordSubmitting(true);
    try {
      const res = await api.patch("/mobile/merchant/change-password", {
        oldPassword,
        newPassword,
      });
      setPasswordSuccess(res.data?.message || t.passwordChangedSuccess);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 1400);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (lang === "km" ? "ការប្តូរលេខសម្ងាត់មិនជោគជ័យទេ" : "Failed to change password");
      setPasswordError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setPasswordSubmitting(false);
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
          minHeight: "80vh",
          backgroundColor: "#f8fafc",
          padding: "24px",
          fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid rgba(88, 28, 135, 0.15)",
            borderTopColor: "#581c87",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            marginBottom: "14px",
          }}
        />
        <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "600" }}>{t.loading}</span>
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`,
          }}
        />
      </div>
    );
  }

  const displayName = profile?.name || "Tita Shop";
  const branchName =
    profile?.zone?.name || (lang === "km" ? "សាខាប៉េងហួតបឹងស្នោ" : "Peng Huoth Boeng Snor");
  const phoneOrId = profile?.phone || "099 865 327";
  const totalParcels = dashData?.statistics?.totalParcel ?? 2;
  const balanceAmount = dashData?.balance?.amount || 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        paddingBottom: "110px",
      }}
    >
      {/* 1. Global Reusable Merchant Header */}
      <MerchantHeader />

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* 2. Digital Merchant Store ID Card (Option 1: Modern & Balanced) */}
        <div
          style={{
            background: "linear-gradient(135deg, #2e0854 0%, #581c87 55%, #7e22ce 100%)",
            borderRadius: "22px",
            padding: "18px 18px 14px",
            color: "#ffffff",
            boxShadow: "0 8px 24px rgba(88, 28, 135, 0.2)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Watermark circle layer */}
          <div
            style={{
              position: "absolute",
              top: "-20px",
              right: "-20px",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255, 234, 96, 0.15) 0%, rgba(255, 255, 255, 0) 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Top Info Section: Avatar + Identity */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Avatar Container */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                style={{
                  width: "66px",
                  height: "66px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  color: "#581c87",
                  fontWeight: "900",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                  overflow: "hidden",
                  border: "2.5px solid #ffea60",
                }}
              >
                {profile?.photo ? (
                  <img
                    src={
                      profile.photo.startsWith("http") || profile.photo.startsWith("data:")
                        ? profile.photo
                        : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}/uploads/${profile.photo}`
                    }
                    alt={displayName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span>{displayName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>

              {/* Camera Upload Button */}
              <label
                style={{
                  position: "absolute",
                  bottom: "-2px",
                  right: "-2px",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "#ffea60",
                  border: "2px solid #581c87",
                  color: "#581c87",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                }}
                title={lang === "km" ? "ប្តូររូបថត" : "Upload Photo"}
              >
                <MdCameraAlt size={13} />
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>

            {/* Identity Information */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: "900",
                    color: "#ffffff",
                    margin: 0,
                    letterSpacing: "-0.2px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {displayName}
                </h2>
                <MdVerified size={18} color="#ffea60" style={{ flexShrink: 0 }} />
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  marginTop: "3px",
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                  padding: "2px 8px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#ffea60",
                  backdropFilter: "blur(4px)",
                }}
              >
                <span>ID: MCH-{String(profile?.id || "001").padStart(3, "0")}</span>
                <span>•</span>
                <span>{t.merchantRole}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "4px",
                  fontSize: "11px",
                  color: "#e9d5ff",
                  fontWeight: "600",
                }}
              >
                <span>📱 {phoneOrId}</span>
                <span>•</span>
                <span>📍 {branchName}</span>
              </div>
            </div>
          </div>

          {/* Performance Summary 2-Stat Strip */}
          <div
            style={{
              marginTop: "14px",
              paddingTop: "12px",
              borderTop: "1px solid rgba(255, 255, 255, 0.16)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              textAlign: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderRadius: "12px",
                padding: "8px 6px",
              }}
            >
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "900",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                }}
              >
                <MdInventory2 size={16} color="#e9d5ff" />
                <span>{totalParcels}</span>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#d8b4fe",
                  fontWeight: "600",
                  marginTop: "2px",
                }}
              >
                {t.totalParcelsStat}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderRadius: "12px",
                padding: "8px 6px",
              }}
            >
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "900",
                  color: "#ffea60",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                }}
              >
                <MdAttachMoney size={16} color="#ffea60" />
                <span>${balanceAmount.toFixed(2)}</span>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#d8b4fe",
                  fontWeight: "600",
                  marginTop: "2px",
                }}
              >
                {t.balanceStat}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Settings & Preferences Menu Card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            boxShadow: "0 3px 16px rgba(15, 23, 42, 0.03)",
            border: "1px solid #f1f5f9",
            overflow: "hidden",
          }}
        >
          {/* Row 1: Shop Information */}
          <div
            onClick={() => setShowShopDetailModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              borderBottom: "1px solid #f8fafc",
              transition: "background-color 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#f3e8ff",
                  color: "#581c87",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MdStorefront size={22} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                {t.myShop}
              </span>
            </div>

            <MdChevronRight size={22} color="#cbd5e1" />
          </div>

          {/* Row 2: Change Password */}
          <div
            onClick={() => setShowPasswordModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              borderBottom: "1px solid #f8fafc",
              transition: "background-color 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#f3e8ff",
                  color: "#7e22ce",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MdLock size={20} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                {t.security}
              </span>
            </div>

            <MdChevronRight size={22} color="#cbd5e1" />
          </div>

          {/* Row 3: App Language Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "13px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#ecfdf5",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MdTranslate size={20} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                {t.language}
              </span>
            </div>

            {/* Language Segmented Switch */}
            <div
              style={{
                backgroundColor: "#f1f5f9",
                borderRadius: "10px",
                padding: "2px",
                display: "flex",
                gap: "2px",
              }}
            >
              <button
                onClick={() => setLang("km")}
                style={{
                  background: lang === "km" ? "#581c87" : "transparent",
                  border: "none",
                  color: lang === "km" ? "#ffea60" : "#64748b",
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                ខ្មែរ
              </button>
              <button
                onClick={() => setLang("en")}
                style={{
                  background: lang === "en" ? "#581c87" : "transparent",
                  border: "none",
                  color: lang === "en" ? "#ffea60" : "#64748b",
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* 4. Standalone Log Out Button Card */}
        <button
          onClick={handleLogout}
          style={{
            marginTop: "2px",
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #fee2e2",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            width: "100%",
            fontFamily: "inherit",
            boxShadow: "0 2px 8px rgba(239, 68, 68, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                backgroundColor: "#fef2f2",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MdLogout size={19} />
            </div>
            <span style={{ fontSize: "15px", fontWeight: "800", color: "#dc2626" }}>
              {t.logout}
            </span>
          </div>

          <MdChevronRight size={22} color="#fca5a5" />
        </button>
      </div>

      {/* --- MODAL 1: Shop Information Details --- */}
      {showShopDetailModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "380px",
              padding: "20px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid #f1f5f9",
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    backgroundColor: "#f3e8ff",
                    color: "#581c87",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdStorefront size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                  {t.myShop}
                </h3>
              </div>
              <button
                onClick={() => setShowShopDetailModal(false)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#f1f5f9",
                  border: "none",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <MdClose size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: "1px solid #f1f5f9",
                }}
              >
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                  {lang === "km" ? "ឈ្មោះហាង" : "Shop Name"}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "#0f172a",
                    marginTop: "2px",
                  }}
                >
                  {displayName}
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: "1px solid #f1f5f9",
                }}
              >
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                  {t.phoneLabel}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "#0f172a",
                    marginTop: "2px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <MdPhone size={16} color="#581c87" /> {phoneOrId}
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: "1px solid #f1f5f9",
                }}
              >
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                  {t.emailLabel}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "#0f172a",
                    marginTop: "2px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <MdEmail size={16} color="#7e22ce" /> {profile?.email || "—"}
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: "1px solid #f1f5f9",
                }}
              >
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                  {t.addressLabel}
                </div>
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: "700",
                    color: "#0f172a",
                    marginTop: "2px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                  }}
                >
                  <MdLocationOn
                    size={16}
                    color="#e11d48"
                    style={{ marginTop: "2px", flexShrink: 0 }}
                  />
                  <span>{profile?.address || branchName}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button
                onClick={() => {
                  setShowShopDetailModal(false);
                  openEditShopModal();
                }}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #581c87 0%, #7e22ce 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "12px",
                  fontSize: "13.5px",
                  fontWeight: "800",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 4px 14px rgba(88, 28, 135, 0.25)",
                }}
              >
                <MdEdit size={16} color="#ffea60" /> {t.editBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Edit Shop Profile --- */}
      {showEditShopModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "380px",
              padding: "20px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid #f1f5f9",
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    backgroundColor: "#f3e8ff",
                    color: "#581c87",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdEdit size={18} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                  {t.editBtn}
                </h3>
              </div>
              <button
                onClick={() => setShowEditShopModal(false)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#f1f5f9",
                  border: "none",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <MdClose size={18} />
              </button>
            </div>

            {editError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginBottom: "14px",
                }}
              >
                ⚠️ {editError}
              </div>
            )}
            {editSuccess && (
              <div
                style={{
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#16a34a",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginBottom: "14px",
                }}
              >
                ✅ {editSuccess}
              </div>
            )}

            <form
              onSubmit={handleEditShopSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  {lang === "km" ? "ឈ្មោះហាង" : "Shop Name"}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13.5px",
                    outline: "none",
                    backgroundColor: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  {t.phoneLabel}
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13.5px",
                    outline: "none",
                    backgroundColor: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  {t.emailLabel}
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13.5px",
                    outline: "none",
                    backgroundColor: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  {t.addressLabel}
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13.5px",
                    outline: "none",
                    backgroundColor: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={editSubmitting}
                style={{
                  marginTop: "6px",
                  width: "100%",
                  background: "linear-gradient(135deg, #581c87 0%, #7e22ce 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "13px",
                  fontSize: "14px",
                  fontWeight: "800",
                  cursor: editSubmitting ? "not-allowed" : "pointer",
                  opacity: editSubmitting ? 0.7 : 1,
                  boxShadow: "0 4px 14px rgba(88, 28, 135, 0.25)",
                }}
              >
                {editSubmitting ? (lang === "km" ? "កំពុងរក្សាទុក..." : "Saving...") : t.saveBtn}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Change Password --- */}
      {showPasswordModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "380px",
              padding: "20px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid #f1f5f9",
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    backgroundColor: "#f3e8ff",
                    color: "#581c87",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdLock size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                  {t.security}
                </h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#f1f5f9",
                  border: "none",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <MdClose size={18} />
              </button>
            </div>

            {passwordError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginBottom: "14px",
                }}
              >
                ⚠️ {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div
                style={{
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#16a34a",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginBottom: "14px",
                }}
              >
                ✅ {passwordSuccess}
              </div>
            )}

            <form
              onSubmit={handleChangePasswordSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  {t.currentPasswordLabel}
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13.5px",
                    outline: "none",
                    backgroundColor: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  {t.newPasswordLabel}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13.5px",
                    outline: "none",
                    backgroundColor: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  {t.confirmPasswordLabel}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13.5px",
                    outline: "none",
                    backgroundColor: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={passwordSubmitting}
                style={{
                  marginTop: "6px",
                  width: "100%",
                  background: "linear-gradient(135deg, #581c87 0%, #7e22ce 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "13px",
                  fontSize: "14px",
                  fontWeight: "800",
                  cursor: passwordSubmitting ? "not-allowed" : "pointer",
                  opacity: passwordSubmitting ? 0.7 : 1,
                  boxShadow: "0 4px 14px rgba(88, 28, 135, 0.25)",
                }}
              >
                {passwordSubmitting
                  ? lang === "km"
                    ? "កំពុងផ្លាស់ប្តូរ..."
                    : "Changing..."
                  : lang === "km"
                    ? "រក្សាទុកលេខសម្ងាត់ថ្មី"
                    : "Save New Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
