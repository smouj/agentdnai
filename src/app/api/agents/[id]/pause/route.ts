import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';

/**
 * POST /api/agents/[id]/pause - Pause an agent
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

    if (agent.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Cannot pause agent with status '${agent.status}'. Only ACTIVE agents can be paused.` },
        { status: 400 }
      );
    }

    const updated = await db.agentIdentity.update({
      where: { id },
      data: { status: 'PAUSED' },
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
      eventType: AUDIT_EVENTS.AGENT_PAUSED,
      actorType: 'user',
      agentId: id,
      action: 'agent.pause',
      metadata: { reason },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Error pausing agent:', error);
    return NextResponse.json(
      { error: 'Failed to pause agent' },
      { status: 500 }
    );
  }
}
