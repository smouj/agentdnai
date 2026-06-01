import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';

/**
 * POST /api/agents/[id]/revoke - Revoke an agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const agent = await db.agentIdentity.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.status === 'REVOKED') {
      return NextResponse.json(
        { error: 'Agent is already revoked' },
        { status: 400 }
      );
    }

    // Update agent status
    const updated = await db.agentIdentity.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    // Revoke all active tokens
    await db.agentToken.updateMany({
      where: {
        agentId: id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // Parse body for optional reason
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // No body or invalid JSON, that's fine
    }

    // Create audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.AGENT_REVOKED,
      actorType: 'user',
      agentId: id,
      action: 'agent.revoke',
      metadata: { previousStatus: agent.status, reason },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      revokedAt: updated.revokedAt,
    });
  } catch (error) {
    console.error('Error revoking agent:', error);
    return NextResponse.json(
      { error: 'Failed to revoke agent' },
      { status: 500 }
    );
  }
}
