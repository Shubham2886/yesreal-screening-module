const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test_secret_for_jest_only';

const { requireAuth, requireRole } = require('../src/middleware/auth');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireAuth', () => {
  test('rejects requests with no token', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an invalid/garbage token', () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts a valid token and attaches decoded user to req.user', () => {
    const token = jwt.sign({ id: 1, role: 'recruiter', email: 'a@b.com' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 1, role: 'recruiter' });
  });
});

describe('requireRole (RBAC)', () => {
  test('blocks a recruiter from an admin-only route', () => {
    const req = { user: { id: 1, role: 'recruiter' } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('allows an admin through an admin-only route', () => {
    const req = { user: { id: 2, role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('admin')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('supports multiple allowed roles', () => {
    const req = { user: { id: 3, role: 'recruiter' } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('admin', 'recruiter')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
