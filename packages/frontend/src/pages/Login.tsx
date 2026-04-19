import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import type { MagicLinkResponse, VerifyResponse, BookingLookupResponse } from '@wsb/shared';

type Tab = 'magic-link' | 'booking-lookup';
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

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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
      </div>
    </div>
  );
}
