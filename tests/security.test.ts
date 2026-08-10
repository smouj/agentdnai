import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createAuditEvent, AUDIT_EVENTS } from '@/lib/audit';
import { issueToken } from '@/lib/tokens';
import { GET as listAgents } from '@/app/api/agents/route';
import { GET as getAgent } from '@/app/api/agents/[id]/route';
import { POST as pauseAgent } from '@/app/api/agents/[id]/pause/route';
import { GET as listAudit } from '@/app/api/audit/route';
import { GET as exportData } from '@/app/api/export/route';
import { POST as issueTokenRoute } from '@/app/api/tokens/issue/route';
import { POST as authzCheck } from '@/app/api/authz/check/route';

const TEST_URL = 'http://localhost';

function request(
  path: string,
  token?: string,
  init: RequestInit = {}
): NextRequest {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  return new NextRequest(`${TEST_URL}${path}`, {
    method: init.method,
    body: init.body,
    headers,
  });
}

async function json(response: Response) {
  return response.json();
}

async function resetDb() {
  await db.auditEvent.deleteMany();
  await db.authorizationDecision.deleteMany();
  await db.approvalRequest.deleteMany();
  await db.agentToken.deleteMany();
  await db.agentPermission.deleteMany();
  await db.agentIdentity.deleteMany();
  await db.session.deleteMany();
  await db.organizationMember.deleteMany();
  await db.organization.deleteMany();
  await db.apiKey.deleteMany();
  await db.user.deleteMany();
}

