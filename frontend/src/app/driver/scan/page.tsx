"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import api from "@/lib/api";
import DriverHeader from "@/components/driver/DriverHeader";
import {
  MdQrCodeScanner,
  MdCheckCircle,
  MdError,
  MdSearch,
  MdCall,
  MdLocalShipping,
  MdPerson,
  MdLocationOn,
  MdClose,
  MdRefresh,
  MdHistory,
  MdLayers,
  MdPlaylistAddCheck,
  MdWarehouse,
  MdDeleteSweep,
} from "react-icons/md";

interface BatchScannedItem {
  code: string;
  parcel?: any;
  scanInfo?: any;
  status?: string;
  error?: string;
  loading?: boolean;
}

export default function DriverScanPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<any>(null);
  const [scanMode, setScanMode] = useState<"single" | "batch">("single");

  // Single scan state
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);

  // Batch scan state
  const [batchItems, setBatchItems] = useState<BatchScannedItem[]>([]);
  const [batchInputText, setBatchInputText] = useState("");
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const scannerRef = useRef<any>(null);
  const lastScannedTimeRef = useRef<{ [code: string]: number }>({});
  const qrRegionId = "driver-qr-reader";

  // Play audio beep sound
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
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

  // Single code lookup
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

  // Batch code lookup & add to queue
  const handleAddBatchCode = useCallback(async (code: string) => {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim();

    // Prevent immediate re-scan duplicates within 3 seconds
    const now = Date.now();
    if (lastScannedTimeRef.current[cleanCode] && now - lastScannedTimeRef.current[cleanCode] < 2500) {
      return;
    }
    lastScannedTimeRef.current[cleanCode] = now;

    // Check if already in batch queue
    setBatchItems((prev) => {
      const exists = prev.some((it) => it.code.toUpperCase() === cleanCode.toUpperCase());
      if (exists) {
        return prev;
      }
      return [{ code: cleanCode, loading: true }, ...prev];
    });

    playBeep();

    // Fetch detail from API
    try {
      const res = await api.post("/mobile/driver/scan", { code: cleanCode });
      setBatchItems((prev) =>
        prev.map((it) =>
          it.code.toUpperCase() === cleanCode.toUpperCase()
            ? {
                code: cleanCode,
                parcel: res.data?.parcel,
                scanInfo: res.data?.scanInfo,
                status: res.data?.parcel?.status,
                loading: false,
              }
            : it
        )
      );
    } catch (err: any) {
      setBatchItems((prev) =>
        prev.map((it) =>
          it.code.toUpperCase() === cleanCode.toUpperCase()
            ? {
                code: cleanCode,
                error: err.response?.data?.message || "រកមិនឃើញ",
                loading: false,
              }
            : it
        )
      );
    }
  }, []);

  // Manual bulk add by typing or pasting
  const handleBulkTextAdd = async () => {
    if (!batchInputText.trim()) return;
    const tokens = batchInputText
      .split(/[\s,\n]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tokens.length === 0) return;
    setBatchInputText("");

    // Use backend batch scan API for super-fast resolution
    setBatchActionLoading(true);
    setBatchMessage(null);
    try {
      const res = await api.post("/mobile/driver/scan/multiple", { codes: tokens });
      const items = res.data?.items || [];
      playBeep();

      setBatchItems((prev) => {
        const existingCodes = new Set(prev.map((it) => it.code.toUpperCase()));
        const newItems: BatchScannedItem[] = [];

        items.forEach((it: any) => {
          if (!existingCodes.has(it.code.toUpperCase())) {
            existingCodes.add(it.code.toUpperCase());
            newItems.push({
              code: it.code,
              parcel: it.parcel,
              scanInfo: it.scanInfo,
              status: it.parcel?.status,
              error: it.success ? undefined : it.error,
              loading: false,
            });
          }
        });

        return [...newItems, ...prev];
      });

      setBatchMessage({
        type: "success",
        text: `បានបញ្ចូលកូដចំនួន ${tokens.length} កញ្ចប់!`,
      });
    } catch (err: any) {
      setBatchMessage({
        type: "error",
        text: err.response?.data?.message || "បរាជ័យក្នុងការស្វែងរកកូដ",
      });
    } finally {
      setBatchActionLoading(false);
    }
  };

  // HTML5-QR Code Scanner Initialization
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
            if (scanMode === "batch") {
              handleAddBatchCode(decodedText);
            } else {
              handleLookupCode(decodedText);
            }
          },
          () => {}
        );
        if (isMounted) {
          setScanning(true);
          setCameraPermissionError(null);
        }
      } catch (err: any) {
        console.warn("Camera start error:", err);
        if (isMounted) {
          setCameraPermissionError("មិនអាចបើកកាមេរ៉ាបានទេ សូមអនុញ្ញាត Camera Permission ឬបញ្ចូលលេខកូដដោយដៃ");
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
  }, [scanMode, handleLookupCode, handleAddBatchCode]);

  // Single Actions on parcel
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

  // Batch Actions
  const handleBatchClaim = async () => {
    const validCodes = batchItems.filter((it) => it.parcel && !it.error).map((it) => it.code);
    if (validCodes.length === 0) {
      alert("មិនមានកញ្ចប់ទំនិញត្រឹមត្រូវសម្រាប់ Claim ទេ");
      return;
    }

    setBatchActionLoading(true);
    setBatchMessage(null);
    try {
      const res = await api.post("/mobile/driver/scan/multiple/claim", { codes: validCodes });
      const summary = res.data?.summary;
      playBeep();
      setBatchMessage({
        type: "success",
        text: `បាន Claim ជោគជ័យចំនួន ${summary?.claimed || validCodes.length} / ${summary?.total || validCodes.length} កញ្ចប់!`,
      });

      // Update statuses in batch list
      setBatchItems((prev) =>
        prev.map((it) => (validCodes.includes(it.code) ? { ...it, status: "assigned" } : it))
      );
    } catch (err: any) {
      setBatchMessage({
        type: "error",
        text: err.response?.data?.message || "បរាជ័យក្នុងការ Claim ជាបណ្តុំ",
      });
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchUpdateStatus = async (status: string) => {
    const validCodes = batchItems.filter((it) => it.parcel && !it.error).map((it) => it.code);
    if (validCodes.length === 0) {
      alert("មិនមានកញ្ចប់ទំនិញត្រឹមត្រូវដើម្បីកែប្រែស្ថានភាពទេ");
      return;
    }

    setBatchActionLoading(true);
    setBatchMessage(null);
    try {
      const res = await api.post("/mobile/driver/scan/multiple/update-status", {
        codes: validCodes,
        status,
        note: `Batch updated to ${status} by driver`,
      });
      const summary = res.data?.summary;
      playBeep();
      setBatchMessage({
        type: "success",
        text: `បានកែប្រែស្ថានភាពទៅ "${status}" ចំនួន ${summary?.updated || validCodes.length} កញ្ចប់ជោគជ័យ!`,
      });

      // Update status locally
      setBatchItems((prev) =>
        prev.map((it) => (validCodes.includes(it.code) ? { ...it, status } : it))
      );
    } catch (err: any) {
      setBatchMessage({
        type: "error",
        text: err.response?.data?.message || "បរាជ័យក្នុងការកែប្រែស្ថានភាព",
      });
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleRemoveBatchItem = (code: string) => {
    setBatchItems((prev) => prev.filter((it) => it.code !== code));
  };

  const handleClearBatch = () => {
    if (batchItems.length === 0) return;
    if (confirm("តើអ្នកពិតជាចង់សម្អាតបញ្ជីកញ្ចប់អីវ៉ាន់ទាំងអស់មែនទេ?")) {
      setBatchItems([]);
      setBatchMessage(null);
    }
  };

  const displayName = driver?.name || driver?.username || "LONG MAKARA";
  const branchName = driver?.branch?.name || driver?.branchName || "ប៉េងហួតបឹងស្នោ";
  const phoneOrId = driver?.phone || driver?.idCard || "010220529";

  const parcel = scannedResult?.parcel;

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
        {/* Mode Selector Tab */}
        <div
          style={{
            display: "flex",
            backgroundColor: "#e2e8f0",
            borderRadius: "16px",
            padding: "4px",
            gap: "4px",
          }}
        >
          <button
            onClick={() => {
              setScanMode("single");
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "12px",
              fontWeight: "800",
              fontSize: "13px",
              cursor: "pointer",
              backgroundColor: scanMode === "single" ? "#ffffff" : "transparent",
              color: scanMode === "single" ? "#581c87" : "#64748b",
              boxShadow: scanMode === "single" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
          >
            <MdQrCodeScanner size={18} />
            <span>ស្កេនមួយៗ (Single)</span>
          </button>

          <button
            onClick={() => {
              setScanMode("batch");
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "12px",
              fontWeight: "800",
              fontSize: "13px",
              cursor: "pointer",
              backgroundColor: scanMode === "batch" ? "#581c87" : "transparent",
              color: scanMode === "batch" ? "#ffffff" : "#64748b",
              boxShadow: scanMode === "batch" ? "0 2px 6px rgba(88,28,135,0.25)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
          >
            <MdLayers size={18} />
            <span>ស្កេនច្រើន (Multi / Batch)</span>
            {batchItems.length > 0 && (
              <span
                style={{
                  backgroundColor: scanMode === "batch" ? "#ec4899" : "#581c87",
                  color: "#ffffff",
                  fontSize: "11px",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  fontWeight: "900",
                }}
              >
                {batchItems.length}
              </span>
            )}
          </button>
        </div>

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
            minHeight: "260px",
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
              fontSize: "12.5px",
              fontWeight: "700",
              backgroundColor: "rgba(15, 23, 42, 0.7)",
              padding: "6px 14px",
              margin: "0 auto",
              borderRadius: "20px",
              width: "fit-content",
              backdropFilter: "blur(4px)",
            }}
          >
            <MdQrCodeScanner size={18} color="#c084fc" />
            <span>
              {scanMode === "batch"
                ? "ស្កេនជាបន្តបន្ទាប់ (Continuous Multi-Scan)"
                : "ស្កេន QR Code ឬ Barcode កញ្ចប់អីវ៉ាន់"}
            </span>
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
              <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#fef08a", lineHeight: 1.4 }}>
                {cameraPermissionError}
              </div>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                អ្នកអាចបញ្ចូលលេខកូដ Tracking ដោយផ្ទាល់ក្នុងប្រអប់ខាងក្រោម
              </span>
            </div>
          )}
        </div>

        {/* ---------------- SINGLE SCAN VIEW ---------------- */}
        {scanMode === "single" && (
          <>
            {/* Manual Input Bar */}
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

            {/* Error Feedback */}
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

            {/* Scanned Parcel Result Card */}
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
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: "#475569" }}>
                      <MdLocationOn size={18} color="#f97316" style={{ flexShrink: 0, marginTop: "2px" }} />
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
                  {(!parcel.driverId ||
                    parcel.status === "pending" ||
                    parcel.status === "in-warehouse" ||
                    parcel.status === "failed") && (
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

                  {(parcel.status === "assigned" || parcel.status === "failed") && (
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

            {/* Recent Scans */}
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
          </>
        )}

        {/* ---------------- BATCH / MULTI SCAN VIEW ---------------- */}
        {scanMode === "batch" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Quick Bulk Paste/Input */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "18px",
                padding: "14px",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <span style={{ fontSize: "12.5px", fontWeight: "800", color: "#475569" }}>
                ឬ បិទភ្ជាប់ (Paste) លេខកូដច្រើនកញ្ចប់ក្នុងពេលតែមួយ៖
              </span>
              <textarea
                rows={2}
                value={batchInputText}
                onChange={(e) => setBatchInputText(e.target.value)}
                placeholder="ឧទាហរណ៍៖ CO1001, CO1002, CO1003 (ខណ្ឌដោយសញ្ញាក្បៀស ដកឃ្លា ឬចុះបន្ទាត់)"
                style={{
                  width: "100%",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  padding: "8px 10px",
                  fontSize: "12.5px",
                  fontFamily: "inherit",
                  outline: "none",
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={handleBulkTextAdd}
                  disabled={batchActionLoading || !batchInputText.trim()}
                  style={{
                    backgroundColor: "#581c87",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "8px 16px",
                    fontWeight: "800",
                    fontSize: "12.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: !batchInputText.trim() || batchActionLoading ? 0.6 : 1,
                  }}
                >
                  <MdPlaylistAddCheck size={18} />
                  <span>បញ្ចូលទៅក្នុងបញ្ជី</span>
                </button>
              </div>
            </div>

            {/* Notification Banner */}
            {batchMessage && (
              <div
                style={{
                  backgroundColor: batchMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
                  border: `1px solid ${batchMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`,
                  borderRadius: "14px",
                  padding: "12px 14px",
                  color: batchMessage.type === "success" ? "#065f46" : "#b91c1c",
                  fontSize: "13px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {batchMessage.type === "success" ? <MdCheckCircle size={20} /> : <MdError size={20} />}
                <span>{batchMessage.text}</span>
              </div>
            )}

            {/* Batch Counter Header & Actions */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "18px",
                padding: "14px",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>
                    កញ្ចប់បានស្កេន
                  </span>
                  <span
                    style={{
                      backgroundColor: "#581c87",
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: "800",
                      padding: "2px 8px",
                      borderRadius: "10px",
                    }}
                  >
                    {batchItems.length}
                  </span>
                </div>

                {batchItems.length > 0 && (
                  <button
                    onClick={handleClearBatch}
                    style={{
                      backgroundColor: "#fef2f2",
                      color: "#ef4444",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <MdDeleteSweep size={16} />
                    <span>សម្អាតទាំងអស់</span>
                  </button>
                )}
              </div>

              {/* Action Buttons for Batch */}
              {batchItems.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
                  <button
                    onClick={handleBatchClaim}
                    disabled={batchActionLoading}
                    style={{
                      backgroundColor: "#581c87",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px 10px",
                      fontWeight: "800",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      boxShadow: "0 2px 6px rgba(88,28,135,0.2)",
                    }}
                  >
                    <MdCheckCircle size={18} />
                    <span>ទទួលយកទាំងអស់ (Claim)</span>
                  </button>

                  <button
                    onClick={() => handleBatchUpdateStatus("in-transit")}
                    disabled={batchActionLoading}
                    style={{
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px 10px",
                      fontWeight: "800",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      boxShadow: "0 2px 6px rgba(37,99,235,0.2)",
                    }}
                  >
                    <MdLocalShipping size={18} />
                    <span>ចេញដឹក (In-Transit)</span>
                  </button>

                  <button
                    onClick={() => handleBatchUpdateStatus("in-warehouse")}
                    disabled={batchActionLoading}
                    style={{
                      backgroundColor: "#f59e0b",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      padding: "10px",
                      fontWeight: "800",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <MdWarehouse size={16} />
                    <span>ចូលឃ្លាំង (Warehouse)</span>
                  </button>

                  <button
                    onClick={() => handleBatchUpdateStatus("delivered")}
                    disabled={batchActionLoading}
                    style={{
                      backgroundColor: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      padding: "10px",
                      fontWeight: "800",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <MdCheckCircle size={16} />
                    <span>បានប្រគល់ (Delivered)</span>
                  </button>
                </div>
              )}
            </div>

            {/* List of Batch Scanned Items */}
            {batchItems.length === 0 ? (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "18px",
                  padding: "36px 20px",
                  textAlign: "center",
                  color: "#94a3b8",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <MdQrCodeScanner size={40} color="#cbd5e1" />
                <span style={{ fontSize: "13.5px", fontWeight: "700" }}>
                  មិនទាន់មានកញ្ចប់អីវ៉ាន់ណាត្រូវបានស្កេននៅឡើយទេ
                </span>
                <span style={{ fontSize: "12px" }}>
                  យកទូរស័ព្ទមកស្កេន Barcode/QR Code លើកញ្ចប់ជាបន្តបន្ទាប់
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {batchItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      border: `1.5px solid ${item.error ? "#fecaca" : "#e2e8f0"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: "900", color: "#0f172a" }}>
                          {item.code}
                        </span>
                        {item.status && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "800",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              backgroundColor: "#f3e8ff",
                              color: "#581c87",
                            }}
                          >
                            {item.status}
                          </span>
                        )}
                      </div>

                      {item.parcel && (
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                          <span>{item.parcel.receiverName || "ភ្ញៀវ"} </span>
                          <span>({item.parcel.receiverPhone || "—"}) </span>
                          <span style={{ fontWeight: "700", color: "#0f172a" }}>
                            • COD: ${Number(item.parcel.cod || 0).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {item.error && (
                        <span style={{ fontSize: "11.5px", color: "#ef4444", fontWeight: "700" }}>
                          {item.error}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleRemoveBatchItem(item.code)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#94a3b8",
                        padding: "6px",
                        display: "flex",
                      }}
                    >
                      <MdClose size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
