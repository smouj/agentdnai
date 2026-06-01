import { NextRequest, NextResponse } from 'next/server';
import { checkAuthzSchema } from '@/lib/schemas';
import { checkAuthorization, recordDecision, type Decision } from '@/lib/policy';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';

/**
 * POST /api/authz/check - Check authorization
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkAuthzSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const input = {
      agentId: parsed.data.agentId,
      action: parsed.data.action,
      resource: parsed.data.resource,
      tokenScopes: parsed.data.tokenScopes,
    };

    // Check authorization
    const result = await checkAuthorization(input);

    // Record the decision
    const decision = await recordDecision(input, result);

    // Map decision to audit event type
    let auditEventType: string;
    switch (result.decision) {
      case 'allow':
        auditEventType = AUDIT_EVENTS.AUTHZ_ALLOW;
        break;
      case 'deny':
        auditEventType = AUDIT_EVENTS.AUTHZ_DENY;
        break;
      case 'requires_approval':
        auditEventType = AUDIT_EVENTS.AUTHZ_REQUIRES_APPROVAL;
        break;
      case 'agent_inactive':
        auditEventType = AUDIT_EVENTS.AUTHZ_DENY;
        break;
      case 'token_invalid':
        auditEventType = AUDIT_EVENTS.AUTHZ_DENY;
        break;
      case 'token_expired':
        auditEventType = AUDIT_EVENTS.AUTHZ_DENY;
        break;
      case 'insufficient_scope':
        auditEventType = AUDIT_EVENTS.AUTHZ_DENY;
        break;
      default:
        auditEventType = AUDIT_EVENTS.AUTHZ_CHECK;
    }

    // Create audit event
    await createAuditEvent({
      eventType: auditEventType,
      actorType: 'agent',
      agentId: input.agentId,
      resource: input.resource,
      action: input.action,
      decision: result.decision,
      metadata: {
        reason: result.reason,
        decisionId: decision.id,
        requiresApproval: result.requiresApproval,
      },
    });

    return NextResponse.json({
      allowed: result.allowed,
      decision: result.decision,
      reason: result.reason,
      requiresApproval: result.requiresApproval,
      expiresAt: result.expiresAt,
      matchedRule: result.matchedRule,
      decisionId: decision.id,
    });
  } catch (error) {
    console.error('Error checking authorization:', error);
    return NextResponse.json(
      { error: 'Failed to check authorization' },
      { status: 500 }
    );
  }
}
