import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Basic scraping: fetch the page HTML
    let html;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DaynytBot/1.0)',
        },
      });
      html = await res.text();
    } catch {
      return NextResponse.json(
        { error: 'Website konnte nicht erreicht werden' },
        { status: 400 }
      );
    }

    // Extract meta tags
    const getMetaContent = (name) => {
      const regex = new RegExp(
        `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`,
        'i'
      );
      const altRegex = new RegExp(
        `<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
        'i'
      );
      const match = html.match(regex) || html.match(altRegex);
      return match ? match[1] : null;
    };

    const description =
      getMetaContent('og:description') ||
      getMetaContent('description') ||
      '';

    const logoUrl = getMetaContent('og:image') || null;
    const themeColor = getMetaContent('theme-color') || null;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract CSS color variables (look for :root { --xxx: #xxx })
    const cssVarRegex = /--[\w-]*color[\w-]*\s*:\s*(#[0-9a-fA-F]{3,8})/gi;
    const cssColors = [];
    let match;
    while ((match = cssVarRegex.exec(html)) !== null) {
      if (!cssColors.includes(match[1])) cssColors.push(match[1]);
    }

    // Also extract inline style colors
    const hexRegex = /#[0-9a-fA-F]{6}\b/g;
    const allHexColors = [];
    let hexMatch;
    while ((hexMatch = hexRegex.exec(html)) !== null) {
      if (!allHexColors.includes(hexMatch[0])) allHexColors.push(hexMatch[0]);
    }

    // Combine colors: theme-color first, then CSS vars, then common hex colors
    const colors = [];
    if (themeColor) colors.push(themeColor);
    colors.push(...cssColors.slice(0, 5));
    if (colors.length < 3) {
      for (const c of allHexColors) {
        if (!colors.includes(c) && colors.length < 6) colors.push(c);
      }
    }

    // Build response
    const brandData = {
      brand_name: title.split('|')[0]?.split('-')[0]?.trim() || '',
      description,
      logo_url: logoUrl,
      colors: colors.slice(0, 6),
      primary_color: colors[0] || '#000000',
      secondary_color: colors[1] || '#333333',
      accent_color: colors[2] || themeColor || '#d4a853',
      font_family: '',
      tagline: '',
      target_audience_summary: '',
    };

    return NextResponse.json(brandData);
  } catch (error) {
    console.error('Brand scrape error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
