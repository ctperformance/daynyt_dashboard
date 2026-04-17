'use client';

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import KpiCard from '@/components/KpiCard';
import ConnectPrompt from '@/components/ConnectPrompt';
import DateRangeSelector from '@/components/DateRangeSelector';
import { useAuth } from '@/components/AuthProvider';

function fmt(n, decimals = 0) {
  return Number(n || 0).toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function EmailPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();
  const [connected, setConnected] = useState(null);
  const [totals, setTotals] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [lists, setLists] = useState(null);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30d');

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
          setConnected(data.klaviyo?.connected || false);
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
    async function fetchData() {
      try {
        const res = await fetch(`/api/klaviyo/stats?project_id=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setTotals(data.totals || {});
          setCampaigns(data.campaigns || []);
          setLists(data.lists || []);
        } else if (res.status === 404) {
          setConnected(false);
        } else {
          setError('Fehler beim Laden der E-Mail-Daten.');
        }
      } catch {
        setError('Netzwerkfehler beim Laden der Daten.');
      }
    }
    fetchData();
  }, [connected, projectId]);

  return (
    <div className="px-8 py-8 max-w-[1800px] mx-auto w-full">
      <div className="flex items-center gap-2 text-sm mb-1">
        <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">Dashboard</Link>
        <span className="text-gray-600">/</span>
        <Link href={`/dashboard/${projectSlug}`} className="text-gray-500 hover:text-ease-cream transition-colors">{projectName}</Link>
        <span className="text-gray-600">/</span>
        <span className="text-ease-cream font-medium">E-Mail Marketing</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-ease-cream">E-Mail Marketing</h1>
        {connected && <DateRangeSelector selected={dateRange} onChange={setDateRange} />}
      </div>

      {connected === null && (
        <div className="text-center py-20"><div className="text-gray-600 text-sm">Laden...</div></div>
      )}

      {connected === false && (
        <ConnectPrompt
          provider="klaviyo"
          title="Klaviyo"
          description="Verbinde dein Klaviyo-Konto, um E-Mail-Kampagnen, Subscriber-Wachstum und Umsatzdaten direkt im Dashboard zu sehen."
          icon={'\u2709'}
          features={[
            'Subscriber-Wachstum & Listenverwaltung',
            'Kampagnen-Performance (Open Rate, CTR, Umsatz)',
            'Flow-Analyse & Automation-Stats',
            'Umsatz-Attribution pro Kampagne',
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
              <KpiCard title="Subscribers" value={fmt(totals.subscribers)} icon={'\u2709'} />
              <KpiCard title="Emails gesendet" value={fmt(totals.sends)} />
              <KpiCard title="Open Rate" value={`${totals.open_rate}%`} />
              <KpiCard title="Click Rate" value={`${totals.click_rate}%`} />
              <KpiCard title="Umsatz" value={`\u20AC${fmt(totals.revenue, 2)}`} />
              <KpiCard title="Abmeldungen" value={fmt(totals.unsubscribes)} />
            </div>
          )}

          {/* Campaign Table */}
          {campaigns && campaigns.length > 0 && (
            <div className="bg-ease-card border border-ease-border rounded-xl overflow-hidden mb-8">
              <div className="px-5 py-4 border-b border-ease-border">
                <h2 className="text-sm font-medium text-ease-cream">Kampagnen</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ease-border text-xs text-gray-500">
                      <th className="text-left px-5 py-3 font-medium">Name</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Gesendet</th>
                      <th className="text-right px-4 py-3 font-medium">Oeffnungen</th>
                      <th className="text-right px-4 py-3 font-medium">Klicks</th>
                      <th className="text-right px-4 py-3 font-medium">Open Rate</th>
                      <th className="text-right px-4 py-3 font-medium">Click Rate</th>
                      <th className="text-right px-5 py-3 font-medium">Umsatz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="border-b border-ease-border/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 text-ease-cream font-medium truncate max-w-[200px]">{campaign.name}</td>
                        <td className="text-center px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full ${
                            campaign.status === 'sent'
                              ? 'text-ease-green bg-ease-green/10'
                              : campaign.status === 'draft'
                              ? 'text-gray-500 bg-white/5'
                              : 'text-ease-accent bg-ease-accent/10'
                          }`}>
                            {campaign.status === 'sent' ? 'Gesendet' : campaign.status === 'draft' ? 'Entwurf' : campaign.status}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3 text-gray-400">{fmt(campaign.sends)}</td>
                        <td className="text-right px-4 py-3 text-gray-400">{fmt(campaign.opens)}</td>
                        <td className="text-right px-4 py-3 text-gray-400">{fmt(campaign.clicks)}</td>
                        <td className="text-right px-4 py-3 text-gray-400">{campaign.open_rate}%</td>
                        <td className="text-right px-4 py-3 text-gray-400">{campaign.click_rate}%</td>
                        <td className="text-right px-5 py-3 text-gray-400">{'\u20AC'}{fmt(campaign.revenue, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* List Overview */}
          {lists && lists.length > 0 && (
            <div className="bg-ease-card border border-ease-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-ease-border">
                <h2 className="text-sm font-medium text-ease-cream">Listen-Uebersicht</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ease-border text-xs text-gray-500">
                      <th className="text-left px-5 py-3 font-medium">Name</th>
                      <th className="text-right px-4 py-3 font-medium">Subscribers</th>
                      <th className="text-right px-5 py-3 font-medium">Erstellt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lists.map((list) => (
                      <tr key={list.id} className="border-b border-ease-border/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 text-ease-cream font-medium">{list.name}</td>
                        <td className="text-right px-4 py-3 text-gray-400">{fmt(list.subscriber_count)}</td>
                        <td className="text-right px-5 py-3 text-gray-400">
                          {list.created ? new Date(list.created).toLocaleDateString('de-DE') : '\u2014'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {campaigns && campaigns.length === 0 && !error && (
            <div className="bg-ease-card border border-ease-border rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">Keine Kampagnendaten gefunden.</p>
            </div>
          )}

          {!campaigns && !error && (
            <div className="text-center py-12"><div className="text-gray-600 text-sm">E-Mail-Daten werden geladen...</div></div>
          )}
        </>
      )}
    </div>
  );
}
