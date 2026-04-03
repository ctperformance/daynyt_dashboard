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

    // Fetch account-level stats from Snapchat Marketing API
    const statsUrl = `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/stats?start_time=${sinceStr}T00:00:00.000-00:00&end_time=${untilStr}T23:59:59.000-00:00&granularity=TOTAL&fields=impressions,swipes,spend,conversion_purchases`;

    const statsRes = await fetch(statsUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!statsRes.ok) {
      const err = await statsRes.json().catch(() => ({}));
      console.error('Snapchat API error:', err);

      if (statsRes.status === 401) {
        return NextResponse.json(
          { error: 'Token expired', token_expired: true },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch Snapchat stats' },
        { status: 502 }
      );
    }

    const statsData = await statsRes.json();

    // Parse account-level stats
    let spend = 0;
    let impressions = 0;
    let swipeUps = 0;
    let conversions = 0;

    const timeseries = statsData.timeseries_stats?.[0]?.timeseries_stat?.timeseries || [];
    for (const ts of timeseries) {
      const stats = ts.stats || {};
      spend += parseFloat(stats.spend || '0') / 1_000_000; // Snapchat returns micros
      impressions += parseInt(stats.impressions || '0', 10);
      swipeUps += parseInt(stats.swipe_ups || stats.swipes || '0', 10);
      conversions += parseInt(stats.conversion_purchases || '0', 10);
    }

    const totals = {
      spend,
      impressions,
      swipe_ups: swipeUps,
      conversions,
      ecpsu: swipeUps > 0 ? (spend / swipeUps).toFixed(2) : '0.00',
    };

    return NextResponse.json({
      totals,
      connected: true,
      period: { since: sinceStr, until: untilStr, days },
      account: {
        id: adAccountId,
        name: provider_metadata?.primary_account_name || null,
        currency: 'EUR',
      },
    });
  } catch (error) {
    console.error('Snapchat stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
