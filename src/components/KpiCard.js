'use client';

export default function KpiCard({ title, value, subtitle, trend, icon }) {
  const trendColor = trend > 0 ? 'text-ease-green' : trend < 0 ? 'text-ease-red' : 'text-gray-500';
  const trendArrow = trend > 0 ? '\u2191' : trend < 0 ? '\u2193' : '';

  return (
    <div className="bg-ease-card border border-ease-border rounded-xl p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{title}</span>
        {icon && <span className="text-lg opacity-60">{icon}</span>}
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="flex items-center gap-2 text-sm">
        {trend !== undefined && (
          <span className={trendColor}>
            {trendArrow} {Math.abs(trend)}%
          </span>
        )}
        {subtitle && <span className="text-gray-500">{subtitle}</span>}
      </div>
    </div>
  );
}
