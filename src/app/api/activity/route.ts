import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/activity - Activity heatmap data for past 30 days
 * Returns daily counts of audit events grouped by date
 */
export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Get all audit events from the past 30 days
    const events = await db.auditEvent.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        eventType: true,
        decision: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyMap: Record<string, { date: string; total: number; allow: number; deny: number; requiresApproval: number; other: number }> = {};

    // Initialize all 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      dailyMap[dateKey] = { date: dateKey, total: 0, allow: 0, deny: 0, requiresApproval: 0, other: 0 };
    }

    // Count events per day
    for (const event of events) {
      const dateKey = event.createdAt.toISOString().split('T')[0];
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].total++;
        if (event.decision === 'allow') dailyMap[dateKey].allow++;
        else if (event.decision === 'deny') dailyMap[dateKey].deny++;
        else if (event.decision === 'requires_approval') dailyMap[dateKey].requiresApproval++;
        else dailyMap[dateKey].other++;
      }
    }

    // Also get per-agent activity
    const agentEvents = await db.auditEvent.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        agentId: { not: null },
      },
      select: {
        agentId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by agent + date
    const agentActivityMap: Record<string, Record<string, number>> = {};
    for (const event of agentEvents) {
      if (!event.agentId) continue;
      const dateKey = event.createdAt.toISOString().split('T')[0];
      if (!agentActivityMap[event.agentId]) agentActivityMap[event.agentId] = {};
      if (!agentActivityMap[event.agentId][dateKey]) agentActivityMap[event.agentId][dateKey] = 0;
      agentActivityMap[event.agentId][dateKey]++;
    }

    return NextResponse.json({
      days: Object.values(dailyMap),
      agentActivity: agentActivityMap,
      period: '30d',
    });
  } catch (error) {
    console.error('Error getting activity data:', error);
    return NextResponse.json(
      { error: 'Failed to get activity data' },
      { status: 500 }
    );
  }
}
