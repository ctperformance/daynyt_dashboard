import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Fetch token from database
    const supabase = createServiceClient();
    const { data: integration, error: dbError } = await supabase
      .from('integrations_oauth')
      .select('access_token, provider_account_id, provider_metadata')
      .eq('project_id', projectId)
      .eq('provider', 'snapchat')
      .single();

    if (dbError || !integration) {
      return NextResponse.json(
        { error: 'Snapchat not connected', connected: false },
        { status: 404 }
      );
    }

    const { access_token, provider_account_id, provider_metadata } = integration;
    const adAccountId = provider_account_id;

    if (!adAccountId) {
      return NextResponse.json(
        { error: 'No Snapchat ad account configured' },
        { status: 400 }
      );
    }

    // Build date range
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = new Date().toISOString().split('T')[0];

    // Fetch campaigns from Snapchat Marketing API
    const campaignsUrl = `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/campaigns`;
    const campaignsRes = await fetch(campaignsUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!campaignsRes.ok) {
      const err = await campaignsRes.json().catch(() => ({}));
      console.error('Snapchat API error:', err);

      if (campaignsRes.status === 401) {
        return NextResponse.json(
          { error: 'Token expired', token_expired: true },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch Snapchat campaigns' },
        { status: 502 }
      );
    }

    const campaignsData = await campaignsRes.json();
    const rawCampaigns = campaignsData.campaigns || [];

    // Fetch stats for each campaign
    const campaigns = [];
    for (const rawCampaign of rawCampaigns) {
      const campaign = rawCampaign.campaign || {};
      if (campaign.status === 'DELETED') continue;

      const statsUrl = `https://adsapi.snapchat.com/v1/campaigns/${campaign.id}/stats?start_time=${sinceStr}T00:00:00.000-00:00&end_time=${untilStr}T23:59:59.000-00:00&granularity=TOTAL`;
      let spend = 0, impressions = 0, swipeUps = 0, conversions = 0;

      try {
        const statsRes = await fetch(statsUrl, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const timeseries = statsData.timeseries_stats?.[0]?.timeseries_stat?.timeseries || [];
          for (const ts of timeseries) {
            const stats = ts.stats || {};
            spend += parseFloat(stats.spend || '0') / 1_000_000; // Snapchat returns micros
            impressions += parseInt(stats.impressions || '0', 10);
            swipeUps += parseInt(stats.swipe_ups || '0', 10);
            conversions += parseInt(stats.conversion_purchases || '0', 10);
          }
        }
      } catch (statsError) {
        console.warn(`Failed to fetch stats for campaign ${campaign.id}:`, statsError.message);
      }

      campaigns.push({
        id: campaign.id,
        name: campaign.name,
        spend,
        impressions,
        swipe_ups: swipeUps,
        conversions,
        ecpsu: swipeUps > 0 ? (spend / swipeUps).toFixed(2) : '0.00',
      });
    }

    // Aggregate totals
    const totals = campaigns.reduce(
      (acc, c) => ({
        spend: acc.spend + c.spend,
        impressions: acc.impressions + c.impressions,
        swipe_ups: acc.swipe_ups + c.swipe_ups,
        conversions: acc.conversions + c.conversions,
      }),
      { spend: 0, impressions: 0, swipe_ups: 0, conversions: 0 }
    );

    totals.ecpsu = totals.swipe_ups > 0 ? (totals.spend / totals.swipe_ups).toFixed(2) : '0.00';

    return NextResponse.json({
      campaigns,
      totals,
      period: { since: sinceStr, until: untilStr, days },
      account: {
        id: adAccountId,
        name: provider_metadata?.primary_account_name || null,
        currency: 'EUR',
      },
    });
  } catch (error) {
    console.error('Snapchat campaigns error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
