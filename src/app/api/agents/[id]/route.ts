import { requireAuth } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditEvent } from '@/lib/audit';

/**
 * GET /api/agents/[id] - Get agent details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(_request);
    const { id } = await params;

    const agent = await db.agentIdentity.findUnique({
      where: { id },
      include: {
        permissions: true,
        tokens: {
          orderBy: { createdAt: 'desc' },
        },
        auditEvents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(agent);
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error getting agent:', error);
    return NextResponse.json(
      { error: 'Failed to get agent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[id] - Delete an agent and all related data
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(_request);
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

    // Delete all related records first
    await db.agentPermission.deleteMany({ where: { agentId: id } });
    await db.agentToken.deleteMany({ where: { agentId: id } });
    await db.authorizationDecision.deleteMany({ where: { agentId: id } });
    await db.auditEvent.deleteMany({ where: { agentId: id } });

    // Delete the agent itself
    await db.agentIdentity.delete({ where: { id } });

    // Create audit event for the deletion (agentId is null since agent is deleted)
    await createAuditEvent({
      eventType: 'AGENT_DELETED',
      actorType: 'user',
      agentId: undefined,
      action: 'agent.delete',
      metadata: { deletedAgentId: id, deletedAgentName: agent.name, deletedAgentUri: agent.agentUri },
    });

    return NextResponse.json({
      success: true,
      message: `Agent ${agent.name} and all related data deleted successfully`,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
