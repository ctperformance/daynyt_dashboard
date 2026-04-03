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

    // Fetch account-level performance via Reporting API
    const reportRequest = {
      ReportName: 'AccountPerformance',
      Format: 'Json',
      Aggregation: 'Summary',
      Time: {
        CustomDateRangeStart: { Year: parseInt(sinceStr.split('-')[0]), Month: parseInt(sinceStr.split('-')[1]), Day: parseInt(sinceStr.split('-')[2]) },
        CustomDateRangeEnd: { Year: parseInt(untilStr.split('-')[0]), Month: parseInt(untilStr.split('-')[1]), Day: parseInt(untilStr.split('-')[2]) },
      },
      Columns: ['Spend', 'Impressions', 'Clicks', 'Conversions', 'Revenue'],
      Scope: { AccountIds: [provider_account_id] },
    };

    let spend = 0;
    let impressions = 0;
    let clicks = 0;
    let conversions = 0;
    let revenue = 0;

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
          spend += parseFloat(row.Spend || '0');
          impressions += parseInt(row.Impressions || '0', 10);
          clicks += parseInt(row.Clicks || '0', 10);
          conversions += parseInt(row.Conversions || '0', 10);
          revenue += parseFloat(row.Revenue || '0');
        }
      }
    } catch (reportError) {
      console.warn('Could not fetch Bing Ads report:', reportError.message);
    }

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
        name: provider_metadata?.account_name || null,
        currency: 'EUR',
      },
    });
  } catch (error) {
    console.error('Bing Ads stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
