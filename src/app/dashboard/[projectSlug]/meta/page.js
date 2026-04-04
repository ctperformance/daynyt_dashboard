'use client';

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import KpiCard from '@/components/KpiCard';
import ConnectPrompt from '@/components/ConnectPrompt';
import { useAuth } from '@/components/AuthProvider';

export default function MetaPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();
  const [connected, setConnected] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [totals, setTotals] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();
  const projectId = project?.id;

  useEffect(() => {
    if (!projectId) return;
    async function checkStatus() {
      try {
        const res = await fetch(`/api/integrations/status?project_id=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setConnected(data.meta?.connected || false);
        } else {
          setConnected(false);
        }
      } catch {
        setConnected(false);
      }
    }
    checkStatus();
  }, [projectId]);

  useEffect(() => {
    if (!connected || !projectId) return;
    async function fetchCampaigns() {
      try {
        const res = await fetch(`/api/meta/campaigns?project_id=${projectId}&days=${days}`);
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns || []);
          setTotals(data.totals || {});
          setAccount(data.account || {});
        } else if (res.status === 401) {
          const errData = await res.json().catch(() => ({}));
          setError(errData.token_expired ? 'Meta Token abgelaufen — bitte neu verbinden unter Einstellungen.' : 'Authentifizierungsfehler');
        } else if (res.status === 404) {
          setConnected(false);
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.detail || errData.error || 'Fehler beim Laden der Kampagnendaten.');
        }
      } catch {
        setError('Netzwerkfehler beim Laden der Daten.');
      }
    }
    fetchCampaigns();
  }, [connected, days, projectId]);

  return (
    <div className="px-8 py-8 max-w-6xl">
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
            'Conversion-Funnel (View → Click → Purchase)',
            'Audience Insights & Demographics',
          ]}
          projectId={projectId}
          projectSlug={projectSlug}
        />
      )}

      {connected === true && (
        <>
          {error && (
            <div className="bg-ease-red/5 border border-ease-red/20 text-ease-red text-sm px-4 py-3 rounded-xl mb-6 animate-fade-in">{error}</div>
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

          {campaigns && campaigns.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h2 className="text-sm font-semibold">Kampagnen</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] text-white/30 uppercase tracking-wider">
                      <th className="text-left px-5 py-3 font-medium">Kampagne</th>
                      <th className="text-right px-4 py-3 font-medium">Ausgaben</th>
                      <th className="text-right px-4 py-3 font-medium">Impressionen</th>
                      <th className="text-right px-4 py-3 font-medium">Klicks</th>
                      <th className="text-right px-4 py-3 font-medium">CTR</th>
                      <th className="text-right px-4 py-3 font-medium">Käufe</th>
                      <th className="text-right px-4 py-3 font-medium">ROAS</th>
                      <th className="text-right px-5 py-3 font-medium">CPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="border-b border-white/[0.03] table-row-hover">
                        <td className="px-5 py-3 font-medium truncate max-w-[200px]">{campaign.name}</td>
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
              </div>
            </div>
          )}

          {campaigns && campaigns.length === 0 && !error && (
            <div className="glass rounded-2xl p-10 text-center animate-fade-in">
              <p className="text-ease-muted text-sm">Keine Kampagnendaten für diesen Zeitraum gefunden.</p>
            </div>
          )}

          {!campaigns && !error && (
            <div className="text-center py-12 animate-fade-in">
              <div className="text-ease-muted text-sm">Kampagnendaten werden geladen...</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
