import { NextResponse } from 'next/server';
import { verifyAuditChain } from '@/lib/audit';

/**
 * GET /api/audit/verify - Verifies the hash chain integrity of all audit events
 */
export async function GET() {
  try {
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
    console.error('Error verifying audit chain:', error);
    return NextResponse.json(
      { error: 'Failed to verify audit chain' },
      { status: 500 }
    );
  }
}
