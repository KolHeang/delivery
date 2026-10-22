"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";
import { MdArrowBack, MdInventory2, MdCheckCircle, MdAddAPhoto, MdClose, MdVisibility, MdDescription } from "react-icons/md";
import { useLanguage } from "@/lib/LanguageContext";

export default function MerchantCreatePickupPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [profile, setProfile] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [form, setForm] = useState({
    declaredQuantity: "",
    pickupAddress: "",
    pickupTime: "",
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/merchant/login");
      return;
    }
    api
      .get("/mobile/merchant/profile")
      .then(async (res) => {
        setProfile(res.data);
        if (res.data?.address) {
          setForm((f) => ({ ...f, pickupAddress: res.data.address }));
        }
        if (res.data?.id) {
          try {
            const bRes = await api.get(`/merchants/${res.data.id}/branches`);
            const bList = Array.isArray(bRes.data) ? bRes.data : (bRes.data?.data || []);
            setBranches(bList);
            const def = bList.find((b: any) => b.isDefault);
            if (def) {
              setSelectedBranchId(def.id.toString());
              if (def.address) setForm((f) => ({ ...f, pickupAddress: def.address }));
            }
          } catch {}
        }
      })
      .catch(() => {});

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const iso = tomorrow.toISOString().slice(0, 16);
    setForm((f) => ({ ...f, pickupTime: iso }));
  }, [router]);

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    const b = branches.find((item: any) => item.id.toString() === branchId);
    if (b && b.address) {
      setForm((f) => ({ ...f, pickupAddress: b.address }));
    } else if (profile?.address) {
      setForm((f) => ({ ...f, pickupAddress: profile.address }));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const qty = parseInt(form.declaredQuantity);
    if (isNaN(qty) || qty < 1) {
      newErrors.declaredQuantity = lang === 'km' ? 'សូមបញ្ចូលចំនួនកញ្ចប់អីវ៉ាន់យ៉ាងតិច ១' : 'Please enter a valid quantity (min 1)';
    }
    if (!form.pickupTime) {
      newErrors.pickupTime = lang === 'km' ? 'សូមជ្រើសរើសពេលវេលាទៅទទួល' : 'Please select a pickup time';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setError("");

    setSubmitting(true);
    try {
      await api.post("/mobile/merchant/pickup-requests", {
        declaredQuantity: qty,
        branchId: selectedBranchId ? parseInt(selectedBranchId) : undefined,
        pickupAddress: form.pickupAddress.trim() || undefined,
        pickupTime: new Date(form.pickupTime).toISOString(),
        photo: photos.length > 0 ? photos[0] : undefined,
        photos: photos.length > 0 ? photos : undefined,
        note: note.trim() || undefined,
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

          <form noValidate onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
                onChange={(e) => {
                  setForm((f) => ({ ...f, declaredQuantity: e.target.value }));
                  if (errors.declaredQuantity) setErrors((prev) => ({ ...prev, declaredQuantity: "" }));
                }}
                placeholder="ឧ. 10"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: `2px solid ${errors.declaredQuantity ? "#dc2626" : "#e2e8f0"}`,
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
                onBlur={(e) => (e.currentTarget.style.borderColor = errors.declaredQuantity ? "#dc2626" : "#e2e8f0")}
              />
              {errors.declaredQuantity && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4, fontWeight: 600, textAlign: "center" }}>
                  {errors.declaredQuantity}
                </div>
              )}
            </div>

            {/* Branch Selector if merchant has branches */}
            {branches.length > 0 && (
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
                  🏢 សាខាដែលត្រូវទៅយក (Pickup Branch)
                </label>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                  ជ្រើសរើសសាខាហាងរបស់អ្នកដែលត្រូវឱ្យអ្នកដឹកជញ្ជូនទៅទទួល
                </div>
                <select
                  value={selectedBranchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1.5px solid #86efac",
                    borderRadius: 12,
                    fontSize: 13.5,
                    fontWeight: 600,
                    outline: "none",
                    boxSizing: "border-box",
                    color: "#065f46",
                    background: "#f0fdf4",
                    fontFamily: "inherit",
                  }}
                >
                  <option value="">-- ទីស្នាក់ការកណ្តាល (HQ) --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.code ? `[${b.code}]` : ""} {b.isDefault ? "⭐ (ដើម)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                onChange={(e) => {
                  setForm((f) => ({ ...f, pickupTime: e.target.value }));
                  if (errors.pickupTime) setErrors((prev) => ({ ...prev, pickupTime: "" }));
                }}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: `1.5px solid ${errors.pickupTime ? "#dc2626" : "#e2e8f0"}`,
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
                onBlur={(e) => (e.currentTarget.style.borderColor = errors.pickupTime ? "#dc2626" : "#e2e8f0")}
              />
              {errors.pickupTime && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                  {errors.pickupTime}
                </div>
              )}
            </div>

            {/* Package / Goods Photo Upload */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label
                  style={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <MdAddAPhoto size={17} color="#7e22ce" /> រូបថតទំនិញ / កញ្ចប់ (Package Photos)
                </label>
                <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 600 }}>
                  (មិនបង្ខំ / Optional)
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
                ថតរូប ឬ ភ្ជាប់រូបថតទំនិញជាក់ស្តែង ដើម្បីឱ្យអ្នកដឹកជញ្ជូនងាយស្រួលចំណាំ និងផ្ទៀងផ្ទាត់
              </div>

              {/* Upload Action Button */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "13px 16px",
                  borderRadius: 14,
                  border: "2px dashed #c084fc",
                  background: "#faf5ff",
                  color: "#6b21a8",
                  fontWeight: 800,
                  fontSize: 13.5,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  marginBottom: photos.length > 0 ? 12 : 0,
                }}
              >
                <MdAddAPhoto size={20} color="#7e22ce" />
                <span>{photos.length > 0 ? "បន្ថែមរូបថតទៀត" : "ថតរូប ឬ ជ្រើសរើសរូបថតទំនិញ"}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
              </label>

              {/* Photo Preview Thumbnails */}
              {photos.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  {photos.map((src, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        aspectRatio: "1",
                        borderRadius: 12,
                        overflow: "hidden",
                        border: idx === 0 ? "2.5px solid #7e22ce" : "1.5px solid #e2e8f0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        background: "#000",
                        cursor: "pointer",
                      }}
                      onClick={() => setPreviewModalImg(src)}
                    >
                      <img
                        src={src}
                        alt={`Goods ${idx + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      {idx === 0 && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: "rgba(88,28,135,0.9)",
                            color: "#fff",
                            fontSize: 9.5,
                            fontWeight: 800,
                            textAlign: "center",
                            padding: "2px 0",
                          }}
                        >
                          រូបមេ
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(idx);
                        }}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.65)",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="លុបរូបភាព"
                      >
                        <MdClose size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Note / Instruction */}
            <div>
              <label
                style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: "#1e293b",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <MdDescription size={16} color="#7e22ce" /> ចំណាំបន្ថែម (Note)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ឧ. អីវ៉ាន់កែវប្រយ័ត្នបែក, ទុកនៅជាន់ផ្ទាល់ដី, ទាក់ទងអ្នកគ្រប់គ្រង..."
                rows={2}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 13,
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
              1. ហាងបង្កើតសំណើនេះដោយបញ្ជាក់ចំនួនកញ្ចប់ និងអាចភ្ជាប់រូបភាពទំនិញ។
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

      {/* Lightbox / Zoom Modal */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "85vh",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewModalImg}
              alt="Enlarged"
              style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain", display: "block" }}
            />
            <button
              onClick={() => setPreviewModalImg(null)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MdClose size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
