import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, CalendarDays, Bell, Users, Compass, ChevronRight } from 'lucide-react';
import { apiClient } from '../lib/api';
import { getDb } from '../lib/db';
import { useAuthStore } from '../stores/auth.store';
import { HomeSkeletonCards } from '../components/Skeleton';
import type { TravelerProfile, NotificationItem, ItineraryEvent } from '@wsb/shared';

export default function Home() {
  const role = useAuthStore((s) => s.role);
  const [profile, setProfile] = useState<TravelerProfile | null>(null);
  const [nextEvent, setNextEvent] = useState<ItineraryEvent | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [familyCount, setFamilyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const db = await getDb();
      const cached = await db.get('profile', 'me');
      if (cached && !cancelled) setProfile(cached);

      try {
        const p = await apiClient<TravelerProfile>('/api/v1/travelers/me');
        if (!cancelled) { setProfile(p); await db.put('profile', p, 'me'); }
      } catch { /* cached */ }

      try {
        const { events } = await apiClient<{ events: ItineraryEvent[] }>('/api/v1/travelers/me/itinerary');
        if (!cancelled) {
          const now = new Date();
          const upcoming = events.filter(e => new Date(e.start_time) >= now)
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
          setNextEvent(upcoming[0] ?? null);
        }
      } catch { /* fallback */ }

      try {
        const { notifications } = await apiClient<{ notifications: NotificationItem[] }>('/api/v1/travelers/me/notifications');
        if (!cancelled) setUnreadCount(notifications.filter(n => !n.read_at).length);
      } catch { /* fallback */ }

      if (role === 'representative') {
        try {
          const { members } = await apiClient<{ family_id: string; members: unknown[] }>('/api/v1/travelers/me/family');
          if (!cancelled) setFamilyCount(members.length);
        } catch { /* fallback */ }
      }

      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [role]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Traveler';

  if (loading && !profile) {
    return <HomeSkeletonCards />;
  }

  // Countdown to event start
  const eventDate = new Date('2027-06-15T00:00:00');
  const now = new Date();
  const diffMs = eventDate.getTime() - now.getTime();
  const daysUntil = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero-label">WSB 2027 China Super Trip</div>
        <h1 className="home-greeting">Hello, {firstName}! 👋</h1>
        <p className="home-greeting-sub">Welcome to Beijing — your adventure awaits</p>
        {daysUntil > 0 && (
          <div className="home-hero-countdown" aria-label={`${daysUntil} days until event`}>
            <span className="home-hero-countdown-number">{daysUntil}</span>
            <span className="home-hero-countdown-label">days to go</span>
          </div>
        )}
      </div>

      <div className="home-cards">
        <Link to="/qr" className="home-card home-card-qr" aria-label="View my QR code">
          <div className="home-card-icon-wrap"><QrCode size={24} color="#C8102E" /></div>
          <div className="home-card-content">
            <div className="home-card-title">My QR Code</div>
            <div className="home-card-desc">Show for scanning at events & buses</div>
          </div>
          <ChevronRight size={18} className="home-card-arrow" color="#9CA3AF" />
        </Link>

        <Link to="/itinerary" className="home-card home-card-itinerary" aria-label="View my itinerary">
          <div className="home-card-icon-wrap"><CalendarDays size={24} color="#3B82F6" /></div>
          <div className="home-card-content">
            <div className="home-card-title">My Itinerary</div>
            <div className="home-card-desc">{nextEvent ? `Next: ${nextEvent.name}` : 'View your full schedule'}</div>
          </div>
          <ChevronRight size={18} className="home-card-arrow" color="#9CA3AF" />
        </Link>

        <Link to="/notifications" className="home-card home-card-notifications" aria-label={`Notifications, ${unreadCount} unread`}>
          <div className="home-card-icon-wrap"><Bell size={24} color="#F59E0B" /></div>
          <div className="home-card-content">
            <div className="home-card-title">Notifications</div>
            <div className="home-card-desc">Updates & announcements</div>
          </div>
          {unreadCount > 0 && <span className="home-card-badge">{unreadCount}</span>}
          <ChevronRight size={18} className="home-card-arrow" color="#9CA3AF" />
        </Link>

        {role === 'representative' && (
          <Link to="/family" className="home-card home-card-family" aria-label={`Family Wallet, ${familyCount} members`}>
            <div className="home-card-icon-wrap"><Users size={24} color="#10B981" /></div>
            <div className="home-card-content">
              <div className="home-card-title">Family Wallet</div>
              <div className="home-card-desc">{familyCount} linked member{familyCount !== 1 ? 's' : ''}</div>
            </div>
            <ChevronRight size={18} className="home-card-arrow" color="#9CA3AF" />
          </Link>
        )}

        <Link to="/toolkit" className="home-card home-card-toolkit" aria-label="Destination toolkit">
          <div className="home-card-icon-wrap"><Compass size={24} color="#8B5CF6" /></div>
          <div className="home-card-content">
            <div className="home-card-title">Destination Toolkit</div>
            <div className="home-card-desc">Taxi card, phrasebook, currency & more</div>
          </div>
          <ChevronRight size={18} className="home-card-arrow" color="#9CA3AF" />
        </Link>
      </div>
    </div>
  );
}
