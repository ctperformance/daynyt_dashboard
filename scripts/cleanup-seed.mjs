// Cleanup script: removes seed/test data, keeps real submissions
// Run with: node scripts/cleanup-seed.mjs

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

async function cleanup() {
  console.log('Cleaning up seed data...\n');

  // 1. Delete seed funnel events (session_id starts with "seed-session-")
  const { error: funnelErr, count: funnelCount } = await supabase
    .from('quiz_funnel_events')
    .delete({ count: 'exact' })
    .like('session_id', 'seed-session-%');

  if (funnelErr) {
    console.error('Funnel cleanup error:', funnelErr);
  } else {
    console.log(`Deleted ${funnelCount} seed funnel events`);
  }

  // 2. Delete seed submissions (email matches test*@example.com)
  const { error: subErr, count: subCount } = await supabase
    .from('quiz_submissions')
    .delete({ count: 'exact' })
    .like('email', 'test%@example.com');

  if (subErr) {
    console.error('Submissions cleanup error:', subErr);
  } else {
    console.log(`Deleted ${subCount} seed submissions`);
  }

  // 3. Show what's left
  const { count: remainingSubs } = await supabase
    .from('quiz_submissions')
    .select('*', { count: 'exact', head: true });

  const { count: remainingFunnel } = await supabase
    .from('quiz_funnel_events')
    .select('*', { count: 'exact', head: true });

  console.log(`\nRemaining: ${remainingSubs} submissions, ${remainingFunnel} funnel events`);
  console.log('Done! Only real data remains.');
}

cleanup();
