import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditQuerySchema } from '@/lib/schemas';

/**
 * GET /api/audit - Get audit events
 */
export async function GET(request: NextRequest) {
  try {
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
    const where: Record<string, unknown> = {};

    if (agentId) {
      where.agentId = agentId;
    }

    if (eventType) {
      where.eventType = eventType;
    }

    if (resource) {
      where.resource = resource;
    }

    if (decision) {
      where.decision = decision;
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

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error getting audit events:', error);
    return NextResponse.json(
      { error: 'Failed to get audit events' },
      { status: 500 }
    );
  }
}
