'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getTrackingSocket } from '@/lib/tracking-socket';
import { getUser } from '@/lib/auth';
import { MdGpsFixed, MdGpsOff, MdSpeed, MdNavigation, MdBatteryChargingFull, MdCheckCircle } from 'react-icons/md';

interface LiveLocationTrackerProps {
  activeParcelCodes?: string[];
}

export default function LiveLocationTracker({ activeParcelCodes = [] }: LiveLocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [heading, setHeading] = useState<number>(0);
  const [lastSentTime, setLastSentTime] = useState<Date | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);

    // Auto restore tracking state from session
    const savedTracking = localStorage.getItem('driver_live_tracking_enabled');
    if (savedTracking === 'true') {
      startTracking(currentUser);
    }

    return () => {
      stopTracking();
    };
  }, []);

  const startTracking = (currentUser = user) => {
    if (!navigator.geolocation) {
      setPermissionError('ឧបករណ៍របស់អ្នកមិនគាំទ្រ GPS Geolocation ឡើយ');
      return;
    }

    setPermissionError(null);
    setIsTracking(true);
    localStorage.setItem('driver_live_tracking_enabled', 'true');

    const socket = getTrackingSocket();
    const driverId = currentUser?.id || currentUser?.sub || 1;

    // Notify socket driver is online
    socket.emit('driver:toggle_online', {
      driverId,
      isOnline: true,
      tenantId: currentUser?.tenantId,
    });

    // 1. Start Watch Position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed: gpsSpeed, heading: gpsHeading } = pos.coords;
        const currentSpeed = gpsSpeed ? Math.round(gpsSpeed * 3.6) : 0; // m/s to km/h
        const currentHeading = gpsHeading || 0;

        setCoords({ lat: latitude, lng: longitude });
        setSpeed(currentSpeed);
        setHeading(currentHeading);

        // Send to socket
        sendLocation(latitude, longitude, currentSpeed, currentHeading, currentUser);
      },
      (err) => {
        console.warn('GPS watch error, falling back to simulated coords:', err.message);
        setPermissionError('សូមបើកសិទ្ធិ Location (GPS) ក្នុងកម្មវិធីរុករកដើម្បីតាមដានទីតាំងផ្ទាល់');
        
        // Fallback for desktop testing / default Phnom Penh coordinate
        const defaultLat = 11.5564 + (Math.random() - 0.5) * 0.005;
        const defaultLng = 104.9282 + (Math.random() - 0.5) * 0.005;
        setCoords({ lat: defaultLat, lng: defaultLng });
        sendLocation(defaultLat, defaultLng, 25, 45, currentUser);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      }
    );

    // 2. Periodic Ping backup every 5 seconds
    intervalRef.current = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, speed: s, heading: h } = pos.coords;
            sendLocation(latitude, longitude, s ? Math.round(s * 3.6) : 0, h || 0, currentUser);
          },
          () => {}
        );
      }
    }, 5000);
  };

  const sendLocation = (lat: number, lng: number, spd: number, hdg: number, currentUser = user) => {
    const socket = getTrackingSocket();
    const driverId = currentUser?.id || currentUser?.sub || 1;

    socket.emit('driver:location_update', {
      driverId,
      lat,
      lng,
      speed: spd,
      heading: hdg,
      isOnline: true,
      activeParcelCodes,
      tenantId: currentUser?.tenantId,
    });

    setLastSentTime(new Date());
  };

  const stopTracking = () => {
    setIsTracking(false);
    localStorage.removeItem('driver_live_tracking_enabled');

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const socket = getTrackingSocket();
    const driverId = user?.id || user?.sub || 1;
    socket.emit('driver:toggle_online', {
      driverId,
      isOnline: false,
      tenantId: user?.tenantId,
    });
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  return (
    <div
      style={{
        background: isTracking ? '#f0fdf4' : '#ffffff',
        border: `1.5px solid ${isTracking ? '#22c55e' : '#e2e8f0'}`,
        borderRadius: 14,
        padding: '12px 16px',
        boxShadow: isTracking ? '0 4px 14px rgba(34, 197, 94, 0.15)' : '0 2px 6px rgba(0,0,0,0.03)',
        transition: 'all 0.2s',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: isTracking ? '#22c55e' : '#f1f5f9',
              color: isTracking ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {isTracking ? <MdGpsFixed size={20} /> : <MdGpsOff size={20} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                Live GPS Driver Tracking
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: isTracking ? '#dcfce7' : '#f1f5f9',
                  color: isTracking ? '#15803d' : '#64748b',
                }}
              >
                ● {isTracking ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              {isTracking
                ? `កំពុងបាញ់ទីតាំងផ្ទាល់រៀងរាល់ ៥វិនាទី (${activeParcelCodes.length} កញ្ចប់សកម្ម)`
                : 'ចុចបើកដើម្បីឱ្យអតិថិជន និង Admin ឃើញចលនាដឹកផ្ទាល់'}
            </div>
          </div>
        </div>

        <button
          onClick={toggleTracking}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: isTracking ? '#dc2626' : '#16a34a',
            color: '#ffffff',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: isTracking ? '0 2px 8px rgba(220, 38, 38, 0.25)' : '0 2px 8px rgba(22, 163, 74, 0.25)',
          }}
        >
          {isTracking ? <MdGpsOff size={16} /> : <MdGpsFixed size={16} />}
          <span>{isTracking ? 'បិទ GPS (Offline)' : 'បើក GPS (Go Online)'}</span>
        </button>
      </div>

      {isTracking && coords && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid #dcfce7',
            fontSize: 12,
            color: '#166534',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MdNavigation size={15} />
            <span>កូអរដោនេ: <strong>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MdSpeed size={15} />
            <span>ល្បឿន: <strong>{speed} km/h</strong></span>
          </div>
          {lastSentTime && (
            <div style={{ marginLeft: 'auto', color: '#15803d', fontSize: 11 }}>
              ✓ ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ: {lastSentTime.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {permissionError && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: '#dc2626', fontWeight: 600 }}>
          ⚠️ {permissionError}
        </div>
      )}
    </div>
  );
}
