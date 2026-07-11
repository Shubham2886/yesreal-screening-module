const pool = require('../config/db');
const aiService = require('../services/aiService');
const { generateReportPdf, generateReportHtml } = require('../services/reportService');

// creates a report row and immediately tries to run the AI screening.
// if AI generation throws (bad key, provider down, whatever) we still save
// the report as "failed" instead of losing the request - the reprocess
// cron will pick failed/pending rows back up later.
async function createReport(req, res) {
  const { candidateId, jobId } = req.body;

  if (!candidateId || !jobId) {
    return res.status(400).json({ error: 'candidateId and jobId are required' });
  }

  try {
    // free plan users get usage_limit reports total
    const userResult = await pool.query('SELECT plan, usage_limit, usage_count FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    if (user.plan === 'free' && user.usage_count >= user.usage_limit) {
      return res.status(402).json({
        error: `usage limit reached (${user.usage_count}/${user.usage_limit}) on free plan, upgrade to pro to continue`,
      });
    }

    const candidateResult = await pool.query('SELECT * FROM candidates WHERE id = $1', [candidateId]);
    const jobResult = await pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    const candidate = candidateResult.rows[0];
    const job = jobResult.rows[0];

    if (!candidate || !job) {
      return res.status(404).json({ error: 'candidate or job not found' });
    }

    const insertResult = await pool.query(
      `INSERT INTO reports (candidate_id, job_id, status, created_by) VALUES ($1, $2, 'processing', $3) RETURNING *`,
      [candidateId, jobId, req.user.id]
    );
    let report = insertResult.rows[0];

    try {
      const ai = await aiService.generateScreeningReport(candidate.resume_text, job.jd_text);

      const updateResult = await pool.query(
        `UPDATE reports SET status = 'completed', fit_score = $1, fit_summary = $2,
         skill_checklist = $3, gap_analysis = $4, task_suggestion = $5, ai_provider = $6,
         updated_at = now() WHERE id = $7 RETURNING *`,
        [ai.fitScore, ai.fitSummary, JSON.stringify(ai.skillChecklist), JSON.stringify(ai.gapAnalysis), ai.taskSuggestion, ai.provider, report.id]
      );
      report = updateResult.rows[0];

      await pool.query(
        `INSERT INTO usage_logs (report_id, provider, tokens_used, cost_usd, triggered_by) VALUES ($1, $2, $3, $4, 'manual')`,
        [report.id, ai.provider, ai.tokensUsed, ai.costUsd]
      );

      await pool.query('UPDATE users SET usage_count = usage_count + 1 WHERE id = $1', [req.user.id]);
    } catch (aiErr) {
      console.error('AI generation failed:', aiErr.message);
      const failedResult = await pool.query(
        `UPDATE reports SET status = 'failed', error_message = $1, updated_at = now() WHERE id = $2 RETURNING *`,
        [aiErr.message, report.id]
      );
      report = failedResult.rows[0];
    }

    res.status(201).json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create report' });
  }
}

async function listReports(req, res) {
  const { status } = req.query;

  try {
    const conditions = [];
    const params = [];

    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      conditions.push(`r.created_by = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT r.*, c.name AS candidate_name, j.title AS job_title
       FROM reports r
       JOIN candidates c ON c.id = r.candidate_id
       JOIN jobs j ON j.id = r.job_id
       ${where}
       ORDER BY r.created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to list reports' });
  }
}

async function getReport(req, res) {
  try {
    const result = await pool.query(
      `SELECT r.*, c.name AS candidate_name, j.title AS job_title
       FROM reports r JOIN candidates c ON c.id = r.candidate_id JOIN jobs j ON j.id = r.job_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    const report = result.rows[0];
    if (!report) return res.status(404).json({ error: 'report not found' });

    if (req.user.role !== 'admin' && report.created_by !== req.user.id) {
      return res.status(403).json({ error: 'not your report' });
    }

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch report' });
  }
}

async function exportReport(req, res) {
  const format = req.query.format || 'pdf';

  try {
    const result = await pool.query(
      `SELECT r.*, c.name AS candidate_name, j.title AS job_title
       FROM reports r JOIN candidates c ON c.id = r.candidate_id JOIN jobs j ON j.id = r.job_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    const report = result.rows[0];
    if (!report) return res.status(404).json({ error: 'report not found' });

    if (req.user.role !== 'admin' && report.created_by !== req.user.id) {
      return res.status(403).json({ error: 'not your report' });
    }

    if (format === 'html') {
      const html = generateReportHtml({ report, candidateName: report.candidate_name, jobTitle: report.job_title });
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${report.id}.pdf"`);
    const doc = generateReportPdf({ report, candidateName: report.candidate_name, jobTitle: report.job_title });
    doc.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to export report' });
  }
}

module.exports = { createReport, listReports, getReport, exportReport };
