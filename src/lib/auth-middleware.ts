/**
 * AgentDNAI Auth Middleware Helper
 *
 * Validates authentication for API route handlers.
 * Returns the session if valid, or throws an ApiError if not.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';

/**
 * Validate authentication for an API request.
 * Returns the session if valid, or throws an ApiError.
 *
 * Usage in route handlers:
 *   const session = await authenticateRequest(request);
 *   if (!session) return authSession; // This line won't be reached, but helps with type narrowing
 */
export async function authenticateRequest(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    return session;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw error;
  }
}
