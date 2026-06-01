/**
 * Approval Queue API
 *
 * GET /api/approvals - List pending approval requests
 * POST /api/approvals - Create a new approval request
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, getUserOrgIds } from '@/lib/ownership';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { createApprovalRequestSchema } from '@/lib/schemas';
import { successResponse, validationError, notFound, ApiError } from '@/lib/api-error';

/**
 * GET /api/approvals - List approval requests
 *
 * Query params:
 *   ?status=PENDING - Filter by status (default: PENDING)
 *   ?agentId=xxx    - Filter by agent ID
 *
 * Only shows requests for agents the user owns or has org access to.
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuth(request);

    const searchParams = new URL(request.url).searchParams;
    const status = searchParams.get('status')?.trim().toUpperCase() || 'PENDING';
    const agentId = searchParams.get('agentId')?.trim() || undefined;

    // Get user's org IDs for access control
    const userOrgIds = await getUserOrgIds(session.userId);

    // Build where clause
    const where: Record<string, unknown> = {
      status,
    };

    if (agentId) {
      where.agentId = agentId;
    }

    // If no specific agentId filter, limit to agents the user can access
    if (!agentId) {
      where.OR = [
        { agent: { ownerUserId: session.userId } },
        ...(userOrgIds.length > 0
          ? [{ agent: { organizationId: { in: userOrgIds } } }]
          : []),
      ];

      // If no orgs and not filtering by specific fields, just filter by ownership
      if (userOrgIds.length === 0) {
        delete where.OR;
        where.agent = { ownerUserId: session.userId };
      }
    } else {
      // When filtering by specific agentId, verify access
      const agent = await db.agentIdentity.findUnique({
        where: { id: agentId },
        select: { ownerUserId: true, organizationId: true },
      });

      if (!agent) {
        throw notFound('Agent not found');
      }

      const isOwner = agent.ownerUserId === session.userId;
      const isOrgMember = agent.organizationId && userOrgIds.includes(agent.organizationId);

      if (!isOwner && !isOrgMember) {
        // Return empty list instead of error for better UX
        return successResponse({ approvals: [], total: 0 });
      }
    }

    // Need to handle the combined where with OR at the top level
    // Prisma doesn't allow both `status` and `OR` at the same level easily
    // So we build a proper filter
    const accessFilter =
      userOrgIds.length > 0
        ? {
            OR: [
              { agent: { ownerUserId: session.userId } },
              { agent: { organizationId: { in: userOrgIds } } },
            ],
          }
        : { agent: { ownerUserId: session.userId } };

    const approvals = await db.approvalRequest.findMany({
      where: {
        status,
        ...(agentId ? { agentId } : accessFilter),
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
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({
      approvals: approvals.map((a) => ({
        id: a.id,
        agentId: a.agentId,
        action: a.action,
        resource: a.resource,
        status: a.status,
        requestedBy: a.requestedBy,
        reviewedBy: a.reviewedBy,
        reviewNote: a.reviewNote,
        expiresAt: a.expiresAt,
        reviewedAt: a.reviewedAt,
        createdAt: a.createdAt,
        agent: a.agent,
        requester: a.requester,
        reviewer: a.reviewer,
      })),
      total: approvals.length,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error listing approvals:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list approval requests' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/approvals - Create an approval request
 *
 * Body: { agentId, action, resource?, expiresAt? }
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuth(request);

    const body = await request.json();
    const parsed = createApprovalRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw validationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { agentId, action, resource, expiresAt } = parsed.data;

    // Verify agent exists
    const agent = await db.agentIdentity.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        ownerUserId: true,
        organizationId: true,
        status: true,
      },
    });

    if (!agent) {
      throw notFound('Agent not found');
    }

    // Verify user has access to this agent
    const userOrgIds = await getUserOrgIds(session.userId);
    const isOwner = agent.ownerUserId === session.userId;
    const isOrgMember = agent.organizationId && userOrgIds.includes(agent.organizationId);

    if (!isOwner && !isOrgMember) {
      throw notFound('Agent not found');
    }

    // Create the approval request
    const approvalRequest = await db.approvalRequest.create({
      data: {
        agentId,
        action,
        resource: resource || null,
        status: 'PENDING',
        requestedBy: session.userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
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
      },
    });

    // Audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.APPROVAL_REQUESTED,
      actorType: 'user',
      actorId: session.userId,
      agentId,
      action,
      resource: resource || undefined,
      metadata: {
        approvalRequestId: approvalRequest.id,
        agentName: agent.name,
        expiresAt: expiresAt || null,
      },
    });

    return successResponse(
      {
        approval: {
          id: approvalRequest.id,
          agentId: approvalRequest.agentId,
          action: approvalRequest.action,
          resource: approvalRequest.resource,
          status: approvalRequest.status,
          requestedBy: approvalRequest.requestedBy,
          expiresAt: approvalRequest.expiresAt,
          createdAt: approvalRequest.createdAt,
          agent: approvalRequest.agent,
        },
      },
      undefined,
      201
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error creating approval request:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create approval request' } },
      { status: 500 }
    );
  }
}
