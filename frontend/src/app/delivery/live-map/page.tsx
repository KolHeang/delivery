'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { getTrackingSocket } from '@/lib/tracking-socket';
import { getUser } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdNavigation,
  MdSpeed,
  MdPhone,
  MdRefresh,
  MdSearch,
  MdDirectionsBike,
  MdGpsFixed,
  MdLocalShipping,
  MdClose,
  MdCheckCircle,
  MdBatteryChargingFull,
  MdLayers,
  MdPlayArrow,
  MdChevronLeft,
  MdChevronRight,
  MdContentCopy,
  MdOpenInNew,
  MdArrowBack,
  MdFilterList,
} from 'react-icons/md';

// Map tile layers
const MAP_TILES = {
  voyager: {
    name: 'Carto Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  positron: {
    name: 'Carto Positron',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
};

export default function AdminLiveFleetMapPage() {
  const { lang } = useLanguage();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'delivering' | 'offline'>('all');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [tileStyle, setTileStyle] = useState<keyof typeof MAP_TILES>('voyager');
  const [simulating, setSimulating] = useState(false);
  const [copiedCoord, setCopiedCoord] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const driverMarkersRef = useRef<Map<number, any>>(new Map());
  const tileLayerRef = useRef<any>(null);

  // Invalidate map size when sidebar collapses or opens
  useEffect(() => {
    const timer = setTimeout(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isSidebarOpen]);

  // 1. Fetch fleet drivers from API
  const loadFleetData = async () => {
    try {
      setLoading(true);
      const user = getUser();
      const tenantId = user?.tenantId;
      const res = await api.get(`/tracking/fleet/live${tenantId ? `?tenantId=${tenantId}` : ''}`);
      if (res.data && res.data.drivers) {
        setDrivers(res.data.drivers);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Failed to load fleet live drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleetData();
  }, []);

  // 2. Setup WebSocket Live Fleet Listener
  useEffect(() => {
    const socket = getTrackingSocket();
    const user = getUser();

    const handleConnect = () => {
      setIsSocketConnected(true);
      socket.emit('subscribe:fleet', { tenantId: user?.tenantId });
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
    };

    const handleFleetInitial = (data: any[]) => {
      if (Array.isArray(data)) {
        setDrivers(data);
        setLastUpdate(new Date());
      }
    };

    const handleDriverMoved = (updatedDriver: any) => {
      if (!updatedDriver || !updatedDriver.driverId) return;

      setDrivers((prev) => {
        const index = prev.findIndex((d) => d.driverId === updatedDriver.driverId);
        if (index >= 0) {
          const next = [...prev];
          next[index] = { ...next[index], ...updatedDriver };
          return next;
        } else {
          return [updatedDriver, ...prev];
        }
      });

      setLastUpdate(new Date());

      setSelectedDriver((prev: any) => {
        if (prev && prev.driverId === updatedDriver.driverId) {
          return { ...prev, ...updatedDriver };
        }
        return prev;
      });
    };

    const handleDriverStatusChanged = (data: any) => {
      if (!data || !data.driverId) return;
      setDrivers((prev) =>
        prev.map((d) => (d.driverId === data.driverId ? { ...d, isOnline: data.isOnline } : d))
      );
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('live:fleet_initial', handleFleetInitial);
    socket.on('live:driver_moved', handleDriverMoved);
    socket.on('live:driver_status_changed', handleDriverStatusChanged);

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('live:fleet_initial', handleFleetInitial);
      socket.off('live:driver_moved', handleDriverMoved);
      socket.off('live:driver_status_changed', handleDriverStatusChanged);
    };
  }, []);

  // 3. Initialize & Update Leaflet Map dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isSubscribed = true;

    import('leaflet').then((L) => {
      if (!isSubscribed) return;

      if (!leafletMapRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [11.5564, 104.9282], // Phnom Penh Center
          zoom: 13,
          zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const currentTile = MAP_TILES[tileStyle];
        tileLayerRef.current = L.tileLayer(currentTile.url, {
          attribution: currentTile.attribution,
          maxZoom: 19,
        }).addTo(map);

        leafletMapRef.current = map;
      }

      const map = leafletMapRef.current;
      if (!map) return;

      // Update Tile Layer if changed
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        const currentTile = MAP_TILES[tileStyle];
        tileLayerRef.current = L.tileLayer(currentTile.url, {
          attribution: currentTile.attribution,
          maxZoom: 19,
        }).addTo(map);
      }

      // Update / Create driver markers
      drivers.forEach((driver) => {
        if (!driver.lat || !driver.lng) return;

        const isOnline = driver.isOnline;
        const isDelivering = driver.activeParcelCodes && driver.activeParcelCodes.length > 0;
        const mainColor = isDelivering ? '#2563eb' : isOnline ? '#10b981' : '#64748b';
        const rotationAngle = driver.heading || 0;
        const speed = driver.speed || 0;

        const driverIcon = L.divIcon({
          className: `fleet-driver-custom-marker-${driver.driverId}`,
          html: `
            <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
              ${
                isOnline && speed > 0
                  ? `<div style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: ${mainColor}33; animation: pulseRadar 2s infinite ease-out;"></div>`
                  : ''
              }
              <div style="position: absolute; top: -20px; background: rgba(15,23,42,0.85); backdrop-filter: blur(4px); color: #ffffff; padding: 2px 7px; border-radius: 8px; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2); pointer-events: none;">
                ${driver.driverName || `Driver #${driver.driverId}`} ${speed > 0 ? `· ${speed}km/h` : ''}
              </div>
              <div style="transform: rotate(${rotationAngle}deg); transition: transform 0.4s ease; background: ${mainColor}; width: 36px; height: 36px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 17px; cursor: pointer;">
                🛵
              </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        let marker = driverMarkersRef.current.get(driver.driverId);

        if (!marker) {
          marker = L.marker([driver.lat, driver.lng], { icon: driverIcon }).addTo(map);
          marker.on('click', () => {
            setSelectedDriver(driver);
            if (!isSidebarOpen) setIsSidebarOpen(true);
          });
          driverMarkersRef.current.set(driver.driverId, marker);
        } else {
          marker.setLatLng([driver.lat, driver.lng]);
          marker.setIcon(driverIcon);
        }
      });
    });

    return () => {
      isSubscribed = false;
    };
  }, [drivers, tileStyle, isSidebarOpen]);

  // Focus driver on map
  const handleFocusDriver = (driver: any) => {
    setSelectedDriver(driver);
    if (leafletMapRef.current && driver.lat && driver.lng) {
      leafletMapRef.current.flyTo([driver.lat, driver.lng], 16, { animate: true, duration: 1.2 });
    }
  };

  // Fit all drivers bounds
  const handleFitAll = () => {
    if (!leafletMapRef.current || drivers.length === 0) return;
    import('leaflet').then((L) => {
      const validPoints = drivers
        .filter((d) => d.lat && d.lng)
        .map((d) => [Number(d.lat), Number(d.lng)] as [number, number]);

      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        leafletMapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } else {
        leafletMapRef.current.setView([11.5564, 104.9282], 13);
      }
    });
  };

  // Trigger GPS Demo Simulation
  const handleSimulateGPS = async () => {
    try {
      setSimulating(true);
      const user = getUser();
      const res = await api.post(`/tracking/fleet/simulate${user?.tenantId ? `?tenantId=${user.tenantId}` : ''}`);
      if (res.data && res.data.drivers) {
        setDrivers(res.data.drivers);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setTimeout(() => setSimulating(false), 600);
    }
  };

  // Copy GPS Coordinates
  const handleCopyCoord = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedCoord(true);
    setTimeout(() => setCopiedCoord(false), 2000);
  };

  // Filter calculations
  const onlineCount = drivers.filter((d) => d.isOnline).length;
  const deliveringCount = drivers.filter((d) => d.isOnline && d.activeParcelCodes?.length > 0).length;
  const offlineCount = drivers.filter((d) => !d.isOnline).length;

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchesSearch =
        d.driverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.driverPhone?.includes(searchQuery) ||
        `#${d.driverId}`.includes(searchQuery);

      if (!matchesSearch) return false;

      if (activeTab === 'online') return d.isOnline;
      if (activeTab === 'delivering') return d.isOnline && d.activeParcelCodes?.length > 0;
      if (activeTab === 'offline') return !d.isOnline;
      return true;
    });
  }, [drivers, searchQuery, activeTab]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Kantumruy Pro', 'Inter', sans-serif" }}>
      {/* Leaflet CSS requirement */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      <style jsx global>{`
        @keyframes pulseRadar {
          0% {
            transform: scale(0.85);
            opacity: 0.85;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        @keyframes liveBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      <Sidebar />

      <div style={{ flex: 1, marginLeft: 260, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh' }}>
        <Topbar
          title={lang === 'km' ? 'ផែនទីតាមដានអ្នកដឹកជញ្ជូន' : 'Live Driver Fleet Tracking'}
          subtitle={lang === 'km' ? 'តាមដានចលនា ទីតាំងជាក់ស្តែង និងកញ្ចប់ឥវ៉ាន់របស់អ្នកដឹកទាំងអស់' : 'Real-time GPS movement, active tasks & dispatch status of all drivers'}
        />

        {/* Top Control & KPI Header Bar */}
        <div
          style={{
            padding: '10px 20px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Toggle Panel Button & Socket Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{
                background: isSidebarOpen ? '#eff6ff' : '#2563eb',
                color: isSidebarOpen ? '#2563eb' : '#ffffff',
                border: isSidebarOpen ? '1.5px solid #bfdbfe' : 'none',
                borderRadius: 10,
                padding: '7px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                fontWeight: 800,
                transition: 'all 0.15s',
              }}
            >
              {isSidebarOpen ? <MdChevronLeft size={18} /> : <MdChevronRight size={18} />}
              <span>{isSidebarOpen ? 'បិទផ្ទាំង Driver' : 'បើកផ្ទាំង Driver'}</span>
            </button>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isSocketConnected ? '#10b981' : '#f59e0b',
                  animation: isSocketConnected ? 'liveBlink 2s infinite' : 'none',
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>
                {isSocketConnected ? 'WebSocket Live' : 'Connecting...'}
              </span>
            </div>
          </div>

          {/* Center: KPI Summary Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'all' ? '#0f172a' : '#f1f5f9',
                color: activeTab === 'all' ? '#ffffff' : '#475569',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>សរុប</span>
              <span style={{ padding: '1px 6px', borderRadius: 6, background: activeTab === 'all' ? 'rgba(255,255,255,0.25)' : '#e2e8f0', fontSize: 11 }}>
                {drivers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('delivering')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'delivering' ? '#2563eb' : '#f1f5f9',
                color: activeTab === 'delivering' ? '#ffffff' : '#475569',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🛵 កំពុងដឹក</span>
              <span style={{ padding: '1px 6px', borderRadius: 6, background: activeTab === 'delivering' ? 'rgba(255,255,255,0.25)' : '#dbeafe', color: activeTab === 'delivering' ? '#ffffff' : '#1e40af', fontSize: 11 }}>
                {deliveringCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('online')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'online' ? '#10b981' : '#f1f5f9',
                color: activeTab === 'online' ? '#ffffff' : '#475569',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🟢 ទំនេរ</span>
              <span style={{ padding: '1px 6px', borderRadius: 6, background: activeTab === 'online' ? 'rgba(255,255,255,0.25)' : '#d1fae5', color: activeTab === 'online' ? '#ffffff' : '#065f46', fontSize: 11 }}>
                {Math.max(0, onlineCount - deliveringCount)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('offline')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'offline' ? '#64748b' : '#f1f5f9',
                color: activeTab === 'offline' ? '#ffffff' : '#475569',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>⚪ Offline</span>
              <span style={{ padding: '1px 6px', borderRadius: 6, background: activeTab === 'offline' ? 'rgba(255,255,255,0.25)' : '#e2e8f0', color: activeTab === 'offline' ? '#ffffff' : '#64748b', fontSize: 11 }}>
                {offlineCount}
              </span>
            </button>
          </div>

          {/* Right: Map Actions (Fit All, Refresh, Demo Test, Style) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleFitAll}
              title="ពង្រីកផែនទីឱ្យឃើញ Driver ទាំងអស់"
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 10,
                padding: '7px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                color: '#334155',
              }}
            >
              <MdGpsFixed size={15} color="#2563eb" />
              <span>Fit All</span>
            </button>

            <button
              onClick={loadFleetData}
              disabled={loading}
              title="ទាញយកទិន្នន័យឡើងវិញ"
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 10,
                padding: '7px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                color: '#334155',
              }}
            >
              <MdRefresh size={16} color="#2563eb" style={{ transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleSimulateGPS}
              disabled={simulating}
              title="បង្កើតចលនាតេស្ត GPS ជាក់ស្តែងក្នុងរាជធានីភ្នំពេញ"
              style={{
                background: '#2563eb',
                border: 'none',
                borderRadius: 10,
                padding: '7px 13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              }}
            >
              <MdPlayArrow size={16} />
              <span>{simulating ? 'កំពុងតេស្ត...' : 'តេស្តចលនា GPS'}</span>
            </button>

            <select
              value={tileStyle}
              onChange={(e) => setTileStyle(e.target.value as any)}
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 10,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="voyager">Voyager</option>
              <option value="positron">Clean Light</option>
              <option value="osm">OpenStreetMap</option>
            </select>
          </div>
        </div>

        {/* Main Split Layout: Left Panel & Right Map (NOT OVERLAPPING) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          
          {/* LEFT DOCKED PANEL: Completely outside the map so it NEVER blocks the view */}
          {isSidebarOpen && (
            <div
              style={{
                width: 330,
                minWidth: 330,
                background: '#ffffff',
                borderRight: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                zIndex: 10,
              }}
            >
              {/* If a driver is selected, show Driver Detail View inside the panel */}
              {selectedDriver ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Selected Driver Header */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                    <button
                      onClick={() => setSelectedDriver(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2563eb',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12.5,
                        fontWeight: 800,
                      }}
                    >
                      <MdArrowBack size={18} />
                      <span>ត្រឡប់ទៅបញ្ជី</span>
                    </button>

                    <button
                      onClick={() => setSelectedDriver(null)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MdClose size={16} />
                    </button>
                  </div>

                  {/* Driver Profile Info */}
                  <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: selectedDriver.isOnline ? '#2563eb' : '#64748b',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                          boxShadow: '0 6px 16px rgba(37,99,235,0.2)',
                        }}
                      >
                        🛵
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                          {selectedDriver.driverName}
                        </div>
                        <div style={{ fontSize: 12, color: selectedDriver.isOnline ? '#10b981' : '#64748b', fontWeight: 800 }}>
                          ● {selectedDriver.isOnline ? 'Online & Active' : 'Offline'}
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8fafc', padding: '14px', borderRadius: 14, marginBottom: 16, border: '1px solid #e2e8f0' }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>ល្បឿនបច្ចុប្បន្ន</span>
                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 15, marginTop: 2 }}>
                          ⚡ {selectedDriver.speed || 0} km/h
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>ថាមពលថ្ម</span>
                        <div style={{ fontWeight: 900, color: '#10b981', fontSize: 15, marginTop: 2 }}>
                          🔋 {selectedDriver.battery || 100}%
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>កញ្ចប់កំពុងដឹក</span>
                        <div style={{ fontWeight: 900, color: '#2563eb', fontSize: 15, marginTop: 2 }}>
                          📦 {selectedDriver.activeParcelCodes?.length || 0} កញ្ចប់
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>ទិសដៅ Heading</span>
                        <div style={{ fontWeight: 900, color: '#475569', fontSize: 15, marginTop: 2 }}>
                          🧭 {selectedDriver.heading || 0}°
                        </div>
                      </div>
                    </div>

                    {/* GPS Coordinates */}
                    {selectedDriver.lat && selectedDriver.lng && (
                      <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>កូអរដោនេ GPS</div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e293b', fontSize: 12, marginTop: 2 }}>
                            {Number(selectedDriver.lat).toFixed(5)}, {Number(selectedDriver.lng).toFixed(5)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopyCoord(selectedDriver.lat, selectedDriver.lng)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontSize: 11,
                            fontWeight: 700,
                            color: copiedCoord ? '#16a34a' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {copiedCoord ? 'បានចម្លង!' : 'ចម្លង'}
                        </button>
                      </div>
                    )}

                    {/* Active Parcels List */}
                    {selectedDriver.activeParcelCodes && selectedDriver.activeParcelCodes.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                          កញ្ចប់ឥវ៉ាន់កំពុងកាន់ {selectedDriver.activeParcelCodes.length} ៖
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {selectedDriver.activeParcelCodes.map((code: string) => (
                            <a
                              key={code}
                              href={`/delivery/tracking_delivery?code=${code}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                background: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                                padding: '4px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <span>{code}</span>
                              <MdOpenInNew size={12} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Action Buttons */}
                  <div style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
                    {selectedDriver.driverPhone ? (
                      <a
                        href={`tel:${selectedDriver.driverPhone}`}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: 10,
                          background: '#2563eb',
                          color: '#ffffff',
                          textDecoration: 'none',
                          fontSize: 12.5,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                        }}
                      >
                        <MdPhone size={16} />
                        <span>ខលទៅ Driver {selectedDriver.driverPhone}</span>
                      </a>
                    ) : (
                      <div style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#f1f5f9', color: '#94a3b8', fontSize: 12, textAlign: 'center', fontWeight: 700 }}>
                        គ្មានលេខទូរស័ព្ទ
                      </div>
                    )}

                    <button
                      onClick={() => handleFocusDriver(selectedDriver)}
                      style={{
                        padding: '0 14px',
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        color: '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="ពង្រីកមើលទីតាំងលើផែនទី"
                    >
                      <MdGpsFixed size={18} color="#2563eb" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Driver List View */
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Search Bar */}
                  <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="ស្វែងរក Driver តាមឈ្មោះ ឬលេខ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 30px 9px 34px',
                          borderRadius: 10,
                          border: '1.5px solid #e2e8f0',
                          fontSize: 12.5,
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: '#f8fafc',
                          color: '#0f172a',
                        }}
                      />
                      <MdSearch size={18} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: 'none',
                            background: 'transparent',
                            color: '#94a3b8',
                            cursor: 'pointer',
                          }}
                        >
                          <MdClose size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Driver Items Scroll */}
                  <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {filteredDrivers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 10px' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🛵</div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                          {loading ? 'កំពុងទាញយក...' : 'មិនមាន Driver ក្នុងបញ្ជី'}
                        </div>
                        <p style={{ fontSize: 11.5, color: '#64748b', margin: '0 0 14px' }}>
                          ចុចប៊ូតុង "តេស្តចលនា GPS" ដើម្បីមើលការបង្ហាញ
                        </p>
                        <button
                          onClick={handleSimulateGPS}
                          style={{
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          តេស្តចលនា GPS
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filteredDrivers.map((d) => {
                          const isSelected = selectedDriver?.driverId === d.driverId;
                          const isOnline = d.isOnline;
                          const isDelivering = isOnline && d.activeParcelCodes?.length > 0;
                          const statusColor = isDelivering ? '#2563eb' : isOnline ? '#10b981' : '#64748b';
                          const statusBg = isDelivering ? '#eff6ff' : isOnline ? '#ecfdf5' : '#f8fafc';
                          const statusLabel = isDelivering ? 'កំពុងដឹក' : isOnline ? 'ទំនេរ' : 'Offline';

                          return (
                            <div
                              key={d.driverId}
                              onClick={() => handleFocusDriver(d)}
                              style={{
                                padding: '10px 12px',
                                borderRadius: 12,
                                background: isSelected ? '#eff6ff' : '#ffffff',
                                border: `1.5px solid ${isSelected ? '#3b82f6' : '#f1f5f9'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div
                                    style={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: '50%',
                                      background: statusBg,
                                      color: statusColor,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 16,
                                      fontWeight: 900,
                                      border: `1.5px solid ${statusColor}33`,
                                    }}
                                  >
                                    🛵
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
                                      {d.driverName}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>
                                      {d.driverPhone || `ID: #${d.driverId}`}
                                    </div>
                                  </div>
                                </div>

                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: 6,
                                    background: statusBg,
                                    color: statusColor,
                                  }}
                                >
                                  ● {statusLabel}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid #f8fafc', fontSize: 11, color: '#64748b' }}>
                                <span>{isOnline ? `⚡ ${d.speed || 0} km/h` : 'ក្រៅបណ្តាញ'}</span>
                                <span style={{ fontWeight: 800, color: d.activeParcelCodes?.length ? '#2563eb' : '#94a3b8' }}>
                                  📦 {d.activeParcelCodes?.length || 0} កញ្ចប់
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RIGHT MAP AREA: 100% visible, completely unblocked */}
          <div style={{ flex: 1, position: 'relative', height: '100%' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#e2e8f0' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
