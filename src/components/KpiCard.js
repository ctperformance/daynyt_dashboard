'use client';

export default function KpiCard({ title, value, subtitle, trend, icon }) {
  const trendColor = trend > 0 ? 'text-ease-green' : trend < 0 ? 'text-ease-red' : 'text-gray-500';
  const trendArrow = trend > 0 ? '↑' : trend < 0 ? '↓' : '';

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-1.5 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wide uppercase text-ease-muted">{title}</span>
        {icon && <span className="text-base opacity-30">{icon}</span>}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="flex items-center gap-2 text-xs">
        {trend !== undefined && (
          <span className={trendColor}>
            {trendArrow} {Math.abs(trend)}%
          </span>
        )}
        {subtitle && <span className="text-ease-muted">{subtitle}</span>}
      </div>
    </div>
  );
}
