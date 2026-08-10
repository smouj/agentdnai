import { requireAgentManagement, requireAuth } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { revokeToken } from '@/lib/tokens';
import { db } from '@/lib/db';

/**
 * POST /api/tokens/[id]/revoke - Revoke a token
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(_request);
    const { id } = await params;
    const token = await db.agentToken.findUnique({
      where: { id },
      select: { agentId: true },
    });

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    await requireAgentManagement(session, token.agentId);

    await revokeToken(id, session.userId);

    return NextResponse.json({ revoked: true, tokenId: id });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error revoking token:', error);
    const message = error instanceof Error ? error.message : 'Failed to revoke token';
    const status = message === 'Token not found' ? 404 : message === 'Token already revoked' ? 400 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
