/**
 * AgentDNAI Validation Schemas
 * 
 * Zod schemas for all API endpoint validation.
 */

import { z } from 'zod';

// ─── Agent Schemas ────────────────────────────────────────────────────────────

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  runtime: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  ownerEmail: z.string().email().optional(),
});

export const agentActionSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ─── Permission Schemas ───────────────────────────────────────────────────────

export const grantPermissionSchema = z.object({
  scope: z.string().min(1).max(200),
  resource: z.string().max(500).optional(),
  effect: z.enum(['ALLOW', 'DENY', 'REQUIRES_APPROVAL']).default('ALLOW'),
  expiresAt: z.string().datetime().optional(),
});

export const deletePermissionSchema = z.object({
  permissionId: z.string().min(1),
});

// ─── Token Schemas ────────────────────────────────────────────────────────────

export const issueTokenSchema = z.object({
  agentId: z.string().min(1),
  scopes: z.array(z.string()).min(1).max(50),
  ttlSeconds: z.number().int().min(60).max(86400).default(3600),
});

export const revokeTokenSchema = z.object({
  tokenId: z.string().min(1),
});

// ─── Authorization Schemas ────────────────────────────────────────────────────

export const checkAuthzSchema = z.object({
  agentId: z.string().min(1),
  action: z.string().min(1).max(200),
  resource: z.string().max(500).optional(),
});

// ─── Audit Schemas ────────────────────────────────────────────────────────────

export const auditQuerySchema = z.object({
  agentId: z.string().optional(),
  decision: z.enum(['allow', 'deny', 'requires_approval']).optional(),
  eventType: z.string().optional(),
  resource: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type GrantPermissionInput = z.infer<typeof grantPermissionSchema>;
export type IssueTokenInput = z.infer<typeof issueTokenSchema>;
export type CheckAuthzInput = z.infer<typeof checkAuthzSchema>;
export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
