import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// GET: Retrieve brand profile for a project
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('projects')
      .select('brand_profile')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Failed to fetch brand profile:', error);
      return NextResponse.json({ brand_profile: {} });
    }

    return NextResponse.json({ brand_profile: data?.brand_profile || {} });
  } catch (error) {
    console.error('Brand profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Save brand profile to project
export async function POST(request) {
  try {
    const { project_id, brand_profile } = await request.json();

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('projects')
      .update({ brand_profile })
      .eq('id', project_id);

    if (error) {
      console.error('Failed to save brand profile:', error);
      return NextResponse.json({ error: 'Failed to save brand profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Brand profile POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
