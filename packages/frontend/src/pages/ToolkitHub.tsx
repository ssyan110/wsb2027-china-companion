import { Link } from 'react-router-dom';
import { Car, Languages, ArrowLeftRight, ShieldAlert, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ToolkitCard {
  to: string;
  Icon: LucideIcon;
  color: string;
  title: string;
  desc: string;
}

const cards: ToolkitCard[] = [
  { to: '/toolkit/taxi', Icon: Car, color: '#C8102E', title: 'Taxi Card', desc: 'Show hotel address to drivers in Chinese' },
  { to: '/toolkit/phrasebook', Icon: Languages, color: '#3B82F6', title: 'Phrasebook', desc: 'Common travel phrases with pronunciation' },
  { to: '/toolkit/currency', Icon: ArrowLeftRight, color: '#10B981', title: 'Currency Converter', desc: 'CNY ↔ USD real-time conversion' },
  { to: '/toolkit/emergency', Icon: ShieldAlert, color: '#EF4444', title: 'Emergency Info', desc: 'Emergency contacts & hospital info' },
];

export default function ToolkitHub() {
  return (
    <div className="toolkit-page" role="main" aria-label="Destination Toolkit">
      <h1 className="toolkit-title">Destination Toolkit</h1>
      <div className="toolkit-cards">
        {cards.map(({ to, Icon, color, title, desc }) => (
          <Link key={to} to={to} className="toolkit-card" aria-label={`${title}: ${desc}`}>
            <div className="toolkit-card-icon" style={{ background: `${color}10` }}>
              <Icon size={24} color={color} />
            </div>
            <div className="toolkit-card-text">
              <span className="toolkit-card-title">{title}</span>
              <span className="toolkit-card-desc">{desc}</span>
            </div>
            <ChevronRight size={18} color="#9CA3AF" />
          </Link>
        ))}
      </div>
    </div>
  );
}
