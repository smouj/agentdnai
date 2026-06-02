import { requireAuth } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { issueTokenSchema } from '@/lib/schemas';
import { issueToken } from '@/lib/tokens';

/**
 * POST /api/tokens/issue - Issue a temporary token
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const parsed = issueTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await issueToken({
      agentId: parsed.data.agentId,
      scopes: parsed.data.scopes,
      ttlSeconds: parsed.data.ttlSeconds,
      createdBy: parsed.data.createdBy,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error issuing token:', error);
    const message = error instanceof Error ? error.message : 'Failed to issue token';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
