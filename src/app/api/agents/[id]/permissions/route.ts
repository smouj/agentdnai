import { requireAgentAccess, requireAgentManagement, requireAuth } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { grantPermissionSchema, deletePermissionSchema } from '@/lib/schemas';

/**
 * POST /api/agents/[id]/permissions - Grant permission to agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    const { id } = await params;
    await requireAgentManagement(session, id);

    const body = await request.json();
    const parsed = grantPermissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { scope, resource, effect, expiresAt } = parsed.data;

    // Check if permission already exists
    const existing = await db.agentPermission.findFirst({
      where: {
        agentId: id,
        scope,
        resource: resource || null,
        effect,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Permission already exists for this agent', permission: existing },
        { status: 400 }
      );
    }

    // Create permission
    const permission = await db.agentPermission.create({
      data: {
        agentId: id,
        scope,
        resource: resource || null,
        effect,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdByUserId: session.userId,
      },
    });

    // Create audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.PERMISSION_GRANTED,
      actorType: 'user',
      actorId: session.userId,
      agentId: id,
      action: 'permission.grant',
      resource: scope,
      metadata: { scope, resource, effect, expiresAt },
    });

    return NextResponse.json({ permission }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error granting permission:', error);
    return NextResponse.json(
      { error: 'Failed to grant permission' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/[id]/permissions - List agent permissions
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(_request);
    const { id } = await params;
    await requireAgentAccess(session, id);

    const agent = await db.agentIdentity.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ permissions: agent.permissions });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error listing permissions:', error);
    return NextResponse.json(
      { error: 'Failed to list permissions' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[id]/permissions - Remove permission
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    const { id } = await params;
    await requireAgentManagement(session, id);

    const body = await request.json();
    const parsed = deletePermissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { permissionId } = parsed.data;

    // Find the permission
    const permission = await db.agentPermission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    if (permission.agentId !== id) {
      return NextResponse.json(
        { error: 'Permission does not belong to this agent' },
        { status: 400 }
      );
    }

    // Delete the permission
    await db.agentPermission.delete({
      where: { id: permissionId },
    });

    // Create audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.PERMISSION_REVOKED,
      actorType: 'user',
      actorId: session.userId,
      agentId: id,
      action: 'permission.revoke',
      resource: permission.scope,
      metadata: {
        permissionId,
        scope: permission.scope,
        resource: permission.resource,
        effect: permission.effect,
      },
    });

    return NextResponse.json({ deleted: true, permissionId });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error removing permission:', error);
    return NextResponse.json(
      { error: 'Failed to remove permission' },
      { status: 500 }
    );
  }
}
