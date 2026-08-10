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
  organizationId: z.string().min(1).optional(),
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
  agentId: z.string().min(1).optional(),
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

// ─── Auth Schemas ────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Organization Schemas ────────────────────────────────────────────────────

export const createOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['VIEWER', 'DEVELOPER', 'SECURITY_MANAGER', 'ADMIN', 'OWNER']),
});

export const removeMemberSchema = z.object({
  userId: z.string().min(1),
});

// ─── Approval Schemas ──────────────────────────────────────────────────────────

export const createApprovalRequestSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  action: z.string().min(1, 'Action is required').max(200, 'Action must be at most 200 characters'),
  resource: z.string().max(500, 'Resource must be at most 500 characters').optional(),
  expiresAt: z.string().datetime('Invalid datetime format').optional(),
});

export const rejectApprovalSchema = z.object({
  note: z.string().max(1000, 'Note must be at most 1000 characters').optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type GrantPermissionInput = z.infer<typeof grantPermissionSchema>;
export type IssueTokenInput = z.infer<typeof issueTokenSchema>;
export type CheckAuthzInput = z.infer<typeof checkAuthzSchema>;
export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type CreateApprovalRequestInput = z.infer<typeof createApprovalRequestSchema>;
export type RejectApprovalInput = z.infer<typeof rejectApprovalSchema>;
