import { requireAuth } from '@/lib/ownership';
import { ApiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateKeyPair, generateAgentUri, generateToken, hashToken } from '@/lib/crypto';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';

/**
 * POST /api/seed - Create demo data if none exists
 */
export async function POST(_request: NextRequest) {
  try {
    await requireAuth(_request);
    // Check if agents already exist
    const existingAgents = await db.agentIdentity.count();
    if (existingAgents > 0) {
      return NextResponse.json({ message: 'Demo data already exists', agents: existingAgents }, { status: 200 });
    }

    // Get or create default user
    let user = await db.user.findUnique({ where: { email: 'default@agentdnai.io' } });
    if (!user) {
      user = await db.user.create({
        data: { email: 'default@agentdnai.io', name: 'Default User', passwordHash: 'seed-only-no-login' },
      });
    }

    const owner = 'user';
    let agentCount = 0;
    let tokenCount = 0;
    let decisionCount = 0;

    // 1. hermes-auditor (ACTIVE, hermes) - Audit Agent template permissions
    const keyPair1 = generateKeyPair();
    const agent1 = await db.agentIdentity.create({
      data: {
        agentUri: generateAgentUri(owner, 'hermes', 'hermes-auditor'),
        name: 'hermes-auditor',
        description: 'Audit agent for repository and log analysis',
        runtime: 'hermes',
        publicKey: keyPair1.publicKey,
        fingerprint: keyPair1.fingerprint,
        status: 'ACTIVE',
        ownerUserId: user.id,
      },
    });
    agentCount++;

    // Grant audit template permissions
    const auditPerms = ['github.repo.read', 'github.issue.read', 'github.pull_request.read', 'server.logs.read', 'database.read'];
    for (const scope of auditPerms) {
      await db.agentPermission.create({
        data: {
          agentId: agent1.id,
          scope,
          resource: '*',
          effect: 'ALLOW',
          createdByUserId: user.id,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        },
      });
    }
    // Deny dangerous permissions
    for (const scope of ['filesystem.write', 'server.command.run', 'secrets.read']) {
      await db.agentPermission.create({
        data: {
          agentId: agent1.id,
          scope,
          resource: '*',
          effect: 'DENY',
          createdByUserId: user.id,
        },
      });
    }

    // Issue 2 tokens for hermes-auditor
    const token1 = generateToken('adni');
    await db.agentToken.create({
      data: {
        agentId: agent1.id,
        tokenHash: hashToken(token1),
        scopes: JSON.stringify(['github.repo.read', 'server.logs.read']),
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });
    tokenCount++;

    const token2 = generateToken('adni');
    await db.agentToken.create({
      data: {
        agentId: agent1.id,
        tokenHash: hashToken(token2),
        scopes: JSON.stringify(['github.issue.read', 'database.read']),
        expiresAt: new Date(Date.now() + 7200 * 1000),
      },
    });
    tokenCount++;

    // 2. codex-builder (ACTIVE, codex) - Safe Builder template permissions
    const keyPair2 = generateKeyPair();
    const agent2 = await db.agentIdentity.create({
      data: {
        agentUri: generateAgentUri(owner, 'codex', 'codex-builder'),
        name: 'codex-builder',
        description: 'Safe builder agent for feature development',
        runtime: 'codex',
        publicKey: keyPair2.publicKey,
        fingerprint: keyPair2.fingerprint,
        status: 'ACTIVE',
        ownerUserId: user.id,
      },
    });
    agentCount++;

    const builderPerms = ['github.repo.read', 'github.issue.create', 'github.pull_request.create', 'filesystem.read', 'filesystem.write'];
    for (const scope of builderPerms) {
      await db.agentPermission.create({
        data: {
          agentId: agent2.id,
          scope,
          resource: '*',
          effect: 'ALLOW',
          createdByUserId: user.id,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });
    }
    for (const scope of ['filesystem.delete', 'server.command.sudo', 'secrets.read']) {
      await db.agentPermission.create({
        data: {
          agentId: agent2.id,
          scope,
          resource: '*',
          effect: 'DENY',
          createdByUserId: user.id,
        },
      });
    }

    // 3. staging-ops (PAUSED, automation) - Staging Operator template permissions
    const keyPair3 = generateKeyPair();
    const agent3 = await db.agentIdentity.create({
      data: {
        agentUri: generateAgentUri(owner, 'automation', 'staging-ops'),
        name: 'staging-ops',
        description: 'Staging deployment operator - currently paused for review',
        runtime: 'automation',
        publicKey: keyPair3.publicKey,
        fingerprint: keyPair3.fingerprint,
        status: 'PAUSED',
        ownerUserId: user.id,
      },
    });
    agentCount++;

    const stagingPerms = ['github.repo.read', 'server.logs.read', 'server.deploy.staging', 'server.service.restart'];
    for (const scope of stagingPerms) {
      await db.agentPermission.create({
        data: {
          agentId: agent3.id,
          scope,
          resource: '*',
          effect: 'ALLOW',
          createdByUserId: user.id,
        },
      });
    }
    for (const scope of ['server.deploy.production', 'production.read', 'secrets.read']) {
      await db.agentPermission.create({
        data: {
          agentId: agent3.id,
          scope,
          resource: '*',
          effect: 'DENY',
          createdByUserId: user.id,
        },
      });
    }

    // 4. openclaw-reader (ACTIVE, openclaw) - Read Only template permissions
    const keyPair4 = generateKeyPair();
    const agent4 = await db.agentIdentity.create({
      data: {
        agentUri: generateAgentUri(owner, 'openclaw', 'openclaw-reader'),
        name: 'openclaw-reader',
        description: 'Read-only agent for monitoring and reporting',
        runtime: 'openclaw',
        publicKey: keyPair4.publicKey,
        fingerprint: keyPair4.fingerprint,
        status: 'ACTIVE',
        ownerUserId: user.id,
      },
    });
    agentCount++;

    const readOnlyPerms = ['github.repo.read', 'github.issue.read', 'filesystem.read', 'server.logs.read'];
    for (const scope of readOnlyPerms) {
      await db.agentPermission.create({
        data: {
          agentId: agent4.id,
          scope,
          resource: '*',
          effect: 'ALLOW',
          createdByUserId: user.id,
        },
      });
    }

    // 5. old-agent (REVOKED, cli) - No permissions
    const keyPair5 = generateKeyPair();
    const agent5 = await db.agentIdentity.create({
      data: {
        agentUri: generateAgentUri(owner, 'cli', 'old-agent'),
        name: 'old-agent',
        description: 'Legacy CLI agent - revoked due to security concerns',
        runtime: 'cli',
        publicKey: keyPair5.publicKey,
        fingerprint: keyPair5.fingerprint,
        status: 'REVOKED',
        ownerUserId: user.id,
        revokedAt: new Date(),
      },
    });
    agentCount++;

    // Create audit events for agent creations
    for (const agent of [agent1, agent2, agent3, agent4, agent5]) {
      await createAuditEvent({
        eventType: AUDIT_EVENTS.AGENT_CREATED,
        actorType: 'user',
        actorId: user.id,
        agentId: agent.id,
        action: 'agent.create',
        metadata: { name: agent.name, runtime: agent.runtime, agentUri: agent.agentUri },
      });
    }

    // Create authorization decisions (allow, deny, requires_approval)
    await createAuditEvent({
      eventType: AUDIT_EVENTS.AUTHZ_ALLOW,
      actorType: 'agent',
      agentId: agent1.id,
      action: 'github.repo.read',
      resource: 'github.com/org/repo',
      decision: 'allow',
    });
    decisionCount++;

    await createAuditEvent({
      eventType: AUDIT_EVENTS.AUTHZ_DENY,
      actorType: 'agent',
      agentId: agent1.id,
      action: 'secrets.read',
      resource: 'vault://prod/secrets',
      decision: 'deny',
    });
    decisionCount++;

    await createAuditEvent({
      eventType: AUDIT_EVENTS.AUTHZ_REQUIRES_APPROVAL,
      actorType: 'agent',
      agentId: agent2.id,
      action: 'github.pull_request.merge',
      resource: 'github.com/org/repo/pull/42',
      decision: 'requires_approval',
    });
    decisionCount++;

    await createAuditEvent({
      eventType: AUDIT_EVENTS.AUTHZ_ALLOW,
      actorType: 'agent',
      agentId: agent2.id,
      action: 'filesystem.read',
      resource: '/workspace/src',
      decision: 'allow',
    });
    decisionCount++;

    await createAuditEvent({
      eventType: AUDIT_EVENTS.AUTHZ_DENY,
      actorType: 'agent',
      agentId: agent5.id,
      action: 'github.repo.read',
      resource: 'github.com/org/repo',
      decision: 'deny',
    });
    decisionCount++;

    // Create authorization decision records
    await db.authorizationDecision.createMany({
      data: [
        { agentId: agent1.id, action: 'github.repo.read', resource: 'github.com/org/repo', decision: 'allow', reason: 'Explicit permission found' },
        { agentId: agent1.id, action: 'secrets.read', resource: 'vault://prod/secrets', decision: 'deny', reason: 'Explicit deny rule found' },
        { agentId: agent2.id, action: 'github.pull_request.merge', resource: 'github.com/org/repo/pull/42', decision: 'requires_approval', reason: 'Production action requires human approval' },
        { agentId: agent2.id, action: 'filesystem.read', resource: '/workspace/src', decision: 'allow', reason: 'Explicit permission found' },
        { agentId: agent5.id, action: 'github.repo.read', resource: 'github.com/org/repo', decision: 'deny', reason: 'Agent is revoked' },
      ],
    });

    return NextResponse.json({
      message: 'Demo data created successfully',
      agents: agentCount,
      tokens: tokenCount,
      decisions: decisionCount,
    }, { status: 200 });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error('Error seeding demo data:', error);
    return NextResponse.json(
      { error: 'Failed to seed demo data' },
      { status: 500 }
    );
  }
}
