import { requireAuth, visibleAuditWhere } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/audit/export - Export all audit events as CSV
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth(_request);
    const where = await visibleAuditWhere(session.userId);
    const events = await db.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    const columns = ['timestamp', 'eventType', 'actorType', 'agentId', 'resource', 'action', 'decision', 'eventHash'];

    const header = columns.join(',');
    const rows = events.map(e =>
      [
        `"${new Date(e.createdAt).toISOString()}"`,
        `"${e.eventType}"`,
        `"${e.actorType}"`,
        e.agentId ? `"${e.agentId}"` : '',
        e.resource ? `"${e.resource.replace(/"/g, '""')}"` : '',
        e.action ? `"${e.action}"` : '',
        e.decision ? `"${e.decision}"` : '',
        `"${e.eventHash}"`,
      ].join(',')
    );

    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="agentdnai-audit-export.csv"',
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error exporting audit events:', error);
    return NextResponse.json(
      { error: 'Failed to export audit events' },
      { status: 500 }
    );
  }
}
