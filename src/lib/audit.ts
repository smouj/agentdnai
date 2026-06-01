/**
 * AgentDNAI Audit Logger
 *
 * Append-only audit event system with hash chain integrity.
 * Every event is linked to the previous one via previousHash.
 * Supports sequence numbers and organization-scoped events.
 */

import { db } from '@/lib/db';
import { computeEventHash } from '@/lib/crypto';

export interface CreateAuditEventInput {
  eventType: string;
  actorType: string;
  actorId?: string;
  agentId?: string;
  organizationId?: string;
  resource?: string;
  action?: string;
  decision?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create an audit event with hash chain and sequence tracking
 */
export async function createAuditEvent(input: CreateAuditEventInput) {
  // Get the latest event for previousHash and sequence number
  const latestEvent = await db.auditEvent.findFirst({
    orderBy: { sequence: 'desc' },
  });

  const previousHash = latestEvent?.eventHash || 'GENESIS';
  const nextSequence = (latestEvent?.sequence ?? 0) + 1;
  const createdAt = new Date();

  const metadataStr = input.metadata ? JSON.stringify(input.metadata) : null;

  // Compute event hash
  const eventHash = computeEventHash({
    sequence: nextSequence,
    eventType: input.eventType,
    actorType: input.actorType,
    actorId: input.actorId || null,
    agentId: input.agentId || null,
    organizationId: input.organizationId || null,
    resource: input.resource || null,
    action: input.action || null,
    decision: input.decision || null,
    metadata: metadataStr,
    previousHash,
    createdAt,
  });

  const event = await db.auditEvent.create({
    data: {
      sequence: nextSequence,
      eventType: input.eventType,
      actorType: input.actorType,
      actorId: input.actorId || null,
      agentId: input.agentId || null,
      organizationId: input.organizationId || null,
      resource: input.resource || null,
      action: input.action || null,
      decision: input.decision || null,
      metadata: metadataStr,
      previousHash,
      eventHash,
      createdAt,
    },
  });

  return event;
}

/**
 * Audit event types
 */
export const AUDIT_EVENTS = {
  // Agent events
  AGENT_CREATED: 'AGENT_CREATED',
  AGENT_PAUSED: 'AGENT_PAUSED',
  AGENT_RESUMED: 'AGENT_RESUMED',
  AGENT_REVOKED: 'AGENT_REVOKED',
  AGENT_BLOCKED: 'AGENT_BLOCKED',
  AGENT_KEY_ROTATED: 'AGENT_KEY_ROTATED',

  // Permission events
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',

  // Token events
  TOKEN_ISSUED: 'TOKEN_ISSUED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  TOKEN_USED: 'TOKEN_USED',

  // Authorization events
  AUTHZ_CHECK: 'AUTHZ_CHECK',
  AUTHZ_ALLOW: 'AUTHZ_ALLOW',
  AUTHZ_DENY: 'AUTHZ_DENY',
  AUTHZ_REQUIRES_APPROVAL: 'AUTHZ_REQUIRES_APPROVAL',

  // User authentication events
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',

  // Organization events
  ORG_CREATED: 'ORG_CREATED',
  MEMBER_ADDED: 'MEMBER_ADDED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',

  // Approval workflow events
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED',
  APPROVAL_APPROVED: 'APPROVAL_APPROVED',
  APPROVAL_REJECTED: 'APPROVAL_REJECTED',
} as const;

export type AuditEventType = (typeof AUDIT_EVENTS)[keyof typeof AUDIT_EVENTS];

/**
 * Verify audit chain integrity
 * Returns true if the hash chain is intact
 */
export async function verifyAuditChain(): Promise<{
  valid: boolean;
  eventsChecked: number;
  firstInvalidEvent?: string;
}> {
  const events = await db.auditEvent.findMany({
    orderBy: { sequence: 'asc' },
  });

  let previousHash = 'GENESIS';

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Verify the previousHash link
    if (event.previousHash !== previousHash) {
      return {
        valid: false,
        eventsChecked: i,
        firstInvalidEvent: event.id,
      };
    }

    // Verify the eventHash
    const computedHash = computeEventHash({
      sequence: event.sequence,
      eventType: event.eventType,
      actorType: event.actorType,
      actorId: event.actorId,
      agentId: event.agentId,
      organizationId: event.organizationId,
      resource: event.resource,
      action: event.action,
      decision: event.decision,
      metadata: event.metadata,
      previousHash: event.previousHash,
      createdAt: event.createdAt,
    });

    if (event.eventHash !== computedHash) {
      return {
        valid: false,
        eventsChecked: i,
        firstInvalidEvent: event.id,
      };
    }

    previousHash = event.eventHash;
  }

  return {
    valid: true,
    eventsChecked: events.length,
  };
}
