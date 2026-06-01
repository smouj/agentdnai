/**
 * Reject an Approval Request
 *
 * POST /api/approvals/[id]/reject - Reject a pending approval request
 *
 * - Requires auth
 * - Checks request exists and is PENDING
 * - Checks user has DEVELOPER+ role in agent's org or is owner
 * - Updates status to REJECTED, sets reviewedBy, reviewedAt, reviewNote
 * - Records audit: APPROVAL_REJECTED event
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/ownership';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { rejectApprovalSchema } from '@/lib/schemas';
import { successResponse, notFound, forbidden, insufficientRole, validationError, ApiError } from '@/lib/api-error';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth(request);

    // Parse and validate body
    const body = await request.json();
    const parsed = rejectApprovalSchema.safeParse(body);

    if (!parsed.success) {
      throw validationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { note } = parsed.data;

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
        throw forbidden('You do not have access to reject requests for this agent');
      }

      if (!requireRole(membership, 'DEVELOPER')) {
        throw insufficientRole(
          `Insufficient role to reject requests. Required: DEVELOPER, your role: ${membership.role}`,
          { requiredRole: 'DEVELOPER', currentRole: membership.role }
        );
      }
    } else if (!isOwner) {
      // Not owner and no org membership
      throw forbidden('You do not have access to reject requests for this agent');
    }

    // Update the approval request
    const updatedRequest = await db.approvalRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: session.userId,
        reviewedAt: new Date(),
        reviewNote: note || null,
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
      eventType: AUDIT_EVENTS.APPROVAL_REJECTED,
      actorType: 'user',
      actorId: session.userId,
      agentId: agent.id,
      action: approvalRequest.action,
      resource: approvalRequest.resource || undefined,
      decision: 'deny',
      metadata: {
        approvalRequestId: id,
        reviewNote: note || null,
        rejectedBy: session.userId,
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
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error rejecting request:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to reject request' } },
      { status: 500 }
    );
  }
}
