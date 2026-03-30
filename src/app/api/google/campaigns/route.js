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
      .select('access_token, refresh_token, provider_account_id, provider_metadata')
      .eq('project_id', projectId)
      .eq('provider', 'google')
      .single();

    if (dbError || !integration) {
      return NextResponse.json(
        { error: 'Google Ads not connected', connected: false },
        { status: 404 }
      );
    }

    const { access_token, provider_account_id, provider_metadata } = integration;
    const customerId = provider_account_id;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    if (!customerId) {
      return NextResponse.json(
        { error: 'No Google Ads customer ID configured' },
        { status: 400 }
      );
    }

    // Build date range
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = new Date().toISOString().split('T')[0];

    // Fetch campaign data from Google Ads API using GAQL
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_per_conversion,
        metrics.ctr
      FROM campaign
      WHERE segments.date BETWEEN '${sinceStr}' AND '${untilStr}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `;

    const apiUrl = `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`;

    const apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'developer-token': developerToken || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.json().catch(() => ({}));
      console.error('Google Ads API error:', err);

      if (apiRes.status === 401) {
        return NextResponse.json(
          { error: 'Token expired', token_expired: true },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch Google Ads campaigns' },
        { status: 502 }
      );
    }

    const apiData = await apiRes.json();

    // Parse campaigns from the streamed response
    const results = apiData[0]?.results || [];
    const campaigns = results.map((row) => {
      const spend = (parseInt(row.metrics?.costMicros || '0', 10) / 1_000_000);
      const impressions = parseInt(row.metrics?.impressions || '0', 10);
      const clicks = parseInt(row.metrics?.clicks || '0', 10);
      const conversions = parseFloat(row.metrics?.conversions || '0');
      const revenue = parseFloat(row.metrics?.conversionsValue || '0');
      const cpa = parseFloat(row.metrics?.costPerConversion || '0') / 1_000_000;

      return {
        id: row.campaign?.id,
        name: row.campaign?.name,
        spend,
        impressions,
        clicks,
        conversions: Math.round(conversions),
        revenue,
        roas: spend > 0 ? (revenue / spend).toFixed(2) : '0.00',
        cpa: conversions > 0 ? cpa.toFixed(2) : '0.00',
        ctr: (parseFloat(row.metrics?.ctr || '0') * 100).toFixed(2),
      };
    });

    // Aggregate totals
    const totals = campaigns.reduce(
      (acc, c) => ({
        spend: acc.spend + c.spend,
        impressions: acc.impressions + c.impressions,
        clicks: acc.clicks + c.clicks,
        conversions: acc.conversions + c.conversions,
        revenue: acc.revenue + c.revenue,
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
    );

    totals.roas = totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : '0.00';
    totals.cpa = totals.conversions > 0 ? (totals.spend / totals.conversions).toFixed(2) : '0.00';

    return NextResponse.json({
      campaigns,
      totals,
      period: { since: sinceStr, until: untilStr, days },
      account: {
        id: customerId,
        name: provider_metadata?.primary_customer_id || null,
        currency: 'EUR',
      },
    });
  } catch (error) {
    console.error('Google Ads campaigns error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
