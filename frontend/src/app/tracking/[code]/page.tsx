'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { getTrackingSocket } from '@/lib/tracking-socket';
import {
  MdLocalShipping,
  MdLocationOn,
  MdPhone,
  MdCheckCircle,
  MdAccessTime,
  MdArrowBack,
  MdRefresh,
  MdStorefront,
  MdPerson,
  MdNavigation,
  MdDirectionsBike,
  MdSpeed,
} from 'react-icons/md';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';

export default function CustomerTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = params.code as string;
  const trackingCode = rawCode ? decodeURIComponent(rawCode).trim().toUpperCase() : '';

  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; heading?: number; speed?: number } | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);

  // 1. Fetch initial parcel data
  const loadTrackingData = async () => {
    if (!trackingCode) return;
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await axios.get(`${API_BASE}/api/tracking/live/${trackingCode}`);
      if (res.data && res.data.found) {
        setTrackingData(res.data);
        if (res.data.liveLocation) {
          setDriverLocation(res.data.liveLocation);
        }
      } else {
        setErrorMsg(res.data.message || 'រកមិនឃើញកញ្ចប់ឥវ៉ាន់តាមលេខកូដនេះឡើយ');
      }
    } catch (err: any) {
      console.error('Tracking fetch error:', err);
      setErrorMsg('បរាជ័យក្នុងការទាញយកព័ត៌មានកញ្ចប់ឥវ៉ាន់');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrackingData();
  }, [trackingCode]);

  // 2. Setup WebSocket Live Tracking Listener
  useEffect(() => {
    if (!trackingCode) return;

    const socket = getTrackingSocket();

    const handleConnect = () => {
      setIsLiveConnected(true);
      socket.emit('subscribe:parcel', { trackingCode });
    };

    const handleDisconnect = () => {
      setIsLiveConnected(false);
    };

    const handleLiveParcelLocation = (data: any) => {
      if (data && data.lat && data.lng) {
        setDriverLocation({
          lat: data.lat,
          lng: data.lng,
          heading: data.heading,
          speed: data.speed,
        });
        setLastPingTime(new Date());
      }
    };

    const handleInitialData = (data: any) => {
      if (data && data.found) {
        setTrackingData(data);
        if (data.liveLocation) {
          setDriverLocation(data.liveLocation);
        }
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('live:parcel_location', handleLiveParcelLocation);
    socket.on('live:initial_data', handleInitialData);

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    // Interval fallback to poll status every 15s
    const pollInterval = setInterval(() => {
      axios.get(`${API_BASE}/api/tracking/live/${trackingCode}`).then((res) => {
        if (res.data && res.data.found) {
          setTrackingData(res.data);
          if (res.data.liveLocation) {
            setDriverLocation(res.data.liveLocation);
          }
        }
      }).catch(() => {});
    }, 15000);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('live:parcel_location', handleLiveParcelLocation);
      socket.off('live:initial_data', handleInitialData);
      clearInterval(pollInterval);
    };
  }, [trackingCode]);

  // 3. Initialize & Update Leaflet Map dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Load Leaflet dynamically to avoid SSR window errors
    import('leaflet').then((L) => {
      if (!leafletMapRef.current && mapRef.current) {
        // Default center: Phnom Penh or destination
        const dest = trackingData?.parcel?.destinationCoords;
        const initialLat = driverLocation?.lat || dest?.lat || 11.5564;
        const initialLng = driverLocation?.lng || dest?.lng || 104.9282;

        const map = L.map(mapRef.current, {
          center: [initialLat, initialLng],
          zoom: 14,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        leafletMapRef.current = map;
      }

      const map = leafletMapRef.current;
      if (!map) return;

      const dest = trackingData?.parcel?.destinationCoords;

      // 1. Destination Marker (Home 🏠)
      if (dest && dest.lat && dest.lng) {
        if (!destMarkerRef.current) {
          const destIcon = L.divIcon({
            className: 'custom-dest-icon',
            html: `
              <div style="background: #ef4444; width: 38px; height: 38px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 18px;">
                🏠
              </div>
            `,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          });

          destMarkerRef.current = L.marker([dest.lat, dest.lng], { icon: destIcon })
            .addTo(map)
            .bindPopup(`<b>📍 ទីតាំងទទួលឥវ៉ាន់:</b><br/>${trackingData?.parcel?.receiverAddress || ''}`);
        } else {
          destMarkerRef.current.setLatLng([dest.lat, dest.lng]);
        }
      }

      // 2. Driver Marker (Motorcycle 🛵 with heading angle)
      if (driverLocation && driverLocation.lat && driverLocation.lng) {
        const rotationAngle = driverLocation.heading || 0;
        const driverIcon = L.divIcon({
          className: 'custom-driver-icon',
          html: `
            <div style="transform: rotate(${rotationAngle}deg); transition: transform 0.3s ease; background: #2563eb; width: 44px; height: 44px; border-radius: 50%; border: 3.5px solid #ffffff; box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 22px;">
              🛵
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        if (!driverMarkerRef.current) {
          driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
            .addTo(map)
            .bindPopup(`<b>🛵 អ្នកដឹកជញ្ជូន:</b> ${trackingData?.driver?.name || 'Driver'}`);
        } else {
          driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
          driverMarkerRef.current.setIcon(driverIcon);
        }

        // Draw Route Polyline
        if (dest && dest.lat && dest.lng) {
          const latlngs: [number, number][] = [
            [driverLocation.lat, driverLocation.lng],
            [dest.lat, dest.lng],
          ];

          if (!routeLineRef.current) {
            routeLineRef.current = L.polyline(latlngs, {
              color: '#2563eb',
              weight: 4,
              opacity: 0.75,
              dashArray: '8, 8',
            }).addTo(map);
          } else {
            routeLineRef.current.setLatLngs(latlngs);
          }

          // Fit Bounds so both are nicely in view
          const bounds = L.latLngBounds(latlngs);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        } else {
          map.panTo([driverLocation.lat, driverLocation.lng]);
        }
      }
    });
  }, [driverLocation, trackingData]);

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending':
        return 1;
      case 'picked_up':
      case 'assigned':
        return 2;
      case 'delivering':
      case 'in_transit':
      case 'out_for_delivery':
        return 3;
      case 'delivered':
      case 'completed':
        return 4;
      default:
        return 1;
    }
  };

  const currentStep = getStatusStep(trackingData?.parcel?.status || 'pending');

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Kantumruy Pro', 'Inter', sans-serif" }}>
      {/* Leaflet CSS requirement */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Header */}
      <header
        style={{
          height: 64,
          background: '#2b529a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <Link
          href="/tracking"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          <MdArrowBack size={20} />
          <span>ស្វែងរក Tracking ផ្សេងទៀត</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              background: isLiveConnected ? '#22c55e' : 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffffff', display: 'inline-block' }} />
            {isLiveConnected ? 'LIVE GPS ACTIVE' : 'CONNECTING...'}
          </span>

          <button
            onClick={loadTrackingData}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 8,
              padding: '6px 10px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <MdRefresh size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#2b529a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#64748b' }}>កំពុងទាញយកទិន្នន័យ Live Tracking...</div>
          </div>
        ) : errorMsg ? (
          <div style={{ background: '#ffffff', borderRadius: 20, padding: '50px 30px', textAlign: 'center', border: '1px solid #fee2e2', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              {errorMsg}
            </h2>
            <p style={{ fontSize: 13.5, color: '#64748b', marginBottom: 20 }}>
              សូមពិនិត្យមើលលេខកូដ Tracking Code ម្តងទៀត ឬទាក់ទងមកកាន់ផ្នែកបម្រើអតិថិជន។
            </p>
            <Link
              href="/tracking"
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                background: '#2b529a',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
                display: 'inline-block',
              }}
            >
              ត្រឡប់ទៅស្វែងរក
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 20, alignItems: 'start' }}>
            {/* Left Column: Live Map & Status Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* ETA Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                  borderRadius: 18,
                  padding: '20px 24px',
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ● ពេលវេលាប៉ាន់ស្មានមកដល់ (Estimated Arrival)
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>
                    {trackingData?.eta?.minutes ? `ប្រហែល ${trackingData.eta.minutes} នាទីទៀត` : 'កំពុងរៀបចំចេញដំណើរ'}
                  </div>
                  <div style={{ fontSize: 12.5, opacity: 0.9, marginTop: 4 }}>
                    {trackingData?.eta?.distanceKm ? `📍 ចម្ងាយសេសសល់: ${trackingData.eta.distanceKm} km` : 'អ្នកដឹកកំពុងរៀបចំកញ្ចប់ឥវ៉ាន់'}
                  </div>
                </div>

                {driverLocation && (
                  <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: '10px 16px', textAlign: 'right' }}>
                    <div style={{ fontSize: 11, opacity: 0.9 }}>ល្បឿនបច្ចុប្បន្ន</div>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{driverLocation.speed || 0} km/h</div>
                  </div>
                )}
              </div>

              {/* Real-time Map Container */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 20,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MdNavigation size={20} color="#2563eb" />
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                      ផែនទីតាមដានផ្ទាល់ (Real-Time GPS Map)
                    </span>
                  </div>
                  {lastPingTime && (
                    <span style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 700 }}>
                      ● បានទទួលទីតាំងថ្មី: {lastPingTime.toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div
                  ref={mapRef}
                  style={{
                    width: '100%',
                    height: '420px',
                    background: '#e2e8f0',
                    position: 'relative',
                    zIndex: 1,
                  }}
                />
              </div>

              {/* Status Timeline Card */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 20,
                  padding: '24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>
                  ដំណើរការនៃការដឹកជញ្ជូន (Delivery Progress)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, position: 'relative' }}>
                  {[
                    { step: 1, label: 'បានបង្កើត', sub: 'Created' },
                    { step: 2, label: 'បានទទួលពីហាង', sub: 'Picked Up' },
                    { step: 3, label: 'កំពុងដឹកជញ្ជូន', sub: 'Out for Delivery' },
                    { step: 4, label: 'បានប្រគល់ជោគជ័យ', sub: 'Delivered' },
                  ].map((item) => {
                    const isDone = currentStep >= item.step;
                    const isCurrent = currentStep === item.step;
                    return (
                      <div key={item.step} style={{ textAlign: 'center', position: 'relative' }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: isDone ? '#2563eb' : '#f1f5f9',
                            color: isDone ? '#ffffff' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 15,
                            fontWeight: 900,
                            margin: '0 auto 8px',
                            border: isCurrent ? '3px solid #bfdbfe' : 'none',
                            boxShadow: isCurrent ? '0 0 0 4px rgba(37,99,235,0.2)' : 'none',
                          }}
                        >
                          {isDone ? '✓' : item.step}
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: isDone ? 800 : 600, color: isDone ? '#0f172a' : '#94a3b8' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{item.sub}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Parcel, Driver & Merchant Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Driver Card */}
              {trackingData?.driver ? (
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 20,
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 14 }}>
                    អ្នកដឹកជញ្ជូនរបស់អ្នក (Your Delivery Driver)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        fontWeight: 900,
                      }}
                    >
                      🛵
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                        {trackingData.driver.name}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 700, marginTop: 2 }}>
                        ● កំពុងបំពេញការងារ
                      </div>
                    </div>
                  </div>

                  {trackingData.driver.phone && (
                    <a
                      href={`tel:${trackingData.driver.phone}`}
                      style={{
                        width: '100%',
                        padding: '11px',
                        borderRadius: 10,
                        background: '#2563eb',
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontSize: 13.5,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                        boxSizing: 'border-box',
                      }}
                    >
                      <MdPhone size={18} />
                      <span>ខលទាក់ទងអ្នកដឹក ({trackingData.driver.phone})</span>
                    </a>
                  )}
                </div>
              ) : (
                <div style={{ background: '#ffffff', borderRadius: 20, padding: '20px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                  ⏳ កំពុងរង់ចាំការចាត់តាំងអ្នកដឹកជញ្ជូន
                </div>
              )}

              {/* Parcel Details */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 20,
                  padding: '20px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 14 }}>
                  ព័ត៌មានកញ្ចប់ឥវ៉ាន់ (Parcel Information)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>Tracking Code:</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#2563eb', fontFamily: 'monospace' }}>
                      {trackingData?.parcel?.trackingCode}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>ហាងផ្ញើ (Sender):</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                      {trackingData?.parcel?.senderName} ({trackingData?.parcel?.senderPhone || '-'})
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>អ្នកទទួល (Receiver):</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                      {trackingData?.parcel?.receiverName} ({trackingData?.parcel?.receiverPhone})
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      📍 {trackingData?.parcel?.receiverAddress}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>ថ្លៃសេវាដឹក:</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                        ${Number(trackingData?.parcel?.deliveryFee || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>ប្រាក់ប្រមូល (COD):</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#16a34a' }}>
                        ${Number(trackingData?.parcel?.codAmount || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
