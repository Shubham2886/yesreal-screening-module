const pool = require('../config/db');
const storageService = require('../services/storageService');

// candidates can be created either by pasting resume text directly, or by
// uploading a file (handled by upload.js middleware before this runs).
async function createCandidate(req, res) {
  const { name, email, resumeText } = req.body;

  try {
    let finalResumeText = resumeText || '';
    let filePath = null;

    if (req.file) {
      const saved = await storageService.saveFile(req.file);
      filePath = saved.path;
      const ext = req.file.originalname
    .toLowerCase()
    .split(".")
    .pop();

if (ext === "txt") {
    finalResumeText =
        storageService.readTextFromLocalFile(saved.path);
}

else if (ext === "pdf") {
    finalResumeText =
        await storageService.extractPdfText(saved.path);
}

else if (ext === "docx") {
    finalResumeText =
        await storageService.extractDocxText(saved.path);
}
    }

    if (!name || !finalResumeText) {
      return res.status(400).json({ error: 'name and resumeText (or a .txt file upload) are required' });
    }

    const result = await pool.query(
      `INSERT INTO candidates (name, email, resume_text, resume_file_path, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email || null, finalResumeText, filePath, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create candidate' });
  }
}

async function listCandidates(req, res) {
  try {
    // rbac
    const query =
      req.user.role === 'admin'
        ? 'SELECT * FROM candidates ORDER BY created_at DESC'
        : 'SELECT * FROM candidates WHERE created_by = $1 ORDER BY created_at DESC';
    const params = req.user.role === 'admin' ? [] : [req.user.id];

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to list candidates' });
  }
}

async function createJob(req, res) {
  const { title, jdText } = req.body;
  if (!title || !jdText) {
    return res.status(400).json({ error: 'title and jdText are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO jobs (title, jd_text, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [title, jdText, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create job' });
  }
}

async function listJobs(req, res) {
  try {
    const query =
      req.user.role === 'admin'
        ? 'SELECT * FROM jobs ORDER BY created_at DESC'
        : 'SELECT * FROM jobs WHERE created_by = $1 ORDER BY created_at DESC';
    const params = req.user.role === 'admin' ? [] : [req.user.id];

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to list jobs' });
  }
}

module.exports = { createCandidate, listCandidates, createJob, listJobs };
