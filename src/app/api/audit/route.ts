import { requireAgentAccess, requireAuth, visibleAuditWhere } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditQuerySchema } from '@/lib/schemas';

/**
 * GET /api/audit - Get audit events
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const { searchParams } = request.nextUrl;
    const queryParams = Object.fromEntries(searchParams.entries());
    const parsed = auditQuerySchema.safeParse(queryParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { agentId, decision, eventType, resource, limit, offset } = parsed.data;

    // Build where clause
    const visibilityWhere = await visibleAuditWhere(session.userId);
    const where: Record<string, unknown> = { AND: [visibilityWhere] };

    if (agentId) {
      await requireAgentAccess(session, agentId);
      (where.AND as Record<string, unknown>[]).push({ agentId });
    }

    if (eventType) {
      (where.AND as Record<string, unknown>[]).push({ eventType });
    }

    if (resource) {
      (where.AND as Record<string, unknown>[]).push({ resource });
    }

    if (decision) {
      (where.AND as Record<string, unknown>[]).push({ decision });
    }

    const [events, total] = await Promise.all([
      db.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.auditEvent.count({ where }),
    ]);

    return NextResponse.json({ events, total, limit, offset });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error getting audit events:', error);
    return NextResponse.json(
      { error: 'Failed to get audit events' },
      { status: 500 }
    );
  }
}
