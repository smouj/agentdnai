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

    // Find or create a default user for imports
    let userId: string;
    const existingUser = await db.user.findFirst();
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const newUser = await db.user.create({
        data: { email: 'import@agentdnai.local', name: 'Import User' },
      });
      userId = newUser.id;
    }

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

        // Generate a new key pair for the imported agent
        const { publicKey } = await generateKeyPair();

        const agent = await db.agentIdentity.create({
          data: {
            agentUri: agentData.agentUri || `agent:${agentData.runtime}:${agentData.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: agentData.name,
            description: agentData.description || null,
            runtime: agentData.runtime,
            publicKey,
            status: agentData.status || 'ACTIVE',
            ownerUserId: userId,
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
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    );
  }
}
