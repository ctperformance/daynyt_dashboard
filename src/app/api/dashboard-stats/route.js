import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { subDays } from 'date-fns';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// GET /api/dashboard-stats?project_id=...&days=30
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const days = parseInt(searchParams.get('days') || '30');

    if (!projectId) {
      return NextResponse.json({ error: 'Missing project_id' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const since = subDays(new Date(), days).toISOString();

    // Fetch submissions and funnel events in parallel
    const [submissionsRes, funnelRes] = await Promise.all([
      supabase
        .from('quiz_submissions')
        .select('*')
        .eq('project_id', projectId)
        .gte('submitted_at', since)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('quiz_funnel_events')
        .select('*')
        .eq('project_id', projectId)
        .gte('timestamp', since),
    ]);

    if (submissionsRes.error) {
      console.error('Submissions query error:', submissionsRes.error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }
    if (funnelRes.error) {
      console.error('Funnel query error:', funnelRes.error);
      return NextResponse.json({ error: 'Failed to fetch funnel data' }, { status: 500 });
    }

    return NextResponse.json({
      submissions: submissionsRes.data,
      funnelEvents: funnelRes.data,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
