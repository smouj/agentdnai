import { requireAuth } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateKeyPair } from '@/lib/crypto';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';

/**
 * POST /api/agents/[id]/rotate-key - Rotate agent key pair
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(_request);
    const { id } = await params;

    const agent = await db.agentIdentity.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.status === 'REVOKED') {
      return NextResponse.json(
        { error: 'Cannot rotate key for a revoked agent' },
        { status: 400 }
      );
    }

    // Generate new RSA-PSS key pair
    const keyPair = generateKeyPair();

    // Update public key and fingerprint
    const updated = await db.agentIdentity.update({
      where: { id },
      data: {
        publicKey: keyPair.publicKey,
        fingerprint: keyPair.fingerprint,
      },
    });

    // Create audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.AGENT_KEY_ROTATED,
      actorType: 'user',
      agentId: id,
      action: 'agent.rotateKey',
      metadata: { previousPublicKeyPrefix: agent.publicKey.substring(0, 16) + '...' },
    });

    // Return new public key only (NOT private key)
    return NextResponse.json({
      id: updated.id,
      publicKey: updated.publicKey,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error rotating agent key:', error);
    return NextResponse.json(
      { error: 'Failed to rotate agent key' },
      { status: 500 }
    );
  }
}
