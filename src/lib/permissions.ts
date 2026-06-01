/**
 * AgentDNAI Permission Catalog
 * 
 * Defines all available permissions, their categories, and templates.
 * Production permissions always require human approval.
 */

export interface PermissionDef {
  scope: string;
  category: string;
  label: string;
  description: string;
  requiresApproval: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  denied: string[];
}

// ─── Permission Categories ────────────────────────────────────────────────────

export const PERMISSION_CATEGORIES = [
  'github',
  'filesystem',
  'server',
  'database',
  'browser',
  'secrets',
  'email',
  'payments',
  'production',
] as const;

export type PermissionCategory = (typeof PERMISSION_CATEGORIES)[number];

// ─── Full Permission Catalog ──────────────────────────────────────────────────

export const PERMISSIONS: PermissionDef[] = [
  // GitHub
  { scope: 'github.repo.read', category: 'github', label: 'Read Repositories', description: 'Read repository contents and metadata', requiresApproval: false, riskLevel: 'low' },
  { scope: 'github.repo.write', category: 'github', label: 'Write Repositories', description: 'Push changes to repositories', requiresApproval: false, riskLevel: 'medium' },
  { scope: 'github.issue.read', category: 'github', label: 'Read Issues', description: 'Read issues and comments', requiresApproval: false, riskLevel: 'low' },
  { scope: 'github.issue.create', category: 'github', label: 'Create Issues', description: 'Create new issues', requiresApproval: false, riskLevel: 'low' },
  { scope: 'github.pull_request.read', category: 'github', label: 'Read Pull Requests', description: 'Read pull requests and reviews', requiresApproval: false, riskLevel: 'low' },
  { scope: 'github.pull_request.create', category: 'github', label: 'Create Pull Requests', description: 'Create new pull requests', requiresApproval: false, riskLevel: 'medium' },
  { scope: 'github.pull_request.merge', category: 'github', label: 'Merge Pull Requests', description: 'Merge pull requests', requiresApproval: true, riskLevel: 'high' },
  { scope: 'github.secret.read', category: 'github', label: 'Read Secrets', description: 'Read repository secrets', requiresApproval: true, riskLevel: 'critical' },
  { scope: 'github.workflow.read', category: 'github', label: 'Read Workflows', description: 'Read workflow definitions', requiresApproval: false, riskLevel: 'low' },
  { scope: 'github.workflow.run', category: 'github', label: 'Run Workflows', description: 'Trigger workflow runs', requiresApproval: true, riskLevel: 'high' },

  // Filesystem
  { scope: 'filesystem.read', category: 'filesystem', label: 'Read Files', description: 'Read file contents', requiresApproval: false, riskLevel: 'low' },
  { scope: 'filesystem.write', category: 'filesystem', label: 'Write Files', description: 'Write or modify files', requiresApproval: false, riskLevel: 'medium' },
  { scope: 'filesystem.delete', category: 'filesystem', label: 'Delete Files', description: 'Delete files', requiresApproval: true, riskLevel: 'high' },
  { scope: 'filesystem.rename', category: 'filesystem', label: 'Rename Files', description: 'Rename or move files', requiresApproval: false, riskLevel: 'medium' },
  { scope: 'filesystem.execute', category: 'filesystem', label: 'Execute Files', description: 'Execute files or scripts', requiresApproval: true, riskLevel: 'critical' },

  // Server
  { scope: 'server.logs.read', category: 'server', label: 'Read Logs', description: 'Read server logs', requiresApproval: false, riskLevel: 'low' },
  { scope: 'server.command.run', category: 'server', label: 'Run Commands', description: 'Execute server commands', requiresApproval: true, riskLevel: 'high' },
  { scope: 'server.command.sudo', category: 'server', label: 'Sudo Commands', description: 'Execute commands with elevated privileges', requiresApproval: true, riskLevel: 'critical' },
  { scope: 'server.service.restart', category: 'server', label: 'Restart Services', description: 'Restart server services', requiresApproval: true, riskLevel: 'high' },
  { scope: 'server.deploy.staging', category: 'server', label: 'Deploy Staging', description: 'Deploy to staging environment', requiresApproval: false, riskLevel: 'medium' },
  { scope: 'server.deploy.production', category: 'server', label: 'Deploy Production', description: 'Deploy to production environment', requiresApproval: true, riskLevel: 'critical' },

  // Database
  { scope: 'database.read', category: 'database', label: 'Read Database', description: 'Read database contents', requiresApproval: false, riskLevel: 'low' },
  { scope: 'database.write', category: 'database', label: 'Write Database', description: 'Insert or update database records', requiresApproval: false, riskLevel: 'medium' },
  { scope: 'database.migrate', category: 'database', label: 'Run Migrations', description: 'Run database migrations', requiresApproval: true, riskLevel: 'high' },
  { scope: 'database.backup', category: 'database', label: 'Backup Database', description: 'Create database backups', requiresApproval: false, riskLevel: 'medium' },
  { scope: 'database.restore', category: 'database', label: 'Restore Database', description: 'Restore database from backup', requiresApproval: true, riskLevel: 'critical' },

  // Browser
  { scope: 'browser.open', category: 'browser', label: 'Open Browser', description: 'Open web pages', requiresApproval: false, riskLevel: 'low' },
  { scope: 'browser.read', category: 'browser', label: 'Read Pages', description: 'Read web page content', requiresApproval: false, riskLevel: 'low' },
  { scope: 'browser.click', category: 'browser', label: 'Click Elements', description: 'Click on page elements', requiresApproval: false, riskLevel: 'medium' },
  { scope: 'browser.form.submit', category: 'browser', label: 'Submit Forms', description: 'Submit web forms', requiresApproval: true, riskLevel: 'high' },
  { scope: 'browser.download', category: 'browser', label: 'Download Files', description: 'Download files from browser', requiresApproval: false, riskLevel: 'medium' },
  { scope: 'browser.upload', category: 'browser', label: 'Upload Files', description: 'Upload files through browser', requiresApproval: true, riskLevel: 'high' },

  // Secrets
  { scope: 'secrets.read', category: 'secrets', label: 'Read Secrets', description: 'Read secret values', requiresApproval: true, riskLevel: 'critical' },
  { scope: 'secrets.write', category: 'secrets', label: 'Write Secrets', description: 'Create or update secrets', requiresApproval: true, riskLevel: 'critical' },
  { scope: 'secrets.rotate', category: 'secrets', label: 'Rotate Secrets', description: 'Rotate secret values', requiresApproval: true, riskLevel: 'critical' },

  // Email
  { scope: 'email.read', category: 'email', label: 'Read Email', description: 'Read email messages', requiresApproval: false, riskLevel: 'medium' },
  { scope: 'email.draft', category: 'email', label: 'Draft Email', description: 'Create email drafts', requiresApproval: false, riskLevel: 'low' },
  { scope: 'email.send', category: 'email', label: 'Send Email', description: 'Send email messages', requiresApproval: true, riskLevel: 'high' },
  { scope: 'email.delete', category: 'email', label: 'Delete Email', description: 'Delete email messages', requiresApproval: true, riskLevel: 'high' },

  // Payments
  { scope: 'payments.read', category: 'payments', label: 'Read Payments', description: 'View payment information', requiresApproval: false, riskLevel: 'medium' },
  { scope: 'payments.create', category: 'payments', label: 'Create Payments', description: 'Initiate payments', requiresApproval: true, riskLevel: 'critical' },
  { scope: 'payments.refund', category: 'payments', label: 'Refund Payments', description: 'Process refunds', requiresApproval: true, riskLevel: 'critical' },
  { scope: 'payments.configure', category: 'payments', label: 'Configure Payments', description: 'Modify payment configuration', requiresApproval: true, riskLevel: 'critical' },

  // Production
  { scope: 'production.read', category: 'production', label: 'Read Production', description: 'Read production environment data', requiresApproval: false, riskLevel: 'medium' },
  { scope: 'production.write', category: 'production', label: 'Write Production', description: 'Modify production data', requiresApproval: true, riskLevel: 'critical' },
  { scope: 'production.deploy', category: 'production', label: 'Deploy Production', description: 'Deploy to production', requiresApproval: true, riskLevel: 'critical' },
  { scope: 'production.rollback', category: 'production', label: 'Rollback Production', description: 'Rollback production deployment', requiresApproval: true, riskLevel: 'critical' },
  { scope: 'production.secret.access', category: 'production', label: 'Access Production Secrets', description: 'Access production secrets', requiresApproval: true, riskLevel: 'critical' },
];

