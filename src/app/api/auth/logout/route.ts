/**
 * POST /api/auth/logout - User Logout
 *
 * Deletes the current session.
 */

import { NextResponse } from 'next/server';
import { deleteSession, extractSessionToken } from '@/lib/auth';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { requireAuth } from '@/lib/ownership';
import { successResponse, ApiError } from '@/lib/api-error';

export async function POST(request: Request) {
  try {
    // Validate session - but don't throw if invalid (logout should be idempotent)
    const token = extractSessionToken(request);

    if (token) {
      // Try to get session info for audit before deleting
      try {
        const session = await requireAuth(request);
        // Audit logout
        await createAuditEvent({
          eventType: AUDIT_EVENTS.USER_LOGOUT,
          actorType: 'user',
          actorId: session.userId,
          action: 'user.logout',
        });
      } catch {
        // Session already invalid, that's fine for logout
      }

      // Delete the session regardless
      await deleteSession(token);
    }

    return successResponse({ loggedOut: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error logging out:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to logout' } },
      { status: 500 }
    );
  }
}
