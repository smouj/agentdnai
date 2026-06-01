/**
 * AgentDNAI Crypto Utilities - Production Ready
 * 
 * Real cryptographic operations using Node.js crypto module.
 * - RSA-PSS key pair generation for agent identity
 * - HMAC-SHA256 token hashing with pepper
 * - Timing-safe comparison for token verification
 * - SHA-256 event hash chain computation
 */

import {
  createHash,
  createHmac,
  createSign,
  createVerify,
  randomBytes,
  randomUUID,
  timingSafeEqual,
  generateKeyPairSync,
  constants,
} from 'crypto';

// ─── Configuration ────────────────────────────────────────────────────────────

const TOKEN_PEPPER = process.env.TOKEN_PEPPER || 'agentdnai-default-pepper-change-in-production';

// ─── Key Pair Generation ─────────────────────────────────────────────────────

/**
 * Generate a real RSA-PSS key pair for agent identity
 * Returns PEM-encoded public and private keys plus fingerprint
 */
export function generateKeyPair(): { privateKey: string; publicKey: string; fingerprint: string } {
  const { publicKey, privateKey } = generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const fingerprint = computeFingerprint(publicKey);
  return { privateKey, publicKey, fingerprint };
}

/**
 * Compute a stable fingerprint from a public key
 * Format: SHA256:AB:CD:EF:...
 */
export function computeFingerprint(publicKeyPem: string): string {
  // Extract DER bytes from PEM
  const derBase64 = publicKeyPem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  const der = Buffer.from(derBase64, 'base64');
  
  const hash = createHash('sha256').update(der).digest('hex');
  // Format as colon-separated pairs
  return 'SHA256:' + hash.match(/.{2}/g)?.join(':').toUpperCase();
}

/**
 * Sign a challenge with a private key (RSA-PSS + SHA-256)
 */
export function signChallenge(privateKeyPem: string, challenge: string): string {
  const signer = createSign('sha256');
  signer.update(challenge);
  signer.end();
  const signature = signer.sign({
    key: privateKeyPem,
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
  });
  return signature.toString('base64');
}

/**
 * Verify a signature against a challenge (RSA-PSS + SHA-256)
 */
export function verifySignature(publicKeyPem: string, challenge: string, signature: string): boolean {
  try {
    const verifier = createVerify('sha256');
    verifier.update(challenge);
    verifier.end();
    return verifier.verify(
      {
        key: publicKeyPem,
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
      },
      Buffer.from(signature, 'base64')
    );
  } catch {
    return false;
  }
}

// ─── Token Operations ────────────────────────────────────────────────────────

/**
 * Hash a token for secure storage using HMAC-SHA256 with pepper
 * Never store raw tokens - only their HMAC hashes
 */
export function hashToken(token: string): string {
  return createHmac('sha256', TOKEN_PEPPER).update(token).digest('hex');
}

/**
 * Verify a token hash using timing-safe comparison
 * Critical for preventing timing attacks
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  const computedHash = hashToken(token);
  if (computedHash.length !== hash.length) return false;
  return timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
}

/**
 * Generate a secure random token
 * Format: adni_<32 bytes hex>
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

// ─── Event Hash Chain ────────────────────────────────────────────────────────

/**
 * Compute event hash for audit chain
 * Uses SHA-256 over a canonical JSON representation of the event
 */
export function computeEventHash(data: {
  sequence: number;
  eventType: string;
  actorType: string;
  actorId?: string | null;
  agentId?: string | null;
  organizationId?: string | null;
  resource?: string | null;
  action?: string | null;
  decision?: string | null;
  metadata?: string | null;
  previousHash?: string | null;
  createdAt: Date;
}): string {
  const payload = JSON.stringify({
    sequence: data.sequence,
    eventType: data.eventType,
    actorType: data.actorType,
    actorId: data.actorId || '',
    agentId: data.agentId || '',
    organizationId: data.organizationId || '',
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
 * Generate a unique ID
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Generate a session token
 */
export function generateSessionToken(): string {
  return `sess_${randomBytes(32).toString('hex')}`;
}
