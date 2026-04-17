'use client';

import Link from 'next/link';
import { useState, use } from 'react';
import useSWR from 'swr';
import KpiCard from '@/components/KpiCard';
import ConnectPrompt from '@/components/ConnectPrompt';
import { useAuth } from '@/components/AuthProvider';
import { fetcher, swrLiveOptions, swrStaticOptions } from '@/lib/fetcher';

const STATUS_FILTERS = [
  { key: 'LIVE', label: 'Live', match: (s) => s === 'ACTIVE' },
  { key: 'PAUSED', label: 'Pausiert', match: (s) => s === 'PAUSED' },
  { key: 'ALL', label: 'Alle', match: () => true },
];

export default function MetaPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();
  const [days, setDays] = useState(30);
  const [statusFilter, setStatusFilter] = useState('LIVE');

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();
  const projectId = project?.id;

  // Cached integration status — rarely changes, long cache
  const { data: statusData } = useSWR(
    projectId ? `/api/integrations/status?project_id=${projectId}` : null,
    fetcher,
    swrStaticOptions,
  );
  const connected = statusData?.meta?.connected ?? null;
  const needsReauth = statusData?.meta?.needs_reauth === true;
  const expiringSoon = statusData?.meta?.expiring_soon === true;
  const tokenExpiresAt = statusData?.meta?.token_expires_at;

  // Cached campaign data — shows stale data instantly, revalidates in background
  const { data: campaignData, error: campaignError, isLoading, mutate } = useSWR(
    connected && !needsReauth && projectId ? `/api/meta/campaigns?project_id=${projectId}&days=${days}` : null,
    fetcher,
    swrLiveOptions,
  );

  const allCampaigns = campaignData?.campaigns || null;
  const filter = STATUS_FILTERS.find((f) => f.key === statusFilter) || STATUS_FILTERS[0];
  const campaigns = allCampaigns ? allCampaigns.filter((c) => filter.match(c.status)) : null;
  const statusCounts = allCampaigns ? {
    LIVE: allCampaigns.filter((c) => c.status === 'ACTIVE').length,
    PAUSED: allCampaigns.filter((c) => c.status === 'PAUSED').length,
    ALL: allCampaigns.length,
  } : null;
  const totals = campaignData?.totals || null;
  const account = campaignData?.account || null;

  const error = campaignError?.info?.token_expired
    ? 'Meta Token abgelaufen \u2014 bitte neu verbinden unter Einstellungen.'
    : campaignError?.info?.detail || campaignError?.info?.error || (campaignError ? 'Fehler beim Laden der Kampagnendaten.' : null);

  return (
    <div className="px-8 py-8 max-w-[1800px] mx-auto w-full">
      <div className="flex items-center gap-2 text-xs mb-2 animate-fade-in">
        <Link href="/dashboard" className="text-ease-muted hover:text-white transition-colors">Dashboard</Link>
        <span className="text-white/20">/</span>
        <Link href={`/dashboard/${projectSlug}`} className="text-ease-muted hover:text-white transition-colors">{projectName}</Link>
        <span className="text-white/20">/</span>
        <span className="text-white font-medium">Meta Ads</span>
      </div>

      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meta Ads</h1>
          {account?.name && (
            <p className="text-xs text-ease-muted mt-1">Konto: {account.name} ({account.currency})</p>
          )}
        </div>
        {connected && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => mutate()}
              className="text-xs text-ease-muted hover:text-white transition-colors"
            >
              {'\u21BB'} Aktualisieren
            </button>
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
        )}
      </div>

      {connected === null && (
        <div className="text-center py-20 animate-fade-in">
          <div className="text-ease-muted text-sm">Laden...</div>
        </div>
      )}

      {connected === false && (
        <ConnectPrompt
          provider="meta"
          title="Meta Ads"
          description="Verbinde deinen Meta Business Manager, um Kampagnen-Performance, ROAS, CPA und Conversion-Daten direkt im Dashboard zu sehen."
          icon={'\u25CE'}
          features={[
            'Kampagnen-Übersicht mit Spend, Impressionen & Klicks',
            'ROAS & CPA Tracking über Zeit',
            'Conversion-Funnel (View \u2192 Click \u2192 Purchase)',
            'Audience Insights & Demographics',
          ]}
          projectId={projectId}
          projectSlug={projectSlug}
        />
      )}

      {connected === true && needsReauth && (
        <div className="glass rounded-2xl border border-ease-red/30 bg-ease-red/5 p-5 mb-6 animate-fade-in flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ease-red">Meta-Verbindung abgelaufen</p>
            <p className="text-xs text-ease-muted mt-1">
              Dein Meta Access Token ist abgelaufen{tokenExpiresAt ? ` (am ${new Date(tokenExpiresAt).toLocaleDateString('de-DE')})` : ''}. Verbinde dich erneut, um aktuelle Daten zu sehen.
            </p>
          </div>
          <Link
            href={`/dashboard/${projectSlug}/integrations`}
            className="text-xs font-medium bg-ease-red/20 hover:bg-ease-red/30 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Jetzt neu verbinden
          </Link>
        </div>
      )}

      {connected === true && !needsReauth && expiringSoon && (
        <div className="glass rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 mb-6 animate-fade-in flex items-center justify-between gap-4">
          <p className="text-xs text-amber-200">
            Meta Token l\u00E4uft bald ab{tokenExpiresAt ? ` (${new Date(tokenExpiresAt).toLocaleDateString('de-DE')})` : ''}. Wird automatisch erneuert \u2014 falls das fehlschl\u00E4gt, bitte manuell neu verbinden.
          </p>
          <Link href={`/dashboard/${projectSlug}/integrations`} className="text-xs text-white/60 hover:text-white">
            Einstellungen \u2192
          </Link>
        </div>
      )}

      {connected === true && !needsReauth && (
        <>
          {error && (
            <div className="bg-ease-red/5 border border-ease-red/20 text-ease-red text-sm px-4 py-3 rounded-xl mb-6 animate-fade-in">{error}</div>
          )}

          {/* Loading skeleton — only when no cached data */}
          {isLoading && !campaignData && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="glass rounded-2xl p-5 space-y-3">
                    <div className="skeleton h-3 w-16 rounded" />
                    <div className="skeleton h-6 w-20 rounded" />
                  </div>
                ))}
              </div>
              <div className="glass rounded-2xl p-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex gap-4 py-3 border-b border-white/[0.03]">
                    <div className="skeleton h-4 w-40 rounded" />
                    <div className="skeleton h-4 w-16 rounded ml-auto" />
                    <div className="skeleton h-4 w-16 rounded" />
                    <div className="skeleton h-4 w-16 rounded" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {totals && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.05s' }}>
              <KpiCard title="Ausgaben" value={`\u20AC${Number(totals.spend || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`} />
              <KpiCard title="ROAS" value={`${totals.roas || '0.00'}x`} />
              <KpiCard title="CPA" value={`\u20AC${totals.cpa || '0.00'}`} />
              <KpiCard title="Impressionen" value={Number(totals.impressions || 0).toLocaleString('de-DE')} />
              <KpiCard title="Klicks" value={Number(totals.clicks || 0).toLocaleString('de-DE')} />
              <KpiCard title="Käufe" value={Number(totals.purchases || 0).toLocaleString('de-DE')} />
            </div>
          )}

          {allCampaigns && allCampaigns.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-sm font-semibold">Kampagnen</h2>
                <div className="flex items-center gap-1">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStatusFilter(f.key)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                        statusFilter === f.key
                          ? 'bg-white/10 text-white font-medium'
                          : 'text-ease-muted hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {f.label}
                      {statusCounts && (
                        <span className="ml-1.5 text-[10px] text-white/30">({statusCounts[f.key]})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] text-white/30 uppercase tracking-wider">
                      <th className="text-left px-5 py-3 font-medium">Kampagne</th>
                      <th className="text-left px-3 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Ausgaben</th>
                      <th className="text-right px-4 py-3 font-medium">Impressionen</th>
                      <th className="text-right px-4 py-3 font-medium">Klicks</th>
                      <th className="text-right px-4 py-3 font-medium">CTR</th>
                      <th className="text-right px-4 py-3 font-medium">K\u00E4ufe</th>
                      <th className="text-right px-4 py-3 font-medium">ROAS</th>
                      <th className="text-right px-5 py-3 font-medium">CPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns && campaigns.map((campaign) => (
                      <tr key={campaign.id} className="border-b border-white/[0.03] table-row-hover">
                        <td className="px-5 py-3 font-medium truncate max-w-[240px]">{campaign.name}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={campaign.status} />
                        </td>
                        <td className="text-right px-4 py-3 text-ease-muted">{'\u20AC'}{Number(campaign.spend).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
                        <td className="text-right px-4 py-3 text-ease-muted">{Number(campaign.impressions).toLocaleString('de-DE')}</td>
                        <td className="text-right px-4 py-3 text-ease-muted">{Number(campaign.clicks).toLocaleString('de-DE')}</td>
                        <td className="text-right px-4 py-3 text-ease-muted">{campaign.ctr}%</td>
                        <td className="text-right px-4 py-3 text-ease-muted">{campaign.purchases}</td>
                        <td className="text-right px-4 py-3">
                          <span className={parseFloat(campaign.roas) >= 1 ? 'text-ease-green' : 'text-ease-red'}>{campaign.roas}x</span>
                        </td>
                        <td className="text-right px-5 py-3 text-ease-muted">{'\u20AC'}{campaign.cpa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {campaigns && campaigns.length === 0 && (
                  <div className="text-center py-10 text-xs text-ease-muted">
                    Keine Kampagnen mit Status "{filter.label}" im gew\u00E4hlten Zeitraum.
                  </div>
                )}
              </div>
            </div>
          )}

          {allCampaigns && allCampaigns.length === 0 && !error && (
            <div className="glass rounded-2xl p-10 text-center animate-fade-in">
              <p className="text-ease-muted text-sm">Keine Kampagnendaten f\u00FCr diesen Zeitraum gefunden.</p>
            </div>
          )}

          {!allCampaigns && !error && !isLoading && (
            <div className="text-center py-12 animate-fade-in">
              <div className="text-ease-muted text-sm">Kampagnendaten werden geladen...</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = status || 'UNKNOWN';
  const config = {
    ACTIVE: { label: 'Live', cls: 'bg-ease-green/15 text-ease-green border-ease-green/25' },
    PAUSED: { label: 'Pausiert', cls: 'bg-white/5 text-white/50 border-white/10' },
    DELETED: { label: 'Gel\u00F6scht', cls: 'bg-ease-red/10 text-ease-red/80 border-ease-red/20' },
    ARCHIVED: { label: 'Archiviert', cls: 'bg-white/5 text-white/40 border-white/10' },
    IN_PROCESS: { label: 'In Pr\u00FCfung', cls: 'bg-amber-400/10 text-amber-300 border-amber-400/20' },
    WITH_ISSUES: { label: 'Problem', cls: 'bg-amber-400/10 text-amber-300 border-amber-400/20' },
    DISAPPROVED: { label: 'Abgelehnt', cls: 'bg-ease-red/10 text-ease-red/80 border-ease-red/20' },
    UNKNOWN: { label: '\u2014', cls: 'bg-white/5 text-white/40 border-white/10' },
  }[normalized] || { label: normalized, cls: 'bg-white/5 text-white/50 border-white/10' };

  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md border ${config.cls}`}>
      {config.label}
    </span>
  );
}
