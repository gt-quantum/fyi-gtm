/**
 * Executor — runs automations locally (Railway) or triggers GitHub Actions.
 */
const { createExecution, completeExecution, logStepWithConsole } = require('./logger');
const github = require('../shared/clients/github');

/**
 * Execute an automation.
 * @param {Object} automation - Discovered automation (with _module)
 * @param {string} trigger - 'schedule', 'manual', or 'api'
 */
async function execute(automation, trigger = 'schedule') {
  if (automation.runtime === 'github-actions') {
    return executeViaGitHub(automation, trigger);
  }
  return executeLocally(automation, trigger);
}

async function executeLocally(automation, trigger) {
  const startTime = Date.now();
  let execution;

  try {
    execution = await createExecution(automation.id);
    console.log(`[executor] Running: ${automation.name} (${execution.id})`);

    const mod = automation._module;

    if (mod.validate) {
      await logStepWithConsole(execution.id, 'validation', 'started');
      const validation = await mod.validate();
      if (!validation.valid) {
        await logStepWithConsole(execution.id, 'validation', 'failed', { errors: validation.errors });
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      await logStepWithConsole(execution.id, 'validation', 'completed');
    }

    const context = {
      executionId: execution.id,
      trigger,
      runtime: 'railway'
    };

    const result = await mod.execute(context);
    const durationMs = Date.now() - startTime;

    await completeExecution(execution.id, 'success', null, {
      ...result,
      duration_ms: durationMs
    });

    console.log(`[executor] Completed: ${automation.name} in ${durationMs}ms`);
    return { success: true, executionId: execution.id, duration: durationMs };

  } catch (error) {
    console.error(`[executor] Failed: ${automation.name}:`, error.message);

    if (execution) {
      await completeExecution(execution.id, 'failure', error.message, {
        duration_ms: Date.now() - startTime
      });
    }

    return { success: false, executionId: execution?.id, error: error.message };
  }
}

async function executeViaGitHub(automation, trigger) {
  console.log(`[executor] Triggering via GitHub Actions: ${automation.name}`);

  try {
    const result = await github.triggerWorkflow(automation.id, automation.type);

    if (result.success) {
      console.log(`[executor] GitHub Actions triggered for: ${automation.name}`);
    } else {
      console.error(`[executor] GitHub Actions failed: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error(`[executor] GitHub trigger error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
