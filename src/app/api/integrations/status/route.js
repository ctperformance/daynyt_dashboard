import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    console.log('Status check - Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Status check - Project ID:', projectId);

    const { data, error } = await supabase
      .from('integrations_oauth')
      .select('provider, provider_account_id, provider_metadata, connected_at, scope, token_expires_at')
      .eq('project_id', projectId);

    console.log('Status check - rows found:', data?.length, 'error:', error?.message || 'none');

    if (error) {
      console.error('Failed to fetch integration status:', error);
      return NextResponse.json(
        { error: 'Failed to fetch integration status' },
        { status: 500 }
      );
    }

    // Build status map -- never expose tokens
    const status = {
      meta: { connected: false },
      shopify: { connected: false },
    };

    for (const row of data || []) {
      status[row.provider] = {
        connected: true,
        account_id: row.provider_account_id,
        connected_at: row.connected_at,
        scope: row.scope,
        token_expires_at: row.token_expires_at,
        metadata: row.provider_metadata || {},
      };
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Integration status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
