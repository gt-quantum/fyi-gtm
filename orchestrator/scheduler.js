/**
 * Cron scheduler for Railway automations.
 * GitHub Actions automations self-schedule via workflow YAML.
 */
const cron = require('node-cron');
const { execute } = require('./executor');

const jobs = new Map();

/**
 * Schedule all Railway automations that have cron expressions.
 * Skips github-actions runtime, disabled, and manual-only automations.
 */
function scheduleAll(automations) {
  stopAll();

  const toSchedule = automations.filter(a =>
    a.runtime !== 'github-actions' &&
    a.enabled &&
    a.schedule &&
    a.schedule !== 'manual'
  );

  console.log(`[scheduler] Scheduling ${toSchedule.length} Railway automations`);

  for (const automation of toSchedule) {
    if (!cron.validate(automation.schedule)) {
      console.warn(`[scheduler] Invalid cron for ${automation.name}: '${automation.schedule}'`);
      continue;
    }

    const job = cron.schedule(automation.schedule, async () => {
      console.log(`[scheduler] Cron fired: ${automation.name}`);
      await execute(automation, 'schedule');
    });

    jobs.set(automation.id, job);
    console.log(`[scheduler] Scheduled: ${automation.name} (${automation.schedule})`);
  }
}

function stopAll() {
  for (const [, job] of jobs) {
    job.stop();
  }
  jobs.clear();
}

module.exports = { scheduleAll, stopAll };
