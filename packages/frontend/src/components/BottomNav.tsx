import { NavLink } from 'react-router-dom';
import { Home, CalendarDays, Compass, Bell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/itinerary', label: 'Schedule', Icon: CalendarDays },
  { to: '/toolkit', label: 'Toolkit', Icon: Compass },
  { to: '/notifications', label: 'Alerts', Icon: Bell },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
              <span className="bottom-nav-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
