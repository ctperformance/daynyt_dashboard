import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request) {
  try {
    const { product_description, tone, platform } = await request.json();

    if (!product_description) {
      return NextResponse.json(
        { error: 'product_description is required' },
        { status: 400 }
      );
    }

    // Placeholder response — will be connected to AI API (Claude/OpenAI) later
    const toneMap = {
      professional: {
        prefix: 'Entdecke',
        style: 'klar und ueberzeugend',
      },
      casual: {
        prefix: 'Hey!',
        style: 'locker und freundlich',
      },
      urgency: {
        prefix: 'Nur fuer kurze Zeit:',
        style: 'dringend und aktivierend',
      },
      story: {
        prefix: 'Stell dir vor...',
        style: 'erzaehlend und emotional',
      },
    };

    const platformMap = {
      meta: { cta: 'Jetzt entdecken', charLimit: '125 Zeichen Headline' },
      google: { cta: 'Mehr erfahren', charLimit: '30 Zeichen Headline' },
      tiktok: { cta: 'Link in Bio', charLimit: '100 Zeichen' },
      snapchat: { cta: 'Nach oben wischen', charLimit: '34 Zeichen Headline' },
    };

    const toneConfig = toneMap[tone] || toneMap.professional;
    const platformConfig = platformMap[platform] || platformMap.meta;

    const copy = {
      headline: `${toneConfig.prefix} ${product_description.slice(0, 50)}`,
      primary_text: `[Platzhalter — ${toneConfig.style}]\n\n${product_description}\n\nDiese Copy wird spaeter per KI generiert und auf "${platform}" optimiert (${platformConfig.charLimit}).`,
      cta: platformConfig.cta,
      platform,
      tone,
      _placeholder: true,
    };

    return NextResponse.json(copy);
  } catch (error) {
    console.error('Generate copy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
