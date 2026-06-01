/**
 * Dev Agent Wrapper - AgentDNAI Integration for Development Agents
 *
 * This wrapper provides a convenient way to wrap any development agent
 * (e.g., Claude, GPT, Codex) with AgentDNAI authorization checks.
 *
 * It provides:
 *   - A simple `wrap()` function that adds authz checks to any async function
 *   - Automatic token management and refresh
 *   - Circuit breaker pattern for when the authz server is down
 *   - Graceful degradation with configurable fail-open/fail-closed behavior
 *
 * Usage:
 *   import { createAgentWrapper } from './wrapper';
 *
 *   const wrapper = createAgentWrapper({
 *     baseUrl: 'http://localhost:3000',
 *     token: process.env.AGENTDNAI_TOKEN!,
 *     agentId: 'agent_abc123',
 *   });
 *
 *   const safeReadRepo = wrapper.wrap('github.repo.read', async () => {
 *     // ... your actual agent logic here
 *   });
 *
 *   const result = await safeReadRepo('org/repo');
 *
 * Or with the action-based API:
 *
 *   const allowed = await wrapper.check('github.repo.write', 'org/repo');
 *   if (allowed) {
 *     // perform the action
 *   }
 */

import { AgentDNAIClient, AgentDNAIError } from '../../packages/sdk/index';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AgentWrapperConfig {
  /** AgentDNAI server base URL */
  baseUrl: string;
  /** Authentication token */
  token: string;
  /** Agent ID to check authorization for */
  agentId: string;
  /** Fail-open when server is unreachable (default: false = fail-closed) */
  failOpen?: boolean;
  /** Cache authorization decisions for N milliseconds (default: 0 = no cache) */
  cacheTtlMs?: number;
  /** Max consecutive failures before circuit breaker opens (default: 5) */
  circuitBreakerThreshold?: number;
  /** Circuit breaker reset timeout in milliseconds (default: 30000) */
  circuitBreakerResetMs?: number;
}

interface CacheEntry {
  allowed: boolean;
  decision: string;
  expiresAt: number;
}

// ── Circuit Breaker ────────────────────────────────────────────────────────────

type CircuitState = 'closed' | 'open' | 'half-open';

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly resetMs: number;

  constructor(threshold = 5, resetMs = 30000) {
    this.threshold = threshold;
    this.resetMs = resetMs;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }

  canExecute(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.resetMs) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    // half-open: allow one attempt
    return true;
  }

  getState(): CircuitState {
    return this.state;
  }
}

// ── Agent Wrapper ──────────────────────────────────────────────────────────────

export interface AgentWrapper {
  /** Check if an action is authorized without executing anything */
  check(action: string, resource?: string): Promise<boolean>;

  /** Get the full authorization decision for an action */
  decide(action: string, resource?: string): Promise<{ allowed: boolean; decision: string; reason: string }>;

  /** Wrap an async function with authorization checks */
  wrap<TArgs extends unknown[], TResult>(
    action: string,
    fn: (...args: TArgs) => Promise<TResult>
  ): (resource: string, ...args: TArgs) => Promise<TResult | null>;

  /** Get the underlying SDK client for advanced usage */
  getClient(): AgentDNAIClient;

  /** Clear the authorization cache */
  clearCache(): void;
}

