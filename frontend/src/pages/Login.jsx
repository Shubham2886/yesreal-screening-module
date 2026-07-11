import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../App.jsx';

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(form.email, form.password)
          : await api.register(form.name, form.email, form.password);
      login(res.user, res.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>{mode === 'login' ? 'Login' : 'Create Recruiter Account'}</h2>

      <form onSubmit={submit}>
        {mode === 'register' && (
          <label>
            Name
            <input name="name" value={form.name} onChange={onChange} required />
          </label>
        )}
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={onChange} required />
        </label>
        <label>
          Password
          <input type="password" name="password" value={form.password} onChange={onChange} required />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
        </button>
      </form>

      <button className="btn-link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
      </button>

      <div className="seed-hint">
        <p>seeded accounts (run <code>npm run seed</code> in backend first):</p>
        <p>admin@yesreal.com / Admin@123</p>
        <p>recruiter@yesreal.com / Recruiter@123</p>
      </div>
    </div>
  );
}
