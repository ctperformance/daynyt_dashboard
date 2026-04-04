'use client';

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import KpiCard from '@/components/KpiCard';
import ConnectPrompt from '@/components/ConnectPrompt';
import { useAuth } from '@/components/AuthProvider';

export default function TikTokPage({ params }) {
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
          setConnected(data.tiktok?.connected || false);
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
        const res = await fetch(`/api/tiktok/campaigns?project_id=${projectId}&days=${days}`);
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns || []);
          setTotals(data.totals || {});
          setAccount(data.account || {});
        } else if (res.status === 404) {
          setConnected(false);
        } else {
          setError('Fehler beim Laden der Kampagnendaten.');
        }
      } catch {
        setError('Netzwerkfehler beim Laden der Daten.');
      }
    }
    fetchCampaigns();
  }, [connected, days, projectId]);

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="flex items-center gap-2 text-sm mb-1">
        <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">Dashboard</Link>
        <span className="text-gray-600">/</span>
        <Link href={`/dashboard/${projectSlug}`} className="text-gray-500 hover:text-ease-cream transition-colors">{projectName}</Link>
        <span className="text-gray-600">/</span>
        <span className="text-ease-cream font-medium">TikTok Ads</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-ease-cream">TikTok Ads</h1>
          {account?.name && (
            <p className="text-xs text-gray-500 mt-0.5">Konto: {account.name}</p>
          )}
        </div>
        {connected && (
          <div className="flex items-center gap-2">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  days === d
                    ? 'bg-ease-accent/10 text-ease-accent font-medium'
                    : 'text-gray-500 hover:text-ease-cream hover:bg-white/5'
                }`}
              >
                {d}T
              </button>
            ))}
          </div>
        )}
      </div>

      {connected === null && (
        <div className="text-center py-20"><div className="text-gray-600 text-sm">Laden...</div></div>
      )}

      {connected === false && (
        <ConnectPrompt
          provider="tiktok"
          title="TikTok Ads"
          description="Verbinde dein TikTok Ads Konto, um Kampagnen-Performance, Impressionen, Klicks und Conversion-Daten direkt im Dashboard zu sehen."
          icon={'\u266A'}
          features={[
            'Kampagnen-Uebersicht mit Spend & Impressionen',
            'Klick- & CTR-Tracking ueber Zeit',
            'Conversion-Tracking & CPA-Analyse',
            'Zielgruppen-Performance & Reichweite',
          ]}
          projectId={projectId}
          projectSlug={projectSlug}
        />
      )}

      {connected === true && (
        <>
          {error && (
            <div className="bg-ease-red/10 border border-ease-red/30 text-ease-red text-sm px-4 py-3 rounded-xl mb-6">{error}</div>
          )}

          {totals && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <KpiCard title="Ausgaben" value={`\u20AC${Number(totals.spend || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`} icon={'\u266A'} />
              <KpiCard title="Impressionen" value={Number(totals.impressions || 0).toLocaleString('de-DE')} />
              <KpiCard title="Klicks" value={Number(totals.clicks || 0).toLocaleString('de-DE')} />
              <KpiCard title="CTR" value={`${totals.ctr || '0.00'}%`} />
              <KpiCard title="Conversions" value={Number(totals.conversions || 0).toLocaleString('de-DE')} />
              <KpiCard title="CPA" value={`\u20AC${totals.cpa || '0.00'}`} />
            </div>
          )}

          {campaigns && campaigns.length > 0 && (
            <div className="bg-ease-card border border-ease-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-ease-border">
                <h2 className="text-sm font-medium text-ease-cream">Kampagnen</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ease-border text-xs text-gray-500">
                      <th className="text-left px-5 py-3 font-medium">Kampagne</th>
                      <th className="text-right px-4 py-3 font-medium">Ausgaben</th>
                      <th className="text-right px-4 py-3 font-medium">Impressionen</th>
                      <th className="text-right px-4 py-3 font-medium">Klicks</th>
                      <th className="text-right px-4 py-3 font-medium">CTR</th>
                      <th className="text-right px-4 py-3 font-medium">Conversions</th>
                      <th className="text-right px-5 py-3 font-medium">CPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="border-b border-ease-border/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 text-ease-cream font-medium truncate max-w-[200px]">{campaign.name}</td>
                        <td className="text-right px-4 py-3 text-gray-400">{'\u20AC'}{Number(campaign.spend).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
                        <td className="text-right px-4 py-3 text-gray-400">{Number(campaign.impressions).toLocaleString('de-DE')}</td>
                        <td className="text-right px-4 py-3 text-gray-400">{Number(campaign.clicks).toLocaleString('de-DE')}</td>
                        <td className="text-right px-4 py-3 text-gray-400">{campaign.ctr}%</td>
                        <td className="text-right px-4 py-3 text-gray-400">{campaign.conversions}</td>
                        <td className="text-right px-5 py-3 text-gray-400">{'\u20AC'}{campaign.cpa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {campaigns && campaigns.length === 0 && !error && (
            <div className="bg-ease-card border border-ease-border rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">Keine Kampagnendaten fuer diesen Zeitraum gefunden.</p>
            </div>
          )}

          {!campaigns && !error && (
            <div className="text-center py-12"><div className="text-gray-600 text-sm">Kampagnendaten werden geladen...</div></div>
          )}
        </>
      )}
    </div>
  );
}
