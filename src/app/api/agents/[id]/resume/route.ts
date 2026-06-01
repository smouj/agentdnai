import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';

/**
 * POST /api/agents/[id]/resume - Resume a paused agent
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

    if (agent.status !== 'PAUSED') {
      return NextResponse.json(
        { error: `Cannot resume agent with status '${agent.status}'. Only PAUSED agents can be resumed.` },
        { status: 400 }
      );
    }

    const updated = await db.agentIdentity.update({
      where: { id },
      data: { status: 'ACTIVE' },
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
      eventType: AUDIT_EVENTS.AGENT_RESUMED,
      actorType: 'user',
      agentId: id,
      action: 'agent.resume',
      metadata: { reason },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Error resuming agent:', error);
    return NextResponse.json(
      { error: 'Failed to resume agent' },
      { status: 500 }
    );
  }
}
