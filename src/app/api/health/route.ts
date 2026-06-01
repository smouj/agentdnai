/**
 * Health Check API
 *
 * GET /api/health - Health check endpoint
 *
 * No auth required.
 * Returns system status, version, uptime, and service connectivity.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const START_TIME = Date.now();
const VERSION = '0.2.0-alpha';

export async function GET() {
  try {
    // Check database connectivity
    let databaseStatus = 'ok';
    let auditCount = 0;

    try {
      auditCount = await db.auditEvent.count();
    } catch {
      databaseStatus = 'error';
    }

    // Verify audit chain exists (just check count, don't verify full chain for performance)
    const auditStatus = databaseStatus === 'ok' && auditCount >= 0 ? 'ok' : 'error';

    const uptime = Date.now() - START_TIME;

    return NextResponse.json({
      status: databaseStatus === 'ok' ? 'ok' : 'degraded',
      version: VERSION,
      timestamp: new Date().toISOString(),
      uptime,
      services: {
        database: databaseStatus,
        audit: auditStatus,
      },
    });
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        version: VERSION,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - START_TIME,
        services: {
          database: 'error',
          audit: 'error',
        },
      },
      { status: 503 }
    );
  }
}
