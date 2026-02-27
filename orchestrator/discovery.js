/**
 * Agent/worker auto-discovery for FYI GTM.
 *
 * Scans agents/ and workers/ directories, validates module exports,
 * and registers them in core.automations.
 */
const path = require('path');
const fs = require('fs');
const { coreDb } = require('../shared/clients/supabase');

const WORKERS_DIR = path.resolve(__dirname, '../workers');
const AGENTS_DIR = path.resolve(__dirname, '../agents');

/**
 * Scan a directory for automation modules.
 * Each subfolder with an index.js is treated as an automation.
 * Skips folders starting with _ or .
 */
function scanDirectory(dir, expectedType) {
  const automations = [];

  if (!fs.existsSync(dir)) {
    console.log(`[discovery] Directory not found: ${dir}`);
    return automations;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) {
      continue;
    }

    const indexPath = path.join(dir, entry.name, 'index.js');
    if (!fs.existsSync(indexPath)) {
      console.log(`[discovery] Skipping ${entry.name}: no index.js`);
      continue;
    }

    try {
      const mod = require(indexPath);

      if (!mod.name || !mod.type || !mod.execute) {
        console.warn(`[discovery] Skipping ${entry.name}: missing required exports (name, type, execute)`);
        continue;
      }

      if (mod.type !== expectedType) {
        console.warn(`[discovery] ${entry.name} has type '${mod.type}' but is in ${expectedType}s/ directory`);
      }

      const automationId = `${expectedType}s/${entry.name}`;

      automations.push({
        id: automationId,
        name: mod.name,
        description: mod.description || '',
        type: mod.type,
        schedule: mod.schedule || 'manual',
        enabled: mod.enabled !== false,
        tags: mod.tags || [],
        runtime: mod.runtime || 'railway',
        flow_definition: mod.flow || null,
        _module: mod
      });

      console.log(`[discovery] Found: ${mod.name} (${automationId}) [${mod.runtime || 'railway'}]`);
    } catch (err) {
      console.error(`[discovery] Failed to load ${entry.name}:`, err.message);
    }
  }

  return automations;
}

/**
 * Register automations in core.automations via upsert.
 * Preserves DB-editable fields (enabled, schedule, tags) for existing entries
 * so dashboard changes survive redeployments.
 */
async function registerInSupabase(automations) {
  if (automations.length === 0) return;

  const ids = automations.map(a => a.id);
  const { data: existing } = await coreDb
    .from('automations')
    .select('id, enabled, schedule, tags')
    .in('id', ids);

  const dbState = {};
  if (existing) {
    existing.forEach(row => { dbState[row.id] = row; });
  }

  const rows = automations.map(a => {
    const db = dbState[a.id];
    return {
      id: a.id,
      name: a.name,
      description: a.description,
      type: a.type,
      runtime: a.runtime,
      flow_definition: a.flow_definition,
      enabled: db ? db.enabled : a.enabled,
      schedule: db ? db.schedule : a.schedule,
      tags: db ? db.tags : a.tags,
      updated_at: new Date().toISOString()
    };
  });

  const { error } = await coreDb
    .from('automations')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('[discovery] Failed to register automations:', error.message);
  } else {
    console.log(`[discovery] Registered ${rows.length} automations in core.automations`);
  }
}

/**
 * Full discovery: scan filesystem → register in DB → sync DB state back to memory.
 */
async function discover() {
  console.log('[discovery] Scanning for automations...');

  const workers = scanDirectory(WORKERS_DIR, 'worker');
  const agents = scanDirectory(AGENTS_DIR, 'agent');
  const all = [...workers, ...agents];

  console.log(`[discovery] Found ${workers.length} workers, ${agents.length} agents`);

  await registerInSupabase(all);

  // Sync DB-editable fields back into memory
  const ids = all.map(a => a.id);
  if (ids.length > 0) {
    const { data: dbRows } = await coreDb
      .from('automations')
      .select('id, enabled, schedule, tags')
      .in('id', ids);

    if (dbRows) {
      const state = {};
      dbRows.forEach(row => { state[row.id] = row; });
      all.forEach(a => {
        const db = state[a.id];
        if (db) {
          a.enabled = db.enabled;
          a.schedule = db.schedule;
          a.tags = db.tags;
        }
      });
    }
  }

  return all;
}

module.exports = { discover };
