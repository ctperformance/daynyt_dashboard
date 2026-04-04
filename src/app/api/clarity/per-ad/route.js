import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (!projectId) return NextResponse.json({ error: 'project_id is required' }, { status: 400 });

    const supabase = createServiceClient();
    const { data: integration, error: dbError } = await supabase
      .from('integrations_oauth')
      .select('access_token, provider_account_id')
      .eq('project_id', projectId)
      .eq('provider', 'clarity')
      .single();

    if (dbError || !integration) {
      return NextResponse.json({ error: 'Clarity not connected', connected: false }, { status: 404 });
    }

    const { access_token, provider_account_id: clarityProjectId } = integration;

    // Fetch Clarity sessions grouped by custom dimension (ad-level UTM)
    // We use utm_content (adset name) and adname custom parameter
    const dateQuery = fromParam && toParam
      ? `startDate=${fromParam}&endDate=${toParam}`
      : `days=${days}`;
    const apiUrl = `https://www.clarity.ms/export-data/api/v1/${clarityProjectId}/sessions?groupBy=utm_campaign,utm_content&${dateQuery}`;

    const clarityRes = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    });

    if (!clarityRes.ok) {
      const err = await clarityRes.text().catch(() => '');
      console.error('Clarity API error:', err);
      return NextResponse.json({ error: 'Failed to fetch Clarity data', detail: err }, { status: 502 });
    }

    const clarityData = await clarityRes.json();

    // Parse and calculate quality scores per campaign/adset grouping
    const perGroup = (clarityData.data || clarityData || []).map(item => {
      const avgDuration = parseFloat(item.avg_session_duration || item.averageSessionDuration || 0);
      const avgScroll = parseFloat(item.avg_scroll_depth || item.averageScrollDepth || 0);
      const engagementRate = parseFloat(item.engagement_rate || item.engagementRate || 0);
      const rageClicks = parseInt(item.rage_clicks || item.rageClicks || 0, 10);
      const sessions = parseInt(item.sessions || item.sessionCount || 0, 10);

      // Quality score: 30% duration (max 180s), 35% scroll, 35% engagement
      const durationScore = Math.min((avgDuration / 180) * 100, 100);
      const scrollScore = Math.min(avgScroll, 100);
      const engagementScore = Math.min(engagementRate * 100, 100);
      const qualityScore = Math.round(durationScore * 0.3 + scrollScore * 0.35 + engagementScore * 0.35);

      return {
        campaign: item.campaign || item.utm_campaign || '',
        adset: item.utm_content || item.content || '',
        sessions,
        avg_duration: +avgDuration.toFixed(1),
        avg_scroll: +avgScroll.toFixed(1),
        engagement_rate: +(engagementRate * 100).toFixed(1),
        rage_clicks: rageClicks,
        quality_score: qualityScore,
      };
    });

    return NextResponse.json({
      data: perGroup,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Clarity per-ad error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
