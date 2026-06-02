/**
 * AgentDNAI Core Authentication Library
 *
 * Handles password hashing, session management, and token generation.
 * Uses HMAC-SHA256 for password hashing (production should use bcrypt/scrypt/argon2).
 */

import { db } from '@/lib/db';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { generateSessionToken } from '@/lib/crypto';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SALT_LENGTH = 32;

function getPepper(): string {
  const pepper = process.env.AUTH_PEPPER || (process.env.NODE_ENV === 'production' ? '' : 'agentdnai-dev-pepper-not-for-production');
  if (!pepper) {
    throw new Error('AUTH_PEPPER environment variable must be set in production');
  }
  return pepper;
}

/**
 * Hash a password using HMAC-SHA256 with salt and pepper
 * Format: hmacsha256:salt:hash (all hex encoded)
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = createHmac('sha256', getPepper())
    .update(salt)
    .update(password)
    .digest();
  return `hmacsha256:${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verify a password against its hash using timing-safe comparison
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (storedHash.startsWith('hmacsha256:')) {
      const parts = storedHash.split(':');
      if (parts.length !== 3) return false;
      const salt = Buffer.from(parts[1], 'hex');
      const hash = Buffer.from(parts[2], 'hex');
      const derivedHash = createHmac('sha256', getPepper())
        .update(salt)
        .update(password)
        .digest();
      return timingSafeEqual(hash, derivedHash);
    }

    // For seed data users that can't log in
    if (storedHash === 'seed-only-no-login') {
      return false;
    }

    // Unknown hash format
    return false;
  } catch {
    return false;
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ session: Awaited<ReturnType<typeof db.session.create>>; token: string }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });

  return { session, token };
}

/**
 * Validate a session token and return the session if valid
 */
export async function validateSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await db.session.delete({ where: { id: session.id } });
    return null;
  }

  // Check if user is active
  if (!session.user.isActive) {
    return null;
  }

  return session;
}

/**
 * Delete a session by token
 */
export async function deleteSession(token: string): Promise<void> {
  try {
    await db.session.delete({ where: { token } });
  } catch {
    // Session may already be deleted, ignore error
  }
}

/**
 * Clean up all expired sessions
 */
export async function cleanExpiredSessions(): Promise<number> {
  const result = await db.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  return result.count;
}

/**
 * Extract session token from request (Authorization header or cookie)
 */
export function extractSessionToken(request: Request): string | null {
  // Check Authorization: Bearer <token> header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // Check session cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('session=')) {
        return cookie.slice(8).trim();
      }
    }
  }

  return null;
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Get user agent from request
 */
export function getClientUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}
