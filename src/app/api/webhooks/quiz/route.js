import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

// CORS headers — needed because the Shopify quiz calls this from a different domain
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret, x-project-id',
  };
}

// Preflight handler for CORS
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// POST /api/webhooks/quiz
// Called by the Shopify quiz after successful email submit
// Headers: x-webhook-secret: <secret>
// Body: JSON with quiz answers + email
export async function POST(request) {
  try {
    // 1. Validate webhook secret
    const secret = request.headers.get('x-webhook-secret');
    const projectId = request.headers.get('x-project-id');

    if (!secret || !projectId) {
      return NextResponse.json(
        { error: 'Missing x-webhook-secret or x-project-id header' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const supabase = createServiceClient();

    // Verify project exists and secret matches
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, webhook_secret')
      .eq('id', projectId)
      .single();

    if (projErr || !project || project.webhook_secret !== secret) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401, headers: corsHeaders() });
    }

    // 2. Parse body
    const body = await request.json();
    const {
      email,
      accepts_marketing = false,
      q1, q2, q3, q4, q5, q6, q7,
      stress_score,
      tags = [],
    } = body;

    // 3. Insert submission
    const { data, error } = await supabase.from('quiz_submissions').insert({
      project_id: projectId,
      email,
      accepts_marketing,
      q1_answer: q1,
      q2_answer: typeof q2 === 'number' ? q2 : parseInt(q2) || null,
      q3_answer: q3,
      q4_answers: Array.isArray(q4) ? q4 : [],
      q5_answers: Array.isArray(q5) ? q5 : [],
      q6_answer: q6,
      q7_answer: q7,
      stress_score: typeof stress_score === 'number' ? stress_score : parseInt(stress_score) || null,
      tags: Array.isArray(tags) ? tags : [],
      raw_payload: body,
      ip_country: request.headers.get('cf-ipcountry') || null,
      user_agent: request.headers.get('user-agent') || null,
    }).select().single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500, headers: corsHeaders() });
    }

    return NextResponse.json({ ok: true, id: data.id }, { status: 201, headers: corsHeaders() });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders() });
  }
}

// Funnel tracking endpoint
export async function PUT(request) {
  try {
    const secret = request.headers.get('x-webhook-secret');
    const projectId = request.headers.get('x-project-id');

    if (!secret || !projectId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }

    const supabase = createServiceClient();

    const { data: project } = await supabase
      .from('projects')
      .select('id, webhook_secret')
      .eq('id', projectId)
      .single();

    if (!project || project.webhook_secret !== secret) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401, headers: corsHeaders() });
    }

    const { session_id, step } = await request.json();

    if (!session_id || !step) {
      return NextResponse.json({ error: 'Missing session_id or step' }, { status: 400, headers: corsHeaders() });
    }

    await supabase.from('quiz_funnel_events').insert({
      project_id: projectId,
      session_id,
      step,
    });

    return NextResponse.json({ ok: true }, { headers: corsHeaders() });
  } catch (err) {
    console.error('Funnel event error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders() });
  }
}
