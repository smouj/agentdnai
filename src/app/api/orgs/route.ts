/**
 * Organizations API
 *
 * GET /api/orgs - List user's organizations
 * POST /api/orgs - Create a new organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/ownership';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { createOrgSchema } from '@/lib/schemas';
import { validationError, successResponse, ApiError } from '@/lib/api-error';

/**
 * GET /api/orgs - List organizations the current user belongs to
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuth(request);

    const memberships = await db.organizationMember.findMany({
      where: { userId: session.userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                members: true,
                agents: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const organizations = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      description: m.organization.description,
      isActive: m.organization.isActive,
      role: m.role,
      joinedAt: m.joinedAt,
      createdAt: m.organization.createdAt,
      updatedAt: m.organization.updatedAt,
      _count: m.organization._count,
    }));

    return successResponse({ organizations });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error listing organizations:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list organizations' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs - Create a new organization
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    // Parse and validate input
    const body = await request.json();
    const parsed = createOrgSchema.safeParse(body);

    if (!parsed.success) {
      throw validationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { name, description } = parsed.data;

    // Generate slug from name
    const slugBase = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let slug = slugBase || `org-${Date.now().toString(36)}`;

    // Ensure slug uniqueness
    const existingSlug = await db.organization.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Create organization with user as OWNER
    const result = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug,
          description: description || null,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId: session.userId,
          organizationId: org.id,
          role: 'OWNER',
        },
      });

      return org;
    });

    // Audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.ORG_CREATED,
      actorType: 'user',
      actorId: session.userId,
      organizationId: result.id,
      action: 'org.create',
      metadata: { name, slug },
    });

    return successResponse(
      {
        organization: {
          id: result.id,
          name: result.name,
          slug: result.slug,
          description: result.description,
          isActive: result.isActive,
          createdAt: result.createdAt,
        },
        role: 'OWNER',
      },
      undefined,
      201
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create organization' } },
      { status: 500 }
    );
  }
}
