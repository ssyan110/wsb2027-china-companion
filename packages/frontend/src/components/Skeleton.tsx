/**
 * Skeleton loading components for perceived performance.
 * Replaces "Loading..." text with animated placeholders.
 */

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = '16px', borderRadius, className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, width }: { lines?: number; width?: string }) {
  return (
    <div className="skeleton-text" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: '14px',
            width: i === lines - 1 ? '60%' : (width ?? '100%'),
            marginBottom: '8px',
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 44 }: { size?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true" role="presentation">
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)' }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: '50%' }} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-list" aria-label="Loading content" role="status">
      <span className="sr-only">Loading...</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-list-item" aria-hidden="true">
          <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 14, width: `${85 - i * 10}%`, marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 12, width: `${65 - i * 5}%`, marginBottom: 4 }} />
            <div className="skeleton" style={{ height: 10, width: '30%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeSkeletonCards() {
  return (
    <div className="home-page" aria-label="Loading home page" role="status">
      <span className="sr-only">Loading your trip...</span>
      {/* Hero skeleton */}
      <div className="skeleton-hero" aria-hidden="true">
        <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 12, opacity: 0.5 }} />
        <div className="skeleton" style={{ height: 24, width: '65%', marginBottom: 8, opacity: 0.6 }} />
        <div className="skeleton" style={{ height: 14, width: '80%', opacity: 0.4 }} />
      </div>
      {/* Card skeletons */}
      <div className="home-cards">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
