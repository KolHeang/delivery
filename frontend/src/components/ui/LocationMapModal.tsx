'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MdClose,
  MdGpsFixed,
  MdSearch,
  MdLocationOn,
  MdCheck,
  MdLink,
  MdContentPaste,
  MdOpenInNew,
  MdLayers,
} from 'react-icons/md';
import { parseMapLinkOrCoords, isShortGoogleMapsUrl, getGoogleMapsUrl } from '@/lib/geo-util';
import api from '@/lib/api';

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: { address: string; lat: number; lng: number }) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  lang?: string;
}

type MapLayerType = 'google' | 'satellite' | 'osm';

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
  const tileLayerRef = useRef<any>(null);
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
  const [resolvingLink, setResolvingLink] = useState<boolean>(false);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('google');
  const [linkSuccessMsg, setLinkSuccessMsg] = useState<string | null>(null);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      const lat = initialLat && !isNaN(initialLat) ? initialLat : 11.5564;
      const lng = initialLng && !isNaN(initialLng) ? initialLng : 104.9282;
      setCurrentPos({ lat, lng });
      setAddress(initialAddress || '');
      setSearchQuery('');
      setSearchResults([]);
      setLinkSuccessMsg(null);
    }
  }, [isOpen, initialLat, initialLng, initialAddress]);

  // Reverse geocode via Nominatim with fallback
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
          return;
        }
      }
    } catch (e) {
      console.warn('Reverse geocode error:', e);
    } finally {
      setLoadingAddress(false);
    }

    // Fallback if reverse geocode fails or returns empty
    if (!address) {
      setAddress(
        lang === 'km'
          ? `ទីតាំងលើផែនទី (${lat.toFixed(5)}, ${lng.toFixed(5)})`
          : `Map Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`
      );
    }
  };

  // Move marker and map
  const moveToLocation = (lat: number, lng: number, zoom = 16, shouldFetchAddress = true) => {
    setCurrentPos({ lat, lng });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], zoom);
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (shouldFetchAddress) {
      fetchAddress(lat, lng);
    }
  };

  // Process and handle pasted or typed input (Links, Coords, Places)
  const processInputQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    // 1. Direct coordinates or standard Google Maps link
    const parsed = parseMapLinkOrCoords(trimmed);
    if (parsed) {
      setSearchResults([]);
      moveToLocation(parsed.lat, parsed.lng, 17, true);
      setLinkSuccessMsg(
        lang === 'km'
          ? `✓ បានកំណត់ទីតាំងតាម Link/កូអរដោនេ (${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)})`
          : `✓ Location set from Link/Coords (${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)})`
      );
      return;
    }

    // 2. Shortened link (e.g. maps.app.goo.gl)
    if (isShortGoogleMapsUrl(trimmed)) {
      setResolvingLink(true);
      try {
        const res = await api.post('/settings/resolve-map-link', { url: trimmed });
        if (res.data && res.data.lat && res.data.lng) {
          const lat = parseFloat(res.data.lat);
          const lng = parseFloat(res.data.lng);
          moveToLocation(lat, lng, 17, true);
          setSearchResults([]);
          setLinkSuccessMsg(
            lang === 'km'
              ? `✓ បានភ្ជាប់ Google Maps Link ជោគជ័យ (${lat.toFixed(5)}, ${lng.toFixed(5)})`
              : `✓ Resolved Google Maps link (${lat.toFixed(5)}, ${lng.toFixed(5)})`
          );
          setResolvingLink(false);
          return;
        }
      } catch (err) {
        console.warn('Failed to resolve map link via server:', err);
      } finally {
        setResolvingLink(false);
      }
    }

    // 3. Fallback: Search place name via Nominatim
    setSearching(true);
    setLinkSuccessMsg(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          trimmed
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
      console.warn('Search places error:', e);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    processInputQuery(searchQuery);
  };

  const handleSelectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      moveToLocation(lat, lng, 16, false);
      setAddress(item.display_name);
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  // Current GPS Location
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
        moveToLocation(lat, lng, 17, true);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        alert(
          lang === 'km'
            ? 'មិនអាចទាញទីតាំងបច្ចុប្បន្នបានទេ សូមពិនិត្យសិទ្ធិ GPS'
            : 'Failed to get current location. Please check GPS permissions.'
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setSearchQuery(text);
          processInputQuery(text);
        }
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  // Switch Tile Layer
  const setTileLayer = (layer: MapLayerType, mapInstance: any, L: any) => {
    if (tileLayerRef.current) {
      mapInstance.removeLayer(tileLayerRef.current);
    }

    let url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    let maxZoom = 20;
    let attribution = '&copy; Google Maps';

    if (layer === 'satellite') {
      url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Satellite';
    } else if (layer === 'osm') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      maxZoom = 19;
      attribution = '&copy; OpenStreetMap contributors';
    }

    const newTile = L.tileLayer(url, { maxZoom, attribution }).addTo(mapInstance);
    tileLayerRef.current = newTile;
    setMapLayer(layer);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen) return;
    let isSubscribed = true;

    import('leaflet').then((L) => {
      if (!isSubscribed || !mapContainerRef.current) return;

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [currentPos.lat, currentPos.lng],
          zoom: 15,
          zoomControl: false,
        });

        // Add zoom control at bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Google Maps Roads default
        setTileLayer('google', map, L);

        // Custom High-Res Modern SVG Pin
        const customIcon = L.divIcon({
          className: 'modern-map-marker',
          html: `
            <div style="position: relative; width: 38px; height: 48px; display: flex; align-items: center; justify-content: center; cursor: grab;">
              <svg width="38" height="48" viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 12px rgba(0,0,0,0.35));">
                <path d="M19 0C8.5 0 0 8.5 0 19C0 32.5 19 48 19 48C19 48 38 32.5 38 19C38 8.5 29.5 0 19 0Z" fill="#ef4444"/>
                <circle cx="19" cy="19" r="8" fill="#ffffff"/>
                <circle cx="19" cy="19" r="4" fill="#ef4444"/>
              </svg>
            </div>
          `,
          iconSize: [38, 48],
          iconAnchor: [19, 48],
        });

        const marker = L.marker([currentPos.lat, currentPos.lng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', (e: any) => {
          const latlng = e.target.getLatLng();
          setCurrentPos({ lat: latlng.lat, lng: latlng.lng });
          setLinkSuccessMsg(null);
          fetchAddress(latlng.lat, latlng.lng);
        });

        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setCurrentPos({ lat, lng });
          marker.setLatLng([lat, lng]);
          setLinkSuccessMsg(null);
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
        tileLayerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      <div
        style={{
          width: '100%',
          maxWidth: 920,
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Modern Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                border: '1px solid #bfdbfe',
              }}
            >
              🗺️
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                {lang === 'km' ? 'ជ្រើសរើសទីតាំងលើផែនទី (Select on Map)' : 'Select Location on Map'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                {lang === 'km'
                  ? 'ចុចលើផែនទី, អូស Pin ឬ Paste Link Google Maps ដើម្បីកំណត់ទីតាំង'
                  : 'Click on map, drag pin or paste Google Maps link to pick location'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* Smart Search & Paste Link Bar */}
        <div
          style={{
            padding: '12px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            position: 'relative',
          }}
        >
          <form
            onSubmit={handleSearchSubmit}
            style={{ flex: '1 1 320px', display: 'flex', alignItems: 'center', position: 'relative' }}
          >
            <MdSearch
              style={{
                position: 'absolute',
                left: 12,
                color: '#94a3b8',
                fontSize: 20,
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder={
                lang === 'km'
                  ? 'ស្វែងរកទីតាំង ឬ paste Google Maps Link / កូអរដោនេ (lat, lng)...'
                  : 'Search place or paste Google Maps link / coordinates...'
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Instant auto-detection when pasting link or coords
                const parsed = parseMapLinkOrCoords(e.target.value);
                if (parsed) {
                  processInputQuery(e.target.value);
                }
              }}
              style={{
                width: '100%',
                paddingLeft: 38,
                paddingRight: 10,
                height: 40,
                fontSize: 13,
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#0f172a',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={searching || resolvingLink}
              style={{
                marginLeft: 8,
                height: 40,
                padding: '0 16px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--sidebar-bg, #1565D8)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {searching || resolvingLink ? (
                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              ) : (
                <MdSearch size={16} />
              )}
              <span>
                {resolvingLink
                  ? (lang === 'km' ? 'កំពុងទាញ Link...' : 'Resolving Link...')
                  : searching
                    ? (lang === 'km' ? 'កំពុងរក...' : 'Searching...')
                    : (lang === 'km' ? 'ស្វែងរក / ភ្ជាប់ Link' : 'Search / Link')}
              </span>
            </button>
          </form>

          {/* Quick Paste & GPS Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handlePasteClipboard}
              style={{
                height: 40,
                padding: '0 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
              }}
              title={lang === 'km' ? 'Paste ពី Clipboard' : 'Paste from clipboard'}
            >
              <MdContentPaste size={16} color="#64748b" />
              <span>{lang === 'km' ? 'Paste Link' : 'Paste'}</span>
            </button>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              style={{
                height: 40,
                padding: '0 14px',
                borderRadius: 10,
                border: '1px solid #bae6fd',
                background: '#eff6ff',
                color: '#0284c7',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
              title={lang === 'km' ? 'ប្រើទីតាំង GPS បច្ចុប្បន្ន' : 'Use Current GPS'}
            >
              <MdGpsFixed size={16} className={locating ? 'spinner' : ''} />
              <span>{locating ? (lang === 'km' ? 'កំពុងទាញ...' : 'Locating...') : (lang === 'km' ? 'ទីតាំងបច្ចុប្បន្ន' : 'My GPS')}</span>
            </button>
          </div>

          {/* Search results popup dropdown */}
          {searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 18,
                right: 18,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 12,
                boxShadow: '0 15px 25px -5px rgba(0, 0, 0, 0.15)',
                zIndex: 10000,
                maxHeight: 240,
                overflowY: 'auto',
                marginTop: 4,
              }}
            >
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSearchResult(item)}
                  style={{
                    padding: '10px 16px',
                    borderBottom: idx < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <MdLocationOn style={{ color: '#ef4444', flexShrink: 0 }} size={18} />
                  <span style={{ color: '#0f172a' }}>{item.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map View Area */}
        <div style={{ position: 'relative', flex: 1, minHeight: 400 }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 400 }} />

          {/* Top-Right Map Layer Controls */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 999,
              display: 'inline-flex',
              background: '#ffffff',
              borderRadius: 10,
              padding: 3,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0',
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  import('leaflet').then((L) => setTileLayer('google', mapInstanceRef.current, L));
                }
              }}
              style={{
                border: 'none',
                background: mapLayer === 'google' ? 'var(--sidebar-bg, #1565D8)' : 'transparent',
                color: mapLayer === 'google' ? '#ffffff' : '#475569',
                padding: '5px 10px',
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Google Roads
            </button>
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  import('leaflet').then((L) => setTileLayer('satellite', mapInstanceRef.current, L));
                }
              }}
              style={{
                border: 'none',
                background: mapLayer === 'satellite' ? 'var(--sidebar-bg, #1565D8)' : 'transparent',
                color: mapLayer === 'satellite' ? '#ffffff' : '#475569',
                padding: '5px 10px',
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  import('leaflet').then((L) => setTileLayer('osm', mapInstanceRef.current, L));
                }
              }}
              style={{
                border: 'none',
                background: mapLayer === 'osm' ? 'var(--sidebar-bg, #1565D8)' : 'transparent',
                color: mapLayer === 'osm' ? '#ffffff' : '#475569',
                padding: '5px 10px',
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              OSM
            </button>
          </div>

          {/* Loading indicator floating badge */}
          {loadingAddress && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.85)',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              <span>{lang === 'km' ? 'កំពុងកំណត់អាសយដ្ឋាន...' : 'Resolving address...'}</span>
            </div>
          )}

          {/* Link success floating alert */}
          {linkSuccessMsg && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                zIndex: 999,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            >
              {linkSuccessMsg}
            </div>
          )}
        </div>

        {/* Bottom Card / Editable Address & Action Confirmation */}
        <div
          style={{
            padding: '16px 22px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {/* Left: Coordinates & Editable Address */}
          <div style={{ flex: '1 1 360px', minWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                📍 {lang === 'km' ? 'កូអរដោនេ GPS៖' : 'GPS Coordinates:'}
              </span>
              <span
                style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  color: '#2563eb',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                }}
              >
                {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}
              </span>

              <a
                href={getGoogleMapsUrl(currentPos.lat, currentPos.lng)}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 11.5,
                  color: '#4f46e5',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <span>Google Maps</span>
                <MdOpenInNew size={13} />
              </a>
            </div>

            {/* Editable address field */}
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={
                lang === 'km'
                  ? 'ឈ្មោះទីតាំង / ផ្ទះលេខ / ផ្លូវ (អាចកែប្រែបន្ថែមបាន)...'
                  : 'Place name, street, house number (editable)...'
              }
              style={{
                width: '100%',
                height: 38,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Right: Confirmation buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{
                padding: '9px 20px',
                fontWeight: 700,
                fontSize: 13,
                borderRadius: 10,
              }}
            >
              {lang === 'km' ? 'បោះបង់' : 'Cancel'}
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const finalAddr =
                  address.trim() ||
                  (lang === 'km'
                    ? `ទីតាំងលើផែនទី (${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)})`
                    : `Map Location (${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)})`);
                onSelect({
                  address: finalAddr,
                  lat: currentPos.lat,
                  lng: currentPos.lng,
                });
                onClose();
              }}
              style={{
                padding: '9px 24px',
                fontWeight: 800,
                fontSize: 13.5,
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                cursor: 'pointer',
              }}
            >
              <MdCheck size={18} />
              <span>{lang === 'km' ? 'ជ្រើសរើសទីតាំងនេះ' : 'Confirm Location'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
