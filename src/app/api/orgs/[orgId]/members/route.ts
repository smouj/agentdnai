/**
 * Organization Members API
 *
 * GET    /api/orgs/[orgId]/members - List members (require membership)
 * POST   /api/orgs/[orgId]/members - Add member (require ADMIN+)
 * DELETE /api/orgs/[orgId]/members - Remove member (require ADMIN+, cannot remove OWNER)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireOrgAccess } from '@/lib/ownership';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { addMemberSchema, removeMemberSchema } from '@/lib/schemas';
import { validationError, notFound, conflict, forbidden, successResponse, ApiError } from '@/lib/api-error';

/**
 * GET /api/orgs/[orgId]/members - List members
 * Requires any membership level (VIEWER+)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await requireAuth(request);
    await requireOrgAccess(session, orgId, 'VIEWER');

    const members = await db.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const memberList = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      invitedBy: m.invitedBy,
      user: m.user,
    }));

    return successResponse({ members: memberList });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error listing members:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list members' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgId]/members - Add a member
 * Requires ADMIN+ role
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await requireAuth(request);
    await requireOrgAccess(session, orgId, 'ADMIN');

    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);

    if (!parsed.success) {
      throw validationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { email, role } = parsed.data;

    // Find the user to add
    const targetUser = await db.user.findUnique({ where: { email } });

    if (!targetUser) {
      throw notFound(`No user found with email: ${email}`);
    }

    if (!targetUser.isActive) {
      throw forbidden('Cannot add an inactive user to the organization');
    }

    // Check if already a member
    const existingMembership = await db.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUser.id,
          organizationId: orgId,
        },
      },
    });

    if (existingMembership) {
      throw conflict('User is already a member of this organization');
    }

    // Add member
    const member = await db.organizationMember.create({
      data: {
        userId: targetUser.id,
        organizationId: orgId,
        role,
        invitedBy: session.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.MEMBER_ADDED,
      actorType: 'user',
      actorId: session.userId,
      organizationId: orgId,
      action: 'org.member.add',
      metadata: { addedUserId: targetUser.id, addedUserEmail: email, role },
    });

    return successResponse(
      {
        member: {
          id: member.id,
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
          invitedBy: member.invitedBy,
          user: member.user,
        },
      },
      undefined,
      201
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to add member' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orgs/[orgId]/members - Remove a member
 * Requires ADMIN+ role, cannot remove OWNER members
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await requireAuth(request);
    await requireOrgAccess(session, orgId, 'ADMIN');

    const body = await request.json();
    const parsed = removeMemberSchema.safeParse(body);

    if (!parsed.success) {
      throw validationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { userId } = parsed.data;

    // Find the membership
    const membership = await db.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });

    if (!membership) {
      throw notFound('User is not a member of this organization');
    }

    // Cannot remove OWNER members
    if (membership.role === 'OWNER') {
      throw forbidden('Cannot remove an OWNER from the organization. Transfer ownership first.');
    }

    // Don't let admins remove themselves (they should leave via a different flow)
    // Actually, let's allow it for flexibility

    // Remove member
    await db.organizationMember.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });

    // Audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.MEMBER_REMOVED,
      actorType: 'user',
      actorId: session.userId,
      organizationId: orgId,
      action: 'org.member.remove',
      metadata: { removedUserId: userId, previousRole: membership.role },
    });

    return successResponse({
      removed: true,
      message: 'Member removed from organization',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' } },
      { status: 500 }
    );
  }
}
