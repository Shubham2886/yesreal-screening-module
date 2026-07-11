import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

const STATUS_OPTIONS = ['all', 'pending', 'processing', 'completed', 'failed'];

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (status) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listReports(status === 'all' ? undefined : status);
      setReports(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div>
      <div className="page-header">
        <h2>Report History</h2>
        <Link to="/upload" className="btn-primary-link">+ New Screening</Link>
      </div>

      <div className="filter-row">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            className={s === statusFilter ? 'chip chip-active' : 'chip'}
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p>loading...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && reports.length === 0 && (
        <p className="empty-state">no reports yet, go run a new screening.</p>
      )}

      {!loading && reports.length > 0 && (
        <table className="report-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Job</th>
              <th>Status</th>
              <th>Fit Score</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.candidate_name}</td>
                <td>{r.job_title}</td>
                <td>
                  <span className={`status-badge status-${r.status}`}>{r.status}</span>
                </td>
                <td>{r.fit_score !== null ? `${r.fit_score}%` : '-'}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>
                  <Link to={`/reports/${r.id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
