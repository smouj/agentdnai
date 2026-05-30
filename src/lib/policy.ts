/**
 * AgentDNAI Policy Engine
 * 
 * Core authorization engine implementing deny-by-default,
 * explicit deny over allow, production requires approval,
 * and least privilege principles.
 */

import { db } from '@/lib/db';
import { isProductionAction, actionRequiresApproval } from '@/lib/permissions';

export type Decision = 'allow' | 'deny' | 'requires_approval';

export interface AuthorizationInput {
  agentId: string;
  action: string;
  resource?: string;
}

export interface AuthorizationResult {
  allowed: boolean;
  decision: Decision;
  reason: string;
  requiresApproval: boolean;
  expiresAt?: Date | null;
}

/**
 * Check if an agent is authorized to perform an action
 */
export async function checkAuthorization(input: AuthorizationInput): Promise<AuthorizationResult> {
  const { agentId, action, resource } = input;

  // 1. Get agent
  const agent = await db.agentIdentity.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    return {
      allowed: false,
      decision: 'deny',
      reason: 'Agent not found.',
      requiresApproval: false,
    };
  }

  // 2. Check agent status
  if (agent.status === 'PAUSED') {
    return {
      allowed: false,
      decision: 'deny',
      reason: 'Agent is paused. Resume the agent to allow actions.',
      requiresApproval: false,
    };
  }

  if (agent.status === 'REVOKED') {
    return {
      allowed: false,
      decision: 'deny',
      reason: 'Agent has been revoked.',
      requiresApproval: false,
    };
  }

  if (agent.status === 'BLOCKED') {
    return {
      allowed: false,
      decision: 'deny',
      reason: 'Agent has been blocked.',
      requiresApproval: false,
    };
  }

  if (agent.status === 'EXPIRED') {
    return {
      allowed: false,
      decision: 'deny',
      reason: 'Agent identity has expired.',
      requiresApproval: false,
    };
  }

  if (agent.status !== 'ACTIVE') {
    return {
      allowed: false,
      decision: 'deny',
      reason: `Agent status is '${agent.status}'. Only ACTIVE agents can perform actions.`,
      requiresApproval: false,
    };
  }

  // 3. Check if action is a production action
  if (isProductionAction(action)) {
    return {
      allowed: false,
      decision: 'requires_approval',
      reason: 'Production actions require human approval.',
      requiresApproval: true,
    };
  }

  // 4. Check if action requires approval by definition
  if (actionRequiresApproval(action)) {
    // Check if there's an explicit ALLOW with requires_approval bypass
    const explicitAllow = await findPermission({
      agentId: agent.id,
      scope: action,
      resource,
      effect: 'ALLOW',
    });

    if (explicitAllow) {
      return {
        allowed: false,
        decision: 'requires_approval',
        reason: 'This action requires human approval by policy.',
        requiresApproval: true,
        expiresAt: explicitAllow.expiresAt,
      };
    }

    return {
      allowed: false,
      decision: 'requires_approval',
      reason: 'This action requires human approval by policy.',
      requiresApproval: true,
    };
  }

  // 5. Check for explicit DENY
  const explicitDeny = await findPermission({
    agentId: agent.id,
    scope: action,
    resource,
    effect: 'DENY',
  });

  if (explicitDeny) {
    return {
      allowed: false,
      decision: 'deny',
      reason: 'Explicit deny rule found for this action.',
      requiresApproval: false,
    };
  }

  // 6. Check for explicit ALLOW
  const explicitAllow = await findPermission({
    agentId: agent.id,
    scope: action,
    resource,
    effect: 'ALLOW',
  });

  if (explicitAllow) {
    // Check if permission has expired
    if (explicitAllow.expiresAt && new Date() > explicitAllow.expiresAt) {
      return {
        allowed: false,
        decision: 'deny',
        reason: 'Permission for this action has expired.',
        requiresApproval: false,
      };
    }

    return {
      allowed: true,
      decision: 'allow',
      reason: 'Explicit permission found for this action.',
      requiresApproval: false,
      expiresAt: explicitAllow.expiresAt,
    };
  }

  // 7. Deny by default
  return {
    allowed: false,
    decision: 'deny',
    reason: 'No matching permission found. Denied by default.',
    requiresApproval: false,
  };
}

/**
 * Find a permission matching the criteria
 */
async function findPermission(params: {
  agentId: string;
  scope: string;
  resource?: string;
  effect: string;
}) {
  const { agentId, scope, resource, effect } = params;

  // First try exact match with resource
  if (resource) {
    const exact = await db.agentPermission.findFirst({
      where: {
        agentId,
        scope,
        resource,
        effect,
      },
    });
    if (exact) return exact;
  }

  // Then try match without resource (wildcard resource)
  const wildcard = await db.agentPermission.findFirst({
    where: {
      agentId,
      scope,
      resource: null,
      effect,
    },
  });

  return wildcard;
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
