/**
 * Orchestrator logger — wraps shared query functions with console output.
 */
const { logStep, createExecution, completeExecution } = require('../shared/database/queries');

async function logStepWithConsole(executionId, stepName, status, metadata = {}) {
  const meta = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  console.log(`  [${stepName}] ${status} ${meta}`);
  return logStep(executionId, stepName, status, metadata);
}

module.exports = { logStep, logStepWithConsole, createExecution, completeExecution };
