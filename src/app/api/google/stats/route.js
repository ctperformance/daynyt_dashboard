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

    // Fetch account-level metrics using GAQL
    const query = `
      SELECT
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value
      FROM customer
      WHERE segments.date BETWEEN '${sinceStr}' AND '${untilStr}'
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
        { error: 'Failed to fetch Google Ads stats' },
        { status: 502 }
      );
    }

    const apiData = await apiRes.json();

    // Aggregate across all rows (each row is a date segment)
    const results = apiData[0]?.results || [];
    let spend = 0;
    let impressions = 0;
    let clicks = 0;
    let conversions = 0;
    let revenue = 0;

    for (const row of results) {
      spend += parseInt(row.metrics?.costMicros || '0', 10) / 1_000_000;
      impressions += parseInt(row.metrics?.impressions || '0', 10);
      clicks += parseInt(row.metrics?.clicks || '0', 10);
      conversions += parseFloat(row.metrics?.conversions || '0');
      revenue += parseFloat(row.metrics?.conversionsValue || '0');
    }

    conversions = Math.round(conversions);

    const totals = {
      spend,
      impressions,
      clicks,
      conversions,
      revenue,
      roas: spend > 0 ? (revenue / spend).toFixed(2) : '0.00',
      cpa: conversions > 0 ? (spend / conversions).toFixed(2) : '0.00',
    };

    return NextResponse.json({
      totals,
      connected: true,
      period: { since: sinceStr, until: untilStr, days },
      account: {
        id: customerId,
        name: provider_metadata?.primary_customer_id || null,
        currency: 'EUR',
      },
    });
  } catch (error) {
    console.error('Google Ads stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
