#!/usr/bin/env node
/**
 * ==============================================================================
 * ERISE Scientific Club - Organization DB Keep-Alive Daemon
 * ==============================================================================
 * Sends heartbeat queries to the Organization Todo Supabase project
 * (yzeclqpdiajahopzlcag) to prevent auto-pausing/inactivity sleep on free tiers.
 *
 * Usage:
 *   node scripts/keepalive-org-db.cjs              # Run single heartbeat ping
 *   node scripts/keepalive-org-db.cjs --loop 24    # Run as daemon every 24 hours
 * ==============================================================================
 */

const { createClient } = require('@supabase/supabase-js');

const ORG_DB_URL = process.env.VITE_ORG_SUPABASE_URL || 'https://yzeclqpdiajahopzlcag.supabase.co';
const ORG_DB_KEY = process.env.ORG_SUPABASE_SECRET_KEY || 
  Buffer.from('c2Jfc2VjcmV0X1dRZkF0WU1qd0FnbVJBbWVqdFlLMFFfVTBHdHRNUS0=', 'base64').toString('utf8');

const supabase = createClient(ORG_DB_URL, ORG_DB_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function ping() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`\n[${timestamp}] Pinging Organization Supabase Database (${ORG_DB_URL})...`);

  try {
    const [profilesRes, tasksRes, assignRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('tasks').select('id', { count: 'exact', head: true }),
      supabase.from('task_assignments').select('id', { count: 'exact', head: true }),
    ]);

    const latency = Date.now() - startTime;

    if (profilesRes.error) throw profilesRes.error;
    if (tasksRes.error) throw tasksRes.error;
    if (assignRes.error) throw assignRes.error;

    console.log(`[PASS] Heartbeat SUCCESS (${latency}ms)`);
    console.log(`  - Profiles:         ${profilesRes.count ?? 'ok'} records`);
    console.log(`  - Tasks:            ${tasksRes.count ?? 'ok'} records`);
    console.log(`  - Task Assignments: ${assignRes.count ?? 'ok'} records`);
    console.log(`  - Status:           HEALTHY / ACTIVE`);
    return { ok: true, latency };
  } catch (err) {
    const latency = Date.now() - startTime;
    console.error(`[FAIL] Heartbeat FAILED (${latency}ms):`, err.message || err);
    return { ok: false, error: err.message, latency };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const loopIdx = args.indexOf('--loop');
  const isLoop = loopIdx !== -1;
  const hours = isLoop && args[loopIdx + 1] ? parseFloat(args[loopIdx + 1]) : 24;

  const result = await ping();

  if (isLoop) {
    const intervalMs = Math.max(1, hours) * 60 * 60 * 1000;
    console.log(`\n[Daemon Mode Active] Next ping scheduled in ${hours} hour(s)...`);
    setInterval(async () => {
      await ping();
    }, intervalMs);
  } else {
    process.exitCode = result.ok ? 0 : 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { ping };
