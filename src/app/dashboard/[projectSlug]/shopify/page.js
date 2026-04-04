'use client';

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import KpiCard from '@/components/KpiCard';
import ConnectPrompt from '@/components/ConnectPrompt';
import { useAuth } from '@/components/AuthProvider';

export default function ShopifyPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();
  const [connected, setConnected] = useState(null);
  const [stats, setStats] = useState(null);
  const [shop, setShop] = useState(null);
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
          setConnected(data.shopify?.connected || false);
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
    async function fetchStats() {
      try {
        const res = await fetch(`/api/shopify/stats?project_id=${projectId}&days=${days}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          setShop(data.shop || {});
        } else if (res.status === 404) {
          setConnected(false);
        } else {
          setError('Fehler beim Laden der Shopify-Daten.');
        }
      } catch {
        setError('Netzwerkfehler beim Laden der Daten.');
      }
    }
    fetchStats();
  }, [connected, days, projectId]);

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="flex items-center gap-2 text-sm mb-1">
        <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">Dashboard</Link>
        <span className="text-gray-600">/</span>
        <Link href={`/dashboard/${projectSlug}`} className="text-gray-500 hover:text-ease-cream transition-colors">{projectName}</Link>
        <span className="text-gray-600">/</span>
        <span className="text-ease-cream font-medium">Shopify</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-ease-cream">Shopify</h1>
          {shop?.name && <p className="text-xs text-gray-500 mt-0.5">Store: {shop.name}</p>}
        </div>
        {connected && (
          <div className="flex items-center gap-2">
            {[7, 14, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${days === d ? 'bg-ease-accent/10 text-ease-accent font-medium' : 'text-gray-500 hover:text-ease-cream hover:bg-white/5'}`}>{d}T</button>
            ))}
          </div>
        )}
      </div>

      {connected === null && (
        <div className="text-center py-20"><div className="text-gray-600 text-sm">Laden...</div></div>
      )}

      {connected === false && (
        <ConnectPrompt
          provider="shopify"
          title="Shopify"
          description="Verbinde deinen Shopify Store, um Umsatz, Bestellungen und Conversion-Daten in Echtzeit zu tracken."
          icon={'\u2B21'}
          features={[
            'Umsatz & Bestellungen pro Tag/Woche/Monat',
            'Average Order Value (AOV) Tracking',
            'Top-Produkte nach Umsatz & Menge',
            'Conversion Rate & Cart Abandonment',
            'Quiz \u2192 Kauf Attribution',
          ]}
          showShopInput={true}
          projectId={projectId}
          projectSlug={projectSlug}
        />
      )}

      {connected === true && (
        <>
          {error && (
            <div className="bg-ease-red/10 border border-ease-red/30 text-ease-red text-sm px-4 py-3 rounded-xl mb-6">{error}</div>
          )}

          {stats?.totals && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <KpiCard title="Umsatz" value={`\u20AC${Number(stats.totals.revenue || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`} icon={'\u2B21'} />
              <KpiCard title="Bestellungen" value={Number(stats.totals.orders || 0).toLocaleString('de-DE')} />
              <KpiCard title="AOV" value={`\u20AC${Number(stats.totals.aov || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`} />
            </div>
          )}

          {stats?.topProducts && stats.topProducts.length > 0 && (
            <div className="bg-ease-card border border-ease-border rounded-xl overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-ease-border"><h2 className="text-sm font-medium text-ease-cream">Top-Produkte</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ease-border text-xs text-gray-500">
                      <th className="text-left px-5 py-3 font-medium">Produkt</th>
                      <th className="text-right px-4 py-3 font-medium">Menge</th>
                      <th className="text-right px-5 py-3 font-medium">Umsatz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topProducts.map((product, i) => (
                      <tr key={product.id || i} className="border-b border-ease-border/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 text-ease-cream font-medium truncate max-w-[300px]">{product.title}</td>
                        <td className="text-right px-4 py-3 text-gray-400">{product.quantity}</td>
                        <td className="text-right px-5 py-3 text-gray-400">{'\u20AC'}{Number(product.revenue).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {stats?.dailyTrend && stats.dailyTrend.length > 0 && (
            <div className="bg-ease-card border border-ease-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-ease-border"><h2 className="text-sm font-medium text-ease-cream">Täglicher Verlauf</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ease-border text-xs text-gray-500">
                      <th className="text-left px-5 py-3 font-medium">Datum</th>
                      <th className="text-right px-4 py-3 font-medium">Bestellungen</th>
                      <th className="text-right px-5 py-3 font-medium">Umsatz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.dailyTrend.slice(-14).map((day) => (
                      <tr key={day.date} className="border-b border-ease-border/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 text-ease-cream">{day.date}</td>
                        <td className="text-right px-4 py-3 text-gray-400">{day.orders}</td>
                        <td className="text-right px-5 py-3 text-gray-400">{'\u20AC'}{Number(day.revenue).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!stats && !error && (
            <div className="text-center py-12"><div className="text-gray-600 text-sm">Shopify-Daten werden geladen...</div></div>
          )}
        </>
      )}
    </div>
  );
}
