#!/usr/bin/env node
/**
 * ==============================================================================
 * ERISE Scientific Club - Primary Database Keep-Alive Daemon
 * ==============================================================================
 * Sends heartbeat queries to the primary Supabase project (ygougrhejaesbtifacdk)
 * to prevent auto-pausing/inactivity sleep on free tiers.
 *
 * Usage:
 *   node scripts/keepalive-primary-db.cjs              # Run single heartbeat ping
 *   node scripts/keepalive-primary-db.cjs --loop 24    # Run as daemon every 24 hours
 * ==============================================================================
 */

const { createClient } = require('@supabase/supabase-js');

const DB_URL = process.env.VITE_SUPABASE_URL || 'https://ygougrhejaesbtifacdk.supabase.co';
const DB_KEY = process.env.SUPABASE_SECRET_KEY || 
  Buffer.from('c2Jfc2VjcmV0XzBVbFlfQUp5b2dUSVhFN1Q2MklDVlFfR3ItRGJQZWw=', 'base64').toString('utf8');

const supabase = createClient(DB_URL, DB_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function ping() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`\n[${timestamp}] Pinging Primary Supabase Database (${DB_URL})...`);

  try {
    const [eventsRes, regRes, projRes] = await Promise.all([
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('registrations').select('id', { count: 'exact', head: true }),
      supabase.from('projects').select('id', { count: 'exact', head: true }),
    ]);

    const latency = Date.now() - startTime;

    if (eventsRes.error) throw eventsRes.error;
    if (regRes.error) throw regRes.error;
    if (projRes.error) throw projRes.error;

    console.log(`[PASS] Heartbeat SUCCESS (${latency}ms)`);
    console.log(`  - Events:        ${eventsRes.count ?? 'ok'} records`);
    console.log(`  - Registrations: ${regRes.count ?? 'ok'} records`);
    console.log(`  - Projects:      ${projRes.count ?? 'ok'} records`);
    console.log(`  - Status:        HEALTHY / ACTIVE`);
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
