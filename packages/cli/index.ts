#!/usr/bin/env bun
import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const program = new Command();
program
  .name('agentdnai')
  .description('AgentDNAI CLI - Digital Identity for AI Agents')
  .version('0.2.0-alpha');

// ── Config Management ──────────────────────────────────────────────────────────

const CONFIG_DIR = join(homedir(), '.agentdnai');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

interface Config {
  server?: string;
  token?: string;
  [key: string]: string | undefined;
}

function getConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    return {};
  }
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function setConfig(key: string, value: string): void {
  const config = getConfig();
  config[key] = value;
  saveConfig(config);
}

function saveConfig(config: Config): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

function getServerUrl(): string {
  return getConfig().server || 'http://localhost:3000';
}

function getToken(): string | undefined {
  return getConfig().token;
}

// ── Color Helpers ──────────────────────────────────────────────────────────────

const supportsColor = process.stdout.isTTY;

const colors = {
  cyan: (s: string) => supportsColor ? `\x1b[36m${s}\x1b[0m` : s,
  green: (s: string) => supportsColor ? `\x1b[32m${s}\x1b[0m` : s,
  red: (s: string) => supportsColor ? `\x1b[31m${s}\x1b[0m` : s,
  yellow: (s: string) => supportsColor ? `\x1b[33m${s}\x1b[0m` : s,
  gray: (s: string) => supportsColor ? `\x1b[90m${s}\x1b[0m` : s,
  bold: (s: string) => supportsColor ? `\x1b[1m${s}\x1b[0m` : s,
  dim: (s: string) => supportsColor ? `\x1b[2m${s}\x1b[0m` : s,
};

// ── API Helper ─────────────────────────────────────────────────────────────────

