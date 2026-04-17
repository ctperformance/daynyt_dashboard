function normalize(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9äöüß]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function aggregateEntries(entries) {
  if (!entries.length) return null;
  const sessions = entries.reduce((sum, e) => sum + (e.sessions || 0), 0);
  if (sessions === 0) return null;
  const weighted = (key) =>
    entries.reduce((sum, e) => sum + (e[key] || 0) * (e.sessions || 0), 0) / sessions;
  return {
    sessions,
    avg_duration: +weighted('avg_duration').toFixed(1),
    avg_scroll: +weighted('avg_scroll').toFixed(1),
    engagement_rate: +weighted('engagement_rate').toFixed(1),
    rage_clicks: entries.reduce((sum, e) => sum + (e.rage_clicks || 0), 0),
    quality_score: Math.round(weighted('quality_score')),
  };
}

export function buildClarityIndex(clarityData) {
  const byCampaign = new Map();
  const byAdset = new Map();
  const byAd = new Map();

  for (const entry of clarityData || []) {
    const campaign = normalize(entry.campaign);
    const adset = normalize(entry.adset);

    if (campaign) {
      if (!byCampaign.has(campaign)) byCampaign.set(campaign, []);
      byCampaign.get(campaign).push(entry);
    }
    if (adset) {
      if (!byAdset.has(adset)) byAdset.set(adset, []);
      byAdset.get(adset).push(entry);
      if (!byAd.has(adset)) byAd.set(adset, []);
      byAd.get(adset).push(entry);
    }
  }

  return {
    campaign: (name) => aggregateEntries(byCampaign.get(normalize(name)) || []),
    adset: (name) => aggregateEntries(byAdset.get(normalize(name)) || []),
    ad: (name) => aggregateEntries(byAd.get(normalize(name)) || []),
  };
}

export function matchClarityToRow(row, index, level) {
  if (!index || !row) return null;
  if (level === 'campaigns') return index.campaign(row.name);
  if (level === 'adsets') return index.adset(row.name);
  if (level === 'ads') return index.ad(row.name);
  return null;
}
