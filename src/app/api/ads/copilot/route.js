import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id ist erforderlich' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('projects')
      .select('copilot_settings')
      .eq('id', projectId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Projekt nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      settings: data.copilot_settings || {},
    });
  } catch (error) {
    console.error('Copilot GET error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { project_id, settings } = body;

    if (!project_id || !settings) {
      return NextResponse.json(
        { error: 'project_id und settings sind erforderlich' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('projects')
      .update({ copilot_settings: settings })
      .eq('id', project_id);

    if (error) {
      console.error('Copilot save error:', error);
      return NextResponse.json(
        { error: 'Einstellungen konnten nicht gespeichert werden' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Einstellungen gespeichert',
    });
  } catch (error) {
    console.error('Copilot POST error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
