// integration-style test for POST /api/reports, but the db pool is mocked
// so this runs without a real Postgres instance - useful for CI and for
// quickly checking the route logic without spinning up docker-compose.
process.env.JWT_SECRET = 'test_secret_for_jest_only';
process.env.AI_MODE = 'mock';

jest.mock('../src/config/db', () => ({
  query: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const app = require('../src/app');

function authHeaderFor(user) {
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

describe('POST /api/reports', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('creates a completed report when candidate and job exist and user is under usage limit', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ plan: 'free', usage_limit: 10, usage_count: 2 }] }) // usage check
      .mockResolvedValueOnce({ rows: [{ id: 1, resume_text: 'Node.js and Docker experience' }] }) // candidate lookup
      .mockResolvedValueOnce({ rows: [{ id: 1, jd_text: 'Need Node.js and Docker' }] }) // job lookup
      .mockResolvedValueOnce({ rows: [{ id: 99, status: 'processing' }] }) // insert report
      .mockResolvedValueOnce({ rows: [{ id: 99, status: 'completed', fit_score: 100 }] }) // update to completed
      .mockResolvedValueOnce({ rows: [] }) // insert usage log
      .mockResolvedValueOnce({ rows: [] }); // bump usage_count

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', authHeaderFor({ id: 7, role: 'recruiter', email: 'r@yesreal.com' }))
      .send({ candidateId: 1, jobId: 1 });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('completed');
    expect(res.body.fit_score).toBe(100);
  });

  test('rejects with 402 once a free plan user hits their usage limit', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ plan: 'free', usage_limit: 5, usage_count: 5 }] });

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', authHeaderFor({ id: 8, role: 'recruiter', email: 'r2@yesreal.com' }))
      .send({ candidateId: 1, jobId: 1 });

    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/usage limit reached/);
  });

  test('rejects with 400 when candidateId or jobId is missing', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', authHeaderFor({ id: 9, role: 'recruiter', email: 'r3@yesreal.com' }))
      .send({});

    expect(res.status).toBe(400);
  });

  test('rejects with 401 when no auth token is provided at all', async () => {
    const res = await request(app).post('/api/reports').send({ candidateId: 1, jobId: 1 });
    expect(res.status).toBe(401);
  });
});
