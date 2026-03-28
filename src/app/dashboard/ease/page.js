'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;

const CHANNELS = [
  {
    key: 'quiz',
    title: 'Nervensystem-Quiz',
    description: 'Quiz-Abschlüsse, Funnel-Analyse, Stress-Verteilung & E-Mail Capture',
    href: '/dashboard/ease/quiz',
    icon: '✦',
    live: true,
  },
  {
    key: 'meta',
    title: 'Meta Ads',
    description: 'Kampagnen-Performance, ROAS, CPA, Impressionen & Conversions',
    href: '/dashboard/ease/meta',
    icon: '◎',
    live: false,
  },
  {
    key: 'shopify',
    title: 'Shopify',
    description: 'Umsatz, Bestellungen, AOV, Conversion Rate & Top-Produkte',
    href: '/dashboard/ease/shopify',
    icon: '⬡',
    live: false,
  },
  {
    key: 'email',
    title: 'E-Mail Marketing',
    description: 'Öffnungsraten, Klickraten, Abonnenten-Wachstum & Kampagnen',
    href: '/dashboard/ease/email',
    icon: '✉',
    live: false,
  },
];

export default function EaseOverview() {
  const [quizStats, setQuizStats] = useState(null);

  useEffect(() => {
    if (!PROJECT_ID) return;
    fetch(`/api/dashboard-stats?project_id=${PROJECT_ID}&days=30`)
      .then((res) => res.json())
      .then((data) => {
        if (data.submissions) {
          setQuizStats({
            submissions: data.submissions.length,
            avgStress: data.submissions.length > 0
              ? Math.round(data.submissions.reduce((s, r) => s + (r.stress_score || 0), 0) / data.submissions.length)
              : 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Breadcrumb + Header */}
      <div className="flex items-center gap-2 text-sm mb-1">
        <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">
          Dashboard
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-ease-cream font-medium">EASE</span>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ease-cream">EASE</h1>
        <p className="text-sm text-gray-500 mt-1">Nervensystem & Stressmanagement — Alle Kanäle</p>
      </div>

      {/* Quick Stats */}
      {quizStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <QuickStat label="Quiz-Abschlüsse" value={quizStats.submissions} period="30 Tage" />
          <QuickStat label="Avg. Stress" value={quizStats.avgStress} period="von 100" />
          <QuickStat label="Meta ROAS" value="--" period="Nicht verbunden" muted />
          <QuickStat label="Shopify Umsatz" value="--" period="Nicht verbunden" muted />
        </div>
      )}

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHANNELS.map((channel) => (
          <ChannelCard key={channel.key} channel={channel} quizStats={quizStats} />
        ))}
      </div>

      {/* Integration Hint */}
      <div className="mt-8 border border-dashed border-ease-border rounded-xl p-6 text-center">
        <p className="text-sm text-gray-500">
          Weitere Integrationen? Verbinde neue Datenquellen unter{' '}
          <Link href="/dashboard/ease/settings" className="text-ease-accent hover:underline">
            Einstellungen
          </Link>
        </p>
      </div>
    </div>
  );
}

function QuickStat({ label, value, period, muted }) {
  return (
    <div className="bg-ease-card border border-ease-border rounded-xl px-4 py-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${muted ? 'text-gray-600' : 'text-ease-cream'}`}>{value}</p>
      <p className="text-[11px] text-gray-600 mt-0.5">{period}</p>
    </div>
  );
}

function ChannelCard({ channel, quizStats }) {
  const isLive = channel.live;

  return (
    <Link
      href={channel.href}
      className="group bg-ease-card border border-ease-border rounded-xl p-5 hover:border-ease-accent/30 transition-all duration-200 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
            isLive ? 'bg-ease-accent/10 text-ease-accent' : 'bg-white/5 text-gray-600'
          }`}>
            {channel.icon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-ease-cream group-hover:text-ease-accent transition-colors">
              {channel.title}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{channel.description}</p>
          </div>
        </div>
        <div className="shrink-0 mt-1">
          {isLive ? (
            <span className="flex items-center gap-1.5 text-[11px] text-ease-green bg-ease-green/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-ease-green rounded-full animate-pulse" />
              Live
            </span>
          ) : (
            <span className="text-[11px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
              Bald verfügbar
            </span>
          )}
        </div>
      </div>

      {/* Mini stats for live quiz */}
      {channel.key === 'quiz' && quizStats && (
        <div className="flex gap-6 pt-2 border-t border-ease-border/50 mt-1">
          <div>
            <span className="text-lg font-semibold text-ease-cream">{quizStats.submissions}</span>
            <span className="text-[11px] text-gray-500 ml-1.5">Abschlüsse</span>
          </div>
          <div>
            <span className="text-lg font-semibold text-ease-cream">{quizStats.avgStress}</span>
            <span className="text-[11px] text-gray-500 ml-1.5">Avg. Stress</span>
          </div>
        </div>
      )}

      {/* Placeholder for non-live */}
      {!isLive && (
        <div className="flex gap-6 pt-2 border-t border-ease-border/50 mt-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-16 bg-white/5 rounded" />
            <div className="h-3 w-10 bg-white/5 rounded" />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <span className="text-gray-600 group-hover:text-ease-accent group-hover:translate-x-1 transition-all text-sm">
          →
        </span>
      </div>
    </Link>
  );
}
