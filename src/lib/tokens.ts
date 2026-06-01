/**
 * AgentDNAI Token Service
 * 
 * Manages temporary token issuance, hashing, and revocation.
 * Never stores raw tokens - only their hashes.
 */

import { db } from '@/lib/db';
import { generateToken, hashToken } from '@/lib/crypto';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';

export interface IssueTokenInput {
  agentId: string;
  scopes: string[];
  ttlSeconds: number;
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
  const { agentId, scopes, ttlSeconds } = input;

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

  // Store hash only
  const tokenRecord = await db.agentToken.create({
    data: {
      agentId,
      tokenHash,
      scopes: JSON.stringify(scopes),
      expiresAt,
    },
  });

  // Audit event
  await createAuditEvent({
    eventType: AUDIT_EVENTS.TOKEN_ISSUED,
    actorType: 'user',
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
export async function revokeToken(tokenId: string): Promise<boolean> {
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
    agentId: tokenRecord.agentId,
    action: 'token.revoke',
    metadata: { tokenId },
  });

  return true;
}

/**
 * Validate a token and return its scopes
 */
export async function validateToken(token: string): Promise<{
  valid: boolean;
  agentId?: string;
  scopes?: string[];
  reason?: string;
}> {
  const tokenHash = hashToken(token);

  const tokenRecord = await db.agentToken.findUnique({
    where: { tokenHash },
  });

  if (!tokenRecord) {
    return { valid: false, reason: 'Token not found' };
  }

  if (tokenRecord.revokedAt) {
    return { valid: false, reason: 'Token has been revoked' };
  }

  if (new Date() > tokenRecord.expiresAt) {
    return { valid: false, reason: 'Token has expired' };
  }

  // Update last used timestamp
  await db.agentToken.update({
    where: { id: tokenRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    agentId: tokenRecord.agentId,
    scopes: JSON.parse(tokenRecord.scopes),
  };
}
