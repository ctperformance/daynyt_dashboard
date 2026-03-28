'use client';

import Link from 'next/link';

/**
 * Reusable "connect this integration" prompt component.
 * Shows when an integration is not yet connected.
 */
export default function ConnectPrompt({
  provider,
  title,
  description,
  icon,
  features,
  connectUrl,
  onConnect,
  showShopInput,
}) {
  return (
    <div className="bg-ease-card border border-ease-border rounded-xl p-8 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 bg-ease-accent/10 rounded-2xl flex items-center justify-center text-3xl text-ease-accent mx-auto mb-5">
        {icon}
      </div>

      <h2 className="text-lg font-medium text-ease-cream mb-2">{title} verbinden</h2>
      <p className="text-sm text-gray-500 leading-relaxed mb-6">{description}</p>

      {/* Feature List */}
      {features && features.length > 0 && (
        <div className="text-left bg-ease-bg/50 rounded-lg p-4 mb-6">
          <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-3">Features nach Verbindung</p>
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

      {/* Shopify store input */}
      {showShopInput ? (
        <ShopifyConnectForm />
      ) : (
        <a
          href={connectUrl || `/api/auth/${provider}`}
          className="inline-flex items-center gap-2 bg-ease-accent text-black font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-ease-accent/90 transition-colors"
        >
          {title} verbinden
        </a>
      )}
    </div>
  );
}

function ShopifyConnectForm() {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const shop = formData.get('shop');
    if (shop) {
      window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(shop)}`;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          name="shop"
          placeholder="ease-store.myshopify.com"
          className="flex-1 bg-ease-bg border border-ease-border rounded-lg px-4 py-2.5 text-sm text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full bg-ease-accent text-black font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-ease-accent/90 transition-colors"
      >
        Shopify verbinden
      </button>
      <p className="text-xs text-gray-600">
        Gib deine Shopify Store-Domain ein (z.B. &quot;ease-store&quot; oder &quot;ease-store.myshopify.com&quot;)
      </p>
    </form>
  );
}
