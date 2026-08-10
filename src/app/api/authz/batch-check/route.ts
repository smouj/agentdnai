import { NextRequest, NextResponse } from 'next/server';
import { checkAuthorization, recordDecision } from '@/lib/policy';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { validateToken } from '@/lib/tokens';

/**
 * POST /api/authz/batch-check - Check multiple actions at once
 *
 * Body: { agentId: string, actions: string[], resource?: string }
 *
 * Returns an array of results for each action:
 * [{ action, allowed, decision, reason, requiresApproval }]
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!bearerToken) {
      return NextResponse.json(
        { error: 'Authorization bearer agent token is required' },
        { status: 401 }
      );
    }

    const token = await validateToken(bearerToken);
    if (!token.valid || !token.agentId || !token.scopes) {
      const decision = token.status === 'expired' ? 'token_expired' : 'token_invalid';
      return NextResponse.json(
        {
          allowed: false,
          decision,
          reason: token.reason || 'Invalid token',
          requiresApproval: false,
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { agentId, actions, resource } = body;

    if (agentId !== undefined && typeof agentId !== 'string') {
      return NextResponse.json(
        { error: 'Validation failed', details: { agentId: 'agentId must be a string when provided' } },
        { status: 400 }
      );
    }

    if (agentId && agentId !== token.agentId) {
      return NextResponse.json(
        { error: 'Token is not valid for the requested agent' },
        { status: 403 }
      );
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: { actions: 'actions must be a non-empty array of strings' } },
        { status: 400 }
      );
    }

    if (actions.length > 50) {
      return NextResponse.json(
        { error: 'Validation failed', details: { actions: 'Maximum 50 actions per batch check' } },
        { status: 400 }
      );
    }

    // Validate all actions are strings
    for (const action of actions) {
      if (typeof action !== 'string') {
        return NextResponse.json(
          { error: 'Validation failed', details: { actions: 'All actions must be strings' } },
          { status: 400 }
        );
      }
    }

    const results = [];

    for (const action of actions) {
      const input = { agentId: token.agentId, action, resource, tokenScopes: token.scopes };

      // Check authorization
      const authzResult = await checkAuthorization(input);

      // Record the decision
      const decision = await recordDecision(input, authzResult);

      // Map decision to audit event type
      let auditEventType: string;
      switch (authzResult.decision) {
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
        case 'token_invalid':
        case 'token_expired':
        case 'insufficient_scope':
          auditEventType = AUDIT_EVENTS.AUTHZ_DENY;
          break;
        default:
          auditEventType = AUDIT_EVENTS.AUTHZ_CHECK;
      }

      // Create audit event for each action
      await createAuditEvent({
        eventType: auditEventType,
        actorType: 'agent',
        agentId: token.agentId,
        resource,
        action,
        decision: authzResult.decision,
        metadata: {
          reason: authzResult.reason,
          decisionId: decision.id,
          requiresApproval: authzResult.requiresApproval,
          batchCheck: true,
        },
      });

      results.push({
        action,
        allowed: authzResult.allowed,
        decision: authzResult.decision,
        reason: authzResult.reason,
        requiresApproval: authzResult.requiresApproval,
        matchedRule: authzResult.matchedRule,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error performing batch authorization check:', error);
    return NextResponse.json(
      { error: 'Failed to perform batch authorization check' },
      { status: 500 }
    );
  }
}
