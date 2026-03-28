// Seed script: creates an org, project, and sample quiz data in Supabase
// Run with: node scripts/seed.mjs

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const SYMPTOMS = [
  'Verspannungen im Nacken', 'Kopfschmerzen', 'Schlafprobleme',
  'Magenprobleme', 'Herzrasen', 'Kieferverspannung', 'Kalte Hände/Füße',
];
const TRIED = ['Meditation', 'Sport', 'Atemübungen', 'Therapie', 'Nahrungsergänzung', 'Nichts bisher'];
const Q1 = ['Ständig angespannt', 'Erschöpft & ausgebrannt', 'Gereizt & überfordert', 'Kann nicht abschalten', 'Fühle mich okay, aber nicht gut'];
const Q3 = ['Seit ein paar Tagen', 'Seit Wochen', 'Seit Monaten', 'Seit Jahren', 'Schon immer'];
const Q6 = ['Kaum', 'Etwas', 'Deutlich', 'Sehr stark', 'Es dominiert alles'];
const Q7 = ['Besser schlafen', 'Weniger Anspannung', 'Mehr Energie', 'Innere Ruhe', 'Schmerzfrei sein'];
const STEPS = ['intro', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'loading', 'email', 'result'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickMulti(arr, min = 1, max = 3) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
}
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function seed() {
  console.log('Seeding database...\n');

  // 1. Create organization
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .upsert({ name: 'EASE', slug: 'ease' }, { onConflict: 'slug' })
    .select()
    .single();

  if (orgErr) { console.error('Org error:', orgErr); return; }
  console.log(`Organization: ${org.name} (${org.id})`);

  // 2. Create project
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .upsert(
      { organization_id: org.id, name: 'Nervensystem-Quiz', slug: 'nervensystem-quiz' },
      { onConflict: 'organization_id,slug' }
    )
    .select()
    .single();

  if (projErr) { console.error('Project error:', projErr); return; }
  console.log(`Project: ${project.name} (${project.id})`);
  console.log(`Webhook Secret: ${project.webhook_secret}\n`);

  // 3. Generate 50 sample submissions over the last 30 days
  const submissions = [];
  for (let i = 0; i < 50; i++) {
    const daysAgo = rand(0, 29);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(rand(6, 23), rand(0, 59), rand(0, 59));

    const stressLevel = rand(1, 5);
    const stressScore = Math.min(100, rand(15, 30) + stressLevel * 15 + rand(-5, 10));

    submissions.push({
      project_id: project.id,
      email: `test${i}@example.com`,
      accepts_marketing: Math.random() > 0.3,
      q1_answer: pick(Q1),
      q2_answer: stressLevel,
      q3_answer: pick(Q3),
      q4_answers: pickMulti(SYMPTOMS, 1, 4),
      q5_answers: pickMulti(TRIED, 1, 3),
      q6_answer: pick(Q6),
      q7_answer: pick(Q7),
      stress_score: stressScore,
      tags: ['nervensystem-check', `stress-${stressScore}`],
      submitted_at: date.toISOString(),
    });
  }

  const { error: subErr } = await supabase.from('quiz_submissions').insert(submissions);
  if (subErr) { console.error('Submissions error:', subErr); return; }
  console.log(`Inserted ${submissions.length} quiz submissions`);

  // 4. Generate funnel events (150 sessions, with realistic drop-off)
  const funnelEvents = [];
  for (let s = 0; s < 150; s++) {
    const sessionId = `seed-session-${s}`;
    const daysAgo = rand(0, 29);
    const dropAt = rand(0, STEPS.length - 1);
    // Higher chance of reaching later steps
    const reachStep = Math.random() < 0.35 ? STEPS.length - 1 : dropAt;

    for (let stepIdx = 0; stepIdx <= reachStep; stepIdx++) {
      const ts = new Date();
      ts.setDate(ts.getDate() - daysAgo);
      ts.setHours(rand(6, 23), rand(0, 59), rand(0, 59) + stepIdx);

      funnelEvents.push({
        project_id: project.id,
        session_id: sessionId,
        step: STEPS[stepIdx],
        timestamp: ts.toISOString(),
      });
    }
  }

  const { error: funnelErr } = await supabase.from('quiz_funnel_events').insert(funnelEvents);
  if (funnelErr) { console.error('Funnel error:', funnelErr); return; }
  console.log(`Inserted ${funnelEvents.length} funnel events`);

  console.log('\n--- WICHTIG ---');
  console.log(`Füge diese Zeile zu .env.local hinzu:`);
  console.log(`NEXT_PUBLIC_PROJECT_ID=${project.id}`);
  console.log('Dann starte den Dev Server neu (npm run dev).');
}

seed();
