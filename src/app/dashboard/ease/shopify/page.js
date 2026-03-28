'use client';

import ComingSoon from '@/components/ComingSoon';

export default function ShopifyPage() {
  return (
    <ComingSoon
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'EASE', href: '/dashboard/ease' },
        { label: 'Shopify' },
      ]}
      title="Shopify"
      description="Verbinde deinen Shopify Store, um Umsatz, Bestellungen und Conversion-Daten in Echtzeit zu tracken."
      icon="⬡"
      features={[
        'Umsatz & Bestellungen pro Tag/Woche/Monat',
        'Average Order Value (AOV) Tracking',
        'Top-Produkte nach Umsatz & Menge',
        'Conversion Rate & Cart Abandonment',
        'Quiz → Kauf Attribution',
      ]}
    />
  );
}
