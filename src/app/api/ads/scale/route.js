import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

async function getMetaToken(supabase, projectId) {
  const { data, error } = await supabase
    .from('integrations_oauth')
    .select('access_token, provider_account_id')
    .eq('project_id', projectId)
    .eq('provider', 'meta')
    .single();

  if (error || !data) throw new Error('Meta nicht verbunden');
  return data;
}

async function metaIncreaseBudget(accessToken, campaignId, percentage) {
  // First get current campaign budget
  const campaignRes = await fetch(
    `https://graph.facebook.com/v21.0/${campaignId}?fields=daily_budget,lifetime_budget,name&access_token=${accessToken}`
  );

  if (!campaignRes.ok) {
    const err = await campaignRes.json().catch(() => ({}));
    throw new Error(`Kampagne konnte nicht geladen werden: ${JSON.stringify(err)}`);
  }

  const campaign = await campaignRes.json();
  const currentBudget = parseInt(campaign.daily_budget || campaign.lifetime_budget || '0', 10);

  if (currentBudget === 0) {
    throw new Error('Kein Budget fuer diese Kampagne gefunden. Moeglicherweise wird das Budget auf Anzeigengruppen-Ebene verwaltet.');
  }

  const multiplier = 1 + percentage / 100;
  const newBudget = Math.round(currentBudget * multiplier);
  const budgetField = campaign.daily_budget ? 'daily_budget' : 'lifetime_budget';

  const updateRes = await fetch(
    `https://graph.facebook.com/v21.0/${campaignId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        [budgetField]: newBudget.toString(),
        access_token: accessToken,
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(`Budget-Update fehlgeschlagen: ${JSON.stringify(err)}`);
  }

  return {
    previousBudget: currentBudget / 100, // Meta uses cents
    newBudget: newBudget / 100,
    campaignName: campaign.name,
  };
}

async function metaMoveToCBO(accessToken, campaignId) {
  // Step 1: Get campaign details and its adsets
  const campaignRes = await fetch(
    `https://graph.facebook.com/v21.0/${campaignId}?fields=name,account_id,objective,status,daily_budget&access_token=${accessToken}`
  );

  if (!campaignRes.ok) {
    throw new Error('Kampagne konnte nicht geladen werden');
  }

  const campaign = await campaignRes.json();

  // Step 2: Update existing campaign to use CBO (campaign_budget_optimization)
  // Meta allows converting existing campaigns to CBO by setting the budget at campaign level
  // and enabling campaign_budget_optimization
  const adSetsRes = await fetch(
    `https://graph.facebook.com/v21.0/${campaignId}/adsets?fields=id,name,daily_budget,targeting,bid_amount,optimization_goal,billing_event,status&limit=50&access_token=${accessToken}`
  );

  if (!adSetsRes.ok) {
    throw new Error('Anzeigengruppen konnten nicht geladen werden');
  }

  const adSetsData = await adSetsRes.json();
  const adSets = adSetsData.data || [];

  if (adSets.length === 0) {
    throw new Error('Keine Anzeigengruppen in dieser Kampagne gefunden');
  }

  // Calculate total daily budget from adsets
  const totalBudget = adSets.reduce((sum, as) => {
    return sum + parseInt(as.daily_budget || '0', 10);
  }, 0);

  // Enable CBO on the campaign with the total budget
  const cboRes = await fetch(
    `https://graph.facebook.com/v21.0/${campaignId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily_budget: totalBudget > 0 ? totalBudget.toString() : (campaign.daily_budget || '5000'),
        smart_promotion_type: 'GUIDED_CREATION',
        is_budget_schedule_enabled: false,
        access_token: accessToken,
      }),
    }
  );

  if (!cboRes.ok) {
    const err = await cboRes.json().catch(() => ({}));
    // If direct CBO toggle fails, provide actionable info
    throw new Error(
      `CBO-Umstellung fehlgeschlagen. Bitte manuell im Werbeanzeigenmanager umstellen. Details: ${JSON.stringify(err)}`
    );
  }

  // Remove individual adset budgets (CBO manages budget at campaign level)
  for (const adSet of adSets) {
    if (adSet.daily_budget) {
      try {
        await fetch(`https://graph.facebook.com/v21.0/${adSet.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            daily_budget: '0',
            access_token: accessToken,
          }),
        });
      } catch {
        // Non-critical - adset budget removal may fail if CBO handles it
      }
    }
  }

  return {
    campaignName: campaign.name,
    adSetCount: adSets.length,
    totalBudget: totalBudget / 100,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { provider, campaign_id, action, project_id } = body;

    if (!provider || !campaign_id || !action || !project_id) {
      return NextResponse.json(
        { error: 'provider, campaign_id, action und project_id sind erforderlich' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    if (provider === 'meta') {
      const { access_token } = await getMetaToken(supabase, project_id);

      let result;
      switch (action) {
        case 'increase_20':
          result = await metaIncreaseBudget(access_token, campaign_id, 20);
          return NextResponse.json({
            success: true,
            message: `Budget von ${result.campaignName} um 20% erhoeht (${result.previousBudget.toFixed(2)} EUR -> ${result.newBudget.toFixed(2)} EUR)`,
            data: result,
          });

        case 'increase_50':
          result = await metaIncreaseBudget(access_token, campaign_id, 50);
          return NextResponse.json({
            success: true,
            message: `Budget von ${result.campaignName} um 50% erhoeht (${result.previousBudget.toFixed(2)} EUR -> ${result.newBudget.toFixed(2)} EUR)`,
            data: result,
          });

        case 'move_to_cbo':
          result = await metaMoveToCBO(access_token, campaign_id);
          return NextResponse.json({
            success: true,
            message: `${result.campaignName} wurde auf CBO umgestellt (${result.adSetCount} Anzeigengruppen, Gesamtbudget: ${result.totalBudget.toFixed(2)} EUR)`,
            data: result,
          });

        default:
          return NextResponse.json(
            { error: `Unbekannte Aktion: ${action}` },
            { status: 400 }
          );
      }
    }

    // Stub for other providers
    if (provider === 'google' || provider === 'tiktok' || provider === 'snapchat') {
      return NextResponse.json(
        { error: `${provider}-Skalierung wird in Kuerze verfuegbar sein` },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: `Unbekannter Anbieter: ${provider}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Scale API error:', error);
    return NextResponse.json(
      { error: error.message || 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