async function createFixture() {
  const [userA, userB] = await Promise.all([
    db.user.create({
      data: {
        email: 'a@example.com',
        name: 'User A',
        passwordHash: 'seed-only-no-login',
      },
    }),
    db.user.create({
      data: {
        email: 'b@example.com',
        name: 'User B',
        passwordHash: 'seed-only-no-login',
      },
    }),
  ]);

  const [sessionA, sessionB] = await Promise.all([
    db.session.create({
      data: {
        userId: userA.id,
        token: 'sess_user_a',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    }),
    db.session.create({
      data: {
        userId: userB.id,
        token: 'sess_user_b',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    }),
  ]);

  const [agentA, agentB] = await Promise.all([
    db.agentIdentity.create({
      data: {
        agentUri: 'agent://a/codex/alpha',
        name: 'Alpha',
        runtime: 'codex',
        publicKey: 'public-key-a',
        ownerUserId: userA.id,
      },
    }),
    db.agentIdentity.create({
      data: {
        agentUri: 'agent://b/codex/bravo',
        name: 'Bravo',
        runtime: 'codex',
        publicKey: 'public-key-b',
        ownerUserId: userB.id,
      },
    }),
  ]);

  return { userA, userB, sessionA, sessionB, agentA, agentB };
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await resetDb();
  await db.$disconnect();
});

describe('multi-tenant boundaries', () => {
  test('user A does not list user B agents', async () => {
    const { sessionA, agentA, agentB } = await createFixture();

    const response = await listAgents(request('/api/agents', sessionA.token));
    const body = await json(response);
    const ids = body.map((agent: { id: string }) => agent.id);

    expect(response.status).toBe(200);
    expect(ids).toContain(agentA.id);
    expect(ids).not.toContain(agentB.id);
  });

  test('user A cannot read or mutate user B agent', async () => {
    const { sessionA, agentB } = await createFixture();

    const readResponse = await getAgent(
      request(`/api/agents/${agentB.id}`, sessionA.token),
      { params: Promise.resolve({ id: agentB.id }) }
    );
    const pauseResponse = await pauseAgent(
      request(`/api/agents/${agentB.id}/pause`, sessionA.token, {
        method: 'POST',
        body: JSON.stringify({ reason: 'cross tenant attempt' }),
      }),
      { params: Promise.resolve({ id: agentB.id }) }
    );

    expect(readResponse.status).toBe(403);
    expect(pauseResponse.status).toBe(403);
  });

  test('user A cannot issue tokens for user B agent', async () => {
    const { sessionA, agentB } = await createFixture();

    const response = await issueTokenRoute(
      request('/api/tokens/issue', sessionA.token, {
        method: 'POST',
        body: JSON.stringify({
          agentId: agentB.id,
          scopes: ['github.repo.read'],
          ttlSeconds: 3600,
          createdBy: 'forged-user-id',
        }),
      })
    );

    expect(response.status).toBe(403);
  });

  test('user A audit and export do not include user B data', async () => {
    const { sessionA, agentA, agentB, userB } = await createFixture();

    await createAuditEvent({
      eventType: AUDIT_EVENTS.AGENT_CREATED,
      actorType: 'user',
      actorId: userB.id,
      agentId: agentB.id,
      action: 'agent.create',
    });
    await createAuditEvent({
      eventType: AUDIT_EVENTS.AGENT_CREATED,
      actorType: 'user',
      actorId: sessionA.userId,
      agentId: agentA.id,
      action: 'agent.create',
    });

    const auditResponse = await listAudit(request('/api/audit', sessionA.token));
    const auditBody = await json(auditResponse);
    const auditAgentIds = auditBody.events.map((event: { agentId: string | null }) => event.agentId);

    const exportResponse = await exportData(request('/api/export', sessionA.token));
    const exportBody = await json(exportResponse);
    const exportedAgentIds = exportBody.agents.map((agent: { id: string }) => agent.id);

    expect(auditResponse.status).toBe(200);
    expect(auditAgentIds).toContain(agentA.id);
    expect(auditAgentIds).not.toContain(agentB.id);
    expect(exportResponse.status).toBe(200);
    expect(exportedAgentIds).toContain(agentA.id);
    expect(exportedAgentIds).not.toContain(agentB.id);
    expect(JSON.stringify(exportBody)).not.toContain('tokenHash');
  });
});

describe('agent token authorization', () => {
  test('client-provided invented scopes are ignored', async () => {
    const { userA, agentA } = await createFixture();

    await db.agentPermission.create({
      data: {
        agentId: agentA.id,
        scope: 'filesystem.delete',
        effect: 'ALLOW',
        createdByUserId: userA.id,
      },
    });
    const issued = await issueToken({
      agentId: agentA.id,
      scopes: ['github.repo.read'],
      ttlSeconds: 3600,
      createdBy: userA.id,
    });

    const response = await authzCheck(
      request('/api/authz/check', issued.token, {
        method: 'POST',
        body: JSON.stringify({
          agentId: agentA.id,
          action: 'filesystem.delete',
          tokenScopes: ['filesystem.*'],
        }),
      })
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.allowed).toBe(false);
    expect(body.decision).toBe('insufficient_scope');
  });

  test('expired and revoked tokens do not authorize', async () => {
    const { userA, agentA } = await createFixture();

    await db.agentPermission.create({
      data: {
        agentId: agentA.id,
        scope: 'github.repo.read',
        effect: 'ALLOW',
        createdByUserId: userA.id,
      },
    });

    const expired = await issueToken({
      agentId: agentA.id,
      scopes: ['github.repo.read'],
      ttlSeconds: 3600,
      createdBy: userA.id,
    });
    await db.agentToken.update({
      where: { id: expired.tokenId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const revoked = await issueToken({
      agentId: agentA.id,
      scopes: ['github.repo.read'],
      ttlSeconds: 3600,
      createdBy: userA.id,
    });
    await db.agentToken.update({
      where: { id: revoked.tokenId },
      data: { revokedAt: new Date() },
    });

    const expiredResponse = await authzCheck(
      request('/api/authz/check', expired.token, {
        method: 'POST',
        body: JSON.stringify({ action: 'github.repo.read' }),
      })
    );
    const revokedResponse = await authzCheck(
      request('/api/authz/check', revoked.token, {
        method: 'POST',
        body: JSON.stringify({ action: 'github.repo.read' }),
      })
    );

    expect(expiredResponse.status).toBe(401);
    expect((await json(expiredResponse)).decision).toBe('token_expired');
    expect(revokedResponse.status).toBe(401);
    expect((await json(revokedResponse)).decision).toBe('token_invalid');
  });

  test('DENY overrides ALLOW and destructive actions require approval', async () => {
    const { userA, agentA } = await createFixture();

    await db.agentPermission.createMany({
      data: [
        {
          agentId: agentA.id,
          scope: 'github.*',
          effect: 'ALLOW',
          createdByUserId: userA.id,
        },
        {
          agentId: agentA.id,
          scope: 'github.repo.delete',
          effect: 'DENY',
          createdByUserId: userA.id,
        },
        {
          agentId: agentA.id,
          scope: 'filesystem.delete',
          effect: 'ALLOW',
          createdByUserId: userA.id,
        },
      ],
    });

    const issued = await issueToken({
      agentId: agentA.id,
      scopes: ['github.*', 'filesystem.delete'],
      ttlSeconds: 3600,
      createdBy: userA.id,
    });

    const deniedResponse = await authzCheck(
      request('/api/authz/check', issued.token, {
        method: 'POST',
        body: JSON.stringify({ action: 'github.repo.delete' }),
      })
    );
    const destructiveResponse = await authzCheck(
      request('/api/authz/check', issued.token, {
        method: 'POST',
        body: JSON.stringify({ action: 'filesystem.delete' }),
      })
    );

    const deniedBody = await json(deniedResponse);
    const destructiveBody = await json(destructiveResponse);

    expect(deniedBody.allowed).toBe(false);
    expect(deniedBody.decision).toBe('deny');
    expect(destructiveBody.allowed).toBe(false);
    expect(destructiveBody.decision).toBe('requires_approval');
  });
});
