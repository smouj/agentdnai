import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/agents/[id]/health - Get agent health status
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const agent = await db.agentIdentity.findUnique({
      where: { id },
      include: {
        permissions: true,
        tokens: true,
        auditEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Calculate uptime in days since creation
    const uptime = Math.floor(
      (Date.now() - new Date(agent.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Key rotation check - warning if > 90 days since creation or last update
    const daysSinceRotation = Math.floor(
      (Date.now() - new Date(agent.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const keyRotationStatus = daysSinceRotation > 90 ? 'warning' : 'ok';

    // Token health check
    const now = new Date();
    const activeTokens = agent.tokens.filter(
      (t) => !t.revokedAt && new Date(t.expiresAt) > now
    ).length;
    const expiredUnrevoked = agent.tokens.filter(
      (t) => !t.revokedAt && new Date(t.expiresAt) <= now
    ).length;
    const tokenHealthStatus =
      expiredUnrevoked > 0 ? 'critical' : activeTokens === 0 ? 'warning' : 'ok';

    // Permissions check - high-risk count
    const highRiskScopes = [
      'server.command.run',
      'server.deploy.production',
      'filesystem.delete',
      'filesystem.execute',
      'secrets.write',
      'secrets.rotate',
      'database.migrate',
    ];
    const highRiskCount = agent.permissions.filter(
      (p) => highRiskScopes.includes(p.scope) && p.effect === 'ALLOW'
    ).length;
    const permissionsStatus = highRiskCount > 15 ? 'warning' : 'ok';

    // Audit trail check - count recent events (last 24h)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentEvents = agent.auditEvents.filter(
      (e) => new Date(e.createdAt) >= oneDayAgo
    ).length;

    // Determine overall health
    const healthy =
      keyRotationStatus === 'ok' &&
      tokenHealthStatus !== 'critical' &&
      permissionsStatus === 'ok' &&
      agent.status === 'ACTIVE';

    return NextResponse.json({
      agentId: agent.id,
      status: agent.status,
      healthy,
      checks: {
        keyRotation: {
          status: keyRotationStatus,
          lastRotated: agent.updatedAt,
          daysSinceRotation,
        },
        tokenHealth: {
          status: tokenHealthStatus,
          activeTokens,
          expiredUnrevoked,
        },
        permissions: {
          status: permissionsStatus,
          totalPermissions: agent.permissions.length,
          highRiskCount,
        },
        auditTrail: {
          status: 'ok' as const,
          recentEvents,
        },
      },
      uptime,
    });
  } catch (error) {
    console.error('Error checking agent health:', error);
    return NextResponse.json(
      { error: 'Failed to check agent health' },
      { status: 500 }
    );
  }
}
