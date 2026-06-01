import { NextRequest, NextResponse } from 'next/server';
import { issueTokenSchema } from '@/lib/schemas';
import { issueToken } from '@/lib/tokens';

/**
 * POST /api/tokens/issue - Issue a temporary token
 */
export async function POST(request: NextRequest) {
  try {
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
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error issuing token:', error);
    const message = error instanceof Error ? error.message : 'Failed to issue token';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
