import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { revokeToken } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { provider, project_id } = body;

    if (!provider || !project_id) {
      return NextResponse.json(
        { error: 'provider and project_id are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch existing token for revocation attempt
    const { data: existing } = await supabase
      .from('integrations_oauth')
      .select('access_token, provider_account_id')
      .eq('project_id', project_id)
      .eq('provider', provider)
      .single();

    // Attempt to revoke the token with the provider
    if (existing?.access_token) {
      try {
        await revokeToken(provider, existing.access_token, {
          shop: existing.provider_account_id,
        });
      } catch (revokeError) {
        // Log but don't block disconnect if revocation fails
        console.warn(`Token revocation failed for ${provider}:`, revokeError.message);
      }
    }

    // Delete from database
    const { error: dbError, count } = await supabase
      .from('integrations_oauth')
      .delete({ count: 'exact' })
      .eq('project_id', project_id)
      .eq('provider', provider);

    console.log('Disconnect result:', { provider, project_id, count, error: dbError?.message || 'none' });

    if (dbError) {
      console.error('Failed to delete integration:', dbError);
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted: count });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
