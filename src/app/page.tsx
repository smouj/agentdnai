'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { api, type Agent, type Permission, type Token, type AuditEvent, type AuthzResult, type DashboardStats, type IssuedToken } from '@/lib/api-client';
import { PERMISSIONS, PERMISSION_TEMPLATES, PERMISSION_CATEGORIES, type PermissionCategory } from '@/lib/permissions';

// ─── UI Components ────────────────────────────────────────────────────────────

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import {
  Shield, Key, Activity, Eye, Ban, Play, Pause, RotateCcw, Plus,
  ChevronRight, Terminal, Lock, Fingerprint, Database, FileText,
  AlertTriangle, CheckCircle2, XCircle, Clock, Search, Filter,
  Copy, ExternalLink, Github, Server, Globe, Mail, CreditCard,
  HardDrive, Trash2, Zap, ArrowRight, ArrowLeft, Home, LayoutDashboard,
  Users, ScrollText, Settings, BookOpen, ShieldCheck, ShieldAlert,
  ShieldX, MoreHorizontal, RefreshCw, Download, Hash, Cpu,
  Layers, Brain, Bot
} from 'lucide-react';

// ─── Status Badge Component ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; icon: React.ReactNode }> = {
    ACTIVE: { className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
    PAUSED: { className: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: <Pause className="w-3 h-3" /> },
    REVOKED: { className: 'bg-red-500/15 text-red-400 border-red-500/30', icon: <XCircle className="w-3 h-3" /> },
    BLOCKED: { className: 'bg-red-500/15 text-red-400 border-red-500/30', icon: <Ban className="w-3 h-3" /> },
    EXPIRED: { className: 'bg-gray-500/15 text-gray-400 border-gray-500/30', icon: <Clock className="w-3 h-3" /> },
  };
  const v = variants[status] || variants.EXPIRED;
  return (
    <Badge variant="outline" className={`${v.className} gap-1 font-mono text-xs`}>
      {v.icon} {status}
    </Badge>
  );
}

