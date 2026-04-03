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

    // Fetch Clarity metrics
    try {
      const metricsRes = await fetch(
        `https://www.clarity.ms/export-data/api/v1/${clarityProjectId}/metrics`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        return NextResponse.json({
          sessions: metricsData.sessions || 0,
          pages_per_session: metricsData.pages_per_session || 0,
          scroll_depth: metricsData.scroll_depth || 0,
          engagement_rate: metricsData.engagement_rate || 0,
          dead_clicks: metricsData.dead_clicks || 0,
          rage_clicks: metricsData.rage_clicks || 0,
          quick_backs: metricsData.quick_backs || 0,
          average_session_duration: metricsData.average_session_duration || 0,
        });
      }

      // If API returns an error, return defaults
      return NextResponse.json({
        sessions: 0,
        pages_per_session: 0,
        scroll_depth: 0,
        engagement_rate: 0,
        dead_clicks: 0,
        rage_clicks: 0,
        quick_backs: 0,
        average_session_duration: 0,
      });
    } catch (fetchErr) {
      console.error('Clarity API fetch error:', fetchErr);
      return NextResponse.json({
        sessions: 0,
        pages_per_session: 0,
        scroll_depth: 0,
        engagement_rate: 0,
        dead_clicks: 0,
        rage_clicks: 0,
        quick_backs: 0,
        average_session_duration: 0,
      });
    }
  } catch (error) {
    console.error('Clarity stats error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Clarity-Daten' }, { status: 500 });
  }
}