async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const server = getServerUrl();
  const token = getToken();
  const url = `${server}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || data?.error || `HTTP ${res.status}`;
      throw new Error(errMsg);
    }

    // Unwrap { data: ... } envelope if present
    return (data?.data !== undefined ? data.data : data) as T;
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(
        `Cannot connect to server at ${server}. Is it running?\n` +
        `  Run ${colors.cyan('agentdnai doctor')} to diagnose.`
      );
    }
    throw err;
  }
}

// ── Prompt Helper ──────────────────────────────────────────────────────────────

async function prompt(question: string): Promise<string> {
  const { stdin, stdout } = process;
  return new Promise((resolve) => {
    stdout.write(question);
    stdin.resume();
    stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

async function promptPassword(question: string): Promise<string> {
  const { stdin, stdout } = process;
  return new Promise((resolve) => {
    stdout.write(question);
    // Hide input on supported platforms
    if (typeof (stdin as any).setRawMode === 'function') {
      let pw = '';
      (stdin as any).setRawMode(true);
      stdin.resume();
      stdin.on('data', function handler(data: Buffer) {
        const ch = data.toString();
        if (ch === '\n' || ch === '\r') {
          (stdin as any).setRawMode(false);
          stdin.removeListener('data', handler);
          stdout.write('\n');
          resolve(pw);
        } else if (ch === '\u007f' || ch === '\b') {
          // Backspace
          pw = pw.slice(0, -1);
        } else {
          pw += ch;
        }
      });
    } else {
      // Fallback: no hiding
      stdin.resume();
      stdin.once('data', (data) => {
        resolve(data.toString().trim());
      });
    }
  });
}

// ── Table Formatting ───────────────────────────────────────────────────────────

function printTable(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => {
    const maxRowLen = rows.reduce((max, row) => Math.max(max, (row[i] || '').length), 0);
    return Math.max(h.length, maxRowLen);
  });

  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join('  ');
  console.log(colors.bold(colors.cyan(headerLine)));
  console.log(colors.dim(colWidths.map(w => '─'.repeat(w)).join('──')));

  for (const row of rows) {
    const line = row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join('  ');
    console.log(line);
  }
}

function formatStatus(status: string): string {
  const s = status.toUpperCase();
  switch (s) {
    case 'ACTIVE': return colors.green(s);
    case 'PAUSED': return colors.yellow(s);
    case 'REVOKED': return colors.red(s);
    case 'BLOCKED': return colors.red(s);
    default: return s;
  }
}

// ── agentdnai login ────────────────────────────────────────────────────────────

program
  .command('login')
  .description('Login to AgentDNAI')
  .action(async () => {
    try {
      console.log(colors.cyan('\n🔐 AgentDNAI Login\n'));

      const email = await prompt('  Email: ');
      if (!email) {
        console.log(colors.red('  Email is required.'));
        process.exit(1);
      }

      const password = await promptPassword('  Password: ');
      if (!password) {
        console.log(colors.red('  Password is required.'));
        process.exit(1);
      }

      console.log(colors.dim('\n  Authenticating...'));

      const result = await apiRequest<{ token?: string; user?: unknown }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (result.token) {
        setConfig('token', result.token);
        console.log(colors.green('  ✓ Login successful!'));
        console.log(colors.dim('  Token saved to ~/.agentdnai/config.json\n'));
      } else {
        console.log(colors.red('  ✗ Login failed: No token received.'));
        process.exit(1);
      }
    } catch (err: unknown) {
      console.log(colors.red(`  ✗ ${(err as Error).message}\n`));
      process.exit(1);
    }
  });

// ── agentdnai logout ───────────────────────────────────────────────────────────

program
  .command('logout')
  .description('Logout from AgentDNAI')
  .action(() => {
    const config = getConfig();
    if (!config.token) {
      console.log(colors.yellow('  Not logged in.'));
      return;
    }
    delete config.token;
    saveConfig(config);
    console.log(colors.green('  ✓ Logged out successfully.'));
  });

// ── agentdnai doctor ───────────────────────────────────────────────────────────

program
  .command('doctor')
  .description('Check AgentDNAI setup')
  .action(async () => {
    console.log(colors.cyan('\n🩺 AgentDNAI Doctor\n'));

    const config = getConfig();
    const server = getServerUrl();

    // Check 1: Config
    if (existsSync(CONFIG_PATH)) {
      console.log(colors.green('  ✓') + ' Config file exists at ' + colors.dim(CONFIG_PATH));
    } else {
      console.log(colors.red('  ✗') + ' No config file found at ' + colors.dim(CONFIG_PATH));
    }

    // Check 2: Server reachable
    try {
      const health = await apiRequest<{ status?: string }>('/api/health');
      console.log(colors.green('  ✓') + ` Server reachable at ${colors.dim(server)}`);
      if (health.status) {
        console.log(colors.dim(`    Status: ${health.status}`));
      }
    } catch {
      console.log(colors.red('  ✗') + ` Server not reachable at ${colors.dim(server)}`);
    }

    // Check 3: Token valid
    if (config.token) {
      try {
        const me = await apiRequest<{ email?: string }>('/api/auth/me');
        console.log(colors.green('  ✓') + ' Auth token is valid');
        if (me.email) {
          console.log(colors.dim(`    Logged in as: ${me.email}`));
        }
      } catch {
        console.log(colors.red('  ✗') + ' Auth token is invalid or expired');
      }
    } else {
      console.log(colors.yellow('  ⚠') + ' No auth token configured');
      console.log(colors.dim('    Run `agentdnai login` to authenticate'));
    }

    console.log('');
  });

// ── agentdnai agents:list ──────────────────────────────────────────────────────

program
  .command('agents:list')
  .alias('agents')
  .description('List agents')
  .option('--search <term>', 'Search by name or description')
  .option('--status <status>', 'Filter by status')
  .option('--runtime <runtime>', 'Filter by runtime')
  .action(async (opts) => {
    try {
      const params = new URLSearchParams();
      if (opts.search) params.set('search', opts.search);
      if (opts.status) params.set('status', opts.status);
      if (opts.runtime) params.set('runtime', opts.runtime);

      const qs = params.toString();
      const result = await apiRequest<any[]>(`/api/agents${qs ? `?${qs}` : ''}`);

      const agents = Array.isArray(result) ? result : (result as any)?.agents || [];

      if (agents.length === 0) {
        console.log(colors.yellow('  No agents found.'));
        return;
      }

      console.log(colors.cyan(`\n📋 Agents (${agents.length})\n`));

      const headers = ['ID', 'NAME', 'STATUS', 'RUNTIME', 'CREATED'];
      const rows = agents.map((a: any) => [
        (a.id || a.agentUri || '').substring(0, 8),
        a.name || '-',
        a.status || '-',
        a.runtime || '-',
        a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '-',
      ]);

      printTable(headers, rows);

      // Re-render status with color
      console.log('');
    } catch (err: unknown) {
      console.log(colors.red(`  ✗ ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ── agentdnai agents:show ──────────────────────────────────────────────────────

