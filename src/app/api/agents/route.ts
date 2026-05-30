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
    const body = await request.json();
    const parsed = createAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, runtime, description, ownerEmail } = parsed.data;

    // Get or create user
    const email = ownerEmail || 'default@agentdnai.io';
    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: email === 'default@agentdnai.io' ? 'Default User' : email.split('@')[0],
        },
      });
    }

    // Generate key pair
    const keyPair = generateKeyPair();

    // Generate agent URI
    const owner = email === 'default@agentdnai.io' ? 'user' : email.split('@')[0];
    const agentUri = generateAgentUri(owner, runtime, name);

    // Create agent identity
    const agent = await db.agentIdentity.create({
      data: {
        agentUri,
        name,
        description: description || null,
        runtime,
        publicKey: keyPair.publicKey,
        status: 'ACTIVE',
        ownerUserId: user.id,
      },
    });

    // Create audit event
    await createAuditEvent({
      eventType: AUDIT_EVENTS.AGENT_CREATED,
      actorType: 'user',
      actorId: user.id,
      agentId: agent.id,
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
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents - List all agents
 */
export async function GET() {
  try {
    const agents = await db.agentIdentity.findMany({
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
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      lastSeenAt: agent.lastSeenAt,
      revokedAt: agent.revokedAt,
      _count: { permissions: agent._count.permissions, tokens: 0 },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing agents:', error);
    return NextResponse.json(
      { error: 'Failed to list agents' },
      { status: 500 }
    );
  }
}
