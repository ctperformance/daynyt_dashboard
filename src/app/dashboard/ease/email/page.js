'use client';

import ComingSoon from '@/components/ComingSoon';

export default function EmailPage() {
  return (
    <ComingSoon
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'EASE', href: '/dashboard/ease' },
        { label: 'E-Mail' },
      ]}
      title="E-Mail Marketing"
      description="Verbinde dein E-Mail Tool (Klaviyo, Mailchimp, etc.), um Öffnungsraten, Klicks und Subscriber-Wachstum zu sehen."
      icon="✉"
      features={[
        'Subscriber-Wachstum & Churn Rate',
        'Kampagnen-Performance (Open Rate, CTR)',
        'Flow-Analyse & Automation-Stats',
        'Quiz-Lead → E-Mail Engagement Tracking',
      ]}
    />
  );
}
