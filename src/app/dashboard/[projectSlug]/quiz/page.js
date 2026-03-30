'use client';

import { useState, useMemo, useEffect, use } from 'react';
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

export default function QuizPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();
  const [days, setDays] = useState(30);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();

  useEffect(() => {
    if (!project) return;

    setLoading(true);
    fetch(`/api/dashboard-stats?project_id=${project.id}&days=${days}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.submissions && data.submissions.length > 0) {
          setLiveData(data);
          setHasData(true);
        } else {
          setLiveData(null);
          setHasData(false);
        }
      })
      .catch(() => {
        setLiveData(null);
        setHasData(false);
      })
      .finally(() => setLoading(false));
  }, [project, days]);

  // Empty state
  if (!loading && !hasData) {
    return (
      <div className="px-8 py-8 max-w-7xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-1">
          <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">Dashboard</Link>
          <span className="text-gray-600">/</span>
          <Link href={`/dashboard/${projectSlug}`} className="text-gray-500 hover:text-ease-cream transition-colors">{projectName}</Link>
          <span className="text-gray-600">/</span>
          <span className="text-ease-cream font-medium">Quiz</span>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-ease-cream">Nervensystem-Quiz</h1>
          <p className="text-xs text-gray-500 mt-0.5">Quiz Analytics & Funnel-Daten</p>
        </div>

        <div className="bg-ease-card border border-ease-border rounded-2xl p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-ease-accent/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            ✦
          </div>
          <h2 className="text-lg font-semibold text-ease-cream mb-2">Noch keine Quiz-Daten vorhanden</h2>
          <p className="text-sm text-gray-500 mb-6">
            Verbinde dein Quiz über die Einstellungen, um Abschlüsse, Funnel-Daten und Stress-Analysen zu sehen.
          </p>
          <Link
            href={`/dashboard/${projectSlug}/settings`}
            className="inline-flex items-center gap-2 bg-ease-accent hover:bg-ease-accent/90 text-black font-medium text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            Einstellungen öffnen
          </Link>
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-1">
        <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">Dashboard</Link>
        <span className="text-gray-600">/</span>
        <Link href={`/dashboard/${projectSlug}`} className="text-gray-500 hover:text-ease-cream transition-colors">{projectName}</Link>
        <span className="text-gray-600">/</span>
        <span className="text-ease-cream font-medium">Quiz</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ease-cream">Nervensystem-Quiz</h1>
          <p className="text-xs text-gray-500 mt-0.5">Quiz Analytics & Funnel-Daten</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-ease-card border border-ease-border rounded-lg px-3 py-1.5 text-sm text-ease-cream focus:outline-none focus:border-ease-accent"
          >
            <option value={7}>Letzte 7 Tage</option>
            <option value={14}>Letzte 14 Tage</option>
            <option value={30}>Letzte 30 Tage</option>
            <option value={90}>Letzte 90 Tage</option>
          </select>
          {loading && <span className="text-xs text-ease-accent">Laden...</span>}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Quiz-Abschlüsse" value={totalSubmissions} subtitle={`in ${days} Tagen`} trend={12} />
          <KpiCard title="Avg. Stress-Score" value={avgStress} subtitle="von 100" trend={-3} />
          <KpiCard title="Completion Rate" value={`${completionRate}%`} subtitle="Intro → Ergebnis" trend={5} />
          <KpiCard title="E-Mail Capture" value={`${emailRate}%`} subtitle="der Quiz-Starter" trend={8} />
        </div>

        {/* Funnel + Time Series */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {funnel.length > 0 && <FunnelChart data={funnel} />}
          {timeSeries.length > 0 && <TimeSeriesChart data={timeSeries} />}
        </div>

        {/* Stress Distribution + Symptoms + Wishes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {stressDist.length > 0 && <StressDistChart data={stressDist} />}
          {symptoms.length > 0 && <HorizontalBarList title="Top Symptome (Frage 4)" data={symptoms} color="#ef4444" />}
          {wishes.length > 0 && <HorizontalBarList title="Grösste Wünsche (Frage 7)" data={wishes} color="#22c55e" />}
        </div>

        {/* Recent Submissions */}
        {submissions.length > 0 && <RecentSubmissions submissions={submissions} limit={15} />}
      </div>
    </div>
  );
}
