const cron = require('node-cron');
const pool = require('../config/db');
const aiService = require('../services/aiService');

// picks up any report stuck in pending/failed and tries to run it through
//  this is the "cron-based daily job" scheduled by default but also exported as reprocessOnce()
// so it can be triggered manually by admin
async function reprocessOnce() {
  const { rows: pendingReports } = await pool.query(
    `SELECT r.*, c.resume_text, j.jd_text FROM reports r
     JOIN candidates c ON c.id = r.candidate_id
     JOIN jobs j ON j.id = r.job_id
     WHERE r.status IN ('pending', 'failed')`
  );

  console.log(`[cron] found ${pendingReports.length} report(s) to reprocess`);

  for (const report of pendingReports) {
    try {
      const ai = await aiService.generateScreeningReport(report.resume_text, report.jd_text);

      await pool.query(
        `UPDATE reports SET status = 'completed', fit_score = $1, fit_summary = $2,
         skill_checklist = $3, gap_analysis = $4, task_suggestion = $5, ai_provider = $6,
         error_message = NULL, updated_at = now() WHERE id = $7`,
        [ai.fitScore, ai.fitSummary, JSON.stringify(ai.skillChecklist), JSON.stringify(ai.gapAnalysis), ai.taskSuggestion, ai.provider, report.id]
      );

      await pool.query(
        `INSERT INTO usage_logs (report_id, provider, tokens_used, cost_usd, triggered_by) VALUES ($1, $2, $3, $4, 'cron')`,
        [report.id, ai.provider, ai.tokensUsed, ai.costUsd]
      );

      console.log(`[cron] reprocessed report ${report.id} -> completed`);
    } catch (err) {
      await pool.query(
        `UPDATE reports SET status = 'failed', error_message = $1, updated_at = now() WHERE id = $2`,
        [err.message, report.id]
      );
      console.error(`[cron] report ${report.id} failed again: ${err.message}`);
    }
  }

  return pendingReports.length;
}

function scheduleReportReprocessor() {
  const schedule = process.env.REPROCESS_CRON || '0 3 * * *'; // default: 3am daily
  cron.schedule(schedule, () => {
    console.log('[cron] running scheduled report reprocess job');
    reprocessOnce().catch((err) => console.error('[cron] job crashed:', err));
  });
  console.log(`[cron] report reprocessor scheduled with pattern "${schedule}"`);
}

module.exports = { scheduleReportReprocessor, reprocessOnce };
