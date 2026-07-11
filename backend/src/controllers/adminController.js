const pool = require('../config/db');

// admin-only endpoint, this is the one referenced in the acceptance checklist
// ("use RBAC for at least one admin-only API"). shows total usage/cost across
async function usageSummary(req, res) {
  try {
    const totals = await pool.query(`
      SELECT provider, COUNT(*) AS calls, SUM(tokens_used) AS total_tokens, SUM(cost_usd) AS total_cost
      FROM usage_logs GROUP BY provider
    `);

    const statusBreakdown = await pool.query(`
      SELECT status, COUNT(*) AS count FROM reports GROUP BY status
    `);

    const perUser = await pool.query(`
      SELECT u.id, u.name, u.email, u.plan, u.usage_count, u.usage_limit
      FROM users u ORDER BY u.usage_count DESC
    `);

    res.json({
      usageByProvider: totals.rows,
      reportsByStatus: statusBreakdown.rows,
      users: perUser.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to build usage summary' });
  }
}

// lets the demo video show the cron logic firing without waiting for 3am.
// same function the scheduled job calls internally.
async function triggerReprocess(req, res) {
  const { reprocessOnce } = require('../cron/reportProcessor');
  try {
    const count = await reprocessOnce();
    res.json({ message: `reprocessed ${count} report(s)` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'reprocess job failed' });
  }
}

module.exports = { usageSummary, triggerReprocess };

