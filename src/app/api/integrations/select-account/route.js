import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request) {
  try {
    const { project_id, provider, account_id } = await request.json();

    if (!project_id || !provider || !account_id) {
      return NextResponse.json(
        { error: 'project_id, provider, and account_id are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch current integration to validate account_id is in the list
    const { data: integration, error: fetchError } = await supabase
      .from('integrations_oauth')
      .select('provider_metadata')
      .eq('project_id', project_id)
      .eq('provider', provider)
      .single();

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    const adAccounts = integration.provider_metadata?.ad_accounts || [];
    const selectedAccount = adAccounts.find(a => a.account_id === account_id);

    if (!selectedAccount) {
      return NextResponse.json(
        { error: 'Account not found in connected accounts' },
        { status: 400 }
      );
    }

    // Update the selected account
    const { error: updateError } = await supabase
      .from('integrations_oauth')
      .update({
        provider_account_id: account_id,
        provider_metadata: {
          ...integration.provider_metadata,
          primary_account_name: selectedAccount.name,
          currency: selectedAccount.currency,
          timezone: selectedAccount.timezone_name,
          needs_account_selection: false,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', project_id)
      .eq('provider', provider);

    if (updateError) {
      console.error('Failed to update account selection:', updateError);
      return NextResponse.json(
        { error: 'Failed to update account selection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      account: {
        id: account_id,
        name: selectedAccount.name,
        currency: selectedAccount.currency,
      },
    });
  } catch (error) {
    console.error('Select account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
