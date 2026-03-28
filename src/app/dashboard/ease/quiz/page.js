'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import KpiCard from '@/components/KpiCard';
import FunnelChart from '@/components/FunnelChart';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import StressDistChart from '@/components/StressDistChart';
import HorizontalBarList from '@/components/HorizontalBarList';
import RecentSubmissions from '@/components/RecentSubmissions';
import {
  generateDemoSubmissions,
  generateDemoFunnel,
  aggregateFunnel,
  submissionsTimeSeries,
  stressDistribution,
  topSymptoms,
  topWishes,
  aggregateFunnelFromEvents,
} from '@/lib/demo-data';

const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;

export default function QuizPage() {
  const [days, setDays] = useState(30);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(true);

  useEffect(() => {
    if (!PROJECT_ID) return;

    setLoading(true);
    fetch(`/api/dashboard-stats?project_id=${PROJECT_ID}&days=${days}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.submissions && data.submissions.length > 0) {
          setLiveData(data);
          setIsDemo(false);
        } else {
          setLiveData(null);
          setIsDemo(true);
        }
      })
      .catch(() => {
        setLiveData(null);
        setIsDemo(true);
      })
      .finally(() => setLoading(false));
  }, [days]);

  const submissions = useMemo(() => {
    if (liveData?.submissions?.length > 0) return liveData.submissions;
    return generateDemoSubmissions(days);
  }, [liveData, days]);

  const funnel = useMemo(() => {
    if (liveData?.funnelEvents?.length > 0) {
      return aggregateFunnelFromEvents(liveData.funnelEvents);
    }
    const funnelDaily = generateDemoFunnel(days);
    return aggregateFunnel(funnelDaily);
  }, [liveData, days]);

  const timeSeries = useMemo(() => submissionsTimeSeries(submissions, days), [submissions, days]);
  const stressDist = useMemo(() => stressDistribution(submissions), [submissions]);
  const symptoms = useMemo(() => topSymptoms(submissions), [submissions]);
  const wishes = useMemo(() => topWishes(submissions), [submissions]);

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
        <Link href="/dashboard/ease" className="text-gray-500 hover:text-ease-cream transition-colors">EASE</Link>
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
          {isDemo && (
            <span className="text-xs text-gray-600 bg-ease-card border border-ease-border rounded-full px-3 py-1">
              Demo-Daten
            </span>
          )}
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
          <FunnelChart data={funnel} />
          <TimeSeriesChart data={timeSeries} />
        </div>

        {/* Stress Distribution + Symptoms + Wishes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StressDistChart data={stressDist} />
          <HorizontalBarList title="Top Symptome (Frage 4)" data={symptoms} color="#ef4444" />
          <HorizontalBarList title="Grösste Wünsche (Frage 7)" data={wishes} color="#22c55e" />
        </div>

        {/* Recent Submissions */}
        <RecentSubmissions submissions={submissions} limit={15} />

        {isDemo && (
          <p className="text-center text-xs text-gray-600 pb-6">
            Aktuell mit Demo-Daten. Verbinde deinen Shopify-Quiz-Webhook um echte Daten zu sehen.
          </p>
        )}
      </div>
    </div>
  );
}
