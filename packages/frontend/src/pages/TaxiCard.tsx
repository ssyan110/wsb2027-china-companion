import { useEffect, useState } from 'react';
import { getDb } from '../lib/db';
import { apiClient } from '../lib/api';
import type { TravelerProfile } from '@wsb/shared';
import type { TaxiCardCache } from '@wsb/shared';

export default function TaxiCard() {
  const [card, setCard] = useState<TaxiCardCache | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const db = await getDb();

      // Try cache first
      const cached = await db.get('taxiCard', 'me');
      if (cached && !cancelled) setCard(cached);

      try {
        const profile = await apiClient<TravelerProfile>('/api/v1/travelers/me');
        if (!cancelled && profile.hotel) {
          const data: TaxiCardCache = {
            hotel_name_en: profile.hotel.name,
            hotel_name_cn: profile.hotel.address_cn?.split(',')[0] ?? profile.hotel.name,
            address_en: profile.hotel.address_en,
            address_cn: profile.hotel.address_cn,
          };
          setCard(data);
          await db.put('taxiCard', data, 'me');
        }
      } catch {
        // use cached
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading && !card) {
    return <div className="taxi-page" role="status" aria-label="Loading taxi card">Loading…</div>;
  }

  if (!card) {
    return (
      <div className="taxi-page" role="alert" aria-label="No hotel assigned">
        <p className="taxi-empty">No hotel assignment found. Please check with your group leader.</p>
      </div>
    );
  }

  return (
    <div className="taxi-page" role="main" aria-label="Taxi card with hotel address">
      <div className="taxi-card-display">
        <p className="taxi-instruction">Show this to your taxi driver</p>
        <div className="taxi-hotel-name">
          <span className="taxi-text-en" lang="en">{card.hotel_name_en}</span>
        </div>
        <div className="taxi-address" aria-label="Hotel address in English and Chinese">
          <p className="taxi-text-en" lang="en">{card.address_en}</p>
          <p className="taxi-text-cn" lang="zh-Hans">{card.address_cn}</p>
        </div>
      </div>
    </div>
  );
}
