/**
 * AgentDNAI TypeScript SDK
 *
 * Digital Identity for AI Agents - TypeScript client library
 *
 * Usage:
 *   import { AgentDNAIClient } from '@agentdnai/sdk';
 *   const client = new AgentDNAIClient({ baseUrl: 'http://localhost:3000', token: 'sess_...' });
 *   const decision = await client.authz.check({ agentId: '...', action: 'github.repo.read' });
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AgentDNAIClientConfig {
  /** Base URL of the AgentDNAI server (e.g., 'http://localhost:3000') */
  baseUrl: string;
  /** Authentication token (session or API token) */
  token: string;
}

export interface Agent {
  id: string;
  agentUri: string;
  name: string;
  description?: string;
  runtime: string;
  status: 'ACTIVE' | 'PAUSED' | 'REVOKED' | 'BLOCKED';
  publicKey: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  permissions?: Permission[];
  tokens?: AgentToken[];
}

export interface Permission {
  id: string;
  agentId: string;
  scope: string;
  effect: 'ALLOW' | 'DENY' | 'REQUIRES_APPROVAL';
  conditions?: Record<string, unknown>;
  grantedBy?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface AgentToken {
  id: string;
  agentId: string;
  scopes: string[];
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}

export interface CreateAgentParams {
  name: string;
  runtime: string;
  description?: string;
}

export interface IssueTokenParams {
  agentId: string;
  scopes: string[];
  ttlSeconds: number;
}

export interface IssueTokenResult {
  id: string;
  token: string;
  rawToken: string;
  scopes: string[];
  expiresAt: string;
}

export interface AuthorizationCheckParams {
  agentId: string;
  action: string;
  resource?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  decision: 'ALLOW' | 'DENY' | 'REQUIRES_APPROVAL';
  reason: string;
  agentId: string;
  action: string;
  resource?: string;
  evaluatedAt: string;
}

export interface BatchCheckParams {
  agentId: string;
  actions: string[];
  resource?: string;
}

export interface BatchCheckResult {
  results: AuthorizationDecision[];
}

export interface ListAgentsParams {
  search?: string;
  status?: string;
  runtime?: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  agentId?: string;
  action?: string;
  resource?: string;
  decision?: string;
  details?: Record<string, unknown>;
  eventHash: string;
  previousHash?: string;
  createdAt: string;
}

export interface ListAuditParams {
  agentId?: string;
  limit?: number;
}

export interface AuditVerifyResult {
  valid: boolean;
  eventsChecked: number;
  firstInvalidEvent?: string;
  message?: string;
}

export interface RiskScore {
  agentId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  impact: number;
  description: string;
}

export interface HealthCheckResult {
  status: string;
  version?: string;
  uptime?: number;
}

export interface StatsResult {
  totalAgents: number;
  activeAgents: number;
  pausedAgents: number;
  revokedAgents: number;
  blockedAgents: number;
  totalPermissions: number;
  activeTokens: number;
  totalAuditEvents: number;
  totalAuthorizationDecisions: number;
  recentDecisions?: AuthorizationDecision[];
}

// ── API Error ──────────────────────────────────────────────────────────────────

export class AgentDNAIError extends Error {
  public statusCode?: number;
  public code?: string;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = 'AgentDNAIError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ── Client ─────────────────────────────────────────────────────────────────────

export class AgentDNAIClient {
  private baseUrl: string;
  private token: string;

  constructor(config: AgentDNAIClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
  }

