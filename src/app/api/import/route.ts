import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/import - Import data from a JSON file
 *
 * Accepts a JSON payload in the same format as the export endpoint.
 * Handles creating agents, permissions, and tokens from the imported data.
 * Skips existing agents (by agentUri).
 *
 * Returns: { imported: { agents, permissions, tokens }, skipped: { agents }, errors: [] }
 */

interface ImportPermission {
  scope: string;
  resource?: string | null;
  effect?: string;
  expiresAt?: string | null;
  createdByUserId?: string;
}

interface ImportToken {
  tokenHash: string;
  scopes: string;
  expiresAt: string;
  revokedAt?: string | null;
  lastUsedAt?: string | null;
}

interface ImportAgent {
  agentUri: string;
  name: string;
  description?: string | null;
  runtime: string;
  publicKey: string;
  status?: string;
  ownerUserId?: string;
  owner?: { email: string; name?: string } | null;
  permissions?: ImportPermission[];
  tokens?: ImportToken[];
}

interface ImportData {
  version?: string;
  agents?: ImportAgent[];
  auditEvents?: unknown[];
  authorizationDecisions?: unknown[];
  stats?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportData = await request.json();

    // ── Validate structure ───────────────────────────────────────────────────
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid import data: expected a JSON object' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.agents)) {
      return NextResponse.json(
        { error: 'Invalid import data: "agents" must be an array' },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const imported = { agents: 0, permissions: 0, tokens: 0 };
    const skipped = { agents: 0 };

    // ── Process each agent ───────────────────────────────────────────────────
    for (const agentData of body.agents) {
      // Validate required fields
      if (!agentData.agentUri || typeof agentData.agentUri !== 'string') {
        errors.push(`Agent missing required field "agentUri", skipping`);
        continue;
      }
      if (!agentData.name || typeof agentData.name !== 'string') {
        errors.push(`Agent "${agentData.agentUri}" missing required field "name", skipping`);
        continue;
      }
      if (!agentData.runtime || typeof agentData.runtime !== 'string') {
        errors.push(`Agent "${agentData.agentUri}" missing required field "runtime", skipping`);
        continue;
      }
      if (!agentData.publicKey || typeof agentData.publicKey !== 'string') {
        errors.push(`Agent "${agentData.agentUri}" missing required field "publicKey", skipping`);
        continue;
      }

      // Check if agent already exists (by agentUri)
      const existing = await db.agentIdentity.findUnique({
        where: { agentUri: agentData.agentUri },
      });

      if (existing) {
        skipped.agents++;
        continue;
      }

      // Resolve or create owner user
      let ownerUserId = agentData.ownerUserId;
      if (!ownerUserId && agentData.owner?.email) {
        const existingUser = await db.user.findUnique({
          where: { email: agentData.owner.email },
        });
        if (existingUser) {
          ownerUserId = existingUser.id;
        } else {
          const newUser = await db.user.create({
            data: {
              email: agentData.owner.email,
              name: agentData.owner.name || agentData.owner.email.split('@')[0],
              passwordHash: 'import-no-login',
            },
          });
          ownerUserId = newUser.id;
        }
      }

      if (!ownerUserId) {
        // Use default user
        const defaultUser = await db.user.findUnique({
          where: { email: 'default@agentdnai.io' },
        });
        if (defaultUser) {
          ownerUserId = defaultUser.id;
        } else {
          const newUser = await db.user.create({
            data: {
              email: 'default@agentdnai.io',
              name: 'Default User',
              passwordHash: 'import-no-login',
            },
          });
          ownerUserId = newUser.id;
        }
      }

      // Verify owner exists
      const ownerExists = await db.user.findUnique({ where: { id: ownerUserId } });
      if (!ownerExists) {
        errors.push(`Agent "${agentData.agentUri}": owner user "${ownerUserId}" not found, skipping`);
        continue;
      }

      try {
        // Create the agent
        const agent = await db.agentIdentity.create({
          data: {
            agentUri: agentData.agentUri,
            name: agentData.name,
            description: agentData.description || null,
            runtime: agentData.runtime,
            publicKey: agentData.publicKey,
            status: agentData.status || 'ACTIVE',
            ownerUserId,
          },
        });

        imported.agents++;

        // Create permissions
        if (Array.isArray(agentData.permissions)) {
          for (const perm of agentData.permissions) {
            if (!perm.scope || typeof perm.scope !== 'string') {
              errors.push(`Agent "${agentData.agentUri}": permission missing "scope", skipping`);
              continue;
            }

            try {
              await db.agentPermission.create({
                data: {
                  agentId: agent.id,
                  scope: perm.scope,
                  resource: perm.resource || null,
                  effect: perm.effect || 'ALLOW',
                  expiresAt: perm.expiresAt ? new Date(perm.expiresAt) : null,
                  createdByUserId: ownerUserId,
                },
              });
              imported.permissions++;
            } catch (permError) {
              errors.push(
                `Agent "${agentData.agentUri}": failed to import permission "${perm.scope}" - ${permError instanceof Error ? permError.message : 'unknown error'}`
              );
            }
          }
        }

        // Create tokens
        if (Array.isArray(agentData.tokens)) {
          for (const tok of agentData.tokens) {
            if (!tok.tokenHash || typeof tok.tokenHash !== 'string') {
              errors.push(`Agent "${agentData.agentUri}": token missing "tokenHash", skipping`);
              continue;
            }
            if (!tok.expiresAt || typeof tok.expiresAt !== 'string') {
              errors.push(`Agent "${agentData.agentUri}": token missing "expiresAt", skipping`);
              continue;
            }

            try {
              await db.agentToken.create({
                data: {
                  agentId: agent.id,
                  tokenHash: tok.tokenHash,
                  scopes: tok.scopes || '[]',
                  expiresAt: new Date(tok.expiresAt),
                  revokedAt: tok.revokedAt ? new Date(tok.revokedAt) : null,
                  lastUsedAt: tok.lastUsedAt ? new Date(tok.lastUsedAt) : null,
                },
              });
              imported.tokens++;
            } catch (tokError) {
              errors.push(
                `Agent "${agentData.agentUri}": failed to import token - ${tokError instanceof Error ? tokError.message : 'unknown error'}`
              );
            }
          }
        }
      } catch (agentError) {
        errors.push(
          `Failed to import agent "${agentData.agentUri}" - ${agentError instanceof Error ? agentError.message : 'unknown error'}`
        );
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('Error importing data:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    );
  }
}
