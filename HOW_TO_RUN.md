# my notes - how to run this + where everything is

(this file is just for me, README.md is the "proper" one for the reviewer)

## running it, fastest way (docker)

```bash
cd yesreal-screening-module
cp backend/.env.example backend/.env
docker compose up --build
```

wait for postgres to go healthy (compose will show it), then in a second
terminal:

```bash
docker compose exec backend npm run migrate
docker compose exec backend npm run seed
```

that's it. frontend on localhost:4173, backend on localhost:5000.
login with recruiter@yesreal.com / Recruiter@123, or admin@yesreal.com /
Admin@123 if I want to check the usage-summary page.

## running it without docker (if postgres is already on my machine)

backend:
```bash
cd backend
cp .env.example .env
# edit .env if my local postgres user/password isn't postgres/postgres
npm install
npm run migrate
npm run seed
npm run dev
```

frontend, separate terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

frontend dev server is on 5173 in this mode (vite default), not 4173.

## where to actually look 

- **backend/src/app.js** - this is the entry point basically, wires all
  the routes together. start here if I forget the layout.
- **backend/src/services/aiService.js** - the actual "AI" part. mock
  mode is on by default (AI_MODE=mock in .env), it's not just a stub
  returning fake text, it really does keyword matching between resume
  and JD to build the checklist/gaps/score. if I ever get an OpenAI or
  groq key, flip AI_MODE and it just works, same output shape either way.
- **backend/src/cron/reportProcessor.js** - the daily job. don't need
  to wait for 3am to see it work, login as admin and hit "run reprocess
  job now" button on the admin page, or just curl
  `POST /api/admin/reprocess-now` with the admin token.
- **backend/migrations/** - plain sql files, run in order by
  `npm run migrate`. no ORM, wanted to keep this simple and readable.
- **backend/tests/** - run `npm test` inside backend, all mocked so no
  db needed just to check the logic works. 15 tests, all passing.
- **frontend/src/pages/** - Login, Dashboard (report list + status
  filter), UploadPage (paste resume + JD, kicks off screening),
  ReportView (the actual report, download pdf/html buttons), AdminPage
  (usage summary, only shows up in the navbar for admin login).
- **docs/sample-report.pdf** - generated this by literally running the
  pdf generator code against sample data, not a mockup, so it's proof
  the export actually works.
- **postman/yesreal-collection.json** - import into postman, hit login
  first to get a token, then paste it into the `token` variable at the
  collection level.

## how this maps 

- **RBAC recruiter/admin** → `middleware/auth.js`, `requireRole()`.
  admin-only stuff is usage-summary + reprocess-now.
- **upload/paste resume + JD** → UploadPage does both in one form,
  backend accepts either a file (multer, see middleware/upload.js) or
  raw pasted text.
- **AI report: fit summary, checklist, gap analysis, task suggestion**
  → exactly those 4 fields come back from aiService, stored on the
  reports table, shown on ReportView.
- **PDF/HTML export** → reportService.js, PDFKit for pdf, hand-rolled
  html template for the other one.
- **cron reprocessing failed/pending + usage logging** →
  reportProcessor.js + usage_logs table + admin usage-summary endpoint
  shows cost/tokens per provider.
- **dashboard with history + filters + download** → Dashboard.jsx has
  the status chips (pending/processing/completed/failed/all), each row
  links to ReportView which has the download buttons.
- **subscription/usage limit flag** → users.plan + usage_limit +
  usage_count columns, free plan blocks new reports at the limit with
  a 402 response, checked in reportController before it even touches
  the AI service.
- **repo structure, readme, env vars, migrations, seed** → yeah, this
  whole repo basically.
- **tests for AI mock, RBAC, report route** → all three, see backend/tests/.
- **docker compose + deployment note** → docker-compose.yml at root,
  deployment note for EC2/S3 is below.
- **never commit keys** → .env is gitignored everywhere, only
  .env.example ships.

