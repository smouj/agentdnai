import { requireAuth, resolveActiveOrgId } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateKeyPair } from '@/lib/crypto';

/**
 * POST /api/data/import - Import agents from a JSON file
 *
 * Accepts a JSON payload with an `agents` array.
 * Each agent object should have: name, runtime, description (optional), permissions (optional array)
 * Returns counts of imported, skipped, and any errors.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const activeOrgId = await resolveActiveOrgId(request, session, 'DEVELOPER');
    const body = await request.json();
    const agents = body.agents;

    if (!Array.isArray(agents)) {
      return NextResponse.json(
        { error: 'Invalid payload: expected an "agents" array' },
        { status: 400 }
      );
    }

    let agentsImported = 0;
    let agentsSkipped = 0;
    const errors: string[] = [];

    const userId = session.userId;

    for (const agentData of agents) {
      try {
        if (!agentData.name || !agentData.runtime) {
          errors.push(`Agent missing name or runtime: ${JSON.stringify(agentData).slice(0, 100)}`);
          agentsSkipped++;
          continue;
        }

        // Check if agent with same URI already exists
        if (agentData.agentUri) {
          const existing = await db.agentIdentity.findUnique({
            where: { agentUri: agentData.agentUri },
          });
          if (existing) {
            agentsSkipped++;
            continue;
          }
        }

        // Generate a new RSA-PSS key pair for the imported agent
        const keyPair = generateKeyPair();

        const agent = await db.agentIdentity.create({
          data: {
            agentUri: agentData.agentUri || `agent:${agentData.runtime}:${agentData.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: agentData.name,
            description: agentData.description || null,
            runtime: agentData.runtime,
            publicKey: keyPair.publicKey,
            fingerprint: keyPair.fingerprint,
            status: agentData.status || 'ACTIVE',
            ownerUserId: userId,
            organizationId: activeOrgId,
          },
        });

        // Import permissions if provided
        if (Array.isArray(agentData.permissions)) {
          for (const perm of agentData.permissions) {
            if (perm.scope) {
              await db.agentPermission.create({
                data: {
                  agentId: agent.id,
                  scope: perm.scope,
                  resource: perm.resource || null,
                  effect: perm.effect || 'ALLOW',
                  expiresAt: perm.expiresAt ? new Date(perm.expiresAt) : null,
                  createdByUserId: userId,
                },
              });
            }
          }
        }

        agentsImported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Failed to import agent "${agentData.name || 'unknown'}": ${msg}`);
        agentsSkipped++;
      }
    }

    return NextResponse.json({
      agentsImported,
      agentsSkipped,
      errors,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    );
  }
}
