import Link from 'next/link';

export default function ComingSoon({ breadcrumbs, title, description, icon, features }) {
  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-1">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-600">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="text-gray-500 hover:text-ease-cream transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-ease-cream font-medium">{crumb.label}</span>
            )}
          </span>
        ))}
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ease-cream">{title}</h1>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-ease-card border border-ease-border rounded-xl p-8 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl text-gray-600 mx-auto mb-5">
          {icon}
        </div>

        <h2 className="text-lg font-medium text-ease-cream mb-2">Bald verfügbar</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">{description}</p>

        {/* Feature List */}
        {features && features.length > 0 && (
          <div className="text-left bg-ease-bg/50 rounded-lg p-4 mb-6">
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-3">Geplante Features</p>
            <ul className="space-y-2">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <span className="text-ease-accent mt-0.5 text-xs">&#9671;</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-gray-600">
          Diese Integration wird in einem kommenden Update verfügbar sein.
        </p>
      </div>
    </div>
  );
}
