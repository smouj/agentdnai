import { accessibleAgentWhere, getAccessibleAgentIds, requireAuth } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/stats - Dashboard statistics
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth(_request);
    const agentWhere = accessibleAgentWhere(session.userId);
    const agentIds = await getAccessibleAgentIds(session.userId);
    const [
      totalAgents,
      activeAgents,
      pausedAgents,
      revokedAgents,
      totalPermissions,
      activeTokens,
      recentAllow,
      recentDeny,
      recentRequiresApproval,
    ] = await Promise.all([
      db.agentIdentity.count({ where: agentWhere }),
      db.agentIdentity.count({ where: { AND: [agentWhere, { status: 'ACTIVE' }] } }),
      db.agentIdentity.count({ where: { AND: [agentWhere, { status: 'PAUSED' }] } }),
      db.agentIdentity.count({ where: { AND: [agentWhere, { status: 'REVOKED' }] } }),
      db.agentPermission.count({ where: { agentId: { in: agentIds } } }),
      db.agentToken.count({
        where: {
          agentId: { in: agentIds },
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
      db.authorizationDecision.count({ where: { agentId: { in: agentIds }, decision: 'allow' } }),
      db.authorizationDecision.count({ where: { agentId: { in: agentIds }, decision: 'deny' } }),
      db.authorizationDecision.count({ where: { agentId: { in: agentIds }, decision: 'requires_approval' } }),
    ]);

    return NextResponse.json({
      totalAgents,
      activeAgents,
      pausedAgents,
      revokedAgents,
      totalPermissions,
      activeTokens,
      recentAllowCount: recentAllow,
      recentDenyCount: recentDeny,
      recentRequiresApprovalCount: recentRequiresApproval,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error getting stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
