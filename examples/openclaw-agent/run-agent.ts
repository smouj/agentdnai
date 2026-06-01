/**
 * OpenClaw Agent - AgentDNAI Integration Example
 *
 * This example demonstrates how to integrate AgentDNAI with an OpenClaw agent
 * to enforce authorization checks before every action the agent performs.
 *
 * Setup:
 *   1. Set AGENTDNAI_URL to your AgentDNAI server URL
 *   2. Set AGENTDNAI_TOKEN to a valid session or API token
 *   3. Set AGENTDNAI_AGENT_ID to your agent's ID
 *
 * Usage:
 *   bun run examples/openclaw-agent/run-agent.ts
 */

import { AgentDNAIClient } from '../../packages/sdk/index';

// ── Configuration ──────────────────────────────────────────────────────────────

const AGENTDNAI_URL = process.env.AGENTDNAI_URL || 'http://localhost:3000';
const AGENTDNAI_TOKEN = process.env.AGENTDNAI_TOKEN || '';
const AGENTDNAI_AGENT_ID = process.env.AGENTDNAI_AGENT_ID || '';

if (!AGENTDNAI_TOKEN) {
  console.error('❌ AGENTDNAI_TOKEN environment variable is required');
  process.exit(1);
}

if (!AGENTDNAI_AGENT_ID) {
  console.error('❌ AGENTDNAI_AGENT_ID environment variable is required');
  process.exit(1);
}

// ── Client Setup ───────────────────────────────────────────────────────────────

const client = new AgentDNAIClient({
  baseUrl: AGENTDNAI_URL,
  token: AGENTDNAI_TOKEN,
});

// ── Authorization Middleware ───────────────────────────────────────────────────

/**
 * Check authorization before performing an action.
 * Throws an error if the action is denied.
 * Returns the decision for further processing (e.g., requires_approval).
 */
async function beforeAction(action: string, resource?: string) {
  console.log(`🔍 Checking authorization: ${action}${resource ? ` on ${resource}` : ''}`);

  const decision = await client.authz.check({
    agentId: AGENTDNAI_AGENT_ID,
    action,
    resource,
  });

  if (!decision.allowed) {
    if (decision.decision === 'REQUIRES_APPROVAL') {
      console.warn(`⚠️  Action "${action}" requires human approval: ${decision.reason}`);
    } else {
      console.error(`❌ Action "${action}" is denied: ${decision.reason}`);
    }
    throw new Error(`Action blocked: ${decision.reason}`);
  }

  console.log(`✅ Action "${action}" is allowed`);
  return decision;
}

/**
 * Batch check multiple actions at once.
 * Useful for pre-flight checks before a complex operation.
 */
async function preflightCheck(actions: string[], resource?: string) {
  console.log(`🔍 Batch checking ${actions.length} actions...`);

  const result = await client.authz.batchCheck({
    agentId: AGENTDNAI_AGENT_ID,
    actions,
    resource,
  });

  const allowed = result.results.filter(r => r.decision === 'ALLOW');
  const denied = result.results.filter(r => r.decision === 'DENY');
  const needsApproval = result.results.filter(r => r.decision === 'REQUIRES_APPROVAL');

  console.log(`  ✅ ${allowed.length} allowed, ❌ ${denied.length} denied, ⚠️  ${needsApproval.length} need approval`);

  return result;
}

// ── Example Agent Loop ─────────────────────────────────────────────────────────

async function main() {
  console.log('\n🤖 OpenClaw Agent with AgentDNAI Integration\n');
  console.log(`   Server:  ${AGENTDNAI_URL}`);
  console.log(`   Agent:   ${AGENTDNAI_AGENT_ID}\n`);

  // Step 1: Verify server connectivity
  try {
    const health = await client.health.check();
    console.log(`✅ Server is healthy: ${health.status}\n`);
  } catch (err) {
    console.error(`❌ Cannot reach AgentDNAI server: ${(err as Error).message}`);
    process.exit(1);
  }

  // Step 2: Get agent details
  try {
    const agent = await client.agents.get(AGENTDNAI_AGENT_ID);
    console.log(`📋 Agent: ${agent.name} (${agent.status})`);
    console.log(`   Runtime: ${agent.runtime}`);
    console.log(`   URI: ${agent.agentUri}\n`);
  } catch (err) {
    console.error(`❌ Cannot fetch agent: ${(err as Error).message}`);
    process.exit(1);
  }

  // Step 3: Demonstrate authorization checks
  const testActions = [
    { action: 'github.repo.read', resource: 'org/repo' },
    { action: 'github.repo.write', resource: 'org/repo' },
    { action: 'production.deploy', resource: 'prod-cluster' },
    { action: 'secrets.read', resource: 'vault/api-keys' },
    { action: 'server.command.exec', resource: 'prod-server-01' },
  ];

  console.log('━'.repeat(60));
  console.log('  Authorization Checks');
  console.log('━'.repeat(60) + '\n');

  for (const { action, resource } of testActions) {
    try {
      await beforeAction(action, resource);
    } catch {
      // Action was denied or needs approval - continue
    }
  }

  // Step 4: Batch preflight check
  console.log('\n' + '━'.repeat(60));
  console.log('  Batch Preflight Check');
  console.log('━'.repeat(60) + '\n');

  await preflightCheck(
    ['github.repo.read', 'github.issue.create', 'github.pr.review'],
    'org/repo'
  );

  // Step 5: Audit trail
  console.log('\n' + '━'.repeat(60));
  console.log('  Recent Audit Events');
  console.log('━'.repeat(60) + '\n');

  try {
    const events = await client.audit.list({ agentId: AGENTDNAI_AGENT_ID, limit: 5 });
    for (const event of events) {
      const time = new Date(event.createdAt).toLocaleString();
      console.log(`  [${time}] ${event.eventType} - ${event.decision || 'N/A'}`);
    }
  } catch (err) {
    console.log(`  Could not fetch audit events: ${(err as Error).message}`);
  }

  console.log('\n✅ Agent loop complete.\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
