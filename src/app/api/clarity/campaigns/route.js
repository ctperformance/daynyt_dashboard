import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: integration, error: dbError } = await supabase
      .from('integrations_oauth')
      .select('access_token, provider_account_id, provider_metadata')
      .eq('project_id', projectId)
      .eq('provider', 'clarity')
      .single();

    if (dbError || !integration) {
      return NextResponse.json({ error: 'Clarity nicht verbunden' }, { status: 404 });
    }

    const clarityProjectId = integration.provider_account_id;
    const apiToken = integration.access_token;

    if (!clarityProjectId || !apiToken) {
      return NextResponse.json({ error: 'Clarity Project ID oder API Token fehlt' }, { status: 400 });
    }

    // Fetch session data filtered by UTM parameters
    try {
      const utmRes = await fetch(
        `https://www.clarity.ms/export-data/api/v1/${clarityProjectId}/sessions?groupBy=utm_campaign,utm_source,utm_content`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (utmRes.ok) {
        const utmData = await utmRes.json();
        const campaigns = (utmData.data || utmData.campaigns || []).map((c) => {
          const sessions = c.sessions || 0;
          const avgDuration = c.avg_session_duration || c.average_session_duration || 0;
          const avgScroll = c.avg_scroll_depth || c.scroll_depth || 0;
          const engagementRate = c.engagement_rate || 0;
          const rageClicks = c.rage_clicks || 0;
          const conversionRate = c.conversion_rate || 0;

          // Calculate quality score: weighted average of session_duration, scroll_depth, engagement_rate
          const durationScore = Math.min((avgDuration / 180) * 100, 100); // 180s = perfect
          const scrollScore = Math.min(avgScroll, 100); // already in %
          const engagementScore = Math.min(engagementRate * 100, 100);
          const qualityScore = Math.round(durationScore * 0.3 + scrollScore * 0.35 + engagementScore * 0.35);

          return {
            campaign: c.utm_campaign || c.campaign || 'Unbekannt',
            platform: c.utm_source || c.source || 'Unbekannt',
            sessions,
            avg_session_duration: avgDuration,
            avg_scroll_depth: avgScroll,
            engagement_rate: engagementRate,
            rage_clicks: rageClicks,
            conversion_rate: conversionRate,
            quality_score: qualityScore,
          };
        });

        return NextResponse.json({ campaigns });
      }

      return NextResponse.json({ campaigns: [] });
    } catch (fetchErr) {
      console.error('Clarity campaigns API fetch error:', fetchErr);
      return NextResponse.json({ campaigns: [] });
    }
  } catch (error) {
    console.error('Clarity campaigns error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Clarity-Kampagnendaten' }, { status: 500 });
  }
}
