import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

// admin-only view, hits GET /api/admin/usage-summary which is the RBAC
// admin-only endpoint required by the assignment's acceptance checklist.
export default function AdminPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [reprocessMsg, setReprocessMsg] = useState('');

  const load = () => api.usageSummary().then(setSummary).catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const runReprocess = async () => {
    setReprocessMsg('running...');
    try {
      const res = await api.triggerReprocess();
      setReprocessMsg(res.message);
      load();
    } catch (err) {
      setReprocessMsg(err.message);
    }
  };

  if (error) return <p className="error-text">{error}</p>;
  if (!summary) return <p>loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Admin - Usage Summary</h2>
        <button onClick={runReprocess}>Run reprocess job now</button>
      </div>
      {reprocessMsg && <p className="muted">{reprocessMsg}</p>}

      <h3>Usage by AI Provider</h3>
      <table className="report-table">
        <thead>
          <tr><th>Provider</th><th>Calls</th><th>Tokens</th><th>Cost (USD)</th></tr>
        </thead>
        <tbody>
          {summary.usageByProvider.map((u) => (
            <tr key={u.provider}>
              <td>{u.provider}</td>
              <td>{u.calls}</td>
              <td>{u.total_tokens || 0}</td>
              <td>${Number(u.total_cost || 0).toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Reports by Status</h3>
      <table className="report-table">
        <thead><tr><th>Status</th><th>Count</th></tr></thead>
        <tbody>
          {summary.reportsByStatus.map((s) => (
            <tr key={s.status}><td>{s.status}</td><td>{s.count}</td></tr>
          ))}
        </tbody>
      </table>

      <h3>Users</h3>
      <table className="report-table">
        <thead><tr><th>Name</th><th>Email</th><th>Plan</th><th>Usage</th></tr></thead>
        <tbody>
          {summary.users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.plan}</td>
              <td>{u.usage_count} / {u.usage_limit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
