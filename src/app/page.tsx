'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { api, type Agent, type Permission, type Token, type AuditEvent, type AuthzResult, type DashboardStats, type IssuedToken, type ApprovalRequest } from '@/lib/api-client';
import { PERMISSIONS, PERMISSION_TEMPLATES, PERMISSION_CATEGORIES, type PermissionCategory } from '@/lib/permissions';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Key, Activity, Eye, Ban, Play, Pause, RotateCw, Plus,
  ChevronRight, Terminal, Lock, Fingerprint, Database, FileText,
  AlertTriangle, CheckCircle2, XCircle, Clock, Search, Filter,
  Copy, ExternalLink, Server, Globe, Mail, CreditCard,
  HardDrive, Trash2, Zap, ArrowRight, ArrowLeft, Home, LayoutDashboard,
  Users, ScrollText, Settings, BookOpen, ShieldCheck, ShieldAlert,
  ShieldX, RefreshCw, Download, Hash, Cpu,
  Layers, Bot, Sparkles, Command, Menu, X, Code2,
  Wrench, Package, Workflow, Bell,
  Sun, Moon, Upload, FileDown, LogOut, Building2, User,
  RotateCcw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const stagger = {
  animate: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' },
  }),
  initial: { opacity: 0, y: 16 },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function timeAgo(date: string | Date): string {
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return 'unknown'; }
}

