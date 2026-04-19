import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import type { MagicLinkResponse, VerifyResponse, BookingLookupResponse, RoleType } from '@wsb/shared';

type Tab = 'magic-link' | 'booking-lookup' | 'dev-login';

interface DevUser {
  traveler_id: string;
  full_name_raw: string;
  email_primary: string;
  role_type: RoleType;
  access_status: string;
}
type VerifyStatus = 'idle' | 'verifying' | 'success' | 'expired' | 'used' | 'invalid';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((s) => s.login);

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('magic-link');

  // Magic link form
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkError, setMagicLinkError] = useState('');

  // Booking lookup form
  const [bookingId, setBookingId] = useState('');
  const [lastName, setLastName] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Token verification
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyEmail, setVerifyEmail] = useState('');

  // PWA install
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Dev login
  const [devUsers, setDevUsers] = useState<DevUser[]>([]);
  const [devLoginLoading, setDevLoginLoading] = useState<string | null>(null);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Fetch dev users for quick login
  useEffect(() => {
    fetch('/api/v1/dev/users')
      .then((res) => res.json())
      .then((data: { users: DevUser[] }) => setDevUsers(data.users))
      .catch(() => {});
  }, []);

  // Handle dev login
  const handleDevLogin = useCallback(
    async (travelerId: string) => {
      setDevLoginLoading(travelerId);
      try {
        const res = await fetch(`/api/v1/dev/login/${travelerId}`);
        const data = await res.json() as { session_token: string; traveler_id: string; role_type: RoleType };
        login(data.session_token, data.traveler_id, data.role_type);
        // Navigate based on role
        if (data.role_type === 'admin' || data.role_type === 'super_admin') {
          navigate('/ops', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch {
        setDevLoginLoading(null);
      }
    },
    [login, navigate],
  );

  // Handle magic link token verification from URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;

    setVerifyStatus('verifying');

    apiClient<VerifyResponse>(`/api/v1/auth/magic-link/verify?token=${encodeURIComponent(token)}`)
      .then((data) => {
        setVerifyStatus('success');
        login(data.session_token, data.traveler_id, data.role_type);
        // Show PWA install prompt if available
        if (installPrompt) {
          setShowInstallBanner(true);
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch((err: Error) => {
        const msg = err.message.toLowerCase();
        if (msg.includes('410') || msg.includes('expired')) {
          setVerifyStatus('expired');
        } else if (msg.includes('409') || msg.includes('used')) {
          setVerifyStatus('used');
        } else {
          setVerifyStatus('invalid');
        }
      });
  }, [searchParams, login, navigate, installPrompt]);

  // Handle magic link request
  const handleMagicLink = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setMagicLinkError('');
      setMagicLinkSent(false);
      setMagicLinkLoading(true);

      try {
        await apiClient<MagicLinkResponse>('/api/v1/auth/magic-link', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        setMagicLinkSent(true);
      } catch {
        setMagicLinkError('Unable to send magic link. Please try again.');
      } finally {
        setMagicLinkLoading(false);
      }
    },
    [email],
  );

  // Handle booking lookup
  const handleBookingLookup = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setBookingError('');
      setBookingLoading(true);

      try {
        const data = await apiClient<BookingLookupResponse>('/api/v1/auth/booking-lookup', {
          method: 'POST',
          body: JSON.stringify({ booking_id: bookingId, last_name: lastName }),
        });
        login(data.session_token, data.traveler_id, 'traveler');
        if (installPrompt) {
          setShowInstallBanner(true);
        } else {
          navigate('/', { replace: true });
        }
      } catch {
        setBookingError('Booking not found. Please check your details and try again.');
      } finally {
        setBookingLoading(false);
      }
    },
    [bookingId, lastName, login, navigate, installPrompt],
  );

  // Handle resend magic link
  const handleResend = useCallback(async () => {
    if (!verifyEmail) return;
    setVerifyStatus('idle');
    setActiveTab('magic-link');
    setEmail(verifyEmail);
  }, [verifyEmail]);

  // Handle PWA install
  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setShowInstallBanner(false);
    navigate('/', { replace: true });
  }, [installPrompt, navigate]);

  const handleDismissInstall = useCallback(() => {
    setShowInstallBanner(false);
    navigate('/', { replace: true });
  }, [navigate]);

  // Token verification states
  if (verifyStatus === 'verifying') {
    return (
      <div className="login-page" role="main" aria-label="Login">
        <div className="login-card">
          <h1 className="login-title">WSB 2027 China</h1>
          <p className="login-subtitle" aria-live="polite">Verifying your magic link…</p>
        </div>
      </div>
    );
  }

  if (verifyStatus === 'expired' || verifyStatus === 'used' || verifyStatus === 'invalid') {
    const messages: Record<string, string> = {
      expired: 'This magic link has expired.',
      used: 'This magic link has already been used.',
      invalid: 'This magic link is invalid.',
    };

    return (
      <div className="login-page" role="main" aria-label="Login">
        <div className="login-card">
          <h1 className="login-title">WSB 2027 China</h1>
          <div className="login-error-block" role="alert">
            <p className="login-error-message">{messages[verifyStatus]}</p>
            <div className="login-resend-group">
              <label htmlFor="resend-email" className="login-label">
                Enter your email to receive a new link
              </label>
              <input
                id="resend-email"
                type="email"
                className="login-input"
                placeholder="you@example.com"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
                aria-label="Email address for resend"
              />
              <button
                className="login-btn login-btn-primary"
                onClick={handleResend}
                disabled={!verifyEmail}
                aria-label="Resend magic link"
              >
                Resend Magic Link
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PWA install banner
  if (showInstallBanner) {
    return (
      <div className="login-page" role="main" aria-label="Install app">
        <div className="login-card">
          <h1 className="login-title">WSB 2027 China</h1>
          <p className="login-subtitle">Add to your home screen for the best experience</p>
          <div className="login-install-actions">
            <button
              className="login-btn login-btn-primary"
              onClick={handleInstall}
              aria-label="Install app"
            >
              Install App
            </button>
            <button
              className="login-btn login-btn-secondary"
              onClick={handleDismissInstall}
              aria-label="Skip installation"
            >
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main login form
  return (
    <div className="login-page" role="main" aria-label="Login">
      <div className="login-card">
        <h1 className="login-title">WSB 2027 China</h1>
        <p className="login-subtitle">Digital Companion</p>

        {/* Tab navigation */}
        <div className="login-tabs" role="tablist" aria-label="Login method">
          <button
            role="tab"
            aria-selected={activeTab === 'magic-link'}
            aria-controls="panel-magic-link"
            id="tab-magic-link"
            className={`login-tab ${activeTab === 'magic-link' ? 'login-tab-active' : ''}`}
            onClick={() => setActiveTab('magic-link')}
          >
            Magic Link
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'booking-lookup'}
            aria-controls="panel-booking-lookup"
            id="tab-booking-lookup"
            className={`login-tab ${activeTab === 'booking-lookup' ? 'login-tab-active' : ''}`}
            onClick={() => setActiveTab('booking-lookup')}
          >
            Booking Lookup
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'dev-login'}
            aria-controls="panel-dev-login"
            id="tab-dev-login"
            className={`login-tab ${activeTab === 'dev-login' ? 'login-tab-active' : ''}`}
            onClick={() => setActiveTab('dev-login')}
            style={{ color: '#1976d2' }}
          >
            Quick Login
          </button>
        </div>

        {/* Magic Link panel */}
        {activeTab === 'magic-link' && (
          <div
            role="tabpanel"
            id="panel-magic-link"
            aria-labelledby="tab-magic-link"
          >
            {magicLinkSent ? (
              <div className="login-success" aria-live="polite">
                <p className="login-success-text">
                  ✓ Check your email for a magic link to sign in.
                </p>
                <button
                  className="login-btn login-btn-secondary"
                  onClick={() => setMagicLinkSent(false)}
                  aria-label="Send another magic link"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} noValidate>
                <div className="login-field">
                  <label htmlFor="magic-email" className="login-label">
                    Email Address
                  </label>
                  <input
                    id="magic-email"
                    type="email"
                    className="login-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    aria-required="true"
                    aria-describedby={magicLinkError ? 'magic-error' : undefined}
                  />
                </div>
                {magicLinkError && (
                  <p id="magic-error" className="login-error" role="alert">
                    {magicLinkError}
                  </p>
                )}
                <button
                  type="submit"
                  className="login-btn login-btn-primary"
                  disabled={magicLinkLoading || !email}
                  aria-label="Send magic link"
                >
                  {magicLinkLoading ? 'Sending…' : 'Send Magic Link'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Booking Lookup panel */}
        {activeTab === 'booking-lookup' && (
          <div
            role="tabpanel"
            id="panel-booking-lookup"
            aria-labelledby="tab-booking-lookup"
          >
            <form onSubmit={handleBookingLookup} noValidate>
              <div className="login-field">
                <label htmlFor="booking-id" className="login-label">
                  Booking ID
                </label>
                <input
                  id="booking-id"
                  type="text"
                  className="login-input"
                  placeholder="e.g. WSB-12345"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  required
                  aria-required="true"
                  aria-describedby={bookingError ? 'booking-error' : undefined}
                />
              </div>
              <div className="login-field">
                <label htmlFor="last-name" className="login-label">
                  Last Name
                </label>
                <input
                  id="last-name"
                  type="text"
                  className="login-input"
                  placeholder="Your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  aria-required="true"
                  aria-describedby={bookingError ? 'booking-error' : undefined}
                />
              </div>
              {bookingError && (
                <p id="booking-error" className="login-error" role="alert">
                  {bookingError}
                </p>
              )}
              <button
                type="submit"
                className="login-btn login-btn-primary"
                disabled={bookingLoading || !bookingId || !lastName}
                aria-label="Look up booking"
              >
                {bookingLoading ? 'Looking up…' : 'Look Up'}
              </button>
            </form>
          </div>
        )}

        {/* Dev Login panel */}
        {activeTab === 'dev-login' && (
          <div
            role="tabpanel"
            id="panel-dev-login"
            aria-labelledby="tab-dev-login"
          >
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>
              Select a demo account to log in instantly:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {devUsers.map((user) => {
                const roleColors: Record<string, string> = {
                  super_admin: '#d32f2f',
                  admin: '#e65100',
                  staff: '#1565c0',
                  representative: '#2e7d32',
                  traveler: '#37474f',
                };
                const roleLabels: Record<string, string> = {
                  super_admin: 'Super Admin',
                  admin: 'Admin',
                  staff: 'Staff',
                  representative: 'Representative',
                  traveler: 'Traveler',
                };
                return (
                  <button
                    key={user.traveler_id}
                    type="button"
                    disabled={devLoginLoading !== null}
                    onClick={() => handleDevLogin(user.traveler_id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid #e0e0e0',
                      borderRadius: 6,
                      background: devLoginLoading === user.traveler_id ? '#f5f5f5' : '#fff',
                      cursor: devLoginLoading ? 'wait' : 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                    aria-label={`Log in as ${user.full_name_raw}`}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.full_name_raw}</div>
                      <div style={{ fontSize: '0.75rem', color: '#999' }}>{user.email_primary}</div>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 10,
                      color: '#fff',
                      background: roleColors[user.role_type] ?? '#666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      {devLoginLoading === user.traveler_id ? '...' : (roleLabels[user.role_type] ?? user.role_type)}
                    </span>
                  </button>
                );
              })}
              {devUsers.length === 0 && (
                <p style={{ color: '#999', textAlign: 'center', padding: '1rem 0' }}>
                  No demo users available.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
