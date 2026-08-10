import { accessibleAgentWhere, requireAuth, requireOrgAccess, resolveActiveOrgId } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateKeyPair, generateAgentUri } from '@/lib/crypto';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { createAgentSchema } from '@/lib/schemas';

/**
 * POST /api/agents - Create a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();
    const parsed = createAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, runtime, description, organizationId } = parsed.data;
    if (organizationId) {
      await requireOrgAccess(session, organizationId, 'DEVELOPER');
    }
    const activeOrgId = organizationId || await resolveActiveOrgId(request, session, 'DEVELOPER');
    const owner = session.user.email.split('@')[0] || 'user';

    // Generate RSA-PSS key pair
    const keyPair = generateKeyPair();

    // Generate agent URI
    const agentUri = generateAgentUri(owner, runtime, name);

    // Create agent identity with fingerprint
    const agent = await db.agentIdentity.create({
      data: {
        agentUri,
        name,
        description: description || null,
        runtime,
        publicKey: keyPair.publicKey,
        fingerprint: keyPair.fingerprint,
        status: 'ACTIVE',
        ownerUserId: session.userId,
        organizationId: activeOrgId,
      },
    });

    // Create audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.AGENT_CREATED,
      actorType: 'user',
      actorId: session.userId,
      agentId: agent.id,
      organizationId: agent.organizationId || undefined,
      action: 'agent.create',
      metadata: { name, runtime, agentUri },
    });

    // Return agent data without private key
    return NextResponse.json(
      {
        id: agent.id,
        agentUri: agent.agentUri,
        name: agent.name,
        description: agent.description,
        runtime: agent.runtime,
        publicKey: agent.publicKey,
        status: agent.status,
        ownerUserId: agent.ownerUserId,
        organizationId: agent.organizationId,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents - List all agents with optional search/filter
 *
 * Query params:
 *   ?search=term   - Filter agents by name, description, or agentUri containing the search term
 *   ?status=ACTIVE - Filter by status
 *   ?runtime=hermes - Filter by runtime
 *   All params are optional and composable
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim() || undefined;
    const status = searchParams.get('status')?.trim() || undefined;
    const runtime = searchParams.get('runtime')?.trim() || undefined;

    // Build the where clause
    const activeOrgId = await resolveActiveOrgId(request, session);
    const where: Record<string, unknown> = activeOrgId
      ? { organizationId: activeOrgId }
      : accessibleAgentWhere(session.userId);

    if (status) {
      where.status = status.toUpperCase();
    }

    if (runtime) {
      where.runtime = runtime.toLowerCase();
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { agentUri: { contains: search } },
      ];
    }

    const agents = await db.agentIdentity.findMany({
      where,
      include: {
        _count: {
          select: { permissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = agents.map((agent) => ({
      id: agent.id,
      agentUri: agent.agentUri,
      name: agent.name,
      description: agent.description,
      runtime: agent.runtime,
      publicKey: agent.publicKey,
      status: agent.status,
      ownerUserId: agent.ownerUserId,
      organizationId: agent.organizationId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      lastSeenAt: agent.lastSeenAt,
      revokedAt: agent.revokedAt,
      _count: { permissions: agent._count.permissions, tokens: 0 },
    }));

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error listing agents:', error);
    return NextResponse.json(
      { error: 'Failed to list agents' },
      { status: 500 }
    );
  }
}