program
  .command('agents:show')
  .argument('<id>', 'Agent ID')
  .description('Show agent details')
  .action(async (id: string) => {
    try {
      const agent = await apiRequest<any>(`/api/agents/${id}`);

      console.log(colors.cyan('\n🪪 Agent DNI Card\n'));
      console.log(`  ${colors.bold('Name:')}       ${agent.name || '-'}`);
      console.log(`  ${colors.bold('URI:')}        ${colors.cyan(agent.agentUri || id)}`);
      console.log(`  ${colors.bold('Status:')}     ${formatStatus(agent.status || 'UNKNOWN')}`);
      console.log(`  ${colors.bold('Runtime:')}    ${agent.runtime || '-'}`);
      console.log(`  ${colors.bold('Public Key:')} ${colors.dim((agent.publicKey || '-').substring(0, 40) + '...')}`);
      console.log(`  ${colors.bold('Created:')}    ${agent.createdAt ? new Date(agent.createdAt).toLocaleString() : '-'}`);

      if (agent.description) {
        console.log(`  ${colors.bold('Description:')}`);
        console.log(`    ${agent.description}`);
      }

      // Permissions
      const perms = agent.permissions || [];
      if (perms.length > 0) {
        console.log(`\n  ${colors.bold('Permissions')} (${perms.length}):`);
        for (const p of perms) {
          const effect = p.effect === 'ALLOW' ? colors.green('ALLOW') : p.effect === 'DENY' ? colors.red('DENY') : colors.yellow(p.effect);
          console.log(`    ${effect}  ${p.scope}  ${p.expiresAt ? colors.dim('expires ' + new Date(p.expiresAt).toLocaleDateString()) : ''}`);
        }
      }

      // Tokens
      const tokens = agent.tokens || [];
      if (tokens.length > 0) {
        console.log(`\n  ${colors.bold('Tokens')} (${tokens.length}):`);
        for (const t of tokens) {
          const status = t.revokedAt ? colors.red('REVOKED') : t.expiresAt && new Date(t.expiresAt) < new Date() ? colors.yellow('EXPIRED') : colors.green('ACTIVE');
          console.log(`    ${status}  ${colors.dim(t.id?.substring(0, 8) || '-')}  scopes: ${t.scopes?.join(', ') || '*'}`);
        }
      }

      console.log('');
    } catch (err: unknown) {
      console.log(colors.red(`  ✗ ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ── agentdnai agents:pause ─────────────────────────────────────────────────────

program
  .command('agents:pause')
  .argument('<id>', 'Agent ID')
  .description('Pause an agent')
  .action(async (id: string) => {
    try {
      await apiRequest(`/api/agents/${id}/pause`, { method: 'POST' });
      console.log(colors.green(`  ✓ Agent ${colors.cyan(id)} paused successfully.`));
    } catch (err: unknown) {
      console.log(colors.red(`  ✗ ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ── agentdnai agents:resume ────────────────────────────────────────────────────

program
  .command('agents:resume')
  .argument('<id>', 'Agent ID')
  .description('Resume a paused agent')
  .action(async (id: string) => {
    try {
      await apiRequest(`/api/agents/${id}/resume`, { method: 'POST' });
      console.log(colors.green(`  ✓ Agent ${colors.cyan(id)} resumed successfully.`));
    } catch (err: unknown) {
      console.log(colors.red(`  ✗ ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ── agentdnai agents:revoke ────────────────────────────────────────────────────

program
  .command('agents:revoke')
  .argument('<id>', 'Agent ID')
  .description('Revoke an agent')
  .action(async (id: string) => {
    try {
      await apiRequest(`/api/agents/${id}/revoke`, { method: 'POST' });
      console.log(colors.green(`  ✓ Agent ${colors.cyan(id)} revoked successfully.`));
    } catch (err: unknown) {
      console.log(colors.red(`  ✗ ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ── agentdnai agents:rotate-key ────────────────────────────────────────────────

program
  .command('agents:rotate-key')
  .argument('<id>', 'Agent ID')
  .description('Rotate agent key pair')
  .action(async (id: string) => {
    try {
      const result = await apiRequest<any>(`/api/agents/${id}/rotate-key`, { method: 'POST' });
      console.log(colors.green(`  ✓ Key rotated for agent ${colors.cyan(id)}.`));
      if (result.publicKey) {
        console.log(colors.dim(`  New public key: ${result.publicKey.substring(0, 40)}...`));
      }
    } catch (err: unknown) {
      console.log(colors.red(`  ✗ ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ── agentdnai token:issue ──────────────────────────────────────────────────────

program
  .command('token:issue')
  .argument('<agent>', 'Agent ID')
  .option('--ttl <seconds>', 'TTL in seconds', '3600')
  .option('--scopes <scopes>', 'Comma-separated scopes', '*')
  .description('Issue a token for an agent')
  .action(async (agent: string, opts: { ttl: string; scopes: string }) => {
    try {
      const scopes = opts.scopes === '*' ? ['*'] : opts.scopes.split(',').map((s: string) => s.trim());
      const ttlSeconds = parseInt(opts.ttl, 10);

      if (isNaN(ttlSeconds) || ttlSeconds <= 0) {
        console.log(colors.red('  ✗ TTL must be a positive number of seconds.'));
        process.exit(1);
      }

      console.log(colors.dim('  Issuing token...'));

      const result = await apiRequest<any>('/api/tokens/issue', {
        method: 'POST',
        body: JSON.stringify({
          agentId: agent,
          scopes,
          ttlSeconds,
        }),
      });

      console.log(colors.green('\n  ✓ Token issued successfully!'));
      console.log(`\n  ${colors.bold(colors.yellow('⚠  This token will only be shown once!'))}\n`);
      console.log(`  Token: ${colors.cyan(result.token || result.rawToken || JSON.stringify(result))}`);
      console.log(colors.dim(`  Expires in: ${ttlSeconds}s (${Math.floor(ttlSeconds / 3600)}h ${Math.floor((ttlSeconds % 3600) / 60)}m)`));
      console.log(colors.dim(`  Scopes: ${scopes.join(', ')}`));
      console.log('');
    } catch (err: unknown) {
      console.log(colors.red(`  ✗ ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ── agentdnai token:revoke ─────────────────────────────────────────────────────

program
  .command('token:revoke')
  .argument('<tokenId>', 'Token ID')
  .description('Revoke a token')
  .action(async (tokenId: string) => {
    try {
      await apiRequest(`/api/tokens/${tokenId}/revoke`, { method: 'POST' });
      console.log(colors.green(`  ✓ Token ${colors.cyan(tokenId)} revoked successfully.`));
    } catch (err: unknown) {
      console.log(colors.red(`  ✗ ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ── agentdnai authz:check ──────────────────────────────────────────────────────

program
  .command('authz:check')
  .requiredOption('--agent <id>', 'Agent ID')
  .requiredOption('--action <action>', 'Action to check')
  .option('--resource <resource>', 'Resource')
  .description('Check authorization for an agent')
  .action(async (opts: { agent: string; action: string; resource?: string }) => {
    try {
      const body: Record<string, string> = {
        agentId: opts.agent,
        action: opts.action,
      };
      if (opts.resource) {
        body.resource = opts.resource;
      }

      const result = await apiRequest<any>('/api/authz/check', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      console.log(colors.cyan('\n🛡️  Authorization Check\n'));

      const decision = result.decision || result.allowed;
      const isAllowed = decision === 'ALLOW' || decision === true;
      const isDenied = decision === 'DENY' || decision === false;
      const isRequiresApproval = decision === 'REQUIRES_APPROVAL';

      const decisionLabel = isAllowed
        ? colors.green('✓ ALLOW')
        : isDenied
        ? colors.red('✗ DENY')
        : isRequiresApproval
        ? colors.yellow('⚠ REQUIRES_APPROVAL')
        : colors.yellow(String(decision));

      console.log(`  ${colors.bold('Agent:')}     ${opts.agent}`);
      console.log(`  ${colors.bold('Action:')}    ${opts.action}`);
      if (opts.resource) {
        console.log(`  ${colors.bold('Resource:')}  ${opts.resource}`);
      }
      console.log(`  ${colors.bold('Decision:')}  ${decisionLabel}`);
      if (result.reason) {
        console.log(`  ${colors.bold('Reason:')}    ${result.reason}`);
      }
      console.log('');
    } catch (err: unknown) {
      console.log(colors.red(`  ✗ ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ── agentdnai audit:list ───────────────────────────────────────────────────────

program
  .command('audit:list')
  .alias('audit')
  .option('--limit <n>', 'Number of events to show', '20')
  .option('--agent <id>', 'Filter by agent ID')
  .description('List audit events')
  .action(async (opts: { limit: string; agent?: string }) => {
    try {
      const limit = parseInt(opts.limit, 10) || 20;
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (opts.agent) params.set('agentId', opts.agent);

      const result = await apiRequest<any>(`/api/audit?${params.toString()}`);

      const events = Array.isArray(result) ? result : (result as any)?.events || [];

      if (events.length === 0) {
        console.log(colors.yellow('  No audit events found.'));
        return;
      }

      console.log(colors.cyan(`\n📜 Audit Events (${events.length})\n`));

      const headers = ['TIME', 'TYPE', 'AGENT', 'DECISION', 'DETAILS'];
      const rows = events.map((e: any) => [
        e.createdAt ? new Date(e.createdAt).toLocaleString() : '-',
        e.eventType || '-',
        (e.agentId || '-').substring(0, 8),
        e.decision || '-',
        (e.details ? JSON.stringify(e.details).substring(0, 40) : '-'),
      ]);

      printTable(headers, rows);
      console.log('');
    } catch (err: unknown) {
      console.log(colors.red(`  ✗ ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ── agentdnai audit:verify ─────────────────────────────────────────────────────

program
  .command('audit:verify')
  .description('Verify audit chain integrity')
  .action(async () => {
    try {
      console.log(colors.dim('  Verifying audit chain integrity...'));

      const result = await apiRequest<any>('/api/audit/verify');

      console.log(colors.cyan('\n🔗 Audit Chain Verification\n'));

      if (result.valid) {
        console.log(colors.green(`  ✓ Chain is valid`));
      } else {
        console.log(colors.red(`  ✗ Chain is INVALID`));
        if (result.firstInvalidEvent) {
          console.log(colors.red(`    First invalid event: ${result.firstInvalidEvent}`));
        }
      }

      console.log(`  Events checked: ${result.eventsChecked || 0}`);
      if (result.message) {
        console.log(`  ${result.message}`);
      }
      console.log('');
    } catch (err: unknown) {
      console.log(colors.red(`  ✗ ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ── agentdnai config:show ──────────────────────────────────────────────────────

program
  .command('config:show')
  .alias('config')
  .description('Show current configuration')
  .action(() => {
    const config = getConfig();

    console.log(colors.cyan('\n⚙️  AgentDNAI Configuration\n'));

    if (Object.keys(config).length === 0) {
      console.log(colors.yellow('  No configuration found.'));
      console.log(colors.dim(`  Config file: ${CONFIG_PATH}`));
      return;
    }

    console.log(`  ${colors.bold('Server:')}  ${config.server || colors.dim('(default: http://localhost:3000)')}`);
    console.log(`  ${colors.bold('Token:')}   ${config.token ? colors.green('••••••••') + colors.dim(` (${config.token.substring(0, 10)}...)`) : colors.yellow('(not set)')}`);
    console.log(colors.dim(`\n  Config file: ${CONFIG_PATH}`));

    // Show any custom keys
    const knownKeys = ['server', 'token'];
    const customKeys = Object.keys(config).filter(k => !knownKeys.includes(k));
    if (customKeys.length > 0) {
      console.log(colors.dim('\n  Custom settings:'));
      for (const key of customKeys) {
        console.log(colors.dim(`    ${key}: ${config[key]}`));
      }
    }
    console.log('');
  });

// ── agentdnai config:set ───────────────────────────────────────────────────────

program
  .command('config:set')
  .argument('<key>', 'Config key')
  .argument('<value>', 'Config value')
  .description('Set a configuration value')
  .action((key: string, value: string) => {
    setConfig(key, value);
    console.log(colors.green(`  ✓ Set ${colors.cyan(key)} = ${colors.dim(value)}`));
  });

// ── Parse ──────────────────────────────────────────────────────────────────────

program.parse();
