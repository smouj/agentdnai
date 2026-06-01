/**
 * AgentDNAI Policy Engine - Production Ready
 * 
 * Authorization engine implementing:
 * 1. Deny-by-default: If no matching rule, DENY
 * 2. DENY always wins: If any DENY rule matches, DENY
 * 3. Wildcard support: "github.*" matches "github.repo.read", etc.
 * 4. Production actions require human approval
 * 5. Destructive actions require human approval
 * 6. Secrets require explicit permission
 */

import { db } from '@/lib/db';
import { isProductionAction, actionRequiresApproval, matchesScope } from '@/lib/permissions';

export type Decision =
  | 'allow'
  | 'deny'
  | 'requires_approval'
  | 'agent_inactive'
  | 'token_invalid'
  | 'token_expired'
  | 'insufficient_scope';

export interface AuthorizationInput {
  agentId: string;
  action: string;
  resource?: string;
  tokenScopes?: string[]; // scopes from the presented token
}

export interface AuthorizationResult {
  allowed: boolean;
  decision: Decision;
  reason: string;
  requiresApproval: boolean;
  expiresAt?: Date | null;
  matchedRule?: string; // description of which rule matched
}

/**
 * Check if an agent is authorized to perform an action
 * 
 * Rule evaluation order:
 * 1. If no agent found: DENY
 * 2. If agent not ACTIVE: DENY (with specific reason)
 * 3. If tokenScopes provided and action not in token scopes: DENY (insufficient_scope)
 * 4. Check for DENY rules (exact match, then wildcard): DENY always wins
 * 5. Check if action is production/destructive: REQUIRES_APPROVAL
 * 6. Check if action requires approval by definition: REQUIRES_APPROVAL
 * 7. Check for ALLOW rules (exact match, then wildcard): ALLOW
 * 8. No match: DENY (deny-by-default)
 */
export async function checkAuthorization(input: AuthorizationInput): Promise<AuthorizationResult> {
  const { agentId, action, resource, tokenScopes } = input;

  // ─── 1. Get agent ──────────────────────────────────────────────────────────
  const agent = await db.agentIdentity.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    return {
      allowed: false,
      decision: 'deny',
      reason: 'Agent not found.',
      requiresApproval: false,
      matchedRule: 'agent-not-found',
    };
  }

  // ─── 2. Check agent status ─────────────────────────────────────────────────
  if (agent.status !== 'ACTIVE') {
    const statusReasons: Record<string, { reason: string; decision: Decision }> = {
      PAUSED: { reason: 'Agent is paused. Resume the agent to allow actions.', decision: 'agent_inactive' },
      REVOKED: { reason: 'Agent has been revoked.', decision: 'agent_inactive' },
      BLOCKED: { reason: 'Agent has been blocked.', decision: 'agent_inactive' },
      EXPIRED: { reason: 'Agent identity has expired.', decision: 'agent_inactive' },
    };

    const statusInfo = statusReasons[agent.status];
    if (statusInfo) {
      return {
        allowed: false,
        decision: statusInfo.decision,
        reason: statusInfo.reason,
        requiresApproval: false,
        matchedRule: `agent-status-${agent.status.toLowerCase()}`,
      };
    }

    return {
      allowed: false,
      decision: 'agent_inactive',
      reason: `Agent status is '${agent.status}'. Only ACTIVE agents can perform actions.`,
      requiresApproval: false,
      matchedRule: `agent-status-${agent.status.toLowerCase()}`,
    };
  }

  // ─── 3. Check token scopes if provided ─────────────────────────────────────
  if (tokenScopes && tokenScopes.length > 0) {
    const actionInTokenScopes = tokenScopes.some(tokenScope =>
      matchesScope(tokenScope, action)
    );

    if (!actionInTokenScopes) {
      return {
        allowed: false,
        decision: 'insufficient_scope',
        reason: `Action '${action}' is not within the token's granted scopes.`,
        requiresApproval: false,
        matchedRule: 'token-scope-check',
      };
    }
  }

  // ─── 4. Check for DENY rules (exact match, then wildcard) ──────────────────
  // DENY always wins - if any DENY rule matches, the action is denied
  const denyPermissions = await findMatchingPermissions({
    agentId: agent.id,
    scope: action,
    resource,
    effect: 'DENY',
  });

  if (denyPermissions.length > 0) {
    const matchedPerm = denyPermissions[0];
    return {
      allowed: false,
      decision: 'deny',
      reason: `Explicit deny rule found for this action (scope: ${matchedPerm.scope}).`,
      requiresApproval: false,
      matchedRule: `deny-rule:${matchedPerm.id}:${matchedPerm.scope}`,
    };
  }

  // ─── 5. Check if action is production or destructive ───────────────────────
  if (isProductionAction(action)) {
    // Check if there's an explicit ALLOW for this production action
    const allowPermissions = await findMatchingPermissions({
      agentId: agent.id,
      scope: action,
      resource,
      effect: 'ALLOW',
    });

    if (allowPermissions.length > 0) {
      // Production action with explicit ALLOW still requires approval
      return {
        allowed: false,
        decision: 'requires_approval',
        reason: 'Production actions require human approval.',
        requiresApproval: true,
        expiresAt: allowPermissions[0].expiresAt,
        matchedRule: `production-approval-required:${allowPermissions[0].scope}`,
      };
    }

    // Production action without even an ALLOW - definitely requires approval
    return {
      allowed: false,
      decision: 'requires_approval',
      reason: 'Production actions require human approval.',
      requiresApproval: true,
      matchedRule: 'production-action-no-allow',
    };
  }

  if (isDestructiveAction(action)) {
    // Check if there's an explicit ALLOW for this destructive action
    const allowPermissions = await findMatchingPermissions({
      agentId: agent.id,
      scope: action,
      resource,
      effect: 'ALLOW',
    });

    if (allowPermissions.length > 0) {
      // Destructive action with explicit ALLOW still requires approval
      return {
        allowed: false,
        decision: 'requires_approval',
        reason: 'Destructive actions require human approval.',
        requiresApproval: true,
        expiresAt: allowPermissions[0].expiresAt,
        matchedRule: `destructive-approval-required:${allowPermissions[0].scope}`,
      };
    }

    // Destructive action without ALLOW
    return {
      allowed: false,
      decision: 'requires_approval',
      reason: 'Destructive actions require human approval.',
      requiresApproval: true,
      matchedRule: 'destructive-action-no-allow',
    };
  }

  // ─── 6. Check if action requires approval by definition ────────────────────
  if (actionRequiresApproval(action)) {
    const allowPermissions = await findMatchingPermissions({
      agentId: agent.id,
      scope: action,
      resource,
      effect: 'ALLOW',
    });

    if (allowPermissions.length > 0) {
      return {
        allowed: false,
        decision: 'requires_approval',
        reason: 'This action requires human approval by policy.',
        requiresApproval: true,
        expiresAt: allowPermissions[0].expiresAt,
        matchedRule: `policy-approval-required:${allowPermissions[0].scope}`,
      };
    }

    return {
      allowed: false,
      decision: 'requires_approval',
      reason: 'This action requires human approval by policy.',
      requiresApproval: true,
      matchedRule: 'policy-approval-no-allow',
    };
  }

  // ─── 7. Check for ALLOW rules (exact match, then wildcard) ─────────────────
  const allowPermissions = await findMatchingPermissions({
    agentId: agent.id,
    scope: action,
    resource,
    effect: 'ALLOW',
  });

  if (allowPermissions.length > 0) {
    const matchedPerm = allowPermissions[0];

    // Check if permission has expired
    if (matchedPerm.expiresAt && new Date() > matchedPerm.expiresAt) {
      return {
        allowed: false,
        decision: 'deny',
        reason: 'Permission for this action has expired.',
        requiresApproval: false,
        matchedRule: `expired-permission:${matchedPerm.id}:${matchedPerm.scope}`,
      };
    }

    return {
      allowed: true,
      decision: 'allow',
      reason: 'Explicit permission found for this action.',
      requiresApproval: false,
      expiresAt: matchedPerm.expiresAt,
      matchedRule: `allow-rule:${matchedPerm.id}:${matchedPerm.scope}`,
    };
  }

  // ─── 8. Deny by default ────────────────────────────────────────────────────
  return {
    allowed: false,
    decision: 'deny',
    reason: 'No matching permission found. Denied by default.',
    requiresApproval: false,
    matchedRule: 'deny-by-default',
  };
}