// ─── Permission Templates ─────────────────────────────────────────────────────

export const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'read-only',
    name: 'Read Only Agent',
    description: 'Agent with read-only access across repositories, issues, filesystem, and logs.',
    permissions: [
      'github.repo.read',
      'github.issue.read',
      'filesystem.read',
      'server.logs.read',
    ],
    denied: ['filesystem.delete', 'server.command.sudo', 'production.*', 'secrets.*'],
  },
  {
    id: 'audit',
    name: 'Audit Agent',
    description: 'Agent for auditing repositories, pull requests, logs, and databases.',
    permissions: [
      'github.repo.read',
      'github.issue.read',
      'github.pull_request.read',
      'server.logs.read',
      'database.read',
    ],
    denied: ['filesystem.write', 'server.command.run', 'secrets.*'],
  },
  {
    id: 'safe-builder',
    name: 'Safe Builder Agent',
    description: 'Agent for building features safely with read/write but no destructive operations.',
    permissions: [
      'github.repo.read',
      'github.issue.create',
      'github.pull_request.create',
      'filesystem.read',
      'filesystem.write',
    ],
    denied: ['filesystem.delete', 'server.command.sudo', 'production.*', 'secrets.*'],
  },
  {
    id: 'staging-operator',
    name: 'Staging Operator Agent',
    description: 'Agent for managing staging deployments.',
    permissions: [
      'github.repo.read',
      'server.logs.read',
      'server.deploy.staging',
      'server.service.restart',
    ],
    denied: ['server.deploy.production', 'production.*', 'secrets.*'],
  },
  {
    id: 'production-guarded',
    name: 'Production Guarded Agent',
    description: 'Agent with read access to production. All write actions require human approval.',
    permissions: [
      'production.read',
      'production.deploy',
      'production.rollback',
    ],
    denied: ['production.write', 'production.secret.access'],
  },
  {
    id: 'local-dev',
    name: 'Local Dev Agent',
    description: 'Agent for local development with read/write filesystem, terminal, and GitHub read.',
    permissions: ['github.repo.read', 'github.issue.read', 'github.pull_request.read', 'filesystem.read', 'filesystem.write', 'server.logs.read', 'database.read'],
    denied: ['filesystem.delete', 'filesystem.execute', 'server.command.sudo', 'production.*', 'secrets.*'],
  },
  {
    id: 'deploy-agent',
    name: 'Deploy Agent',
    description: 'Agent for managing deployments to staging and production.',
    permissions: ['server.deploy.staging', 'server.deploy.production', 'server.service.restart', 'server.logs.read', 'production.read'],
    denied: ['secrets.*', 'production.secret.access'],
  },
  {
    id: 'security-audit',
    name: 'Security Audit Agent',
    description: 'Agent for security auditing with read access everywhere.',
    permissions: ['github.repo.read', 'server.logs.read', 'database.read', 'production.read', 'browser.read', 'browser.open'],
    denied: ['filesystem.write', 'filesystem.delete', 'server.command.run', 'secrets.write', 'production.write'],
  },
  {
    id: 'documentation',
    name: 'Documentation Agent',
    description: 'Agent for writing documentation with safe file operations.',
    permissions: ['github.repo.read', 'github.repo.write', 'filesystem.read', 'filesystem.write', 'browser.read', 'browser.open'],
    denied: ['filesystem.delete', 'filesystem.execute', 'server.command.*', 'production.*', 'secrets.*'],
  },
  {
    id: 'full-dev-approval',
    name: 'Full Dev Agent (with approvals)',
    description: 'Agent with broad permissions but production/secrets require approval.',
    permissions: [
      'github.repo.read', 'github.repo.write', 'github.issue.create', 'github.pull_request.create', 'github.pull_request.merge',
      'filesystem.read', 'filesystem.write',
      'server.logs.read', 'server.deploy.staging',
      'database.read', 'database.write', 'database.migrate',
      'browser.open', 'browser.read',
    ],
    denied: ['filesystem.execute', 'server.command.sudo'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check if an action is a production action
 */
export function isProductionAction(action: string): boolean {
  return action.startsWith('production.') || action === 'server.deploy.production';
}

/**
 * Check if an action requires approval by definition
 */
export function actionRequiresApproval(action: string): boolean {
  const perm = PERMISSIONS.find(p => p.scope === action);
  if (perm) return perm.requiresApproval;
  if (isProductionAction(action)) return true;
  return false;
}

/**
 * Get permission definition by scope
 */
export function getPermissionDef(scope: string): PermissionDef | undefined {
  return PERMISSIONS.find(p => p.scope === scope);
}

/**
 * Get permissions by category
 */
export function getPermissionsByCategory(category: PermissionCategory): PermissionDef[] {
  return PERMISSIONS.filter(p => p.category === category);
}

/**
 * Get all permission scopes
 */
export function getAllScopes(): string[] {
  return PERMISSIONS.map(p => p.scope);
}

/**
 * Check if a permission scope matches a pattern
 * Supports wildcards:
 * - "*" matches everything
 * - "github.*" matches "github.repo.read", "github.issue.create", etc.
 * - "github.repo.*" matches "github.repo.read", "github.repo.write", etc.
 * - "production.*" matches all production actions
 */
export function matchesScope(pattern: string, scope: string): boolean {
  if (pattern === '*' || pattern === scope) return true;
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return scope.startsWith(prefix + '.');
  }
  return false;
}
