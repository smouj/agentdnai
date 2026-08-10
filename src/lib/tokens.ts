/**
 * AgentDNAI Token Service - Production Ready
 * 
 * Manages temporary token issuance, HMAC hashing, and revocation.
 * - Raw token shown only once at issuance
 * - Only HMAC-SHA256 hash stored in database (with pepper)
 * - Timing-safe comparison for validation
 * - TTL enforcement (60s minimum, 24h maximum)
 * - Immediate revocation
 * - Audit trail for all operations
 */

import { db } from '@/lib/db';
import { generateToken, hashToken, verifyTokenHash } from '@/lib/crypto';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';

export interface IssueTokenInput {
  agentId: string;
  scopes: string[];
  ttlSeconds: number;
  createdBy?: string; // userId
}

export interface IssueTokenResult {
  tokenId: string;
  token: string; // Only returned once - never stored
  scopes: string[];
  expiresAt: Date;
}

/**
 * Issue a new temporary token for an agent
 */
export async function issueToken(input: IssueTokenInput): Promise<IssueTokenResult> {
  const { agentId, scopes, ttlSeconds, createdBy } = input;

  // Validate agent exists and is active
  const agent = await db.agentIdentity.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new Error('Agent not found');
  }

  if (agent.status !== 'ACTIVE') {
    throw new Error(`Cannot issue token for agent with status '${agent.status}'`);
  }

  // Enforce TTL limits
  const maxTtl = 86400; // 24 hours max
  const effectiveTtl = Math.min(ttlSeconds, maxTtl);
  if (effectiveTtl < 60) {
    throw new Error('Minimum TTL is 60 seconds');
  }

  // Generate token
  const token = generateToken('adni');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + effectiveTtl * 1000);

  // Store hash only (HMAC-SHA256 with pepper)
  const tokenRecord = await db.agentToken.create({
    data: {
      agentId,
      tokenHash,
      scopes: JSON.stringify(scopes),
      expiresAt,
      createdBy: createdBy || null,
    },
  });

  // Audit event
  await createAuditEvent({
    eventType: AUDIT_EVENTS.TOKEN_ISSUED,
    actorType: 'user',
    actorId: createdBy,
    agentId,
    action: 'token.issue',
    metadata: { tokenId: tokenRecord.id, scopes, ttlSeconds: effectiveTtl },
  });

  return {
    tokenId: tokenRecord.id,
    token, // Return raw token only once
    scopes,
    expiresAt,
  };
}

/**
 * Revoke a token
 */
export async function revokeToken(tokenId: string, revokedBy?: string): Promise<boolean> {
  const tokenRecord = await db.agentToken.findUnique({
    where: { id: tokenId },
  });

  if (!tokenRecord) {
    throw new Error('Token not found');
  }

  if (tokenRecord.revokedAt) {
    throw new Error('Token already revoked');
  }

  await db.agentToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });

  await createAuditEvent({
    eventType: AUDIT_EVENTS.TOKEN_REVOKED,
    actorType: 'user',
    actorId: revokedBy,
    agentId: tokenRecord.agentId,
    action: 'token.revoke',
    metadata: { tokenId },
  });

  return true;
}

/**
 * Validate a token and return its scopes
 * Uses timing-safe comparison to prevent timing attacks
 */
export async function validateToken(token: string): Promise<{
  valid: boolean;
  agentId?: string;
  tokenId?: string;
  scopes?: string[];
  reason?: string;
  status?: 'invalid' | 'expired' | 'revoked';
}> {
  const tokenHash = hashToken(token);

  // Find token by hash - note: we need to do a linear scan for timing-safe comparison
  // since we can't use findUnique with timingSafeEqual directly in the query
  const allTokens = await db.agentToken.findMany({
    where: { tokenHash },
  });

  // Use timing-safe comparison for the actual match
  let tokenRecord = null;
  for (const t of allTokens) {
    if (verifyTokenHash(token, t.tokenHash)) {
      tokenRecord = t;
      break;
    }
  }

  if (!tokenRecord) {
    return { valid: false, reason: 'Token not found', status: 'invalid' };
  }

  if (tokenRecord.revokedAt) {
    return {
      valid: false,
      agentId: tokenRecord.agentId,
      tokenId: tokenRecord.id,
      reason: 'Token has been revoked',
      status: 'revoked',
    };
  }

  if (new Date() > tokenRecord.expiresAt) {
    return {
      valid: false,
      agentId: tokenRecord.agentId,
      tokenId: tokenRecord.id,
      reason: 'Token has expired',
      status: 'expired',
    };
  }

  // Update last used timestamp
  await db.agentToken.update({
    where: { id: tokenRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    agentId: tokenRecord.agentId,
    tokenId: tokenRecord.id,
    scopes: JSON.parse(tokenRecord.scopes),
  };
}
