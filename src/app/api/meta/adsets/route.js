import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const campaignId = searchParams.get('campaign_id');
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }
    if (!campaignId) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 });
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

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = new Date().toISOString().split('T')[0];

    const fields = 'adset_name,adset_id,campaign_name,campaign_id,spend,impressions,clicks,actions,action_values,cpc,cpm,ctr,frequency';
    const timeRange = JSON.stringify({ since: sinceStr, until: untilStr });
    const filtering = JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaignId }]);

    const insightsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${fields}&time_range=${timeRange}&level=adset&filtering=${encodeURIComponent(filtering)}&limit=100&access_token=${access_token}`;

    const insightsRes = await fetch(insightsUrl);

    if (!insightsRes.ok) {
      const err = await insightsRes.json().catch(() => ({}));
      console.error('Meta API error (adsets):', err);
      if (insightsRes.status === 401 || err?.error?.code === 190) {
        return NextResponse.json({ error: 'Token expired', token_expired: true }, { status: 401 });
      }
      return NextResponse.json({ error: 'Failed to fetch Meta ad sets' }, { status: 502 });
    }

    const insightsData = await insightsRes.json();

    const adsets = (insightsData.data || []).map((row) => {
      const purchases = row.actions?.find(a => a.action_type === 'purchase') || {};
      const purchaseValue = row.action_values?.find(a => a.action_type === 'purchase') || {};
      const conversions = parseInt(purchases.value || '0', 10);
      const revenue = parseFloat(purchaseValue.value || '0');
      const spend = parseFloat(row.spend || '0');

      return {
        id: row.adset_id,
        name: row.adset_name,
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        spend,
        impressions: parseInt(row.impressions || '0', 10),
        clicks: parseInt(row.clicks || '0', 10),
        conversions,
        revenue,
        roas: spend > 0 ? (revenue / spend).toFixed(2) : '0.00',
        cpa: conversions > 0 ? (spend / conversions).toFixed(2) : '0.00',
        cpc: parseFloat(row.cpc || '0').toFixed(2),
        ctr: parseFloat(row.ctr || '0').toFixed(2),
        frequency: parseFloat(row.frequency || '0').toFixed(1),
      };
    });

    const totals = adsets.reduce(
      (acc, a) => ({
        spend: acc.spend + a.spend,
        impressions: acc.impressions + a.impressions,
        clicks: acc.clicks + a.clicks,
        conversions: acc.conversions + a.conversions,
        revenue: acc.revenue + a.revenue,
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
    );
    totals.roas = totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : '0.00';
    totals.cpa = totals.conversions > 0 ? (totals.spend / totals.conversions).toFixed(2) : '0.00';

    return NextResponse.json({
      adsets,
      totals,
      campaign: { id: campaignId, name: adsets[0]?.campaign_name || '' },
      period: { since: sinceStr, until: untilStr, days },
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
