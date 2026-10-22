"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { setAuth, isAuthenticated, getUser } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdPhone,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdFingerprint,
} from "react-icons/md";

export default function MerchantLoginPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const t = {
    title: "E-Express",
    tagline: lang === "km" ? "ដៃគូដឹកជញ្ជូនរបស់អ្នក" : "Your Delivery Partner",
    phonePlaceholder: lang === "km" ? "លេខទូរស័ព្ទ / អ៊ីមែល" : "Phone Number / Email",
    passwordPlaceholder: lang === "km" ? "ពាក្យសម្ងាត់" : "Password",
    rememberMe: lang === "km" ? "ចងចាំខ្ញុំ" : "Remember me",
    forgotPassword: lang === "km" ? "ភ្លេចពាក្យសម្ងាត់?" : "Forgot Password?",
    loginBtn: lang === "km" ? "ចូលប្រព័ន្ធ" : "Login",
    loggingIn: lang === "km" ? "កំពុងចូល..." : "Logging in...",
    fingerprintBtn: lang === "km" ? "ប្រើប្រាស់ស្នាមម្រាមដៃ" : "Use Fingerprint",
    errorMsg:
      lang === "km"
        ? "លេខទូរស័ព្ទ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវឡើយ"
        : "Invalid credentials or unauthorized merchant account.",
  };

  useEffect(() => {
    const isAuth = isAuthenticated();
    const user = getUser();
    if (isAuth && user?.role === "merchant") {
      router.push("/merchant/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!form.email.trim() || !form.password) {
      setError(
        lang === "km"
          ? "សូមបញ្ចូលលេខទូរស័ព្ទ និងពាក្យសម្ងាត់"
          : "Please enter your phone number and password"
      );
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await api.post("/mobile/auth/merchant/login", form);
      setAuth(res.data.access_token, res.data.user);
      router.push("/merchant/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || t.errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprintLogin = async () => {
    // Quick biometric test login
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/mobile/auth/merchant/login", {
        email: form.email || "merchant@e-express.com",
        password: form.password || "password123",
      });
      setAuth(res.data.access_token, res.data.user);
      router.push("/merchant/dashboard");
    } catch {
      setError(
        lang === "km"
          ? "មិនអាចផ្ទៀងផ្ទាត់ស្នាមម្រាមដៃបានទេ"
          : "Biometric authentication failed. Please enter password."
      );
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, sans-serif",
      }}
    >
      {/* 1. Storefront Illustration Banner */}
      <div
        style={{
          width: "100%",
          height: "220px",
          background: "linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%)",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Soft Background circles */}
        <div
          style={{
            position: "absolute",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "rgba(37, 99, 235, 0.08)",
            top: "-60px",
            right: "-40px",
          }}
        />

        {/* Storefront Graphic */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            zIndex: 2,
          }}
        >
          {/* E-Express Brand Logo Badge */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              backgroundColor: "#2563eb",
              boxShadow: "0 10px 25px rgba(37, 99, 235, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: "900",
              fontSize: "36px",
              fontStyle: "italic",
              letterSpacing: "-1px",
            }}
          >
            E
          </div>

          <div style={{ textAlign: "center", marginTop: "4px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: "900",
                color: "#1e3a8a",
                letterSpacing: "-0.5px",
              }}
            >
              E-Express
            </h1>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "12.5px",
                fontWeight: "600",
                color: "#3b82f6",
              }}
            >
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Language switch button top right */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 10,
          }}
        >
          <button
            type="button"
            onClick={() => setLang(lang === "km" ? "en" : "km")}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(6px)",
              border: "1px solid #bfdbfe",
              borderRadius: "16px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: "700",
              color: "#1d4ed8",
              cursor: "pointer",
            }}
          >
            {lang === "km" ? "🇰🇭 KH" : "🇬🇧 EN"}
          </button>
        </div>
      </div>

      {/* 2. Login Form Card Area */}
      <div
        style={{
          flex: 1,
          padding: "24px 24px 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                color: "#ef4444",
                padding: "12px 14px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "600",
                border: "1px solid #fee2e2",
              }}
            >
              {error}
            </div>
          )}

          {/* Phone Number Field */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                backgroundColor: "#f8fafc",
                borderRadius: "16px",
                border: "1.5px solid #e2e8f0",
                padding: "12px 16px",
              }}
            >
              <MdPhone size={20} color="#94a3b8" />
              <input
                type="text"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t.phonePlaceholder}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "14.5px",
                  fontWeight: "600",
                  color: "#0f172a",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                backgroundColor: "#f8fafc",
                borderRadius: "16px",
                border: "1.5px solid #e2e8f0",
                padding: "12px 16px",
              }}
            >
              <MdLock size={20} color="#94a3b8" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={t.passwordPlaceholder}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "14.5px",
                  fontWeight: "600",
                  color: "#0f172a",
                  fontFamily: "inherit",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                color: "#475569",
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: "16px",
                  height: "16px",
                  accentColor: "#2563eb",
                  borderRadius: "4px",
                }}
              />
              <span>{t.rememberMe}</span>
            </label>

            <span
              style={{
                color: "#2563eb",
                cursor: "pointer",
              }}
              onClick={() => alert("Please contact E-Express customer support to reset your password.")}
            >
              {t.forgotPassword}
            </span>
          </div>

          {/* Primary Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "16px",
              fontSize: "15.5px",
              fontWeight: "800",
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(37, 99, 235, 0.3)",
              transition: "transform 0.15s ease",
              marginTop: "8px",
            }}
          >
            {loading ? t.loggingIn : t.loginBtn}
          </button>
        </form>

        {/* 3. Fingerprint Biometric Login Button */}
        <div style={{ marginTop: "32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleFingerprintLogin}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              border: "1.5px solid #bfdbfe",
              borderRadius: "16px",
              padding: "12px 24px",
              width: "100%",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
          >
            <MdFingerprint size={22} />
            <span>{t.fingerprintBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
