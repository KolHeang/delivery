"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import api from "@/lib/api";
import DriverHeader from "@/components/driver/DriverHeader";
import {
  MdQrCodeScanner,
  MdFlashOn,
  MdFlashOff,
  MdCameraswitch,
  MdCheckCircle,
  MdError,
  MdSearch,
  MdCall,
  MdDirections,
  MdLocalShipping,
  MdPerson,
  MdLocationOn,
  MdClose,
  MdRefresh,
  MdHistory,
} from "react-icons/md";

export default function DriverScanPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<any>(null);
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);

  const scannerRef = useRef<any>(null);
  const qrRegionId = "driver-qr-reader";

  // Play beep sound using Web Audio API on successful scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // audio context may not be supported or blocked
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/driver/login");
      return;
    }
    const currentUser = getUser();
    if (currentUser?.role !== "driver") {
      router.push("/driver/login");
      return;
    }
    setDriver(currentUser);

    // Fetch fresh profile
    api
      .get("/mobile/driver/profile")
      .then((res) => setDriver(res.data))
      .catch(() => {});
  }, [router]);

  // Handle looking up code via backend API
  const handleLookupCode = useCallback(async (code: string) => {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim();
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.post("/mobile/driver/scan", { code: cleanCode });
      playBeep();
      setScannedResult(res.data);
      setRecentScans((prev) => {
        const filtered = prev.filter((item) => item.parcel?.id !== res.data?.parcel?.id);
        return [res.data, ...filtered].slice(0, 5);
      });
      setManualCode("");
    } catch (err: any) {
      console.error("Scan error:", err);
      const msg = err.response?.data?.message || `រកមិនឃើញកញ្ចប់អីវ៉ាន់លេខកូដ "${cleanCode}" ទេ`;
      setErrorMessage(msg);
      setScannedResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize html5-qrcode
  useEffect(() => {
    let html5QrCode: any = null;
    let isMounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!isMounted) return;

        html5QrCode = new Html5Qrcode(qrRegionId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            // Success callback
            handleLookupCode(decodedText);
          },
          () => {
            // Frame error callback - ignore routine frames without qr
          },
        );
        if (isMounted) {
          setScanning(true);
          setCameraPermissionError(null);
        }
      } catch (err: any) {
        console.warn("Camera start error:", err);
        if (isMounted) {
          setCameraPermissionError(
            "មិនអាចបើកកាមេរ៉ាបានទេ សូមអនុញ្ញាត Camera Permission ឬបញ្ចូលលេខកូដដោយដៃ",
          );
          setScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch {}
      }
    };
  }, [handleLookupCode]);

  // Actions on parcel
  const handleClaim = async (code: string) => {
    setActionLoading(true);
    try {
      const res = await api.post("/mobile/driver/scan/claim", { code });
      alert("បានទទួលកញ្ចប់អីវ៉ាន់ជោគជ័យ!");
      setScannedResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || "បរាជ័យក្នុងការទទួលកញ្ចប់អីវ៉ាន់");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (code: string, status: string) => {
    setActionLoading(true);
    try {
      const res = await api.post("/mobile/driver/scan/update-status", { code, status });
      alert(`បានធ្វើបច្ចុប្បន្នភាពស្ថានភាព: ${status}`);
      setScannedResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || "បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាព");
    } finally {
      setActionLoading(false);
    }
  };

  const displayName = driver?.name || driver?.username || "LONG MAKARA";
  const branchName = driver?.branch?.name || driver?.branchName || "ប៉េងហួតបឹងស្នោ";
  const phoneOrId = driver?.phone || driver?.idCard || "010220529";

  const parcel = scannedResult?.parcel;
  const scanInfo = scannedResult?.scanInfo;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
      }}
    >
      {/* 1. Header */}
      <DriverHeader driverName={displayName} branchName={branchName} phoneOrCode={phoneOrId} />

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* 2. Camera Viewfinder Scanner Box */}
        <div
          style={{
            backgroundColor: "#0f172a",
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.25)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "280px",
          }}
        >
          {/* Top Title Overlay */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: 0,
              right: 0,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "700",
              backgroundColor: "rgba(15, 23, 42, 0.65)",
              padding: "6px 14px",
              margin: "0 auto",
              borderRadius: "20px",
              width: "fit-content",
              backdropFilter: "blur(4px)",
            }}
          >
            <MdQrCodeScanner size={18} color="#a855f7" />
            <span>ស្កេន QR Code ឬ Barcode កញ្ចប់អីវ៉ាន់</span>
          </div>

          {/* HTML5 QR Camera Element */}
          <div
            id={qrRegionId}
            style={{
              width: "100%",
              maxWidth: "380px",
              minHeight: "260px",
            }}
          />

          {cameraPermissionError && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(15, 23, 42, 0.92)",
                padding: "24px",
                textAlign: "center",
                color: "#ffffff",
                gap: "12px",
                zIndex: 5,
              }}
            >
              <MdQrCodeScanner size={48} color="#f59e0b" />
              <div
                style={{ fontSize: "13.5px", fontWeight: "700", color: "#fef08a", lineHeight: 1.4 }}
              >
                {cameraPermissionError}
              </div>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                អ្នកអាចបញ្ចូលលេខកូដ Tracking ដោយផ្ទាល់ក្នុងប្រអប់ខាងក្រោម
              </span>
            </div>
          )}
        </div>

        {/* 3. Manual Input Bar */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            padding: "12px 14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLookupCode(manualCode);
            }}
            placeholder="បញ្ចូលលេខ Tracking / Barcode..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "13.5px",
              fontFamily: "inherit",
              color: "#0f172a",
              fontWeight: "600",
            }}
          />

          {manualCode && (
            <button
              onClick={() => setManualCode("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                display: "flex",
              }}
            >
              <MdClose size={18} color="#94a3b8" />
            </button>
          )}

          <button
            onClick={() => handleLookupCode(manualCode)}
            disabled={loading || !manualCode.trim()}
            style={{
              backgroundColor: "#581c87",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "8px 16px",
              fontWeight: "800",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(88, 28, 135, 0.25)",
              opacity: !manualCode.trim() || loading ? 0.6 : 1,
            }}
          >
            <MdSearch size={18} />
            <span>ស្វែងរក</span>
          </button>
        </div>

        {/* 4. Error Feedback */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "16px",
              padding: "14px",
              color: "#dc2626",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <MdError size={20} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: "700" }}>{errorMessage}</span>
          </div>
        )}

        {/* 5. Scanned Parcel Result Card */}
        {parcel && (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              border: "1.5px solid #d8b4fe",
              boxShadow: "0 4px 16px rgba(88, 28, 135, 0.08)",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              animation: "fadeIn 0.25s ease",
            }}
          >
            {/* Top Row: Code & Status */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a" }}>
                  {parcel.trackingCode || `PARCEL#${parcel.id}`}
                </span>
                <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600" }}>
                  ហាង៖ {parcel.merchant?.name || "ទូទៅ"}
                </span>
              </div>

              <span
                style={{
                  backgroundColor: "#f3e8ff",
                  color: "#581c87",
                  fontSize: "12px",
                  fontWeight: "800",
                  padding: "4px 12px",
                  borderRadius: "14px",
                }}
              >
                {parcel.status}
              </span>
            </div>

            <div style={{ height: "1px", backgroundColor: "#f1f5f9" }} />

            {/* Receiver Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1e293b" }}>
                <MdPerson size={18} color="#94a3b8" />
                <span style={{ fontWeight: "800" }}>{parcel.receiverName || "ភ្ញៀវទទួល"}</span>
                <span style={{ color: "#64748b" }}>({parcel.receiverPhone || "—"})</span>
              </div>

              {parcel.receiverAddress && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    color: "#475569",
                  }}
                >
                  <MdLocationOn
                    size={18}
                    color="#f97316"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <span style={{ lineHeight: 1.4 }}>{parcel.receiverAddress}</span>
                </div>
              )}

              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                }}
              >
                <div>
                  <span style={{ color: "#64748b", fontSize: "11.5px" }}>ប្រាក់ COD៖ </span>
                  <span style={{ fontWeight: "900", color: "#0f172a" }}>
                    ${Number(parcel.cod || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11.5px" }}>ថ្លៃដឹក៖ </span>
                  <span style={{ fontWeight: "900", color: "#0f172a" }}>
                    ${Number(parcel.deliveryFee || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
              {/* If parcel is not claimed or is pending */}
              {(!parcel.driverId ||
                parcel.status === "pending" ||
                parcel.status === "in-warehouse") && (
                <button
                  onClick={() => handleClaim(parcel.trackingCode)}
                  disabled={actionLoading}
                  style={{
                    backgroundColor: "#581c87",
                    color: "#ffffff",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "none",
                    fontWeight: "800",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 2px 8px rgba(88, 28, 135, 0.25)",
                  }}
                >
                  <MdCheckCircle size={18} />
                  <span>ស្កេនទទួលយកកញ្ចប់អីវ៉ាន់ (Claim to Deliver)</span>
                </button>
              )}

              {/* If assigned to driver and ready to transit */}
              {parcel.status === "assigned" && (
                <button
                  onClick={() => handleUpdateStatus(parcel.trackingCode, "in-transit")}
                  disabled={actionLoading}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "none",
                    fontWeight: "800",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <MdLocalShipping size={18} />
                  <span>ចាប់ផ្ដើមដឹកជញ្ជូន (In-Transit)</span>
                </button>
              )}

              {/* If in-transit, allow marking as delivered */}
              {(parcel.status === "in-transit" || parcel.status === "assigned") && (
                <button
                  onClick={() => handleUpdateStatus(parcel.trackingCode, "delivered")}
                  disabled={actionLoading}
                  style={{
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "none",
                    fontWeight: "800",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <MdCheckCircle size={18} />
                  <span>ប្រគល់ជូនភ្ញៀវជោគជ័យ (Mark Delivered)</span>
                </button>
              )}

              {/* Contact Customer */}
              {parcel.receiverPhone && (
                <a
                  href={`tel:${parcel.receiverPhone}`}
                  style={{
                    backgroundColor: "#ecfdf5",
                    color: "#059669",
                    border: "1px solid #a7f3d0",
                    padding: "10px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    fontWeight: "800",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <MdCall size={18} />
                  <span>ហៅទូរស័ព្ទទៅភ្ញៀវ ({parcel.receiverPhone})</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* 6. Recent Scanned Items */}
        {recentScans.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: "800",
                color: "#581c87",
              }}
            >
              <MdHistory size={18} />
              <span>កញ្ចប់អីវ៉ាន់ដែលបានស្កេនថ្មីៗ</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentScans.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setScannedResult(item)}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    padding: "10px 14px",
                    border: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a" }}>
                      {item.parcel?.trackingCode}
                    </span>
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                      {item.parcel?.receiverName} ({item.parcel?.receiverPhone})
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "3px 8px",
                      borderRadius: "8px",
                      backgroundColor: "#f3e8ff",
                      color: "#581c87",
                    }}
                  >
                    {item.parcel?.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
