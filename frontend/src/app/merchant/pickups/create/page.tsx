"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";
import { MdArrowBack, MdInventory2, MdCheckCircle, MdSchedule, MdLocationOn } from "react-icons/md";

export default function MerchantCreatePickupPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    declaredQuantity: "",
    pickupAddress: "",
    pickupTime: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/merchant/login");
      return;
    }
    api
      .get("/mobile/merchant/profile")
      .then((res) => {
        setProfile(res.data);
        if (res.data?.address) {
          setForm((f) => ({ ...f, pickupAddress: res.data.address }));
        }
      })
      .catch(() => {});

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const iso = tomorrow.toISOString().slice(0, 16);
    setForm((f) => ({ ...f, pickupTime: iso }));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(form.declaredQuantity);
    if (isNaN(qty) || qty < 1) {
      setError("សូមបញ្ចូលចំនួនកញ្ចប់ត្រឹមត្រូវ (យ៉ាងតិច ១)");
      return;
    }
    if (!form.pickupTime) {
      setError("សូមជ្រើសរើសម៉ោងទទួលទំនិញ");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api.post("/mobile/merchant/pickup-requests", {
        declaredQuantity: qty,
        pickupAddress: form.pickupAddress.trim() || undefined,
        pickupTime: new Date(form.pickupTime).toISOString(),
      });
      setSuccess(true);
      setTimeout(() => router.push("/merchant/pickups"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || "មិនអាចស្នើសុំបានទេ។ សូមព្យាយាមម្តងទៀត។");
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 16,
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: "#f3e8ff",
            border: "3px solid #7e22ce",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(126,34,206,0.2)",
          }}
        >
          <MdCheckCircle size={48} color="#581c87" />
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, color: "#0f172a", textAlign: "center" }}>
          បានផ្ញើសំណើដោយជោគជ័យ!
        </div>
        <div
          style={{
            fontSize: 13.5,
            color: "#64748b",
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: 300,
          }}
        >
          សំណើរបស់អ្នកត្រូវបានបញ្ជូន។ ក្រុមហ៊ុននឹងចាត់តាំងអ្នកដឹកជញ្ជូនឱ្យមកទទួលយកទំនិញឆាប់ៗនេះ។
        </div>
        <div style={{ fontSize: 12, color: "#7e22ce", fontWeight: 700, marginTop: 8 }}>
          កំពុងត្រឡប់ទៅបញ្ជីសំណើ…
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "40px",
      }}
    >
      {/* Header with Royal Purple */}
      <div
        style={{
          background: "linear-gradient(135deg, #3b0764 0%, #581c87 60%, #7e22ce 100%)",
          padding: "16px 20px 24px",
          color: "#fff",
          boxShadow: "0 4px 16px rgba(88,28,135,0.25)",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "rgba(255,255,255,0.18)",
            border: "none",
            borderRadius: 12,
            padding: "8px 12px",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <MdArrowBack size={18} /> ត្រឡប់ក្រោយ
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MdInventory2 size={26} color="#ffea60" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>ស្នើសុំអ្នកមកយកទំនិញ (Pickup)</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
              អ្នកដឹកជញ្ជូននឹងមកទទួលយកទំនិញដល់ទីតាំងហាង
            </div>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div style={{ flex: 1, padding: "0 16px", marginTop: -12 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 20,
            border: "1px solid #f1f5f9",
            boxShadow: "0 4px 20px rgba(15,23,42,0.06)",
          }}
        >
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 16px",
                borderRadius: 12,
                background: "#fee2e2",
                color: "#b91c1c",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            {/* Declared Quantity */}
            <div>
              <label
                style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: "#1e293b",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                📦 ចំនួនកញ្ចប់សរុប *
              </label>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
                តើអ្នកមានកញ្ចប់ទំនិញប៉ុន្មានដែលត្រូវប្រគល់ឱ្យអ្នកដឹកជញ្ជូន?
              </div>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={form.declaredQuantity}
                onChange={(e) => setForm((f) => ({ ...f, declaredQuantity: e.target.value }))}
                placeholder="ឧ. 10"
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 14,
                  fontSize: 22,
                  fontWeight: 900,
                  textAlign: "center",
                  outline: "none",
                  boxSizing: "border-box",
                  color: "#581c87",
                  background: "#fcfaff",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#7e22ce")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>

            {/* Pickup Address */}
            <div>
              <label
                style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: "#1e293b",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                📍 ទីតាំងមកយកទំនិញ
              </label>
              <textarea
                value={form.pickupAddress}
                onChange={(e) => setForm((f) => ({ ...f, pickupAddress: e.target.value }))}
                placeholder="អាសយដ្ឋានហាងរបស់អ្នក..."
                rows={2}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 13.5,
                  outline: "none",
                  boxSizing: "border-box",
                  color: "#0f172a",
                  background: "#f8fafc",
                  resize: "none",
                  lineHeight: 1.5,
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#7e22ce")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>

            {/* Pickup Time */}
            <div>
              <label
                style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: "#1e293b",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                🕐 ម៉ោងដែលចង់ឱ្យមកយក *
              </label>
              <input
                type="datetime-local"
                value={form.pickupTime}
                onChange={(e) => setForm((f) => ({ ...f, pickupTime: e.target.value }))}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 13.5,
                  outline: "none",
                  boxSizing: "border-box",
                  color: "#0f172a",
                  background: "#f8fafc",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#7e22ce")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>

            {/* Process Info Guide */}
            <div
              style={{
                background: "#f3e8ff",
                border: "1px solid #e9d5ff",
                borderRadius: 14,
                padding: "12px 14px",
                fontSize: 12,
                color: "#581c87",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ display: "block", marginBottom: 4 }}>ℹ️ របៀបដំណើរការ៖</strong>
              1. ហាងបង្កើតសំណើនេះដោយបញ្ជាក់ចំនួនកញ្ចប់។
              <br />
              2. ខាងក្រុមហ៊ុនចាត់តាំងអ្នកដឹកឱ្យមកទទួលយក។
              <br />
              3. អ្នកដឹកមកដល់ហាង ផ្ទៀងផ្ទាត់ និងទទួលកញ្ចប់។
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "15px",
                borderRadius: 14,
                border: "none",
                background: submitting
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #581c87 0%, #7e22ce 100%)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: submitting ? "none" : "0 6px 20px rgba(88,28,135,0.3)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <MdInventory2 size={20} color="#ffea60" />
              {submitting ? "កំពុងបញ្ជូនសំណើ..." : "បញ្ជូនសំណើសុំយកទំនិញ"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
