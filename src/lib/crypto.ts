/**
 * AgentDNAI Crypto Utilities
 * 
 * Provides cryptographic operations for agent identity, token hashing,
 * key generation, and event hash chain computation.
 */

import { createHash, randomBytes, randomUUID } from 'crypto';

/**
 * Generate a cryptographic key pair for an agent identity
 * Returns a simulated key pair (in production, use proper WebCrypto/libsodium)
 */
export function generateKeyPair() {
  const privateKey = randomBytes(32).toString('hex');
  const publicKey = createHash('sha256').update(privateKey).digest('hex');
  return { privateKey, publicKey };
}

/**
 * Hash a token for secure storage
 * Never store raw tokens - only their hashes
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateToken(prefix: string = 'adni'): string {
  const random = randomBytes(32).toString('hex');
  return `${prefix}_${random}`;
}

/**
 * Generate a unique agent URI
 * Format: agent://{owner}/{runtime}/{name}
 */
export function generateAgentUri(owner: string, runtime: string, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  return `agent://${owner}/${runtime}/${slug}`;
}

/**
 * Compute event hash for audit chain
 * Uses SHA-256 over the event's core fields
 */
export function computeEventHash(data: {
  eventType: string;
  actorType: string;
  actorId?: string | null;
  agentId?: string | null;
  resource?: string | null;
  action?: string | null;
  decision?: string | null;
  metadata?: string | null;
  previousHash?: string | null;
  createdAt: Date;
}): string {
  const payload = JSON.stringify({
    eventType: data.eventType,
    actorType: data.actorType,
    actorId: data.actorId || '',
    agentId: data.agentId || '',
    resource: data.resource || '',
    action: data.action || '',
    decision: data.decision || '',
    metadata: data.metadata || '',
    previousHash: data.previousHash || '',
    createdAt: data.createdAt.toISOString(),
  });
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Generate a CUID-like ID (for compatibility)
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Verify a token hash matches
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  return hashToken(token) === hash;
}
