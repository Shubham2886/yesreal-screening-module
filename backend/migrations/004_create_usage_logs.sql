-- tracks every AI call (real or mock) against a report, so the daily cron
-- and the admin usage-summary endpoint have something to report on.
-- cost_usd is 0 in mock mode, populated in real mode from token counts.

CREATE TABLE IF NOT EXISTS usage_logs (
  id SERIAL PRIMARY KEY,
  report_id INT REFERENCES reports(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  tokens_used INT DEFAULT 0,
  cost_usd NUMERIC(10, 4) DEFAULT 0,
  triggered_by VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'cron')),
  created_at TIMESTAMPTZ DEFAULT now()
);
