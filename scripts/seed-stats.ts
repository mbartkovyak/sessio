/**
 * Seed dummy users + attendance data for testing the stats dashboard.
 *
 * Usage:
 *   SUPABASE_URL=https://iindwpdpmtztwwsejarz.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<your-key> \
 *   DEMO_PASSWORD=<your-password> \
 *   bun scripts/seed-stats.ts
 *
 * What it creates:
 *   - 6 dummy auth users + profiles (player role)
 *   - Adds them as training_members to all active trainings
 *   - Creates 12 weeks of past training_sessions (2/week per training, Mon+Wed)
 *   - Inserts session_attendance: ~70% confirmed, ~20% declined, ~10% no_show
 *
 * Safe to re-run — uses upsert where possible and skips existing data.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DEMO_PASSWORD) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DEMO_PASSWORD env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DUMMY_USERS = [
  { email: 'demo-athlete-1@sessio.test', full_name: 'Anna Kowalska', first_name: 'Anna', last_name: 'Kowalska' },
  { email: 'demo-athlete-2@sessio.test', full_name: 'Piotr Nowak', first_name: 'Piotr', last_name: 'Nowak' },
  { email: 'demo-athlete-3@sessio.test', full_name: 'Marta Wiśniewska', first_name: 'Marta', last_name: 'Wiśniewska' },
  { email: 'demo-athlete-4@sessio.test', full_name: 'Jakub Wójcik', first_name: 'Jakub', last_name: 'Wójcik' },
  { email: 'demo-athlete-5@sessio.test', full_name: 'Katarzyna Kamińska', first_name: 'Katarzyna', last_name: 'Kamińska' },
  { email: 'demo-athlete-6@sessio.test', full_name: 'Michał Lewandowski', first_name: 'Michał', last_name: 'Lewandowski' },
];

async function createDummyUsers(): Promise<string[]> {
  const userIds: string[] = [];

  for (const u of DUMMY_USERS) {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(user => user.email === u.email);

    if (existing) {
      console.log(`  User ${u.email} already exists (${existing.id})`);
      userIds.push(existing.id);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });

    if (error) {
      console.error(`  Failed to create ${u.email}:`, error.message);
      continue;
    }

    console.log(`  Created user ${u.email} (${data.user.id})`);
    userIds.push(data.user.id);

    // Insert profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      email: u.email,
      full_name: u.full_name,
      first_name: u.first_name,
      last_name: u.last_name,
      role: 'player',
      onboarding_complete: true,
      city: 'Warsaw',
      country: 'pl',
    }, { onConflict: 'id' });

    if (profileError) {
      console.error(`  Failed to create profile for ${u.email}:`, profileError.message);
    }
  }

  return userIds;
}

async function getTrainings(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('trainings')
    .select('id, name')
    .eq('is_active', true)
    .limit(5);
  if (error) throw error;
  return data ?? [];
}

async function addMembers(trainingIds: string[], userIds: string[]) {
  const rows = trainingIds.flatMap(trainingId =>
    userIds.map(userId => ({
      training_id: trainingId,
      user_id: userId,
      role: 'regular' as const,
    }))
  );

  const { error } = await supabase
    .from('training_members')
    .upsert(rows, { onConflict: 'training_id,user_id' });

  if (error) {
    console.error('  Failed to add members:', error.message);
  } else {
    console.log(`  Added ${rows.length} training_members rows`);
  }
}

async function createSessions(trainingIds: string[]): Promise<string[]> {
  const now = new Date();
  const sessions: { training_id: string; session_date: string; start_time: string; end_time: string; status: string }[] = [];

  for (const trainingId of trainingIds) {
    for (let w = 12; w >= 1; w--) {
      // Monday
      const monday = new Date(now.getTime() - w * 7 * 86400000);
      // Adjust to actual Monday
      const dayOfWeek = monday.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      monday.setDate(monday.getDate() + diff);

      const wednesday = new Date(monday.getTime() + 2 * 86400000);

      for (const d of [monday, wednesday]) {
        sessions.push({
          training_id: trainingId,
          session_date: d.toISOString().split('T')[0],
          start_time: '18:00',
          end_time: '19:30',
          status: 'completed',
        });
      }
    }
  }

  // Insert in batches (Supabase has a row limit per request)
  const allIds: string[] = [];
  const batchSize = 50;
  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('training_sessions')
      .insert(batch)
      .select('id');
    if (error) {
      console.error('  Failed to insert sessions batch:', error.message);
      continue;
    }
    allIds.push(...(data ?? []).map(s => s.id));
  }

  console.log(`  Created ${allIds.length} training_sessions`);
  return allIds;
}

async function createAttendance(sessionIds: string[], userIds: string[]) {
  const rows: { session_id: string; user_id: string; status: string }[] = [];

  for (const sessionId of sessionIds) {
    for (const userId of userIds) {
      const rand = Math.random();
      const status = rand < 0.7 ? 'confirmed' : rand < 0.9 ? 'declined' : 'no_show';
      rows.push({ session_id: sessionId, user_id: userId, status });
    }
  }

  // Insert in batches
  const batchSize = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('session_attendance')
      .upsert(batch, { onConflict: 'session_id,user_id' });
    if (error) {
      console.error('  Failed to insert attendance batch:', error.message);
      continue;
    }
    inserted += batch.length;
  }

  console.log(`  Created ${inserted} session_attendance rows`);
}

async function main() {
  console.log('1. Creating dummy users...');
  const userIds = await createDummyUsers();
  if (userIds.length === 0) {
    console.error('No users created. Aborting.');
    process.exit(1);
  }

  console.log('2. Fetching active trainings...');
  const trainings = await getTrainings();
  if (trainings.length === 0) {
    console.error('No active trainings found. Create a training first.');
    process.exit(1);
  }
  console.log(`  Found ${trainings.length} trainings: ${trainings.map(t => t.name).join(', ')}`);

  const trainingIds = trainings.map(t => t.id);

  console.log('3. Adding dummy users as training members...');
  await addMembers(trainingIds, userIds);

  console.log('4. Creating past sessions (12 weeks)...');
  const sessionIds = await createSessions(trainingIds);

  console.log('5. Creating attendance records...');
  await createAttendance(sessionIds, userIds);

  console.log('\nDone! Summary:');
  console.log(`  Users: ${userIds.length}`);
  console.log(`  Trainings: ${trainingIds.length}`);
  console.log(`  Sessions: ${sessionIds.length}`);
  console.log(`  Attendance: ~${sessionIds.length * userIds.length} rows`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
