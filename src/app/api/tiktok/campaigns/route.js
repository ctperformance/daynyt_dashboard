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
      .eq('provider', 'tiktok')
      .single();

    if (dbError || !integration) {
      return NextResponse.json(
        { error: 'TikTok not connected', connected: false },
        { status: 404 }
      );
    }

    const { access_token, provider_account_id, provider_metadata } = integration;
    const advertiserId = provider_account_id;

    if (!advertiserId) {
      return NextResponse.json(
        { error: 'No TikTok advertiser ID configured' },
        { status: 400 }
      );
    }

    // Build date range
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = new Date().toISOString().split('T')[0];

    // Fetch campaign data from TikTok Reporting API
    const reportUrl = 'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/';
    const reportParams = new URLSearchParams({
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      data_level: 'AUCTION_CAMPAIGN',
      dimensions: JSON.stringify(['campaign_id']),
      metrics: JSON.stringify(['campaign_name', 'spend', 'impressions', 'clicks', 'conversion', 'cost_per_conversion']),
      start_date: sinceStr,
      end_date: untilStr,
      page: '1',
      page_size: '50',
    });

    const apiRes = await fetch(`${reportUrl}?${reportParams.toString()}`, {
      headers: {
        'Access-Token': access_token,
      },
    });

    if (!apiRes.ok) {
      const err = await apiRes.json().catch(() => ({}));
      console.error('TikTok API error:', err);

      if (apiRes.status === 401 || err?.code === 40105) {
        return NextResponse.json(
          { error: 'Token expired', token_expired: true },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch TikTok campaigns' },
        { status: 502 }
      );
    }

    const apiData = await apiRes.json();
    const rows = apiData.data?.list || [];

    // Parse campaigns
    const campaigns = rows.map((row) => {
      const metrics = row.metrics || {};
      const dimensions = row.dimensions || {};
      const spend = parseFloat(metrics.spend || '0');
      const impressions = parseInt(metrics.impressions || '0', 10);
      const clicks = parseInt(metrics.clicks || '0', 10);
      const conversions = parseInt(metrics.conversion || '0', 10);
      const costPerConversion = parseFloat(metrics.cost_per_conversion || '0');

      return {
        id: dimensions.campaign_id,
        name: metrics.campaign_name || dimensions.campaign_id,
        spend,
        impressions,
        clicks,
        conversions,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
        cpa: costPerConversion.toFixed(2),
      };
    });

    // Aggregate totals
    const totals = campaigns.reduce(
      (acc, c) => ({
        spend: acc.spend + c.spend,
        impressions: acc.impressions + c.impressions,
        clicks: acc.clicks + c.clicks,
        conversions: acc.conversions + c.conversions,
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    );

    totals.ctr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00';
    totals.cpa = totals.conversions > 0 ? (totals.spend / totals.conversions).toFixed(2) : '0.00';

    return NextResponse.json({
      campaigns,
      totals,
      period: { since: sinceStr, until: untilStr, days },
      account: {
        id: advertiserId,
        name: provider_metadata?.primary_advertiser_id || null,
        currency: 'EUR',
      },
    });
  } catch (error) {
    console.error('TikTok campaigns error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
