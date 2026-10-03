"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import {
  MdArrowBack,
  MdSave,
  MdPerson,
  MdPhone,
  MdLocationOn,
  MdAttachMoney,
  MdNotes,
  MdCheckCircle,
} from "react-icons/md";

const t_en = {
  title: "Create Parcel",
  subtitle: "Fill in receiver & COD details",
  sectionReceiver: "Receiver Details",
  sectionPayment: "Payment & Fee",
  sectionNote: "Special Notes",
  receiverPhone: "Receiver Phone Number",
  address: "Delivery Address",
  addressPlaceholder: "House/Street/Condo, Sangkat, Khan...",
  cod: "COD Amount (Collect on Delivery)",
  deliveryFee: "Delivery Fee ($)",
  note: "Delivery Instructions / Notes",
  notePlaceholder: "Special instructions for driver (optional)...",
  submitBtn: "Create Parcel Order",
  submitting: "Creating Order...",
  successMsg: "Parcel order created successfully!",
  errorMsg: "Failed to create parcel. Please verify all details.",
};

const t_km = {
  title: "បង្កើតការផ្ញើកញ្ចប់",
  subtitle: "បំពេញព័ត៌មានអ្នកទទួល និងថ្លៃទំនិញ COD",
  sectionReceiver: "ព័ត៌មានអ្នកទទួល",
  sectionPayment: "ការទូទាត់ និងថ្លៃដឹក",
  sectionNote: "ចំណាំ ឬការណែនាំ",
  receiverPhone: "លេខទូរស័ព្ទអ្នកទទួល",
  address: "អាសយដ្ឋានដឹកជញ្ជូន",
  addressPlaceholder: "លេខផ្ទះ ផ្លូវ សង្កាត់ ខណ្ឌ ឬចំណុចសម្គាល់...",
  cod: "ប្រាក់ COD (ប្រមូលពីអ្នកទទួល)",
  deliveryFee: "ថ្លៃដឹកជញ្ជូន ($)",
  note: "ចំណាំបន្ថែមសម្រាប់អ្នកដឹក",
  notePlaceholder: "ព័ត៌មានបន្ថែម ឬការណែនាំពិសេស (ជម្រើស)...",
  submitBtn: "រក្សាទុក និងបង្កើតការផ្ញើ",
  submitting: "កំពុងបង្កើត...",
  successMsg: "បានបង្កើតកញ្ចប់ផ្ញើដោយជោគជ័យ!",
  errorMsg: "មិនអាចបង្កើតបានទេ។ សូមពិនិត្យព័ត៌មានឡើងវិញ។",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px 12px 42px",
  borderRadius: "12px",
  border: "1.5px solid #e2e8f0",
  fontSize: "14px",
  outline: "none",
  color: "#0f172a",
  backgroundColor: "#f8fafc",
  boxSizing: "border-box",
  fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
  transition: "all 0.2s",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12.5px",
  fontWeight: "700",
  color: "#475569",
  marginBottom: "6px",
  display: "block",
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: "13.5px",
  fontWeight: "800",
  color: "#581c87",
  marginBottom: "14px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  borderBottom: "1.5px solid #f3e8ff",
  paddingBottom: "8px",
};

const iconWrapStyle: React.CSSProperties = {
  position: "absolute",
  left: "14px",
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
  display: "flex",
  alignItems: "center",
  pointerEvents: "none",
};

