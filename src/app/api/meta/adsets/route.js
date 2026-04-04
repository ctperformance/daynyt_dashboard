import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { INSIGHT_FIELDS, parseInsightsRow, aggregateTotals } from '@/lib/meta-insights';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const campaignId = searchParams.get('campaign_id');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (!projectId) return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    if (!campaignId) return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 });

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

    let sinceStr, untilStr;
    if (fromParam && toParam) {
      sinceStr = fromParam;
      const untilDate = new Date(toParam);
      untilDate.setDate(untilDate.getDate() + 1);
      untilStr = untilDate.toISOString().split('T')[0];
    } else {
      const since = new Date();
      since.setDate(since.getDate() - days);
      sinceStr = since.toISOString().split('T')[0];
      const until = new Date();
      until.setDate(until.getDate() + 1);
      untilStr = until.toISOString().split('T')[0];
    }

    const fields = ['adset_name', 'adset_id', 'campaign_name', 'campaign_id', ...INSIGHT_FIELDS].join(',');
    const timeRange = JSON.stringify({ since: sinceStr, until: untilStr });
    const filtering = JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaignId }]);

    const insightsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${fields}&time_range=${timeRange}&level=adset&filtering=${encodeURIComponent(filtering)}&limit=100&access_token=${access_token}`;
    const insightsRes = await fetch(insightsUrl);

    let insightsData;
    if (!insightsRes.ok) {
      const err = await insightsRes.json().catch(() => ({}));
      console.error('Meta API error (adsets):', err);
      if (insightsRes.status === 401 || err?.error?.code === 190) {
        return NextResponse.json({ error: 'Token expired', token_expired: true }, { status: 401 });
      }
      // Try fallback with basic fields only
      const basicFields = ['adset_name', 'adset_id', 'campaign_name', 'campaign_id', 'spend', 'impressions', 'clicks', 'reach', 'inline_link_clicks', 'actions', 'action_values', 'cpc', 'cpm', 'ctr', 'frequency', 'video_play_actions', 'video_thruplay_actions', 'video_p25_watched_actions', 'video_p50_watched_actions', 'video_p75_watched_actions', 'video_p100_watched_actions'].join(',');
      const fallbackUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${basicFields}&time_range=${timeRange}&level=adset&filtering=${encodeURIComponent(filtering)}&limit=100&access_token=${access_token}`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) {
        const fallbackErr = await fallbackRes.json().catch(() => ({}));
        console.error('Meta API fallback error (adsets):', fallbackErr);
        return NextResponse.json({ error: 'Failed to fetch Meta ad sets', detail: fallbackErr?.error?.message || JSON.stringify(fallbackErr) }, { status: 502 });
      }
      insightsData = await fallbackRes.json();
    } else {
      insightsData = await insightsRes.json();
    }

    const adsets = (insightsData.data || []).map((row) => ({
      id: row.adset_id,
      name: row.adset_name,
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      ...parseInsightsRow(row),
    }));

    const totals = aggregateTotals(adsets);

    return NextResponse.json({
      adsets,
      totals,
      campaign: { id: campaignId, name: adsets[0]?.campaign_name || '' },
      period: { since: sinceStr, until: untilStr, days },
      fetched_at: new Date().toISOString(),
      account: {
        id: provider_account_id,
        name: provider_metadata?.primary_account_name || null,
        currency: provider_metadata?.currency || 'EUR',
      },
    });
  } catch (error) {
    console.error('Meta adsets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
