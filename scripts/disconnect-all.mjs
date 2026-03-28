// Quick script to disconnect all integrations
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

async function run() {
  // First, list what's there
  const { data: existing, error: listErr } = await supabase
    .from('integrations_oauth')
    .select('id, provider, provider_account_id, connected_at');

  if (listErr) {
    console.error('List error:', listErr);
    return;
  }

  console.log('Current integrations:', existing);

  if (existing.length === 0) {
    console.log('No integrations to delete.');
    return;
  }

  // Delete all
  for (const row of existing) {
    console.log(`Deleting ${row.provider} (${row.provider_account_id})...`);
    const { error: delErr, count } = await supabase
      .from('integrations_oauth')
      .delete({ count: 'exact' })
      .eq('id', row.id);

    if (delErr) {
      console.error(`  Error deleting ${row.provider}:`, delErr);
    } else {
      console.log(`  Deleted (count: ${count})`);
    }
  }

  // Verify
  const { data: remaining } = await supabase
    .from('integrations_oauth')
    .select('id, provider');

  console.log('\nRemaining:', remaining?.length || 0);
}

run();
