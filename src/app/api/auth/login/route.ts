/**
 * POST /api/auth/login - User Login
 *
 * Authenticates a user with email and password.
 * Rate limited: 10 per 15 min per IP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createSession, getClientIp, getClientUserAgent } from '@/lib/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { loginSchema } from '@/lib/schemas';
import { validationError, invalidCredentials, rateLimited, successResponse, ApiError } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(
      `login:${clientIp}`,
      RATE_LIMITS.login.limit,
      RATE_LIMITS.login.windowMs
    );

    if (!rateLimitResult.allowed) {
      throw rateLimited('Too many login attempts. Please try again later.', {
        resetAt: new Date(rateLimitResult.resetAt).toISOString(),
      });
    }

    // Parse and validate input
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      throw validationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { email, password } = parsed.data;

    // Find user by email
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      throw invalidCredentials();
    }

    // Verify password
    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      // Audit failed login attempt
      await createAuditEvent({
        eventType: AUDIT_EVENTS.USER_LOGIN,
        actorType: 'user',
        actorId: user.id,
        action: 'user.login.failed',
        metadata: { email, reason: 'invalid_password' },
      });

      throw invalidCredentials();
    }

    // Check if user is active
    if (!user.isActive) {
      throw invalidCredentials('Account is deactivated');
    }

    // Create session
    const ipAddress = getClientIp(request);
    const userAgent = getClientUserAgent(request);
    const { session, token } = await createSession(user.id, ipAddress, userAgent);

    // Update lastLoginAt
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit successful login
    await createAuditEvent({
      eventType: AUDIT_EVENTS.USER_LOGIN,
      actorType: 'user',
      actorId: user.id,
      action: 'user.login.success',
      metadata: { email, ipAddress },
    });

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      session: {
        token,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error logging in:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to login' } },
      { status: 500 }
    );
  }
}
