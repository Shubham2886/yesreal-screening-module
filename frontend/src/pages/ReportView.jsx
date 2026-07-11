import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

export default function ReportView() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getReport(id).then(setReport).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="error-text">{error}</p>;
  if (!report) return <p>loading...</p>;

  const downloadReport = async (format) => {
  try {
    const response = await api.downloadReport(report.id, format);

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `report-${report.id}.${format}`;

    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  }
};

  return (
    <div className="report-view">
      <div className="page-header">
        <h2>Report #{report.id}</h2>
        <div>
         <button onClick={() => downloadReport("pdf")}>
    Download PDF
</button>

<button onClick={() => downloadReport("html")}>
    Download HTML
</button>
        </div>
      </div>

      <p>
        <b>Candidate:</b> {report.candidate_name} &nbsp;|&nbsp; <b>Job:</b> {report.job_title}
      </p>
      <p>
        <span className={`status-badge status-${report.status}`}>{report.status}</span>
        {report.ai_provider && <span className="muted"> &middot; provider: {report.ai_provider}</span>}
      </p>

      {report.status === 'failed' && (
        <p className="error-text">generation failed: {report.error_message}</p>
      )}

      {report.status === 'completed' && (
        <>
          <div className="fit-score-block">
            <div className="fit-score-number">{report.fit_score}%</div>
            <div className="muted">fit score</div>
          </div>

          <h3>Summary</h3>
          <p>{report.fit_summary}</p>

          <h3>Mandatory Skill Checklist</h3>
          <ul className="checklist">
            {(report.skill_checklist || []).map((s) => (
              <li key={s.skill} className={s.present ? 'check-yes' : 'check-no'}>
                {s.present ? '✔' : '✘'} {s.skill}
              </li>
            ))}
          </ul>

          <h3>Gap Analysis</h3>
          <ul>
            {(report.gap_analysis || []).map((g) => (
              <li key={g.skill}>
                <b>{g.skill}</b>: {g.recommendation}
              </li>
            ))}
          </ul>

          <h3>Suggested Task Assignment</h3>
          <p>{report.task_suggestion}</p>
        </>
      )}
    </div>
  );
}