export default function MerchantCreateOrderPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = lang === "km" ? t_km : t_en;

  const [zones, setZones] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    zoneId: "",
    cod: "",
    codCurrency: "USD",
    deliveryFee: "",
    weight: "1",
    size: "small",
    note: "",
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/merchant/login");
      return;
    }
    const user = getUser();
    if (user?.role !== "merchant") {
      router.push("/merchant/login");
      return;
    }

    api
      .get("/mobile/merchant/profile")
      .then((res) => {
        const profile = res.data;
        setForm((prev) => ({
          ...prev,
          ...(profile?.deliveryFee ? { deliveryFee: String(parseFloat(profile.deliveryFee)) } : {}),
          ...(profile?.zoneId ? { zoneId: String(profile.zoneId) } : {}),
        }));
      })
      .catch(console.error);

    api
      .get("/mobile/merchant/zones")
      .catch(() => api.get("/zones"))
      .then((res) => {
        const active = (Array.isArray(res.data) ? res.data : []).filter(
          (z: any) => z.active !== false,
        );
        setZones(active);
        setForm((prev) => {
          if (!prev.zoneId && active.length > 0) {
            const first = active[0];
            return {
              ...prev,
              zoneId: String(first.id),
              deliveryFee: prev.deliveryFee || (first.price ? String(parseFloat(first.price)) : ""),
            };
          }
          return prev;
        });
      })
      .catch(console.error);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!form.receiverPhone.trim()) {
      newErrors.receiverPhone = lang === 'km' ? 'សូមបញ្ចូលលេខទូរស័ព្ទ' : 'Please enter phone number';
    }
    if (!form.receiverAddress.trim()) {
      newErrors.receiverAddress = lang === 'km' ? 'សូមបញ្ចូលអាសយដ្ឋានដឹកជញ្ជូន' : 'Please enter delivery address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    setError("");
    setSuccess(false);
    try {
      const resolvedZoneId = Number(form.zoneId) || (zones.length > 0 ? zones[0].id : null);

      const payload: any = {
        receiverName: form.receiverName || "-",
        receiverPhone: form.receiverPhone,
        receiverAddress: form.receiverAddress,
        cod: Number(form.cod) || 0,
        codCurrency: form.codCurrency,
        deliveryFee: Number(form.deliveryFee) || 0,
        weight: Number(form.weight) || 1,
        size: form.size || "small",
        note: form.note,
      };
      if (resolvedZoneId && resolvedZoneId > 0) {
        payload.zoneId = resolvedZoneId;
      }

      await api.post("/mobile/merchant/parcels", payload);
      setSuccess(true);
      setForm((prev) => ({
        ...prev,
        receiverName: "",
        receiverPhone: "",
        receiverAddress: "",
        zoneId: "",
        cod: "",
        codCurrency: "USD",
        deliveryFee: "",
        weight: "1",
        size: "small",
        note: "",
      }));
      setTimeout(() => router.push("/merchant/orders"), 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || t.errorMsg);
    } finally {
      setSubmitting(false);
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
        paddingBottom: "90px",
      }}
    >
      {/* Royal Purple Header with Back button */}
      <div
        style={{
          background: "linear-gradient(135deg, #3b0764 0%, #581c87 60%, #7e22ce 100%)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 20,
          boxShadow: "0 4px 16px rgba(88, 28, 135, 0.25)",
        }}
      >
        <button
          onClick={() => router.push("/merchant/orders")}
          style={{
            background: "rgba(255,255,255,0.18)",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            marginRight: "14px",
            transition: "background 0.2s",
          }}
        >
          <MdArrowBack size={22} />
        </button>
        <div>
          <h2
            style={{
              fontSize: "17px",
              fontWeight: "900",
              color: "#fff",
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            {t.title}
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.8)",
              margin: 0,
              marginTop: "2px",
            }}
          >
            {t.subtitle}
          </p>
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Success Alert */}
        {success && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1.5px solid #6ee7b7",
              color: "#065f46",
              padding: "14px 16px",
              borderRadius: "16px",
              fontSize: "13.5px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 4px 12px rgba(16,185,129,0.1)",
            }}
          >
            <MdCheckCircle size={20} color="#10b981" />
            {t.successMsg}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1.5px solid #fca5a5",
              color: "#b91c1c",
              padding: "14px 16px",
              borderRadius: "16px",
              fontSize: "13px",
              fontWeight: "600",
              boxShadow: "0 4px 12px rgba(239,68,68,0.1)",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form
          noValidate
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          {/* RECEIVER INFO */}
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "18px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 4px 16px rgba(15,23,42,0.04)",
            }}
          >
            <div style={sectionHeaderStyle}>
              <MdPerson size={18} />
              {t.sectionReceiver}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Receiver Phone */}
              <div>
                <label style={labelStyle}>
                  {t.receiverPhone} <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span style={iconWrapStyle}>
                    <MdPhone size={18} />
                  </span>
                  <input
                    type="tel"
                    placeholder={lang === "km" ? "ឧទាហរណ៍៖ 012 345 678" : "e.g. 012 345 678"}
                    value={form.receiverPhone}
                    onChange={(e) => {
                      setForm({ ...form, receiverPhone: e.target.value });
                      if (errors.receiverPhone) setErrors((prev) => ({ ...prev, receiverPhone: "" }));
                    }}
                    style={{
                      ...inputStyle,
                      borderColor: errors.receiverPhone ? "#dc2626" : "#e2e8f0",
                      boxShadow: errors.receiverPhone ? "0 0 0 3px rgba(220,38,38,0.08)" : "none",
                    }}
                    onFocus={(e) => {
                      if (!errors.receiverPhone) {
                        e.target.style.borderColor = "#7e22ce";
                        e.target.style.backgroundColor = "#fff";
                      }
                    }}
                    onBlur={(e) => {
                      if (!errors.receiverPhone) {
                        e.target.style.borderColor = "#e2e8f0";
                        e.target.style.backgroundColor = "#f8fafc";
                      }
                    }}
                  />
                </div>
                {errors.receiverPhone && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                    {errors.receiverPhone}
                  </div>
                )}
              </div>

              {/* Delivery Address */}
              <div>
                <label style={labelStyle}>
                  {t.address} <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ ...iconWrapStyle, top: "16px", transform: "none" }}>
                    <MdLocationOn size={18} />
                  </span>
                  <textarea
                    placeholder={t.addressPlaceholder}
                    value={form.receiverAddress}
                    onChange={(e) => {
                      setForm({ ...form, receiverAddress: e.target.value });
                      if (errors.receiverAddress) setErrors((prev) => ({ ...prev, receiverAddress: "" }));
                    }}
                    rows={2}
                    style={{
                      ...inputStyle,
                      paddingTop: "12px",
                      resize: "none",
                      borderColor: errors.receiverAddress ? "#dc2626" : "#e2e8f0",
                      boxShadow: errors.receiverAddress ? "0 0 0 3px rgba(220,38,38,0.08)" : "none",
                    }}
                    onFocus={(e) => {
                      if (!errors.receiverAddress) {
                        e.target.style.borderColor = "#7e22ce";
                        e.target.style.backgroundColor = "#fff";
                      }
                    }}
                    onBlur={(e) => {
                      if (!errors.receiverAddress) {
                        e.target.style.borderColor = "#e2e8f0";
                        e.target.style.backgroundColor = "#f8fafc";
                      }
                    }}
                  />
                </div>
                {errors.receiverAddress && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                    {errors.receiverAddress}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PAYMENT & FEE */}
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "18px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 4px 16px rgba(15,23,42,0.04)",
            }}
          >
            <div style={sectionHeaderStyle}>
              <MdAttachMoney size={18} />
              {t.sectionPayment}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* COD Amount + Currency */}
              <div>
                <label style={labelStyle}>{t.cod}</label>
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "10px" }}>
                  <div style={{ position: "relative" }}>
                    <span style={iconWrapStyle}>
                      <MdAttachMoney size={18} />
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={form.cod}
                      onChange={(e) => setForm({ ...form, cod: e.target.value })}
                      style={inputStyle}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#7e22ce";
                        e.target.style.backgroundColor = "#fff";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e2e8f0";
                        e.target.style.backgroundColor = "#f8fafc";
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      backgroundColor: "#f1f5f9",
                      borderRadius: "12px",
                      padding: "3px",
                      border: "1.5px solid #e2e8f0",
                    }}
                  >
                    {(["USD", "KHR"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, codCurrency: c })}
                        style={{
                          flex: 1,
                          border: "none",
                          borderRadius: "9px",
                          fontSize: "12.5px",
                          fontWeight: "800",
                          cursor: "pointer",
                          background: form.codCurrency === c ? "#581c87" : "transparent",
                          color: form.codCurrency === c ? "#ffea60" : "#64748b",
                          boxShadow:
                            form.codCurrency === c ? "0 2px 6px rgba(88,28,135,0.25)" : "none",
                          transition: "all 0.15s",
                        }}
                      >
                        {c === "USD" ? "$ USD" : "៛ KHR"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delivery Fee */}
              <div>
                <label style={labelStyle}>{t.deliveryFee}</label>
                <div style={{ position: "relative" }}>
                  <span style={iconWrapStyle}>
                    <MdAttachMoney size={18} />
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={form.deliveryFee}
                    onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#7e22ce";
                      e.target.style.backgroundColor = "#fff";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.backgroundColor = "#f8fafc";
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* NOTE */}
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "18px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 4px 16px rgba(15,23,42,0.04)",
            }}
          >
            <div style={sectionHeaderStyle}>
              <MdNotes size={18} />
              {t.sectionNote}
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ ...iconWrapStyle, top: "16px", transform: "none" }}>
                <MdNotes size={18} />
              </span>
              <textarea
                placeholder={t.notePlaceholder}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: "none", paddingTop: "12px" }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#7e22ce";
                  e.target.style.backgroundColor = "#fff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.backgroundColor = "#f8fafc";
                }}
              />
            </div>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting
                ? "#94a3b8"
                : "linear-gradient(135deg, #581c87 0%, #7e22ce 100%)",
              color: "#ffffff",
              padding: "16px",
              borderRadius: "16px",
              fontSize: "15px",
              fontWeight: "800",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: submitting ? "none" : "0 6px 20px rgba(88,28,135,0.3)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              transition: "all 0.2s",
            }}
          >
            <MdSave size={20} color="#ffea60" />
            {submitting ? t.submitting : t.submitBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