/**
 * Find all permissions matching the criteria, including wildcard patterns
 * 
 * Evaluation order:
 * 1. Exact scope match first (most specific)
 * 2. Wildcard patterns (e.g., "github.*" matching "github.repo.read")
 * 
 * For resource:
 * - If permission has no resource (null), it matches all resources (wildcard resource)
 * - If permission has a resource, check exact match only
 */
async function findMatchingPermissions(params: {
  agentId: string;
  scope: string;
  resource?: string;
  effect: string;
}) {
  const { agentId, scope, resource, effect } = params;

  // Get all permissions for this agent with the specified effect
  const allPermissions = await db.agentPermission.findMany({
    where: {
      agentId,
      effect,
    },
  });

  const matching: typeof allPermissions = [];

  for (const perm of allPermissions) {
    // Check scope match: exact or wildcard
    const scopeMatches = matchesScope(perm.scope, scope);
    if (!scopeMatches) continue;

    // Check resource match:
    // - If permission has no resource (null), it matches all resources (wildcard resource)
    // - If permission has a resource, check exact match
    if (perm.resource === null) {
      // Wildcard resource - matches everything
      matching.push(perm);
    } else if (resource && perm.resource === resource) {
      // Exact resource match
      matching.push(perm);
    }
    // If permission has a resource but input doesn't, or they don't match, skip
  }

  // Sort: exact scope matches before wildcard matches
  matching.sort((a, b) => {
    const aExact = a.scope === scope ? 0 : 1;
    const bExact = b.scope === scope ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;

    // Among same specificity, prefer permissions with specific resource over wildcard
    const aResource = a.resource === null ? 1 : 0;
    const bResource = b.resource === null ? 1 : 0;
    return aResource - bResource;
  });

  return matching;
}

/**
 * Check if an action is destructive
 * Destructive actions include: delete, sudo, restore, rollback, execute
 */
function isDestructiveAction(action: string): boolean {
  return action.includes('.delete') ||
    action.includes('.sudo') ||
    action.includes('.restore') ||
    action.includes('.rollback') ||
    action === 'filesystem.execute';
}

/**
 * Record an authorization decision
 */
export async function recordDecision(
  input: AuthorizationInput,
  result: AuthorizationResult,
  requestHash?: string
) {
  return db.authorizationDecision.create({
    data: {
      agentId: input.agentId,
      action: input.action,
      resource: input.resource || null,
      decision: result.decision,
      reason: result.reason,
      requestHash: requestHash || null,
    },
  });
}
