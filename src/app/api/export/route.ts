import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/export - Export all platform data as JSON
 *
 * Returns a downloadable JSON file containing:
 *   - All agents (with permissions and tokens)
 *   - All audit events
 *   - All authorization decisions
 *   - Stats summary
 */
export async function GET() {
  try {
    // Fetch all agents with their permissions and tokens
    const agents = await db.agentIdentity.findMany({
      include: {
        permissions: {
          orderBy: { createdAt: 'asc' },
        },
        tokens: {
          orderBy: { createdAt: 'desc' },
        },
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch all audit events
    const auditEvents = await db.auditEvent.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Fetch all authorization decisions
    const authorizationDecisions = await db.authorizationDecision.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Compute stats summary
    const now = new Date();
    const stats = {
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.status === 'ACTIVE').length,
      pausedAgents: agents.filter((a) => a.status === 'PAUSED').length,
      revokedAgents: agents.filter((a) => a.status === 'REVOKED').length,
      blockedAgents: agents.filter((a) => a.status === 'BLOCKED').length,
      totalPermissions: agents.reduce((sum, a) => sum + a.permissions.length, 0),
      activeTokens: agents.reduce(
        (sum, a) =>
          sum +
          a.tokens.filter(
            (t) => t.revokedAt === null && new Date(t.expiresAt) > now
          ).length,
        0
      ),
      expiredUnrevokedTokens: agents.reduce(
        (sum, a) =>
          sum +
          a.tokens.filter(
            (t) => t.revokedAt === null && new Date(t.expiresAt) <= now
          ).length,
        0
      ),
      totalAuditEvents: auditEvents.length,
      totalAuthorizationDecisions: authorizationDecisions.length,
    };

    // Build export payload
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      agents: agents.map((agent) => ({
        id: agent.id,
        agentUri: agent.agentUri,
        name: agent.name,
        description: agent.description,
        runtime: agent.runtime,
        publicKey: agent.publicKey,
        status: agent.status,
        ownerUserId: agent.ownerUserId,
        owner: agent.owner,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        lastSeenAt: agent.lastSeenAt,
        revokedAt: agent.revokedAt,
        permissions: agent.permissions.map((p) => ({
          id: p.id,
          agentId: p.agentId,
          scope: p.scope,
          resource: p.resource,
          effect: p.effect,
          expiresAt: p.expiresAt,
          createdByUserId: p.createdByUserId,
          createdAt: p.createdAt,
        })),
        tokens: agent.tokens.map((t) => ({
          id: t.id,
          agentId: t.agentId,
          tokenHash: t.tokenHash,
          scopes: t.scopes,
          expiresAt: t.expiresAt,
          revokedAt: t.revokedAt,
          createdAt: t.createdAt,
          lastUsedAt: t.lastUsedAt,
        })),
      })),
      auditEvents: auditEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        actorType: e.actorType,
        actorId: e.actorId,
        agentId: e.agentId,
        resource: e.resource,
        action: e.action,
        decision: e.decision,
        metadata: e.metadata,
        previousHash: e.previousHash,
        eventHash: e.eventHash,
        createdAt: e.createdAt,
      })),
      authorizationDecisions: authorizationDecisions.map((d) => ({
        id: d.id,
        agentId: d.agentId,
        action: d.action,
        resource: d.resource,
        decision: d.decision,
        reason: d.reason,
        requestHash: d.requestHash,
        createdAt: d.createdAt,
      })),
      stats,
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="agentdnai-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
