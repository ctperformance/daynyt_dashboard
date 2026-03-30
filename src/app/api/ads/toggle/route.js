import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request) {
  try {
    const body = await request.json();
    const { provider, campaign_id, status, project_id } = body;

    if (!provider || !campaign_id || !status || !project_id) {
      return NextResponse.json(
        { error: 'provider, campaign_id, status und project_id sind erforderlich' },
        { status: 400 }
      );
    }

    if (!['ACTIVE', 'PAUSED'].includes(status)) {
      return NextResponse.json(
        { error: 'Status muss ACTIVE oder PAUSED sein' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    if (provider === 'meta') {
      const { data: integration, error: dbError } = await supabase
        .from('integrations_oauth')
        .select('access_token')
        .eq('project_id', project_id)
        .eq('provider', 'meta')
        .single();

      if (dbError || !integration) {
        return NextResponse.json(
          { error: 'Meta nicht verbunden' },
          { status: 404 }
        );
      }

      const updateRes = await fetch(
        `https://graph.facebook.com/v21.0/${campaign_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            access_token: integration.access_token,
          }),
        }
      );

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: `Status-Update fehlgeschlagen: ${JSON.stringify(err)}` },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Kampagne wurde ${status === 'ACTIVE' ? 'aktiviert' : 'pausiert'}`,
        status,
      });
    }

    // Stub for other providers
    if (provider === 'google') {
      return NextResponse.json(
        { error: 'Google Ads Status-Toggle wird in Kuerze verfuegbar sein' },
        { status: 501 }
      );
    }

    if (provider === 'tiktok') {
      return NextResponse.json(
        { error: 'TikTok Ads Status-Toggle wird in Kuerze verfuegbar sein' },
        { status: 501 }
      );
    }

    if (provider === 'snapchat') {
      return NextResponse.json(
        { error: 'Snapchat Ads Status-Toggle wird in Kuerze verfuegbar sein' },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: `Unbekannter Anbieter: ${provider}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Toggle API error:', error);
    return NextResponse.json(
      { error: error.message || 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
