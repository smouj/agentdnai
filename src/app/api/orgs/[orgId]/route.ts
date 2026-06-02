/**
 * Organization Detail API
 *
 * GET    /api/orgs/[orgId] - Get org details
 * PATCH  /api/orgs/[orgId] - Update org (ADMIN+)
 * DELETE /api/orgs/[orgId] - Delete org (OWNER only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireOrgAccess } from '@/lib/ownership';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { updateOrgSchema } from '@/lib/schemas';
import { validationError, successResponse, ApiError } from '@/lib/api-error';

/**
 * GET /api/orgs/[orgId] - Get organization details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await requireAuth(request);
    const membership = await requireOrgAccess(session, orgId, 'VIEWER');

    const org = await db.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            members: true,
            agents: true,
            webhooks: true,
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Organization not found' } },
        { status: 404 }
      );
    }

    return successResponse({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        isActive: org.isActive,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        _count: org._count,
      },
      yourRole: membership.role,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error getting organization:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get organization' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orgs/[orgId] - Update organization
 * Requires ADMIN+ role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await requireAuth(request);
    await requireOrgAccess(session, orgId, 'ADMIN');

    const body = await request.json();
    const parsed = updateOrgSchema.safeParse(body);

    if (!parsed.success) {
      throw validationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { name, description } = parsed.data;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    // Update slug if name changed
    if (name) {
      const slugBase = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      let slug = slugBase || `org-${Date.now().toString(36)}`;
      const existingSlug = await db.organization.findFirst({
        where: { slug, id: { not: orgId } },
      });
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
      updateData.slug = slug;
    }

    const org = await db.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    // Audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.ORG_UPDATED,
      actorType: 'user',
      actorId: session.userId,
      organizationId: orgId,
      action: 'org.update',
      metadata: { updates: updateData },
    });

    return successResponse({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        isActive: org.isActive,
        updatedAt: org.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update organization' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orgs/[orgId] - Delete organization
 * Requires OWNER role
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await requireAuth(request);
    await requireOrgAccess(session, orgId, 'OWNER');

    const org = await db.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Organization not found' } },
        { status: 404 }
      );
    }

    // Delete organization (cascade will handle members, agents, webhooks)
    await db.organization.delete({
      where: { id: orgId },
    });

    // Audit event (organizationId is null since org is deleted)
    await createAuditEvent({
      eventType: AUDIT_EVENTS.ORG_DELETED,
      actorType: 'user',
      actorId: session.userId,
      action: 'org.delete',
      metadata: { deletedOrgId: orgId, deletedOrgName: org.name, deletedOrgSlug: org.slug },
    });

    return successResponse({
      deleted: true,
      message: `Organization "${org.name}" deleted successfully`,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete organization' } },
      { status: 500 }
    );
  }
}
