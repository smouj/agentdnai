/**
 * AgentDNAI API Client
 * 
 * Client-side API wrapper for all AgentDNAI endpoints.
 */

const BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  agentUri: string;
  name: string;
  description: string | null;
  runtime: string;
  publicKey: string;
  status: string;
  ownerUserId: string;
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
  eventType: string;
  actorType: string;
  actorId: string | null;
  agentId: string | null;
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

// ─── API Methods ──────────────────────────────────────────────────────────────

export const api = {
  // Agents
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

  revokeAgent: (id: string) =>
    apiFetch<Agent>(`/agents/${id}/revoke`, { method: 'POST' }),

  pauseAgent: (id: string) =>
    apiFetch<Agent>(`/agents/${id}/pause`, { method: 'POST' }),

  resumeAgent: (id: string) =>
    apiFetch<Agent>(`/agents/${id}/resume`, { method: 'POST' }),

  rotateKey: (id: string) =>
    apiFetch<{ publicKey: string }>(`/agents/${id}/rotate-key`, { method: 'POST' }),

  // Permissions
  grantPermission: (agentId: string, data: { scope: string; resource?: string; effect?: string; expiresAt?: string }) =>
    apiFetch<Permission>(`/agents/${agentId}/permissions`, { method: 'POST', body: JSON.stringify(data) }),

  listPermissions: (agentId: string) =>
    apiFetch<Permission[]>(`/agents/${agentId}/permissions`),

  deletePermission: (agentId: string, permissionId: string) =>
    apiFetch<void>(`/agents/${agentId}/permissions`, {
      method: 'DELETE',
      body: JSON.stringify({ permissionId }),
    }),

  // Tokens
  issueToken: (data: { agentId: string; scopes: string[]; ttlSeconds: number }) =>
    apiFetch<IssuedToken>('/tokens/issue', { method: 'POST', body: JSON.stringify(data) }),

  revokeToken: (tokenId: string) =>
    apiFetch<void>(`/tokens/${tokenId}/revoke`, { method: 'POST' }),

  // Authorization
  checkAuthz: (data: { agentId: string; action: string; resource?: string }) =>
    apiFetch<AuthzResult>('/authz/check', { method: 'POST', body: JSON.stringify(data) }),

  batchCheckAuthz: (data: { agentId: string; actions: string[]; resource?: string }) =>
    apiFetch<{ results: AuthzResult[] }>('/authz/batch-check', { method: 'POST', body: JSON.stringify(data) }),

  // Approval
  approveAction: (agentId: string, data: { action: string; resource?: string }) =>
    apiFetch<Permission>(`/agents/${agentId}/approve`, { method: 'POST', body: JSON.stringify(data) }),

  // Audit
  getAuditEvents: (params?: { agentId?: string; decision?: string; eventType?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.agentId) searchParams.set('agentId', params.agentId);
    if (params?.decision) searchParams.set('decision', params.decision);
    if (params?.eventType) searchParams.set('eventType', params.eventType);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return apiFetch<AuditEvent[]>(`/audit${qs ? `?${qs}` : ''}`);
  },

  verifyAuditChain: () =>
    apiFetch<{ valid: boolean; eventsChecked: number; firstInvalidEvent: string | null; message: string }>('/audit/verify'),

  // Stats
  getStats: () =>
    apiFetch<DashboardStats>('/stats'),

  // Activity
  getActivity: () =>
    apiFetch<{
      days: { date: string; total: number; allow: number; deny: number; requiresApproval: number; other: number }[];
      agentActivity: Record<string, Record<string, number>>;
      period: string;
    }>('/activity'),

  // Trends
  getTrends: () =>
    apiFetch<{
      hourlyTrends: { hour: string; allow: number; deny: number; requiresApproval: number }[];
      permissionDistribution: { category: string; allow: number; deny: number; requiresApproval: number }[];
      topActions: { action: string; count: number }[];
      period: string;
    }>('/stats/trends'),
};
