import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { INSIGHT_FIELDS, parseInsightsRow, aggregateTotals } from '@/lib/meta-insights';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

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

    if (!adAccountId) {
      return NextResponse.json({ error: 'No ad account configured' }, { status: 400 });
    }

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

    const fields = ['campaign_name', 'campaign_id', ...INSIGHT_FIELDS].join(',');
    const timeRange = JSON.stringify({ since: sinceStr, until: untilStr });

    // Fetch insights + campaign statuses in parallel
    const [insightsRes, statusRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${fields}&time_range=${timeRange}&level=campaign&limit=200&access_token=${access_token}`),
      fetch(`https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,effective_status&limit=200&access_token=${access_token}`).catch(() => null),
    ]);

    let insightsData;
    if (!insightsRes.ok) {
      const err = await insightsRes.json().catch(() => ({}));
      console.error('Meta API error:', err);
      if (insightsRes.status === 401 || err?.error?.code === 190) {
        return NextResponse.json({ error: 'Token expired', token_expired: true }, { status: 401 });
      }
      // Try fallback with basic fields only (some expanded fields may not be available)
      const basicFields = ['campaign_name', 'campaign_id', 'spend', 'impressions', 'clicks', 'reach', 'inline_link_clicks', 'actions', 'action_values', 'cpc', 'cpm', 'ctr', 'frequency', 'video_play_actions', 'video_thruplay_watched_actions', 'video_p25_watched_actions', 'video_p50_watched_actions', 'video_p75_watched_actions', 'video_p100_watched_actions'].join(',');
      const fallbackRes = await fetch(`https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${basicFields}&time_range=${timeRange}&level=campaign&limit=200&access_token=${access_token}`);
      if (!fallbackRes.ok) {
        const fallbackErr = await fallbackRes.json().catch(() => ({}));
        console.error('Meta API fallback error:', fallbackErr);
        return NextResponse.json({ error: 'Failed to fetch Meta campaigns', detail: fallbackErr?.error?.message || JSON.stringify(fallbackErr) }, { status: 502 });
      }
      insightsData = await fallbackRes.json();
    } else {
      insightsData = await insightsRes.json();
    }

    // Build status map
    const campaignStatuses = {};
    if (statusRes?.ok) {
      const statusData = await statusRes.json();
      for (const c of (statusData.data || [])) {
        campaignStatuses[c.id] = c.effective_status;
      }
    }

    const campaigns = (insightsData.data || []).map((row) => ({
      id: row.campaign_id,
      name: row.campaign_name,
      status: campaignStatuses[row.campaign_id] || 'UNKNOWN',
      ...parseInsightsRow(row),
    }));

    const totals = aggregateTotals(campaigns);

    return NextResponse.json({
      campaigns,
      totals,
      period: { since: sinceStr, until: untilStr, days },
      fetched_at: new Date().toISOString(),
      account: {
        id: provider_account_id,
        name: provider_metadata?.primary_account_name || null,
        currency: provider_metadata?.currency || 'EUR',
      },
    });
  } catch (error) {
    console.error('Meta campaigns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
