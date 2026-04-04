import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { INSIGHT_FIELDS, parseInsightsRow, aggregateTotals } from '@/lib/meta-insights';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const adsetId = searchParams.get('adset_id');
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!projectId) return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    if (!adsetId) return NextResponse.json({ error: 'adset_id is required' }, { status: 400 });

    const supabase = createServiceClient();
    const { data: integration, error: dbError } = await supabase
      .from('integrations_oauth')
      .select('access_token, provider_account_id, provider_metadata')
      .eq('project_id', projectId)
      .eq('provider', 'meta')
      .single();

    if (dbError || !integration) {
      return NextResponse.json({ error: 'Meta not connected', connected: false }, { status: 404 });
    }

    const { access_token, provider_account_id, provider_metadata } = integration;
    const adAccountId = provider_account_id ? `act_${provider_account_id}` : null;
    if (!adAccountId) return NextResponse.json({ error: 'No ad account configured' }, { status: 400 });

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = new Date().toISOString().split('T')[0];

    const fields = ['ad_name', 'ad_id', 'adset_name', 'adset_id', 'campaign_name', 'campaign_id', ...INSIGHT_FIELDS].join(',');
    const timeRange = JSON.stringify({ since: sinceStr, until: untilStr });
    const filtering = JSON.stringify([{ field: 'adset.id', operator: 'EQUAL', value: adsetId }]);

    const insightsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${fields}&time_range=${timeRange}&level=ad&filtering=${encodeURIComponent(filtering)}&limit=100&access_token=${access_token}`;
    const insightsRes = await fetch(insightsUrl);

    if (!insightsRes.ok) {
      const err = await insightsRes.json().catch(() => ({}));
      console.error('Meta API error (ads):', err);
      if (insightsRes.status === 401 || err?.error?.code === 190) {
        return NextResponse.json({ error: 'Token expired', token_expired: true }, { status: 401 });
      }
      return NextResponse.json({ error: 'Failed to fetch Meta ads' }, { status: 502 });
    }

    const insightsData = await insightsRes.json();

    const ads = (insightsData.data || []).map((row) => ({
      id: row.ad_id,
      name: row.ad_name,
      adset_id: row.adset_id,
      adset_name: row.adset_name,
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      ...parseInsightsRow(row),
    }));

    const totals = aggregateTotals(ads);

    return NextResponse.json({
      ads,
      totals,
      adset: { id: adsetId, name: ads[0]?.adset_name || '' },
      campaign: { id: ads[0]?.campaign_id || '', name: ads[0]?.campaign_name || '' },
      period: { since: sinceStr, until: untilStr, days },
      fetched_at: new Date().toISOString(),
      account: {
        id: provider_account_id,
        name: provider_metadata?.primary_account_name || null,
        currency: provider_metadata?.currency || 'EUR',
      },
    });
  } catch (error) {
    console.error('Meta ads error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
