"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, clearAuth, getUser } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdPerson,
  MdLock,
  MdTranslate,
  MdLogout,
  MdChevronRight,
  MdCameraAlt,
  MdClose,
  MdCheckCircle,
  MdPhone,
  MdEmail,
  MdLocationOn,
  MdSettings,
  MdEdit,
} from "react-icons/md";

const profileTranslations = {
  en: {
    title: "Profile",
    loading: "Loading profile...",
    driverId: "Rider ID",
    driverRole: "Delivery Driver",
    online: "Online",
    offline: "Offline",
    myProfile: "Personal Information",
    security: "Change Password",
    language: "Language",
    languageCurrent: "English",
    logout: "Log Out",
    phoneLabel: "Phone Number",
    emailLabel: "Email Address",
    branchLabel: "Assigned Branch",
    genderLabel: "Gender",
    genderMale: "Male",
    genderFemale: "Female",
    joinDateLabel: "Join Date",
    dobLabel: "Date of Birth",
    closeBtn: "Close",
    editBtn: "Edit Profile",
    saveBtn: "Save Changes",
    saving: "Saving...",
    logoutTitle: "Confirm Log Out",
    logoutConfirm: "Are you sure you want to log out of your driver account?",
    confirmLogoutBtn: "Log Out",
    cancelBtn: "Cancel",
    currentPasswordLabel: "Current Password",
    newPasswordLabel: "New Password",
    confirmPasswordLabel: "Confirm Password",
    passwordChangedSuccess: "Password changed successfully",
    profileUpdatedSuccess: "Profile updated successfully",
    selectLanguage: "Select Language",
    appVersion: "E-Express Rider App v2.4.0",
  },
  km: {
    title: "ព័ត៌មានផ្ទាល់ខ្លួន",
    loading: "កំពុងផ្ទុកព័ត៌មាន...",
    driverId: "អត្តលេខ",
    driverRole: "អ្នកដឹកជញ្ជូន",
    online: "កំពុងបំពេញការងារ",
    offline: "ក្រៅបណ្តាញ",
    myProfile: "ព័ត៌មានផ្ទាល់ខ្លួន",
    security: "ផ្លាស់ប្តូរលេខសម្ងាត់",
    language: "ភាសា",
    languageCurrent: "ភាសាខ្មែរ",
    logout: "ចាកចេញ",
    phoneLabel: "លេខទូរស័ព្ទ",
    emailLabel: "អ៊ីមែល",
    branchLabel: "សាខាបំពេញការងារ",
    genderLabel: "ភេទ",
    genderMale: "ប្រុស (Male)",
    genderFemale: "ស្រី (Female)",
    joinDateLabel: "ថ្ងៃចូលធ្វើការ",
    dobLabel: "ថ្ងៃខែឆ្នាំកំណើត",
    closeBtn: "បិទ",
    editBtn: "កែប្រែព័ត៌មាន",
    saveBtn: "រក្សាទុកការផ្លាស់ប្តូរ",
    saving: "កំពុងរក្សាទុក...",
    logoutTitle: "បញ្ជាក់ការចាកចេញ",
    logoutConfirm: "តើអ្នកពិតជាចង់ចាកចេញពីគណនីអ្នកដឹកជញ្ជូនមែនទេ?",
    confirmLogoutBtn: "ចាកចេញ",
    cancelBtn: "ថយក្រោយ",
    currentPasswordLabel: "លេខសម្ងាត់ចាស់",
    newPasswordLabel: "លេខសម្ងាត់ថ្មី",
    confirmPasswordLabel: "ផ្ទៀងផ្ទាត់លេខសម្ងាត់ថ្មី",
    passwordChangedSuccess: "ប្តូរលេខសម្ងាត់ជោគជ័យ",
    profileUpdatedSuccess: "បច្ចុប្បន្នភាពព័ត៌មានជោគជ័យ",
    selectLanguage: "ជ្រើសរើសភាសា",
    appVersion: "E-Express Rider App v2.4.0",
  },
};