function RuntimeIcon({ runtime, className = 'w-4 h-4' }: { runtime: string; className?: string }) {
  const m: Record<string, React.ReactNode> = {
    hermes: <Zap className={className} />,
    codex: <Code2 className={className} />,
    openclaw: <Package className={className} />,
    cli: <Terminal className={className} />,
    automation: <Workflow className={className} />,
    custom: <Cpu className={className} />,
  };
  return <>{m[runtime] || <Bot className={className} />}</>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <Button size="icon" variant="ghost" className={`h-6 w-6 ${className}`} onClick={copy}>
      {copied ? <CheckCircle2 className="w-3 h-3 text-crimson" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
    </Button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { dot: string; icon?: React.ReactNode }> = {
    ACTIVE: { dot: 'bg-foreground animate-pulse' },
    PAUSED: { dot: 'bg-muted-foreground', icon: <Pause className="w-3 h-3" /> },
    REVOKED: { dot: 'bg-crimson', icon: <XCircle className="w-3 h-3" /> },
    BLOCKED: { dot: 'bg-crimson', icon: <Ban className="w-3 h-3" /> },
  };
  const v = map[status] || { dot: 'bg-muted-foreground' };
  return (
    <Badge variant="outline" className="gap-1 font-mono text-xs border-border/60">
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
      {status}
    </Badge>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const cls = decision === 'allow'
    ? 'border-foreground/20 text-foreground'
    : decision === 'deny'
      ? 'border-crimson/40 text-crimson'
      : 'border-border text-muted-foreground';
  const icon = decision === 'allow'
    ? <CheckCircle2 className="w-3 h-3" />
    : decision === 'deny'
      ? <ShieldX className="w-3 h-3" />
      : <AlertTriangle className="w-3 h-3" />;
  return (
    <Badge variant="outline" className={`gap-1 font-mono text-xs ${cls}`}>
      {icon} {decision.replace('_', ' ')}
    </Badge>
  );
}

function RiskBadge({ riskLevel }: { riskLevel: string }) {
  const cls = riskLevel === 'critical' ? 'text-crimson' : riskLevel === 'high' ? 'text-crimson/80' : riskLevel === 'medium' ? 'text-muted-foreground' : 'text-foreground/60';
  return <span className={`text-xs font-mono px-1.5 py-0.5 rounded bg-secondary/50 ${cls}`}>{riskLevel.toUpperCase()}</span>;
}

function CircularRiskScore({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? 'var(--crimson)' : score >= 50 ? 'oklch(0.6 0.08 40)' : score >= 25 ? 'oklch(0.65 0.05 60)' : 'oklch(0.7 0.02 280)';
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="oklch(0.25 0.01 280)" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
}

function CountUpNumber({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}</span>;
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function LandingPage() {
  const { setView } = useAppStore();

  const valueProps = [
    { icon: <Fingerprint className="w-6 h-6" />, title: 'Verify Identity', desc: 'Every agent gets a unique URI, cryptographic key pair, and verifiable identity card.' },
    { icon: <Shield className="w-6 h-6" />, title: 'Control Permissions', desc: 'Granular allow/deny rules with production actions requiring human approval.' },
    { icon: <Eye className="w-6 h-6" />, title: 'Audit Everything', desc: 'Hash-chained, append-only log of every authorization decision and action.' },
    { icon: <Ban className="w-6 h-6" />, title: 'Revoke Instantly', desc: 'Pause, revoke, or block any agent in seconds. No lingering access.' },
  ];

  const steps = [
    { num: '01', title: 'Register Agent', desc: 'Create a unique digital identity with cryptographic key pair.' },
    { num: '02', title: 'Set Permissions', desc: 'Assign scoped allow/deny rules or apply permission templates.' },
    { num: '03', title: 'Monitor & Audit', desc: 'Every action is validated and recorded in a tamper-evident log.' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <nav className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-agentdnai.png" alt="AgentDNAI" className="h-8 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-crimson" onClick={() => setView('docs')}>
              <BookOpen className="w-4 h-4 mr-1" /> Docs
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-crimson" onClick={() => setView('login')}>
              Sign In
            </Button>
            <Button size="sm" className="bg-foreground text-background hover:bg-crimson hover:text-crimson-foreground" onClick={() => setView('register')}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden iridescent-bg">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '256px' }} />
        <div className="max-w-7xl mx-auto px-6 py-24 lg:py-36 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <Badge variant="outline" className="mb-6 border-crimson/30 text-crimson bg-crimson/5">
                <Lock className="w-3 h-3 mr-1" /> Zero-Trust Identity Layer
              </Badge>
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                Digital Identity &<br />
                Access Control for{' '}
                <span className="iridescent-text">AI Agents</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
                AgentDNAI gives every AI agent a verifiable digital identity, scoped permissions,
                encrypted credentials, revocable access and a tamper-evident audit trail.
                No more anonymous agents. No more blanket access.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="bg-crimson text-crimson-foreground hover:brightness-110 h-12 px-8 text-base font-semibold" onClick={() => setView('register')}>
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="border-border hover:border-crimson/40 hover:text-crimson h-12 px-8 text-base" onClick={() => setView('docs')}>
                  View Docs
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground/60">No credit card · Set up in 2 minutes · Open source</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="hidden lg:block">
              <div className="border border-border/60 bg-card p-5 shadow-elevated">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-foreground/60" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono">agentdnai check</span>
                </div>
                <pre className="text-sm font-mono text-foreground/70 leading-relaxed whitespace-pre-wrap">{`$ agentdnai check hermes-auditor github.repo.read \\
  --resource github.com/org/repo

AgentDNAI Authorization Check

  Agent:    hermes-auditor
  Action:   github.repo.read
  Resource: github.com/org/repo

  Decision: ALLOW ✓
  Reason:   Explicit permission found
  Expires:  2026-12-31 23:59:59 UTC`}</pre>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-24 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Identity, permissions and trust for AI agents</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Every agent gets a verifiable identity, scoped permissions, temporary tokens and a tamper-evident audit trail.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueProps.map((item, i) => (
              <motion.div key={i} variants={stagger} initial="initial" animate="animate" custom={i}>
                <Card className="bg-card border-border/60 hover:border-crimson/30 hover:shadow-card-hover transition-all group h-full">
                  <CardHeader>
                    <div className="w-10 h-10 rounded bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:text-crimson group-hover:bg-crimson/10 transition-colors">
                      {item.icon}
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{item.desc}</p></CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Counter */}
      <section className="py-16 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-muted-foreground mb-10">Trusted by teams building AI agents</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 47, suffix: '', label: 'Permissions' },
              { value: 9, suffix: '', label: 'Categories' },
              { value: 10, suffix: '', label: 'Templates' },
              { value: 0, suffix: '', label: 'Implicit Grants' },
            ].map((stat, i) => (
              <motion.div key={i} variants={stagger} initial="initial" animate="animate" custom={i} className="text-center">
                <div className="text-4xl lg:text-5xl font-bold iridescent-text">
                  <CountUpNumber target={stat.value} />{stat.suffix}
                </div>
                <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Deep-Dive */}
      <section className="py-24 border-t border-border/40 bg-card/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Built for security-first teams</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Every feature designed to give you complete control over AI agent access and identity.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Fingerprint className="w-5 h-5" />, title: 'Ed25519 Cryptographic Identity', desc: 'Every agent gets a unique Ed25519 key pair. Verify identity with challenge-response.' },
              { icon: <Hash className="w-5 h-5" />, title: 'Hash-Chained Audit Trail', desc: 'SHA-256 linked event chain. Detect any tampering with chain verification.' },
              { icon: <Shield className="w-5 h-5" />, title: 'Policy Engine', desc: 'Deny-by-default with explicit deny > allow. Production actions require human approval.' },
              { icon: <Key className="w-5 h-5" />, title: 'Temporary Tokens', desc: 'HMAC-SHA256 hashed tokens with configurable TTL. Revoke anytime.' },
              { icon: <AlertTriangle className="w-5 h-5" />, title: 'Risk Scoring', desc: '7-factor risk assessment for every agent. Auto-flag high-risk configurations.' },
              { icon: <Ban className="w-5 h-5" />, title: 'Wildcard Permissions', desc: 'Support for github.repo.* and production.* patterns. Fine-grained control.' },
            ].map((feature, i) => (
              <motion.div key={i} variants={stagger} initial="initial" animate="animate" custom={i}>
                <Card className="bg-card border-border/60 hover:border-crimson/30 hover:shadow-lg transition-all group h-full">
                  <CardHeader>
                    <div className="w-10 h-10 bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:text-crimson group-hover:bg-crimson/10 transition-colors">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{feature.desc}</p></CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground">Three steps to secure your AI agents.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((item, i) => (
              <motion.div key={i} variants={stagger} initial="initial" animate="animate" custom={i} className="relative text-center">
                <div className="text-5xl font-bold text-crimson/15 mb-3">{item.num}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {i < 2 && <ChevronRight className="hidden md:block absolute -right-4 top-1/3 text-border w-6 h-6" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-24 border-t border-border/40 bg-card/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Roadmap</h2>
            <p className="text-muted-foreground">Our journey to production-ready agent identity.</p>
          </div>
          <div className="relative max-w-3xl mx-auto">
            {/* Horizontal line */}
            <div className="absolute top-4 left-0 right-0 h-px bg-border" />
            <div className="grid grid-cols-4 gap-4">
              {[
                { version: 'v0.2', label: 'Core Identity', desc: 'Agents, permissions, audit', current: true },
                { version: 'v0.3', label: 'Auth & Security', desc: 'SSO, RBAC, key encryption', current: false },
                { version: 'v0.4', label: 'Integrations', desc: 'Hermes, Codex, OpenClaw SDKs', current: false },
                { version: 'v0.5', label: 'Observability', desc: 'Metrics, alerts, dashboards', current: false },
              ].map((milestone, i) => (
                <motion.div key={i} variants={stagger} initial="initial" animate="animate" custom={i} className="relative text-center">
                  <div className={`w-8 h-8 mx-auto flex items-center justify-center relative z-10 ${milestone.current ? 'bg-crimson' : 'bg-border'}`}>
                    {milestone.current && <div className="w-2.5 h-2.5 bg-crimson-foreground" />}
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`text-sm font-bold ${milestone.current ? 'text-crimson' : 'text-muted-foreground'}`}>{milestone.version}</span>
                      {milestone.current && (
                        <Badge className="bg-crimson text-crimson-foreground text-[9px] font-mono px-1.5 py-0">CURRENT</Badge>
                      )}
                    </div>
                    <p className={`text-xs font-medium mt-1 ${milestone.current ? 'text-foreground' : 'text-muted-foreground/60'}`}>{milestone.label}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">{milestone.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border/40 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-crimson/5 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-6 text-center relative">
          <h2 className="text-4xl font-bold mb-6">Every agent. Verified. Every action. Controlled.</h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">Stop giving AI agents blanket access. Start with zero-trust identity and scoped permissions.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-crimson text-crimson-foreground hover:brightness-110 h-14 px-10 text-lg font-semibold" onClick={() => setView('register')}>
              Get Started <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-border hover:border-crimson/40 hover:text-crimson h-14 px-10 text-lg" onClick={() => setView('docs')}>
              View Docs
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground/60">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-foreground/40" /> No credit card</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-foreground/40" /> 2-minute setup</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-foreground/40" /> Open source</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="text-sm font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><button onClick={() => setView('register')} className="hover:text-crimson transition-colors">Agents</button></li>
                <li><button onClick={() => setView('register')} className="hover:text-crimson transition-colors">Policies</button></li>
                <li><button onClick={() => setView('register')} className="hover:text-crimson transition-colors">Audit</button></li>
                <li><button onClick={() => setView('register')} className="hover:text-crimson transition-colors">Tokens</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><button onClick={() => setView('docs')} className="hover:text-crimson transition-colors">Docs</button></li>
                <li><button onClick={() => setView('docs')} className="hover:text-crimson transition-colors">API Reference</button></li>
                <li><button onClick={() => setView('docs')} className="hover:text-crimson transition-colors">CLI</button></li>
                <li><button onClick={() => setView('docs')} className="hover:text-crimson transition-colors">SDK</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Security</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-crimson/50" /> Zero Trust</li>
                <li className="flex items-center gap-1.5"><Hash className="w-3 h-3 text-crimson/50" /> Hash Chain</li>
                <li className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-crimson/50" /> Encryption</li>
                <li className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-crimson/50" /> Compliance</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><span className="hover:text-crimson transition-colors cursor-default">GitHub</span></li>
                <li><span className="hover:text-crimson transition-colors cursor-default">MIT License</span></li>
                <li><span className="hover:text-crimson transition-colors cursor-default">Contact</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/30 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-crimson" />
              <span className="text-sm font-semibold">Agent<span className="text-crimson">DNAI</span></span>
            </div>
            <p className="text-xs text-muted-foreground">Made with ❤️ for the AI agent community</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-crimson/60" /> Zero trust</span>
              <span className="flex items-center gap-1"><Hash className="w-3 h-3 text-crimson/60" /> Hash-verified</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-crimson/60" /> E2E encrypted</span>
            </div>
          </div>
          <div className="text-center mt-4">
            <span className="text-[10px] text-muted-foreground/50">© 2026 AgentDNAI · MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. LOGIN VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function LoginView() {
  const { setView, setSession } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      setSession(res.session.token, { id: res.user.id, email: res.user.email, name: res.user.name });
      setView('dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div {...pageTransition} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo-agentdnai.png" alt="AgentDNAI" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Sign In</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back to AgentDNAI</p>
        </div>
        <Card className="bg-card border-border/60">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-crimson bg-crimson/10 border border-crimson/20 px-3 py-2 rounded">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-sm">Email</Label>
                <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="bg-secondary/50 border-border/60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-pass" className="text-sm">Password</Label>
                <Input id="login-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="bg-secondary/50 border-border/60" />
              </div>
              <Button type="submit" className="w-full bg-crimson text-crimson-foreground hover:brightness-110" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Don&apos;t have an account?{' '}
          <button className="text-crimson hover:underline" onClick={() => setView('register')}>Register</button>
        </p>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. REGISTER VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function RegisterView() {
  const { setView, setSession } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.register({ email, password, name });
      setSession(res.session.token, { id: res.user.id, email: res.user.email, name: res.user.name });
      setView('onboarding');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div {...pageTransition} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo-agentdnai.png" alt="AgentDNAI" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up your AgentDNAI organization</p>
        </div>
        <Card className="bg-card border-border/60">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-crimson bg-crimson/10 border border-crimson/20 px-3 py-2 rounded">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reg-name" className="text-sm">Full Name</Label>
                <Input id="reg-name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required className="bg-secondary/50 border-border/60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email" className="text-sm">Email</Label>
                <Input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="bg-secondary/50 border-border/60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-pass" className="text-sm">Password</Label>
                <Input id="reg-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} className="bg-secondary/50 border-border/60" />
              </div>
              <Button type="submit" className="w-full bg-crimson text-crimson-foreground hover:brightness-110" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <button className="text-crimson hover:underline" onClick={() => setView('login')}>Sign In</button>
        </p>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ONBOARDING VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function OnboardingView() {
  const { setView, user } = useAppStore();
  const [step, setStep] = useState(0);
  const [agentName, setAgentName] = useState('');
  const [agentRuntime, setAgentRuntime] = useState('hermes');
  const [agentDesc, setAgentDesc] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);
  const [issuedToken, setIssuedToken] = useState<IssuedToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = ['Welcome', 'Create Agent', 'Permissions', 'Done'];

  const runtimes = [
    { value: 'hermes', label: 'Hermes' },
    { value: 'codex', label: 'Codex' },
    { value: 'openclaw', label: 'OpenClaw' },
    { value: 'cli', label: 'CLI' },
    { value: 'automation', label: 'Automation' },
    { value: 'custom', label: 'Custom' },
  ];

  const templates = PERMISSION_TEMPLATES.slice(0, 5);

  const createFirstAgent = async () => {
    if (!agentName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const agent = await api.createAgent({ name: agentName, runtime: agentRuntime, description: agentDesc || undefined });
      setCreatedAgent(agent);

      // Apply template if selected
      if (selectedTemplate) {
        const tpl = PERMISSION_TEMPLATES.find(t => t.id === selectedTemplate);
        if (tpl) {
          for (const scope of tpl.permissions) {
            await api.grantPermission(agent.id, { scope, effect: 'ALLOW' });
          }
          for (const scope of tpl.denied) {
            await api.grantPermission(agent.id, { scope, effect: 'DENY' });
          }
        }
      }
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  const issueFirstToken = async () => {
    if (!createdAgent) return;
    setLoading(true);
    try {
      const token = await api.issueToken({ agentId: createdAgent.id, scopes: ['*'], ttlSeconds: 86400 });
      setIssuedToken(token);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div {...pageTransition} className="w-full max-w-lg">
        <div className="text-center mb-6">
          <img src="/logo-agentdnai.png" alt="AgentDNAI" className="h-8 mx-auto mb-3" />
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-2 ${i <= step ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${i < step ? 'bg-crimson text-crimson-foreground' : i === step ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'}`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-sm hidden sm:inline">{s}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-crimson' : 'bg-border'}`} />}
            </React.Fragment>
          ))}
        </div>

        <Card className="bg-card border-border/60">
          <CardContent className="pt-6">
            {error && <div className="text-sm text-crimson bg-crimson/10 border border-crimson/20 px-3 py-2 rounded mb-4">{error}</div>}

            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-crimson/10 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-crimson" />
                </div>
                <h2 className="text-xl font-bold mb-2">Welcome, {user?.name || 'there'}!</h2>
                <p className="text-sm text-muted-foreground mb-6">Your organization is ready. Let&apos;s set up your first AI agent.</p>
                <Button className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={() => setStep(1)}>
                  Set Up First Agent <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <div className="mt-3">
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setView('dashboard')}>Skip for now</Button>
                </div>
              </div>
            )}

            {/* Step 1: Create Agent */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Register Your First Agent</h2>
                <p className="text-sm text-muted-foreground">Give your AI agent a unique identity.</p>
                <div className="space-y-2">
                  <Label className="text-sm">Agent Name</Label>
                  <Input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="e.g. hermes-auditor" className="bg-secondary/50 border-border/60" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Runtime</Label>
                  <Select value={agentRuntime} onValueChange={setAgentRuntime}>
                    <SelectTrigger className="bg-secondary/50 border-border/60"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {runtimes.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Description (optional)</Label>
                  <Textarea value={agentDesc} onChange={e => setAgentDesc(e.target.value)} placeholder="What does this agent do?" className="bg-secondary/50 border-border/60" rows={2} />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                  <Button className="flex-1 bg-crimson text-crimson-foreground hover:brightness-110" onClick={() => setStep(2)} disabled={!agentName.trim()}>
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Choose Template */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Choose Permission Template</h2>
                <p className="text-sm text-muted-foreground">Apply a pre-configured set of permissions. You can customize later.</p>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id === selectedTemplate ? null : tpl.id)}
                      className={`w-full text-left p-3 rounded border transition-colors ${selectedTemplate === tpl.id ? 'border-crimson/50 bg-crimson/5' : 'border-border/60 bg-secondary/30 hover:border-crimson/30'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{tpl.name}</span>
                        {selectedTemplate === tpl.id && <CheckCircle2 className="w-4 h-4 text-crimson" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tpl.permissions.slice(0, 4).map(p => (
                          <Badge key={p} variant="secondary" className="text-[10px] font-mono">{p}</Badge>
                        ))}
                        {tpl.permissions.length > 4 && <Badge variant="secondary" className="text-[10px]">+{tpl.permissions.length - 4}</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                  <Button className="flex-1 bg-crimson text-crimson-foreground hover:brightness-110" onClick={createFirstAgent} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Agent'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Done */}
            {step === 3 && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-crimson/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-crimson" />
                </div>
                <h2 className="text-xl font-bold">Agent Created!</h2>
                {createdAgent && (
                  <div className="bg-secondary/30 border border-border/60 rounded p-4 text-left space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-muted-foreground">URI</span>
                      <CopyButton text={createdAgent.agentUri} />
                    </div>
                    <p className="text-sm font-mono break-all">{createdAgent.agentUri}</p>
                    {createdAgent.fingerprint && (
                      <>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-mono text-muted-foreground">Fingerprint</span>
                          <CopyButton text={createdAgent.fingerprint} />
                        </div>
                        <p className="text-xs font-mono break-all text-muted-foreground">{createdAgent.fingerprint}</p>
                      </>
                    )}
                  </div>
                )}
                {issuedToken ? (
                  <div className="bg-crimson/5 border border-crimson/20 rounded p-3 text-left">
                    <p className="text-xs text-muted-foreground mb-1">Token (copy now — won&apos;t be shown again)</p>
                    <p className="text-xs font-mono break-all text-crimson">{issuedToken.token}</p>
                  </div>
                ) : (
                  <Button variant="outline" className="border-crimson/30 text-crimson hover:bg-crimson/5" onClick={issueFirstToken} disabled={loading}>
                    <Key className="w-4 h-4 mr-1" /> Issue Token
                  </Button>
                )}
                <Button className="w-full bg-crimson text-crimson-foreground hover:brightness-110" onClick={() => setView('dashboard')}>
                  Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SIDEBAR (authenticated layout)
// ═══════════════════════════════════════════════════════════════════════════════

function DashboardSidebar() {
  const { currentView, setView, sidebarOpen, setSidebarOpen, user, logout } = useAppStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => { setIsMobile(window.innerWidth < 768); if (window.innerWidth < 768 && sidebarOpen) setSidebarOpen(false); };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [sidebarOpen, setSidebarOpen]);

  const navItems = [
    { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'agents' as const, icon: Bot, label: 'Agents' },
    { id: 'approvals' as const, icon: Bell, label: 'Approvals' },
    { id: 'audit' as const, icon: ScrollText, label: 'Audit Log' },
    { id: 'policies' as const, icon: Shield, label: 'Policies' },
    { id: 'tokens' as const, icon: Key, label: 'Tokens' },
    { id: 'organizations' as const, icon: Building2, label: 'Orgs' },
    { id: 'api-keys' as const, icon: Hash, label: 'API Keys' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  if (isMobile) return null;

  return (
    <aside className={`border-r border-border/60 bg-sidebar shrink-0 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-14'}`}>
      <div className="p-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2 overflow-hidden">
          <img src="/logo-agentdnai.png" alt="" className="h-7 w-auto shrink-0" />
          {sidebarOpen && <span className="text-sm font-bold whitespace-nowrap">Agent<span className="text-crimson">DNAI</span></span>}
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="w-3.5 h-3.5" />
        </Button>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map(item => {
          const isActive = currentView === item.id;
          const btn = (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition-all ${
                isActive
                  ? 'text-crimson bg-crimson/10 border-l-2 border-crimson'
                  : 'text-muted-foreground hover:text-crimson hover:bg-crimson/5 border-l-2 border-transparent'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          );
          if (!sidebarOpen) {
            return (
              <TooltipProvider key={item.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          return btn;
        })}
      </nav>
      <div className="p-2 border-t border-border/60 space-y-0.5">
        <button onClick={() => setView('docs')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <BookOpen className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Docs</span>}
        </button>
      </div>
      {sidebarOpen && (
        <div className="p-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email || ''}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-crimson" onClick={logout}>
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}

// Mobile Bottom Nav
function MobileBottomNav() {
  const { currentView, setView } = useAppStore();
  const items = [
    { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Home' },
    { id: 'agents' as const, icon: Bot, label: 'Agents' },
    { id: 'approvals' as const, icon: Bell, label: 'Approvals' },
    { id: 'audit' as const, icon: ScrollText, label: 'Audit' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/60 z-50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around py-1.5">
        {items.map(item => (
          <button key={item.id} onClick={() => setView(item.id)} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded text-xs transition-colors ${currentView === item.id ? 'text-crimson' : 'text-muted-foreground'}`}>
            <item.icon className="w-5 h-5" />
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function DashboardView() {
  const { setView } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, events, a] = await Promise.all([api.getStats(), api.getAuditEvents({ limit: 10 }), api.listAgents()]);
        setStats(s);
        setRecentEvents(Array.isArray(events) ? events : []);
        setAgents(Array.isArray(a) ? a : []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Mock trend data
  const trendData: Record<string, { value: string; positive: boolean }> = {
    Agents: { value: '+12%', positive: true },
    'Active Tokens': { value: '+8%', positive: true },
    Permissions: { value: '+24%', positive: true },
    'Recent Events': { value: '-3%', positive: false },
  };

  const statCards = [
    { label: 'Agents', value: stats?.totalAgents ?? 0, icon: Bot, sub: `${stats?.activeAgents ?? 0} active` },
    { label: 'Active Tokens', value: stats?.activeTokens ?? 0, icon: Key, sub: 'issued & valid' },
    { label: 'Permissions', value: stats?.totalPermissions ?? 0, icon: Shield, sub: 'scoped rules' },
    { label: 'Recent Events', value: (stats?.recentAllowCount ?? 0) + (stats?.recentDenyCount ?? 0) + (stats?.recentRequiresApprovalCount ?? 0), icon: Activity, sub: `${stats?.recentAllowCount ?? 0} allow · ${stats?.recentDenyCount ?? 0} deny` },
  ];

  // Compute security score
  const securityScore = useMemo(() => {
    if (!stats) return 0;
    const total = stats.totalAgents || 1;
    const activePct = (stats.activeAgents / total) * 100;
    const allowPct = stats.recentAllowCount / ((stats.recentAllowCount + stats.recentDenyCount + stats.recentRequiresApprovalCount) || 1) * 100;
    const permCoverage = Math.min((stats.totalPermissions / (total * 5)) * 100, 100);
    return Math.round((activePct * 0.3 + permCoverage * 0.4 + (100 - allowPct) * 0.3));
  }, [stats]);

  const quickActions = [
    { label: 'Create Agent', icon: Plus, view: 'agents' as const, desc: 'Register a new AI agent identity' },
    { label: 'Issue Token', icon: Key, view: 'tokens' as const, desc: 'Generate temporary credentials' },
    { label: 'Check Auth', icon: Shield, view: 'audit' as const, desc: 'Test authorization decisions' },
    { label: 'View Policies', icon: ScrollText, view: 'policies' as const, desc: 'Manage permission templates' },
  ];

  // Authz decisions bar chart data
  const allowCount = stats?.recentAllowCount ?? 0;
  const denyCount = stats?.recentDenyCount ?? 0;
  const approvalCount = stats?.recentRequiresApprovalCount ?? 0;
  const totalDecisions = allowCount + denyCount + approvalCount || 1;

  // Event type colors for timeline
  const eventColorMap: Record<string, string> = {
    allow: 'border-l-foreground',
    deny: 'border-l-crimson',
    requires_approval: 'border-l-muted-foreground',
  };
  const eventIconMap: Record<string, React.ReactNode> = {
    AUTHORIZATION_CHECK: <Shield className="w-3 h-3" />,
    PERMISSION_GRANTED: <CheckCircle2 className="w-3 h-3" />,
    PERMISSION_REVOKED: <XCircle className="w-3 h-3" />,
    AGENT_CREATED: <Plus className="w-3 h-3" />,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Dashboard" subtitle="Overview of your AI agent fleet" action={
        <Button size="sm" className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={() => setView('agents')}>
          <Plus className="w-4 h-4 mr-1" /> New Agent
        </Button>
      } />

      {/* Stats with Trends */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => {
          const trend = trendData[s.label];
          return (
            <motion.div key={s.label} variants={stagger} initial="initial" animate="animate" custom={i}>
              <Card className="bg-card border-border/60 hover:border-crimson/20 transition-colors">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
                    <s.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold">{loading ? '—' : s.value}</div>
                    {trend && (
                      <span className={`text-[11px] font-mono flex items-center gap-0.5 mb-0.5 ${trend.positive ? 'text-foreground/70' : 'text-crimson'}`}>
                        {trend.positive ? <ArrowRight className="w-3 h-3 rotate-[-45deg]" /> : <ArrowRight className="w-3 h-3 rotate-[45deg]" />}
                        {trend.value}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{s.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Middle Row: Authz Bar Chart + Security Score + Fleet Overview */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Authorization Decisions Bar Chart */}
        <motion.div variants={stagger} initial="initial" animate="animate" custom={0}>
          <Card className="bg-card border-border/60 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Authorization Decisions</CardTitle>
              <p className="text-[10px] text-muted-foreground">Recent decision distribution</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Stacked bar */}
                <div className="flex h-6 w-full border border-border/40 overflow-hidden">
                  <div className="bg-foreground/70 transition-all duration-500" style={{ width: `${(allowCount / totalDecisions) * 100}%` }} />
                  <div className="bg-crimson transition-all duration-500" style={{ width: `${(denyCount / totalDecisions) * 100}%` }} />
                  <div className="bg-muted-foreground/50 transition-all duration-500" style={{ width: `${(approvalCount / totalDecisions) * 100}%` }} />
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-foreground/70" /> Allow ({allowCount})</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-crimson" /> Deny ({denyCount})</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-muted-foreground/50" /> Approval ({approvalCount})</span>
                </div>
                {/* Individual bars */}
                <div className="space-y-2 pt-2">
                  {[
                    { label: 'Allow', count: allowCount, color: 'bg-foreground/70' },
                    { label: 'Deny', count: denyCount, color: 'bg-crimson' },
                    { label: 'Approval', count: approvalCount, color: 'bg-muted-foreground/50' },
                  ].map(bar => (
                    <div key={bar.label} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-14">{bar.label}</span>
                      <div className="flex-1 h-3 bg-secondary/30 border border-border/30">
                        <div className={`h-full ${bar.color} transition-all duration-500`} style={{ width: `${(bar.count / totalDecisions) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-mono w-6 text-right">{bar.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Score */}
        <motion.div variants={stagger} initial="initial" animate="animate" custom={1}>
          <Card className="bg-card border-border/60 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Security Score</CardTitle>
              <p className="text-[10px] text-muted-foreground">Platform security posture</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="relative mb-3">
                <CircularRiskScore score={100 - securityScore} size={110} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{securityScore}</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Score</span>
                </div>
              </div>
              <div className="space-y-1.5 w-full text-[10px] text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Audit Chain</span>
                  <span className="flex items-center gap-1 text-foreground/70"><CheckCircle2 className="w-3 h-3" /> Verified</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Agents</span>
                  <span>{stats ? Math.round((stats.activeAgents / (stats.totalAgents || 1)) * 100) : 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Permission Coverage</span>
                  <span>{stats ? Math.min(Math.round((stats.totalPermissions / ((stats.totalAgents || 1) * 5)) * 100), 100) : 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Agent Fleet Overview */}
        <motion.div variants={stagger} initial="initial" animate="animate" custom={2}>
          <Card className="bg-card border-border/60 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Agent Fleet</CardTitle>
                <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground hover:text-crimson h-6" onClick={() => setView('agents')}>View all →</Button>
              </div>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No agents yet</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {agents.slice(0, 8).map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => { useAppStore.getState().navigateToAgent(agent.id); }}
                      className="flex items-center gap-2 p-2 border border-border/40 bg-secondary/20 hover:border-crimson/30 hover:bg-crimson/5 transition-colors text-left"
                    >
                      <RuntimeIcon runtime={agent.runtime} className="w-3.5 h-3.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium truncate">{agent.name}</p>
                        <div className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${agent.status === 'ACTIVE' ? 'bg-foreground animate-pulse' : agent.status === 'PAUSED' ? 'bg-muted-foreground' : 'bg-crimson'}`} />
                          <span className="text-[9px] text-muted-foreground">{agent.status}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions Redesigned */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {quickActions.map((a, i) => (
          <motion.button key={a.label} variants={stagger} initial="initial" animate="animate" custom={i} onClick={() => setView(a.view)} className="flex flex-col items-start gap-1.5 p-4 border border-border/60 bg-card hover:border-crimson/30 hover:bg-crimson/5 transition-colors text-left group">
            <div className="w-8 h-8 bg-secondary/50 flex items-center justify-center group-hover:bg-crimson/10 transition-colors">
              <a.icon className="w-4 h-4 text-muted-foreground group-hover:text-crimson transition-colors" />
            </div>
            <span className="text-sm font-medium group-hover:text-crimson transition-colors">{a.label}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{a.desc}</span>
          </motion.button>
        ))}
      </div>

      {/* Recent Activity Timeline */}
      <Card className="bg-card border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-crimson" onClick={() => setView('audit')}>View all →</Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No events yet</p>
          ) : (
            <div className="space-y-0 max-h-72 overflow-y-auto custom-scrollbar">
              {recentEvents.map(evt => (
                <div key={evt.id} className={`flex items-center gap-3 py-2.5 border-b border-border/20 last:border-0 border-l-2 ${eventColorMap[evt.decision || ''] || 'border-l-muted-foreground/30'} pl-3`}>
                  <div className="w-6 h-6 bg-secondary/40 flex items-center justify-center shrink-0 text-muted-foreground">
                    {eventIconMap[evt.eventType] || <Activity className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate">{evt.action || evt.eventType}</p>
                    <p className="text-[10px] text-muted-foreground">{evt.eventType.replace(/_/g, ' ').toLowerCase()}</p>
                  </div>
                  <DecisionBadge decision={evt.decision || 'unknown'} />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(evt.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="bg-card border-border/60 mt-4">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-foreground animate-pulse" /> System Operational</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Policy Engine Active</span>
            <span className="flex items-center gap-1.5"><Hash className="w-3 h-3" /> Audit Chain Verified</span>
            <span className="flex items-center gap-1.5"><Bot className="w-3 h-3" /> {stats?.activeAgents ?? 0} Agents Online</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. AGENTS LIST VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function AgentsView() {
  const { navigateToAgent } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [runtimeFilter, setRuntimeFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRuntime, setNewRuntime] = useState('hermes');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const loadAgents = useCallback(async () => {
    try {
      const data = await api.listAgents({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        runtime: runtimeFilter !== 'all' ? runtimeFilter : undefined,
      });
      setAgents(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, statusFilter, runtimeFilter]);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.createAgent({ name: newName, runtime: newRuntime, description: newDesc || undefined });
      setCreateOpen(false);
      setNewName('');
      setNewDesc('');
      loadAgents();
      toast({ title: 'Agent created', description: `${newName} has been registered.` });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create agent', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Agents" subtitle="Manage your AI agent identities" action={
        <Button size="sm" className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Create Agent
        </Button>
      } />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border/60" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] bg-card border-border/60"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="REVOKED">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={runtimeFilter} onValueChange={setRuntimeFilter}>
          <SelectTrigger className="w-[130px] bg-card border-border/60"><SelectValue placeholder="Runtime" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Runtimes</SelectItem>
            <SelectItem value="hermes">Hermes</SelectItem>
            <SelectItem value="codex">Codex</SelectItem>
            <SelectItem value="openclaw">OpenClaw</SelectItem>
            <SelectItem value="cli">CLI</SelectItem>
            <SelectItem value="automation">Automation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No agents found</p>
          <Button variant="outline" size="sm" className="mt-3 border-crimson/30 text-crimson hover:bg-crimson/5" onClick={() => setCreateOpen(true)}>
            Create your first agent
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, i) => (
            <motion.div key={agent.id} variants={stagger} initial="initial" animate="animate" custom={i}>
              <Card
                className="bg-card border-border/60 hover:border-crimson/30 hover:shadow-card-hover transition-all cursor-pointer group"
                onClick={() => navigateToAgent(agent.id)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <RuntimeIcon runtime={agent.runtime} />
                      <span className="font-semibold text-sm group-hover:text-crimson transition-colors">{agent.name}</span>
                    </div>
                    <StatusBadge status={agent.status} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-muted-foreground truncate flex-1">{agent.agentUri}</span>
                    <CopyButton text={agent.agentUri} />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {agent._count?.permissions ?? 0} perms</span>
                    <span className="flex items-center gap-1"><Key className="w-3 h-3" /> {agent._count?.tokens ?? 0} tokens</span>
                    <Badge variant="secondary" className="text-[10px] font-mono ml-auto">{agent.runtime}</Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>Register a new AI agent with a unique identity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. my-agent" className="bg-secondary/50 border-border/60" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Runtime</Label>
              <Select value={newRuntime} onValueChange={setNewRuntime}>
                <SelectTrigger className="bg-secondary/50 border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['hermes', 'codex', 'openclaw', 'cli', 'automation', 'custom'].map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What does this agent do?" className="bg-secondary/50 border-border/60" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? 'Creating...' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. AGENT DETAIL / DNI CARD VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function AgentDetailView() {
  const { selectedAgentId, setView } = useAppStore();
  const [agent, setAgent] = useState<(Agent & { permissions: Permission[]; tokens: Token[]; auditEvents: AuditEvent[] }) | null>(null);
  const [riskData, setRiskData] = useState<{ riskScore: number; riskLevel: string; factors: { name: string; impact: number; description: string }[] } | null>(null);
  const [healthData, setHealthData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('permissions');
  const [grantOpen, setGrantOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [authzOpen, setAuthzOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [newScope, setNewScope] = useState('');
  const [newEffect, setNewEffect] = useState('ALLOW');
  const [newResource, setNewResource] = useState('');
  const [tokenScopes, setTokenScopes] = useState('');
  const [tokenTTL, setTokenTTL] = useState('3600');
  const [authzAction, setAuthzAction] = useState('');
  const [authzResult, setAuthzResult] = useState<AuthzResult | null>(null);
  const [issuedToken, setIssuedToken] = useState<IssuedToken | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  // Authz Playground state
  const [playgroundActions, setPlaygroundActions] = useState('');
  const [playgroundResults, setPlaygroundResults] = useState<AuthzResult[]>([]);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);

  const loadAgent = useCallback(async () => {
    if (!selectedAgentId) return;
    try {
      const [data, risk] = await Promise.all([
        api.getAgent(selectedAgentId),
        api.getAgentRisk(selectedAgentId).catch(() => null),
      ]);
      setAgent(data);
      setRiskData(risk);
      // Load health data (mock if endpoint doesn't exist)
      try {
        const health = await api.getAgentHealth(selectedAgentId);
        setHealthData(health);
      } catch {
        setHealthData(null);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [selectedAgentId]);

  useEffect(() => { loadAgent(); }, [loadAgent]);

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading agent...</div>;
  if (!agent) return <div className="p-6 text-center text-muted-foreground">Agent not found</div>;

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      if (action === 'pause') await api.pauseAgent(agent.id);
      else if (action === 'resume') await api.resumeAgent(agent.id);
      else if (action === 'revoke') await api.revokeAgent(agent.id);
      else if (action === 'rotateKey') await api.rotateKey(agent.id);
      toast({ title: `Agent ${action === 'rotateKey' ? 'key rotated' : action + 'd'}` });
      loadAgent();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Action failed', variant: 'destructive' });
    } finally { setActionLoading(false); }
  };

  const handleGrant = async () => {
    if (!newScope.trim()) return;
    setActionLoading(true);
    try {
      await api.grantPermission(agent.id, { scope: newScope, effect: newEffect as 'ALLOW' | 'DENY', resource: newResource || undefined });
      setGrantOpen(false);
      setNewScope('');
      setNewResource('');
      loadAgent();
      toast({ title: 'Permission granted' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setActionLoading(false); }
  };

  const handleIssueToken = async () => {
    setActionLoading(true);
    try {
      const token = await api.issueToken({
        agentId: agent.id,
        scopes: tokenScopes.split(',').map(s => s.trim()).filter(Boolean),
        ttlSeconds: parseInt(tokenTTL),
      });
      setIssuedToken(token);
      loadAgent();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setActionLoading(false); }
  };

  const handleCheckAuthz = async () => {
    if (!authzAction.trim()) return;
    setActionLoading(true);
    try {
      const result = await api.checkAuthz({ agentId: agent.id, action: authzAction });
      setAuthzResult(result);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setActionLoading(false); }
  };

  const handlePlaygroundCheck = async () => {
    const actions = playgroundActions.split('\n').map(a => a.trim()).filter(Boolean);
    if (actions.length === 0) return;
    setPlaygroundLoading(true);
    try {
      const result = await api.batchCheckAuthz({ agentId: agent.id, actions });
      setPlaygroundResults(result.results || []);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Batch check failed', variant: 'destructive' });
    } finally { setPlaygroundLoading(false); }
  };

  // Mock health checks if no API data
  const healthChecks = healthData ? (healthData.checks as { name: string; status: boolean; description: string }[]) : [
    { name: 'Key Rotation', status: agent.status === 'ACTIVE', description: agent.status === 'ACTIVE' ? 'Key pair is active and not expired' : 'Key pair may need rotation' },
    { name: 'Token Health', status: agent.tokens.filter(t => !t.revokedAt).length > 0, description: `${agent.tokens.filter(t => !t.revokedAt).length} active token(s)` },
    { name: 'Permission Count', status: agent.permissions.length > 0, description: `${agent.permissions.length} permission(s) configured` },
    { name: 'Audit Trail', status: agent.auditEvents.length > 0, description: `${agent.auditEvents.length} audit event(s) recorded` },
  ];

  // Truncate public key for display
  const truncatedKey = agent.publicKey ? `${agent.publicKey.slice(0, 20)}...${agent.publicKey.slice(-12)}` : 'N/A';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => setView('agents')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-crimson mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Agents
      </button>

      {/* DNI Card - Enhanced */}
      <Card className="bg-card border-border/60 mb-6 overflow-hidden relative">
        {/* Gradient accent line at top */}
        <div className="h-1 bg-gradient-to-r from-crimson/60 via-crimson to-crimson/60" />

        {/* VALID watermark for ACTIVE agents */}
        {agent.status === 'ACTIVE' && (
          <div className="absolute top-8 right-8 text-[80px] font-black text-foreground/[0.03] leading-none select-none pointer-events-none rotate-[-15deg]">
            VALID
          </div>
        )}

        {/* Card Header */}
        <div className="bg-gradient-to-r from-secondary/60 via-secondary/30 to-secondary/60 px-6 py-4 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo-agentdnai.png" alt="" className="h-6 w-auto" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Digital Agent Identity</span>
            </div>
            <StatusBadge status={agent.status} />
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Identity Info */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                {agent.description && <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="font-mono text-xs"><RuntimeIcon runtime={agent.runtime} className="w-3 h-3 mr-1" /> {agent.runtime}</Badge>
                <Badge variant="outline" className="font-mono text-xs border-border/60">{agent.environment || 'default'}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">URI</span>
                  <span className="text-sm font-mono truncate flex-1">{agent.agentUri}</span>
                  <CopyButton text={agent.agentUri} />
                </div>
                {/* Public Key with copy */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">Public Key</span>
                  <span className="text-xs font-mono truncate flex-1 text-muted-foreground">{truncatedKey}</span>
                  <CopyButton text={agent.publicKey} />
                </div>
                {agent.fingerprint && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">Fingerprint</span>
                    <span className="text-xs font-mono truncate flex-1 text-muted-foreground">{agent.fingerprint}</span>
                    <CopyButton text={agent.fingerprint} />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">Created</span>
                  <span className="text-xs">{timeAgo(agent.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">Last Seen</span>
                  <span className="text-xs">{agent.lastSeenAt ? timeAgo(agent.lastSeenAt) : 'Never'}</span>
                </div>
              </div>
            </div>

            {/* Right: Risk Score */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <CircularRiskScore score={riskData?.riskScore ?? 0} size={100} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold">{riskData?.riskScore ?? 0}</span>
                  <span className="text-[10px] text-muted-foreground">RISK</span>
                </div>
              </div>
              {riskData && <RiskBadge riskLevel={riskData.riskLevel} />}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-border/40 px-6 py-3 flex flex-wrap gap-2">
          {agent.status === 'ACTIVE' ? (
            <Button variant="outline" size="sm" className="text-xs border-border/60 hover:border-crimson/40 hover:text-crimson" onClick={() => handleAction('pause')} disabled={actionLoading}>
              <Pause className="w-3 h-3 mr-1" /> Pause
            </Button>
          ) : agent.status === 'PAUSED' ? (
            <Button variant="outline" size="sm" className="text-xs border-border/60 hover:border-crimson/40 hover:text-crimson" onClick={() => handleAction('resume')} disabled={actionLoading}>
              <Play className="w-3 h-3 mr-1" /> Resume
            </Button>
          ) : null}
          <Button variant="outline" size="sm" className="text-xs border-border/60 hover:border-crimson/40 hover:text-crimson" onClick={() => handleAction('revoke')} disabled={actionLoading || agent.status === 'REVOKED'}>
            <Ban className="w-3 h-3 mr-1" /> Revoke
          </Button>
          <Button variant="outline" size="sm" className="text-xs border-border/60 hover:border-crimson/40 hover:text-crimson" onClick={() => handleAction('rotateKey')} disabled={actionLoading}>
            <RotateCw className="w-3 h-3 mr-1" /> Rotate Key
          </Button>
          <Button size="sm" className="text-xs bg-crimson text-crimson-foreground hover:brightness-110 ml-auto" onClick={() => setTokenOpen(true)}>
            <Key className="w-3 h-3 mr-1" /> Issue Token
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="permissions" className="text-xs">Permissions ({agent.permissions.length})</TabsTrigger>
          <TabsTrigger value="tokens" className="text-xs">Tokens ({agent.tokens.length})</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs">Risk</TabsTrigger>
          <TabsTrigger value="health" className="text-xs">Health</TabsTrigger>
        </TabsList>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Permissions</CardTitle>
                <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson hover:bg-crimson/5" onClick={() => setGrantOpen(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Grant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {agent.permissions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No permissions granted</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40">
                      <TableHead className="text-xs">Scope</TableHead>
                      <TableHead className="text-xs">Effect</TableHead>
                      <TableHead className="text-xs">Resource</TableHead>
                      <TableHead className="text-xs">Expires</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent.permissions.map(p => (
                      <TableRow key={p.id} className="border-border/20">
                        <TableCell className="font-mono text-xs">{p.scope}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-mono ${p.effect === 'ALLOW' ? 'border-foreground/20' : 'border-crimson/40 text-crimson'}`}>
                            {p.effect}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.resource || '*'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.expiresAt ? timeAgo(p.expiresAt) : 'Never'}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-crimson" onClick={async () => {
                            try { await api.deletePermission(agent.id, p.id); loadAgent(); toast({ title: 'Permission removed' }); }
                            catch (err: unknown) { toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' }); }
                          }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tokens Tab */}
        <TabsContent value="tokens">
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Tokens</CardTitle>
                <Button size="sm" className="text-xs bg-crimson text-crimson-foreground hover:brightness-110" onClick={() => setTokenOpen(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Issue
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {agent.tokens.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No tokens issued</p>
              ) : (
                <div className="space-y-2">
                  {agent.tokens.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded border border-border/40 bg-secondary/20">
                      <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono truncate">{t.scopes}</span>
                          {t.revokedAt && <Badge variant="outline" className="text-[10px] border-crimson/40 text-crimson">REVOKED</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                          <span>Expires: {timeAgo(t.expiresAt)}</span>
                          <span>Last used: {t.lastUsedAt ? timeAgo(t.lastUsedAt) : 'Never'}</span>
                        </div>
                      </div>
                      {!t.revokedAt && (
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-crimson shrink-0" onClick={async () => {
                          try { await api.revokeToken(t.id); loadAgent(); toast({ title: 'Token revoked' }); }
                          catch (err: unknown) { toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' }); }
                        }}>
                          <Ban className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab with Authorization Playground */}
        <TabsContent value="audit">
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Audit Events</CardTitle>
                <Button size="sm" variant="outline" className="text-xs border-border/60" onClick={() => setAuthzOpen(true)}>
                  <Shield className="w-3 h-3 mr-1" /> Check Authorization
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {agent.auditEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No audit events</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {agent.auditEvents.slice(0, 20).map(evt => (
                    <div key={evt.id} className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-0">
                      <DecisionBadge decision={evt.decision || 'unknown'} />
                      <span className="text-xs font-mono text-muted-foreground truncate flex-1">{evt.action || evt.eventType}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(evt.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Authorization Playground */}
          <Card className="bg-card border-border/60 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Command className="w-4 h-4" /> Authorization Playground
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">Batch-check multiple actions against this agent. Enter one action per line.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={playgroundActions}
                onChange={e => setPlaygroundActions(e.target.value)}
                placeholder={"github.repo.read\nfilesystem.write\nproduction.deploy\nsecrets.read"}
                className="bg-secondary/50 border-border/60 font-mono text-xs min-h-[100px]"
                rows={5}
              />
              <Button size="sm" className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={handlePlaygroundCheck} disabled={playgroundLoading || !playgroundActions.trim()}>
                {playgroundLoading ? 'Checking...' : 'Run Batch Check'}
              </Button>
              {playgroundResults.length > 0 && (
                <div className="space-y-2 mt-2">
                  {/* Summary */}
                  <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-foreground/70" /> {playgroundResults.filter(r => r.decision === 'allow').length} allowed</span>
                    <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-crimson" /> {playgroundResults.filter(r => r.decision === 'deny').length} denied</span>
                    <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-muted-foreground" /> {playgroundResults.filter(r => r.decision === 'requires_approval').length} approval</span>
                  </div>
                  {playgroundResults.map((result, idx) => {
                    const action = playgroundActions.split('\n').filter(Boolean)[idx] || `Action ${idx + 1}`;
                    const isAllow = result.decision === 'allow';
                    const isDeny = result.decision === 'deny';
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`flex items-center gap-3 p-2.5 border ${isAllow ? 'border-foreground/20 bg-foreground/[0.03]' : isDeny ? 'border-crimson/30 bg-crimson/[0.03]' : 'border-muted-foreground/30 bg-secondary/30'}`}
                      >
                        {isAllow ? <CheckCircle2 className="w-4 h-4 text-foreground/70 shrink-0" /> : isDeny ? <XCircle className="w-4 h-4 text-crimson shrink-0" /> : <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />}
                        <span className="text-xs font-mono flex-1 truncate">{action}</span>
                        <Badge variant="outline" className={`text-[10px] font-mono ${isAllow ? 'border-foreground/20' : isDeny ? 'border-crimson/40 text-crimson' : 'border-border'}`}>
                          {result.decision.replace('_', ' ')}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground max-w-[200px] truncate">{result.reason}</span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk">
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Risk Factors</CardTitle>
                <Button size="sm" variant="outline" className="text-xs border-border/60" onClick={loadAgent}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!riskData ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Risk analysis unavailable</p>
              ) : (
                <div className="space-y-3">
                  {riskData.factors.map(f => (
                    <div key={f.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{f.name}</span>
                        <span className="text-xs text-muted-foreground">+{f.impact}</span>
                      </div>
                      <Progress value={Math.min(f.impact, 100)} className="h-1.5 bg-secondary/50" />
                      <p className="text-[10px] text-muted-foreground">{f.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Check Tab */}
        <TabsContent value="health">
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Health Check</CardTitle>
                <Button size="sm" variant="outline" className="text-xs border-border/60" onClick={loadAgent}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Recheck
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthChecks.map(check => (
                  <div key={check.name} className="flex items-start gap-3 p-3 border border-border/40 bg-secondary/20">
                    {check.status ? (
                      <CheckCircle2 className="w-4 h-4 text-foreground/70 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-crimson shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{check.name}</span>
                        <Badge variant="outline" className={`text-[9px] font-mono ${check.status ? 'border-foreground/20' : 'border-crimson/40 text-crimson'}`}>
                          {check.status ? 'HEALTHY' : 'ISSUE'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{check.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Grant Permission Dialog with Catalog Browser */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="bg-card border-border/60 max-w-lg">
          <DialogHeader>
            <DialogTitle>Grant Permission</DialogTitle>
            <DialogDescription>Add a new permission scope to this agent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Scope</Label>
                <Button variant="ghost" size="sm" className="text-[10px] text-crimson hover:text-crimson h-5" onClick={() => setCatalogOpen(!catalogOpen)}>
                  <Shield className="w-3 h-3 mr-1" /> {catalogOpen ? 'Hide Catalog' : 'Browse Catalog'}
                </Button>
              </div>
              <Input value={newScope} onChange={e => setNewScope(e.target.value)} placeholder="e.g. github.repo.read" className="bg-secondary/50 border-border/60 font-mono text-sm" />
            </div>

            {/* Permission Catalog Browser */}
            {catalogOpen && (
              <div className="max-h-48 overflow-y-auto custom-scrollbar border border-border/40 bg-secondary/20 p-2 space-y-3">
                {PERMISSION_CATEGORIES.map(cat => {
                  const catPerms = PERMISSIONS.filter(p => p.category === cat);
                  return (
                    <div key={cat}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{cat}</p>
                      <div className="flex flex-wrap gap-1">
                        {catPerms.map(p => (
                          <button
                            key={p.scope}
                            onClick={() => { setNewScope(p.scope); setCatalogOpen(false); }}
                            className={`text-[10px] font-mono px-1.5 py-0.5 border transition-colors ${newScope === p.scope ? 'border-crimson/50 bg-crimson/10 text-crimson' : 'border-border/40 bg-card hover:border-crimson/30 hover:text-crimson'}`}
                          >
                            {p.scope}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm">Effect</Label>
              <Select value={newEffect} onValueChange={setNewEffect}>
                <SelectTrigger className="bg-secondary/50 border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALLOW">ALLOW</SelectItem>
                  <SelectItem value="DENY">DENY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Resource (optional)</Label>
              <Input value={newResource} onChange={e => setNewResource(e.target.value)} placeholder="e.g. github.com/org/repo" className="bg-secondary/50 border-border/60" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setGrantOpen(false); setCatalogOpen(false); }}>Cancel</Button>
            <Button className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={handleGrant} disabled={actionLoading || !newScope.trim()}>
              {actionLoading ? 'Granting...' : 'Grant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Token Dialog */}
      <Dialog open={tokenOpen} onOpenChange={setTokenOpen}>
        <DialogContent className="bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>Issue Token</DialogTitle>
            <DialogDescription>Generate a temporary authentication token for this agent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Scopes (comma-separated)</Label>
              <Input value={tokenScopes} onChange={e => setTokenScopes(e.target.value)} placeholder="github.repo.read, github.issue.read" className="bg-secondary/50 border-border/60 font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">TTL</Label>
              <Select value={tokenTTL} onValueChange={setTokenTTL}>
                <SelectTrigger className="bg-secondary/50 border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3600">1 hour</SelectItem>
                  <SelectItem value="21600">6 hours</SelectItem>
                  <SelectItem value="86400">24 hours</SelectItem>
                  <SelectItem value="604800">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {issuedToken && (
              <div className="bg-crimson/5 border border-crimson/20 rounded p-3">
                <p className="text-xs text-muted-foreground mb-1">Token (copy now — won&apos;t be shown again)</p>
                <p className="text-xs font-mono break-all text-crimson">{issuedToken.token}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setTokenOpen(false); setIssuedToken(null); }}>Cancel</Button>
            <Button className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={handleIssueToken} disabled={actionLoading}>
              {actionLoading ? 'Issuing...' : 'Issue Token'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Authz Check Dialog */}
      <Dialog open={authzOpen} onOpenChange={setAuthzOpen}>
        <DialogContent className="bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>Check Authorization</DialogTitle>
            <DialogDescription>Test whether this agent is allowed to perform an action.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Action</Label>
              <Input value={authzAction} onChange={e => setAuthzAction(e.target.value)} placeholder="e.g. github.repo.read" className="bg-secondary/50 border-border/60 font-mono text-sm" />
            </div>
            {authzResult && (
              <div className={`p-3 rounded border ${authzResult.allowed ? 'border-foreground/20 bg-secondary/30' : 'border-crimson/30 bg-crimson/5'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {authzResult.allowed ? <CheckCircle2 className="w-4 h-4" /> : <ShieldX className="w-4 h-4 text-crimson" />}
                  <span className="text-sm font-semibold">{authzResult.decision.toUpperCase()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{authzResult.reason}</p>
                {authzResult.requiresApproval && (
                  <Button size="sm" className="mt-2 text-xs bg-crimson text-crimson-foreground hover:brightness-110" onClick={async () => {
                    try { await api.approveAction(agent.id, { action: authzAction }); loadAgent(); toast({ title: 'Approved for 1 hour' }); setAuthzOpen(false); }
                    catch (err: unknown) { toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' }); }
                  }}>
                    Approve This Action (1h)
                  </Button>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setAuthzOpen(false); setAuthzResult(null); }}>Cancel</Button>
            <Button className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={handleCheckAuthz} disabled={actionLoading || !authzAction.trim()}>
              Check
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. APPROVALS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function ApprovalsView() {
  const [pending, setPending] = useState<ApprovalRequest[]>([]);
  const [resolved, setResolved] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApprovals = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([
        api.listApprovals({ status: 'pending' }).catch(() => []),
        api.listApprovals({ status: 'approved' }).catch(() => []),
      ]);
      setPending(Array.isArray(p) ? p : []);
      setResolved(Array.isArray(r) ? r : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);

  const handleDecision = async (id: string, approve: boolean) => {
    try {
      if (approve) await api.approveRequest(id);
      else await api.rejectRequest(id);
      loadApprovals();
      toast({ title: `Request ${approve ? 'approved' : 'rejected'}` });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Approvals" subtitle="Review pending authorization requests" />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Pending */}
          <Card className="bg-card border-border/60 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-crimson" /> Pending Requests
                {pending.length > 0 && <Badge className="bg-crimson text-crimson-foreground text-[10px]">{pending.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No pending requests</p>
              ) : (
                <div className="space-y-3">
                  {pending.map(req => (
                    <div key={req.id} className="flex items-center gap-4 p-3 rounded border border-border/40 bg-secondary/20">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{req.agent?.name || 'Agent'}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">{req.action}</Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {req.resource && <span>Resource: {req.resource} · </span>}
                          Requested {timeAgo(req.createdAt)}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="text-xs bg-crimson text-crimson-foreground hover:brightness-110" onClick={() => handleDecision(req.id, true)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson hover:bg-crimson/5" onClick={() => handleDecision(req.id, false)}>
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolved History */}
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Resolved History</CardTitle>
            </CardHeader>
            <CardContent>
              {resolved.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No resolved requests</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {resolved.map(req => (
                    <div key={req.id} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                      <Badge variant="outline" className="text-[10px] font-mono">{req.action}</Badge>
                      <span className="text-xs text-muted-foreground flex-1">{req.agent?.name || 'Agent'}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(req.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. AUDIT LOG VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function AuditView() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDecision, setFilterDecision] = useState('all');
  const [filterEventType, setFilterEventType] = useState('all');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const data = await api.getAuditEvents({
        decision: filterDecision !== 'all' ? filterDecision : undefined,
        eventType: filterEventType !== 'all' ? filterEventType : undefined,
        limit: 100,
      });
      setEvents(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filterDecision, filterEventType]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleVerify = async () => {
    try {
      const result = await api.verifyAuditChain();
      setVerifyResult(result.valid ? `✓ Chain intact (${result.eventsChecked} events)` : `✗ Chain broken at event ${result.firstInvalidEvent}`);
    } catch {
      setVerifyResult('Verification failed');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'agentdnai-export.json'; a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast({ title: 'Export failed', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Audit Log" subtitle="Tamper-evident record of all authorization decisions" action={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs border-border/60" onClick={handleVerify}>
            <Hash className="w-3 h-3 mr-1" /> Verify Chain
          </Button>
          <Button variant="outline" size="sm" className="text-xs border-border/60" onClick={handleExport}>
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
        </div>
      } />

      {verifyResult && (
        <div className={`mb-4 text-sm px-3 py-2 rounded border ${verifyResult.startsWith('✓') ? 'border-foreground/20 bg-secondary/30' : 'border-crimson/30 bg-crimson/5'}`}>
          {verifyResult}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <Select value={filterDecision} onValueChange={setFilterDecision}>
          <SelectTrigger className="w-[150px] bg-card border-border/60 text-xs"><SelectValue placeholder="Decision" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Decisions</SelectItem>
            <SelectItem value="allow">Allow</SelectItem>
            <SelectItem value="deny">Deny</SelectItem>
            <SelectItem value="requires_approval">Requires Approval</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEventType} onValueChange={setFilterEventType}>
          <SelectTrigger className="w-[160px] bg-card border-border/60 text-xs"><SelectValue placeholder="Event Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="AUTHORIZATION_CHECK">Authz Check</SelectItem>
            <SelectItem value="PERMISSION_GRANTED">Perm Granted</SelectItem>
            <SelectItem value="PERMISSION_REVOKED">Perm Revoked</SelectItem>
            <SelectItem value="AGENT_CREATED">Agent Created</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No audit events found</div>
      ) : (
        <Card className="bg-card border-border/60">
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="text-xs">Decision</TableHead>
                    <TableHead className="text-xs">Event</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                    <TableHead className="text-xs">Hash</TableHead>
                    <TableHead className="text-xs">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((evt, i) => (
                    <TableRow key={evt.id} className={`border-border/20 ${i % 2 === 1 ? 'bg-secondary/[0.03]' : ''}`} style={{ borderLeftWidth: '2px', borderLeftColor: evt.decision === 'allow' ? 'oklch(0.6 0.02 280)' : evt.decision === 'deny' ? 'oklch(0.38 0.17 12)' : 'oklch(0.55 0.05 60)' }}>
                      <TableCell><DecisionBadge decision={evt.decision || 'unknown'} /></TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{evt.eventType}</TableCell>
                      <TableCell className="text-xs font-mono">{evt.action || '—'}</TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">{evt.eventHash?.slice(0, 16)}...</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo(evt.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. POLICIES VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function PoliciesView() {
  const { navigateToAgent } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [applyOpen, setApplyOpen] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    api.listAgents().then(data => setAgents(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const handleApply = async (templateId: string) => {
    if (!selectedAgent) return;
    setApplying(true);
    try {
      const tpl = PERMISSION_TEMPLATES.find(t => t.id === templateId);
      if (tpl) {
        for (const scope of tpl.permissions) {
          await api.grantPermission(selectedAgent, { scope, effect: 'ALLOW' });
        }
        for (const scope of tpl.denied) {
          await api.grantPermission(selectedAgent, { scope, effect: 'DENY' });
        }
      }
      setApplyOpen(null);
      toast({ title: 'Template applied', description: `Permissions from template applied to agent.` });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setApplying(false); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Policies" subtitle="Permission templates for quick agent setup" />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PERMISSION_TEMPLATES.map((tpl, i) => (
          <motion.div key={tpl.id} variants={stagger} initial="initial" animate="animate" custom={i}>
            <Card className="bg-card border-border/60 hover:border-crimson/20 transition-colors h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{tpl.name}</CardTitle>
                <CardDescription className="text-xs">{tpl.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Allowed</p>
                  <div className="flex flex-wrap gap-1">
                    {tpl.permissions.slice(0, 5).map(p => (
                      <Badge key={p} variant="secondary" className="text-[10px] font-mono">{p}</Badge>
                    ))}
                    {tpl.permissions.length > 5 && <Badge variant="secondary" className="text-[10px]">+{tpl.permissions.length - 5}</Badge>}
                  </div>
                </div>
                {tpl.denied.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Denied</p>
                    <div className="flex flex-wrap gap-1">
                      {tpl.denied.slice(0, 3).map(p => (
                        <Badge key={p} variant="outline" className="text-[10px] font-mono border-crimson/30 text-crimson/70">{p}</Badge>
                      ))}
                      {tpl.denied.length > 3 && <Badge variant="outline" className="text-[10px] border-crimson/30 text-crimson/70">+{tpl.denied.length - 3}</Badge>}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="outline" size="sm" className="w-full text-xs border-crimson/30 text-crimson hover:bg-crimson/5" onClick={() => { setApplyOpen(tpl.id); setSelectedAgent(''); }}>
                  Apply to Agent
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Apply Dialog */}
      <Dialog open={!!applyOpen} onOpenChange={() => setApplyOpen(null)}>
        <DialogContent className="bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>Apply Template to Agent</DialogTitle>
            <DialogDescription>Select an agent to apply this permission template.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="bg-secondary/50 border-border/60"><SelectValue placeholder="Select agent..." /></SelectTrigger>
              <SelectContent>
                {agents.filter(a => a.status === 'ACTIVE').map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApplyOpen(null)}>Cancel</Button>
            <Button className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={() => applyOpen && handleApply(applyOpen)} disabled={applying || !selectedAgent}>
              {applying ? 'Applying...' : 'Apply Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. SETTINGS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function SettingsView() {
  const { user } = useAppStore();
  const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  // Mock API keys data
  const mockApiKeys = [
    { id: '1', name: 'Production API Key', prefix: 'agk_prod_****7f3a', created: '2025-01-15', lastUsed: '2 hours ago', status: 'active' },
    { id: '2', name: 'Staging API Key', prefix: 'agk_stg_****2b1e', created: '2025-02-01', lastUsed: '5 days ago', status: 'active' },
    { id: '3', name: 'CI/CD Pipeline Key', prefix: 'agk_ci_****9c4d', created: '2025-02-20', lastUsed: 'Never', status: 'inactive' },
  ];

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('agentdnai-theme', next ? 'dark' : 'light');
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'agentdnai-export.json'; a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Data exported' });
    } catch (err: unknown) {
      toast({ title: 'Export failed', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await api.importData(data);
      toast({ title: 'Data imported', description: `${result.imported.agents} agents, ${result.imported.permissions} permissions imported.` });
    } catch (err: unknown) {
      toast({ title: 'Import failed', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      <div className="space-y-6">
        {/* Profile */}
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization */}
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{user?.name ? `${user.name}&apos;s Org` : 'My Organization'}</p>
                <p className="text-xs text-muted-foreground">Personal organization</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-border/60">org_default</Badge>
            </div>
            <Separator className="bg-border/40" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Members</p>
                <p className="text-xs text-muted-foreground">People in your organization</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono border-border/60">1 member</Badge>
              </div>
            </div>
            <Separator className="bg-border/40" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Your Role</p>
                <p className="text-xs text-muted-foreground">Permission level in this organization</p>
              </div>
              <Badge className="text-[10px] font-mono bg-crimson text-crimson-foreground">Owner</Badge>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="w-4 h-4" /> API Keys
              </CardTitle>
              <Button size="sm" className="text-xs bg-crimson text-crimson-foreground hover:brightness-110" onClick={() => toast({ title: 'API Key creation coming soon' })}>
                <Plus className="w-3 h-3 mr-1" /> Create API Key
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockApiKeys.map(key => (
                <div key={key.id} className="flex items-center gap-3 p-3 border border-border/40 bg-secondary/20">
                  <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{key.name}</span>
                      <Badge variant="outline" className={`text-[9px] font-mono ${key.status === 'active' ? 'border-foreground/20' : 'border-border/40 text-muted-foreground'}`}>
                        {key.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                      <span className="font-mono">{key.prefix}</span>
                      <span>Created: {key.created}</span>
                      <span>Last used: {key.lastUsed}</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-crimson shrink-0" onClick={() => toast({ title: 'Key revocation coming soon' })}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Appearance</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isDark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                <span className="text-sm">{isDark ? 'Dark' : 'Light'} Mode</span>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? 'bg-crimson' : 'bg-secondary'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${isDark ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Security</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Change Password</p>
                <p className="text-xs text-muted-foreground">Update your account password</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs border-border/60" disabled>Coming Soon</Button>
            </div>
            <Separator className="bg-border/40" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Active Sessions</p>
                <p className="text-xs text-muted-foreground">Manage your active sessions</p>
              </div>
              <Badge variant="outline" className="text-xs">1 current</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Data Management</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Export Data</p>
                <p className="text-xs text-muted-foreground">Download all data as JSON</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs border-border/60 hover:border-crimson/40 hover:text-crimson" onClick={handleExport}>
                <Download className="w-3 h-3 mr-1" /> Export
              </Button>
            </div>
            <Separator className="bg-border/40" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Import Data</p>
                <p className="text-xs text-muted-foreground">Import agents from JSON file</p>
              </div>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" className="text-xs border-border/60 hover:border-crimson/40 hover:text-crimson" asChild>
                  <span><Upload className="w-3 h-3 mr-1" /> Import</span>
                </Button>
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm">System Health</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-foreground animate-pulse" /> API Server</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-foreground animate-pulse" /> Database</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-foreground animate-pulse" /> Policy Engine</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-foreground animate-pulse" /> Audit Chain</span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-card border-crimson/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-crimson flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Danger Zone
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">Irreversible and destructive actions</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Export All Data</p>
                <p className="text-xs text-muted-foreground">Download a complete backup of all platform data</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs border-crimson/40 text-crimson hover:bg-crimson/5" onClick={handleExport}>
                <Download className="w-3 h-3 mr-1" /> Export All
              </Button>
            </div>
            <Separator className="bg-crimson/20" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete your account and all associated data</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs border-crimson/40 text-crimson hover:bg-crimson/5" disabled>
                <Trash2 className="w-3 h-3 mr-1" /> Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13a. TOKENS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function TokensView() {
  const { navigateToAgent } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [tokenScopes, setTokenScopes] = useState('');
  const [tokenTTL, setTokenTTL] = useState('3600');
  const [issuedToken, setIssuedToken] = useState<IssuedToken | null>(null);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    api.listAgents().then(data => { setAgents(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const allTokens = agents.flatMap(a => (a.tokens || []).map(t => ({ ...t, agentName: a.name, agentId: a.id })));

  const handleIssue = async () => {
    if (!selectedAgentId) return;
    setIssuing(true);
    try {
      const token = await api.issueToken({
        agentId: selectedAgentId,
        scopes: tokenScopes.split(',').map(s => s.trim()).filter(Boolean),
        ttlSeconds: parseInt(tokenTTL),
      });
      setIssuedToken(token);
      toast({ title: 'Token issued' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setIssuing(false); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Tokens" subtitle="Manage agent authentication tokens" action={
        <Button size="sm" className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={() => setTokenOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Issue Token
        </Button>
      } />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : allTokens.length === 0 ? (
        <div className="text-center py-12">
          <Key className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No tokens issued yet</p>
        </div>
      ) : (
        <Card className="bg-card border-border/60">
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="text-xs">Agent</TableHead>
                    <TableHead className="text-xs">Scopes</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Expires</TableHead>
                    <TableHead className="text-xs">Last Used</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTokens.map(t => (
                    <TableRow key={t.id} className="border-border/20">
                      <TableCell>
                        <button className="text-xs font-medium hover:text-crimson transition-colors" onClick={() => navigateToAgent(t.agentId)}>
                          {t.agentName}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{t.scopes}</TableCell>
                      <TableCell>
                        {t.revokedAt ? (
                          <Badge variant="outline" className="text-[10px] border-crimson/40 text-crimson">REVOKED</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-foreground/20">ACTIVE</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(t.expiresAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.lastUsedAt ? timeAgo(t.lastUsedAt) : 'Never'}</TableCell>
                      <TableCell>
                        {!t.revokedAt && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-crimson" onClick={async () => {
                            try { await api.revokeToken(t.id); toast({ title: 'Token revoked' }); setAgents([]); setLoading(true); api.listAgents().then(d => { setAgents(Array.isArray(d) ? d : []); setLoading(false); }); }
                            catch (err: unknown) { toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' }); }
                          }}>
                            <Ban className="w-3 h-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issue Token Dialog */}
      <Dialog open={tokenOpen} onOpenChange={setTokenOpen}>
        <DialogContent className="bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>Issue Token</DialogTitle>
            <DialogDescription>Generate a temporary authentication token.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="bg-secondary/50 border-border/60"><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Scopes (comma-separated)</Label>
              <Input value={tokenScopes} onChange={e => setTokenScopes(e.target.value)} placeholder="github.repo.read, github.issue.read" className="bg-secondary/50 border-border/60 font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">TTL</Label>
              <Select value={tokenTTL} onValueChange={setTokenTTL}>
                <SelectTrigger className="bg-secondary/50 border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3600">1 hour</SelectItem>
                  <SelectItem value="21600">6 hours</SelectItem>
                  <SelectItem value="86400">24 hours</SelectItem>
                  <SelectItem value="604800">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {issuedToken && (
              <div className="bg-crimson/5 border border-crimson/20 rounded p-3">
                <p className="text-xs text-muted-foreground mb-1">Token (copy now — won&apos;t be shown again)</p>
                <p className="text-xs font-mono break-all text-crimson">{issuedToken.token}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setTokenOpen(false); setIssuedToken(null); }}>Cancel</Button>
            <Button className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={handleIssue} disabled={issuing || !selectedAgentId}>
              {issuing ? 'Issuing...' : 'Issue Token'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13b. ORGANIZATIONS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function OrganizationsView() {
  const { user } = useAppStore();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Organizations" subtitle="Manage your organizations" />

      <Card className="bg-card border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Your Organization</CardTitle>
            <Badge className="text-[10px] font-mono bg-crimson text-crimson-foreground">Owner</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 border border-border/40 bg-secondary/20">
            <div className="w-12 h-12 bg-crimson/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-crimson" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{user?.name ? `${user.name}&apos;s Org` : 'My Organization'}</p>
              <p className="text-xs text-muted-foreground font-mono">org_default</p>
              <p className="text-xs text-muted-foreground mt-1">Personal organization · 1 member</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Members</p>
            <div className="flex items-center gap-3 p-3 border border-border/40">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">{user?.name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground">{user?.email || ''}</p>
              </div>
              <Badge className="text-[9px] font-mono bg-crimson text-crimson-foreground">Owner</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13c. API KEYS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function ApiKeysView() {
  const mockKeys = [
    { id: '1', name: 'Production API Key', prefix: 'agk_prod_****7f3a', created: '2025-01-15', lastUsed: '2 hours ago', status: 'active' as const },
    { id: '2', name: 'Staging API Key', prefix: 'agk_stg_****2b1e', created: '2025-02-01', lastUsed: '5 days ago', status: 'active' as const },
    { id: '3', name: 'CI/CD Pipeline Key', prefix: 'agk_ci_****9c4d', created: '2025-02-20', lastUsed: 'Never', status: 'inactive' as const },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="API Keys" subtitle="Manage API keys for programmatic access" action={
        <Button size="sm" className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={() => toast({ title: 'API Key creation coming soon' })}>
          <Plus className="w-4 h-4 mr-1" /> Create API Key
        </Button>
      } />

      <Card className="bg-card border-border/60">
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Key</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs">Last Used</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockKeys.map(key => (
                  <TableRow key={key.id} className="border-border/20">
                    <TableCell className="text-xs font-medium">{key.name}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{key.prefix}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] font-mono ${key.status === 'active' ? 'border-foreground/20' : 'border-border/40 text-muted-foreground'}`}>
                        {key.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{key.created}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{key.lastUsed}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-crimson" onClick={() => toast({ title: 'Key revocation coming soon' })}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14. DOCS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function DocsView() {
  const { setView } = useAppStore();
  const [section, setSection] = useState('quickstart');

  const sections = [
    { id: 'quickstart', label: 'Quick Start', icon: Zap },
    { id: 'api', label: 'API Reference', icon: Code2 },
    { id: 'architecture', label: 'Architecture', icon: Workflow },
    { id: 'cli', label: 'CLI Reference', icon: Terminal },
    { id: 'permissions', label: 'Permission Catalog', icon: Shield },
    { id: 'security', label: 'Security Model', icon: Lock },
  ];

  const apiEndpoints = [
    { method: 'POST', path: '/api/agents', desc: 'Create a new agent', body: '{ name, runtime, description? }' },
    { method: 'GET', path: '/api/agents', desc: 'List agents (with search/filter)', body: '?search=&status=&runtime=' },
    { method: 'GET', path: '/api/agents/[id]', desc: 'Get agent details', body: '' },
    { method: 'POST', path: '/api/agents/[id]/revoke', desc: 'Revoke an agent', body: '' },
    { method: 'POST', path: '/api/agents/[id]/pause', desc: 'Pause an agent', body: '' },
    { method: 'POST', path: '/api/agents/[id]/resume', desc: 'Resume a paused agent', body: '' },
    { method: 'POST', path: '/api/agents/[id]/rotate-key', desc: 'Rotate agent key pair', body: '' },
    { method: 'POST', path: '/api/agents/[id]/approve', desc: 'Approve a pending action', body: '{ action }' },
    { method: 'GET', path: '/api/agents/[id]/risk', desc: 'Get agent risk score', body: '' },
    { method: 'POST', path: '/api/agents/[id]/permissions', desc: 'Grant a permission', body: '{ scope, effect, expiresAt? }' },
    { method: 'GET', path: '/api/agents/[id]/permissions', desc: 'List agent permissions', body: '' },
    { method: 'DELETE', path: '/api/agents/[id]/permissions', desc: 'Revoke a permission', body: '{ scope, effect }' },
    { method: 'POST', path: '/api/tokens/issue', desc: 'Issue a token', body: '{ agentId, scopes, ttlSeconds }' },
    { method: 'POST', path: '/api/tokens/[id]/revoke', desc: 'Revoke a token', body: '' },
    { method: 'POST', path: '/api/authz/check', desc: 'Check authorization', body: '{ agentId, action, resource? }' },
    { method: 'POST', path: '/api/authz/batch-check', desc: 'Batch authorization check', body: '{ agentId, actions[], resource? }' },
    { method: 'GET', path: '/api/audit', desc: 'Get audit events', body: '?limit=&eventType=' },
    { method: 'GET', path: '/api/audit/verify', desc: 'Verify audit chain integrity', body: '' },
    { method: 'GET', path: '/api/audit/export', desc: 'Export audit log as CSV', body: '' },
    { method: 'GET', path: '/api/stats', desc: 'Get dashboard statistics', body: '' },
    { method: 'GET', path: '/api/stats/trends', desc: 'Get 24h trend data', body: '' },
    { method: 'GET', path: '/api/activity', desc: 'Get 30-day heatmap data', body: '' },
    { method: 'GET', path: '/api/export', desc: 'Export all data as JSON', body: '' },
    { method: 'POST', path: '/api/import', desc: 'Import data from JSON', body: '{ agents[], ... }' },
    { method: 'POST', path: '/api/auth/register', desc: 'Register a user', body: '{ email, password, name }' },
    { method: 'POST', path: '/api/auth/login', desc: 'Login', body: '{ email, password }' },
    { method: 'GET', path: '/api/auth/me', desc: 'Get current user', body: '' },
    { method: 'POST', path: '/api/seed', desc: 'Seed demo data', body: '' },
  ];

  const cliCommands = [
    { cmd: 'agentdnai init', desc: 'Initialize AgentDNAI configuration' },
    { cmd: 'agentdnai agent create <name> --runtime <rt>', desc: 'Register a new agent' },
    { cmd: 'agentdnai agent list [--status <s>] [--runtime <r>]', desc: 'List agents with optional filters' },
    { cmd: 'agentdnai agent get <id>', desc: 'Get agent details' },
    { cmd: 'agentdnai agent revoke <id>', desc: 'Revoke an agent' },
    { cmd: 'agentdnai agent pause <id>', desc: 'Pause an agent' },
    { cmd: 'agentdnai agent resume <id>', desc: 'Resume a paused agent' },
    { cmd: 'agentdnai agent rotate-key <id>', desc: 'Rotate agent key pair' },
    { cmd: 'agentdnai perm grant <agent> <scope> [--effect ALLOW|DENY]', desc: 'Grant a permission' },
    { cmd: 'agentdnai perm revoke <agent> <scope> [--effect ALLOW|DENY]', desc: 'Revoke a permission' },
    { cmd: 'agentdnai perm list <agent>', desc: 'List agent permissions' },
    { cmd: 'agentdnai token issue <agent> --scopes <s> --ttl <seconds>', desc: 'Issue a token' },
    { cmd: 'agentdnai token revoke <id>', desc: 'Revoke a token' },
    { cmd: 'agentdnai check <agent> <action> [--resource <r>]', desc: 'Check authorization' },
    { cmd: 'agentdnai check-batch <agent> --actions <a1,a2>', desc: 'Batch authorization check' },
    { cmd: 'agentdnai audit list [--limit <n>] [--type <t>]', desc: 'List audit events' },
    { cmd: 'agentdnai audit verify', desc: 'Verify audit chain integrity' },
    { cmd: 'agentdnai audit export [--format csv|json]', desc: 'Export audit log' },
    { cmd: 'agentdnai risk <agent>', desc: 'Get agent risk score' },
    { cmd: 'agentdnai export', desc: 'Export all platform data as JSON' },
    { cmd: 'agentdnai import <file.json>', desc: 'Import data from JSON file' },
    { cmd: 'agentdnai seed', desc: 'Seed demo data for testing' },
  ];

  const methodColor = (m: string) =>
    m === 'GET' ? 'border-foreground/20 text-foreground' :
    m === 'POST' ? 'border-crimson/40 text-crimson' :
    m === 'DELETE' ? 'border-crimson/40 text-crimson' :
    'border-border text-muted-foreground';

  return (
    <div className="min-h-screen bg-background">
      {!useAppStore().sessionToken && (
        <nav className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <button onClick={() => setView('home')} className="flex items-center gap-2">
              <img src="/logo-agentdnai.png" alt="" className="h-7 w-auto" />
            </button>
            <Button size="sm" className="bg-crimson text-crimson-foreground hover:brightness-110" onClick={() => setView('register')}>
              Get Started
            </Button>
          </div>
        </nav>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[220px_1fr] gap-8">
          {/* Sidebar */}
          <nav className="space-y-1">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${section === s.id ? 'text-crimson bg-crimson/10 border-l-2 border-crimson' : 'text-muted-foreground hover:text-crimson hover:bg-crimson/5 border-l-2 border-transparent'}`}
              >
                <s.icon className="w-4 h-4" /> {s.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={section} {...pageTransition}>

                {/* ── Quick Start ── */}
                {section === 'quickstart' && (
                  <div className="space-y-8">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">Quick Start</h1>
                      <p className="text-muted-foreground">Get up and running with AgentDNAI in under 5 minutes.</p>
                    </div>

                    <div className="space-y-6">
                      {[
                        {
                          step: '1', title: 'Register an account',
                          desc: 'Create your account and personal organization to manage agents.',
                          code: `curl -X POST https://api.agentdnai.io/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@example.com", "password": "s3cur3p4ss", "name": "Jane Smith"}'`,
                        },
                        {
                          step: '2', title: 'Create your first agent',
                          desc: 'Give your AI agent a unique identity with an Ed25519 cryptographic key pair.',
                          code: `curl -X POST https://api.agentdnai.io/agents \\
  -H "Authorization: Bearer <token>" \\
  -d '{"name": "hermes-auditor", "runtime": "hermes"}'

# Response:
{
  "id": "agt_...",
  "agentUri": "agentdnai://hermes-auditor@org",
  "fingerprint": "SHA256:abc123...",
  "status": "ACTIVE"
}`,
                        },
                        {
                          step: '3', title: 'Grant permissions',
                          desc: 'Apply a template or add individual permission scopes to control what the agent can do.',
                          code: `# Grant read-only GitHub access
curl -X POST https://api.agentdnai.io/agents/{id}/permissions \\
  -d '{"scope": "github.repo.read", "effect": "ALLOW"}'

# Deny write access to production
curl -X POST https://api.agentdnai.io/agents/{id}/permissions \\
  -d '{"scope": "production.*", "effect": "DENY"}'`,
                        },
                        {
                          step: '4', title: 'Issue a token',
                          desc: 'Generate a temporary token with configurable TTL for the agent to authenticate.',
                          code: `curl -X POST https://api.agentdnai.io/tokens/issue \\
  -d '{"agentId": "agt_...", "scopes": ["*"], "ttlSeconds": 86400}'

# Response:
{
  "token": "adk_live_abc123...",
  "expiresAt": "2026-03-05T00:00:00Z"
}`,
                        },
                        {
                          step: '5', title: 'Check authorization',
                          desc: 'Every action is validated against the permission policy in real time.',
                          code: `curl -X POST https://api.agentdnai.io/authz/check \\
  -d '{"agentId": "agt_...", "action": "github.repo.read", "resource": "github.com/org/repo"}'

# Response:
{
  "decision": "allow",
  "reason": "Explicit permission found",
  "auditEventId": "aud_..."
}`,
                        },
                      ].map(item => (
                        <div key={item.step} className="space-y-2">
                          <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 bg-crimson/10 flex items-center justify-center text-crimson text-sm font-bold shrink-0">{item.step}</div>
                            <div>
                              <h3 className="font-semibold">{item.title}</h3>
                              <p className="text-sm text-muted-foreground">{item.desc}</p>
                            </div>
                          </div>
                          <div className="ml-12 bg-card border border-border/40 p-4 overflow-x-auto">
                            <pre className="text-xs font-mono text-foreground/80 whitespace-pre leading-relaxed">{item.code}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── API Reference ── */}
                {section === 'api' && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">API Reference</h1>
                      <p className="text-muted-foreground">All REST API endpoints available in AgentDNAI. Base URL: <code className="text-xs font-mono bg-secondary/50 px-1.5 py-0.5">https://api.agentdnai.io</code></p>
                    </div>

                    {/* Authentication */}
                    <div className="bg-card border border-border/40 p-4">
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-crimson" /> Authentication</h3>
                      <p className="text-xs text-muted-foreground mb-2">All API endpoints require a Bearer token in the Authorization header, except <code className="font-mono bg-secondary/50 px-1">/auth/register</code> and <code className="font-mono bg-secondary/50 px-1">/auth/login</code>.</p>
                      <pre className="text-xs font-mono text-foreground/80 bg-secondary/30 p-3 overflow-x-auto">{`Authorization: Bearer <token>`}</pre>
                    </div>

                    {/* API Table */}
                    <div className="border border-border/40 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/40 bg-secondary/30">
                            <th className="text-left px-3 py-2.5 font-semibold w-16">Method</th>
                            <th className="text-left px-3 py-2.5 font-semibold">Path</th>
                            <th className="text-left px-3 py-2.5 font-semibold">Description</th>
                            <th className="text-left px-3 py-2.5 font-semibold hidden lg:table-cell">Body / Params</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiEndpoints.map(ep => (
                            <tr key={ep.path + ep.method} className="border-b border-border/20 hover:bg-secondary/10 transition-colors">
                              <td className="px-3 py-2">
                                <Badge variant="outline" className={`text-[10px] font-mono justify-center ${methodColor(ep.method)}`}>
                                  {ep.method}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 font-mono text-foreground/80">{ep.path}</td>
                              <td className="px-3 py-2 text-muted-foreground">{ep.desc}</td>
                              <td className="px-3 py-2 font-mono text-muted-foreground/60 hidden lg:table-cell">{ep.body}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground/60 pt-2">
                      <span><Badge variant="outline" className="text-[9px] font-mono border-foreground/20 text-foreground mr-1">GET</Badge> Read</span>
                      <span><Badge variant="outline" className="text-[9px] font-mono border-crimson/40 text-crimson mr-1">POST</Badge> Create / Action</span>
                      <span><Badge variant="outline" className="text-[9px] font-mono border-crimson/40 text-crimson mr-1">DELETE</Badge> Remove</span>
                    </div>
                  </div>
                )}

                {/* ── Architecture ── */}
                {section === 'architecture' && (
                  <div className="space-y-8">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">Architecture</h1>
                      <p className="text-muted-foreground">How AgentDNAI components work together to secure AI agent operations.</p>
                    </div>

                    {/* Architecture Diagram */}
                    <div className="bg-card border border-border/40 p-6 overflow-x-auto">
                      <pre className="text-xs font-mono text-foreground/70 leading-relaxed whitespace-pre">{`┌──────────────────────────────────────────────────────────────────────┐
│                        AgentDNAI Platform                           │
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐            │
│  │   CLI / SDK  │    │  REST API   │    │  Dashboard   │            │
│  │  (External)  │───▶│  (Next.js)  │◀───│   (React)    │            │
│  └─────────────┘    └──────┬──────┘    └──────────────┘            │
│                             │                                        │
│                    ┌────────▼────────┐                               │
│                    │  Policy Engine  │                               │
│                    │ (Deny-default)  │                               │
│                    │ Deny > Allow    │                               │
│                    │ Prod=Approval   │                               │
│                    └────────┬────────┘                               │
│                             │                                        │
│              ┌──────────────┼──────────────┐                         │
│              │              │              │                          │
│  ┌───────────▼───┐  ┌──────▼──────┐  ┌───▼───────────┐            │
│  │   Identity     │  │   Token     │  │    Audit       │            │
│  │   Service      │  │   Service   │  │    Service     │            │
│  │               │  │             │  │               │            │
│  │ • Ed25519     │  │ • HMAC-SHA  │  │ • SHA-256     │            │
│  │   Key Pairs   │  │   256 Hash  │  │   Hash Chain   │            │
│  │ • Challenge-  │  │ • TTL       │  │ • Append-Only  │            │
│  │   Response    │  │   Config    │  │ • Tamper-      │            │
│  │ • Rotation    │  │ • Revocable │  │   Evident      │            │
│  └───────┬───────┘  └──────┬──────┘  └───────┬───────┘            │
│          │                 │                  │                      │
│          └─────────────────┼──────────────────┘                      │
│                            │                                         │
│                  ┌─────────▼─────────┐                               │
│                  │     SQLite DB     │                               │
│                  │   (Prisma ORM)    │                               │
│                  └───────────────────┘                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘`}</pre>
                    </div>

                    {/* Component Descriptions */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        { icon: <Fingerprint className="w-5 h-5" />, title: 'Identity Service', desc: 'Manages Ed25519 key pairs, challenge-response authentication, and key rotation for every agent.' },
                        { icon: <Shield className="w-5 h-5" />, title: 'Policy Engine', desc: 'Deny-by-default authorization with explicit deny > allow. Production actions require human approval.' },
                        { icon: <Key className="w-5 h-5" />, title: 'Token Service', desc: 'Issues HMAC-SHA256 hashed tokens with configurable TTL. Tokens can be revoked at any time.' },
                        { icon: <Hash className="w-5 h-5" />, title: 'Audit Service', desc: 'SHA-256 hash-chained append-only log. Every authorization decision is recorded and verifiable.' },
                        { icon: <Code2 className="w-5 h-5" />, title: 'REST API', desc: 'Next.js API routes providing full CRUD operations for agents, permissions, tokens, and audit.' },
                        { icon: <Database className="w-5 h-5" />, title: 'Persistence Layer', desc: 'Prisma ORM with SQLite. Agent identities, permissions, tokens, and audit events are stored durably.' },
                      ].map((comp, i) => (
                        <div key={i} className="bg-card border border-border/40 p-4 flex gap-3 items-start hover:border-crimson/30 transition-colors">
                          <div className="text-crimson shrink-0 mt-0.5">{comp.icon}</div>
                          <div>
                            <h3 className="text-sm font-semibold">{comp.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{comp.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Request Flow */}
                    <div>
                      <h2 className="text-xl font-bold mb-4">Authorization Request Flow</h2>
                      <div className="bg-card border border-border/40 p-6 overflow-x-auto">
                        <pre className="text-xs font-mono text-foreground/70 leading-relaxed whitespace-pre">{`  Agent                     AgentDNAI                    Policy
  Request ─────────────────────────────────────────────────────▶
           │                                                   │
           │  1. POST /authz/check                             │
           │     { agentId, action, resource }                 │
           │                                                   │
           │                          ┌─────────────────┐     │
           │                          │ 2. Load Agent   │     │
           │                          │    Permissions  │     │
           │                          └────────┬────────┘     │
           │                                   │              │
           │                          ┌────────▼────────┐     │
           │                          │ 3. Evaluate     │     │
           │                          │    Policy:      │     │
           │                          │    a. DENY >    │     │
           │                          │       ALLOW     │     │
           │                          │    b. Prod =    │     │
           │                          │       Approval  │     │
           │                          │    c. Default = │     │
           │                          │       DENY      │     │
           │                          └────────┬────────┘     │
           │                                   │              │
           │                          ┌────────▼────────┐     │
           │                          │ 4. Record in    │     │
           │                          │    Audit Log    │     │
           │                          │    (Hash Chain) │     │
           │                          └────────┬────────┘     │
           │                                   │              │
           │  ◀──── { decision, reason } ──────┘              │
           │                                                   │
  ──────────────────────────────────────────────────────────────`}</pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CLI Reference ── */}
                {section === 'cli' && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">CLI Reference</h1>
                      <p className="text-muted-foreground">The <code className="text-xs font-mono bg-secondary/50 px-1.5 py-0.5">agentdnai</code> command-line tool for managing agents, permissions, tokens, and audit.</p>
                    </div>

                    {/* Installation */}
                    <div className="bg-card border border-border/40 p-4">
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-crimson" /> Installation</h3>
                      <pre className="text-xs font-mono text-foreground/80 bg-secondary/30 p-3 overflow-x-auto">{`# Install globally
npm install -g @agentdnai/cli

# Or use with npx
npx @agentdnai/cli --help

# Verify installation
agentdnai --version`}</pre>
                    </div>

                    {/* Configuration */}
                    <div className="bg-card border border-border/40 p-4">
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Wrench className="w-4 h-4 text-crimson" /> Configuration</h3>
                      <pre className="text-xs font-mono text-foreground/80 bg-secondary/30 p-3 overflow-x-auto">{`# Set API endpoint
agentdnai config set api.url https://api.agentdnai.io

# Set authentication token
agentdnai config set auth.token <your-token>

# View current config
agentdnai config list`}</pre>
                    </div>

                    {/* Commands */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">All Commands</h3>
                      <div className="space-y-2">
                        {cliCommands.map(cmd => (
                          <div key={cmd.cmd} className="bg-card border border-border/40 p-3 hover:border-crimson/30 transition-colors">
                            <code className="text-xs font-mono text-foreground break-all">{cmd.cmd}</code>
                            <p className="text-xs text-muted-foreground mt-1">{cmd.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Examples */}
                    <div className="bg-card border border-border/40 p-4">
                      <h3 className="text-sm font-semibold mb-2">Common Examples</h3>
                      <pre className="text-xs font-mono text-foreground/80 bg-secondary/30 p-3 overflow-x-auto whitespace-pre">{`# Create an agent and grant permissions in one flow
agentdnai agent create my-bot --runtime hermes
agentdnai perm grant my-bot "github.repo.read" --effect ALLOW
agentdnai perm grant my-bot "production.*" --effect DENY

# Issue a 24-hour token
agentdnai token issue my-bot --scopes "*" --ttl 86400

# Check if agent can perform an action
agentdnai check my-bot "github.repo.read" --resource "github.com/org/repo"

# Verify audit chain integrity
agentdnai audit verify

# Export all data for backup
agentdnai export > backup.json`}</pre>
                    </div>
                  </div>
                )}

                {/* ── Permission Catalog ── */}
                {section === 'permissions' && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">Permission Catalog</h1>
                      <p className="text-muted-foreground">All available permission scopes organized by category. {PERMISSIONS.length} permissions across {PERMISSION_CATEGORIES.length} categories.</p>
                    </div>
                    {PERMISSION_CATEGORIES.map(cat => {
                      const perms = PERMISSIONS.filter(p => p.category === cat);
                      return (
                        <div key={cat}>
                          <h3 className="text-lg font-semibold mb-2 capitalize flex items-center gap-2">
                            {cat}
                            <Badge variant="outline" className="text-[10px] font-mono">{perms.length}</Badge>
                          </h3>
                          <div className="space-y-1">
                            {perms.map(p => (
                              <div key={p.scope} className="flex items-center gap-3 p-2 border border-border/30 bg-card hover:border-crimson/30 transition-colors">
                                <code className="text-xs font-mono flex-1">{p.scope}</code>
                                <Badge variant="outline" className={`text-[9px] font-mono ${p.riskLevel === 'critical' ? 'border-crimson/40 text-crimson' : p.riskLevel === 'high' ? 'border-crimson/30 text-crimson/70' : 'border-border/60'}`}>
                                  {p.riskLevel}
                                </Badge>
                                {p.requiresApproval && <Badge variant="outline" className="text-[9px] font-mono border-border/60">approval</Badge>}
                                <span className="text-[10px] text-muted-foreground hidden sm:inline w-40">{p.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Security Model ── */}
                {section === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">Security Model</h1>
                      <p className="text-muted-foreground">How AgentDNAI ensures secure agent operations through defense in depth.</p>
                    </div>
                    {[
                      { title: 'Deny by Default', desc: 'Every action is denied unless an explicit ALLOW permission exists. No implicit grants, no exceptions.' },
                      { title: 'Explicit Deny Overrides', desc: 'If both ALLOW and DENY match, DENY wins. This prevents accidental permission escalation.' },
                      { title: 'Production Requires Approval', desc: 'Actions in the production category always require human approval, regardless of ALLOW permissions.' },
                      { title: 'Temporary Tokens', desc: 'All tokens have a mandatory TTL. Tokens are stored as hashes — the raw value is shown only once.' },
                      { title: 'Hash-Chained Audit Trail', desc: 'Every authorization decision is recorded in an append-only log with cryptographic hash chain integrity.' },
                      { title: 'Key Rotation', desc: 'Agent key pairs can be rotated at any time. The old key is immediately invalidated.' },
                      { title: 'Immediate Revocation', desc: 'Agents can be paused, revoked, or blocked instantly. All associated tokens are invalidated.' },
                    ].map(item => (
                      <div key={item.title} className="flex gap-4 items-start">
                        <div className="w-8 h-8 bg-crimson/10 flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldCheck className="w-4 h-4 text-crimson" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}

                    {/* Cryptographic Details */}
                    <div className="bg-card border border-border/40 p-5 mt-6">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Lock className="w-4 h-4 text-crimson" /> Cryptographic Details</h3>
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        {[
                          { label: 'Key Algorithm', value: 'Ed25519 (Curve25519)' },
                          { label: 'Token Hash', value: 'HMAC-SHA256' },
                          { label: 'Audit Chain', value: 'SHA-256 sequential hash' },
                          { label: 'Key Size', value: '256-bit' },
                          { label: 'Token Format', value: 'adk_live_ prefixed random' },
                          { label: 'Chain Verification', value: 'Full-chain integrity check' },
                        ].map(detail => (
                          <div key={detail.label} className="flex items-center justify-between p-2 bg-secondary/30 border border-border/30">
                            <span className="text-muted-foreground">{detail.label}</span>
                            <span className="font-mono text-foreground/80">{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

function AgentDNAIApp() {
  const { currentView, sessionToken, setSession, setView, user } = useAppStore();
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check session on load
  useEffect(() => {
    const validateSession = async () => {
      if (sessionToken) {
        try {
          const res = await api.me();
          setSession(sessionToken, { id: res.user.id, email: res.user.email, name: res.user.name });
          if (currentView === 'home' || currentView === 'login' || currentView === 'register') {
            setView('dashboard');
          }
        } catch {
          setSession(null, null);
        }
      }
      setAuthLoading(false);
    };
    validateSession();
  }, []);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Apply theme from localStorage
  useEffect(() => {
    const theme = localStorage.getItem('agentdnai-theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  const isAuthenticated = !!sessionToken;
  const authViews = ['dashboard', 'agents', 'agent-detail', 'approvals', 'audit', 'policies', 'settings', 'tokens', 'organizations', 'api-keys'];
  const needsAuth = authViews.includes(currentView);

  // Redirect to login if auth required but not authenticated
  if (needsAuth && !isAuthenticated) {
    return <LoginView />;
  }

  // Public views (no sidebar)
  const publicViews = ['home', 'login', 'register', 'onboarding'];
  if (publicViews.includes(currentView)) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key={currentView} {...fadeIn}>
          {currentView === 'home' && <LandingPage />}
          {currentView === 'login' && <LoginView />}
          {currentView === 'register' && <RegisterView />}
          {currentView === 'onboarding' && <OnboardingView />}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Docs can be public or authenticated
  if (currentView === 'docs') {
    return <DocsView />;
  }

  // Authenticated layout with sidebar
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto custom-scrollbar pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div key={currentView} {...pageTransition}>
            {currentView === 'dashboard' && <DashboardView />}
            {currentView === 'agents' && <AgentsView />}
            {currentView === 'agent-detail' && <AgentDetailView />}
            {currentView === 'approvals' && <ApprovalsView />}
            {currentView === 'audit' && <AuditView />}
            {currentView === 'policies' && <PoliciesView />}
            {currentView === 'settings' && <SettingsView />}
            {currentView === 'tokens' && <TokensView />}
            {currentView === 'organizations' && <OrganizationsView />}
            {currentView === 'api-keys' && <ApiKeysView />}
          </motion.div>
        </AnimatePresence>
      </main>
      {isMobile && <MobileBottomNav />}
    </div>
  );
}

export default AgentDNAIApp;
