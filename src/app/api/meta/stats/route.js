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
      .eq('provider', 'meta')
      .single();

    if (dbError || !integration) {
      return NextResponse.json(
        { error: 'Meta not connected', connected: false },
        { status: 404 }
      );
    }

    const { access_token, provider_account_id, provider_metadata } = integration;
    const adAccountId = provider_account_id ? `act_${provider_account_id}` : null;

    if (!adAccountId) {
      return NextResponse.json(
        { error: 'No ad account configured' },
        { status: 400 }
      );
    }

    // Build date range
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = new Date().toISOString().split('T')[0];

    // Fetch account-level insights from Meta Marketing API
    const fields = 'spend,impressions,clicks,actions,action_values';
    const timeRange = JSON.stringify({ since: sinceStr, until: untilStr });

    const insightsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${fields}&time_range=${timeRange}&access_token=${access_token}`;

    const insightsRes = await fetch(insightsUrl);

    if (!insightsRes.ok) {
      const err = await insightsRes.json().catch(() => ({}));
      console.error('Meta API error:', err);

      if (insightsRes.status === 401 || err?.error?.code === 190) {
        return NextResponse.json(
          { error: 'Token expired', token_expired: true },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch Meta stats' },
        { status: 502 }
      );
    }

    const insightsData = await insightsRes.json();
    const row = insightsData.data?.[0] || {};

    const spend = parseFloat(row.spend || '0');
    const impressions = parseInt(row.impressions || '0', 10);
    const clicks = parseInt(row.clicks || '0', 10);

    const purchases = row.actions?.find(a => a.action_type === 'purchase') || {};
    const purchaseValue = row.action_values?.find(a => a.action_type === 'purchase') || {};
    const conversions = parseInt(purchases.value || '0', 10);
    const revenue = parseFloat(purchaseValue.value || '0');

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
        id: provider_account_id,
        name: provider_metadata?.primary_account_name || null,
        currency: provider_metadata?.currency || 'EUR',
      },
    });
  } catch (error) {
    console.error('Meta stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