export default function DriverProfilePage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const t = profileTranslations[lang as "en" | "km"] || profileTranslations.en;

  // Modals state
  const [showProfileDetailModal, setShowProfileDetailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Password Change State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Edit Profile State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editGender, setEditGender] = useState("male");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

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
          : "New password must be at least 6 characters"
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(
        lang === "km" ? "លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ" : "New passwords do not match"
      );
      return;
    }

    setPasswordSubmitting(true);
    try {
      const res = await api.patch("/mobile/driver/change-password", {
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
      }, 1200);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (lang === "km" ? "ការប្តូរលេខសម្ងាត់មិនជោគជ័យទេ" : "Failed to change password");
      setPasswordError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const openEditProfileModal = () => {
    setEditName(profile?.name || "");
    setEditPhone(profile?.phone || "");
    setEditEmail(profile?.email || "");
    setEditGender(profile?.gender || "male");
    setEditError("");
    setEditSuccess("");
    setShowEditProfileModal(true);
  };

  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");
    setEditSubmitting(true);
    try {
      const res = await api.patch("/mobile/driver/profile", {
        name: editName,
        phone: editPhone,
        email: editEmail,
        gender: editGender,
      });
      setProfile(res.data);
      setEditSuccess(t.profileUpdatedSuccess);
      setTimeout(() => {
        setShowEditProfileModal(false);
        setEditSuccess("");
      }, 1000);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (lang === "km" ? "ការបច្ចុប្បន្នភាពមិនជោគជ័យទេ" : "Failed to update profile");
      setEditError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Photo = reader.result as string;
      try {
        const res = await api.patch("/mobile/driver/profile", { photo: base64Photo });
        setProfile(res.data);
      } catch (err) {
        console.error("Failed to update driver photo", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadProfileData = async () => {
    try {
      const res = await api.get("/mobile/driver/profile");
      setProfile(res.data);
    } catch (err) {
      console.error("Failed to load driver profile data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/driver/login");
      return;
    }
    loadProfileData();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/driver/login");
  };

  const user = getUser() as any;
  const displayName = profile?.name || user?.name || user?.username || "Sophal Rider";
  const riderCode =
    profile?.code || (profile?.id ? `DRV-${String(profile.id).padStart(3, "0")}` : "RDR001");
  const branchName =
    profile?.branch?.name || profile?.branchName || (lang === "km" ? "សាខាកណ្តាល" : "Phnom Penh Central");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, sans-serif",
        paddingBottom: "90px",
        maxWidth: "430px",
        margin: "0 auto",
        boxShadow: "0 0 25px rgba(0,0,0,0.05)",
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
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: "800",
            color: "#0f172a",
            letterSpacing: "-0.3px",
          }}
        >
          {t.title}
        </h1>

        <button
          onClick={() => setShowProfileDetailModal(true)}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#475569",
            cursor: "pointer",
          }}
        >
          <MdSettings size={19} />
        </button>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* 2. Screen 10 Profile Avatar & Identity Card */}
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
            gap: "12px",
          }}
        >
          {/* Avatar Container with Online Green Pill */}
          <div style={{ position: "relative", marginBottom: "4px" }}>
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
                overflow: "hidden",
                border: "3px solid #ffffff",
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

            {/* Photo Upload Icon */}
            <label
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "#2563eb",
                border: "2px solid #ffffff",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
              title="Upload Avatar"
            >
              <MdCameraAlt size={14} />
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoUpload}
              />
            </label>
          </div>

          {/* Online Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#dcfce7",
              color: "#15803d",
              padding: "4px 12px",
              borderRadius: "16px",
              fontSize: "12px",
              fontWeight: "700",
            }}
          >
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: "#22c55e",
              }}
            />
            <span>{t.online}</span>
          </div>

          {/* Rider Name & Code */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "900",
                color: "#0f172a",
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              {displayName}
            </h2>

            <span
              style={{
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                padding: "2px 10px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "800",
                fontFamily: "monospace",
                letterSpacing: "0.5px",
              }}
            >
              {riderCode}
            </span>
          </div>
        </div>

        {/* 3. Screen 10 Menu List */}
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
          {/* Item 1: Personal Information */}
          <div
            onClick={() => setShowProfileDetailModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
              transition: "background 0.15s",
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
                <MdPerson size={22} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                {t.myProfile}
              </span>
            </div>

            <MdChevronRight size={22} color="#94a3b8" />
          </div>

          {/* Item 2: Language Switcher */}
          <div
            onClick={() => setShowLanguageModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
              transition: "background 0.15s",
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

          {/* Item 3: Change Password */}
          <div
            onClick={() => setShowPasswordModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
              transition: "background 0.15s",
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
                {t.security}
              </span>
            </div>

            <MdChevronRight size={22} color="#94a3b8" />
          </div>

          {/* Item 4: Log Out (Red Option) */}
          <div
            onClick={() => setShowLogoutModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              cursor: "pointer",
              transition: "background 0.15s",
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
                <MdLogout size={20} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "800", color: "#ef4444" }}>
                {t.logout}
              </span>
            </div>

            <MdChevronRight size={22} color="#fca5a5" />
          </div>
        </div>

        {/* 4. App Version Note */}
        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}>
          {t.appVersion}
        </div>
      </div>

      {/* --- MODAL 1: Personal Details Modal --- */}
      {showProfileDetailModal && (
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
                {t.myProfile}
              </h3>
              <button
                type="button"
                onClick={() => setShowProfileDetailModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <MdClose size={22} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>{t.driverId}</span>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>{riderCode}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>{t.phoneLabel}</span>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>
                  {profile?.phone || "099865327"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>{t.emailLabel}</span>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>
                  {profile?.email || "rider@e-express.com"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>{t.branchLabel}</span>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>{branchName}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setShowProfileDetailModal(false);
                  openEditProfileModal();
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  border: "1px solid #bfdbfe",
                  borderRadius: "12px",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {t.editBtn}
              </button>
              <button
                type="button"
                onClick={() => setShowProfileDetailModal(false)}
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
                }}
              >
                {t.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Language Selection Modal --- */}
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
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                {t.selectLanguage}
              </h3>
              <button
                type="button"
                onClick={() => setShowLanguageModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <MdClose size={22} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                  padding: "14px 16px",
                  borderRadius: "14px",
                  border: lang === "en" ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                  backgroundColor: lang === "en" ? "#eff6ff" : "#ffffff",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>🇬🇧</span>
                  <span style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                    English
                  </span>
                </div>
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
                  padding: "14px 16px",
                  borderRadius: "14px",
                  border: lang === "km" ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                  backgroundColor: lang === "km" ? "#eff6ff" : "#ffffff",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>🇰🇭</span>
                  <span style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                    ភាសាខ្មែរ (Khmer)
                  </span>
                </div>
                {lang === "km" && <MdCheckCircle size={20} color="#2563eb" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Change Password Modal --- */}
      {showPasswordModal && (
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
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                {t.security}
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <MdClose size={22} />
              </button>
            </div>

            {passwordError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  color: "#ef4444",
                  padding: "10px",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  marginBottom: "12px",
                  fontWeight: "600",
                }}
              >
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div
                style={{
                  backgroundColor: "#f0fdf4",
                  color: "#16a34a",
                  padding: "10px",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  marginBottom: "12px",
                  fontWeight: "700",
                }}
              >
                {passwordSuccess}
              </div>
            )}

            <form
              onSubmit={handleChangePasswordSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                  {t.currentPasswordLabel}
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    fontSize: "14px",
                    marginTop: "4px",
                    outline: "none",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                  {t.newPasswordLabel}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    fontSize: "14px",
                    marginTop: "4px",
                    outline: "none",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                  {t.confirmPasswordLabel}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    fontSize: "14px",
                    marginTop: "4px",
                    outline: "none",
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={passwordSubmitting}
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {passwordSubmitting ? t.saving : t.saveBtn}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: Edit Profile Modal --- */}
      {showEditProfileModal && (
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
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                {t.editBtn}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <MdClose size={22} />
              </button>
            </div>

            {editError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  color: "#ef4444",
                  padding: "10px",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  marginBottom: "12px",
                  fontWeight: "600",
                }}
              >
                {editError}
              </div>
            )}

            {editSuccess && (
              <div
                style={{
                  backgroundColor: "#f0fdf4",
                  color: "#16a34a",
                  padding: "10px",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  marginBottom: "12px",
                  fontWeight: "700",
                }}
              >
                {editSuccess}
              </div>
            )}

            <form
              onSubmit={handleEditProfileSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    fontSize: "14px",
                    marginTop: "4px",
                    outline: "none",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                  {t.phoneLabel}
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    fontSize: "14px",
                    marginTop: "4px",
                    outline: "none",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                  {t.emailLabel}
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    fontSize: "14px",
                    marginTop: "4px",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={editSubmitting}
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {editSubmitting ? t.saving : t.saveBtn}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 5: Log Out Confirmation Modal --- */}
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
              {t.logoutTitle}
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
                {t.cancelBtn}
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
                {t.confirmLogoutBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
