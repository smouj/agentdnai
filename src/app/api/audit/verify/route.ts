import { requireAuth } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuditChain } from '@/lib/audit';

/**
 * GET /api/audit/verify - Verifies the hash chain integrity of all audit events
 */
export async function GET(_request: NextRequest) {
  try {
    await requireAuth(_request);
    const result = await verifyAuditChain();

    const message = result.valid
      ? `Audit chain integrity verified. All ${result.eventsChecked} events are intact.`
      : `Audit chain integrity violation detected at event ${result.firstInvalidEvent}. ${result.eventsChecked} events checked before failure.`;

    return NextResponse.json({
      valid: result.valid,
      eventsChecked: result.eventsChecked,
      firstInvalidEvent: result.firstInvalidEvent ?? null,
      message,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error verifying audit chain:', error);
    return NextResponse.json(
      { error: 'Failed to verify audit chain' },
      { status: 500 }
    );
  }
}
