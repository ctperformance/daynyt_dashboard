'use client';

import { use } from 'react';
import ComingSoon from '@/components/ComingSoon';
import { useAuth } from '@/components/AuthProvider';

export default function AdsPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();
  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();

  return (
    <ComingSoon
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: projectName, href: `/dashboard/${projectSlug}` },
        { label: 'Ads Manager' },
      ]}
      title="Ads Manager"
      description="Erstelle, verwalte und optimiere deine Werbekampagnen direkt aus dem Dashboard heraus."
      icon="▶"
      features={[
        'Multi-Channel Kampagnen-Erstellung (Meta, Google, TikTok)',
        'Budget-Optimierung mit KI-Empfehlungen',
        'A/B Testing und Creative-Analyse',
        'Automatisierte Reporting & Alerts',
      ]}
    />
  );
}
