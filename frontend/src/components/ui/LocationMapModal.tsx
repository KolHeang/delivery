'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MdClose, MdGpsFixed, MdSearch, MdLocationOn, MdCheck } from 'react-icons/md';

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: { address: string; lat: number; lng: number }) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  lang?: string;
}

export default function LocationMapModal({
  isOpen,
  onClose,
  onSelect,
  initialLat,
  initialLng,
  initialAddress = '',
  lang = 'km',
}: LocationMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const defaultLat = initialLat && !isNaN(initialLat) ? initialLat : 11.5564;
  const defaultLng = initialLng && !isNaN(initialLng) ? initialLng : 104.9282;

  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number }>({
    lat: defaultLat,
    lng: defaultLng,
  });
  const [address, setAddress] = useState<string>(initialAddress);
  const [loadingAddress, setLoadingAddress] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [locating, setLocating] = useState<boolean>(false);

  // Reverse geocode via Nominatim
  const fetchAddress = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': lang === 'km' ? 'km,en' : 'en',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          // Format cleaner address
          const a = data.address || {};
          const parts = [
            a.house_number ? `No. ${a.house_number}` : '',
            a.road || a.pedestrian || '',
            a.suburb || a.neighbourhood || a.quarter || '',
            a.city_district || a.district || '',
            a.city || a.town || a.state || 'Phnom Penh',
          ].filter(Boolean);

          const formatted = parts.length > 0 ? parts.join(', ') : data.display_name;
          setAddress(formatted);
        }
      }
    } catch (e) {
      console.error('Reverse geocode error:', e);
    } finally {
      setLoadingAddress(false);
    }
  };

  // Search places via Nominatim
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&countrycodes=kh&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': lang === 'km' ? 'km,en' : 'en',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
      }
    } catch (e) {
      console.error('Search places error:', e);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      setCurrentPos({ lat, lng });
      setAddress(item.display_name);
      setSearchResults([]);
      setSearchQuery('');

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 16);
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }
  };

  // Handle current GPS location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(lang === 'km' ? 'ឧបករណ៍មិនគាំទ្រ GPS ទេ' : 'Geolocation is not supported');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentPos({ lat, lng });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
        fetchAddress(lat, lng);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        alert(lang === 'km' ? 'មិនអាចទាញទីតាំងបច្ចុប្បន្នបានទេ សូមពិនិត្យសិទ្ធិ GPS' : 'Failed to get current location');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Initialize Map
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;

    // Load Leaflet dynamically
    import('leaflet').then((L) => {
      if (!isSubscribed || !mapContainerRef.current) return;

      // Fix Leaflet default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [currentPos.lat, currentPos.lng],
          zoom: 14,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Custom red pin
        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            background: #ef4444;
            color: #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.45);
            border: 2px solid #ffffff;
          ">
            <span style="transform: rotate(45deg); font-size: 18px; line-height: 1;">📍</span>
          </div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 38],
        });

        const marker = L.marker([currentPos.lat, currentPos.lng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', (e: any) => {
          const latlng = e.target.getLatLng();
          setCurrentPos({ lat: latlng.lat, lng: latlng.lng });
          fetchAddress(latlng.lat, latlng.lng);
        });

        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setCurrentPos({ lat, lng });
          marker.setLatLng([lat, lng]);
          fetchAddress(lat, lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        setTimeout(() => {
          map.invalidateSize();
        }, 200);

        if (!address) {
          fetchAddress(currentPos.lat, currentPos.lng);
        }
      }
    });

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      <div
        style={{
          width: '100%',
          maxWidth: 880,
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🗺️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                {lang === 'km' ? 'ជ្រើសរើសទីតាំងលើផែនទី (Select on Map)' : 'Select Location on Map'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {lang === 'km'
                  ? 'ចុច ឬអូស Pin ទៅកាន់ទីតាំងជាក់ស្តែងរបស់ហាង'
                  : 'Click or drag pin to the exact merchant location'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ borderRadius: '50%', color: '#64748b' }}
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Search & Action Bar */}
        <div
          style={{
            padding: '10px 16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            position: 'relative',
          }}
        >
          <form
            onSubmit={handleSearch}
            style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}
          >
            <MdSearch
              style={{
                position: 'absolute',
                left: 12,
                color: '#94a3b8',
                fontSize: 18,
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="form-control"
              placeholder={
                lang === 'km'
                  ? 'ស្វែងរកទីតាំង (ឧ. ទួលគោក, ផ្សារទំនើបអុីអន...)'
                  : 'Search location (e.g. Tuol Kork, Aeon Mall...)'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: 38,
                height: 38,
                fontSize: 13,
                background: '#ffffff',
              }}
            />
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
              disabled={searching}
              style={{ marginLeft: 6, height: 38, padding: '0 14px', fontSize: 12.5 }}
            >
              {searching ? (lang === 'km' ? 'កំពុងរក...' : 'Searching...') : (lang === 'km' ? 'ស្វែងរក' : 'Search')}
            </button>
          </form>

          {/* Current GPS button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="btn btn-outline btn-sm"
            style={{
              height: 38,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              color: '#0284c7',
              borderColor: '#bae6fd',
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
            title={lang === 'km' ? 'ប្រើទីតាំង GPS បច្ចុប្បន្ន' : 'Use Current GPS'}
          >
            <MdGpsFixed size={16} />
            {locating ? (lang === 'km' ? 'កំពុងទាញ GPS...' : 'Locating...') : (lang === 'km' ? 'ទីតាំងបច្ចុប្បន្ន' : 'Current GPS')}
          </button>

          {/* Search results popup dropdown */}
          {searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 16,
                right: 16,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                maxHeight: 220,
                overflowY: 'auto',
                marginTop: 4,
              }}
            >
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSearchResult(item)}
                  style={{
                    padding: '9px 14px',
                    borderBottom: idx < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <MdLocationOn style={{ color: '#ef4444', flexShrink: 0 }} size={16} />
                  <span style={{ color: '#0f172a' }}>{item.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div style={{ position: 'relative', flex: 1, minHeight: 380 }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 380 }} />
          {loadingAddress && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              {lang === 'km' ? 'កំពុងកំណត់អាសយដ្ឋាន...' : 'Resolving address...'}
            </div>
          )}
        </div>

        {/* Footer / Selected Address Display */}
        <div
          style={{
            padding: '14px 20px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <div style={{ flex: '1 1 320px', minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                📍 {lang === 'km' ? 'អាសយដ្ឋានដែលបានរើស៖' : 'Selected Address:'}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: '#f1f5f9',
                  color: '#475569',
                  fontFamily: 'monospace',
                }}
              >
                {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}
              </span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: address ? '#0f172a' : '#94a3b8',
                lineHeight: 1.4,
                fontWeight: address ? 500 : 400,
                wordBreak: 'break-word',
              }}
            >
              {address || (lang === 'km' ? 'សូមចុចលើផែនទីដើម្បីជ្រើសរើសទីតាំង' : 'Click on map to select location')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '8px 18px', fontWeight: 600, fontSize: 13 }}
            >
              {lang === 'km' ? 'បោះបង់' : 'Cancel'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loadingAddress || !address}
              onClick={() => {
                onSelect({
                  address: address.trim(),
                  lat: currentPos.lat,
                  lng: currentPos.lng,
                });
                onClose();
              }}
              style={{
                padding: '8px 22px',
                fontWeight: 700,
                fontSize: 13,
                background: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <MdCheck size={18} />
              {lang === 'km' ? 'ជ្រើសរើសទីតាំងនេះ' : 'Confirm Location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
