'use client';

import Link from 'next/link';
import ComingSoon from '@/components/ComingSoon';

export default function MetaPage() {
  return (
    <ComingSoon
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'EASE', href: '/dashboard/ease' },
        { label: 'Meta Ads' },
      ]}
      title="Meta Ads"
      description="Verbinde deinen Meta Business Manager, um Kampagnen-Performance, ROAS, CPA und Conversion-Daten direkt im Dashboard zu sehen."
      icon="◎"
      features={[
        'Kampagnen-Übersicht mit Spend, Impressionen & Klicks',
        'ROAS & CPA Tracking über Zeit',
        'Conversion-Funnel (View → Click → Purchase)',
        'Audience Insights & Demographics',
      ]}
    />
  );
}
