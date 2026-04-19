import { useEffect, useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../lib/api';
import { getDb } from '../lib/db';
import type { FamilyMember } from '@wsb/shared';

export default function FamilyWallet() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [slideshow, setSlideshow] = useState(false);
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef(0);
  const slideshowTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const db = await getDb();

      // Try cache first
      const cached = await db.getAll('familyMembers');
      if (cached.length && !cancelled) setMembers(cached);

      try {
        const { members: m } = await apiClient<{ family_id: string; members: FamilyMember[] }>(
          '/api/v1/travelers/me/family',
        );
        if (!cancelled) {
          setMembers(m);
          // Cache all members
          const tx = db.transaction('familyMembers', 'readwrite');
          await tx.store.clear();
          for (const member of m) {
            await tx.store.put(member);
          }
          await tx.done;
        }
      } catch {
        // use cached
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Slideshow auto-cycle
  useEffect(() => {
    if (slideshow && selectedIndex !== null && members.length > 1) {
      slideshowTimer.current = setInterval(() => {
        setSelectedIndex((prev) => ((prev ?? 0) + 1) % members.length);
      }, 5000);
    }
    return () => {
      if (slideshowTimer.current) clearInterval(slideshowTimer.current);
    };
  }, [slideshow, selectedIndex, members.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (selectedIndex === null) return;
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      const threshold = 50;
      if (diff > threshold) {
        // Swipe right — previous
        setSelectedIndex((prev) => ((prev ?? 0) - 1 + members.length) % members.length);
      } else if (diff < -threshold) {
        // Swipe left — next
        setSelectedIndex((prev) => ((prev ?? 0) + 1) % members.length);
      }
    },
    [selectedIndex, members.length],
  );

  if (loading && !members.length) {
    return <div className="family-page" role="status" aria-label="Loading family wallet">Loading…</div>;
  }

  if (!members.length) {
    return <div className="family-page" role="status">No family members linked.</div>;
  }

  // Full-screen QR view for selected member
  if (selectedIndex !== null) {
    const member = members[selectedIndex];
    return (
      <div
        className="family-qr-fullscreen"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label={`QR code for ${member.full_name}`}
      >
        <div className="family-qr-header">
          <button
            className="family-qr-back"
            onClick={() => { setSelectedIndex(null); setSlideshow(false); }}
            aria-label="Back to family list"
          >
            ← Back
          </button>
          <button
            className={`family-slideshow-btn${slideshow ? ' active' : ''}`}
            onClick={() => setSlideshow((s) => !s)}
            aria-label={slideshow ? 'Stop slideshow' : 'Start slideshow'}
            aria-pressed={slideshow}
          >
            {slideshow ? '⏸ Pause' : '▶ Slideshow'}
          </button>
        </div>

        <div className="family-qr-body">
          <div className="qr-code-wrapper" aria-label={`QR code for ${member.full_name}`}>
            <QRCodeSVG value={member.qr_token_value} size={280} level="H" bgColor="#ffffff" fgColor="#000000" />
          </div>
          <p className="qr-name">{member.full_name}</p>
          <p className="qr-role">{member.role_type}</p>
          <p className="family-position" aria-live="polite">
            {selectedIndex + 1} of {members.length}
          </p>
        </div>
      </div>
    );
  }

  // Member list view
  return (
    <div className="family-page">
      <h1 className="family-title">Family Wallet</h1>
      <ul className="family-list" aria-label="Family members">
        {members.map((m, i) => (
          <li key={m.traveler_id}>
            <button
              className="family-member-card"
              onClick={() => setSelectedIndex(i)}
              aria-label={`Show QR for ${m.full_name}`}
            >
              <span className="family-avatar" aria-hidden="true">
                {m.full_name.charAt(0).toUpperCase()}
              </span>
              <div className="family-member-info">
                <span className="family-member-name">{m.full_name}</span>
                <span className="family-member-role">{m.role_type}</span>
              </div>
              <span className="family-member-arrow" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
