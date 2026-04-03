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
      .eq('provider', 'bing')
      .single();

    if (dbError || !integration) {
      return NextResponse.json(
        { error: 'Bing Ads not connected', connected: false },
        { status: 404 }
      );
    }

    const { access_token, provider_account_id, provider_metadata } = integration;
    const developerToken = process.env.BING_ADS_DEVELOPER_TOKEN;

    if (!provider_account_id) {
      return NextResponse.json(
        { error: 'No Bing Ads account configured' },
        { status: 400 }
      );
    }

    // Build date range
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = new Date().toISOString().split('T')[0];

    // Fetch campaigns from Bing Ads Campaign Management API
    const campaignsRes = await fetch(
      'https://campaign.api.bingads.microsoft.com/Api/v13/CampaignManagement/GetCampaignsByAccountId',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          DeveloperToken: developerToken || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          AccountId: provider_account_id,
          CampaignType: 'Search Shopping',
        }),
      }
    );

    if (!campaignsRes.ok) {
      const err = await campaignsRes.json().catch(() => ({}));
      console.error('Bing Ads API error:', err);

      if (campaignsRes.status === 401) {
        return NextResponse.json(
          { error: 'Token expired', token_expired: true },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch Bing Ads campaigns' },
        { status: 502 }
      );
    }

    const campaignsData = await campaignsRes.json();
    const rawCampaigns = campaignsData.Campaigns || [];

    // Fetch performance data via Reporting API
    const reportRequest = {
      ReportName: 'CampaignPerformance',
      Format: 'Json',
      Aggregation: 'Summary',
      Time: {
        CustomDateRangeStart: { Year: parseInt(sinceStr.split('-')[0]), Month: parseInt(sinceStr.split('-')[1]), Day: parseInt(sinceStr.split('-')[2]) },
        CustomDateRangeEnd: { Year: parseInt(untilStr.split('-')[0]), Month: parseInt(untilStr.split('-')[1]), Day: parseInt(untilStr.split('-')[2]) },
      },
      Columns: ['CampaignId', 'CampaignName', 'Spend', 'Impressions', 'Clicks', 'Conversions', 'Revenue'],
      Scope: { AccountIds: [provider_account_id] },
    };

    let performanceData = {};
    try {
      const reportRes = await fetch(
        'https://reporting.api.bingads.microsoft.com/Api/v13/Reporting/SubmitGenerateReport',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access_token}`,
            DeveloperToken: developerToken || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ReportRequest: reportRequest }),
        }
      );

      if (reportRes.ok) {
        const reportResult = await reportRes.json();
        const rows = reportResult?.ReportRows || [];
        for (const row of rows) {
          performanceData[row.CampaignId] = row;
        }
      }
    } catch (reportError) {
      console.warn('Could not fetch Bing Ads report:', reportError.message);
    }

    // Build campaign list
    const campaigns = rawCampaigns
      .filter((c) => c.Status !== 'Deleted')
      .map((campaign) => {
        const perf = performanceData[campaign.Id] || {};
        const spend = parseFloat(perf.Spend || '0');
        const impressions = parseInt(perf.Impressions || '0', 10);
        const clicks = parseInt(perf.Clicks || '0', 10);
        const conversions = parseInt(perf.Conversions || '0', 10);
        const revenue = parseFloat(perf.Revenue || '0');

        return {
          id: campaign.Id,
          name: campaign.Name,
          spend,
          impressions,
          clicks,
          conversions,
          revenue,
          roas: spend > 0 ? (revenue / spend).toFixed(2) : '0.00',
          cpa: conversions > 0 ? (spend / conversions).toFixed(2) : '0.00',
          ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
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
        id: provider_account_id,
        name: provider_metadata?.account_name || null,
        currency: 'EUR',
      },
    });
  } catch (error) {
    console.error('Bing Ads campaigns error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
