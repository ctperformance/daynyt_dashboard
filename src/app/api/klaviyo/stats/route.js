import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const KLAVIYO_HEADERS = (token) => ({
  'Authorization': `Klaviyo-API-Key ${token}`,
  'revision': '2024-10-15',
  'Accept': 'application/json',
});

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
      .select('access_token, provider_metadata')
      .eq('project_id', projectId)
      .eq('provider', 'klaviyo')
      .single();

    if (dbError || !integration) {
      return NextResponse.json({ error: 'Klaviyo nicht verbunden' }, { status: 404 });
    }

    const token = integration.access_token;
    const headers = KLAVIYO_HEADERS(token);

    // Fetch campaigns (email only, sorted by send time)
    const campaignsRes = await fetch(
      'https://a.klaviyo.com/api/campaigns/?filter=equals(messages.channel,\'email\')&sort=-send_time&page[size]=50',
      { headers }
    );

    let campaigns = [];
    let totals = { sends: 0, opens: 0, clicks: 0, open_rate: 0, click_rate: 0, revenue: 0, subscribers: 0, unsubscribes: 0, bounces: 0 };

    if (campaignsRes.ok) {
      const campaignsData = await campaignsRes.json();
      const rawCampaigns = campaignsData.data || [];

      campaigns = rawCampaigns.map((c) => {
        const attrs = c.attributes || {};
        const stats = attrs.statistics || {};
        const sends = stats.sends || stats.recipients || 0;
        const opens = stats.unique_opens || stats.opens || 0;
        const clicks = stats.unique_clicks || stats.clicks || 0;
        const bounces = stats.bounces || 0;
        const unsubscribes = stats.unsubscribes || 0;
        const revenue = stats.revenue || 0;

        return {
          id: c.id,
          name: attrs.name || 'Unbenannt',
          status: attrs.status || 'draft',
          send_time: attrs.send_time || attrs.created_at || null,
          sends,
          opens,
          clicks,
          bounces,
          unsubscribes,
          revenue: parseFloat(revenue) || 0,
          open_rate: sends > 0 ? ((opens / sends) * 100).toFixed(1) : '0.0',
          click_rate: sends > 0 ? ((clicks / sends) * 100).toFixed(1) : '0.0',
        };
      });

      // Aggregate totals
      for (const c of campaigns) {
        totals.sends += c.sends;
        totals.opens += c.opens;
        totals.clicks += c.clicks;
        totals.bounces += c.bounces;
        totals.unsubscribes += c.unsubscribes;
        totals.revenue += c.revenue;
      }
      totals.open_rate = totals.sends > 0 ? ((totals.opens / totals.sends) * 100).toFixed(1) : '0.0';
      totals.click_rate = totals.sends > 0 ? ((totals.clicks / totals.sends) * 100).toFixed(1) : '0.0';
    }

    // Fetch lists
    let lists = [];
    try {
      const listsRes = await fetch('https://a.klaviyo.com/api/lists/?page[size]=50', { headers });
      if (listsRes.ok) {
        const listsData = await listsRes.json();
        lists = (listsData.data || []).map((l) => ({
          id: l.id,
          name: l.attributes?.name || 'Unbenannt',
          subscriber_count: l.attributes?.profile_count || 0,
          created: l.attributes?.created || null,
        }));

        // Sum subscribers from lists
        totals.subscribers = lists.reduce((sum, l) => sum + (l.subscriber_count || 0), 0);
      }
    } catch {
      // silent
    }

    return NextResponse.json({ totals, campaigns, lists });
  } catch (error) {
    console.error('Klaviyo stats error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Klaviyo-Daten' }, { status: 500 });
  }
}
