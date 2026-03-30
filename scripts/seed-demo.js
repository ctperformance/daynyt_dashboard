/**
 * Seed script for DAYNYT Dashboard demo data.
 *
 * Creates:
 * - Organization "DAYNYT Agency"
 * - Project "EASE" with slug "ease"
 * - Admin user profile (can@daynyt.com) as super_admin
 * - Client user profile (demo@ease.de) as client_read
 *
 * Usage: node scripts/seed-demo.js
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

const { config } = require('dotenv');
const { resolve } = require('path');

// Load .env.local
config({ path: resolve(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log('Seeding DAYNYT Dashboard demo data...\n');

  // 1. Create or get organization
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .upsert({ name: 'DAYNYT Agency', slug: 'daynyt' }, { onConflict: 'slug' })
    .select()
    .single();

  if (orgErr) {
    console.error('Failed to create organization:', orgErr.message);
    process.exit(1);
  }
  console.log('Organization:', org.name, `(${org.id})`);

  // 2. Create or get project
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .upsert(
      { organization_id: org.id, name: 'EASE', slug: 'ease' },
      { onConflict: 'organization_id,slug' }
    )
    .select()
    .single();

  if (projErr) {
    console.error('Failed to create project:', projErr.message);
    process.exit(1);
  }
  console.log('Project:', project.name, `(${project.id}), slug: ${project.slug}`);

  // 3. Create admin user (can@daynyt.com)
  const adminEmail = 'can@daynyt.com';
  let adminUser;
  {
    // Try to get existing user first
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === adminEmail);

    if (existing) {
      adminUser = existing;
      console.log('Admin user already exists:', adminEmail);
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: adminEmail,
        email_confirm: true,
        user_metadata: { full_name: 'Can Tillmann' },
      });
      if (createErr) {
        console.error('Failed to create admin user:', createErr.message);
        process.exit(1);
      }
      adminUser = created.user;
      console.log('Created admin user:', adminEmail);
    }
  }

  // 4. Create client user (demo@ease.de)
  const clientEmail = 'demo@ease.de';
  let clientUser;
  {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === clientEmail);

    if (existing) {
      clientUser = existing;
      console.log('Client user already exists:', clientEmail);
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: clientEmail,
        email_confirm: true,
        user_metadata: { full_name: 'EASE Demo' },
      });
      if (createErr) {
        console.error('Failed to create client user:', createErr.message);
        process.exit(1);
      }
      clientUser = created.user;
      console.log('Created client user:', clientEmail);
    }
  }

  // 5. Upsert user profiles
  await supabase.from('user_profiles').upsert([
    { id: adminUser.id, email: adminEmail, full_name: 'Can Tillmann' },
    { id: clientUser.id, email: clientEmail, full_name: 'EASE Demo' },
  ]);
  console.log('User profiles upserted.');

  // 6. Assign organization memberships
  const { error: adminMemberErr } = await supabase
    .from('organization_members')
    .upsert(
      { organization_id: org.id, user_id: adminUser.id, role: 'super_admin' },
      { onConflict: 'organization_id,user_id' }
    );
  if (adminMemberErr) {
    console.error('Failed to assign admin membership:', adminMemberErr.message);
  } else {
    console.log(`Admin membership: ${adminEmail} → super_admin`);
  }

  const { error: clientMemberErr } = await supabase
    .from('organization_members')
    .upsert(
      { organization_id: org.id, user_id: clientUser.id, role: 'client_read' },
      { onConflict: 'organization_id,user_id' }
    );
  if (clientMemberErr) {
    console.error('Failed to assign client membership:', clientMemberErr.message);
  } else {
    console.log(`Client membership: ${clientEmail} → client_read`);
  }

  console.log('\n--- Seed Complete ---');
  console.log('Organization ID:', org.id);
  console.log('Project ID:     ', project.id);
  console.log('Project Slug:   ', project.slug);
  console.log('Admin User ID:  ', adminUser.id);
  console.log('Client User ID: ', clientUser.id);
  console.log('\nYou can now log in with magic link as:');
  console.log(`  Admin:  ${adminEmail}`);
  console.log(`  Client: ${clientEmail}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
