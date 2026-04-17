import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { project_id, flow_id, status } = await request.json();
    if (!project_id || !flow_id || !status) {
      return NextResponse.json({ error: 'project_id, flow_id, status required' }, { status: 400 });
    }
    if (!['live', 'manual', 'draft'].includes(status)) {
      return NextResponse.json({ error: 'status must be live, manual, or draft' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: integration } = await supabase
      .from('integrations_oauth')
      .select('access_token, scope')
      .eq('project_id', project_id)
      .eq('provider', 'klaviyo')
      .single();

    if (!integration?.access_token) {
      return NextResponse.json({ error: 'Klaviyo not connected' }, { status: 404 });
    }

    const scope = integration.scope || '';
    if (!scope.includes('flows:write')) {
      return NextResponse.json({
        error: 'Klaviyo integration lacks flows:write scope. Re-auth required with write permissions.',
        needs_reauth_with_scope: 'flows:write',
      }, { status: 403 });
    }

    const res = await fetch(`https://a.klaviyo.com/api/flows/${flow_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Klaviyo-API-Key ${integration.access_token}`,
        'Content-Type': 'application/json',
        'revision': '2024-10-15',
      },
      body: JSON.stringify({
        data: {
          type: 'flow',
          id: flow_id,
          attributes: { status },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: 'Klaviyo API failed', detail: err }, { status: 502 });
    }

    return NextResponse.json({ ok: true, flow_id, status });
  } catch (error) {
    console.error('Klaviyo flow toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
