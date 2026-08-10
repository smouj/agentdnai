/**
 * POST /api/auth/register - User Registration
 *
 * Creates a new user account with a personal organization.
 * Rate limited: 5 per hour per IP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSession, getClientIp, getClientUserAgent } from '@/lib/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { registerSchema } from '@/lib/schemas';
import { validationError, conflict, rateLimited, successResponse, ApiError } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(
      `register:${clientIp}`,
      RATE_LIMITS.registration.limit,
      RATE_LIMITS.registration.windowMs
    );

    if (!rateLimitResult.allowed) {
      throw rateLimited('Too many registration attempts. Please try again later.', {
        resetAt: new Date(rateLimitResult.resetAt).toISOString(),
      });
    }

    // Parse and validate input
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      throw validationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { email, password, name } = parsed.data;

    // Check email uniqueness
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      throw conflict('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate slug from name/email for personal organization
    const slugBase = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let slug = slugBase || email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Ensure slug uniqueness
    const existingSlug = await db.organization.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Create user with personal organization in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
        },
      });

      // Create personal organization
      const org = await tx.organization.create({
        data: {
          name: `${name}'s Organization`,
          slug,
          description: `Personal organization for ${name}`,
        },
      });

      // Add user as OWNER of their personal org
      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'OWNER',
        },
      });

      return { user, org };
    });

    // Create session
    const ipAddress = getClientIp(request);
    const userAgent = getClientUserAgent(request);
    const { session, token } = await createSession(result.user.id, ipAddress, userAgent);

    // Audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.USER_REGISTERED,
      actorType: 'user',
      actorId: result.user.id,
      organizationId: result.org.id,
      action: 'user.register',
      metadata: { email, name, personalOrgId: result.org.id },
    });

    return successResponse(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          createdAt: result.user.createdAt,
        },
        session: {
          token,
          expiresAt: session.expiresAt,
        },
        organization: {
          id: result.org.id,
          name: result.org.name,
          slug: result.org.slug,
        },
      },
      undefined,
      201
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to register user' } },
      { status: 500 }
    );
  }
}
