-- the core table. one report = one candidate screened against one job.
-- skill_checklist and gap_analysis are stored as jsonb since their shape
-- is a list of structured items, not something worth normalizing 

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  candidate_id INT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  fit_score INT,
  fit_summary TEXT,
  skill_checklist JSONB,
  gap_analysis JSONB,
  task_suggestion TEXT,
  ai_provider VARCHAR(20),
  error_message TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
