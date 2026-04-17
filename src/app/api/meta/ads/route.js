import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { INSIGHT_FIELDS, parseInsightsRow, aggregateTotals } from '@/lib/meta-insights';
import { getValidMetaToken, handleMetaApiError } from '@/lib/meta-token';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const adsetId = searchParams.get('adset_id');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (!projectId) return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    if (!adsetId) return NextResponse.json({ error: 'adset_id is required' }, { status: 400 });

    const supabase = createServiceClient();
    const tokenResult = await getValidMetaToken(supabase, projectId);
    if (!tokenResult.ok) {
      return NextResponse.json(tokenResult, { status: tokenResult.status });
    }
    const integration = tokenResult.integration;
    let { access_token } = integration;
    const { provider_account_id, provider_metadata } = integration;
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

    const fields = ['ad_name', 'ad_id', 'adset_name', 'adset_id', 'campaign_name', 'campaign_id', ...INSIGHT_FIELDS].join(',');
    const timeRange = JSON.stringify({ since: sinceStr, until: untilStr });
    const filtering = JSON.stringify([{ field: 'adset.id', operator: 'EQUAL', value: adsetId }]);

    const insightsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${fields}&time_range=${timeRange}&level=ad&filtering=${encodeURIComponent(filtering)}&limit=100&access_token=${access_token}`;
    const insightsRes = await fetch(insightsUrl);

    let insightsData;
    if (!insightsRes.ok) {
      const err = await insightsRes.json().catch(() => ({}));
      console.error('Meta API error (ads):', err);
      const authResult = await handleMetaApiError(supabase, projectId, err, insightsRes.status);
      if (authResult.retry && authResult.new_token) {
        access_token = authResult.new_token;
        const retryUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${fields}&time_range=${timeRange}&level=ad&filtering=${encodeURIComponent(filtering)}&limit=100&access_token=${access_token}`;
        const retryRes = await fetch(retryUrl);
        if (retryRes.ok) {
          insightsData = await retryRes.json();
        } else {
          return NextResponse.json({ error: 'Meta token expired. Please reconnect.', token_expired: true }, { status: 401 });
        }
      } else if (authResult.token_expired) {
        return NextResponse.json({ error: 'Meta token expired. Please reconnect.', token_expired: true }, { status: 401 });
      } else {
        // Try fallback with basic fields only
        const basicFields = ['ad_name', 'ad_id', 'adset_name', 'adset_id', 'campaign_name', 'campaign_id', 'spend', 'impressions', 'clicks', 'reach', 'inline_link_clicks', 'actions', 'action_values', 'cpc', 'cpm', 'ctr', 'frequency', 'video_play_actions', 'video_thruplay_watched_actions', 'video_p25_watched_actions', 'video_p50_watched_actions', 'video_p75_watched_actions', 'video_p100_watched_actions'].join(',');
        const fallbackUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${basicFields}&time_range=${timeRange}&level=ad&filtering=${encodeURIComponent(filtering)}&limit=100&access_token=${access_token}`;
        const fallbackRes = await fetch(fallbackUrl);
        if (!fallbackRes.ok) {
          const fallbackErr = await fallbackRes.json().catch(() => ({}));
          console.error('Meta API fallback error (ads):', fallbackErr);
          return NextResponse.json({ error: 'Failed to fetch Meta ads', detail: fallbackErr?.error?.message || JSON.stringify(fallbackErr) }, { status: 502 });
        }
        insightsData = await fallbackRes.json();
      }
    } else {
      insightsData = await insightsRes.json();
    }

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

    // Fetch creative thumbnails for all ads
    const adIds = ads.map(a => a.id).filter(Boolean);
    let creativeMap = {};
    if (adIds.length > 0) {
      try {
        const creativeUrl = `https://graph.facebook.com/v21.0/?ids=${adIds.join(',')}&fields=creative{thumbnail_url,image_url,object_type}&access_token=${access_token}`;
        const creativeRes = await fetch(creativeUrl);
        if (creativeRes.ok) {
          const creativeData = await creativeRes.json();
          for (const [adId, adData] of Object.entries(creativeData)) {
            const creative = adData.creative || {};
            creativeMap[adId] = {
              thumbnail_url: creative.thumbnail_url || creative.image_url || null,
              type: creative.object_type || null, // VIDEO, IMAGE, etc.
            };
          }
        }
      } catch (e) {
        console.error('Failed to fetch creative thumbnails:', e);
        // Non-fatal - continue without thumbnails
      }
    }

    // Merge creative data into ads
    const adsWithCreatives = ads.map(ad => ({
      ...ad,
      creative_thumbnail: creativeMap[ad.id]?.thumbnail_url || null,
      creative_type: creativeMap[ad.id]?.type || null,
    }));

    return NextResponse.json({
      ads: adsWithCreatives,
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
