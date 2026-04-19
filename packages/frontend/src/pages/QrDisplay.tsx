import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../lib/api';
import { getDb } from '../lib/db';
import type { TravelerProfile } from '@wsb/shared';

export default function QrDisplay() {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<TravelerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Acquire wake lock to keep screen on
  useEffect(() => {
    async function acquireWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Wake lock not supported or denied
      }
    }
    acquireWakeLock();

    // Re-acquire on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  // Load QR token and profile
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const db = await getDb();

      // Try cache first
      const cachedToken = await db.get('qrToken', 'me');
      const cachedProfile = await db.get('profile', 'me');
      if (cachedToken && !cancelled) setQrToken(cachedToken.token_value);
      if (cachedProfile && !cancelled) setProfile(cachedProfile);

      try {
        const p = await apiClient<TravelerProfile>('/api/v1/travelers/me');
        if (!cancelled) {
          setProfile(p);
          setQrToken(p.qr_token);
          await db.put('profile', p, 'me');
          await db.put('qrToken', { token_value: p.qr_token, traveler_name: p.full_name }, 'me');
        }
      } catch {
        // use cached data
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading && !qrToken) {
    return <div className="qr-page" role="status" aria-label="Loading QR code">Loading…</div>;
  }

  if (!qrToken) {
    return <div className="qr-page" role="alert">No QR code available. Please sync when online.</div>;
  }

  const groupName = profile?.group_ids?.length ? `Group ${profile.group_ids[0].slice(0, 8)}` : '';

  return (
    <div className="qr-page" aria-label="QR code display">
      <div className="qr-container">
        <div className="qr-code-wrapper" aria-label={`QR code for ${profile?.full_name ?? 'traveler'}`}>
          <QRCodeSVG
            value={qrToken}
            size={280}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <div className="qr-info">
          <p className="qr-name">{profile?.full_name ?? ''}</p>
          <p className="qr-role">{profile?.role_type ?? ''}</p>
          {groupName && <p className="qr-group">{groupName}</p>}
        </div>
      </div>
    </div>
  );
}
