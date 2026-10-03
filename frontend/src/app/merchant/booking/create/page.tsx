"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import api from "@/lib/api";
import {
  MdArrowBack,
  MdAdd,
  MdRemove,
  MdCameraAlt,
  MdPhotoLibrary,
  MdLocationOn,
  MdStore,
  MdCheckCircle,
  MdInventory2,
  MdDone,
  MdHome,
  MdLocalShipping,
} from "react-icons/md";

export default function CreateBookingWizardPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [packageCount, setPackageCount] = useState(3);
  const [packagePhoto, setPackagePhoto] = useState<string | null>(null);
  const [useStoreLocation, setUseStoreLocation] = useState(true);
  const [customAddress, setCustomAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    bookingId: string;
    tags: string[];
  } | null>(null);

  // Recipient info
  const [recipientName, setRecipientName] = useState("Sokha Chan");
  const [recipientPhone, setRecipientPhone] = useState("012 345 678");
  const [deliveryAddress, setDeliveryAddress] = useState("#12, St. 271, Boeng Tumpun, Phnom Penh");
  const [codAmount, setCodAmount] = useState("28.00");
  const [notes, setNotes] = useState("Call customer before arrival");

  const t = {
    title: lang === "km" ? "បង្កើតការផ្ញើទំនិញ" : "Create Booking",
    step1Title: lang === "km" ? "ព័ត៌មានកញ្ចប់អីវ៉ាន់" : "Package Details",
    step2Title: lang === "km" ? "ទីតាំងទៅយកទំនិញ" : "Pickup Location",
    step3Title: lang === "km" ? "ត្រួតពិនិត្យការកក់" : "Review Booking",
    step4Title: lang === "km" ? "កក់ជោគជ័យ" : "Booking Success",
    howManyPackages: lang === "km" ? "តើមានចំនួនប៉ុន្មានកញ្ចប់?" : "How many packages?",
    packagePhoto: lang === "km" ? "រូបភាពកញ្ចប់ (មិនតម្រូវ)" : "Package Photo (Optional)",
    takePhoto: lang === "km" ? "ថតរូប" : "Take Photo",
    fromGallery: lang === "km" ? "ជ្រើសពីរូបភាព" : "From Gallery",
    useStoreLocation: lang === "km" ? "ប្រើប្រាស់ទីតាំងហាងរបស់ខ្ញុំ" : "Use My Store Location",
    customLocation: lang === "km" ? "ជ្រើសរើសទីតាំងផ្សេង" : "Custom Location",
    storeName: "Little Girl Studio",
    storeAddress: "#45, St. 310, BKK3, Phnom Penh",
    nextBtn: lang === "km" ? "បន្តទៅមុខ" : "Next",
    confirmBtn: lang === "km" ? "បញ្ជាក់ការកក់" : "Confirm Booking",
    successHeading: lang === "km" ? "ការកក់ទទួលបានជោគជ័យ!" : "Booking Created Successfully!",
    successSub:
      lang === "km"
        ? "ការកក់របស់អ្នកត្រូវបានបង្កើត។ អ្នកដឹកជញ្ជូននឹងមកយកក្នុងពេលឆាប់ៗ។"
        : "Your booking has been created and a rider will be assigned soon.",
    bookingIdLabel: lang === "km" ? "លេខកូដកក់" : "Booking ID",
    viewDetailBtn: lang === "km" ? "មើលព័ត៌មានលម្អិត" : "View Booking Detail",
    createAnotherBtn: lang === "km" ? "បង្កើតការកក់ថ្មីទៀត" : "Create Another Booking",
    backHomeBtn: lang === "km" ? "ត្រឡប់ទៅទំព័រដើម" : "Back to Home",
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPackagePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmBooking = async () => {
    setSubmitting(true);
    try {
      const generatedBookingId = `BK${new Date().getFullYear()}${String(
        Math.floor(100000 + Math.random() * 900000)
      )}`;
      const generatedTags = Array.from({ length: packageCount }, (_, i) => `EX${10230 + i}`);

      // Attempt to save to backend API
      await api
        .post("/mobile/merchant/parcels", {
          recipientName,
          recipientPhone,
          recipientAddress: deliveryAddress,
          codAmount: Number(codAmount) || 0,
          note: notes,
          packageCount,
        })
        .catch(() => null);

      setBookingResult({
        bookingId: generatedBookingId,
        tags: generatedTags,
      });
      setStep(4);
    } catch (err) {
      console.error("Booking error", err);
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
        fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, sans-serif",
        paddingBottom: "88px",
      }}
    >
      {/* 1. Header Bar */}
      {step !== 4 && (
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => (step > 1 ? setStep((step - 1) as any) : router.back())}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                padding: 0,
              }}
            >
              <MdArrowBack size={24} />
            </button>
            <h1
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: "800",
                color: "#0f172a",
              }}
            >
              {t.title}
            </h1>
          </div>

          <span style={{ fontSize: "12px", fontWeight: "700", color: "#2563eb" }}>
            Step {step} of 3
          </span>
        </div>
      )}

      {/* 2. STEP 1 / SCREEN 09: PACKAGE DETAILS */}
      {step === 1 && (
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* How many packages counter */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "24px 20px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <span style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
              {t.howManyPackages}
            </span>

            {/* Counter [-] 3 [+] */}
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <button
                type="button"
                onClick={() => setPackageCount(Math.max(1, packageCount - 1))}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  border: "1.5px solid #bfdbfe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <MdRemove size={24} />
              </button>

              <span
                style={{
                  fontSize: "36px",
                  fontWeight: "900",
                  color: "#0f172a",
                  minWidth: "40px",
                  textAlign: "center",
                }}
              >
                {packageCount}
              </span>

              <button
                type="button"
                onClick={() => setPackageCount(packageCount + 1)}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                }}
              >
                <MdAdd size={24} />
              </button>
            </div>
          </div>

          {/* Package Photo Upload Box (Screen 09/10 Match) */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "20px",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
              {t.packagePhoto}
            </span>

            {packagePhoto ? (
              <div
                style={{
                  width: "100%",
                  height: "160px",
                  borderRadius: "14px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <img
                  src={packagePhoto}
                  alt="Package"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  type="button"
                  onClick={() => setPackagePhoto(null)}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "50%",
                    width: "28px",
                    height: "28px",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "20px 12px",
                    borderRadius: "14px",
                    backgroundColor: "#f8fafc",
                    border: "1.5px dashed #cbd5e1",
                    color: "#2563eb",
                    cursor: "pointer",
                  }}
                >
                  <MdCameraAlt size={26} />
                  <span style={{ fontSize: "12.5px", fontWeight: "700" }}>{t.takePhoto}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={handlePhotoUpload}
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "20px 12px",
                    borderRadius: "14px",
                    backgroundColor: "#f8fafc",
                    border: "1.5px dashed #cbd5e1",
                    color: "#2563eb",
                    cursor: "pointer",
                  }}
                >
                  <MdPhotoLibrary size={26} />
                  <span style={{ fontSize: "12.5px", fontWeight: "700" }}>{t.fromGallery}</span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handlePhotoUpload}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Receiver Info */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "20px",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
              Customer Details
            </span>

            <div>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                Recipient Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1.5px solid #e2e8f0",
                  marginTop: "4px",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                Recipient Phone
              </label>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1.5px solid #e2e8f0",
                  marginTop: "4px",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                Delivery Address
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1.5px solid #e2e8f0",
                  marginTop: "4px",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                  COD Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={codAmount}
                  onChange={(e) => setCodAmount(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    marginTop: "4px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                  Delivery Fee ($)
                </label>
                <input
                  type="text"
                  readOnly
                  value="$1.50"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    marginTop: "4px",
                    fontSize: "14px",
                    backgroundColor: "#f8fafc",
                    color: "#64748b",
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
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
              boxShadow: "0 6px 18px rgba(37, 99, 235, 0.25)",
            }}
          >
            {t.nextBtn}
          </button>
        </div>
      )}

      {/* 3. STEP 2 / SCREEN 10: PICKUP LOCATION */}
      {step === 2 && (
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Pickup Option Radio Pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              onClick={() => setUseStoreLocation(true)}
              style={{
                backgroundColor: useStoreLocation ? "#eff6ff" : "#ffffff",
                border: useStoreLocation ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdStore size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
                    {t.useStoreLocation}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    {t.storeAddress}
                  </div>
                </div>
              </div>

              {useStoreLocation && <MdCheckCircle size={22} color="#2563eb" />}
            </div>

            <div
              onClick={() => setUseStoreLocation(false)}
              style={{
                backgroundColor: !useStoreLocation ? "#eff6ff" : "#ffffff",
                border: !useStoreLocation ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                  <MdLocationOn size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
                    {t.customLocation}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    Enter another pickup point
                  </div>
                </div>
              </div>

              {!useStoreLocation && <MdCheckCircle size={22} color="#2563eb" />}
            </div>
          </div>

          {!useStoreLocation && (
            <div>
              <input
                type="text"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="Enter custom pickup address..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1.5px solid #e2e8f0",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* Interactive Map Graphic (Screen 10 Match) */}
          <div
            style={{
              width: "100%",
              height: "220px",
              borderRadius: "20px",
              backgroundColor: "#e2e8f0",
              overflow: "hidden",
              position: "relative",
              border: "1px solid #cbd5e1",
              backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
              backgroundSize: "16px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
                }}
              >
                📍
              </div>
              <div
                style={{
                  backgroundColor: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "800",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  marginTop: "4px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                }}
              >
                {t.storeAddress}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
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
              boxShadow: "0 6px 18px rgba(37, 99, 235, 0.25)",
            }}
          >
            {t.nextBtn}
          </button>
        </div>
      )}

      {/* 4. STEP 3 / SCREEN 11: REVIEW BOOKING */}
      {step === 3 && (
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "20px",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Packages Highlight */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "14px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdInventory2 size={26} />
              </div>
              <div>
                <div style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a" }}>
                  {packageCount} Packages
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                  Estimated Pickup: Today (within 1 hour)
                </div>
              </div>
            </div>

            {/* Pickup Location */}
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                Pickup Location
              </div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
                {t.storeName}
              </div>
              <div style={{ fontSize: "12.5px", color: "#475569", marginTop: "1px" }}>
                {t.storeAddress}
              </div>
            </div>

            {/* Delivery Recipient */}
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                Recipient Details
              </div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
                {recipientName} • {recipientPhone}
              </div>
              <div style={{ fontSize: "12.5px", color: "#475569", marginTop: "1px" }}>
                {deliveryAddress}
              </div>
            </div>

            {/* Financial Summary */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "13.5px", fontWeight: "700", color: "#475569" }}>
                Total Estimated Fee
              </span>
              <span style={{ fontSize: "18px", fontWeight: "900", color: "#2563eb" }}>
                ${(packageCount * 1.5).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirmBooking}
            style={{
              width: "100%",
              padding: "16px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "16px",
              fontSize: "16px",
              fontWeight: "900",
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(37, 99, 235, 0.3)",
            }}
          >
            {submitting ? "Creating Booking..." : t.confirmBtn}
          </button>
        </div>
      )}

      {/* 5. STEP 4 / SCREEN 12: BOOKING SUCCESS */}
      {step === 4 && (
        <div
          style={{
            padding: "40px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "20px",
          }}
        >
          {/* Green check celebration box graphic */}
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              backgroundColor: "#dcfce7",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 25px rgba(22, 163, 74, 0.2)",
            }}
          >
            <MdCheckCircle size={60} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: "900",
                color: "#0f172a",
                letterSpacing: "-0.3px",
              }}
            >
              {t.successHeading}
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "13.5px",
                color: "#64748b",
                lineHeight: "1.5",
                maxWidth: "300px",
              }}
            >
              {t.successSub}
            </p>
          </div>

          {/* Booking ID Card + Tag Pills */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "20px",
              width: "100%",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
              {t.bookingIdLabel}
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "900",
                color: "#2563eb",
                fontFamily: "monospace",
              }}
            >
              #{bookingResult?.bookingId || "BK2024090001"}
            </div>

            {/* Generated Parcel Tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
              {(bookingResult?.tags || ["EX123", "EX124", "EX125"]).map((tag) => (
                <span
                  key={tag}
                  style={{
                    backgroundColor: "#eff6ff",
                    color: "#1d4ed8",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "800",
                    fontFamily: "monospace",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <button
              type="button"
              onClick={() => router.push("/merchant/orders")}
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
              }}
            >
              {t.viewDetailBtn}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setBookingResult(null);
              }}
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                border: "1.5px solid #bfdbfe",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              {t.createAnotherBtn}
            </button>

            <button
              type="button"
              onClick={() => router.push("/merchant/dashboard")}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "transparent",
                color: "#64748b",
                border: "none",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              {t.backHomeBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