function EffectBadge({ effect }: { effect: string }) {
  const variants: Record<string, { className: string }> = {
    ALLOW: { className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    DENY: { className: 'bg-red-500/15 text-red-400 border-red-500/30' },
    REQUIRES_APPROVAL: { className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  };
  const v = variants[effect] || variants.DENY;
  return <Badge variant="outline" className={`${v.className} font-mono text-xs`}>{effect.replace('_', ' ')}</Badge>;
}

function DecisionBadge({ decision }: { decision: string }) {
  const variants: Record<string, { className: string; icon: React.ReactNode }> = {
    allow: { className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
    deny: { className: 'bg-red-500/15 text-red-400 border-red-500/30', icon: <ShieldX className="w-3 h-3" /> },
    requires_approval: { className: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: <AlertTriangle className="w-3 h-3" /> },
  };
  const v = variants[decision] || variants.deny;
  return <Badge variant="outline" className={`${v.className} gap-1 font-mono text-xs`}>{v.icon} {decision.replace('_', ' ')}</Badge>;
}

function RiskBadge({ riskLevel }: { riskLevel: string }) {
  const variants: Record<string, { className: string }> = {
    low: { className: 'bg-emerald-500/10 text-emerald-400' },
    medium: { className: 'bg-amber-500/10 text-amber-400' },
    high: { className: 'bg-orange-500/10 text-orange-400' },
    critical: { className: 'bg-red-500/10 text-red-400' },
  };
  const v = variants[riskLevel] || variants.low;
  return <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${v.className}`}>{riskLevel}</span>;
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

function LandingPage() {
  const { setView } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">Agent<span className="text-primary">DNAI</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setView('dashboard')}>
              <BookOpen className="w-4 h-4 mr-1" /> Docs
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setView('dashboard')}>
              <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-primary/3 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-6 py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5">
                <Fingerprint className="w-3 h-3 mr-1" /> Secure Identity Layer
              </Badge>
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Every AI agent<br />
                needs an <span className="text-primary">identity</span>.
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                AgentDNAI gives every AI agent a verifiable digital identity, scoped permissions,
                encrypted credentials, revocable access and a clear audit trail.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan" onClick={() => setView('dashboard')}>
                  <Shield className="w-5 h-5 mr-2" /> Open Dashboard
                </Button>
                <Button size="lg" variant="outline" className="border-border">
                  <Terminal className="w-5 h-5 mr-2" /> View CLI
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Deny by default</div>
                <div className="flex items-center gap-2"><Key className="w-4 h-4 text-primary" /> Temporary tokens</div>
                <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> Full audit trail</div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur glow-cyan">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono">agentdnai check</span>
                </div>
                <pre className="text-sm font-mono text-foreground/80 leading-relaxed">
{`$ agentdnai check hermes-auditor github.repo.read \\
    --resource github.com/org/repo

AgentDNAI Authorization Check

  Agent:    hermes-auditor
  Action:   github.repo.read
  Resource: github.com/org/repo

  Decision:  ALLOW ✓
  Reason:    Explicit permission found.
  Expires:   2026-06-30 23:59:59 UTC`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-red-500/30 text-red-400 bg-red-500/5">
              <AlertTriangle className="w-3 h-3 mr-1" /> The Problem
            </Badge>
            <h2 className="text-3xl font-bold mb-4">AI agents are powerful. But uncontrolled.</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Agents read repositories, modify files, create PRs, access secrets and automate infrastructure.
              Without a proper identity layer, they become hard to control, hard to audit and hard to revoke.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <ShieldAlert className="w-8 h-8" />, title: 'No Identity', desc: 'Agents operate anonymously. You can\'t tell which agent did what.' },
              { icon: <Key className="w-8 h-8" />, title: 'No Scoping', desc: 'Agents get blanket access. One compromised key exposes everything.' },
              { icon: <Eye className="w-8 h-8" />, title: 'No Audit', desc: 'No record of what agents did. Impossible to investigate incidents.' },
            ].map((item, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-red-500/30 transition-colors">
                <CardHeader>
                  <div className="text-red-400 mb-2">{item.icon}</div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-muted-foreground text-sm">{item.desc}</p></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 border-t border-border/30 bg-card/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
              <ShieldCheck className="w-3 h-3 mr-1" /> The Solution
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Identity, permissions and trust for AI agents.</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              AgentDNAI provides a complete identity and authorization layer — every agent gets a verifiable identity,
              scoped permissions, temporary tokens and a tamper-evident audit trail.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Fingerprint className="w-6 h-6" />, title: 'Agent Identity', desc: 'Unique URI, key pair, and status for every agent.' },
              { icon: <Shield className="w-6 h-6" />, title: 'Scoped Permissions', desc: 'Granular allow/deny rules per resource and action.' },
              { icon: <Key className="w-6 h-6" />, title: 'Temporary Tokens', desc: 'Short-lived, hash-stored tokens. Never permanent.' },
              { icon: <ScrollText className="w-6 h-6" />, title: 'Audit Trail', desc: 'Hash-chained, append-only log of every decision.' },
            ].map((item, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors group">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    {item.icon}
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-muted-foreground text-sm">{item.desc}</p></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground">Four steps to secure your AI agents.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Create Agent', desc: 'Generate a unique identity with cryptographic key pair.' },
              { step: '02', title: 'Grant Permissions', desc: 'Assign scoped permissions: allow, deny, or require approval.' },
              { step: '03', title: 'Issue Token', desc: 'Get a temporary token for the agent to authenticate.' },
              { step: '04', title: 'Check Authorization', desc: 'Every action is validated and recorded in the audit log.' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-5xl font-bold text-primary/10 mb-2">{item.step}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {i < 3 && <ChevronRight className="hidden md:block absolute -right-3 top-1/2 text-primary/30 w-6 h-6" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Permissions Preview */}
      <section className="py-20 border-t border-border/30 bg-card/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Granular Permission Catalog</h2>
            <p className="text-muted-foreground">Every scope is defined. Every risk level is labeled. Production always requires approval.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Github className="w-5 h-5" />, name: 'GitHub', scopes: ['repo.read', 'repo.write', 'issue.create', 'pr.merge'], color: 'text-purple-400' },
              { icon: <Server className="w-5 h-5" />, name: 'Server', scopes: ['logs.read', 'command.run', 'deploy.staging', 'deploy.production'], color: 'text-orange-400' },
              { icon: <HardDrive className="w-5 h-5" />, name: 'Filesystem', scopes: ['read', 'write', 'delete', 'execute'], color: 'text-blue-400' },
              { icon: <Database className="w-5 h-5" />, name: 'Database', scopes: ['read', 'write', 'migrate', 'backup'], color: 'text-emerald-400' },
              { icon: <Globe className="w-5 h-5" />, name: 'Browser', scopes: ['open', 'read', 'click', 'form.submit'], color: 'text-cyan-400' },
              { icon: <Lock className="w-5 h-5" />, name: 'Secrets', scopes: ['read', 'write', 'rotate'], color: 'text-red-400' },
            ].map((cat, i) => (
              <Card key={i} className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className={cat.color}>{cat.icon}</span>
                    <CardTitle className="text-base">{cat.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.scopes.map((s, j) => (
                      <Badge key={j} variant="secondary" className="text-xs font-mono bg-secondary/50">
                        {cat.name.toLowerCase()}.{s}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security Principles */}
      <section className="py-20 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Security by Design</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { title: 'Deny by Default', desc: 'Everything is denied unless explicitly allowed. No exceptions.' },
              { title: 'Least Privilege', desc: 'Agents receive only the minimum permissions needed.' },
              { title: 'Immediate Revocation', desc: 'Pause, revoke or block any agent instantly.' },
              { title: 'Temporary Tokens', desc: 'No permanent tokens. TTL is mandatory.' },
              { title: 'Production Guarded', desc: 'Production actions always require human approval.' },
              { title: 'Audit Integrity', desc: 'Hash-chained append-only log detects tampering.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/30 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">No more anonymous agents.</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Know every agent. Control every action. Start building with verifiable identity today.
          </p>
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan" onClick={() => setView('dashboard')}>
            <Zap className="w-5 h-5 mr-2" /> Launch Dashboard
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">AgentDNAI</span>
            <span className="text-xs text-muted-foreground">Verifiable identity for AI agents.</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Early development · Not production-ready yet · MIT License
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Dashboard Sidebar ────────────────────────────────────────────────────────

function DashboardSidebar() {
  const { currentView, setView, sidebarOpen } = useAppStore();

  const navItems = [
    { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'agents' as const, icon: Bot, label: 'Agents' },
    { id: 'audit' as const, icon: ScrollText, label: 'Audit Log' },
    { id: 'tokens' as const, icon: Key, label: 'Tokens' },
    { id: 'policies' as const, icon: Shield, label: 'Policies' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className={`w-64 border-r border-border/50 bg-sidebar shrink-0 flex flex-col transition-all duration-200 ${sidebarOpen ? '' : 'w-16'}`}>
      <div className="p-4 flex items-center gap-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
          <Fingerprint className="w-5 h-5 text-primary" />
        </div>
        {sidebarOpen && <span className="text-lg font-bold">Agent<span className="text-primary">DNAI</span></span>}
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              currentView === item.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-border/50">
        <button
          onClick={() => setView('home')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Home className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Back to Home</span>}
        </button>
      </div>
    </aside>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView() {
  const { setView, navigateToAgent } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, a, ev] = await Promise.all([api.getStats(), api.listAgents(), api.getAuditEvents({ limit: 10 })]);
        setStats(s);
        setAgents(a);
        setRecentAudit(ev);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your AI agent identities and authorization activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Total Agents</span>
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stats?.totalAgents || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Active</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{stats?.activeAgents || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Permissions</span>
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stats?.totalPermissions || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Active Tokens</span>
              <Key className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{stats?.activeTokens || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Authorization Decisions */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Authorization Decisions</CardTitle>
          <CardDescription>Allow vs deny vs requires approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-sm">Allow: <strong>{stats?.recentAllowCount || 0}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-sm">Deny: <strong>{stats?.recentDenyCount || 0}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-sm">Requires Approval: <strong>{stats?.recentRequiresApprovalCount || 0}</strong></span>
            </div>
          </div>
          <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden flex">
            {stats && (stats.recentAllowCount + stats.recentDenyCount + stats.recentRequiresApprovalCount) > 0 && (
              <>
                <div className="bg-emerald-400 h-full" style={{ width: `${(stats.recentAllowCount / (stats.recentAllowCount + stats.recentDenyCount + stats.recentRequiresApprovalCount)) * 100}%` }} />
                <div className="bg-red-400 h-full" style={{ width: `${(stats.recentDenyCount / (stats.recentAllowCount + stats.recentDenyCount + stats.recentRequiresApprovalCount)) * 100}%` }} />
                <div className="bg-amber-400 h-full" style={{ width: `${(stats.recentRequiresApprovalCount / (stats.recentAllowCount + stats.recentDenyCount + stats.recentRequiresApprovalCount)) * 100}%` }} />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agent Quick List */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Agents</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setView('agents')}>
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No agents yet. Create your first agent.</p>
                <Button size="sm" className="mt-3 bg-primary text-primary-foreground" onClick={() => setView('agents')}>
                  <Plus className="w-4 h-4 mr-1" /> Create Agent
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {agents.slice(0, 5).map(agent => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => navigateToAgent(agent.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{agent.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{agent.runtime}</div>
                      </div>
                    </div>
                    <StatusBadge status={agent.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Audit Events</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setView('audit')}>
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentAudit.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No audit events yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentAudit.map(event => (
                  <div key={event.id} className="flex items-center justify-between p-2 rounded bg-secondary/20 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{event.eventType}</span>
                      {event.action && <span className="text-foreground/70">{event.action}</span>}
                    </div>
                    {event.decision && <DecisionBadge decision={event.decision} />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Agents List View ─────────────────────────────────────────────────────────

function AgentsView() {
  const { navigateToAgent } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', runtime: '', description: '' });
  const [creating, setCreating] = useState(false);

  const loadAgents = useCallback(async () => {
    try {
      const data = await api.listAgents();
      setAgents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const handleCreate = async () => {
    if (!newAgent.name || !newAgent.runtime) return;
    setCreating(true);
    try {
      await api.createAgent(newAgent);
      toast({ title: 'Agent created', description: `${newAgent.name} has been created.` });
      setShowCreateDialog(false);
      setNewAgent({ name: '', runtime: '', description: '' });
      loadAgents();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground">Manage your AI agent identities.</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>Generate a unique identity with cryptographic key pair.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Agent Name</Label>
                <Input placeholder="e.g. hermes-auditor" value={newAgent.name} onChange={e => setNewAgent({ ...newAgent, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Runtime</Label>
                <Select value={newAgent.runtime} onValueChange={v => setNewAgent({ ...newAgent, runtime: v })}>
                  <SelectTrigger><SelectValue placeholder="Select runtime" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openclaw">OpenClaw</SelectItem>
                    <SelectItem value="hermes">Hermes</SelectItem>
                    <SelectItem value="codex">Codex</SelectItem>
                    <SelectItem value="cli">CLI Agent</SelectItem>
                    <SelectItem value="automation">Automation</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="What does this agent do?" value={newAgent.description} onChange={e => setNewAgent({ ...newAgent, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button className="bg-primary text-primary-foreground" onClick={handleCreate} disabled={creating || !newAgent.name || !newAgent.runtime}>
                {creating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Fingerprint className="w-4 h-4 mr-2" />}
                Create Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 text-primary animate-spin" /></div>
      ) : agents.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-16 text-center">
            <Bot className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
            <p className="text-muted-foreground mb-4">Create your first AI agent identity to get started.</p>
            <Button className="bg-primary text-primary-foreground" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map(agent => (
            <Card
              key={agent.id}
              className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
              onClick={() => navigateToAgent(agent.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">{agent.runtime}</CardDescription>
                    </div>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                {agent.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{agent.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {agent._count?.permissions || 0} perms</span>
                  <span className="flex items-center gap-1"><Key className="w-3 h-3" /> {agent._count?.tokens || 0} tokens</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(agent.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <div className="text-xs font-mono text-muted-foreground/60 truncate w-full">{agent.agentUri}</div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Agent Detail View ────────────────────────────────────────────────────────

function AgentDetailView() {
  const { selectedAgentId, setView } = useAppStore();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [showAuthzDialog, setShowAuthzDialog] = useState(false);
  const [issuedToken, setIssuedToken] = useState<IssuedToken | null>(null);
  const [authzResult, setAuthzResult] = useState<AuthzResult | null>(null);
  const [grantForm, setGrantForm] = useState({ scope: '', resource: '', effect: 'ALLOW' as string, expiresAt: '' });
  const [tokenForm, setTokenForm] = useState({ scopes: [''], ttlSeconds: 3600 });
  const [authzForm, setAuthzForm] = useState({ action: '', resource: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadAgent = useCallback(async () => {
    if (!selectedAgentId) return;
    try {
      const data = await api.getAgent(selectedAgentId);
      setAgent(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => { loadAgent(); }, [loadAgent]);

  const handleAction = async (action: 'pause' | 'resume' | 'revoke') => {
    if (!agent) return;
    setSubmitting(true);
    try {
      if (action === 'pause') await api.pauseAgent(agent.id);
      if (action === 'resume') await api.resumeAgent(agent.id);
      if (action === 'revoke') await api.revokeAgent(agent.id);
      toast({ title: `Agent ${action}d`, description: `${agent.name} has been ${action}d.` });
      loadAgent();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRotateKey = async () => {
    if (!agent) return;
    try {
      await api.rotateKey(agent.id);
      toast({ title: 'Key rotated', description: 'A new key pair has been generated.' });
      loadAgent();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleGrantPermission = async () => {
    if (!agent || !grantForm.scope) return;
    setSubmitting(true);
    try {
      await api.grantPermission(agent.id, {
        scope: grantForm.scope,
        resource: grantForm.resource || undefined,
        effect: grantForm.effect,
        expiresAt: grantForm.expiresAt || undefined,
      });
      toast({ title: 'Permission granted', description: `${grantForm.scope} → ${grantForm.effect}` });
      setShowGrantDialog(false);
      setGrantForm({ scope: '', resource: '', effect: 'ALLOW', expiresAt: '' });
      loadAgent();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueToken = async () => {
    if (!agent) return;
    setSubmitting(true);
    try {
      const result = await api.issueToken({
        agentId: agent.id,
        scopes: tokenForm.scopes.filter(s => s.trim()),
        ttlSeconds: tokenForm.ttlSeconds,
      });
      setIssuedToken(result);
      toast({ title: 'Token issued', description: 'Copy the token now — it will not be shown again.' });
      loadAgent();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckAuthz = async () => {
    if (!agent || !authzForm.action) return;
    setSubmitting(true);
    try {
      const result = await api.checkAuthz({
        agentId: agent.id,
        action: authzForm.action,
        resource: authzForm.resource || undefined,
      });
      setAuthzResult(result);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!agent) return;
    try {
      await api.deletePermission(agent.id, permissionId);
      toast({ title: 'Permission removed' });
      loadAgent();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    try {
      await api.revokeToken(tokenId);
      toast({ title: 'Token revoked' });
      loadAgent();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  if (!agent) {
    return (
      <div className="text-center py-16">
        <Bot className="w-12 h-12 text-primary/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Agent not found</h3>
        <Button variant="outline" onClick={() => setView('agents')}>Back to Agents</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setView('agents')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <StatusBadge status={agent.status} />
            </div>
            <p className="text-sm font-mono text-muted-foreground mt-1">{agent.agentUri}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {agent.status === 'ACTIVE' && (
            <Button variant="outline" size="sm" onClick={() => handleAction('pause')} disabled={submitting}>
              <Pause className="w-4 h-4 mr-1" /> Pause
            </Button>
          )}
          {agent.status === 'PAUSED' && (
            <Button variant="outline" size="sm" onClick={() => handleAction('resume')} disabled={submitting}>
              <Play className="w-4 h-4 mr-1" /> Resume
            </Button>
          )}
          {(agent.status === 'ACTIVE' || agent.status === 'PAUSED') && (
            <Button variant="outline" size="sm" onClick={() => handleAction('revoke')} disabled={submitting} className="text-red-400 border-red-400/30 hover:bg-red-400/10">
              <Ban className="w-4 h-4 mr-1" /> Revoke
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRotateKey} disabled={submitting}>
            <RotateCcw className="w-4 h-4 mr-1" /> Rotate Key
          </Button>
        </div>
      </div>

      {/* Agent Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Fingerprint className="w-4 h-4 text-primary" /> Identity</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Runtime</span><span className="font-mono">{agent.runtime}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{new Date(agent.createdAt).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last Seen</span><span>{agent.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleDateString() : 'Never'}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Key className="w-4 h-4 text-primary" /> Public Key</h3>
            <div className="bg-secondary/30 rounded p-2 font-mono text-xs break-all max-h-24 overflow-y-auto text-muted-foreground">
              {agent.publicKey}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Permissions</span><span>{agent.permissions?.length || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tokens</span><span>{agent.tokens?.length || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Audit Events</span><span>{agent.auditEvents?.length || 0}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Grant Permission</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Permission</DialogTitle>
              <DialogDescription>Assign a scoped permission to this agent.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={grantForm.scope} onValueChange={v => setGrantForm({ ...grantForm, scope: v })}>
                  <SelectTrigger><SelectValue placeholder="Select permission scope" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {PERMISSION_CATEGORIES.map(cat => (
                      <React.Fragment key={cat}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">{cat}</div>
                        {PERMISSIONS.filter(p => p.category === cat).map(p => (
                          <SelectItem key={p.scope} value={p.scope}>
                            <span className="flex items-center gap-2">
                              {p.scope}
                              <RiskBadge riskLevel={p.riskLevel} />
                            </span>
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Resource (optional)</Label>
                <Input placeholder="e.g. github.com/org/repo" value={grantForm.resource} onChange={e => setGrantForm({ ...grantForm, resource: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Effect</Label>
                <Select value={grantForm.effect} onValueChange={v => setGrantForm({ ...grantForm, effect: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALLOW">ALLOW</SelectItem>
                    <SelectItem value="DENY">DENY</SelectItem>
                    <SelectItem value="REQUIRES_APPROVAL">REQUIRES_APPROVAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expires At (optional)</Label>
                <Input type="datetime-local" value={grantForm.expiresAt} onChange={e => setGrantForm({ ...grantForm, expiresAt: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGrantDialog(false)}>Cancel</Button>
              <Button className="bg-primary text-primary-foreground" onClick={handleGrantPermission} disabled={submitting || !grantForm.scope}>
                Grant
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showTokenDialog} onOpenChange={v => { setShowTokenDialog(v); if (!v) setIssuedToken(null); }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Key className="w-4 h-4 mr-1" /> Issue Token</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Temporary Token</DialogTitle>
              <DialogDescription>Generate a short-lived token for this agent. The raw token will only be shown once.</DialogDescription>
            </DialogHeader>
            {issuedToken ? (
              <div className="space-y-4 py-4">
                <Alert className="border-primary/30 bg-primary/5">
                  <Key className="w-4 h-4 text-primary" />
                  <AlertTitle>Token Issued</AlertTitle>
                  <AlertDescription>Copy this token now. It will not be shown again.</AlertDescription>
                </Alert>
                <div className="bg-secondary/30 rounded p-3 font-mono text-xs break-all">{issuedToken.token}</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expires: {new Date(issuedToken.expiresAt).toLocaleString()}</span>
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(issuedToken.token)}>
                    <Copy className="w-4 h-4 mr-1" /> Copy
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {issuedToken.scopes.map(s => <Badge key={s} variant="secondary" className="text-xs font-mono">{s}</Badge>)}
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Scopes</Label>
                  {tokenForm.scopes.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <Input placeholder="e.g. github.repo.read" value={s} onChange={e => {
                        const newScopes = [...tokenForm.scopes];
                        newScopes[i] = e.target.value;
                        setTokenForm({ ...tokenForm, scopes: newScopes });
                      }} />
                      {i > 0 && <Button size="icon" variant="ghost" onClick={() => setTokenForm({ ...tokenForm, scopes: tokenForm.scopes.filter((_, j) => j !== i) })}><Trash2 className="w-4 h-4 text-red-400" /></Button>}
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setTokenForm({ ...tokenForm, scopes: [...tokenForm.scopes, ''] })}>
                    <Plus className="w-4 h-4 mr-1" /> Add Scope
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>TTL (seconds)</Label>
                  <Select value={String(tokenForm.ttlSeconds)} onValueChange={v => setTokenForm({ ...tokenForm, ttlSeconds: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="900">15 minutes</SelectItem>
                      <SelectItem value="1800">30 minutes</SelectItem>
                      <SelectItem value="3600">1 hour</SelectItem>
                      <SelectItem value="7200">2 hours</SelectItem>
                      <SelectItem value="86400">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              {!issuedToken && (
                <>
                  <Button variant="outline" onClick={() => setShowTokenDialog(false)}>Cancel</Button>
                  <Button className="bg-primary text-primary-foreground" onClick={handleIssueToken} disabled={submitting}>
                    Issue Token
                  </Button>
                </>
              )}
              {issuedToken && <Button onClick={() => setShowTokenDialog(false)}>Done</Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAuthzDialog} onOpenChange={setShowAuthzDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Shield className="w-4 h-4 mr-1" /> Check Auth</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Check Authorization</DialogTitle>
              <DialogDescription>Test if this agent is authorized to perform an action.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Action</Label>
                <Input placeholder="e.g. github.repo.read" value={authzForm.action} onChange={e => setAuthzForm({ ...authzForm, action: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Resource (optional)</Label>
                <Input placeholder="e.g. github.com/org/repo" value={authzForm.resource} onChange={e => setAuthzForm({ ...authzForm, resource: e.target.value })} />
              </div>
              {authzResult && (
                <div className={`rounded-lg border p-4 ${authzResult.allowed ? 'border-emerald-500/30 bg-emerald-500/5' : authzResult.requiresApproval ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {authzResult.allowed ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : authzResult.requiresApproval ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                    <span className="font-semibold">{authzResult.decision.toUpperCase()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{authzResult.reason}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAuthzDialog(false); setAuthzResult(null); }}>Close</Button>
              <Button className="bg-primary text-primary-foreground" onClick={handleCheckAuthz} disabled={submitting || !authzForm.action}>
                Check
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs: Permissions, Tokens, Audit */}
      <Tabs defaultValue="permissions" className="space-y-4">
        <TabsList className="bg-secondary/30">
          <TabsTrigger value="permissions"><Shield className="w-4 h-4 mr-1" /> Permissions</TabsTrigger>
          <TabsTrigger value="tokens"><Key className="w-4 h-4 mr-1" /> Tokens</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="w-4 h-4 mr-1" /> Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-0">
              {agent.permissions && agent.permissions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scope</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Effect</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent.permissions.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.scope}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.resource || '*'}</TableCell>
                        <TableCell><EffectBadge effect={p.effect} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : 'Never'}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeletePermission(p.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No permissions assigned yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-0">
              {agent.tokens && agent.tokens.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent.tokens.map(t => {
                      const expired = new Date(t.expiresAt) < new Date();
                      const revoked = !!t.revokedAt;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs">{t.id.slice(0, 12)}...</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {JSON.parse(t.scopes).map((s: string) => <Badge key={s} variant="secondary" className="text-xs font-mono">{s}</Badge>)}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(t.expiresAt).toLocaleString()}</TableCell>
                          <TableCell>
                            {revoked ? <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs">Revoked</Badge> :
                             expired ? <Badge variant="outline" className="text-gray-400 border-gray-400/30 text-xs">Expired</Badge> :
                             <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-xs">Active</Badge>}
                          </TableCell>
                          <TableCell>
                            {!revoked && !expired && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRevokeToken(t.id)}>
                                <Ban className="w-3.5 h-3.5 text-red-400" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tokens issued yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-0">
              {agent.auditEvents && agent.auditEvents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent.auditEvents.slice(0, 20).map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-xs">{e.eventType}</TableCell>
                        <TableCell className="font-mono text-xs">{e.action || '-'}</TableCell>
                        <TableCell>{e.decision ? <DecisionBadge decision={e.decision} /> : '-'}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{e.eventHash.slice(0, 16)}...</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No audit events for this agent.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Audit View ───────────────────────────────────────────────────────────────

function AuditView() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDecision, setFilterDecision] = useState<string>('');
  const [filterEventType, setFilterEventType] = useState<string>('');

  const loadEvents = useCallback(async () => {
    try {
      const data = await api.getAuditEvents({
        decision: filterDecision || undefined,
        eventType: filterEventType || undefined,
        limit: 100,
      });
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterDecision, filterEventType]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">Hash-chained, append-only record of every authorization decision.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterDecision} onValueChange={setFilterDecision}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Decisions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Decisions</SelectItem>
            <SelectItem value="allow">Allow</SelectItem>
            <SelectItem value="deny">Deny</SelectItem>
            <SelectItem value="requires_approval">Requires Approval</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEventType} onValueChange={setFilterEventType}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Event Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Event Types</SelectItem>
            <SelectItem value="AGENT_CREATED">Agent Created</SelectItem>
            <SelectItem value="AGENT_REVOKED">Agent Revoked</SelectItem>
            <SelectItem value="PERMISSION_GRANTED">Permission Granted</SelectItem>
            <SelectItem value="TOKEN_ISSUED">Token Issued</SelectItem>
            <SelectItem value="AUTHZ_CHECK">Authz Check</SelectItem>
            <SelectItem value="AUTHZ_ALLOW">Authz Allow</SelectItem>
            <SelectItem value="AUTHZ_DENY">Authz Deny</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadEvents}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 text-primary animate-spin" /></div>
      ) : (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Event Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono text-xs">{e.eventType}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{e.agentId ? e.agentId.slice(0, 12) + '...' : '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{e.action || '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-32 truncate">{e.resource || '-'}</TableCell>
                      <TableCell>{e.decision ? <DecisionBadge decision={e.decision} /> : '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{e.eventHash.slice(0, 16)}...</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Chain Integrity Notice */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Hash className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Hash Chain Integrity</p>
            <p className="text-xs text-muted-foreground">Every audit event is linked via previousHash and verified with eventHash. Tampering is detectable.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tokens View ──────────────────────────────────────────────────────────────

function TokensView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issueForm, setIssueForm] = useState({ agentId: '', scopes: [''], ttlSeconds: 3600 });
  const [issuedToken, setIssuedToken] = useState<IssuedToken | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await api.listAgents();
      setAgents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const allTokens = agents.flatMap(a => (a.tokens || []).map(t => ({ ...t, agentName: a.name })));

  const handleIssue = async () => {
    setSubmitting(true);
    try {
      const result = await api.issueToken({
        agentId: issueForm.agentId,
        scopes: issueForm.scopes.filter(s => s.trim()),
        ttlSeconds: issueForm.ttlSeconds,
      });
      setIssuedToken(result);
      toast({ title: 'Token issued' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    try {
      await api.revokeToken(tokenId);
      toast({ title: 'Token revoked' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tokens</h1>
          <p className="text-muted-foreground">Manage temporary tokens for agent authentication.</p>
        </div>
        <Dialog open={showIssueDialog} onOpenChange={v => { setShowIssueDialog(v); if (!v) setIssuedToken(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Issue Token</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Temporary Token</DialogTitle>
            </DialogHeader>
            {issuedToken ? (
              <div className="space-y-4 py-4">
                <Alert className="border-primary/30 bg-primary/5">
                  <Key className="w-4 h-4 text-primary" />
                  <AlertTitle>Token Issued</AlertTitle>
                  <AlertDescription>Copy now — it will not be shown again.</AlertDescription>
                </Alert>
                <div className="bg-secondary/30 rounded p-3 font-mono text-xs break-all">{issuedToken.token}</div>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(issuedToken.token)}>
                  <Copy className="w-4 h-4 mr-1" /> Copy Token
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Agent</Label>
                  <Select value={issueForm.agentId} onValueChange={v => setIssueForm({ ...issueForm, agentId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>
                      {agents.filter(a => a.status === 'ACTIVE').map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name} ({a.runtime})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Scopes</Label>
                  {issueForm.scopes.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <Input placeholder="e.g. github.repo.read" value={s} onChange={e => {
                        const newScopes = [...issueForm.scopes];
                        newScopes[i] = e.target.value;
                        setIssueForm({ ...issueForm, scopes: newScopes });
                      }} />
                      {i > 0 && <Button size="icon" variant="ghost" onClick={() => setIssueForm({ ...issueForm, scopes: issueForm.scopes.filter((_, j) => j !== i) })}><Trash2 className="w-4 h-4 text-red-400" /></Button>}
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setIssueForm({ ...issueForm, scopes: [...issueForm.scopes, ''] })}><Plus className="w-4 h-4 mr-1" /> Add</Button>
                </div>
                <div className="space-y-2">
                  <Label>TTL</Label>
                  <Select value={String(issueForm.ttlSeconds)} onValueChange={v => setIssueForm({ ...issueForm, ttlSeconds: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">5 min</SelectItem>
                      <SelectItem value="900">15 min</SelectItem>
                      <SelectItem value="3600">1 hour</SelectItem>
                      <SelectItem value="86400">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              {!issuedToken ? (
                <>
                  <Button variant="outline" onClick={() => setShowIssueDialog(false)}>Cancel</Button>
                  <Button className="bg-primary text-primary-foreground" onClick={handleIssue} disabled={submitting || !issueForm.agentId}>Issue</Button>
                </>
              ) : <Button onClick={() => setShowIssueDialog(false)}>Done</Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 text-primary animate-spin" /></div>
      ) : allTokens.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-16 text-center">
            <Key className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tokens</h3>
            <p className="text-muted-foreground">Issue a temporary token for an agent to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTokens.map(t => {
                  const expired = new Date(t.expiresAt) < new Date();
                  const revoked = !!t.revokedAt;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.agentName}</TableCell>
                      <TableCell><div className="flex flex-wrap gap-1">{JSON.parse(t.scopes).map((s: string) => <Badge key={s} variant="secondary" className="text-xs font-mono">{s}</Badge>)}</div></TableCell>
                      <TableCell className="text-xs">{new Date(t.expiresAt).toLocaleString()}</TableCell>
                      <TableCell>
                        {revoked ? <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs">Revoked</Badge> :
                         expired ? <Badge variant="outline" className="text-gray-400 border-gray-400/30 text-xs">Expired</Badge> :
                         <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-xs">Active</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : 'Never'}</TableCell>
                      <TableCell>
                        {!revoked && !expired && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRevoke(t.id)}><Ban className="w-3.5 h-3.5 text-red-400" /></Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Policies View ────────────────────────────────────────────────────────────

function PoliciesView() {
  const [selectedCategory, setSelectedCategory] = useState<PermissionCategory | 'all'>('all');

  const filteredPerms = selectedCategory === 'all'
    ? PERMISSIONS
    : PERMISSIONS.filter(p => p.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Permission Policies</h1>
        <p className="text-muted-foreground">Browse the permission catalog and templates for agent authorization.</p>
      </div>

      {/* Templates */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Templates</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PERMISSION_TEMPLATES.map(tpl => (
            <Card key={tpl.id} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{tpl.name}</CardTitle>
                <CardDescription className="text-xs">{tpl.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {tpl.permissions.map(p => (
                    <Badge key={p} variant="secondary" className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{p}</Badge>
                  ))}
                </div>
                {tpl.denied.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tpl.denied.map(p => (
                      <Badge key={p} variant="secondary" className="text-xs font-mono bg-red-500/10 text-red-400 border-red-500/20 line-through">{p}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Permission Catalog */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Permission Catalog</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button size="sm" variant={selectedCategory === 'all' ? 'default' : 'outline'} onClick={() => setSelectedCategory('all')}>All</Button>
          {PERMISSION_CATEGORIES.map(cat => (
            <Button key={cat} size="sm" variant={selectedCategory === cat ? 'default' : 'outline'} onClick={() => setSelectedCategory(cat)} className="capitalize">
              {cat}
            </Button>
          ))}
        </div>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Approval</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPerms.map(p => (
                  <TableRow key={p.scope}>
                    <TableCell className="font-mono text-xs">{p.scope}</TableCell>
                    <TableCell className="capitalize text-xs">{p.category}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.description}</TableCell>
                    <TableCell><RiskBadge riskLevel={p.riskLevel} /></TableCell>
                    <TableCell>{p.requiresApproval ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────

function SettingsView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Platform configuration and security settings.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Security Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Default Policy</span><Badge variant="outline" className="text-red-400 border-red-400/30">Deny All</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Token TTL Required</span><Badge variant="outline" className="text-emerald-400 border-emerald-400/30">Yes</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Production Approval</span><Badge variant="outline" className="text-amber-400 border-amber-400/30">Required</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Max Token TTL</span><span>24 hours</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Min Token TTL</span><span>60 seconds</span></div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Cryptography</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Key Algorithm</span><span>SHA-256</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Token Hash</span><span>SHA-256</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Event Hash Chain</span><Badge variant="outline" className="text-emerald-400 border-emerald-400/30">Enabled</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Raw Token Storage</span><Badge variant="outline" className="text-red-400 border-red-400/30">Never</Badge></div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ScrollText className="w-4 h-4 text-primary" /> Audit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Audit Mode</span><span>Append-Only</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Hash Chain</span><Badge variant="outline" className="text-emerald-400 border-emerald-400/30">Active</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Events Logged</span><span>All Decisions</span></div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">OpenClaw</span><Badge variant="outline" className="text-gray-400 border-gray-400/30">Planned</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Hermes</span><Badge variant="outline" className="text-gray-400 border-gray-400/30">Planned</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Codex</span><Badge variant="outline" className="text-gray-400 border-gray-400/30">Planned</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">SDK</span><Badge variant="outline" className="text-gray-400 border-gray-400/30">Planned</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">CLI</span><Badge variant="outline" className="text-gray-400 border-gray-400/30">Planned</Badge></div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">Project Status</h3>
          <p className="text-xs text-muted-foreground mb-3">AgentDNAI is in early development (MVP v0.1). Not production-ready yet.</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Identity</div>
              <Progress value={80} className="h-1.5" />
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Permissions</div>
              <Progress value={70} className="h-1.5" />
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Audit</div>
              <Progress value={60} className="h-1.5" />
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Integrations</div>
              <Progress value={10} className="h-1.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function AgentDNAIApp() {
  const { currentView } = useAppStore();

  // Render based on current view
  if (currentView === 'home') {
    return <LandingPage />;
  }

  // Dashboard layout with sidebar
  return (
    <div className="min-h-screen flex">
      <DashboardSidebar />
      <main className="flex-1 p-6 overflow-auto">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'agents' && <AgentsView />}
        {currentView === 'agent-detail' && <AgentDetailView />}
        {currentView === 'audit' && <AuditView />}
        {currentView === 'tokens' && <TokensView />}
        {currentView === 'policies' && <PoliciesView />}
        {currentView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
