const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('tracelock_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('tracelock_token', token);
  } else {
    localStorage.removeItem('tracelock_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setAuthToken(null);
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Session expired or unauthorized');
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'API Request Failed');
    }
    return data;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'API Request Failed');
  }

  return response.text() as unknown as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getCurrentUser: () => request<{ user: any }>('/auth/me'),
  getUsers: () => request<{ users: any[] }>('/auth/users'),
  createUser: (data: any) =>
    request<{ message: string; user: any }>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Dashboard
  getDashboard: () =>
    request<{
      metrics: any;
      recentAudit: any[];
      recentCases: any[];
    }>('/dashboard'),

  // Cases
  getCases: (params?: { status?: string; priority?: string; incidentType?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.incidentType) query.set('incidentType', params.incidentType);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<{ cases: any[] }>(`/cases${qs ? `?${qs}` : ''}`);
  },

  getCaseById: (id: string) => request<{ case: any }>(`/cases/${id}`),

  createCase: (data: any) =>
    request<{ case: any }>('/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCase: (id: string, updates: any) =>
    request<{ case: any }>(`/cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  addCaseMember: (caseId: string, data: { userId: string; roleInCase: string }) =>
    request<{ success: boolean }>(`/cases/${caseId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Evidence
  getEvidenceByCase: (caseId: string) => request<{ evidence: any[] }>(`/cases/${caseId}/evidence`),

  uploadEvidence: (caseId: string, formData: FormData) =>
    request<{ message: string; evidence: any }>(`/cases/${caseId}/evidence`, {
      method: 'POST',
      body: formData,
    }),

  getEvidenceById: (id: string) => request<{ evidence: any }>(`/evidence/${id}`),

  verifyEvidenceIntegrity: (id: string) =>
    request<{
      verified: boolean;
      calculatedSha256: string;
      expectedSha256: string;
      result: string;
      checkId: string;
      verifiedAt: string;
      evidence: any;
    }>(`/evidence/${id}/verify`, { method: 'POST' }),

  getCustodyEvents: (evidenceId: string) =>
    request<{ custodyEvents: any[] }>(`/evidence/${evidenceId}/custody`),

  appendCustodyEvent: (evidenceId: string, data: { action: string; details: string }) =>
    request<{ message: string; event: any }>(`/evidence/${evidenceId}/custody`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyCustodyChain: (evidenceId: string) =>
    request<{ report: any }>(`/evidence/${evidenceId}/custody/verify-chain`),

  simulateCustodyTamper: (evidenceId: string, data: { sequenceNumber: number; tamperedText: string }) =>
    request<{ success: boolean; message: string }>(`/evidence/${evidenceId}/custody/simulate-tamper`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  restoreCustodyChain: (evidenceId: string) =>
    request<{ success: boolean; message: string }>(`/evidence/${evidenceId}/custody/restore-chain`, {
      method: 'POST',
    }),

  simulateFileCorruption: (evidenceId: string) =>
    request<{ success: boolean; message: string }>(`/evidence/${evidenceId}/simulate-file-corruption`, {
      method: 'POST',
    }),

  getIntegrityHistory: (evidenceId: string) =>
    request<{ checks: any[] }>(`/evidence/${evidenceId}/integrity-history`),

  downloadEvidenceUrl: (evidenceId: string) => `${API_BASE}/evidence/${evidenceId}/download`,

  // Timeline
  getTimeline: (caseId: string) => request<{ timeline: any[] }>(`/cases/${caseId}/timeline`),
  addTimelineEvent: (caseId: string, data: any) =>
    request<{ event: any }>(`/cases/${caseId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteTimelineEvent: (id: string) =>
    request<{ success: boolean }>(`/cases/timeline/${id}`, { method: 'DELETE' }),

  // Findings
  getFindings: (caseId: string) => request<{ findings: any[] }>(`/cases/${caseId}/findings`),
  createFinding: (caseId: string, data: any) =>
    request<{ finding: any }>(`/cases/${caseId}/findings`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateFinding: (id: string, updates: any) =>
    request<{ finding: any }>(`/cases/findings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteFinding: (id: string) =>
    request<{ success: boolean }>(`/cases/findings/${id}`, { method: 'DELETE' }),

  // Notes
  getNotes: (caseId: string) => request<{ notes: any[] }>(`/cases/${caseId}/notes`),
  createNote: (caseId: string, data: { content: string; isPinned?: boolean }) =>
    request<{ note: any }>(`/cases/${caseId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  togglePinNote: (id: string) =>
    request<{ success: boolean; isPinned: boolean }>(`/cases/notes/${id}/pin`, {
      method: 'PATCH',
    }),
  deleteNote: (id: string) =>
    request<{ success: boolean }>(`/cases/notes/${id}`, { method: 'DELETE' }),

  // Reports
  getReportJson: (caseId: string) => request<any>(`/cases/${caseId}/report/json`),
  getReportHtmlUrl: (caseId: string) => `${API_BASE}/cases/${caseId}/report/html`,

  // System Audit
  getAuditLogs: (params?: { limit?: number; offset?: number; targetType?: string; targetId?: string; actorEmail?: string; action?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.targetType) query.set('targetType', params.targetType);
    if (params?.targetId) query.set('targetId', params.targetId);
    if (params?.actorEmail) query.set('actorEmail', params.actorEmail);
    if (params?.action) query.set('action', params.action);
    const qs = query.toString();
    return request<{ auditLogs: any[] }>(`/audit${qs ? `?${qs}` : ''}`);
  },
};
