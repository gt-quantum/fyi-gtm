/**
 * Core orchestrator queries for FYI GTM.
 * Operates on core.executions and core.execution_steps tables.
 */
const { coreDb } = require('../clients/supabase');

/**
 * Create a new execution record.
 * @param {string} automationId - e.g. 'agents/research', 'workers/bulk-publish'
 * @returns {Promise<Object>} Execution record with id
 */
async function createExecution(automationId) {
  const { data, error } = await coreDb
    .from('executions')
    .insert([{
      automation_id: automationId,
      started_at: new Date().toISOString(),
      status: 'running'
    }])
    .select()
    .single();

  if (error) {
    console.error('Failed to create execution:', error);
    throw error;
  }

  return data;
}

/**
 * Log a step within an execution.
 * @param {string} executionId - UUID
 * @param {string} stepName - e.g. 'scrape_website', 'generate_review'
 * @param {string} status - 'started', 'completed', or 'failed'
 * @param {Object} metadata - Step-specific data (tool name, token count, etc.)
 */
async function logStep(executionId, stepName, status, metadata = {}) {
  const row = {
    execution_id: executionId,
    step_name: stepName,
    status,
    metadata
  };

  if (status === 'started') {
    row.started_at = new Date().toISOString();
  } else {
    row.completed_at = new Date().toISOString();
  }

  const { error } = await coreDb
    .from('execution_steps')
    .insert([row]);

  if (error) {
    console.error('Failed to log step:', error);
  }
}

/**
 * Mark an execution as complete (success or failure).
 * @param {string} executionId - UUID
 * @param {string} status - 'success' or 'failure'
 * @param {string|null} errorMsg - Error message if failed
 * @param {Object} metadata - Result data (items processed, duration, etc.)
 */
async function completeExecution(executionId, status, errorMsg = null, metadata = {}) {
  const completedAt = new Date().toISOString();

  const { error } = await coreDb
    .from('executions')
    .update({
      completed_at: completedAt,
      status,
      error: errorMsg,
      metadata
    })
    .eq('id', executionId);

  if (error) {
    console.error('Failed to complete execution:', error);
  }
}

module.exports = { createExecution, logStep, completeExecution };
