/**
 * AgentDNAI Ownership & Authorization Middleware
 *
 * Critical security functions for OWASP BOLA (Broken Object Level Authorization) protection.
 * Ensures users can only access resources they own or have organization access to.
 *
 * Role hierarchy: OWNER > ADMIN > SECURITY_MANAGER > DEVELOPER > VIEWER
 */

import { db } from '@/lib/db';
import { validateSession, extractSessionToken } from '@/lib/auth';
import { unauthorized, forbidden, notFound, insufficientRole } from '@/lib/api-error';

// ─── Role Hierarchy ───────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 1,
  DEVELOPER: 2,
  SECURITY_MANAGER: 3,
  ADMIN: 4,
  OWNER: 5,
};

/**
 * Check if a role meets or exceeds the minimum required role
 */
export function requireRole(member: { role: string }, minRole: string): boolean {
  const memberLevel = ROLE_HIERARCHY[member.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;
  return memberLevel >= requiredLevel;
}

/**
 * Get the role level number for comparison
 */
export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

/**
 * Validate that a request has a valid session and return the session.
 * Throws ApiError if no valid session is found.
 */
export async function requireAuth(request: Request) {
  const token = extractSessionToken(request);

  if (!token) {
    throw unauthorized('Authentication required. Provide a valid session token via Authorization header or session cookie.');
  }

  const session = await validateSession(token);

  if (!session) {
    throw unauthorized('Invalid or expired session token.');
  }

  return session;
}

/**
 * Check if a user can access a specific agent.
 * A user can access an agent if:
 * 1. They are the owner (ownerUserId matches)
 * 2. They are a member of the agent's organization
 */
export function canAccessAgent(userId: string, agent: { ownerUserId: string; organizationId: string | null }): boolean {
  // Direct ownership
  if (agent.ownerUserId === userId) {
    return true;
  }

  // Organization membership will be checked separately (requires async DB call)
  return false;
}

/**
 * Require that the current user has access to a specific agent.
 * Checks direct ownership and organization membership.
 * Throws ApiError if access is denied.
 */
export async function requireAgentAccess(
  session: { userId: string },
  agentId: string
) {
  const agent = await db.agentIdentity.findUnique({
    where: { id: agentId },
    include: {
      organization: {
        include: {
          members: {
            where: { userId: session.userId },
          },
        },
      },
    },
  });

  if (!agent) {
    throw notFound('Agent not found');
  }

  // Check direct ownership
  if (agent.ownerUserId === session.userId) {
    return agent;
  }

  // Check organization membership
  if (agent.organizationId && agent.organization?.members.length) {
    return agent;
  }

  throw forbidden('You do not have access to this agent');
}

/**
 * Require that the current user is a member of the specified organization
 * with at least the minimum role.
 * Throws ApiError if access is denied.
 */
export async function requireOrgAccess(
  session: { userId: string },
  orgId: string,
  minRole: string = 'VIEWER'
) {
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw notFound('Organization not found');
  }

  if (!org.isActive) {
    throw forbidden('Organization is inactive');
  }

  const membership = await db.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId: orgId,
      },
    },
  });

  if (!membership) {
    throw forbidden('You are not a member of this organization');
  }

  if (!requireRole(membership, minRole)) {
    throw insufficientRole(
      `Insufficient role. Required: ${minRole}, your role: ${membership.role}`,
      { requiredRole: minRole, currentRole: membership.role }
    );
  }

  return membership;
}

/**
 * Get all organization IDs that a user is a member of
 */
export async function getUserOrgIds(userId: string): Promise<string[]> {
  const memberships = await db.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  return memberships.map((m) => m.organizationId);
}

/**
 * Check if a user can manage a specific agent (non-read operations).
 * Requires OWNER, ADMIN, or DEVELOPER role in the organization, or direct ownership.
 */
export async function canManageAgent(
  session: { userId: string },
  agentId: string
): Promise<boolean> {
  try {
    const agent = await db.agentIdentity.findUnique({
      where: { id: agentId },
    });

    if (!agent) return false;

    // Direct ownership
    if (agent.ownerUserId === session.userId) return true;

    // Organization membership with sufficient role
    if (agent.organizationId) {
      const membership = await db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: session.userId,
            organizationId: agent.organizationId,
          },
        },
      });

      if (membership && requireRole(membership, 'DEVELOPER')) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
