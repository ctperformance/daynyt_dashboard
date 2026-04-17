import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { getValidMetaToken } from '@/lib/meta-token';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { project_id, ad_id, status } = await request.json();
    if (!project_id || !ad_id || !status) {
      return NextResponse.json({ error: 'project_id, ad_id, status required' }, { status: 400 });
    }
    if (!['ACTIVE', 'PAUSED'].includes(status)) {
      return NextResponse.json({ error: 'status must be ACTIVE or PAUSED' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const tokenResult = await getValidMetaToken(supabase, project_id);
    if (!tokenResult.ok) {
      return NextResponse.json(tokenResult, { status: tokenResult.status });
    }
    const { access_token } = tokenResult.integration;

    const scopes = tokenResult.integration.provider_metadata?.scopes_granted || [];
    const hasManage = (tokenResult.integration.provider_metadata?.scope || '').includes('ads_management');
    if (!hasManage && !scopes.includes('ads_management')) {
      return NextResponse.json({
        error: 'Meta integration lacks ads_management scope. Re-auth required with write permissions.',
        needs_reauth_with_scope: 'ads_management',
      }, { status: 403 });
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${ad_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ status, access_token }).toString(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: 'Meta API failed', detail: err }, { status: 502 });
    }

    return NextResponse.json({ ok: true, ad_id, status });
  } catch (error) {
    console.error('Meta ad toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
