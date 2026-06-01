/**
 * Approve an Approval Request
 *
 * POST /api/approvals/[id]/approve - Approve a pending approval request
 *
 * - Requires auth
 * - Checks request exists and is PENDING
 * - Checks user has DEVELOPER+ role in agent's org or is owner
 * - Updates status to APPROVED, sets reviewedBy, reviewedAt
 * - Optionally creates a temporary ALLOW permission for the action (1h expiry)
 * - Records audit: APPROVAL_APPROVED event
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/ownership';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { successResponse, notFound, forbidden, insufficientRole, ApiError } from '@/lib/api-error';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth(request);

    // Find the approval request
    const approvalRequest = await db.approvalRequest.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            agentUri: true,
            ownerUserId: true,
            organizationId: true,
            status: true,
          },
        },
      },
    });

    if (!approvalRequest) {
      throw notFound('Approval request not found');
    }

    // Check that the request is still PENDING
    if (approvalRequest.status !== 'PENDING') {
      throw forbidden(
        `Approval request is already ${approvalRequest.status}`,
        { currentStatus: approvalRequest.status }
      );
    }

    // Check that the request hasn't expired
    if (approvalRequest.expiresAt && new Date() > approvalRequest.expiresAt) {
      // Auto-expire the request
      await db.approvalRequest.update({
        where: { id },
        data: {
          status: 'EXPIRED',
          reviewedBy: session.userId,
          reviewedAt: new Date(),
          reviewNote: 'Auto-expired: request exceeded its expiration time',
        },
      });

      throw forbidden('Approval request has expired', { expiredAt: approvalRequest.expiresAt });
    }

    // Check user has access: DEVELOPER+ role in agent's org, or is owner
    const agent = approvalRequest.agent;
    const isOwner = agent.ownerUserId === session.userId;

    if (!isOwner && agent.organizationId) {
      const membership = await db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: session.userId,
            organizationId: agent.organizationId,
          },
        },
      });

      if (!membership) {
        throw forbidden('You do not have access to approve requests for this agent');
      }

      if (!requireRole(membership, 'DEVELOPER')) {
        throw insufficientRole(
          `Insufficient role to approve requests. Required: DEVELOPER, your role: ${membership.role}`,
          { requiredRole: 'DEVELOPER', currentRole: membership.role }
        );
      }
    } else if (!isOwner) {
      // Not owner and no org membership
      throw forbidden('You do not have access to approve requests for this agent');
    }

    // Create a temporary ALLOW permission (1h expiry) for the approved action
    const temporaryPermission = await db.agentPermission.create({
      data: {
        agentId: agent.id,
        scope: approvalRequest.action,
        resource: approvalRequest.resource || null,
        effect: 'ALLOW',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        createdByUserId: session.userId,
      },
    });

    // Update the approval request
    const updatedRequest = await db.approvalRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: session.userId,
        reviewedAt: new Date(),
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            agentUri: true,
            status: true,
            runtime: true,
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        reviewer: {
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
      eventType: AUDIT_EVENTS.APPROVAL_APPROVED,
      actorType: 'user',
      actorId: session.userId,
      agentId: agent.id,
      action: approvalRequest.action,
      resource: approvalRequest.resource || undefined,
      decision: 'allow',
      metadata: {
        approvalRequestId: id,
        temporaryPermissionId: temporaryPermission.id,
        permissionExpiresAt: temporaryPermission.expiresAt.toISOString(),
        approvedBy: session.userId,
      },
    });

    return successResponse({
      approval: {
        id: updatedRequest.id,
        agentId: updatedRequest.agentId,
        action: updatedRequest.action,
        resource: updatedRequest.resource,
        status: updatedRequest.status,
        requestedBy: updatedRequest.requestedBy,
        reviewedBy: updatedRequest.reviewedBy,
        reviewNote: updatedRequest.reviewNote,
        expiresAt: updatedRequest.expiresAt,
        reviewedAt: updatedRequest.reviewedAt,
        createdAt: updatedRequest.createdAt,
        agent: updatedRequest.agent,
        requester: updatedRequest.requester,
        reviewer: updatedRequest.reviewer,
        temporaryPermission: {
          id: temporaryPermission.id,
          scope: temporaryPermission.scope,
          effect: temporaryPermission.effect,
          expiresAt: temporaryPermission.expiresAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error approving request:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to approve request' } },
      { status: 500 }
    );
  }
}
