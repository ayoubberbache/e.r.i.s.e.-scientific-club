#!/usr/bin/env node
/**
 * ==============================================================================
 * ERISE Scientific Club - Dual Supabase Keep-Alive Health Service
 * ==============================================================================
 * Pings BOTH Supabase databases simultaneously:
 * 1. Primary Club DB (ygougrhejaesbtifacdk)
 * 2. Organization To-Do DB (yzeclqpdiajahopzlcag)
 *
 * Keeps both projects active and prevents inactivity shutdown on free tiers.
 * Perfect for GitHub Actions cron workflows and background local daemons.
 *
 * Usage:
 *   node scripts/keepalive-both.cjs              # Run single dual heartbeat
 *   node scripts/keepalive-both.cjs --loop 24    # Run as daemon every 24 hours
 * ==============================================================================
 */

const primary = require('./keepalive-primary-db.cjs');
const org = require('./keepalive-org-db.cjs');

async function runDualHeartbeat() {
  const timestamp = new Date().toISOString();
  console.log('\n' + '='.repeat(80));
  console.log(` ERISE SCIENTIFIC CLUB - DUAL DATABASE KEEP-ALIVE [${timestamp}]`);
  console.log('='.repeat(80));

  const [resPrimary, resOrg] = await Promise.allSettled([
    primary.ping(),
    org.ping()
  ]);

  const pSuccess = resPrimary.status === 'fulfilled' && resPrimary.value.ok;
  const oSuccess = resOrg.status === 'fulfilled' && resOrg.value.ok;

  console.log('\n' + '-'.repeat(80));
  console.log(' SUMMARY HEALTH STATUS:');
  console.log(`  1. Primary Database (ygougrhejaesbtifacdk):     [${pSuccess ? 'ONLINE / OK' : 'FAILED'}] (${resPrimary.value?.latency || '?'}ms)`);
  console.log(`  2. Organization Database (yzeclqpdiajahopzlcag): [${oSuccess ? 'ONLINE / OK' : 'FAILED'}] (${resOrg.value?.latency || '?'}ms)`);
  console.log('-'.repeat(80) + '\n');

  return pSuccess && oSuccess;
}

async function main() {
  const args = process.argv.slice(2);
  const loopIdx = args.indexOf('--loop');
  const isLoop = loopIdx !== -1;
  const hours = isLoop && args[loopIdx + 1] ? parseFloat(args[loopIdx + 1]) : 24;

  const allOk = await runDualHeartbeat();

  if (isLoop) {
    const intervalMs = Math.max(1, hours) * 60 * 60 * 1000;
    console.log(`[Daemon Mode Active] Next dual ping scheduled in ${hours} hour(s)...`);
    setInterval(async () => {
      await runDualHeartbeat();
    }, intervalMs);
  } else {
    process.exitCode = allOk ? 0 : 1;
  }
}

if (require.main === module) {
  main();
}
