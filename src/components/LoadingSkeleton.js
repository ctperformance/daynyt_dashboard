'use client';

/**
 * Reusable skeleton loader for the dark DAYNYT theme.
 * Variants: 'card' | 'kpi' | 'table-row' | 'text'
 */
export default function LoadingSkeleton({ variant = 'card', count = 1 }) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'kpi') {
    return items.map((i) => (
      <div
        key={i}
        className="bg-ease-card border border-ease-border rounded-xl p-5 flex flex-col gap-2 animate-pulse"
      >
        <div className="h-3 w-20 bg-ease-border rounded" />
        <div className="h-8 w-28 bg-ease-border rounded" />
        <div className="h-3 w-16 bg-ease-border/60 rounded" />
      </div>
    ));
  }

  if (variant === 'card') {
    return items.map((i) => (
      <div
        key={i}
        className="bg-ease-card border border-ease-border rounded-xl p-5 animate-pulse"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-ease-border rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-24 bg-ease-border rounded" />
            <div className="h-3 w-36 bg-ease-border/60 rounded" />
          </div>
        </div>
        <div className="flex gap-6 pt-3 border-t border-ease-border/50">
          <div className="h-5 w-16 bg-ease-border rounded" />
          <div className="h-5 w-16 bg-ease-border rounded" />
          <div className="h-5 w-16 bg-ease-border rounded" />
        </div>
      </div>
    ));
  }

  if (variant === 'table-row') {
    return items.map((i) => (
      <div
        key={i}
        className="flex items-center gap-4 py-3 animate-pulse"
      >
        <div className="h-4 w-32 bg-ease-border rounded" />
        <div className="h-4 w-20 bg-ease-border/60 rounded" />
        <div className="h-4 w-16 bg-ease-border/60 rounded" />
        <div className="flex-1" />
        <div className="h-4 w-12 bg-ease-border/40 rounded" />
      </div>
    ));
  }

  // text
  return items.map((i) => (
    <div key={i} className="animate-pulse flex flex-col gap-2">
      <div className="h-4 w-full bg-ease-border rounded" />
      <div className="h-4 w-3/4 bg-ease-border/60 rounded" />
    </div>
  ));
}
