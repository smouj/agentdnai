import { requireAuth } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';

/**
 * POST /api/agents/[id]/approve - Approve a pending action for an agent
 *
 * Creates a temporary permission with effect ALLOW that expires in 1 hour
 * for the specific action, and records an audit event.
 *
 * Body: { action: string, resource?: string, approvedByUserId?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id } = await params;

    // Verify the agent exists
    const agent = await db.agentIdentity.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, resource, approvedByUserId } = body;

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'Validation failed', details: { action: 'Action is required and must be a string' } },
        { status: 400 }
      );
    }

    // Resolve the approving user - use provided ID or find/create a default user
    let approverId = approvedByUserId;
    if (!approverId) {
      const defaultUser = await db.user.findUnique({
        where: { email: 'default@agentdnai.io' },
      });
      if (defaultUser) {
        approverId = defaultUser.id;
      } else {
        const newUser = await db.user.create({
          data: {
            email: 'default@agentdnai.io',
            name: 'Default User',
            passwordHash: 'system-no-login',
          },
        });
        approverId = newUser.id;
      }
    } else {
      // Verify the user exists
      const user = await db.user.findUnique({ where: { id: approverId } });
      if (!user) {
        return NextResponse.json(
          { error: 'Approved by user not found' },
          { status: 404 }
        );
      }
    }

    // Create temporary permission that expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const permission = await db.agentPermission.create({
      data: {
        agentId: agent.id,
        scope: action,
        resource: resource || null,
        effect: 'ALLOW',
        expiresAt,
        createdByUserId: approverId,
      },
    });

    // Record audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.PERMISSION_GRANTED,
      actorType: 'user',
      actorId: approverId,
      agentId: agent.id,
      resource: resource || undefined,
      action,
      decision: 'allow',
      metadata: {
        approval: true,
        permissionId: permission.id,
        expiresAt: expiresAt.toISOString(),
        approvedBy: approverId,
      },
    });

    return NextResponse.json(
      {
        id: permission.id,
        agentId: permission.agentId,
        scope: permission.scope,
        resource: permission.resource,
        effect: permission.effect,
        expiresAt: permission.expiresAt,
        createdByUserId: permission.createdByUserId,
        createdAt: permission.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error approving action:', error);
    return NextResponse.json(
      { error: 'Failed to approve action' },
      { status: 500 }
    );
  }
}
