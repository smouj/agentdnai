import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/stats/trends - Authorization trend data and permission distribution
 * Returns hourly decision counts for past 24h + permission category breakdown
 */
export async function GET() {
  try {
    // Hourly trend data for past 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const recentDecisions = await db.authorizationDecision.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
      },
      select: {
        decision: true,
        createdAt: true,
        action: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by hour
    const hourlyMap: Record<string, { hour: string; allow: number; deny: number; requiresApproval: number }> = {};
    for (let i = 23; i >= 0; i--) {
      const d = new Date();
      d.setHours(d.getHours() - i);
      const hourKey = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:00`;
      hourlyMap[hourKey] = { hour: hourKey, allow: 0, deny: 0, requiresApproval: 0 };
    }

    for (const dec of recentDecisions) {
      const d = new Date(dec.createdAt);
      const hourKey = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:00`;
      if (hourlyMap[hourKey]) {
        if (dec.decision === 'allow') hourlyMap[hourKey].allow++;
        else if (dec.decision === 'deny') hourlyMap[hourKey].deny++;
        else if (dec.decision === 'requires_approval') hourlyMap[hourKey].requiresApproval++;
      }
    }

    // Permission distribution by scope category
    const permissions = await db.agentPermission.findMany({
      select: { scope: true, effect: true },
    });

    const categoryMap: Record<string, { category: string; allow: number; deny: number; requiresApproval: number }> = {};
    for (const perm of permissions) {
      const category = perm.scope.split('.')[0];
      if (!categoryMap[category]) {
        categoryMap[category] = { category, allow: 0, deny: 0, requiresApproval: 0 };
      }
      if (perm.effect === 'ALLOW') categoryMap[category].allow++;
      else if (perm.effect === 'DENY') categoryMap[category].deny++;
      else categoryMap[category].requiresApproval++;
    }

    // Top actions (most frequently checked)
    const actionCounts: Record<string, number> = {};
    for (const dec of recentDecisions) {
      if (dec.action) {
        actionCounts[dec.action] = (actionCounts[dec.action] || 0) + 1;
      }
    }
    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    return NextResponse.json({
      hourlyTrends: Object.values(hourlyMap),
      permissionDistribution: Object.values(categoryMap),
      topActions,
      period: '24h',
    });
  } catch (error) {
    console.error('Error getting trend data:', error);
    return NextResponse.json(
      { error: 'Failed to get trend data' },
      { status: 500 }
    );
  }
}
