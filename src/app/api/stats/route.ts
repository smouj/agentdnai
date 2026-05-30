import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/stats - Dashboard statistics
 */
export async function GET() {
  try {
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
      db.agentIdentity.count(),
      db.agentIdentity.count({ where: { status: 'ACTIVE' } }),
      db.agentIdentity.count({ where: { status: 'PAUSED' } }),
      db.agentIdentity.count({ where: { status: 'REVOKED' } }),
      db.agentPermission.count(),
      db.agentToken.count({
        where: {
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
      db.authorizationDecision.count({ where: { decision: 'allow' } }),
      db.authorizationDecision.count({ where: { decision: 'deny' } }),
      db.authorizationDecision.count({ where: { decision: 'requires_approval' } }),
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
    console.error('Error getting stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
