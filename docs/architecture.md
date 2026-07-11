# Architecture Note

## What this actually is

A recruiter pastes/uploads a resume and a job description, the backend
runs it through an AI screening step (mock keyword-matcher by default,
real OpenAI/Groq if a key is set), and stores a structured report -
fit score, skill checklist, gap analysis, suggested next step. The
report can be exported as PDF or HTML. A daily cron job sweeps up any
report stuck in pending/failed and retries it.

That's the whole module. No auth provider, no queue system, no
microservices - just Express + Postgres + a couple of well-isolated
services, because that's what Current implementation
 for. Where I Future Improvements on purpose, I've said so
below instead of pretending they don't exist.

## High level flow

```
                         ┌────────────────────────┐
                         │        Frontend         │
                         │   React (Vite) SPA      │
                         │  Login / Upload / List   │
                         └───────────┬─────────────┘
                                     │ REST (JWT bearer)
                                     ▼
┌───────────────────────────────────────────────────────────────────┐
│                          Express Backend                          │
│                                                                     │
│   requireAuth ──▶ requireRole ──▶ controller ──▶ service           │
│                                                                     │
│   routes/                                                           │
│    ├─ authRoutes        (register, login)                          │
│    ├─ candidateRoutes   (upload/paste resume, create job)          │
│    ├─ reportRoutes      (run screening, list, export)              │
│    └─ adminRoutes       (usage summary, manual reprocess - admin)  │
│                                                                     │
│   services/                                                        │
│    ├─ storageService    (local disk now, S3 driver stubbed)        │
│    ├─ aiService         (mock | openai | groq, same output shape)  │
│    └─ reportService     (PDFKit + HTML export)                     │
│                                                                     │
│   cron/reportProcessor  (node-cron, reprocesses pending/failed)    │
└───────────────────────┬───────────────────────────────────────────┘
                         │ pg
                         ▼
                 ┌───────────────┐
                 │  PostgreSQL   │
                 │ users, jobs,  │
                 │ candidates,   │
                 │ reports,      │
                 │ usage_logs    │
                 └───────────────┘
```

## Request lifecycle for "run a screening"

1. Frontend sends `POST /api/candidates` (resume text or file) and
   `POST /api/jobs` (JD text), gets back their IDs.
2. Frontend sends `POST /api/reports` with those IDs.
3. `reportController.createReport`:
   - checks the requesting user's `plan`/`usage_count`/`usage_limit`
     (this is the "basic SaaS thinking")
   - inserts a `reports` row with status `processing`
   - calls `aiService.generateScreeningReport(resumeText, jdText)`
   - on success: updates the row to `completed`, writes a
     `usage_logs` row, increments the user's `usage_count`
   - on failure: updates the row to `failed` with the error message,
     the cron job will retry it later
4. Frontend redirects to `/reports/:id`, which can be exported as
   PDF (`GET /api/reports/:id/export?format=pdf`) or HTML.

## Why AI_MODE=mock exists and why it matters

The mock isn't a stub that returns hardcoded text. It genuinely reads
the JD, pulls out a skill list from a keyword taxonomy, checks which
of those skills show up in the resume, and builds the fit score /
checklist / gap analysis / task suggestion from that comparison. It's
deterministic (same input always gives the same output), which is
what "report generation should be repeatable" in the acceptance
checklist is asking for, and it's also why the reprocessing cron and
the automated tests don't need a live API key to run.

Switching to a real LLM is a one-line env change (`AI_MODE=openai` or
`AI_MODE=groq` + the matching API key). `callOpenAI()` and
`callGroq()` in `aiService.js` build the same JSON-shaped response
the mock does, so nothing downstream (controllers, PDF export,
frontend) needs to change.

## RBAC

Two roles: `recruiter` and `admin`. `requireAuth` verifies the JWT,
`requireRole('admin')` gates specific routes. Recruiters only see
candidates/jobs/reports they created; admins see everything.
`GET /api/admin/usage-summary` and `POST /api/admin/reprocess-now`
are the admin-only endpoints (satisfies "use RBAC for at least one
admin-only API" in the checklist).

## Storage abstraction

`storageService.js` wraps file handling behind `saveFile()`. Today it
writes to local disk (multer already did the actual write, this just
returns a normalized reference). If `STORAGE_DRIVER=s3` is set, it's
meant to call `saveS3()`, which is stubbed with the exact aws-sdk v3
calls commented in place - didn't want to add a real S3 dependency to
a repo that has to run without AWS credentials during review.

## Cron / reprocessing

`cron/reportProcessor.js` runs on a schedule (`REPROCESS_CRON` env,
default 3am daily) and also exposes `reprocessOnce()` directly, which
the admin route `POST /api/admin/reprocess-now` calls so this can be
demoed on the spot instead of waiting for 3am. It finds every report
with status `pending` or `failed`, reruns the AI step, and logs the
attempt in `usage_logs` with `triggered_by = 'cron'` so it's visible
in the admin usage summary.

## Future Improvements

- **Resume PDF/DOCX text extraction.** Right now `.txt` uploads get
  auto-read, PDF/DOCX uploads are stored but the recruiter pastes the
  extracted text manually. Wiring up `pdf-parse`/`mammoth` is
  mechanical, not architecturally interesting, and would've eaten
  time better spent on the actual screening logic. Noted here instead
  of hidden.
- **Refresh tokens.** JWT with an 8h expiry is enough for a review
  window, a real product would want refresh tokens + rotation.
- **Rate limiting / request throttling** on the AI endpoint - would
  matter a lot in production (real API costs money per call), less so
  for a graded assignment.
- **A skills taxonomy table.** The keyword list in `aiService.js` is a
  flat JS array. In a real product this would live in the database so
  it's editable without a deploy.

## Extending this

To swap in a real LLM: set `AI_MODE`, `OPENAI_API_KEY`/`GROQ_API_KEY`
in `.env`, done - no controller or frontend changes needed.

To add a new report field (say, "culture fit notes"): add the column
via a new migration file, add it to the JSON shape returned by
`aiService.generateScreeningReport`, add it to `reportService.js`'s
PDF/HTML templates, add it to the frontend's `ReportView.jsx`. Every
layer only knows about the layer directly below it, so this kind of
change doesn't ripple sideways.