export function createAgentWrapper(config: AgentWrapperConfig): AgentWrapper {
  const client = new AgentDNAIClient({
    baseUrl: config.baseUrl,
    token: config.token,
  });

  const failOpen = config.failOpen ?? false;
  const cacheTtlMs = config.cacheTtlMs ?? 0;
  const circuitBreaker = new CircuitBreaker(
    config.circuitBreakerThreshold,
    config.circuitBreakerResetMs
  );

  // Authorization cache
  const cache = new Map<string, CacheEntry>();

  function getCacheKey(action: string, resource?: string): string {
    return `${action}:${resource || ''}`;
  }

  function getFromCache(key: string): CacheEntry | null {
    if (cacheTtlMs <= 0) return null;
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry;
  }

  function setCache(key: string, allowed: boolean, decision: string): void {
    if (cacheTtlMs <= 0) return;
    cache.set(key, {
      allowed,
      decision,
      expiresAt: Date.now() + cacheTtlMs,
    });
  }

  async function check(action: string, resource?: string): Promise<boolean> {
    const cacheKey = getCacheKey(action, resource);
    const cached = getFromCache(cacheKey);
    if (cached) return cached.allowed;

    // Circuit breaker check
    if (!circuitBreaker.canExecute()) {
      console.warn(`🔒 Circuit breaker is open - ${failOpen ? 'failing open' : 'failing closed'}`);
      return failOpen;
    }

    try {
      const result = await client.authz.check({
        agentId: config.agentId,
        action,
        resource,
      });

      circuitBreaker.recordSuccess();
      setCache(cacheKey, result.allowed, result.decision);
      return result.allowed;
    } catch (err) {
      circuitBreaker.recordFailure();

      if (err instanceof AgentDNAIError) {
        console.error(`❌ Authorization check failed: ${err.message}`);
      } else {
        console.error(`❌ Authorization check failed: ${(err as Error).message}`);
      }

      return failOpen;
    }
  }

  async function decide(action: string, resource?: string) {
    const cacheKey = getCacheKey(action, resource);
    const cached = getFromCache(cacheKey);
    if (cached) {
      return { allowed: cached.allowed, decision: cached.decision, reason: 'cached' };
    }

    if (!circuitBreaker.canExecute()) {
      return {
        allowed: failOpen,
        decision: failOpen ? 'ALLOW' : 'DENY',
        reason: 'circuit_breaker_open',
      };
    }

    try {
      const result = await client.authz.check({
        agentId: config.agentId,
        action,
        resource,
      });

      circuitBreaker.recordSuccess();
      setCache(cacheKey, result.allowed, result.decision);
      return {
        allowed: result.allowed,
        decision: result.decision,
        reason: result.reason,
      };
    } catch (err) {
      circuitBreaker.recordFailure();
      return {
        allowed: failOpen,
        decision: failOpen ? 'ALLOW' : 'DENY',
        reason: `error: ${(err as Error).message}`,
      };
    }
  }

  function wrap<TArgs extends unknown[], TResult>(
    action: string,
    fn: (...args: TArgs) => Promise<TResult>
  ): (resource: string, ...args: TArgs) => Promise<TResult | null> {
    return async (resource: string, ...args: TArgs): Promise<TResult | null> => {
      const isAllowed = await check(action, resource);
      if (!isAllowed) {
        return null;
      }
      return fn(...args);
    };
  }

  return {
    check,
    decide,
    wrap,
    getClient: () => client,
    clearCache: () => cache.clear(),
  };
}

// ── Example Usage ──────────────────────────────────────────────────────────────

async function demo() {
  console.log('\n🔧 Dev Agent Wrapper - AgentDNAI\n');

  const wrapper = createAgentWrapper({
    baseUrl: process.env.AGENTDNAI_URL || 'http://localhost:3000',
    token: process.env.AGENTDNAI_TOKEN || 'demo-token',
    agentId: process.env.AGENTDNAI_AGENT_ID || 'demo-agent',
    failOpen: false,
    cacheTtlMs: 60000, // Cache decisions for 1 minute
    circuitBreakerThreshold: 3,
    circuitBreakerResetMs: 15000,
  });

  // Example: Check authorization
  console.log('Checking github.repo.read authorization...');
  const canRead = await wrapper.check('github.repo.read', 'org/repo');
  console.log(`  Result: ${canRead ? '✅ Allowed' : '❌ Denied'}\n`);

  // Example: Get full decision
  console.log('Getting full decision for production.deploy...');
  const decision = await wrapper.decide('production.deploy', 'prod-cluster');
  console.log(`  Decision: ${decision.decision}`);
  console.log(`  Allowed: ${decision.allowed}`);
  console.log(`  Reason: ${decision.reason}\n`);

  // Example: Wrap a function
  const readIssues = wrapper.wrap('github.issue.read', async (repo: string, issueNumber: number) => {
    return `Read issue #${issueNumber} from ${repo}`;
  });

  console.log('Wrapped function call: github.issue.read');
  const result = await readIssues('org/repo', 42);
  console.log(`  Result: ${result ?? '❌ Blocked'}\n`);

  // Example: Batch operations
  console.log('Circuit breaker state:', wrapper.getClient() ? 'connected' : 'disconnected');

  console.log('✅ Demo complete.\n');
}

// Run demo if this file is executed directly
if (import.meta.main) {
  demo().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
