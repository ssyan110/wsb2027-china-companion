import { useEffect, useState } from 'react';
import { getDb } from '../lib/db';

interface EmergencyData {
  localEmergency: { label: string; number: string }[];
  embassy: { name: string; phone: string; address: string };
  operations: { label: string; phone: string };
  hospital: { name: string; phone: string; address: string };
}

const DEFAULT_EMERGENCY: EmergencyData = {
  localEmergency: [
    { label: 'Police', number: '110' },
    { label: 'Fire', number: '119' },
    { label: 'Ambulance', number: '120' },
    { label: 'Traffic Accident', number: '122' },
  ],
  embassy: {
    name: 'U.S. Embassy Beijing',
    phone: '+86-10-8531-4000',
    address: '55 An Jia Lou Road, Chaoyang District, Beijing',
  },
  operations: {
    label: 'JBA Operations Hotline',
    phone: '+86-400-888-0000',
  },
  hospital: {
    name: 'Beijing United Family Hospital',
    phone: '+86-10-5927-7000',
    address: '2 Jiangtai Road, Chaoyang District, Beijing',
  },
};

const CACHE_KEY = 'emergency-info';

export default function EmergencyInfo() {
  const [data, setData] = useState<EmergencyData>(DEFAULT_EMERGENCY);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const db = await getDb();
      const cached = await db.get('syncMeta', CACHE_KEY);
      if (cached && !cancelled) {
        try {
          const parsed = JSON.parse(cached.last_synced) as EmergencyData;
          setData(parsed);
        } catch {
          // use default
        }
      } else {
        // Seed default into IndexedDB
        await db.put('syncMeta', {
          entity: CACHE_KEY,
          last_synced: JSON.stringify(DEFAULT_EMERGENCY),
        });
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="emergency-page" role="main" aria-label="Emergency information">
      <h1 className="emergency-title">Emergency Info</h1>

      <section className="emergency-section" aria-label="Local emergency numbers">
        <h2 className="emergency-section-title">Local Emergency Numbers</h2>
        <ul className="emergency-list" role="list">
          {data.localEmergency.map((item) => (
            <li key={item.number} className="emergency-item">
              <span className="emergency-item-label">{item.label}</span>
              <a
                href={`tel:${item.number}`}
                className="emergency-item-number"
                aria-label={`Call ${item.label} at ${item.number}`}
              >
                {item.number}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="emergency-section" aria-label="Embassy contact">
        <h2 className="emergency-section-title">Embassy</h2>
        <div className="emergency-contact-card">
          <p className="emergency-contact-name">{data.embassy.name}</p>
          <a
            href={`tel:${data.embassy.phone}`}
            className="emergency-contact-phone"
            aria-label={`Call embassy at ${data.embassy.phone}`}
          >
            {data.embassy.phone}
          </a>
          <p className="emergency-contact-address">{data.embassy.address}</p>
        </div>
      </section>

      <section className="emergency-section" aria-label="Event operations hotline">
        <h2 className="emergency-section-title">Event Operations</h2>
        <div className="emergency-contact-card">
          <p className="emergency-contact-name">{data.operations.label}</p>
          <a
            href={`tel:${data.operations.phone}`}
            className="emergency-contact-phone"
            aria-label={`Call operations at ${data.operations.phone}`}
          >
            {data.operations.phone}
          </a>
        </div>
      </section>

      <section className="emergency-section" aria-label="Hospital information">
        <h2 className="emergency-section-title">Hospital</h2>
        <div className="emergency-contact-card">
          <p className="emergency-contact-name">{data.hospital.name}</p>
          <a
            href={`tel:${data.hospital.phone}`}
            className="emergency-contact-phone"
            aria-label={`Call hospital at ${data.hospital.phone}`}
          >
            {data.hospital.phone}
          </a>
          <p className="emergency-contact-address">{data.hospital.address}</p>
        </div>
      </section>
    </div>
  );
}
