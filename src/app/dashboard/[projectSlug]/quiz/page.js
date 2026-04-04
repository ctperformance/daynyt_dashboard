'use client';

import { useState, useMemo, use } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import KpiCard from '@/components/KpiCard';
import FunnelChart from '@/components/FunnelChart';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import StressDistChart from '@/components/StressDistChart';
import HorizontalBarList from '@/components/HorizontalBarList';
import RecentSubmissions from '@/components/RecentSubmissions';
import {
  aggregateFunnelFromEvents,
  submissionsTimeSeries,
  stressDistribution,
  topSymptoms,
  topWishes,
} from '@/lib/demo-data';
import { useAuth } from '@/components/AuthProvider';
import { fetcher, swrLiveOptions } from '@/lib/fetcher';

export default function QuizPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();
  const [days, setDays] = useState(30);

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();
  const projectId = project?.id;

  // Dynamic quiz name from project add-on config
  const quizAddon = project?.addons?.quiz;
  const quizName = quizAddon?.name || 'Quiz';
  const quizEnabled = quizAddon?.enabled;

  // If quiz add-on is not enabled for this project
  if (project && !quizEnabled) {
    return (
      <div className="px-8 py-8 max-w-7xl">
        <div className="flex items-center gap-2 text-xs mb-2 animate-fade-in">
          <Link href="/dashboard" className="text-ease-muted hover:text-white transition-colors">Dashboard</Link>
          <span className="text-white/20">/</span>
          <Link href={`/dashboard/${projectSlug}`} className="text-ease-muted hover:text-white transition-colors">{projectName}</Link>
          <span className="text-white/20">/</span>
          <span className="text-white font-medium">Quiz</span>
        </div>
        <div className="glass rounded-2xl p-16 text-center max-w-lg mx-auto mt-8 animate-fade-in">
          <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center text-2xl mx-auto mb-4">
            {'\u2726'}
          </div>
          <h2 className="text-base font-semibold mb-2">Quiz-Add-on nicht aktiviert</h2>
          <p className="text-sm text-ease-muted">
            Dieses Projekt hat kein Quiz-Add-on konfiguriert. Kontaktiere deinen Account-Manager, um ein Quiz-Funnel für dieses Projekt einzurichten.
          </p>
        </div>
      </div>
    );
  }

  // SWR cached fetch — data persists across navigations
  const { data: liveData, error, isLoading } = useSWR(
    projectId ? `/api/dashboard-stats?project_id=${projectId}&days=${days}` : null,
    fetcher,
    swrLiveOptions,
  );

  const hasData = liveData?.submissions?.length > 0;

  // Breadcrumb component
  const breadcrumb = (
    <div className="flex items-center gap-2 text-xs mb-2 animate-fade-in">
      <Link href="/dashboard" className="text-ease-muted hover:text-white transition-colors">Dashboard</Link>
      <span className="text-white/20">/</span>
      <Link href={`/dashboard/${projectSlug}`} className="text-ease-muted hover:text-white transition-colors">{projectName}</Link>
      <span className="text-white/20">/</span>
      <span className="text-white font-medium">{quizName}</span>
    </div>
  );

  // Loading state
  if (isLoading && !liveData) {
    return (
      <div className="px-8 py-8 max-w-7xl">
        {breadcrumb}
        <h1 className="text-2xl font-bold tracking-tight mb-8 animate-fade-in">{quizName}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass rounded-2xl p-5 space-y-3">
              <div className="skeleton h-3 w-16 rounded" />
              <div className="skeleton h-6 w-24 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-6 h-48"><div className="skeleton h-full w-full rounded" /></div>
          <div className="glass rounded-2xl p-6 h-48"><div className="skeleton h-full w-full rounded" /></div>
        </div>
      </div>
    );
  }

  // Empty state — Quiz is always "connected" (webhook), just no data yet
  if (!hasData) {
    return (
      <div className="px-8 py-8 max-w-7xl">
        {breadcrumb}
        <h1 className="text-2xl font-bold tracking-tight mb-8 animate-fade-in">{quizName}</h1>

        <div className="glass rounded-2xl p-16 text-center max-w-lg mx-auto animate-fade-in">
          <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center text-2xl mx-auto mb-4">
            {'\u2726'}
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-ease-green" />
            <span className="text-xs text-ease-green font-medium">Quiz verbunden</span>
          </div>
          <h2 className="text-base font-semibold mb-2">Noch keine Quiz-Daten eingegangen</h2>
          <p className="text-sm text-ease-muted mb-4">
            Dein Quiz-Webhook ist aktiv. Sobald die ersten Nutzer das Quiz abschließen, erscheinen hier Abschlüsse, Funnel-Daten und Stress-Analysen.
          </p>
          <div className="glass rounded-xl p-4 text-left text-xs text-ease-muted space-y-2">
            <p className="text-white/40 font-medium uppercase text-[10px]">Webhook-Endpunkt</p>
            <code className="block text-[11px] text-white/50 bg-white/[0.03] rounded-lg px-3 py-2 break-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/quiz
            </code>
            <p className="text-white/30 mt-2">
              Sende Quiz-Daten als POST an diesen Endpunkt mit dem passenden Webhook-Secret.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const submissions = liveData?.submissions || [];
  const funnel = liveData?.funnelEvents?.length > 0
    ? aggregateFunnelFromEvents(liveData.funnelEvents)
    : [];

  const timeSeries = submissionsTimeSeries(submissions, days);
  const stressDist = stressDistribution(submissions);
  const symptoms = topSymptoms(submissions);
  const wishes = topWishes(submissions);

  const totalSubmissions = submissions.length;
  const avgStress = totalSubmissions > 0
    ? Math.round(submissions.reduce((sum, s) => sum + (s.stress_score || 0), 0) / totalSubmissions)
    : 0;
  const completionRate = funnel.length >= 2
    ? Math.round((funnel[funnel.length - 1].count / funnel[0].count) * 100)
    : 0;
  const emailRate = (() => {
    const emailStep = funnel.find((f) => f.step === 'email');
    const introStep = funnel.find((f) => f.step === 'intro');
    if (emailStep && introStep) return Math.round((emailStep.count / introStep.count) * 100);
    return 0;
  })();

  return (
    <div className="px-8 py-8 max-w-7xl">
      {breadcrumb}

      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{quizName}</h1>
          <p className="text-xs text-ease-muted mt-1">Quiz Analytics & Funnel-Daten</p>
        </div>
        <div className="flex items-center gap-1">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                days === d
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-ease-muted hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {d}T
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <KpiCard title="Quiz-Abschlüsse" value={totalSubmissions} />
          <KpiCard title="Avg. Stress-Score" value={avgStress} />
          <KpiCard title="Completion Rate" value={`${completionRate}%`} />
          <KpiCard title="E-Mail Capture" value={`${emailRate}%`} />
        </div>

        {/* Funnel + Time Series */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {funnel.length > 0 && <FunnelChart data={funnel} />}
          {timeSeries.length > 0 && <TimeSeriesChart data={timeSeries} />}
        </div>

        {/* Stress Distribution + Symptoms + Wishes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          {stressDist.length > 0 && <StressDistChart data={stressDist} />}
          {symptoms.length > 0 && <HorizontalBarList title="Top Symptome (Frage 4)" data={symptoms} color="#ef4444" />}
          {wishes.length > 0 && <HorizontalBarList title="Größte Wünsche (Frage 7)" data={wishes} color="#22c55e" />}
        </div>

        {/* Recent Submissions */}
        {submissions.length > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <RecentSubmissions submissions={submissions} limit={15} />
          </div>
        )}
      </div>
    </div>
  );
}
