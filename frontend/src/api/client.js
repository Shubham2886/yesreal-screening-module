// tiny fetch wrapper, no axios needed for a module this size.
// token is kept in memory + localStorage so a refresh doesn't log you out
// mid-demo.
const API_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('yesreal_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('yesreal_token', token);
  else localStorage.removeItem('yesreal_token');
}

async function request(path, { method = 'GET', body, isFile = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isFile) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isFile ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'request failed');
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res; // caller handles pdf/html blobs
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (name, email, password) => request('/api/auth/register', { method: 'POST', body: { name, email, password } }),

  listCandidates: () => request('/api/candidates'),
  createCandidate: (payload) => request('/api/candidates', { method: 'POST', body: payload }),
createCandidateWithFile: (formData) =>
    request("/api/candidates", {
        method: "POST",
        body: formData,
        isFile: true,
    }),
  listJobs: () => request('/api/jobs'),
  createJob: (payload) => request('/api/jobs', { method: 'POST', body: payload }),

  listReports: (status) => request(`/api/reports${status ? `?status=${status}` : ''}`),
  getReport: (id) => request(`/api/reports/${id}`),
  createReport: (candidateId, jobId) => request('/api/reports', { method: 'POST', body: { candidateId, jobId } }),
  exportReportUrl: (id, format) => `${API_URL}/api/reports/${id}/export?format=${format}`,

  usageSummary: () => request('/api/admin/usage-summary'),
  triggerReprocess: () => request('/api/admin/reprocess-now', { method: 'POST' }),
  downloadReport: (id, format) =>
  request(`/api/reports/${id}/export?format=${format}`),
};

export { API_URL };
