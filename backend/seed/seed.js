// seeds one admin, one recruiter
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');
const aiService = require('../src/services/aiService');

const SAMPLE_JD = `Full-Stack Developer (Web & Mobile) - Yesreal Technologies
We need someone strong in Node.js, Express.js or Nest.js, React.js or Next.js, PostgreSQL,
MongoDB, AWS S3/EC2/CloudFront, Docker, RBAC, cron based workflows, document automation,
and OpenAI or Groq API integration. Experience with PDFKit or ExcelJS for report generation
is a big plus. 4-5 years experience preferred.`;

const SAMPLE_RESUME = `Shubham Sharma - Backend Focused Full Stack Developer
3 years experience building production systems with Node.js, Express, MongoDB and React.
Built a subscription billing engine, a document automation pipeline, and a dairy delivery
SaaS platform. Comfortable with JWT auth, RBAC, Redis based job queues, Docker, and basic
AWS deployment (EC2, S3). Currently learning PostgreSQL and Kubernetes in depth.`;

async function seed() {
  const client = await pool.connect();
  try {
    console.log('seeding users...');
    const adminPassHash = await bcrypt.hash('Admin@123', 10);
    const recruiterPassHash = await bcrypt.hash('Recruiter@123', 10);

    const adminResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, plan, usage_limit)
       VALUES ('Ops Admin', 'admin@yesreal.com', $1, 'admin', 'pro', 1000)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [adminPassHash]
    );

    const recruiterResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, plan, usage_limit)
       VALUES ('Riya Recruiter', 'recruiter@yesreal.com', $1, 'recruiter', 'free', 10)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [recruiterPassHash]
    );

    const recruiterId = recruiterResult.rows[0].id;

    console.log('seeding job + candidate...');
    const jobResult = await client.query(
      `INSERT INTO jobs (title, jd_text, created_by) VALUES ($1, $2, $3) RETURNING id`,
      ['Full-Stack Developer (Web & Mobile)', SAMPLE_JD, recruiterId]
    );

    const candidateResult = await client.query(
      `INSERT INTO candidates (name, email, resume_text, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Shubham Sharma', 'candidate.sample@example.com', SAMPLE_RESUME, recruiterId]
    );

    const jobId = jobResult.rows[0].id;
    const candidateId = candidateResult.rows[0].id;

    console.log('generating sample report in mock mode...');
    const ai = await aiService.generateScreeningReport(SAMPLE_RESUME, SAMPLE_JD);

    const reportResult = await client.query(
      `INSERT INTO reports (candidate_id, job_id, status, fit_score, fit_summary,
       skill_checklist, gap_analysis, task_suggestion, ai_provider, created_by)
       VALUES ($1, $2, 'completed', $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        candidateId,
        jobId,
        ai.fitScore,
        ai.fitSummary,
        JSON.stringify(ai.skillChecklist),
        JSON.stringify(ai.gapAnalysis),
        ai.taskSuggestion,
        ai.provider,
        recruiterId,
      ]
    );

    await client.query(
      `INSERT INTO usage_logs (report_id, provider, tokens_used, cost_usd, triggered_by) VALUES ($1, $2, $3, $4, 'manual')`,
      [reportResult.rows[0].id, ai.provider, ai.tokensUsed, ai.costUsd]
    );

    await client.query('UPDATE users SET usage_count = usage_count + 1 WHERE id = $1', [recruiterId]);

    console.log('seed complete.');
    console.log('login as admin@yesreal.com / Admin@123 or recruiter@yesreal.com / Recruiter@123');
  } catch (err) {
    console.error('seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
