"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, clearAuth } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import DriverHeader from "@/components/driver/DriverHeader";
import {
  MdPerson,
  MdLock,
  MdTranslate,
  MdLogout,
  MdChevronRight,
  MdCameraAlt,
  MdClose,
  MdLocalShipping,
  MdCheckCircle,
  MdStar,
  MdPhone,
  MdLocationOn,
  MdVerified,
} from "react-icons/md";

const profileTranslations = {
  en: {
    loading: "Loading profile...",
    driverId: "Driver ID",
    driverRole: "Delivery Driver",
    deliveredStat: "Delivered",
    successStat: "Success Rate",
    ratingStat: "Rating",
    myProfile: "Personal Information",
    security: "Change Password",
    language: "App Language",
    logout: "Log Out Account",
    phoneLabel: "Phone Number",
    emailLabel: "Email Address",
    salaryLabel: "Base Salary",
    perMonth: "/ month",
    genderLabel: "Gender",
    genderMale: "Male",
    genderFemale: "Female",
    joinDateLabel: "Join Date",
    dobLabel: "Date of Birth",
    closeBtn: "Close",
    editBtn: "Edit Profile",
    saveBtn: "Save Changes",
    currentPasswordLabel: "Current Password",
    newPasswordLabel: "New Password",
    confirmPasswordLabel: "Confirm Password",
    passwordChangedSuccess: "Password changed successfully",
    profileUpdatedSuccess: "Profile updated successfully",
  },
  km: {
    loading: "កំពុងផ្ទុកព័ត៌មាន...",
    driverId: "អត្តលេខ",
    driverRole: "អ្នកដឹកជញ្ជូន",
    deliveredStat: "ដឹកជោគជ័យ",
    successStat: "អត្រាជោគជ័យ",
    ratingStat: "ការវាយតម្លៃ",
    myProfile: "ព័ត៌មានផ្ទាល់ខ្លួន",
    security: "ផ្លាស់ប្តូរលេខសម្ងាត់",
    language: "ភាសាកម្មវិធី",
    logout: "ចាកចេញពីគណនី",
    phoneLabel: "លេខទូរស័ព្ទ",
    emailLabel: "អ៊ីមែល",
    salaryLabel: "ប្រាក់បៀវត្សរ៍មូលដ្ឋាន",
    perMonth: "/ ខែ",
    genderLabel: "ភេទ",
    genderMale: "ប្រុស (Male)",
    genderFemale: "ស្រី (Female)",
    joinDateLabel: "ថ្ងៃចូលធ្វើការ",
    dobLabel: "ថ្ងៃខែឆ្នាំកំណើត",
    closeBtn: "បិទ",
    editBtn: "កែប្រែព័ត៌មាន",
    saveBtn: "រក្សាទុកការផ្លាស់ប្តូរ",
    currentPasswordLabel: "លេខសម្ងាត់ចាស់",
    newPasswordLabel: "លេខសម្ងាត់ថ្មី",
    confirmPasswordLabel: "ផ្ទៀងផ្ទាត់លេខសម្ងាត់ថ្មី",
    passwordChangedSuccess: "ប្តូរលេខសម្ងាត់ជោគជ័យ",
    profileUpdatedSuccess: "បច្ចុប្បន្នភាពព័ត៌មានជោគជ័យ",
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
  const [editNameKh, setEditNameKh] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editGender, setEditGender] = useState("male");
  const [editDob, setEditDob] = useState("");
  const [editJoinDate, setEditJoinDate] = useState("");
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

  const openEditProfileModal = () => {
    setEditName(profile?.name || "");
    setEditNameKh(profile?.nameKh || "");
    setEditPhone(profile?.phone || "");
    setEditEmail(profile?.email || "");
    setEditGender(profile?.gender || "male");
    setEditDob(profile?.dob || "");
    setEditJoinDate(profile?.joinDate || "");
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
        nameKh: editNameKh,
        phone: editPhone,
        email: editEmail,
        gender: editGender,
        dob: editDob,
        joinDate: editJoinDate,
      });
      setProfile(res.data);
      setEditSuccess(t.profileUpdatedSuccess);
      setTimeout(() => {
        setShowEditProfileModal(false);
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
    loadProfile();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/driver/login");
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

  const capitalizeWords = (str: string) => {
    if (!str) return "";
    return str
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const displayName =
    lang === "km" && profile?.nameKh ? profile.nameKh : capitalizeWords(profile?.name || "Mon E");

  const branchName =
    profile?.zone?.name || (lang === "km" ? "ប៉េងហួតបឹងស្នោ" : "Peng Huoth Boeng Snor");

  const phoneOrId = profile?.phone || "099865327";

  const formattedSalary =
    profile?.salary != null && Number(profile.salary) > 0
      ? `$${(Number(profile.salary) || 0).toFixed(2)}`
      : "$300.00";

  const genderText = profile?.gender === "female" ? t.genderFemale : t.genderMale;
  const totalDeliveries = profile?.totalDeliveries || 158;
  const ratingScore = profile?.rating ? Number(profile.rating).toFixed(1) : "5.0";

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString(lang === "km" ? "km-KH" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

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
      {/* 1. Global Driver Header (Consistent Across All Tabs) */}
      <DriverHeader driverName={displayName} branchName={branchName} phoneOrCode={phoneOrId} />

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* 2. Digital Driver ID Card (Option 1: Modern & Balanced) */}
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
          {/* Subtle Background Watermark Layer */}
          <div
            style={{
              position: "absolute",
              top: "-20px",
              right: "-20px",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 70%)",
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
                  border: "2.5px solid #ffffff",
                }}
              >
                {profile?.photo ? (
                  <img
                    src={
                      profile.photo.startsWith("http") || profile.photo.startsWith("data:")
                        ? profile.photo
                        : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}/uploads/${profile.photo}`
                    }
                    alt={profile.name}
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
                <MdVerified size={18} color="#34d399" style={{ flexShrink: 0 }} />
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
                  color: "#f3e8ff",
                  backdropFilter: "blur(4px)",
                }}
              >
                <span>ID: DRV-{String(profile?.id || "007").padStart(3, "0")}</span>
                <span>•</span>
                <span>{t.driverRole}</span>
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

          {/* Performance Summary 3-Stat Strip */}
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
                <MdLocalShipping size={16} color="#e9d5ff" />
                <span>{totalDeliveries}</span>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#d8b4fe",
                  fontWeight: "600",
                  marginTop: "2px",
                }}
              >
                {t.deliveredStat}
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
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                }}
              >
                <MdCheckCircle size={16} color="#34d399" />
                <span>99.2%</span>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#d8b4fe",
                  fontWeight: "600",
                  marginTop: "2px",
                }}
              >
                {t.successStat}
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
          {/* Row 1: Personal Profile */}
          <div
            onClick={() => setShowProfileDetailModal(true)}
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
                  backgroundColor: "#ecfdf5",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MdPerson size={22} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>
                {t.myProfile}
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
              <span style={{ fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>
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
                  backgroundColor: "#ccfbf1",
                  color: "#0d9488",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MdTranslate size={20} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>
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
                  color: lang === "km" ? "#ffffff" : "#64748b",
                  padding: "4px 12px",
                  fontSize: "11px",
                  fontWeight: "700",
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
                  color: lang === "en" ? "#ffffff" : "#64748b",
                  padding: "4px 12px",
                  fontSize: "11px",
                  fontWeight: "700",
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
            boxShadow: "0 2px 8px rgba(239, 68, 68, 0.03)",
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
            <span style={{ fontSize: "15px", fontWeight: "700", color: "#dc2626" }}>
              {t.logout}
            </span>
          </div>

          <MdChevronRight size={22} color="#fca5a5" />
        </button>
      </div>

      {/* --- MODAL 1: Personal Profile Details --- */}
      {showProfileDetailModal && (
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
              maxWidth: "370px",
              padding: "22px",
              boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.2)",
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
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                {t.myProfile}
              </h3>
              <button
                onClick={() => setShowProfileDetailModal(false)}
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: "#f1f5f9",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <MdClose size={18} color="#64748b" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div
                style={{ padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "12px" }}
              >
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                  {lang === "km" ? "ឈ្មោះអ្នកដឹកជញ្ជូន" : "Full Name"}
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
                style={{ padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "12px" }}
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
                  }}
                >
                  {profile?.phone || phoneOrId}
                </div>
              </div>

              <div
                style={{ padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "12px" }}
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
                  }}
                >
                  {profile?.email || "mon.e@gmail.com"}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div
                  style={{ padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "12px" }}
                >
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                    {t.genderLabel}
                  </div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "800",
                      color: "#0f172a",
                      marginTop: "2px",
                    }}
                  >
                    {genderText}
                  </div>
                </div>

                <div
                  style={{ padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "12px" }}
                >
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                    {t.salaryLabel}
                  </div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "800",
                      color: "#16a34a",
                      marginTop: "2px",
                    }}
                  >
                    {formattedSalary}
                  </div>
                </div>
              </div>

              <div
                style={{ padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "12px" }}
              >
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                  {t.joinDateLabel}
                </div>
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: "800",
                    color: "#0f172a",
                    marginTop: "2px",
                  }}
                >
                  {profile?.joinDate ? formatDate(profile.joinDate) : "—"}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowProfileDetailModal(false);
                openEditProfileModal();
              }}
              style={{
                marginTop: "16px",
                width: "100%",
                background: "#581c87",
                color: "#ffffff",
                border: "none",
                borderRadius: "14px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              {t.editBtn}
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Password Change Modal --- */}
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
              maxWidth: "370px",
              padding: "22px",
              boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.2)",
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
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                {t.security}
              </h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError("");
                  setPasswordSuccess("");
                }}
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: "#f1f5f9",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <MdClose size={18} color="#64748b" />
              </button>
            </div>

            {passwordError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  borderRadius: "12px",
                  padding: "10px",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginBottom: "12px",
                }}
              >
                ⚠️ {passwordError}
              </div>

            {passwordSuccess && (
              <div
                style={{
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#16a34a",
                  borderRadius: "12px",
                  padding: "10px",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginBottom: "12px",
                }}
              >
                ✅ {passwordSuccess}
              </div>
            )}

            <form
              onSubmit={handleChangePasswordSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "11px" }}
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
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
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
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
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
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    backgroundColor: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

              <button
                type="submit"
                disabled={passwordSubmitting}
                style={{
                  marginTop: "6px",
                  width: "100%",
                  background: "#581c87",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "12px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: passwordSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {passwordSubmitting ? "..." : t.saveBtn}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Edit Profile Modal --- */}
      {showEditProfileModal && (
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
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "22px",
              boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.2)",
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
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                {t.editBtn}
              </h3>
              <button
                onClick={() => setShowEditProfileModal(false)}
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: "#f1f5f9",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <MdClose size={18} color="#64748b" />
              </button>
            </div>

            {editError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  borderRadius: "12px",
                  padding: "10px",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginBottom: "12px",
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
                  padding: "10px",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginBottom: "12px",
                }}
              >
                ✅ {editSuccess}
              </div>
            )}

            <form
              onSubmit={handleEditProfileSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "11px" }}
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
                  {lang === "km" ? "ឈ្មោះអ្នកដឹក (English)" : "Driver Name"}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Sok Dara"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
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
                  {lang === "km" ? "ឈ្មោះជាភាសាខ្មែរ" : "Khmer Name"}
                </label>
                <input
                  type="text"
                  value={editNameKh}
                  onChange={(e) => setEditNameKh(e.target.value)}
                  placeholder="e.g. សុខ តារា"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
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
                  placeholder="e.g. 012345678"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
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
                  placeholder="e.g. driver@gmail.com"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13.5px",
                    outline: "none",
                    backgroundColor: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
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
                    {t.genderLabel}
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "12px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "13.5px",
                      outline: "none",
                      backgroundColor: "#f8fafc",
                      boxSizing: "border-box",
                      fontWeight: "600",
                    }}
                  >
                    <option value="male">{t.genderMale}</option>
                    <option value="female">{t.genderFemale}</option>
                  </select>
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
                    {t.dobLabel}
                  </label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "12px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "13px",
                      outline: "none",
                      backgroundColor: "#f8fafc",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
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
                  {t.joinDateLabel}
                </label>
                <input
                  type="date"
                  value={editJoinDate}
                  onChange={(e) => setEditJoinDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13px",
                    outline: "none",
                    backgroundColor: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                />
              </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {t.closeBtn || 'បោះបង់'}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
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
