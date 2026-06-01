/**
 * AgentDNAI API Client
 * 
 * Client-side API wrapper with session token support.
 */

const BASE = '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('agentdnai_token');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
    const msg = error?.error?.message || error?.error || `HTTP ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  const data = await res.json();
  // Handle {data: ...} wrapped responses
  return (data?.data !== undefined ? data.data : data) as T;
}

async function apiFetchBlob(path: string, options?: RequestInit): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  agentUri: string;
  name: string;
  description: string | null;
  runtime: string;
  environment?: string;
  publicKey: string;
  fingerprint?: string;
  status: string;
  ownerUserId: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  permissions?: Permission[];
  tokens?: Token[];
  auditEvents?: AuditEvent[];
  _count?: { permissions: number; tokens: number };
}

export interface Permission {
  id: string;
  agentId: string;
  scope: string;
  resource: string | null;
  effect: string;
  expiresAt: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface Token {
  id: string;
  agentId: string;
  tokenHash: string;
  scopes: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface AuditEvent {
  id: string;
  sequence?: number;
  eventType: string;
  actorType: string;
  actorId: string | null;
  agentId: string | null;
  organizationId?: string | null;
  resource: string | null;
  action: string | null;
  decision: string | null;
  metadata: string | null;
  previousHash: string | null;
  eventHash: string;
  createdAt: string;
}

export interface AuthzResult {
  allowed: boolean;
  decision: string;
  reason: string;
  requiresApproval: boolean;
  expiresAt?: string | null;
  matchedRule?: string;
}

export interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  pausedAgents: number;
  revokedAgents: number;
  totalPermissions: number;
  activeTokens: number;
  recentAllowCount: number;
  recentDenyCount: number;
  recentRequiresApprovalCount: number;
}

export interface IssuedToken {
  tokenId: string;
  token: string;
  scopes: string[];
  expiresAt: string;
}

export interface ApprovalRequest {
  id: string;
  agentId: string;
  action: string;
  resource: string | null;
  status: string;
  requestedBy: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  expiresAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  agent?: Agent;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  organizations?: { id: string; name: string; slug: string; role: string }[];
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const api = {
  // ─── Auth ──────────────────────────────────────────────────────────────
  register: (data: { email: string; password: string; name: string }) =>
    apiFetch<{ user: UserInfo; session: { token: string; expiresAt: string }; organization: { id: string; name: string; slug: string } }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch<{ user: UserInfo; session: { token: string; expiresAt: string } }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  logout: () =>
    apiFetch<void>('/auth/logout', { method: 'POST' }),

  me: () =>
    apiFetch<{ user: UserInfo }>('/auth/me'),

  // ─── Organizations ─────────────────────────────────────────────────────
  listOrgs: () =>
    apiFetch<{ id: string; name: string; slug: string; description: string | null; role: string }[]>('/orgs'),

  createOrg: (data: { name: string; description?: string }) =>
    apiFetch<{ id: string; name: string; slug: string }>('/orgs', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Agents ────────────────────────────────────────────────────────────
  createAgent: (data: { name: string; runtime: string; description?: string }) =>
    apiFetch<Agent>('/agents', { method: 'POST', body: JSON.stringify(data) }),

  listAgents: (params?: { search?: string; status?: string; runtime?: string }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.status) sp.set('status', params.status);
    if (params?.runtime) sp.set('runtime', params.runtime);
    const qs = sp.toString();
    return apiFetch<Agent[]>(`/agents${qs ? `?${qs}` : ''}`);
  },

  getAgent: (id: string) =>
    apiFetch<Agent & { permissions: Permission[]; tokens: Token[]; auditEvents: AuditEvent[] }>(`/agents/${id}`),

  revokeAgent: (id: string) => apiFetch<Agent>(`/agents/${id}/revoke`, { method: 'POST' }),
  pauseAgent: (id: string) => apiFetch<Agent>(`/agents/${id}/pause`, { method: 'POST' }),
  resumeAgent: (id: string) => apiFetch<Agent>(`/agents/${id}/resume`, { method: 'POST' }),
  rotateKey: (id: string) => apiFetch<{ publicKey: string; fingerprint?: string }>(`/agents/${id}/rotate-key`, { method: 'POST' }),
  deleteAgent: (id: string) => apiFetch<{ success: boolean }>(`/agents/${id}`, { method: 'DELETE' }),
  getAgentHealth: (id: string) => apiFetch<Record<string, unknown>>(`/agents/${id}/health`),
  getAgentRisk: (id: string) => apiFetch<{ agentId: string; riskScore: number; riskLevel: string; factors: { name: string; impact: number; description: string }[] }>(`/agents/${id}/risk`),

  // ─── Permissions ───────────────────────────────────────────────────────
  grantPermission: (agentId: string, data: { scope: string; resource?: string; effect?: string; expiresAt?: string }) =>
    apiFetch<Permission>(`/agents/${agentId}/permissions`, { method: 'POST', body: JSON.stringify(data) }),

  listPermissions: (agentId: string) =>
    apiFetch<Permission[]>(`/agents/${agentId}/permissions`),

  deletePermission: (agentId: string, permissionId: string) =>
    apiFetch<void>(`/agents/${agentId}/permissions`, { method: 'DELETE', body: JSON.stringify({ permissionId }) }),

  // ─── Tokens ────────────────────────────────────────────────────────────
  issueToken: (data: { agentId: string; scopes: string[]; ttlSeconds: number }) =>
    apiFetch<IssuedToken>('/tokens/issue', { method: 'POST', body: JSON.stringify(data) }),

  revokeToken: (tokenId: string) =>
    apiFetch<void>(`/tokens/${tokenId}/revoke`, { method: 'POST' }),

  // ─── Authorization ────────────────────────────────────────────────────
  checkAuthz: (data: { agentId: string; action: string; resource?: string }) =>
    apiFetch<AuthzResult>('/authz/check', { method: 'POST', body: JSON.stringify(data) }),

  batchCheckAuthz: (data: { agentId: string; actions: string[]; resource?: string }) =>
    apiFetch<{ results: AuthzResult[] }>('/authz/batch-check', { method: 'POST', body: JSON.stringify(data) }),

  approveAction: (agentId: string, data: { action: string; resource?: string }) =>
    apiFetch<Permission>(`/agents/${agentId}/approve`, { method: 'POST', body: JSON.stringify(data) }),

  // ─── Approvals ────────────────────────────────────────────────────────
  listApprovals: (params?: { status?: string; agentId?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.agentId) sp.set('agentId', params.agentId);
    const qs = sp.toString();
    return apiFetch<ApprovalRequest[]>(`/approvals${qs ? `?${qs}` : ''}`);
  },

  createApproval: (data: { agentId: string; action: string; resource?: string }) =>
    apiFetch<ApprovalRequest>('/approvals', { method: 'POST', body: JSON.stringify(data) }),

  approveRequest: (id: string) =>
    apiFetch<ApprovalRequest>(`/approvals/${id}/approve`, { method: 'POST' }),

  rejectRequest: (id: string, data?: { note?: string }) =>
    apiFetch<ApprovalRequest>(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify(data || {}) }),

  // ─── Audit ────────────────────────────────────────────────────────────
  getAuditEvents: (params?: { agentId?: string; decision?: string; eventType?: string; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.agentId) sp.set('agentId', params.agentId);
    if (params?.decision) sp.set('decision', params.decision);
    if (params?.eventType) sp.set('eventType', params.eventType);
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.offset) sp.set('offset', String(params.offset));
    const qs = sp.toString();
    return apiFetch<AuditEvent[]>(`/audit${qs ? `?${qs}` : ''}`);
  },

  verifyAuditChain: () =>
    apiFetch<{ valid: boolean; eventsChecked: number; firstInvalidEvent: string | null; message: string }>('/audit/verify'),

  // ─── Stats ────────────────────────────────────────────────────────────
  getStats: () => apiFetch<DashboardStats>('/stats'),

  getActivity: () =>
    apiFetch<{ days: { date: string; total: number; allow: number; deny: number; requiresApproval: number }[]; agentActivity: Record<string, Record<string, number>>; period: string }>('/activity'),

  getTrends: () =>
    apiFetch<{ hourlyTrends: { hour: string; allow: number; deny: number; requiresApproval: number }[]; permissionDistribution: { category: string; allow: number; deny: number; requiresApproval: number }[]; topActions: { action: string; count: number }[]; period: string }>('/stats/trends'),

  // ─── Data ──────────────────────────────────────────────────────────────
  exportData: () => apiFetchBlob('/export'),

  importData: (data: Record<string, unknown>) =>
    apiFetch<{ imported: { agents: number; permissions: number; tokens: number }; skipped: { agents: number }; errors: string[] }>('/import', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Seed ──────────────────────────────────────────────────────────────
  seedDemo: () => apiFetch<Record<string, unknown>>('/seed', { method: 'POST' }),

  // ─── Health ────────────────────────────────────────────────────────────
  health: () => apiFetch<{ status: string; version: string; timestamp: string; services: Record<string, string> }>('/health'),

  version: () => apiFetch<{ version: string; name: string; description: string }>('/version'),
};
