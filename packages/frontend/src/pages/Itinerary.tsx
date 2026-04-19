import { useEffect, useState, useCallback } from 'react';
import { Bus, UtensilsCrossed, MapPin, Award, Plane, Hotel, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiClient } from '../lib/api';
import { getDb } from '../lib/db';
import { useAppStore } from '../stores/app.store';
import { SkeletonList } from '../components/Skeleton';
import type { ItineraryEvent } from '@wsb/shared';

const EVENT_ICONS: Record<string, LucideIcon> = {
  bus: Bus,
  meal: UtensilsCrossed,
  activity: MapPin,
  ceremony: Award,
  transfer: Plane,
  hotel_checkin: Hotel,
};

function groupByDate(events: ItineraryEvent[]): Map<string, ItineraryEvent[]> {
  const map = new Map<string, ItineraryEvent[]>();
  for (const ev of events) {
    const date = ev.date;
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(ev);
  }
  // Sort events within each date by start_time
  for (const [, evts] of map) {
    evts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }
  return map;
}

function isUpcoming(event: ItineraryEvent): boolean {
  return new Date(event.start_time) >= new Date();
}

export default function Itinerary() {
  const isOnline = useAppStore((s) => s.isOnline);
  const [events, setEvents] = useState<ItineraryEvent[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const db = await getDb();

    try {
      const { events: fetched } = await apiClient<{ events: ItineraryEvent[] }>(
        '/api/v1/travelers/me/itinerary',
      );
      setEvents(fetched);
      const now = new Date().toISOString();
      setLastSynced(now);

      // Cache
      const tx = db.transaction('itinerary', 'readwrite');
      await tx.store.clear();
      for (const ev of fetched) {
        await tx.store.put(ev);
      }
      await tx.done;
      await db.put('syncMeta', { entity: 'itinerary', last_synced: now }, 'itinerary');
    } catch {
      // Fallback to cache
      const cached = await db.getAll('itinerary');
      setEvents(cached);
      const meta = await db.get('syncMeta', 'itinerary');
      if (meta) setLastSynced(meta.last_synced);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRefresh = () => {
    if (isOnline) fetchEvents(true);
  };

  const grouped = groupByDate(events);
  const sortedDates = [...grouped.keys()].sort();

  // Find the first upcoming event id for highlighting
  const now = new Date();
  let nextEventId: string | null = null;
  for (const date of sortedDates) {
    for (const ev of grouped.get(date)!) {
      if (new Date(ev.start_time) >= now) {
        nextEventId = ev.event_id;
        break;
      }
    }
    if (nextEventId) break;
  }

  if (loading) {
    return (
      <div className="itinerary-page">
        <div className="itinerary-header">
          <h1 className="itinerary-title">My Itinerary</h1>
        </div>
        <SkeletonList count={5} />
      </div>
    );
  }

  return (
    <div className="itinerary-page">
      <div className="itinerary-header">
        <h1 className="itinerary-title">My Itinerary</h1>
        {isOnline && (
          <button
            className="itinerary-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh itinerary"
          >
            {refreshing ? 'Refreshing…' : <><RefreshCw size={14} /> Refresh</>}
          </button>
        )}
      </div>

      {!isOnline && (
        <div className="itinerary-offline-banner" role="status" aria-live="polite">
          Offline — showing last synced schedule
          {lastSynced && (
            <span className="itinerary-sync-time">
              {' '}({new Date(lastSynced).toLocaleString()})
            </span>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <p className="itinerary-empty">No events in your itinerary.</p>
      ) : (
        <div className="itinerary-timeline" role="list" aria-label="Itinerary events">
          {sortedDates.map((date) => (
            <div key={date} className="itinerary-date-group">
              <h2 className="itinerary-date-header">
                {new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              {grouped.get(date)!.map((ev) => {
                const isNext = ev.event_id === nextEventId;
                return (
                  <div
                    key={ev.event_id}
                    className={`itinerary-event-card${isNext ? ' itinerary-event-next' : ''}${!isUpcoming(ev) ? ' itinerary-event-past' : ''}`}
                    role="listitem"
                    aria-current={isNext ? 'true' : undefined}
                  >
                    <span className="itinerary-event-icon" aria-hidden="true">
                      {(() => { const Icon = EVENT_ICONS[ev.event_type] ?? MapPin; return <Icon size={20} color="#C8102E" />; })()}
                    </span>
                    <div className="itinerary-event-details">
                      <p className="itinerary-event-name">{ev.name}</p>
                      <p className="itinerary-event-time">
                        {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {ev.end_time && ` – ${new Date(ev.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                      <p className="itinerary-event-location">{ev.location}</p>
                      {ev.description && (
                        <p className="itinerary-event-desc">{ev.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