  /**
   * Update the authentication token
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Update the base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
  }

  /**
   * Internal request helper with auth and error handling
   */
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/api${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
      ...(options?.headers as Record<string, string> | undefined),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}: ${res.statusText}` } }));

    if (!res.ok) {
      const errMsg = data?.error?.message || data?.error || `HTTP ${res.status}`;
      throw new AgentDNAIError(
        typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg),
        res.status,
        data?.error?.code
      );
    }

    // Unwrap { data: ... } envelope if present
    return (data?.data !== undefined ? data.data : data) as T;
  }

  // ── Agents ─────────────────────────────────────────────────────────────────

  agents = {
    /**
     * List all agents, with optional search/filter
     */
    list: (params?: ListAgentsParams): Promise<Agent[]> => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.runtime) searchParams.set('runtime', params.runtime);
      const qs = searchParams.toString();
      return this.request<Agent[]>(`/agents${qs ? `?${qs}` : ''}`);
    },

    /**
     * Get a single agent by ID
     */
    get: (id: string): Promise<Agent> => {
      return this.request<Agent>(`/agents/${id}`);
    },

    /**
     * Create a new agent
     */
    create: (data: CreateAgentParams): Promise<Agent> => {
      return this.request<Agent>('/agents', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Pause an agent
     */
    pause: (id: string): Promise<Agent> => {
      return this.request<Agent>(`/agents/${id}/pause`, { method: 'POST' });
    },

    /**
     * Resume a paused agent
     */
    resume: (id: string): Promise<Agent> => {
      return this.request<Agent>(`/agents/${id}/resume`, { method: 'POST' });
    },

    /**
     * Revoke an agent
     */
    revoke: (id: string): Promise<Agent> => {
      return this.request<Agent>(`/agents/${id}/revoke`, { method: 'POST' });
    },

    /**
     * Rotate an agent's key pair
     */
    rotateKey: (id: string): Promise<{ publicKey: string } & Record<string, unknown>> => {
      return this.request(`/agents/${id}/rotate-key`, { method: 'POST' });
    },

    /**
     * Delete an agent
     */
    delete: (id: string): Promise<void> => {
      return this.request<void>(`/agents/${id}`, { method: 'DELETE' });
    },

    /**
     * Get risk assessment for an agent
     */
    risk: (id: string): Promise<RiskScore> => {
      return this.request<RiskScore>(`/agents/${id}/risk`);
    },
  };

  // ── Tokens ─────────────────────────────────────────────────────────────────

  tokens = {
    /**
     * Issue a new token for an agent
     */
    issue: (data: IssueTokenParams): Promise<IssueTokenResult> => {
      return this.request<IssueTokenResult>('/tokens/issue', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Revoke a token
     */
    revoke: (tokenId: string): Promise<{ success: boolean }> => {
      return this.request<{ success: boolean }>(`/tokens/${tokenId}/revoke`, {
        method: 'POST',
      });
    },
  };

  // ── Authorization ──────────────────────────────────────────────────────────

  authz = {
    /**
     * Check if an agent is authorized for an action
     */
    check: (data: AuthorizationCheckParams): Promise<AuthorizationDecision> => {
      return this.request<AuthorizationDecision>('/authz/check', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Batch check multiple actions for an agent
     */
    batchCheck: (data: BatchCheckParams): Promise<BatchCheckResult> => {
      return this.request<BatchCheckResult>('/authz/batch-check', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  };

  // ── Audit ──────────────────────────────────────────────────────────────────

  audit = {
    /**
     * List audit events with optional filters
     */
    list: (params?: ListAuditParams): Promise<AuditEvent[]> => {
      const searchParams = new URLSearchParams();
      if (params?.agentId) searchParams.set('agentId', params.agentId);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      const qs = searchParams.toString();
      return this.request<AuditEvent[]>(`/audit${qs ? `?${qs}` : ''}`);
    },

    /**
     * Verify the integrity of the audit hash chain
     */
    verify: (): Promise<AuditVerifyResult> => {
      return this.request<AuditVerifyResult>('/audit/verify');
    },
  };

  // ── Health ─────────────────────────────────────────────────────────────────

  health = {
    /**
     * Check server health
     */
    check: (): Promise<HealthCheckResult> => {
      return this.request<HealthCheckResult>('/health');
    },

    /**
     * Get server version info
     */
    version: (): Promise<{ version: string } & Record<string, unknown>> => {
      return this.request('/version');
    },
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  stats = {
    /**
     * Get platform statistics
     */
    get: (): Promise<StatsResult> => {
      return this.request<StatsResult>('/stats');
    },
  };
}

// ── Default export ─────────────────────────────────────────────────────────────

export default AgentDNAIClient;
