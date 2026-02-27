/**
 * FYI GTM Orchestrator
 *
 * Express server that discovers agents/workers, schedules Railway automations,
 * and exposes API endpoints for the admin portal.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { discover } = require('./discovery');
const { scheduleAll } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Store automations in app.locals for route access
app.locals.automations = [];

// Health check (Railway)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'fyi-gtm-orchestrator',
    automations: app.locals.automations.length,
    timestamp: new Date().toISOString()
  });
});

// Re-scan filesystem and update schedules
app.post('/api/rediscover', async (req, res) => {
  console.log('[server] Re-discovery requested');
  app.locals.automations = await discover();
  scheduleAll(app.locals.automations);
  res.json({ automations: app.locals.automations.length });
});

// Mount route modules
app.use('/api/tools', require('./routes/tools'));
app.use('/api/config', require('./routes/config'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/tips', require('./routes/tips'));
app.use('/api/directory', require('./routes/directory'));
app.use('/api/automations', require('./routes/automations'));
app.use('/api/executions', require('./routes/executions'));
app.use('/api/integrations', require('./routes/integrations'));

// Startup
async function start() {
  try {
    app.locals.automations = await discover();
    scheduleAll(app.locals.automations);

    app.listen(PORT, () => {
      console.log(`FYI GTM Orchestrator running on port ${PORT}`);
      console.log(`  ${app.locals.automations.length} automations discovered`);
      const railway = app.locals.automations.filter(a => a.runtime === 'railway').length;
      const gha = app.locals.automations.filter(a => a.runtime === 'github-actions').length;
      console.log(`  ${railway} Railway, ${gha} GitHub Actions`);
    });
  } catch (error) {
    console.error('Failed to start orchestrator:', error);
    process.exit(1);
  }
}

start();
