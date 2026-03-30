'use client';

import { use } from 'react';
import ComingSoon from '@/components/ComingSoon';
import { useAuth } from '@/components/AuthProvider';

export default function EmailPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();
  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();

  return (
    <ComingSoon
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: projectName, href: `/dashboard/${projectSlug}` },
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
