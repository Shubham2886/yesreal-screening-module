-- candidates: resume metadata + extracted text
-- resume_file_path points at wherever storageService put the file
-- (local disk in dev, would be an S3 key in prod, see services/storageService.js)

CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  resume_text TEXT NOT NULL,
  resume_file_path TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- jobs: the JD we're screening candidates against
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  jd_text TEXT NOT NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
