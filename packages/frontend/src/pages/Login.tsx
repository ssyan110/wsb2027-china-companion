import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import type { MagicLinkResponse, VerifyResponse, BookingLookupResponse, RoleType } from '@wsb/shared';

type Tab = 'magic-link' | 'booking-lookup';
type VerifyStatus = 'idle' | 'verifying' | 'success' | 'expired' | 'used' | 'invalid';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface DevUser {
  traveler_id: string;
  full_name_raw: string;
  email_primary: string;
  role_type: RoleType;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((s) => s.login);

  const [activeTab, setActiveTab] = useState<Tab>('booking-lookup');
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkError, setMagicLinkError] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [lastName, setLastName] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Demo traveler accounts (non-admin only)
  const [demoTravelers, setDemoTravelers] = useState<DevUser[]>([]);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Fetch demo travelers (exclude admin/staff — those use /ops/login)
  useEffect(() => {
    fetch('/api/v1/dev/users')
      .then((r) => r.json())
      .then((d: { users: DevUser[] }) => {
        setDemoTravelers(d.users.filter((u) => !['admin', 'super_admin', 'staff', 'staff_desk'].includes(u.role_type)));
      })
      .catch(() => {});
  }, []);

  const handleDemoLogin = useCallback(async (id: string) => {
    setDemoLoading(id);
    try {
      const res = await fetch(`/api/v1/dev/login/${id}`);
      const data = await res.json() as { session_token: string; traveler_id: string; role_type: RoleType };
      login(data.session_token, data.traveler_id, data.role_type);
      navigate('/', { replace: true });
    } catch { setDemoLoading(null); }
  }, [login, navigate]);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;
    setVerifyStatus('verifying');
    apiClient<VerifyResponse>(`/api/v1/auth/magic-link/verify?token=${encodeURIComponent(token)}`)
      .then((data) => {
        setVerifyStatus('success');
        login(data.session_token, data.traveler_id, data.role_type);
        if (installPrompt) setShowInstallBanner(true);
        else navigate('/', { replace: true });
      })
      .catch((err: Error) => {
        const msg = err.message.toLowerCase();
        if (msg.includes('410') || msg.includes('expired')) setVerifyStatus('expired');
        else if (msg.includes('409') || msg.includes('used')) setVerifyStatus('used');
        else setVerifyStatus('invalid');
      });
  }, [searchParams, login, navigate, installPrompt]);

  const handleMagicLink = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setMagicLinkError(''); setMagicLinkSent(false); setMagicLinkLoading(true);
    try {
      await apiClient<MagicLinkResponse>('/api/v1/auth/magic-link', { method: 'POST', body: JSON.stringify({ email }) });
      setMagicLinkSent(true);
    } catch { setMagicLinkError('Unable to send magic link. Please try again.'); }
    finally { setMagicLinkLoading(false); }
  }, [email]);

  const handleBookingLookup = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setBookingError(''); setBookingLoading(true);
    try {
      const data = await apiClient<BookingLookupResponse>('/api/v1/auth/booking-lookup', {
        method: 'POST', body: JSON.stringify({ booking_id: bookingId, last_name: lastName }),
      });
      login(data.session_token, data.traveler_id, 'traveler');
      if (installPrompt) setShowInstallBanner(true);
      else navigate('/', { replace: true });
    } catch { setBookingError('Booking not found. Please check your details.'); }
    finally { setBookingLoading(false); }
  }, [bookingId, lastName, login, navigate, installPrompt]);

  const handleResend = useCallback(() => {
    if (!verifyEmail) return;
    setVerifyStatus('idle'); setActiveTab('magic-link'); setEmail(verifyEmail);
  }, [verifyEmail]);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt(); setShowInstallBanner(false); navigate('/', { replace: true });
  }, [installPrompt, navigate]);

  const handleDismissInstall = useCallback(() => {
    setShowInstallBanner(false); navigate('/', { replace: true });
  }, [navigate]);

  // --- Verification states ---
  if (verifyStatus === 'verifying') {
    return (
      <div className="login-page" role="main"><div className="login-card">
        <h1 className="login-title">WSB 2027 China</h1>
        <p className="login-subtitle" aria-live="polite">Verifying your link…</p>
      </div></div>
    );
  }

  if (verifyStatus === 'expired' || verifyStatus === 'used' || verifyStatus === 'invalid') {
    const msgs: Record<string, string> = { expired: 'This link has expired.', used: 'This link was already used.', invalid: 'This link is invalid.' };
    return (
      <div className="login-page" role="main"><div className="login-card">
        <h1 className="login-title">WSB 2027 China</h1>
        <div className="login-error-block" role="alert">
          <p className="login-error-message">{msgs[verifyStatus]}</p>
          <div className="login-resend-group">
            <label htmlFor="resend-email" className="login-label">Enter your email for a new link</label>
            <input id="resend-email" type="email" className="login-input" placeholder="you@example.com" value={verifyEmail} onChange={(e) => setVerifyEmail(e.target.value)} />
            <button className="login-btn login-btn-primary" onClick={handleResend} disabled={!verifyEmail}>Resend Link</button>
          </div>
        </div>
      </div></div>
    );
  }

  if (showInstallBanner) {
    return (
      <div className="login-page" role="main"><div className="login-card">
        <h1 className="login-title">WSB 2027 China</h1>
        <p className="login-subtitle">Add to your home screen for the best experience</p>
        <button className="login-btn login-btn-primary" onClick={handleInstall}>Install App</button>
        <button className="login-btn login-btn-secondary" onClick={handleDismissInstall}>Skip for Now</button>
      </div></div>
    );
  }

  // --- Main traveler login ---
  return (
    <div className="login-page" role="main" aria-label="Traveler Login">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🇨🇳</div>
          <h1 className="login-title">WSB 2027 China</h1>
          <p className="login-subtitle">Your Digital Travel Companion</p>
        </div>

        {/* Tabs: only traveler-friendly options */}
        <div className="login-tabs" role="tablist" aria-label="Sign in method">
          <button role="tab" aria-selected={activeTab === 'booking-lookup'} className={`login-tab ${activeTab === 'booking-lookup' ? 'login-tab-active' : ''}`} onClick={() => setActiveTab('booking-lookup')}>
            Find My Booking
          </button>
          <button role="tab" aria-selected={activeTab === 'magic-link'} className={`login-tab ${activeTab === 'magic-link' ? 'login-tab-active' : ''}`} onClick={() => setActiveTab('magic-link')}>
            Email Sign In
          </button>
        </div>

        {/* Booking Lookup — default, most intuitive for travelers */}
        {activeTab === 'booking-lookup' && (
          <div role="tabpanel">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Enter your booking ID and last name to access your trip details.
            </p>
            <form onSubmit={handleBookingLookup} noValidate>
              <div className="login-field">
                <label htmlFor="booking-id" className="login-label">Booking ID</label>
                <input id="booking-id" type="text" className="login-input" placeholder="e.g. WSB-2027-001" value={bookingId} onChange={(e) => setBookingId(e.target.value)} required aria-required="true" />
              </div>
              <div className="login-field">
                <label htmlFor="last-name" className="login-label">Last Name</label>
                <input id="last-name" type="text" className="login-input" placeholder="As shown on your booking" value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="family-name" aria-required="true" />
              </div>
              {bookingError && <p className="login-error" role="alert">{bookingError}</p>}
              <button type="submit" className="login-btn login-btn-primary" disabled={bookingLoading || !bookingId || !lastName}>
                {bookingLoading ? 'Looking up…' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        {/* Magic Link */}
        {activeTab === 'magic-link' && (
          <div role="tabpanel">
            {magicLinkSent ? (
              <div className="login-success" aria-live="polite">
                <p className="login-success-text">✓ Check your email for a sign-in link.</p>
                <button className="login-btn login-btn-secondary" onClick={() => setMagicLinkSent(false)}>Send Another</button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} noValidate>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  We'll send a sign-in link to your registered email address.
                </p>
                <div className="login-field">
                  <label htmlFor="magic-email" className="login-label">Email Address</label>
                  <input id="magic-email" type="email" className="login-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" aria-required="true" />
                </div>
                {magicLinkError && <p className="login-error" role="alert">{magicLinkError}</p>}
                <button type="submit" className="login-btn login-btn-primary" disabled={magicLinkLoading || !email}>
                  {magicLinkLoading ? 'Sending…' : 'Send Sign-In Link'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Demo traveler quick-pick (only non-admin users) */}
        {demoTravelers.length > 0 && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Demo Accounts
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {demoTravelers.map((u) => (
                <button
                  key={u.traveler_id}
                  type="button"
                  disabled={demoLoading !== null}
                  onClick={() => handleDemoLogin(u.traveler_id)}
                  style={{
                    padding: '0.4rem 0.75rem', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-full)',
                    background: demoLoading === u.traveler_id ? '#f0f0f0' : 'var(--bg-card)', cursor: demoLoading ? 'wait' : 'pointer',
                    fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'inherit',
                  }}
                  aria-label={`Sign in as ${u.full_name_raw}`}
                >
                  {demoLoading === u.traveler_id ? '…' : u.full_name_raw}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Install App button — shows when PWA install is available */}
        {installPrompt && (
          <div style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={async () => { if (installPrompt) { await installPrompt.prompt(); setInstallPrompt(null); } }}
              className="login-btn"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                color: '#fff', border: 'none', gap: '0.5rem',
              }}
              aria-label="Install app to home screen"
            >
              📲 Download App
            </button>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '0.4rem' }}>
              Add to your home screen for quick access
            </p>
          </div>
        )}

        {/* Staff/Admin link */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <Link to="/ops/login" style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textDecoration: 'none' }}>
            Staff & Admin Login →
          </Link>
        </div>
      </div>
    </div>
  );
}
