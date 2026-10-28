'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { getTrackingSocket } from '@/lib/tracking-socket';
import { getUser } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdRefresh,
  MdSearch,
  MdGpsFixed,
  MdClose,
  MdChevronLeft,
  MdChevronRight,
  MdArrowBack,
  MdPhone,
  MdOpenInNew,
  MdSpeed,
  MdBatteryChargingFull,
  MdLocalShipping,
  MdNavigation,
  MdLayers,
  MdBolt,
} from 'react-icons/md';

// Clean, watermark-free map tile layers (NO API KEY required, NO watermark)
const MAP_TILES = {
  googleRoad: {
    name: 'Google Maps (ផ្លូវ)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
  },
  osm: {
    name: 'OpenStreetMap (សកល)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  },
  googleHybrid: {
    name: 'Google Satellite (ផ្កាយរណប)',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
  },
  esri: {
    name: 'Esri World Street',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    subdomains: [],
    maxZoom: 19,
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
  const [tileStyle, setTileStyle] = useState<keyof typeof MAP_TILES>('googleRoad');
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

        const currentTile = MAP_TILES[tileStyle] || MAP_TILES.googleRoad;
        tileLayerRef.current = L.tileLayer(currentTile.url, {
          attribution: currentTile.attribution,
          subdomains: (currentTile as any).subdomains || ['a', 'b', 'c'],
          maxZoom: currentTile.maxZoom || 19,
        }).addTo(map);

        leafletMapRef.current = map;
      }

      const map = leafletMapRef.current;
      if (!map) return;

      // Update Tile Layer if changed
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        const currentTile = MAP_TILES[tileStyle] || MAP_TILES.googleRoad;
        tileLayerRef.current = L.tileLayer(currentTile.url, {
          attribution: currentTile.attribution,
          subdomains: (currentTile as any).subdomains || ['a', 'b', 'c'],
          maxZoom: currentTile.maxZoom || 19,
        }).addTo(map);
      }

      // Update / Create driver markers
      drivers.forEach((driver) => {
        if (!driver.lat || !driver.lng) return;

        const isOnline = driver.isOnline;
        const isDelivering = isOnline && driver.activeParcelCodes && driver.activeParcelCodes.length > 0;
        const mainColor = isDelivering ? '#2563eb' : isOnline ? '#10b981' : '#64748b';
        const rotationAngle = driver.heading || 0;
        const speed = driver.speed || 0;

        const driverIcon = L.divIcon({
          className: `fleet-driver-custom-marker-${driver.driverId}`,
          html: `
            <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              ${
                isOnline && speed > 0
                  ? `<div style="position: absolute; width: 52px; height: 52px; border-radius: 50%; background: ${mainColor}22; animation: pulseRadar 2s infinite ease-out;"></div>`
                  : ''
              }
              <!-- Driver Floating Name Tag -->
              <div style="position: absolute; top: -22px; background: #ffffff; color: #0f172a; padding: 2.5px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 10px rgba(0,0,0,0.14); border: 1px solid rgba(0,0,0,0.06); display: flex; align-items: center; gap: 4px; pointer-events: none; z-index: 5;">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: ${mainColor}; display: inline-block;"></span>
                <span>${driver.driverName || `Driver #${driver.driverId}`}</span>
                ${speed > 0 ? `<span style="color: #64748b; font-size: 10px; font-weight: 600;">· ${speed}km/h</span>` : ''}
              </div>
              <!-- Driver Vehicle Circle Pin -->
              <div style="transform: rotate(${rotationAngle}deg); transition: transform 0.35s ease; background: ${mainColor}; width: 36px; height: 36px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.22); display: flex; align-items: center; justify-content: center; color: #ffffff;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.18c.41 1.16 1.51 2 2.82 2 1.66 0 3-1.34 3-3h2v-5l-3-3zm-12 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm11 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                </svg>
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
            transform: scale(1.65);
            opacity: 0;
          }
        }
        @keyframes liveBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
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
            padding: '10px 18px',
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
                background: isSidebarOpen ? '#f1f5f9' : 'var(--accent, #1565D8)',
                color: isSidebarOpen ? '#334155' : '#ffffff',
                border: isSidebarOpen ? '1px solid #cbd5e1' : 'none',
                borderRadius: 8,
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                fontWeight: 700,
                transition: 'all 0.15s',
              }}
            >
              {isSidebarOpen ? <MdChevronLeft size={18} /> : <MdChevronRight size={18} />}
              <span>{isSidebarOpen ? (lang === 'km' ? 'លាក់បញ្ជី Driver' : 'Hide Drivers') : (lang === 'km' ? 'បង្ហាញបញ្ជី Driver' : 'Show Drivers')}</span>
            </button>

            <div
              style={{
                background: isSocketConnected ? '#ecfdf5' : '#fffbeb',
                border: `1px solid ${isSocketConnected ? '#a7f3d0' : '#fde68a'}`,
                borderRadius: 8,
                padding: '5px 11px',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
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
              <span style={{ fontSize: 11.5, fontWeight: 700, color: isSocketConnected ? '#065f46' : '#92400e' }}>
                {isSocketConnected ? (lang === 'km' ? 'ផ្សាយផ្ទាល់ (Live)' : 'Live WebSocket') : (lang === 'km' ? 'កំពុងតភ្ជាប់...' : 'Connecting...')}
              </span>
            </div>
          </div>

          {/* Center: KPI Filter Segment Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '3px', borderRadius: 10, gap: 2 }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'all' ? '#ffffff' : 'transparent',
                color: activeTab === 'all' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <span>{lang === 'km' ? 'ទាំងអស់' : 'All'}</span>
              <span style={{ padding: '1px 6px', borderRadius: 6, background: activeTab === 'all' ? '#e2e8f0' : '#e2e8f0', fontSize: 11, fontWeight: 800 }}>
                {drivers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('delivering')}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'delivering' ? '#ffffff' : 'transparent',
                color: activeTab === 'delivering' ? '#2563eb' : '#64748b',
                boxShadow: activeTab === 'delivering' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <span>{lang === 'km' ? 'កំពុងដឹក' : 'Delivering'}</span>
              <span style={{ padding: '1px 6px', borderRadius: 6, background: activeTab === 'delivering' ? '#dbeafe' : '#e2e8f0', color: activeTab === 'delivering' ? '#1e40af' : '#64748b', fontSize: 11, fontWeight: 800 }}>
                {deliveringCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('online')}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'online' ? '#ffffff' : 'transparent',
                color: activeTab === 'online' ? '#10b981' : '#64748b',
                boxShadow: activeTab === 'online' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <span>{lang === 'km' ? 'ទំនេរ' : 'Free'}</span>
              <span style={{ padding: '1px 6px', borderRadius: 6, background: activeTab === 'online' ? '#d1fae5' : '#e2e8f0', color: activeTab === 'online' ? '#065f46' : '#64748b', fontSize: 11, fontWeight: 800 }}>
                {Math.max(0, onlineCount - deliveringCount)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('offline')}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'offline' ? '#ffffff' : 'transparent',
                color: activeTab === 'offline' ? '#64748b' : '#94a3b8',
                boxShadow: activeTab === 'offline' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <span>{lang === 'km' ? 'ក្រៅបណ្តាញ' : 'Offline'}</span>
              <span style={{ padding: '1px 6px', borderRadius: 6, background: '#e2e8f0', color: '#64748b', fontSize: 11, fontWeight: 800 }}>
                {offlineCount}
              </span>
            </button>
          </div>

          {/* Right: Map Actions (Fit All, Refresh, Layer Style, GPS Demo) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleFitAll}
              title={lang === 'km' ? 'ពង្រីកផែនទីឱ្យឃើញ Driver ទាំងអស់' : 'Fit all drivers in view'}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: '#334155',
                transition: 'all 0.15s',
              }}
            >
              <MdGpsFixed size={15} color="var(--accent, #1565D8)" />
              <span>{lang === 'km' ? 'មើលទាំងអស់' : 'Fit View'}</span>
            </button>

            <button
              onClick={loadFleetData}
              disabled={loading}
              title={lang === 'km' ? 'ទាញយកទិន្នន័យឡើងវិញ' : 'Refresh data'}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: '#334155',
                transition: 'all 0.15s',
              }}
            >
              <MdRefresh size={16} color="var(--accent, #1565D8)" style={{ transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }} />
              <span>{lang === 'km' ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}</span>
            </button>

            {/* Map Tile Style Switcher */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                value={tileStyle}
                onChange={(e) => setTileStyle(e.target.value as any)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="googleRoad">🗺️ Google Maps</option>
                <option value="osm">🌐 OpenStreetMap</option>
                <option value="googleHybrid">🛰️ ផែនទីផ្កាយរណប</option>
                <option value="esri">🏛️ Esri Street</option>
              </select>
            </div>

            {/* Test GPS motion button (unobtrusive demo button) */}
            <button
              onClick={handleSimulateGPS}
              disabled={simulating}
              title={lang === 'km' ? 'បង្កើតចលនាតេស្ត GPS ជាក់ស្តែងក្នុងរាជធានីភ្នំពេញ' : 'Simulate GPS movement for demo'}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                fontWeight: 700,
                color: '#475569',
              }}
            >
              <MdBolt size={15} color="#f59e0b" />
              <span>{simulating ? (lang === 'km' ? 'កំពុងតេស្ត...' : 'Testing...') : (lang === 'km' ? 'តេស្តចលនា' : 'Simulate GPS')}</span>
            </button>
          </div>
        </div>

        {/* Main Split Layout: Left Panel & Right Map */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          
          {/* LEFT DOCKED PANEL */}
          {isSidebarOpen && (
            <div
              style={{
                width: 340,
                minWidth: 340,
                background: '#ffffff',
                borderRight: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                zIndex: 10,
              }}
            >
              {/* If a driver is selected, show Driver Detail View */}
              {selectedDriver ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Selected Driver Header */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                    <button
                      onClick={() => setSelectedDriver(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent, #1565D8)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12.5,
                        fontWeight: 700,
                      }}
                    >
                      <MdArrowBack size={18} />
                      <span>{lang === 'km' ? 'ត្រឡប់ទៅបញ្ជី' : 'Back to list'}</span>
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
                          background: selectedDriver.isOnline ? (selectedDriver.activeParcelCodes?.length ? '#eff6ff' : '#ecfdf5') : '#f8fafc',
                          color: selectedDriver.isOnline ? (selectedDriver.activeParcelCodes?.length ? '#2563eb' : '#10b981') : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1.5px solid ${selectedDriver.isOnline ? (selectedDriver.activeParcelCodes?.length ? '#bfdbfe' : '#a7f3d0') : '#e2e8f0'}`,
                        }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.18c.41 1.16 1.51 2 2.82 2 1.66 0 3-1.34 3-3h2v-5l-3-3zm-12 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm11 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                          {selectedDriver.driverName}
                        </div>
                        <div style={{ fontSize: 12, color: selectedDriver.isOnline ? '#10b981' : '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: selectedDriver.isOnline ? '#10b981' : '#94a3b8', display: 'inline-block' }}></span>
                          <span>{selectedDriver.isOnline ? (selectedDriver.activeParcelCodes?.length ? (lang === 'km' ? 'កំពុងដឹកជញ្ជូន' : 'Delivering') : (lang === 'km' ? 'ទំនេរ (Online)' : 'Online & Free')) : (lang === 'km' ? 'ក្រៅបណ្តាញ (Offline)' : 'Offline')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8fafc', padding: '14px', borderRadius: 12, marginBottom: 16, border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MdSpeed size={14} />
                          <span>{lang === 'km' ? 'ល្បឿន' : 'Speed'}</span>
                        </div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 15, marginTop: 3 }}>
                          {selectedDriver.speed || 0} km/h
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MdBatteryChargingFull size={14} />
                          <span>{lang === 'km' ? 'ថាមពលថ្ម' : 'Battery'}</span>
                        </div>
                        <div style={{ fontWeight: 800, color: '#10b981', fontSize: 15, marginTop: 3 }}>
                          {selectedDriver.battery || 100}%
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MdLocalShipping size={14} />
                          <span>{lang === 'km' ? 'កញ្ចប់កំពុងដឹក' : 'Parcels'}</span>
                        </div>
                        <div style={{ fontWeight: 800, color: '#2563eb', fontSize: 15, marginTop: 3 }}>
                          {selectedDriver.activeParcelCodes?.length || 0} {lang === 'km' ? 'កញ្ចប់' : 'items'}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MdNavigation size={14} />
                          <span>{lang === 'km' ? 'ទិសដៅ' : 'Heading'}</span>
                        </div>
                        <div style={{ fontWeight: 800, color: '#475569', fontSize: 15, marginTop: 3 }}>
                          {selectedDriver.heading || 0}°
                        </div>
                      </div>
                    </div>

                    {/* GPS Coordinates */}
                    {selectedDriver.lat && selectedDriver.lng && (
                      <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>{lang === 'km' ? 'កូអរដោនេ GPS' : 'GPS Coordinates'}</div>
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
                          {copiedCoord ? (lang === 'km' ? 'បានចម្លង!' : 'Copied!') : (lang === 'km' ? 'ចម្លង' : 'Copy')}
                        </button>
                      </div>
                    )}

                    {/* Active Parcels List */}
                    {selectedDriver.activeParcelCodes && selectedDriver.activeParcelCodes.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                          {lang === 'km' ? `កញ្ចប់ឥវ៉ាន់កំពុងកាន់ (${selectedDriver.activeParcelCodes.length}) ៖` : `Active Parcels (${selectedDriver.activeParcelCodes.length}):`}
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
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
                    {selectedDriver.driverPhone ? (
                      <a
                        href={`tel:${selectedDriver.driverPhone}`}
                        style={{
                          flex: 1,
                          padding: '9px',
                          borderRadius: 8,
                          background: 'var(--accent, #1565D8)',
                          color: '#ffffff',
                          textDecoration: 'none',
                          fontSize: 12.5,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <MdPhone size={16} />
                        <span>{lang === 'km' ? `ខល: ${selectedDriver.driverPhone}` : `Call: ${selectedDriver.driverPhone}`}</span>
                      </a>
                    ) : (
                      <div style={{ flex: 1, padding: '9px', borderRadius: 8, background: '#f1f5f9', color: '#94a3b8', fontSize: 12, textAlign: 'center', fontWeight: 700 }}>
                        {lang === 'km' ? 'គ្មានលេខទូរស័ព្ទ' : 'No phone number'}
                      </div>
                    )}

                    <button
                      onClick={() => handleFocusDriver(selectedDriver)}
                      style={{
                        padding: '0 14px',
                        borderRadius: 8,
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={lang === 'km' ? 'ពង្រីកមើលទីតាំងលើផែនទី' : 'Focus on map'}
                    >
                      <MdGpsFixed size={18} color="var(--accent, #1565D8)" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Driver List View */
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Search Bar */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder={lang === 'km' ? 'ស្វែងរក Driver តាមឈ្មោះ ឬលេខ...' : 'Search driver by name or phone...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 30px 8px 32px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          fontSize: 12.5,
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: '#f8fafc',
                          color: '#0f172a',
                        }}
                      />
                      <MdSearch size={18} color="#94a3b8" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
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
                  <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                    {filteredDrivers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 10px' }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          {loading ? (lang === 'km' ? 'កំពុងទាញយក...' : 'Loading...') : (lang === 'km' ? 'មិនមាន Driver ក្នុងបញ្ជី' : 'No drivers found')}
                        </div>
                        <p style={{ fontSize: 11.5, color: '#64748b', margin: '0 0 14px' }}>
                          {lang === 'km' ? 'ចុចប៊ូតុង "តេស្តចលនា" ដើម្បីមើលការបង្ហាញ' : 'Click "Simulate GPS" to test fleet tracking'}
                        </p>
                        <button
                          onClick={handleSimulateGPS}
                          style={{
                            background: 'var(--accent, #1565D8)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {lang === 'km' ? 'តេស្តចលនា GPS' : 'Simulate GPS'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {filteredDrivers.map((d) => {
                          const isSelected = selectedDriver?.driverId === d.driverId;
                          const isOnline = d.isOnline;
                          const isDelivering = isOnline && d.activeParcelCodes?.length > 0;
                          const statusColor = isDelivering ? '#2563eb' : isOnline ? '#10b981' : '#64748b';
                          const statusBg = isDelivering ? '#eff6ff' : isOnline ? '#ecfdf5' : '#f8fafc';
                          const statusLabel = isDelivering 
                            ? (lang === 'km' ? 'កំពុងដឹក' : 'Delivering') 
                            : isOnline 
                            ? (lang === 'km' ? 'ទំនេរ' : 'Free') 
                            : (lang === 'km' ? 'Offline' : 'Offline');

                          return (
                            <div
                              key={d.driverId}
                              onClick={() => handleFocusDriver(d)}
                              style={{
                                padding: '9px 11px',
                                borderRadius: 10,
                                background: isSelected ? '#eff6ff' : '#ffffff',
                                border: `1px solid ${isSelected ? 'var(--accent, #1565D8)' : '#e2e8f0'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                boxShadow: isSelected ? '0 1px 4px rgba(37,99,235,0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                  <div
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: '50%',
                                      background: statusBg,
                                      color: statusColor,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: `1.5px solid ${statusColor}33`,
                                    }}
                                  >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.18c.41 1.16 1.51 2 2.82 2 1.66 0 3-1.34 3-3h2v-5l-3-3zm-12 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm11 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                                    </svg>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
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
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: 6,
                                    background: statusBg,
                                    color: statusColor,
                                    border: `1px solid ${statusColor}22`,
                                  }}
                                >
                                  ● {statusLabel}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, paddingTop: 5, borderTop: '1px solid #f8fafc', fontSize: 11, color: '#64748b' }}>
                                <span>{isOnline ? `${d.speed || 0} km/h` : (lang === 'km' ? 'ក្រៅបណ្តាញ' : 'Offline')}</span>
                                <span style={{ fontWeight: 700, color: d.activeParcelCodes?.length ? '#2563eb' : '#94a3b8' }}>
                                  {d.activeParcelCodes?.length || 0} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}
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

          {/* RIGHT MAP AREA: 100% visible, clean and unblocked */}
          <div style={{ flex: 1, position: 'relative', height: '100%' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#e2e8f0' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
