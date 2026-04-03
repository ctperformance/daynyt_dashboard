import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request) {
  try {
    const body = await request.json();
    const { project_id, provider, api_token, provider_account_id } = body;

    if (!project_id || !provider || !api_token) {
      return NextResponse.json({ error: 'project_id, provider, and api_token are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { error: dbError } = await supabase
      .from('integrations_oauth')
      .upsert({
        project_id,
        provider,
        access_token: api_token,
        refresh_token: null,
        token_expires_at: null,
        scope: 'api_key',
        provider_account_id: provider_account_id || null,
        provider_metadata: {
          auth_type: 'api_key',
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,provider',
      });

    if (dbError) {
      console.error('Failed to store API key integration:', dbError);
      return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save API key error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
