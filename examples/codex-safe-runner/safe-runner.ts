/**
 * Codex Safe Runner - AgentDNAI Policy Enforcement Example
 *
 * This example shows how to build a safe runner for Codex agents that
 * enforces AgentDNAI policies before executing any action.
 *
 * The runner:
 *   1. Loads a policy from policy.json
 *   2. Creates or resolves an agent in AgentDNAI
 *   3. Wraps every agent action with an authorization check
 *   4. Auto-approves safe actions and blocks/reports dangerous ones
 *   5. Maintains an audit trail of all actions
 *
 * Usage:
 *   AGENTDNAI_URL=http://localhost:3000 \
 *   AGENTDNAI_TOKEN=sess_xxx \
 *   bun run examples/codex-safe-runner/safe-runner.ts
 */

import { AgentDNAIClient } from '../../packages/sdk/index';
import policy from './policy.json';

// ── Configuration ──────────────────────────────────────────────────────────────

const AGENTDNAI_URL = process.env.AGENTDNAI_URL || policy.policy?.defaultDecision || 'http://localhost:3000';
const AGENTDNAI_TOKEN = process.env.AGENTDNAI_TOKEN || '';
const AGENT_ID = process.env.AGENTDNAI_AGENT_ID || '';

if (!AGENTDNAI_TOKEN) {
  console.error('❌ AGENTDNAI_TOKEN environment variable is required');
  process.exit(1);
}

const client = new AgentDNAIClient({
  baseUrl: AGENTDNAI_URL,
  token: AGENTDNAI_TOKEN,
});

// ── Session State ──────────────────────────────────────────────────────────────

interface SessionState {
  actionCount: number;
  startTime: number;
  blockedActions: string[];
  allowedActions: string[];
  approvalNeededActions: string[];
}

const session: SessionState = {
  actionCount: 0,
  startTime: Date.now(),
  blockedActions: [],
  allowedActions: [],
  approvalNeededActions: [],
};

// ── Policy Enforcement ─────────────────────────────────────────────────────────

const MAX_ACTIONS = policy.policy?.maxActionsPerSession || 100;
const SESSION_TIMEOUT = (policy.policy?.sessionTimeoutMinutes || 60) * 60 * 1000;
const AUTO_APPROVE = new Set(policy.policy?.autoApproveFor || []);
const REQUIRE_APPROVAL = new Set(policy.policy?.requireApprovalFor || []);

/**
 * Check if the session is still valid
 */
function isSessionValid(): boolean {
  const elapsed = Date.now() - session.startTime;
  if (elapsed > SESSION_TIMEOUT) {
    console.error('❌ Session has timed out. Please start a new session.');
    return false;
  }
  if (session.actionCount >= MAX_ACTIONS) {
    console.error(`❌ Session action limit (${MAX_ACTIONS}) reached.`);
    return false;
  }
  return true;
}

/**
 * Determine if an action should be auto-approved based on policy
 */
function isAutoApproved(action: string): boolean {
  for (const pattern of AUTO_APPROVE) {
    if (action === pattern || matchGlob(pattern, action)) {
      return true;
    }
  }
  return false;
}

/**
 * Determine if an action requires approval based on policy
 */
function isApprovalRequired(action: string): boolean {
  for (const pattern of REQUIRE_APPROVAL) {
    if (action === pattern || matchGlob(pattern, action)) {
      return true;
    }
  }
  return false;
}

/**
 * Simple glob matching - supports * wildcard
 */
function matchGlob(pattern: string, str: string): boolean {
  const regexStr = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(str);
}

/**
 * Safe action wrapper - enforces policy before executing an action
 */
async function safeAction<T>(
  action: string,
  resource: string,
  executor: () => Promise<T>
): Promise<T | null> {
  // Step 1: Session check
  if (!isSessionValid()) {
    return null;
  }

  // Step 2: Local policy check (fast path)
  if (isAutoApproved(action)) {
    console.log(`⚡ Auto-approved: ${action} on ${resource}`);
    session.actionCount++;
    session.allowedActions.push(action);
    return executor();
  }

  if (isApprovalRequired(action)) {
    console.warn(`⚠️  Approval required for: ${action} on ${resource}`);
  }

  // Step 3: Remote authorization check
  try {
    const decision = await client.authz.check({
      agentId: AGENT_ID,
      action,
      resource,
    });

    session.actionCount++;

    if (decision.allowed && decision.decision === 'allow') {
      console.log(`✅ Allowed: ${action} on ${resource}`);
      session.allowedActions.push(action);
      return executor();
    } else if (decision.decision === 'requires_approval') {
      console.warn(`🔒 Blocked (needs approval): ${action} - ${decision.reason}`);
      session.approvalNeededActions.push(action);
      return null;
    } else {
      console.error(`❌ Denied: ${action} on ${resource} - ${decision.reason}`);
      session.blockedActions.push(action);
      return null;
    }
  } catch (err) {
    // On error, deny by default (fail-closed)
    console.error(`❌ Authorization check failed for ${action}: ${(err as Error).message}`);
    session.blockedActions.push(action);
    return null;
  }
}

// ── Session Report ─────────────────────────────────────────────────────────────

function printSessionReport(): void {
  const elapsed = Math.round((Date.now() - session.startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  console.log('\n' + '═'.repeat(60));
  console.log('  Session Report');
  console.log('═'.repeat(60));
  console.log(`  Duration:          ${minutes}m ${seconds}s`);
  console.log(`  Total actions:     ${session.actionCount}`);
  console.log(`  Allowed:           ${session.allowedActions.length}`);
  console.log(`  Blocked:           ${session.blockedActions.length}`);
  console.log(`  Needs approval:    ${session.approvalNeededActions.length}`);

  if (session.blockedActions.length > 0) {
    console.log(`\n  Blocked actions:`);
    for (const a of session.blockedActions) {
      console.log(`    ❌ ${a}`);
    }
  }

  if (session.approvalNeededActions.length > 0) {
    console.log(`\n  Actions requiring approval:`);
    for (const a of session.approvalNeededActions) {
      console.log(`    ⚠️  ${a}`);
    }
  }

  console.log('');
}

// ── Example Run ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔒 Codex Safe Runner with AgentDNAI\n');
  console.log(`   Policy: default=${policy.policy?.defaultDecision || 'DENY'}`);
  console.log(`   Max actions: ${MAX_ACTIONS}`);
  console.log(`   Session timeout: ${SESSION_TIMEOUT / 60000}m\n`);

  // Simulate a series of agent actions
  const actions = [
    { action: 'github.repo.read', resource: 'org/repo', fn: async () => 'repository data' },
    { action: 'github.issue.read', resource: 'org/repo#123', fn: async () => 'issue data' },
    { action: 'github.issue.create', resource: 'org/repo', fn: async () => 'issue created' },
    { action: 'production.deploy', resource: 'prod-cluster', fn: async () => 'deployed!' },
    { action: 'secrets.read', resource: 'vault/api-keys', fn: async () => 'secret value' },
    { action: 'server.command.exec', resource: 'prod-server-01', fn: async () => 'command output' },
  ];

  for (const { action, resource, fn } of actions) {
    const result = await safeAction(action, resource, fn);
    if (result !== null) {
      console.log(`   → Result: ${result}`);
    }
  }

  printSessionReport();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
