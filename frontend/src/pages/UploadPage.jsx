import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

// single form that does three things in sequence: create/reuse a candidate,
// create/reuse a job, then kick off a report. kept as one page since the
// assignment flow is "upload resume + JD -> get report", no need to
// spread this across three separate screens.
export default function UploadPage() {
  const navigate = useNavigate();
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeMode, setResumeMode] = useState("text");
  const [jobTitle, setJobTitle] = useState('');
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let candidate;

if (resumeMode === "file") {
    const formData = new FormData();

    formData.append("name", candidateName);
    formData.append("email", candidateEmail);

    if (resumeFile) {
        formData.append("resume", resumeFile);
    }

    candidate = await api.createCandidateWithFile(formData);
} else {
    candidate = await api.createCandidate({
        name: candidateName,
        email: candidateEmail,
        resumeText,
    });
}
      const job = await api.createJob({ title: jobTitle, jdText });
      const report = await api.createReport(candidate.id, job.id);
      navigate(`/reports/${report.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <h2>New Screening</h2>
      <p className="muted">paste the resume text and job description below, this runs against AI_MODE set on the backend (mock by default).</p>

      <form onSubmit={submit} className="upload-form">
        <fieldset>
          <legend>Candidate</legend>
          <label>
            Name
            <input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} required />
          </label>
          <label>
            Email (optional)
            <input type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} />
          </label>
  <div className="resume-mode">
  <label className="radio-label">
    <input
      type="radio"
      name="resumeMode"
      checked={resumeMode === "text"}
      onChange={() => setResumeMode("text")}
    />
    <span>Paste Resume</span>
  </label>

  <label className="radio-label">
    <input
      type="radio"
      name="resumeMode"
      checked={resumeMode === "file"}
      onChange={() => setResumeMode("file")}
    />
    <span>Upload Resume</span>
  </label>
</div>
          {resumeMode === "text" ? (
  <label>
    Resume Text
    <textarea
      rows={8}
      value={resumeText}
      onChange={(e) => setResumeText(e.target.value)}
      required={resumeMode === "text"}
    />
  </label>
) : (
  <label>
    Resume File
    <input
      type="file"
      accept=".pdf,.doc,.docx,.txt"
      onChange={(e) => setResumeFile(e.target.files[0])}
      required={resumeMode === "file"}
    />
  </label>
)}
        </fieldset>

        <fieldset>
          <legend>Job</legend>
          <label>
            Title
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
          </label>
          <label>
            Job Description
            <textarea rows={8} value={jdText} onChange={(e) => setJdText(e.target.value)} required />
          </label>
        </fieldset>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Generating report...' : 'Run AI Screening'}
        </button>
      </form>
    </div>
  );
}
