import { useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../lib/api';
import type { SearchCandidate, TravelerProfile, ItineraryEvent } from '@wsb/shared';

export default function StaffRescue() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'email'>('name');
  const [candidates, setCandidates] = useState<SearchCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<TravelerProfile | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryEvent[]>([]);
  const [showQr, setShowQr] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);

  // ─── Search ────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    const minLen = searchType === 'name' ? 2 : 3;
    if (query.trim().length < minLen) return;
    setSearching(true);
    setCandidates([]);
    setSelectedId(null);
    setProfile(null);
    setShowQr(false);
    setShowItinerary(false);
    try {
      const { candidates: results } = await apiClient<{ candidates: SearchCandidate[] }>(
        `/api/v1/staff/rescue/search?q=${encodeURIComponent(query.trim())}&type=${searchType}`,
      );
      setCandidates(results);
    } catch {
      setCandidates([]);
    } finally {
      setSearching(false);
    }
  }, [query, searchType]);

  // ─── Select candidate → load profile ──────────────────────

  async function selectCandidate(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
      setProfile(null);
      setShowQr(false);
      setShowItinerary(false);
      return;
    }
    setSelectedId(id);
    setShowQr(false);
    setShowItinerary(false);
    setResendSuccess(false);
    try {
      const p = await apiClient<TravelerProfile>(`/api/v1/staff/rescue/traveler/${id}`);
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }

  // ─── Actions ───────────────────────────────────────────────

  async function handleResendMagicLink() {
    if (!profile) return;
    setResending(true);
    setResendSuccess(false);
    try {
      await apiClient('/api/v1/staff/rescue/resend-magic-link', {
        method: 'POST',
        body: JSON.stringify({ traveler_id: profile.traveler_id }),
      });
      setResendSuccess(true);
    } catch {
      // failed
    } finally {
      setResending(false);
    }
  }

  async function handleViewItinerary() {
    if (!profile) return;
    setShowItinerary(true);
    try {
      const { events } = await apiClient<{ events: ItineraryEvent[] }>(
        `/api/v1/staff/rescue/traveler/${profile.traveler_id}/itinerary`,
      );
      setItinerary(events);
    } catch {
      setItinerary([]);
    }
  }

  function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = local.slice(0, 2);
    return `${visible}***@${domain}`;
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="rescue-page" data-testid="staff-rescue" style={{ padding: '8px 0' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px', color: 'var(--color-primary)' }}>
        Staff Rescue Console
      </h1>

      {/* Search bar with toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <button
            onClick={() => setSearchType('name')}
            style={{
              padding: '8px 14px',
              border: 'none',
              background: searchType === 'name' ? 'var(--color-accent)' : 'transparent',
              color: searchType === 'name' ? '#fff' : 'var(--color-text)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              minHeight: '44px',
            }}
            aria-label="Search by name"
            aria-pressed={searchType === 'name'}
          >
            Name
          </button>
          <button
            onClick={() => setSearchType('email')}
            style={{
              padding: '8px 14px',
              border: 'none',
              borderLeft: '1px solid var(--color-border)',
              background: searchType === 'email' ? 'var(--color-accent)' : 'transparent',
              color: searchType === 'email' ? '#fff' : 'var(--color-text)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              minHeight: '44px',
            }}
            aria-label="Search by email"
            aria-pressed={searchType === 'email'}
          >
            Email
          </button>
        </div>
        <input
          type="text"
          className="login-input"
          placeholder={searchType === 'name' ? 'Search by name…' : 'Search by email…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          aria-label={`Search ${searchType} input`}
          style={{ flex: 1 }}
        />
        <button
          className="login-btn login-btn-primary"
          style={{ width: 'auto', padding: '8px 16px' }}
          onClick={handleSearch}
          disabled={searching}
          aria-label="Search"
        >
          {searching ? '…' : '🔍'}
        </button>
      </div>

      {/* Candidate list */}
      {candidates.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {candidates.map((c) => (
            <li key={c.traveler_id}>
              <button
                onClick={() => selectCandidate(c.traveler_id)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid',
                  borderColor: selectedId === c.traveler_id ? 'var(--color-accent)' : 'var(--color-border)',
                  borderRadius: '10px',
                  background: selectedId === c.traveler_id ? '#fef2f4' : 'var(--color-bg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: '44px',
                }}
                aria-label={`Select ${c.full_name}`}
                aria-expanded={selectedId === c.traveler_id}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{c.full_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                    {maskEmail(c.email)} · {c.booking_id ?? 'No booking'}
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                  {Math.round(c.match_score * 100)}%
                </span>
              </button>

              {/* Expanded profile */}
              {selectedId === c.traveler_id && profile && (
                <div
                  style={{
                    padding: '16px',
                    border: '1px solid var(--color-border)',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    background: '#f9fafb',
                  }}
                  role="region"
                  aria-label={`Profile details for ${profile.full_name}`}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', marginBottom: '12px' }}>
                    <div><strong>Name:</strong> {profile.full_name}</div>
                    <div><strong>Email:</strong> {profile.email}</div>
                    <div><strong>Role:</strong> {profile.role_type}</div>
                    <div><strong>Status:</strong> {profile.access_status}</div>
                    <div><strong>Family:</strong> {profile.family_id ?? 'None'}</div>
                    <div><strong>Groups:</strong> {profile.group_ids?.join(', ') || 'None'}</div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="login-btn login-btn-primary"
                      style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={() => setShowQr(!showQr)}
                      aria-label="Show QR code"
                    >
                      {showQr ? 'Hide QR' : '📱 Show QR'}
                    </button>
                    <button
                      className="login-btn login-btn-secondary"
                      style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={handleResendMagicLink}
                      disabled={resending}
                      aria-label="Resend magic link"
                    >
                      {resending ? 'Sending…' : '✉️ Resend Magic Link'}
                    </button>
                    <button
                      className="login-btn login-btn-secondary"
                      style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={handleViewItinerary}
                      aria-label="View itinerary"
                    >
                      📅 View Itinerary
                    </button>
                  </div>

                  {resendSuccess && (
                    <div style={{ color: '#16a34a', fontSize: '0.85rem', marginTop: '8px', fontWeight: 600 }}>
                      ✅ Magic link sent successfully
                    </div>
                  )}

                  {/* QR display */}
                  {showQr && profile.qr_token && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px', padding: '16px', background: '#fff', borderRadius: '12px' }}>
                      <QRCodeSVG
                        value={profile.qr_token}
                        size={250}
                        level="H"
                        aria-label={`QR code for ${profile.full_name}`}
                      />
                      <div style={{ marginTop: '8px', fontWeight: 600 }}>{profile.full_name}</div>
                    </div>
                  )}

                  {/* Itinerary view */}
                  {showItinerary && (
                    <div style={{ marginTop: '16px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>Itinerary</h3>
                      {itinerary.length === 0 ? (
                        <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>No events found</div>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {itinerary.map((ev) => (
                            <li
                              key={ev.event_id}
                              style={{
                                padding: '10px 12px',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{ev.name}</div>
                              <div style={{ color: 'var(--color-muted)' }}>
                                {ev.date} · {ev.start_time} · {ev.location}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Empty state */}
      {!searching && candidates.length === 0 && query.length > 0 && (
        <div style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '32px 0' }}>
          No results found
        </div>
      )}
    </div>
  );
}
