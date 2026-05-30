'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { api, type Agent, type Permission, type Token, type AuditEvent, type AuthzResult, type DashboardStats, type IssuedToken } from '@/lib/api-client';
import { PERMISSIONS, PERMISSION_TEMPLATES, PERMISSION_CATEGORIES, type PermissionCategory } from '@/lib/permissions';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';

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
  Layers, Brain, Bot, Sparkles, Command, Menu, X, Code2,
  Wrench, Package, MessageSquare, Workflow, Bell, BellRing,
  Sun, Moon, Calendar, Radio, TrendingUp, Upload, FileDown
} from 'lucide-react';

// ─── Animation Variants ──────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const fadeInStagger = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
};

const cardEntrance = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// ─── Helper: Relative Time ───────────────────────────────────────────────────

function timeAgo(date: string | Date): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return 'unknown';
  }
}

// ─── Runtime Icon Helper ─────────────────────────────────────────────────────

function RuntimeIcon({ runtime, className = 'w-5 h-5' }: { runtime: string; className?: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    hermes: <Zap className={`${className} text-amber-400`} />,
    codex: <Code2 className={`${className} text-emerald-400`} />,
    openclaw: <Package className={`${className} text-cyan-400`} />,
    cli: <Terminal className={`${className} text-orange-400`} />,
    automation: <Workflow className={`${className} text-purple-400`} />,
    custom: <Cpu className={`${className} text-pink-400`} />,
  };
  return <>{iconMap[runtime] || <Bot className={`${className} text-primary`} />}</>;
}

// ─── Copy Button Helper ──────────────────────────────────────────────────────

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="icon" variant="ghost" className={`h-7 w-7 ${className}`} onClick={handleCopy}>
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

// ─── Animated DNA Helix SVG ──────────────────────────────────────────────────

function DNAHelix({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 120 400" className="w-full h-full animate-spin-slow" style={{ animationDuration: '20s' }}>
        <defs>
          <linearGradient id="dnaGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="dnaGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[...Array(20)].map((_, i) => {
          const y = i * 20;
          const x1 = 60 + Math.sin(i * 0.6) * 30;
          const x2 = 60 - Math.sin(i * 0.6) * 30;
          return (
            <g key={i}>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.3" />
              <circle cx={x1} cy={y} r="3" fill="url(#dnaGrad1)" filter="url(#glow)" />
              <circle cx={x2} cy={y} r="3" fill="url(#dnaGrad2)" filter="url(#glow)" />
            </g>
          );
        })}
        <path
          d={Array.from({ length: 20 }, (_, i) => {
            const y = i * 20;
            const x = 60 + Math.sin(i * 0.6) * 30;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          opacity="0.5"
          filter="url(#glow)"
        />
        <path
          d={Array.from({ length: 20 }, (_, i) => {
            const y = i * 20;
            const x = 60 - Math.sin(i * 0.6) * 30;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          opacity="0.5"
          filter="url(#glow)"
        />
      </svg>
    </div>
  );
}

// ─── Live Demo Authorization Animation ───────────────────────────────────────

function LiveAuthzDemo() {
  const [step, setStep] = useState(0);
  const steps = [
    { label: 'Agent: hermes-auditor', icon: <Bot className="w-4 h-4 text-primary" /> },
    { label: 'Action: github.repo.read', icon: <Shield className="w-4 h-4 text-primary" /> },
    { label: 'Checking permissions...', icon: <RefreshCw className="w-4 h-4 text-primary animate-spin" /> },
    { label: 'ALLOW ✓', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s + 1) % (steps.length + 2));
    }, 1500);
    return () => clearInterval(interval);
  }, [steps.length]);

  const displayStep = Math.min(step, steps.length - 1);

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur animate-[glow-pulse_3s_ease-in-out_infinite] shadow-lg shadow-primary/5">
      <div className="text-xs text-muted-foreground font-mono mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Live Authorization Check
      </div>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: i <= displayStep ? 1 : 0.2, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className={`flex items-center gap-2 text-sm font-mono px-3 py-1.5 rounded-lg transition-colors ${
              i === 3 && displayStep === 3
                ? 'bg-emerald-500/10 text-emerald-400'
                : i <= displayStep
                ? 'text-foreground/80'
                : 'text-muted-foreground/40'
            }`}
          >
            {s.icon}
            {s.label}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Sparkline Mini Chart ────────────────────────────────────────────────────

function Sparkline({ values, color = 'bg-primary', className = '' }: { values: number[]; color?: string; className?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className={`flex items-end gap-0.5 h-8 ${className}`}>
      {values.map((v, i) => (
        <div
          key={i}
          className={`${color} rounded-t-sm min-w-[3px] transition-all duration-500`}
          style={{ height: `${(v / max) * 100}%`, width: '4px' }}
        />
      ))}
    </div>
  );
}

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
      {status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {status !== 'ACTIVE' && v.icon}
      {status}
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

// ─── Grid Background ────────────────────────────────────────────────────────

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full opacity-[0.04]">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="hsl(var(--primary))" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

// ─── Floating Particles ──────────────────────────────────────────────────────

function FloatingParticles() {
  const particles = React.useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.4 + 0.1,
    })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setView('docs')}>
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
        <GridBackground />
        <FloatingParticles />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <motion.div 
          className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute bottom-20 left-20 w-64 h-64 bg-primary/3 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="max-w-7xl mx-auto px-6 py-24 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5">
                <Fingerprint className="w-3 h-3 mr-1" /> Secure Identity Layer
              </Badge>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
                Every AI agent<br />
                needs an{' '}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  identity
                </span>.
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                AgentDNAI gives every AI agent a verifiable digital identity, scoped permissions,
                encrypted credentials, revocable access and a clear audit trail.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="relative overflow-hidden group h-12 px-8 text-base font-semibold bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 transition-all" onClick={() => setView('dashboard')}>
                  <span className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 bg-[length:200%_100%] animate-[gradient-shift_3s_ease-in-out_infinite] opacity-90 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center">
                    <Zap className="w-5 h-5 mr-2" /> Get Started Free
                  </span>
                </Button>
                <Button size="lg" variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 h-12 px-8 text-base" onClick={() => setView('docs')}>
                  <BookOpen className="w-5 h-5 mr-2" /> Read Docs
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground/60">
                No credit card required · Set up in 2 minutes · Open source
              </p>
              <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Deny by default</div>
                <div className="flex items-center gap-2"><Key className="w-4 h-4 text-primary" /> Temporary tokens</div>
                <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> Full audit trail</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="relative hidden lg:flex flex-col gap-6"
            >
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
              <LiveAuthzDemo />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 border-t border-border/20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs text-muted-foreground mb-6 uppercase tracking-widest">Trusted by forward-thinking teams</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {['NeuralForge', 'AutoScale', 'CodeVault', 'DataPulse', 'SecureOps'].map((name, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                className="px-6 py-3 rounded-lg border border-border/30 bg-card/30 backdrop-blur-sm text-base font-semibold text-muted-foreground/60 tracking-wide hover:border-primary/30 hover:text-muted-foreground/80 hover:bg-primary/5 transition-all"
              >
                {name}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 border-t border-border/30">
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
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <ShieldAlert className="w-8 h-8" />, title: 'No Identity', desc: 'Agents operate anonymously. You can\'t tell which agent did what.' },
              { icon: <Key className="w-8 h-8" />, title: 'No Scoping', desc: 'Agents get blanket access. One compromised key exposes everything.' },
              { icon: <Eye className="w-8 h-8" />, title: 'No Audit', desc: 'No record of what agents did. Impossible to investigate incidents.' },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInStagger} initial="initial" animate="animate" custom={i}>
                <Card className="bg-card/50 border-border/50 hover:border-red-500/30 transition-colors h-full">
                  <CardHeader>
                    <div className="text-red-400 mb-2">{item.icon}</div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-muted-foreground text-sm">{item.desc}</p></CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 border-t border-border/30 bg-card/20">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <Fingerprint className="w-6 h-6" />, title: 'Agent Identity', desc: 'Unique URI, key pair, and status for every agent.' },
              { icon: <Shield className="w-6 h-6" />, title: 'Scoped Permissions', desc: 'Granular allow/deny rules per resource and action.' },
              { icon: <Key className="w-6 h-6" />, title: 'Temporary Tokens', desc: 'Short-lived, hash-stored tokens. Never permanent.' },
              { icon: <ScrollText className="w-6 h-6" />, title: 'Audit Trail', desc: 'Hash-chained, append-only log of every decision.' },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInStagger} initial="initial" animate="animate" custom={i}>
                <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group h-full">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                      {item.icon}
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-muted-foreground text-sm">{item.desc}</p></CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground">Four steps to secure your AI agents.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Create Agent', desc: 'Generate a unique identity with cryptographic key pair.' },
              { step: '02', title: 'Grant Permissions', desc: 'Assign scoped permissions: allow, deny, or require approval.' },
              { step: '03', title: 'Issue Token', desc: 'Get a temporary token for the agent to authenticate.' },
              { step: '04', title: 'Check Authorization', desc: 'Every action is validated and recorded in the audit log.' },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInStagger} initial="initial" animate="animate" custom={i} className="relative">
                <div className="text-5xl font-bold text-primary/10 mb-2">{item.step}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {i < 3 && <ChevronRight className="hidden md:block absolute -right-3 top-1/2 text-primary/30 w-6 h-6" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Permissions Preview */}
      <section className="py-24 border-t border-border/30 bg-card/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Granular Permission Catalog</h2>
            <p className="text-muted-foreground">Every scope is defined. Every risk level is labeled. Production always requires approval.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Github className="w-5 h-5" />, name: 'GitHub', scopes: ['repo.read', 'repo.write', 'issue.create', 'pr.merge'], color: 'text-purple-400' },
              { icon: <Server className="w-5 h-5" />, name: 'Server', scopes: ['logs.read', 'command.run', 'deploy.staging', 'deploy.production'], color: 'text-orange-400' },
              { icon: <HardDrive className="w-5 h-5" />, name: 'Filesystem', scopes: ['read', 'write', 'delete', 'execute'], color: 'text-blue-400' },
              { icon: <Database className="w-5 h-5" />, name: 'Database', scopes: ['read', 'write', 'migrate', 'backup'], color: 'text-emerald-400' },
              { icon: <Globe className="w-5 h-5" />, name: 'Browser', scopes: ['open', 'read', 'click', 'form.submit'], color: 'text-cyan-400' },
              { icon: <Lock className="w-5 h-5" />, name: 'Secrets', scopes: ['read', 'write', 'rotate'], color: 'text-red-400' },
            ].map((cat, i) => (
              <motion.div key={i} variants={fadeInStagger} initial="initial" animate="animate" custom={i}>
                <Card className="bg-card/50 border-border/50 h-full">
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
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Principles */}
      <section className="py-24 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Security by Design</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { title: 'Deny by Default', desc: 'Everything is denied unless explicitly allowed. No exceptions.' },
              { title: 'Least Privilege', desc: 'Agents receive only the minimum permissions needed.' },
              { title: 'Immediate Revocation', desc: 'Pause, revoke or block any agent instantly.' },
              { title: 'Temporary Tokens', desc: 'No permanent tokens. TTL is mandatory.' },
              { title: 'Production Guarded', desc: 'Production actions always require human approval.' },
              { title: 'Audit Integrity', desc: 'Hash-chained append-only log detects tampering.' },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInStagger} initial="initial" animate="animate" custom={i}>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Counter */}
      <section className="py-16 border-t border-border/30 bg-card/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '47', label: 'Permission Scopes', icon: <Shield className="w-5 h-5 text-primary mx-auto mb-2" /> },
              { value: '9', label: 'Categories', icon: <Layers className="w-5 h-5 text-primary mx-auto mb-2" /> },
              { value: '5', label: 'Templates', icon: <Sparkles className="w-5 h-5 text-primary mx-auto mb-2" /> },
              { value: '0', label: 'Implicit Grants', icon: <ShieldX className="w-5 h-5 text-red-400 mx-auto mb-2" /> },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                {stat.icon}
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border/30 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5">
            <Sparkles className="w-3 h-3 mr-1" /> Start Securing Your Agents Today
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            No more anonymous agents.<br />
            <span className="bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent">Every action. Verified.</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Know every agent. Control every action. Audit every decision. Prevent unauthorized access with zero-trust identity for AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="relative overflow-hidden group h-14 px-10 text-lg font-semibold bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 transition-all" onClick={() => setView('dashboard')}>
              <span className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 bg-[length:200%_100%] animate-[gradient-shift_3s_ease-in-out_infinite] opacity-90 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center">
                <Zap className="w-5 h-5 mr-2" /> Get Started Free
              </span>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-10 text-lg border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300" onClick={() => setView('docs')}>
              <BookOpen className="w-5 h-5 mr-2" /> Read the Docs
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground/70">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No credit card</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 2-minute setup</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Open source</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> MIT License</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Fingerprint className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold">Agent<span className="text-primary">DNAI</span></span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Verifiable digital identity, scoped permissions, and audit trails for AI agents.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setView('dashboard')}>Dashboard</li>
                <li className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setView('agents')}>Agents</li>
                <li className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setView('policies')}>Policies</li>
                <li className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setView('audit')}>Audit Log</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setView('docs')}>Documentation</li>
                <li className="hover:text-foreground cursor-pointer transition-colors">API Reference</li>
                <li className="hover:text-foreground cursor-pointer transition-colors">CLI Guide</li>
                <li className="hover:text-foreground cursor-pointer transition-colors">Security Model</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Security</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="hover:text-foreground cursor-pointer transition-colors">Deny by Default</li>
                <li className="hover:text-foreground cursor-pointer transition-colors">Hash Chain Audit</li>
                <li className="hover:text-foreground cursor-pointer transition-colors">Key Rotation</li>
                <li className="hover:text-foreground cursor-pointer transition-colors">Token Security</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/30 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">© 2026 AgentDNAI · Early development · MIT License</span>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-primary" /> End-to-end encrypted</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-primary" /> Zero trust</span>
              <span className="flex items-center gap-1"><Hash className="w-3 h-3 text-primary" /> Hash-verified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Dashboard Sidebar ────────────────────────────────────────────────────────

function DashboardSidebar() {
  const { currentView, setView, sidebarOpen, setSidebarOpen } = useAppStore();
  const [isMobile, setIsMobile] = useState(false);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && sidebarOpen) setSidebarOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [sidebarOpen, setSidebarOpen]);

  const navItems = [
    { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'agents' as const, icon: Bot, label: 'Agents' },
    { id: 'playground' as const, icon: Command, label: 'Playground' },
    { id: 'agent-compare' as const, icon: Layers, label: 'Compare' },
    { id: 'activity-heatmap' as const, icon: Activity, label: 'Activity' },
    { id: 'security-events' as const, icon: Radio, label: 'Live Feed' },
    { id: 'audit' as const, icon: ScrollText, label: 'Audit Log' },
    { id: 'tokens' as const, icon: Key, label: 'Tokens' },
    { id: 'policies' as const, icon: Shield, label: 'Policies' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  // Hide sidebar on mobile (we use bottom nav instead)
  if (isMobile) return null;

  return (
    <aside className={`border-r border-border/50 bg-sidebar shrink-0 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'} relative`}>
      <div className="p-4 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Fingerprint className="w-5 h-5 text-primary" />
          </div>
          {sidebarOpen && <span className="text-lg font-bold">Agent<span className="text-primary">DNAI</span></span>}
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="w-4 h-4" />
        </Button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item, i) => {
          const isActive = currentView === item.id;
          const btn = (
            <motion.button
              key={item.id}
              variants={slideInLeft}
              initial="initial"
              animate="animate"
              transition={{ delay: i * 0.05 }}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive
                  ? 'text-primary border-l-2 border-primary pl-2 bg-gradient-to-r from-primary/15 via-primary/8 to-transparent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent border-l-2 border-transparent pl-2'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </motion.button>
          );

          if (!sidebarOpen) {
            return (
              <TooltipProvider key={item.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {btn}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return btn;
        })}
      </nav>
      <div className="p-3 border-t border-border/50">
        <button
          onClick={() => setView('docs')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mb-1`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Docs</span>}
        </button>
        <button
          onClick={() => setView('home')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Home className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Back to Home</span>}
        </button>
      </div>
      {/* Gradient line at bottom of sidebar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </aside>
  );
}

// ─── Security Score ──────────────────────────────────────────────────────────

function SecurityScore({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return null;
  const total = stats.recentAllowCount + stats.recentDenyCount + stats.recentRequiresApprovalCount;
  const score = total > 0 ? Math.round((stats.recentAllowCount / total) * 100) : 100;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  const strokeColor = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  
  return (
    <Card className="bg-card/30 backdrop-blur-lg border-border/30">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="relative">
          <svg width="88" height="88" className="-rotate-90">
            <circle cx="44" cy="44" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <motion.circle
              cx="44" cy="44" r={radius} fill="none" stroke={strokeColor} strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold ${color}`}>{score}</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Security Score</p>
          <p className="text-xs text-muted-foreground">
            {score >= 80 ? 'Healthy authorization rate' : score >= 50 ? 'Some denied actions' : 'High denial rate'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Notification Center ──────────────────────────────────────────────────────

function NotificationCenter({ events }: { events: AuditEvent[] }) {
  const { setView } = useAppStore();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const unreadCount = events.filter(e => !read.has(e.id)).length;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen(!open)}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-primary" />
        ) : (
          <Bell className="w-4 h-4 text-muted-foreground" />
        )}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 w-80 z-50 rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-xl shadow-black/20"
          >
            <div className="p-3 border-b border-border/50 flex items-center justify-between">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => {
                  const newRead = new Set(events.map(e => e.id));
                  setRead(newRead);
                }}>
                  Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-72">
              {events.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  No notifications yet
                </div>
              ) : (
                <div className="p-1">
                  {events.slice(0, 8).map(event => {
                    const isRead = read.has(event.id);
                    return (
                      <motion.button
                        key={event.id}
                        className={`w-full text-left p-2.5 rounded-lg transition-colors hover:bg-accent/50 ${!isRead ? 'bg-primary/5' : ''}`}
                        onClick={() => {
                          setRead(prev => new Set(prev).add(event.id));
                          setOpen(false);
                          setView('audit');
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                            event.decision === 'allow' ? 'bg-emerald-400' :
                            event.decision === 'deny' ? 'bg-red-400' :
                            event.decision === 'requires_approval' ? 'bg-amber-400' :
                            'bg-primary'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-mono ${!isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {event.eventType.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {event.action || 'System event'} · {timeAgo(event.createdAt)}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <div className="p-2 border-t border-border/50">
              <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => { setOpen(false); setView('audit'); }}>
                View All Audit Events
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView() {
  const { setView, navigateToAgent } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditEvent[]>([]);
  const [trendsData, setTrendsData] = useState<{
    hourlyTrends: { hour: string; allow: number; deny: number; requiresApproval: number }[];
    permissionDistribution: { category: string; allow: number; deny: number; requiresApproval: number }[];
    topActions: { action: string; count: number }[];
    period: string;
  } | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
  }, []);

  const loadTrends = useCallback(async () => {
    try {
      const data = await api.getTrends();
      setTrendsData(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { load(); loadTrends(); }, [load, loadTrends]);

  if (loading) {
    return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const statCards = [
    { label: 'Total Agents', value: stats?.totalAgents || 0, icon: <Bot className="w-4 h-4 text-primary" />, color: 'text-foreground', sparkline: [2, 3, 1, 4, 5, 3, 6], sparkColor: 'bg-primary', trend: '+12%', trendUp: true, gradientFrom: 'from-cyan-400', gradientTo: 'to-primary' },
    { label: 'Active', value: stats?.activeAgents || 0, icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400', sparkline: [1, 2, 3, 2, 4, 3, 5], sparkColor: 'bg-emerald-400', trend: '+8%', trendUp: true, gradientFrom: 'from-emerald-400', gradientTo: 'to-emerald-300' },
    { label: 'Permissions', value: stats?.totalPermissions || 0, icon: <Shield className="w-4 h-4 text-primary" />, color: 'text-foreground', sparkline: [5, 8, 12, 10, 15, 18, 20], sparkColor: 'bg-primary', trend: '+24%', trendUp: true, gradientFrom: 'from-cyan-400', gradientTo: 'to-blue-400' },
    { label: 'Active Tokens', value: stats?.activeTokens || 0, icon: <Key className="w-4 h-4 text-amber-400" />, color: 'text-amber-400', sparkline: [1, 2, 1, 3, 2, 4, 3], sparkColor: 'bg-amber-400', trend: '-3%', trendUp: false, gradientFrom: 'from-amber-400', gradientTo: 'to-orange-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your AI agent identities and authorization activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter events={recentAudit} />
          <Button variant="outline" size="sm" onClick={() => setShowSetupWizard(true)}>
            <Zap className="w-4 h-4 mr-1" /> Quick Setup
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground" onClick={async () => {
            try {
              await fetch('/api/seed', { method: 'POST' });
              toast({ title: 'Demo data seeded', description: 'Refresh to see the new data.' });
              load();
            } catch (err: any) {
              toast({ title: 'Error', description: err.message, variant: 'destructive' });
            }
          }}>
            <Sparkles className="w-4 h-4 mr-1" /> Seed Demo
          </Button>
        </div>
      </div>

      {/* System Status Bar */}
      <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">System Operational</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <span className="text-xs text-muted-foreground">Audit Chain: <span className="text-emerald-400">Verified</span></span>
        <div className="h-3 w-px bg-border" />
        <span className="text-xs text-muted-foreground">Policy Engine: <span className="text-emerald-400">Active</span></span>
        <div className="h-3 w-px bg-border" />
        <span className="text-xs text-muted-foreground">{stats?.totalAgents || 0} Agents Registered</span>
      </div>

      {/* Stats Grid with Sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={i} variants={fadeInStagger} initial="initial" animate="animate" custom={i}>
            <Card className="bg-card/30 backdrop-blur-lg border-border/30 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group relative overflow-hidden">
              {/* Gradient top accent line */}
              <div className="h-0.5 w-full bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-lg bg-gradient-to-r from-transparent via-primary/5 to-transparent bg-[length:200%_100%] animate-[border-shimmer_2s_linear_infinite]" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                  {card.icon}
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <motion.div
                      className={`text-2xl font-bold bg-gradient-to-r ${card.gradientFrom} ${card.gradientTo} bg-clip-text text-transparent`}
                      key={`stat-${card.label}-${card.value}`}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: [0.5, 1.15, 1], opacity: 1 }}
                      transition={{ delay: i * 0.1 + 0.3, duration: 0.5, type: 'spring' }}
                    >
                      {card.value}
                    </motion.div>
                    <span className={`text-xs font-mono flex items-center gap-0.5 mt-0.5 ${card.trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {card.trendUp ? <span>↑</span> : <span>↓</span>} {card.trend}
                    </span>
                  </div>
                  <Sparkline values={card.sparkline} color={card.sparkColor} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Security Score */}
      <SecurityScore stats={stats} />

      {/* Quick Actions */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30" onClick={() => setView('agents')}>
              <Plus className="w-5 h-5 text-emerald-400" />
              <span className="text-xs">New Agent</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30" onClick={() => setView('security-events')}>
              <Radio className="w-5 h-5 text-primary" />
              <span className="text-xs">Live Feed</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30" onClick={() => setView('audit')}>
              <ScrollText className="w-5 h-5 text-amber-400" />
              <span className="text-xs">View Audit</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 bg-cyan-500/5 border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500/30" onClick={() => setView('policies')}>
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="text-xs">Policies</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      {recentAudit.length > 0 && (
        <Card className="bg-card/30 backdrop-blur-lg border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activity Timeline</CardTitle>
            <CardDescription>Recent authorization events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
              {recentAudit.slice(0, 5).map((event, i) => {
                const timelineIcons: Record<string, React.ReactNode> = {
                  PERMISSION_GRANTED: <ShieldCheck className="w-3 h-3 text-primary" />,
                  PERMISSION_REVOKED: <ShieldX className="w-3 h-3 text-red-400" />,
                  AUTHORIZATION_CHECK: <Shield className="w-3 h-3 text-primary" />,
                  AGENT_CREATED: <Plus className="w-3 h-3 text-emerald-400" />,
                  AGENT_REVOKED: <Ban className="w-3 h-3 text-red-400" />,
                  AGENT_PAUSED: <Pause className="w-3 h-3 text-amber-400" />,
                  AGENT_RESUMED: <Play className="w-3 h-3 text-emerald-400" />,
                  KEY_ROTATED: <RotateCcw className="w-3 h-3 text-primary" />,
                  TOKEN_ISSUED: <Key className="w-3 h-3 text-amber-400" />,
                  TOKEN_REVOKED: <Trash2 className="w-3 h-3 text-red-400" />,
                };
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative mb-4 last:mb-0"
                  >
                    <div className={`absolute -left-4 top-1 w-5 h-5 rounded-full flex items-center justify-center ${
                      event.decision === 'allow' ? 'bg-emerald-400/20' :
                      event.decision === 'deny' ? 'bg-red-400/20' :
                      event.decision === 'requires_approval' ? 'bg-amber-400/20' :
                      'bg-primary/20'
                    }`}>
                      {timelineIcons[event.eventType] || <Activity className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{event.eventType.replace(/_/g, ' ')}</span>
                        {event.decision && <DecisionBadge decision={event.decision} />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.action || 'System event'} · {timeAgo(event.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="mt-4 space-y-2">
            <div className="h-4 bg-secondary rounded-full overflow-hidden flex">
              {stats && (stats.recentAllowCount + stats.recentDenyCount + stats.recentRequiresApprovalCount) > 0 && (
                <>
                  <div className="bg-emerald-400 h-full transition-all duration-500 relative group" style={{ width: `${(stats.recentAllowCount / (stats.recentAllowCount + stats.recentDenyCount + stats.recentRequiresApprovalCount)) * 100}%` }}>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-900">{stats.recentAllowCount}</span>
                  </div>
                  <div className="bg-red-400 h-full transition-all duration-500 relative group" style={{ width: `${(stats.recentDenyCount / (stats.recentAllowCount + stats.recentDenyCount + stats.recentRequiresApprovalCount)) * 100}%` }}>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-red-900">{stats.recentDenyCount}</span>
                  </div>
                  <div className="bg-amber-400 h-full transition-all duration-500 relative group" style={{ width: `${(stats.recentRequiresApprovalCount / (stats.recentAllowCount + stats.recentDenyCount + stats.recentRequiresApprovalCount)) * 100}%` }}>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-amber-900">{stats.recentRequiresApprovalCount}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Quick List & Recent Audit */}
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
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 text-muted-foreground"
              >
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <Bot className="w-16 h-16 text-primary/20 absolute inset-0" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  </div>
                </div>
                <p className="text-sm mb-3">No agents yet. Create your first agent or seed demo data.</p>
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => setView('agents')}>
                    <Plus className="w-4 h-4 mr-1" /> Create Agent
                  </Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    await fetch('/api/seed', { method: 'POST' });
                    load();
                  }}>
                    <Sparkles className="w-4 h-4 mr-1" /> Seed Demo
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {agents.slice(0, 5).map((agent, i) => (
                  <motion.div
                    key={agent.id}
                    variants={fadeInStagger}
                    initial="initial"
                    animate="animate"
                    custom={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors group"
                    onClick={() => navigateToAgent(agent.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <RuntimeIcon runtime={agent.runtime} className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{agent.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{agent.runtime}</div>
                      </div>
                    </div>
                    <StatusBadge status={agent.status} />
                  </motion.div>
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
                {recentAudit.map((event, i) => (
                  <motion.div
                    key={event.id}
                    variants={fadeInStagger}
                    initial="initial"
                    animate="animate"
                    custom={i}
                    className="flex items-center justify-between p-2 rounded bg-secondary/20 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{event.eventType}</span>
                      {event.action && <span className="text-foreground/70">{event.action}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{timeAgo(event.createdAt)}</span>
                      {event.decision && <DecisionBadge decision={event.decision} />}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Authorization Trends (24h) */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Authorization Trends (24h)
          </CardTitle>
          <CardDescription>Hourly allow, deny, and requires approval decisions</CardDescription>
        </CardHeader>
        <CardContent>
          {trendsData && trendsData.hourlyTrends.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendsData.hourlyTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorAllow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDeny" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorApproval" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: string) => v.split(' ')[1] || v}
                    interval={3}
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="allow" stroke="#34d399" fill="url(#colorAllow)" strokeWidth={2} name="Allow" />
                  <Area type="monotone" dataKey="deny" stroke="#f87171" fill="url(#colorDeny)" strokeWidth={2} name="Deny" />
                  <Area type="monotone" dataKey="requiresApproval" stroke="#fbbf24" fill="url(#colorApproval)" strokeWidth={2} name="Requires Approval" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              No trend data available. Seed demo data to see trends.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Distribution */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Permission Distribution
          </CardTitle>
          <CardDescription>Permissions by category</CardDescription>
        </CardHeader>
        <CardContent>
          {trendsData && trendsData.permissionDistribution.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="h-64 w-full lg:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trendsData.permissionDistribution.map(d => ({ ...d, total: d.allow + d.deny + d.requiresApproval }))}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={2}
                      label={({ category, total }: { category: string; total: number }) => total > 0 ? `${category}` : ''}
                    >
                      {trendsData.permissionDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#34d399', '#f87171', '#fbbf24', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#2dd4bf', '#818cf8'][index % 9]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 w-full">
                {trendsData.permissionDistribution.map((cat, i) => (
                  <div key={cat.category} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: ['#34d399', '#f87171', '#fbbf24', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#2dd4bf', '#818cf8'][i % 9] }} />
                      <span className="text-sm font-mono">{cat.category}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-400">{cat.allow}</span>
                      <span className="text-red-400">{cat.deny}</span>
                      <span className="text-amber-400">{cat.requiresApproval}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Allow</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /> Deny</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> Approval</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              No permission data available. Grant permissions to see distribution.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Setup Wizard */}
      <QuickSetupWizard open={showSetupWizard} onOpenChange={setShowSetupWizard} onComplete={load} />
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [runtimeFilter, setRuntimeFilter] = useState('all');

  const loadAgents = useCallback(async () => {
    try {
      const data = await api.listAgents({
        search: searchQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        runtime: runtimeFilter === 'all' ? undefined : runtimeFilter,
      });
      setAgents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, runtimeFilter]);

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

      {/* Search and Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search agents by name, description, or URI..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/30"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-secondary/30"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="REVOKED">Revoked</SelectItem>
            <SelectItem value="BLOCKED">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={runtimeFilter} onValueChange={setRuntimeFilter}>
          <SelectTrigger className="w-40 bg-secondary/30"><SelectValue placeholder="All Runtimes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Runtimes</SelectItem>
            <SelectItem value="hermes">Hermes</SelectItem>
            <SelectItem value="codex">Codex</SelectItem>
            <SelectItem value="openclaw">OpenClaw</SelectItem>
            <SelectItem value="cli">CLI</SelectItem>
            <SelectItem value="automation">Automation</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || statusFilter !== 'all' || runtimeFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setRuntimeFilter('all'); }}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 text-primary animate-spin" /></div>
      ) : agents.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="py-16 text-center">
              <div className="relative mx-auto w-20 h-20 mb-6">
                <Bot className="w-20 h-20 text-primary/20 absolute inset-0" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
              <p className="text-muted-foreground mb-4">Create your first AI agent identity to get started.</p>
              <Button className="bg-primary text-primary-foreground" onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create Agent
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.id}
              variants={fadeInStagger}
              initial="initial"
              animate="animate"
              custom={i}
            >
              <Card
                className={`bg-card/50 border-border/50 hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden hover:shadow-lg ${
                  agent.status === 'ACTIVE' ? 'hover:shadow-primary/10' : 'hover:shadow-primary/5'
                }`}
                onClick={() => navigateToAgent(agent.id)}
              >
                {/* Cyan glow border effect on hover */}
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: agent.status === 'ACTIVE' ? '0 0 15px oklch(0.75 0.15 195 / 0.15), inset 0 0 15px oklch(0.75 0.15 195 / 0.05)' : 'none' }} />
                {/* Gradient border overlay on hover */}
                <div className="absolute inset-0 rounded-lg border border-primary/0 group-hover:border-primary/30 transition-colors duration-300 pointer-events-none" />
                {/* Active agent subtle glow */}
                {agent.status === 'ACTIVE' && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <RuntimeIcon runtime={agent.runtime} className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <CardDescription className="font-mono text-xs flex items-center gap-1">
                          <RuntimeIcon runtime={agent.runtime} className="w-3 h-3" />
                          {agent.runtime}
                        </CardDescription>
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
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(agent.createdAt)}</span>
                  </div>
                  {/* Last seen indicator */}
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/30'}`} />
                    <span>{agent.status === 'ACTIVE' ? 'Active now' : `Last seen ${timeAgo(agent.updatedAt || agent.createdAt)}`}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="text-xs font-mono text-muted-foreground/60 truncate w-full">{agent.agentUri}</div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Agent Risk Profile ────────────────────────────────────────────────────

function AgentRiskProfile({ agentId }: { agentId: string }) {
  const [riskData, setRiskData] = useState<{
    agentId: string;
    riskScore: number;
    riskLevel: string;
    factors: { name: string; impact: number; description: string }[];
    assessedAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRisk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAgentRisk(agentId);
      setRiskData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load risk data');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { loadRisk(); }, [loadRisk]);

  const riskColors: Record<string, { stroke: string; text: string; bg: string }> = {
    low: { stroke: '#34d399', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    medium: { stroke: '#fbbf24', text: 'text-amber-400', bg: 'bg-amber-500/10' },
    high: { stroke: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500/10' },
    critical: { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-card/30 backdrop-blur-lg border-border/30">
        <CardContent className="p-8 text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-primary opacity-30" />
          <h3 className="text-lg font-semibold mb-2">Risk analysis coming soon</h3>
          <p className="text-sm text-muted-foreground mb-4">The risk scoring engine is being calibrated. Check back later.</p>
          <Button variant="outline" size="sm" onClick={loadRisk}>
            <RefreshCw className="w-4 h-4 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!riskData) return null;

  const colors = riskColors[riskData.riskLevel] || riskColors.low;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (riskData.riskScore / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Risk Score Circle */}
      <Card className="bg-card/30 backdrop-blur-lg border-border/30">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <svg width="160" height="160" className="-rotate-90">
              <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
              <motion.circle
                cx="80" cy="80" r={radius} fill="none" stroke={colors.stroke} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${colors.text}`}>{riskData.riskScore}</span>
              <span className={`text-xs font-mono uppercase ${colors.text} opacity-80`}>{riskData.riskLevel}</span>
            </div>
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-semibold">Risk Score</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {riskData.riskLevel === 'low' && 'This agent has a low risk profile. Permissions and tokens are well-managed.'}
              {riskData.riskLevel === 'medium' && 'This agent has a moderate risk profile. Consider reviewing permissions and active tokens.'}
              {riskData.riskLevel === 'high' && 'This agent has a high risk profile. Review high-risk scopes and consider reducing permissions.'}
              {riskData.riskLevel === 'critical' && 'This agent has a critical risk profile. Immediate review recommended. Consider revoking or pausing.'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Badge className={`${colors.bg} ${colors.text} border-0`}>
                {riskData.riskLevel.toUpperCase()} RISK
              </Badge>
              <Button variant="outline" size="sm" onClick={loadRisk}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Risk Score
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors */}
      <div className="grid gap-4 sm:grid-cols-2">
        {riskData.factors.map((factor, i) => (
          <motion.div
            key={factor.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
          >
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{factor.name}</span>
                  <span className={`text-xs font-mono ${factor.impact > 20 ? 'text-red-400' : factor.impact > 10 ? 'text-amber-400' : factor.impact > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    +{factor.impact}
                  </span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-2">
                  <motion.div
                    className={`h-full rounded-full ${
                      factor.impact > 20 ? 'bg-red-400' : factor.impact > 10 ? 'bg-amber-400' : factor.impact > 0 ? 'bg-orange-400' : 'bg-emerald-400'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((factor.impact / 30) * 100, 100)}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{factor.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
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

  // Group permissions by category for the better permission table
  const permsByCategory = (agent.permissions || []).reduce<Record<string, Permission[]>>((acc, p) => {
    const cat = p.scope.split('.')[0];
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setView('agents')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <RuntimeIcon runtime={agent.runtime} className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <StatusBadge status={agent.status} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-mono text-muted-foreground">{agent.agentUri}</span>
              <CopyButton text={agent.agentUri} />
            </div>
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
              <div className="flex justify-between"><span className="text-muted-foreground">Runtime</span><span className="font-mono flex items-center gap-1"><RuntimeIcon runtime={agent.runtime} className="w-3 h-3" /> {agent.runtime}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span title={new Date(agent.createdAt).toLocaleString()}>{timeAgo(agent.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last Seen</span><span>{agent.lastSeenAt ? timeAgo(agent.lastSeenAt) : 'Never'}</span></div>
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
                <div className="bg-secondary/30 rounded p-3 font-mono text-xs break-all flex items-center gap-2">
                  <span className="flex-1">{issuedToken.token}</span>
                  <CopyButton text={issuedToken.token} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expires: {new Date(issuedToken.expiresAt).toLocaleString()}</span>
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
              <DialogTitle>Authorization Check Playground</DialogTitle>
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
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-lg border p-4 ${authzResult.allowed ? 'border-emerald-500/30 bg-emerald-500/5' : authzResult.requiresApproval ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {authzResult.allowed ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : authzResult.requiresApproval ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                    <span className="font-semibold text-lg">{authzResult.decision.toUpperCase()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{authzResult.reason}</p>
                  {authzResult.expiresAt && (
                    <p className="text-xs text-muted-foreground mt-2">Expires: {new Date(authzResult.expiresAt).toLocaleString()}</p>
                  )}
                  {authzResult.requiresApproval && agent && (
                    <Button
                      size="sm"
                      className="mt-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                      onClick={async () => {
                        try {
                          await api.approveAction(agent.id, { action: authzForm.action, resource: authzForm.resource || undefined });
                          toast({ title: 'Action Approved', description: `Approved ${authzForm.action} for 1 hour.` });
                          setAuthzResult(null);
                          loadAgent();
                        } catch (err: any) {
                          toast({ title: 'Approval Error', description: err.message, variant: 'destructive' });
                        }
                      }}
                    >
                      <ShieldCheck className="w-4 h-4 mr-1" /> Approve This Action (1h)
                    </Button>
                  )}
                </motion.div>
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
          <TabsTrigger value="risk"><TrendingUp className="w-4 h-4 mr-1" /> Risk Profile</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="w-4 h-4 mr-1" /> Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-0">
              {agent.permissions && agent.permissions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Effect</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent.permissions.map(p => {
                      const cat = p.scope.split('.')[0];
                      const catIcons: Record<string, React.ReactNode> = {
                        github: <Github className="w-3.5 h-3.5 text-purple-400" />,
                        filesystem: <HardDrive className="w-3.5 h-3.5 text-blue-400" />,
                        server: <Server className="w-3.5 h-3.5 text-orange-400" />,
                        database: <Database className="w-3.5 h-3.5 text-emerald-400" />,
                        browser: <Globe className="w-3.5 h-3.5 text-cyan-400" />,
                        secrets: <Lock className="w-3.5 h-3.5 text-red-400" />,
                        email: <Mail className="w-3.5 h-3.5 text-amber-400" />,
                        payments: <CreditCard className="w-3.5 h-3.5 text-pink-400" />,
                        production: <ShieldAlert className="w-3.5 h-3.5 text-red-400" />,
                      };
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {catIcons[cat] || <Shield className="w-3.5 h-3.5" />}
                              <span className="text-xs">{cat}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{p.scope}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{p.resource || '*'}</TableCell>
                          <TableCell><EffectBadge effect={p.effect} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.expiresAt ? timeAgo(p.expiresAt) : 'Never'}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeletePermission(p.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent.tokens.map(t => {
                      const expired = new Date(t.expiresAt) < new Date();
                      const revoked = !!t.revokedAt;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-1">
                              {t.id.slice(0, 12)}...
                              <CopyButton text={t.id} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {JSON.parse(t.scopes).map((s: string) => <Badge key={s} variant="secondary" className="text-xs font-mono">{s}</Badge>)}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{timeAgo(t.expiresAt)}</TableCell>
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
                      <TableRow key={e.id} className={e.decision === 'allow' ? 'bg-emerald-500/[0.02]' : e.decision === 'deny' ? 'bg-red-500/[0.02]' : e.decision === 'requires_approval' ? 'bg-amber-500/[0.02]' : ''}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(e.createdAt)}</TableCell>
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

        <TabsContent value="risk">
          <AgentRiskProfile agentId={agent.id} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// ─── Audit View ───────────────────────────────────────────────────────────────

function AuditView() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDecision, setFilterDecision] = useState<string>('all');
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [exporting, setExporting] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const data = await api.getAuditEvents({
        decision: filterDecision === 'all' ? undefined : filterDecision || undefined,
        eventType: filterEventType === 'all' ? undefined : filterEventType || undefined,
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/audit/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'agentdnai-audit-export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: 'CSV exported', description: 'Audit log has been downloaded.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">Hash-chained, append-only record of every authorization decision.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="w-4 h-4 mr-1" /> {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterDecision} onValueChange={setFilterDecision}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Decisions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Decisions</SelectItem>
            <SelectItem value="allow">Allow</SelectItem>
            <SelectItem value="deny">Deny</SelectItem>
            <SelectItem value="requires_approval">Requires Approval</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEventType} onValueChange={setFilterEventType}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Event Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Event Types</SelectItem>
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
                  {events.map((e, idx) => (
                    <TableRow
                      key={e.id}
                      className={`${
                        e.decision === 'allow' ? 'border-l-2 border-l-emerald-400/60 bg-emerald-500/[0.04]' :
                        e.decision === 'deny' ? 'border-l-2 border-l-red-400/60 bg-red-500/[0.04]' :
                        e.decision === 'requires_approval' ? 'border-l-2 border-l-amber-400/60 bg-amber-500/[0.04]' :
                        'border-l-2 border-l-transparent'
                      } ${idx % 2 === 1 ? 'bg-secondary/[0.03]' : ''}`}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(e.createdAt)}</TableCell>
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

      {/* Chain Integrity Verification */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Hash Chain Integrity</p>
                <p className="text-xs text-muted-foreground">Every audit event is linked via SHA-256 hash chain. Tampering breaks the chain and is immediately detectable.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                const result = await api.verifyAuditChain();
                if (result.valid) {
                  toast({ title: 'Chain Verified', description: `${result.eventsChecked} events verified. Hash chain is intact.` });
                } else {
                  toast({ title: 'Chain Broken!', description: `Integrity failed at event ${result.firstInvalidEvent}`, variant: 'destructive' });
                }
              } catch (err: any) {
                toast({ title: 'Verification Error', description: err.message, variant: 'destructive' });
              }
            }}>
              <ShieldCheck className="w-4 h-4 mr-1" /> Verify Chain
            </Button>
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
  const [issuing, setIssuing] = useState(false);

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

  const allTokens = agents.flatMap(a =>
    (a.tokens || []).map(t => ({ ...t, agentName: a.name, agentRuntime: a.runtime }))
  );

  const handleIssue = async () => {
    if (!issueForm.agentId) return;
    setIssuing(true);
    try {
      const result = await api.issueToken({
        agentId: issueForm.agentId,
        scopes: issueForm.scopes.filter(s => s.trim()),
        ttlSeconds: issueForm.ttlSeconds,
      });
      setIssuedToken(result);
      toast({ title: 'Token issued', description: 'Copy the token now — it will not be shown again.' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIssuing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tokens</h1>
          <p className="text-muted-foreground">Manage temporary authentication tokens for agents.</p>
        </div>
        <Dialog open={showIssueDialog} onOpenChange={v => { setShowIssueDialog(v); if (!v) setIssuedToken(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Issue Token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Token</DialogTitle>
              <DialogDescription>Generate a temporary token for an agent.</DialogDescription>
            </DialogHeader>
            {issuedToken ? (
              <div className="space-y-4 py-4">
                <Alert className="border-primary/30 bg-primary/5">
                  <Key className="w-4 h-4 text-primary" />
                  <AlertTitle>Token Issued</AlertTitle>
                  <AlertDescription>Copy this token now. It will not be shown again.</AlertDescription>
                </Alert>
                <div className="bg-secondary/30 rounded p-3 font-mono text-xs break-all flex items-center gap-2">
                  <span className="flex-1">{issuedToken.token}</span>
                  <CopyButton text={issuedToken.token} />
                </div>
                <div className="text-sm text-muted-foreground">Expires: {new Date(issuedToken.expiresAt).toLocaleString()}</div>
                <div className="flex flex-wrap gap-1">
                  {issuedToken.scopes.map(s => <Badge key={s} variant="secondary" className="text-xs font-mono">{s}</Badge>)}
                </div>
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
                  <Button size="sm" variant="outline" onClick={() => setIssueForm({ ...issueForm, scopes: [...issueForm.scopes, ''] })}>
                    <Plus className="w-4 h-4 mr-1" /> Add Scope
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>TTL</Label>
                  <Select value={String(issueForm.ttlSeconds)} onValueChange={v => setIssueForm({ ...issueForm, ttlSeconds: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="900">15 minutes</SelectItem>
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
                  <Button className="bg-primary text-primary-foreground" onClick={handleIssue} disabled={issuing || !issueForm.agentId}>Issue</Button>
                </>
              ) : <Button onClick={() => setShowIssueDialog(false)}>Done</Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {allTokens.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-16 text-center">
            <Key className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tokens yet</h3>
            <p className="text-muted-foreground">Issue a token to an active agent to get started.</p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTokens.map(t => {
                  const expired = new Date(t.expiresAt) < new Date();
                  const revoked = !!t.revokedAt;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RuntimeIcon runtime={t.agentRuntime} className="w-4 h-4" />
                          <span className="text-sm font-medium">{t.agentName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {JSON.parse(t.scopes).map((s: string) => <Badge key={s} variant="secondary" className="text-xs font-mono">{s}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(t.expiresAt)}</TableCell>
                      <TableCell>
                        {revoked ? <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs">Revoked</Badge> :
                         expired ? <Badge variant="outline" className="text-gray-400 border-gray-400/30 text-xs">Expired</Badge> :
                         <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-xs">Active</Badge>}
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Policies</h1>
        <p className="text-muted-foreground">Permission templates and the security policy catalog.</p>
      </div>

      {/* Permission Templates */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Permission Templates</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PERMISSION_TEMPLATES.map((tpl, i) => (
            <motion.div key={tpl.id} variants={fadeInStagger} initial="initial" animate="animate" custom={i}>
              <Card className="bg-card/50 border-border/50 h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{tpl.name}</CardTitle>
                  <CardDescription className="text-xs">{tpl.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Allows:</p>
                      <div className="flex flex-wrap gap-1">
                        {tpl.permissions.map(p => <Badge key={p} variant="secondary" className="text-xs font-mono bg-emerald-500/10 text-emerald-400">{p}</Badge>)}
                      </div>
                    </div>
                    {tpl.denied.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Denies:</p>
                        <div className="flex flex-wrap gap-1">
                          {tpl.denied.map(p => <Badge key={p} variant="secondary" className="text-xs font-mono bg-red-500/10 text-red-400">{p}</Badge>)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Permission Catalog */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Full Permission Catalog</h2>
        <div className="space-y-4">
          {PERMISSION_CATEGORIES.map(cat => {
            const perms = PERMISSIONS.filter(p => p.category === cat);
            return (
              <Card key={cat} className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">{cat}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {perms.map(p => (
                      <div key={p.scope} className="flex items-center justify-between p-2 rounded bg-secondary/20">
                        <span className="text-xs font-mono">{p.scope}</span>
                        <div className="flex items-center gap-2">
                          <RiskBadge riskLevel={p.riskLevel} />
                          {p.requiresApproval && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────

function SettingsView() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('agentdnai-theme') !== 'light';
    }
    return true;
  });

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem('agentdnai-theme', newIsDark ? 'dark' : 'light');
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Apply theme on mount
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Platform configuration and security settings.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sun className="w-4 h-4 text-primary" /> Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {isDark ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-amber-400" />}
                <span className="text-muted-foreground">Theme</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${!isDark ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>Light</span>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-secondary'}`}
                  aria-label="Toggle theme"
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-xs ${isDark ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>Dark</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Mode</span>
              <Badge variant="outline" className={`text-xs ${isDark ? 'text-primary border-primary/30' : 'text-amber-400 border-amber-400/30'}`}>
                {isDark ? 'Dark' : 'Light'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accent Color</span>
              <Badge variant="outline" className="text-xs text-primary border-primary/30">Cyan</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Security Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Default Policy</span><Badge variant="outline" className="font-mono text-xs">DENY</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Production Approval</span><Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">Required</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Max Token TTL</span><span className="font-mono">24h</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Key Rotation</span><Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">Enabled</Badge></div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Cryptography</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Hash Algorithm</span><span className="font-mono">SHA-256</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Token Storage</span><span className="font-mono">Hash-only</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Audit Chain</span><Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">Active</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Key Pair</span><span className="font-mono">Ed25519*</span></div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ScrollText className="w-4 h-4 text-primary" /> Audit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Log Mode</span><Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">Append-Only</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Chain Integrity</span><Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">Verified</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Retention</span><span className="font-mono">Unlimited</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Export</span><span className="font-mono">CSV</span></div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" /> Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">REST API</span>
              <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">Active</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">CLI</span>
              <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">Planned</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">SDK</span>
              <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">Planned</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Webhooks</span>
              <Badge variant="outline" className="text-xs text-muted-foreground">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">API Server</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">Online</Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Database</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">Connected</Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Policy Engine</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">Active</Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Audit Chain</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">Intact</Badge>
              </div>
            </div>
            <div className="mt-3 p-2 rounded-lg bg-secondary/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-mono text-emerald-400">99.97%</span>
              </div>
              <Progress value={99.97} className="h-1 mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4 text-primary" /> Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Export All Data</p>
                  <p className="text-xs text-muted-foreground">Download all agents, permissions, tokens, and audit events as JSON</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const data = await api.exportData();
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `agentdnai-export-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                      toast({ title: 'Export complete', description: 'Data has been downloaded as JSON.' });
                    } catch (err: any) {
                      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
                    }
                  }}
                >
                  <FileDown className="w-4 h-4 mr-1" /> Export JSON
                </Button>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Import Data</p>
                <p className="text-xs text-muted-foreground mb-3">Upload a previously exported JSON file to import agents</p>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept=".json"
                    className="text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          try {
                            const data = JSON.parse(ev.target?.result as string);
                            const result = await api.importData(data);
                            toast({
                              title: 'Import complete',
                              description: `${result.agentsImported} agent(s) imported, ${result.agentsSkipped} skipped.`,
                            });
                            if (result.errors.length > 0) {
                              toast({
                                title: 'Import warnings',
                                description: result.errors.slice(0, 3).join('; '),
                                variant: 'destructive',
                              });
                            }
                          } catch (err: any) {
                            toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Docs View ────────────────────────────────────────────────────────────────

function DocsView() {
  const { setView } = useAppStore();
  const [activeSection, setActiveSection] = useState('quick-start');

  const sections = [
    { id: 'quick-start', label: 'Quick Start', icon: <Zap className="w-4 h-4" /> },
    { id: 'api-reference', label: 'API Reference', icon: <Code2 className="w-4 h-4" /> },
    { id: 'cli-reference', label: 'CLI Reference', icon: <Terminal className="w-4 h-4" /> },
    { id: 'permissions', label: 'Permission Catalog', icon: <Shield className="w-4 h-4" /> },
    { id: 'security-model', label: 'Security Model', icon: <Lock className="w-4 h-4" /> },
  ];

  const apiEndpoints = [
    { method: 'POST', path: '/api/agents', desc: 'Create a new agent identity' },
    { method: 'GET', path: '/api/agents', desc: 'List all agents' },
    { method: 'GET', path: '/api/agents/:id', desc: 'Get agent details' },
    { method: 'POST', path: '/api/agents/:id/pause', desc: 'Pause an agent' },
    { method: 'POST', path: '/api/agents/:id/resume', desc: 'Resume a paused agent' },
    { method: 'POST', path: '/api/agents/:id/revoke', desc: 'Revoke an agent' },
    { method: 'POST', path: '/api/agents/:id/rotate-key', desc: 'Rotate agent key pair' },
    { method: 'POST', path: '/api/agents/:id/permissions', desc: 'Grant a permission' },
    { method: 'GET', path: '/api/agents/:id/permissions', desc: 'List agent permissions' },
    { method: 'DELETE', path: '/api/agents/:id/permissions', desc: 'Remove a permission' },
    { method: 'POST', path: '/api/tokens/issue', desc: 'Issue a temporary token' },
    { method: 'POST', path: '/api/tokens/:id/revoke', desc: 'Revoke a token' },
    { method: 'POST', path: '/api/authz/check', desc: 'Check authorization' },
    { method: 'GET', path: '/api/audit', desc: 'Get audit events' },
    { method: 'GET', path: '/api/audit/export', desc: 'Export audit as CSV' },
    { method: 'GET', path: '/api/stats', desc: 'Get dashboard statistics' },
    { method: 'POST', path: '/api/seed', desc: 'Seed demo data' },
  ];

  const cliCommands = [
    { cmd: 'agentdnai create <name> --runtime <runtime>', desc: 'Create a new agent identity' },
    { cmd: 'agentdnai list', desc: 'List all agents' },
    { cmd: 'agentdnai info <agent-id>', desc: 'Show agent details' },
    { cmd: 'agentdnai pause <agent-id>', desc: 'Pause an agent' },
    { cmd: 'agentdnai resume <agent-id>', desc: 'Resume a paused agent' },
    { cmd: 'agentdnai revoke <agent-id>', desc: 'Revoke an agent permanently' },
    { cmd: 'agentdnai rotate-key <agent-id>', desc: 'Rotate the agent key pair' },
    { cmd: 'agentdnai grant <agent-id> <scope> [--resource <res>] [--effect ALLOW|DENY]', desc: 'Grant a permission' },
    { cmd: 'agentdnai revoke-perm <agent-id> <permission-id>', desc: 'Remove a permission' },
    { cmd: 'agentdnai token issue <agent-id> --scopes <scopes> --ttl <seconds>', desc: 'Issue a temporary token' },
    { cmd: 'agentdnai token revoke <token-id>', desc: 'Revoke a token' },
    { cmd: 'agentdnai check <agent-id> <action> [--resource <res>]', desc: 'Check authorization' },
    { cmd: 'agentdnai audit [--agent <id>] [--decision <d>] [--export]', desc: 'View or export audit log' },
    { cmd: 'agentdnai seed', desc: 'Seed demo data' },
  ];

  const methodColors: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    POST: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentation</h1>
          <p className="text-muted-foreground">Everything you need to use AgentDNAI.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setView('dashboard')}>
          <LayoutDashboard className="w-4 h-4 mr-1" /> Back to Dashboard
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-card/50 border-border/50 sticky top-24">
            <CardContent className="p-3">
              <nav className="space-y-1">
                {sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSection === s.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    {s.icon}
                    {s.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeSection === 'quick-start' && (
            <motion.div {...fadeIn} className="space-y-6">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>Quick Start</CardTitle>
                  <CardDescription>Get started with AgentDNAI in under 5 minutes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">1</div>
                      <div>
                        <p className="font-semibold text-sm">Seed Demo Data</p>
                        <p className="text-sm text-muted-foreground mb-2">Populate the platform with 5 demo agents, tokens, and audit events.</p>
                        <code className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded">POST /api/seed</code>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">2</div>
                      <div>
                        <p className="font-semibold text-sm">Create an Agent</p>
                        <p className="text-sm text-muted-foreground mb-2">Generate a unique identity with a cryptographic key pair.</p>
                        <code className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded">POST /api/agents {"{ name, runtime, description }"}</code>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">3</div>
                      <div>
                        <p className="font-semibold text-sm">Grant Permissions</p>
                        <p className="text-sm text-muted-foreground mb-2">Assign scoped permissions with allow, deny, or requires_approval effects.</p>
                        <code className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded">POST /api/agents/:id/permissions {"{ scope, effect }"}</code>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">4</div>
                      <div>
                        <p className="font-semibold text-sm">Issue a Token</p>
                        <p className="text-sm text-muted-foreground mb-2">Get a short-lived, hash-stored authentication token.</p>
                        <code className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded">POST /api/tokens/issue {"{ agentId, scopes, ttlSeconds }"}</code>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">5</div>
                      <div>
                        <p className="font-semibold text-sm">Check Authorization</p>
                        <p className="text-sm text-muted-foreground mb-2">Verify that an agent is authorized to perform a specific action.</p>
                        <code className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded">POST /api/authz/check {"{ agentId, action, resource }"}</code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeSection === 'api-reference' && (
            <motion.div {...fadeIn} className="space-y-4">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>API Reference</CardTitle>
                  <CardDescription>All available REST API endpoints.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Method</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiEndpoints.map((ep, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Badge variant="outline" className={`font-mono text-xs ${methodColors[ep.method] || ''}`}>{ep.method}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{ep.path}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ep.desc}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeSection === 'cli-reference' && (
            <motion.div {...fadeIn} className="space-y-4">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>CLI Reference</CardTitle>
                  <CardDescription>Command-line interface commands.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cliCommands.map((cmd, i) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/20 space-y-1">
                      <code className="text-xs font-mono text-primary">{cmd.cmd}</code>
                      <p className="text-xs text-muted-foreground">{cmd.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeSection === 'permissions' && (
            <motion.div {...fadeIn} className="space-y-4">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>Permission Catalog Summary</CardTitle>
                  <CardDescription>9 categories, 47 permissions across 5 risk levels.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {PERMISSION_CATEGORIES.map(cat => {
                    const perms = PERMISSIONS.filter(p => p.category === cat);
                    const low = perms.filter(p => p.riskLevel === 'low').length;
                    const med = perms.filter(p => p.riskLevel === 'medium').length;
                    const high = perms.filter(p => p.riskLevel === 'high').length;
                    const crit = perms.filter(p => p.riskLevel === 'critical').length;
                    return (
                      <div key={cat} className="p-3 rounded-lg bg-secondary/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm uppercase tracking-wider">{cat}</span>
                          <span className="text-xs text-muted-foreground">{perms.length} permissions</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {low > 0 && <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{low} low</span>}
                          {med > 0 && <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">{med} medium</span>}
                          {high > 0 && <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400">{high} high</span>}
                          {crit > 0 && <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">{crit} critical</span>}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeSection === 'security-model' && (
            <motion.div {...fadeIn} className="space-y-4">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>Security Model</CardTitle>
                  <CardDescription>The core security principles that govern AgentDNAI.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { title: 'Deny by Default', desc: 'All actions are denied unless there is an explicit ALLOW permission. No implicit grants, no exceptions.' },
                    { title: 'Explicit Deny Overrides Allow', desc: 'If both an ALLOW and DENY rule exist for the same scope, DENY always wins. This prevents accidental privilege escalation.' },
                    { title: 'Production Requires Approval', desc: 'Any action in the production category automatically requires human approval, regardless of ALLOW permissions. This is a hard-coded policy.' },
                    { title: 'Temporary Tokens Only', desc: 'Tokens have a maximum TTL of 24 hours. No permanent tokens exist. Expired tokens are automatically invalid.' },
                    { title: 'Hash-Only Token Storage', desc: 'Raw tokens are never stored in the database. Only SHA-256 hashes are persisted, making token theft from the DB impossible.' },
                    { title: 'Hash-Chained Audit Log', desc: 'Every audit event contains the hash of the previous event. Tampering with any event breaks the chain and is immediately detectable.' },
                    { title: 'Immediate Revocation', desc: 'Agents can be paused, revoked, or blocked instantly. Revoked agents are denied all actions regardless of their permissions.' },
                    { title: 'Key Rotation', desc: 'Agent key pairs can be rotated at any time, generating a new pair and invalidating the old one.' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-secondary/20">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

// ─── Playground View ──────────────────────────────────────────────────────────

function PlaygroundView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [actionsText, setActionsText] = useState('');
  const [resource, setResource] = useState('');
  const [results, setResults] = useState<Array<{ action: string; allowed: boolean; decision: string; reason: string; requiresApproval: boolean }>>([]);
  const [loading, setLoading] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(true);

  useEffect(() => {
    api.listAgents().then(a => { setAgents(a); setAgentsLoading(false); }).catch(() => setAgentsLoading(false));
  }, []);

  const handleBatchCheck = async () => {
    if (!selectedAgentId) {
      toast({ title: 'Select an agent', description: 'Please select an agent first.', variant: 'destructive' });
      return;
    }
    const actions = actionsText.split('\n').map(a => a.trim()).filter(Boolean);
    if (actions.length === 0) {
      toast({ title: 'Enter actions', description: 'Please enter at least one action to check.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const res = await api.batchCheckAuthz({ agentId: selectedAgentId, actions, resource: resource || undefined });
      setResults(res.results as any);
    } catch (err: any) {
      toast({ title: 'Batch check failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const allowedCount = results.filter(r => r.decision === 'allow').length;
  const deniedCount = results.filter(r => r.decision === 'deny').length;
  const approvalCount = results.filter(r => r.decision === 'requires_approval').length;

  const decisionStyles: Record<string, { card: string; icon: React.ReactNode; border: string }> = {
    allow: {
      card: 'bg-emerald-500/5',
      border: 'border-emerald-500/30',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    },
    deny: {
      card: 'bg-red-500/5',
      border: 'border-red-500/30',
      icon: <XCircle className="w-5 h-5 text-red-400" />,
    },
    requires_approval: {
      card: 'bg-amber-500/5',
      border: 'border-amber-500/30',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Command className="w-6 h-6 text-primary" /> Authorization Playground
        </h1>
        <p className="text-muted-foreground">Test multiple authorization checks at once against any agent.</p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Select an agent and enter actions to check (one per line)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder={agentsLoading ? 'Loading...' : 'Select an agent'} />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} <span className="text-muted-foreground font-mono text-xs">({a.agentUri})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Resource (optional)</Label>
              <Input
                placeholder="e.g. github.com/org/repo"
                value={resource}
                onChange={e => setResource(e.target.value)}
                className="bg-background/50 font-mono text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Actions to check (one per line, max 50)</Label>
            <Textarea
              placeholder={"github.repo.read\ngithub.repo.write\nserver.deploy.production\nsecrets.read\ndatabase.migrate"}
              value={actionsText}
              onChange={e => setActionsText(e.target.value)}
              className="bg-background/50 font-mono text-sm min-h-[120px]"
            />
          </div>
          <Button
            className="bg-primary text-primary-foreground w-full sm:w-auto"
            onClick={handleBatchCheck}
            disabled={loading || !selectedAgentId}
          >
            {loading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : <><Command className="w-4 h-4 mr-2" /> Run Batch Check</>}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div variants={fadeInStagger} initial="initial" animate="animate" custom={0}>
              <Card className="bg-emerald-500/5 border-emerald-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{allowedCount}</div>
                  <div className="text-xs text-muted-foreground">Allowed</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeInStagger} initial="initial" animate="animate" custom={1}>
              <Card className="bg-red-500/5 border-red-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">{deniedCount}</div>
                  <div className="text-xs text-muted-foreground">Denied</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeInStagger} initial="initial" animate="animate" custom={2}>
              <Card className="bg-amber-500/5 border-amber-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400">{approvalCount}</div>
                  <div className="text-xs text-muted-foreground">Requires Approval</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Result Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((r, i) => {
              const style = decisionStyles[r.decision] || decisionStyles.deny;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
                >
                  <Card className={`${style.card} ${style.border} hover:shadow-lg transition-shadow`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-foreground truncate max-w-[60%]">{r.action}</span>
                        {style.icon}
                      </div>
                      <DecisionBadge decision={r.decision} />
                      <p className="text-xs text-muted-foreground line-clamp-2">{r.reason}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Agent Compare View ───────────────────────────────────────────────────────

function AgentCompareView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentAId, setAgentAId] = useState<string>('');
  const [agentBId, setAgentBId] = useState<string>('');
  const [agentA, setAgentA] = useState<(Agent & { permissions: Permission[]; tokens: Token[]; auditEvents: AuditEvent[] }) | null>(null);
  const [agentB, setAgentB] = useState<(Agent & { permissions: Permission[]; tokens: Token[]; auditEvents: AuditEvent[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(true);

  useEffect(() => {
    api.listAgents().then(a => { setAgents(a); setAgentsLoading(false); }).catch(() => setAgentsLoading(false));
  }, []);

  const loadAgents = useCallback(async () => {
    if (!agentAId || !agentBId) return;
    setLoading(true);
    try {
      const [a, b] = await Promise.all([api.getAgent(agentAId), api.getAgent(agentBId)]);
      setAgentA(a);
      setAgentB(b);
    } catch (err: any) {
      toast({ title: 'Error loading agents', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [agentAId, agentBId]);

  useEffect(() => {
    if (agentAId && agentBId) loadAgents();
  }, [agentAId, agentBId, loadAgents]);

  const permsA = new Set(agentA?.permissions?.map(p => p.scope) || []);
  const permsB = new Set(agentB?.permissions?.map(p => p.scope) || []);
  const allScopes = Array.from(new Set([...permsA, ...permsB])).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6 text-primary" /> Agent Compare
        </h1>
        <p className="text-muted-foreground">Compare two agents side-by-side with visual permission diff.</p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Agents</CardTitle>
          <CardDescription>Choose two agents to compare</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Agent A</Label>
              <Select value={agentAId} onValueChange={setAgentAId}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder={agentsLoading ? 'Loading...' : 'Select agent A'} />
                </SelectTrigger>
                <SelectContent>
                  {agents.filter(a => a.id !== agentBId).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Agent B</Label>
              <Select value={agentBId} onValueChange={setAgentBId}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder={agentsLoading ? 'Loading...' : 'Select agent B'} />
                </SelectTrigger>
                <SelectContent>
                  {agents.filter(a => a.id !== agentAId).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {agentA && agentB && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          {/* Side-by-side info cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {[
              { agent: agentA, label: 'A' },
              { agent: agentB, label: 'B' },
            ].map(({ agent, label }) => (
              <Card key={label} className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <RuntimeIcon runtime={agent.runtime} className="w-5 h-5" />
                      {agent.name}
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                      {label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Status</div>
                    <div><StatusBadge status={agent.status} /></div>
                    <div className="text-muted-foreground">Runtime</div>
                    <div className="font-mono text-xs">{agent.runtime}</div>
                    <div className="text-muted-foreground">Permissions</div>
                    <div className="font-mono">{agent.permissions?.length || 0}</div>
                    <div className="text-muted-foreground">Tokens</div>
                    <div className="font-mono">{agent.tokens?.filter(t => !t.revokedAt).length || 0}</div>
                    <div className="text-muted-foreground">Audit Events</div>
                    <div className="font-mono">{agent.auditEvents?.length || 0}</div>
                    <div className="text-muted-foreground">Created</div>
                    <div className="text-xs">{timeAgo(agent.createdAt)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Permission Diff */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Permission Diff
              </CardTitle>
              <CardDescription>
                <span className="inline-flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Matching</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Agent A only</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Agent B only</span>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allScopes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No permissions found for either agent.</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto">
                  {allScopes.map((scope, i) => {
                    const inA = permsA.has(scope);
                    const inB = permsB.has(scope);
                    let colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                    if (inA && !inB) colorClass = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
                    else if (!inA && inB) colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                    return (
                      <motion.div
                        key={scope}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.02, duration: 0.2 }}
                      >
                        <Badge variant="outline" className={`font-mono text-xs ${colorClass}`}>
                          {scope}
                          {inA && !inB && ' (A)'}
                          {!inA && inB && ' (B)'}
                        </Badge>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!agentA && !agentB && !loading && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Select two agents above to start comparing.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Activity Heatmap View ─────────────────────────────────────────────────────

function ActivityHeatmapView() {
  const [activityData, setActivityData] = useState<{
    days: { date: string; total: number; allow: number; deny: number; requiresApproval: number; other: number }[];
    agentActivity: Record<string, Record<string, number>>;
    period: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; total: number } | null>(null);

  useEffect(() => {
    api.getActivity().then(setActivityData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const days = activityData?.days || [];
  const maxTotal = Math.max(...days.map(d => d.total), 1);

  const getColor = (total: number) => {
    if (total === 0) return 'bg-border/10 border border-border/20';
    const ratio = total / maxTotal;
    if (ratio <= 0.25) return 'bg-primary/20 border border-primary/30';
    if (ratio <= 0.5) return 'bg-primary/40 border border-primary/50';
    if (ratio <= 0.75) return 'bg-primary/60 border border-primary/70';
    return 'bg-primary border border-primary';
  };

  // Arrange days into weeks (columns) for the heatmap
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const totalEvents = days.reduce((sum, d) => sum + d.total, 0);
  const totalAllow = days.reduce((sum, d) => sum + d.allow, 0);
  const totalDeny = days.reduce((sum, d) => sum + d.deny, 0);
  const totalApproval = days.reduce((sum, d) => sum + d.requiresApproval, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity Heatmap</h1>
        <p className="text-muted-foreground">30-day overview of authorization and audit events.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: totalEvents, icon: <Activity className="w-4 h-4 text-primary" />, color: 'text-foreground' },
          { label: 'Allowed', value: totalAllow, icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400' },
          { label: 'Denied', value: totalDeny, icon: <XCircle className="w-4 h-4 text-red-400" />, color: 'text-red-400' },
          { label: 'Requires Approval', value: totalApproval, icon: <AlertTriangle className="w-4 h-4 text-amber-400" />, color: 'text-amber-400' },
        ].map((stat, i) => (
          <motion.div key={i} variants={fadeInStagger} initial="initial" animate="animate" custom={i}>
            <Card className="bg-card/30 backdrop-blur-lg border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                  {stat.icon}
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Event Activity (30 Days)</CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="w-3 h-3 rounded-sm bg-border/10 border border-border/20" />
              <div className="w-3 h-3 rounded-sm bg-primary/20 border border-primary/30" />
              <div className="w-3 h-3 rounded-sm bg-primary/40 border border-primary/50" />
              <div className="w-3 h-3 rounded-sm bg-primary/60 border border-primary/70" />
              <div className="w-3 h-3 rounded-sm bg-primary border border-primary" />
              <span>More</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Day labels */}
            <div className="flex gap-0.5 mb-1 ml-0">
              <span className="text-[10px] text-muted-foreground w-10" />
              {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((label, i) => (
                <span key={i} className="text-[10px] text-muted-foreground h-3 w-3 flex items-center justify-center">{label}</span>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-1 overflow-x-auto pb-2">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {week.map((day, di) => (
                    <TooltipProvider key={di}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div
                            className={`w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-primary/50 ${getColor(day.total)}`}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: wi * 0.03 + di * 0.02, duration: 0.2 }}
                            onMouseEnter={() => setHoveredDay(day)}
                            onMouseLeave={() => setHoveredDay(null)}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-popover border-border">
                          <div className="text-xs">
                            <div className="font-semibold">{day.date}</div>
                            <div className="text-muted-foreground">{day.total} event{day.total !== 1 ? 's' : ''}</div>
                            {day.total > 0 && (
                              <div className="flex gap-2 mt-1">
                                <span className="text-emerald-400">{day.allow} allow</span>
                                <span className="text-red-400">{day.deny} deny</span>
                                <span className="text-amber-400">{day.requiresApproval} approval</span>
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              ))}
            </div>

            {/* Hover detail */}
            {hoveredDay && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 rounded-lg bg-secondary/30 border border-border/30 text-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-mono font-semibold">{hoveredDay.date}</span>
                  </div>
                  <span className="text-muted-foreground">{hoveredDay.total} event{hoveredDay.total !== 1 ? 's' : ''}</span>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Trend Bar Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daily Event Breakdown</CardTitle>
          <CardDescription>Allow, deny, and requires approval counts per day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: string) => v.slice(5)}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="allow" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} name="Allow" />
                <Bar dataKey="deny" stackId="a" fill="#f87171" radius={[0, 0, 0, 0]} name="Deny" />
                <Bar dataKey="requiresApproval" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Requires Approval" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Quick Setup Wizard ────────────────────────────────────────────────────────

function QuickSetupWizard({ open, onOpenChange, onComplete }: { open: boolean; onOpenChange: (open: boolean) => void; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [agentName, setAgentName] = useState('');
  const [agentRuntime, setAgentRuntime] = useState('hermes');
  const [agentDescription, setAgentDescription] = useState('');
  const [permissionTemplate, setPermissionTemplate] = useState('observer');
  const [tokenTTL, setTokenTTL] = useState('3600');
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [stepStatus, setStepStatus] = useState<('pending' | 'running' | 'done' | 'error')[]>(['pending', 'pending', 'pending']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reset = () => {
    setStep(0);
    setAgentName('');
    setAgentRuntime('hermes');
    setAgentDescription('');
    setPermissionTemplate('observer');
    setTokenTTL('3600');
    setCreatedAgentId(null);
    setCreatedToken(null);
    setStepStatus(['pending', 'pending', 'pending']);
    setErrorMsg(null);
  };

  const runStep = async (stepIndex: number) => {
    const newStatus = [...stepStatus];
    newStatus[stepIndex] = 'running';
    setStepStatus(newStatus);
    setErrorMsg(null);

    try {
      if (stepIndex === 0) {
        // Create Agent
        const agent = await api.createAgent({ name: agentName, runtime: agentRuntime, description: agentDescription || undefined });
        setCreatedAgentId(agent.id);
      } else if (stepIndex === 1) {
        // Grant Permissions from template
        const template = PERMISSION_TEMPLATES.find(t => t.id === permissionTemplate);
        if (template && createdAgentId) {
          for (const scope of template.scopes.slice(0, 3)) {
            await api.grantPermission(createdAgentId, { scope, effect: 'ALLOW' });
          }
        }
      } else if (stepIndex === 2) {
        // Issue Token
        if (createdAgentId) {
          const template = PERMISSION_TEMPLATES.find(t => t.id === permissionTemplate);
          const result = await api.issueToken({
            agentId: createdAgentId,
            scopes: template?.scopes.slice(0, 3) || ['github.repo.read'],
            ttlSeconds: parseInt(tokenTTL),
          });
          setCreatedToken(result.token);
        }
      }

      const newStatus2 = [...stepStatus];
      newStatus2[stepIndex] = 'done';
      setStepStatus(newStatus2);

      if (stepIndex < 2) {
        setStep(stepIndex + 1);
      }
    } catch (err: any) {
      const newStatus3 = [...stepStatus];
      newStatus3[stepIndex] = 'error';
      setStepStatus(newStatus3);
      setErrorMsg(err.message || 'An error occurred');
    }
  };

  const stepLabels = ['Create Agent', 'Grant Permissions', 'Issue Token'];
  const stepIcons = [<Bot key="bot" className="w-4 h-4" />, <Shield key="shield" className="w-4 h-4" />, <Key key="key" className="w-4 h-4" />];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Quick Setup Wizard
          </DialogTitle>
          <DialogDescription>Create an agent, grant permissions, and issue a token in 3 steps.</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 py-4">
          {stepLabels.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                  stepStatus[i] === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' :
                  stepStatus[i] === 'running' ? 'bg-primary border-primary text-primary-foreground animate-pulse' :
                  stepStatus[i] === 'error' ? 'bg-red-500 border-red-500 text-white' :
                  i === step ? 'bg-primary/20 border-primary text-primary' :
                  'bg-secondary border-border text-muted-foreground'
                }`}>
                  {stepStatus[i] === 'done' ? <CheckCircle2 className="w-4 h-4" /> :
                   stepStatus[i] === 'error' ? <XCircle className="w-4 h-4" /> :
                   stepIcons[i]}
                </div>
                <span className={`text-[10px] ${i === step ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{label}</span>
              </div>
              {i < 2 && (
                <div className={`w-12 h-0.5 mx-1 mb-4 transition-colors ${
                  stepStatus[i] === 'done' ? 'bg-emerald-500' : 'bg-border'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-4 min-h-[180px]">
          {step === 0 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <div>
                <Label className="text-xs">Agent Name</Label>
                <Input placeholder="my-agent" value={agentName} onChange={e => setAgentName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Runtime</Label>
                <Select value={agentRuntime} onValueChange={setAgentRuntime}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hermes">Hermes</SelectItem>
                    <SelectItem value="codex">Codex</SelectItem>
                    <SelectItem value="openclaw">OpenClaw</SelectItem>
                    <SelectItem value="cli">CLI</SelectItem>
                    <SelectItem value="automation">Automation</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Description (optional)</Label>
                <Input placeholder="What does this agent do?" value={agentDescription} onChange={e => setAgentDescription(e.target.value)} className="mt-1" />
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <div>
                <Label className="text-xs">Permission Template</Label>
                <Select value={permissionTemplate} onValueChange={setPermissionTemplate}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERMISSION_TEMPLATES.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} — {t.scopes.length} scopes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {PERMISSION_TEMPLATES.find(t => t.id === permissionTemplate) && (
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <div className="text-xs font-semibold mb-1.5">{PERMISSION_TEMPLATES.find(t => t.id === permissionTemplate)?.name}</div>
                  <div className="text-xs text-muted-foreground mb-2">{PERMISSION_TEMPLATES.find(t => t.id === permissionTemplate)?.description}</div>
                  <div className="flex flex-wrap gap-1">
                    {PERMISSION_TEMPLATES.find(t => t.id === permissionTemplate)?.scopes.slice(0, 5).map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] font-mono bg-primary/10 text-primary">{s}</Badge>
                    ))}
                    {(PERMISSION_TEMPLATES.find(t => t.id === permissionTemplate)?.scopes.length || 0) > 5 && (
                      <Badge variant="secondary" className="text-[10px]">+{(PERMISSION_TEMPLATES.find(t => t.id === permissionTemplate)?.scopes.length || 0) - 5} more</Badge>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <div>
                <Label className="text-xs">Token TTL (Time to Live)</Label>
                <Select value={tokenTTL} onValueChange={setTokenTTL}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3600">1 Hour</SelectItem>
                    <SelectItem value="21600">6 Hours</SelectItem>
                    <SelectItem value="86400">24 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {createdToken && (
                <Alert className="border-emerald-500/30 bg-emerald-500/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <AlertTitle className="text-emerald-400 text-xs">Token Issued!</AlertTitle>
                  <AlertDescription className="text-xs font-mono break-all mt-1">{createdToken}</AlertDescription>
                </Alert>
              )}
            </motion.div>
          )}
        </div>

        {/* Error */}
        {errorMsg && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {/* Footer Buttons */}
        <DialogFooter className="flex gap-2">
          {stepStatus[step] === 'done' && step === 2 ? (
            <Button className="bg-primary text-primary-foreground" onClick={() => { reset(); onOpenChange(false); onComplete(); }}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Done
            </Button>
          ) : (
            <Button
              className="bg-primary text-primary-foreground"
              disabled={stepStatus[step] === 'running' || (step === 0 && !agentName.trim())}
              onClick={() => runStep(step)}
            >
              {stepStatus[step] === 'running' ? (
                <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Running...</>
              ) : (
                <>{step === 2 ? 'Issue Token' : 'Next'} <ArrowRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Security Events Feed View ──────────────────────────────────────────────

interface SSEEvent {
  id: string;
  eventType: string;
  actorType: string;
  actorId: string | null;
  agentId: string | null;
  resource: string | null;
  action: string | null;
  decision: string | null;
  metadata: string | null;
  previousHash: string | null;
  eventHash: string;
  createdAt: string;
}

function SecurityEventsView() {
  const { navigateToAgent } = useAppStore();
  const [liveEvents, setLiveEvents] = useState<SSEEvent[]>([]);
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [missedCount, setMissedCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [agents, setAgents] = useState<Agent[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const missedBufferRef = useRef<SSEEvent[]>([]);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Load agents for name lookup
  useEffect(() => {
    api.listAgents().then(setAgents).catch(console.error);
  }, []);

  // Load recent events via REST
  useEffect(() => {
    api.getAuditEvents({ limit: 50 }).then(setRecentEvents).catch(console.error);
  }, []);

  // SSE connection
  useEffect(() => {
    let es: EventSource | null = null;

    const connect = () => {
      setConnectionStatus('reconnecting');
      es = new EventSource('/api/events/stream');

      es.onopen = () => {
        setConnectionStatus('connected');
      };

      es.onerror = () => {
        setConnectionStatus('disconnected');
        es?.close();
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      es.addEventListener('initial', (e) => {
        try {
          const events: SSEEvent[] = JSON.parse(e.data);
          setLiveEvents(events.slice(0, 50));
        } catch { /* ignore parse errors */ }
      });

      es.addEventListener('security-event', (e) => {
        try {
          const event: SSEEvent = JSON.parse(e.data);
          if (pausedRef.current) {
            missedBufferRef.current.push(event);
            setMissedCount(prev => prev + 1);
          } else {
            setLiveEvents(prev => [event, ...prev].slice(0, 100));
          }
        } catch { /* ignore parse errors */ }
      });
    };

    connect();

    return () => {
      es?.close();
    };
  }, []);

  // Auto-scroll to top on new event
  useEffect(() => {
    if (!paused && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [liveEvents, paused]);

  const handleResume = () => {
    if (missedBufferRef.current.length > 0) {
      setLiveEvents(prev => [...missedBufferRef.current.reverse(), ...prev].slice(0, 100));
      missedBufferRef.current = [];
    }
    setMissedCount(0);
    setPaused(false);
  };

  const agentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of agents) { map[a.id] = a.name; }
    return map;
  }, [agents]);

  const eventTypeIcons: Record<string, React.ReactNode> = {
    PERMISSION_GRANTED: <ShieldCheck className="w-3.5 h-3.5 text-primary" />,
    PERMISSION_REVOKED: <ShieldX className="w-3.5 h-3.5 text-red-400" />,
    AUTHORIZATION_CHECK: <Shield className="w-3.5 h-3.5 text-primary" />,
    AGENT_CREATED: <Plus className="w-3.5 h-3.5 text-emerald-400" />,
    AGENT_REVOKED: <Ban className="w-3.5 h-3.5 text-red-400" />,
    AGENT_PAUSED: <Pause className="w-3.5 h-3.5 text-amber-400" />,
    AGENT_RESUMED: <Play className="w-3.5 h-3.5 text-emerald-400" />,
    KEY_ROTATED: <RotateCcw className="w-3.5 h-3.5 text-primary" />,
    TOKEN_ISSUED: <Key className="w-3.5 h-3.5 text-amber-400" />,
    TOKEN_REVOKED: <Trash2 className="w-3.5 h-3.5 text-red-400" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Events Feed</h1>
          <p className="text-muted-foreground">Real-time security event monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-card/50">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
              connectionStatus === 'reconnecting' ? 'bg-amber-400 animate-pulse' :
              'bg-red-400'
            }`} />
            <span className={`text-xs font-mono ${
              connectionStatus === 'connected' ? 'text-emerald-400' :
              connectionStatus === 'reconnecting' ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {connectionStatus === 'connected' ? 'LIVE' : connectionStatus === 'reconnecting' ? 'RECONNECTING' : 'DISCONNECTED'}
            </span>
          </div>
          {paused && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10"
            >
              <span className="text-xs font-mono text-amber-400">PAUSED</span>
              {missedCount > 0 && (
                <Badge variant="outline" className="text-xs bg-amber-500/15 text-amber-400 border-amber-500/30">
                  {missedCount} missed
                </Badge>
              )}
            </motion.div>
          )}
          <Button
            variant={paused ? 'default' : 'outline'}
            size="sm"
            onClick={paused ? handleResume : () => setPaused(true)}
          >
            {paused ? <><Play className="w-4 h-4 mr-1" /> Resume</> : <><Pause className="w-4 h-4 mr-1" /> Pause</>}
          </Button>
        </div>
      </div>

      {/* Live Feed */}
      <Card className="bg-card/30 backdrop-blur-lg border-border/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary" /> Live Feed
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">{liveEvents.length} events</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={feedRef} className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-2">
            {liveEvents.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Waiting for events...</p>
                <p className="text-xs text-muted-foreground/60 mt-1">New security events will appear here in real-time</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {liveEvents.map((event, i) => (
                  <motion.div
                    key={`${event.id}-${i}`}
                    initial={{ opacity: 0, y: -20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-card/50 hover:border-primary/20 transition-colors"
                  >
                    <div className="shrink-0 mt-0.5">
                      {eventTypeIcons[event.eventType] || <Activity className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(event.createdAt).toLocaleTimeString()}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono bg-primary/5 border-primary/20">
                          {event.eventType.replace(/_/g, ' ')}
                        </Badge>
                        {event.decision && <DecisionBadge decision={event.decision} />}
                        {event.agentId && (
                          <button
                            className="text-xs font-mono text-primary hover:underline"
                            onClick={() => navigateToAgent(event.agentId!)}
                          >
                            {agentNameMap[event.agentId] || event.agentId.slice(0, 8)}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {event.action || 'System event'}{event.resource ? ` · ${event.resource}` : ''}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Events via REST */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-primary" /> Recent Events (Last 50)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.map(e => (
                  <TableRow key={e.id} className={e.decision === 'allow' ? 'bg-emerald-500/[0.02]' : e.decision === 'deny' ? 'bg-red-500/[0.02]' : e.decision === 'requires_approval' ? 'bg-amber-500/[0.02]' : ''}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(e.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{e.eventType.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.agentId ? (
                        <button className="text-primary hover:underline" onClick={() => navigateToAgent(e.agentId!)}>
                          {agentNameMap[e.agentId] || e.agentId.slice(0, 8)}
                        </button>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.action || '-'}</TableCell>
                    <TableCell>{e.decision ? <DecisionBadge decision={e.decision} /> : '-'}</TableCell>
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

export default function AgentDNAIApp() {
  const { currentView, setView } = useAppStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Mobile bottom nav items (5 most important)
  const mobileNavItems = [
    { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Home' },
    { id: 'agents' as const, icon: Bot, label: 'Agents' },
    { id: 'security-events' as const, icon: Radio, label: 'Live' },
    { id: 'audit' as const, icon: ScrollText, label: 'Audit' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <AnimatePresence mode="wait">
      {currentView === 'home' ? (
        <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4, ease: 'easeInOut' }}>
          <LandingPage />
        </motion.div>
      ) : (
        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-screen flex flex-col md:flex-row">
          <DashboardSidebar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar pb-20 md:pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {currentView === 'dashboard' && <DashboardView />}
                {currentView === 'agents' && <AgentsView />}
                {currentView === 'agent-detail' && <AgentDetailView />}
                {currentView === 'audit' && <AuditView />}
                {currentView === 'tokens' && <TokensView />}
                {currentView === 'policies' && <PoliciesView />}
                {currentView === 'settings' && <SettingsView />}
                {currentView === 'docs' && <DocsView />}
                {currentView === 'playground' && <PlaygroundView />}
                {currentView === 'agent-compare' && <AgentCompareView />}
                {currentView === 'activity-heatmap' && <ActivityHeatmapView />}
                {currentView === 'security-events' && <SecurityEventsView />}
              </motion.div>
            </AnimatePresence>
          </main>
          {/* Mobile Bottom Navigation */}
          {isMobile && (
            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-xl flex items-center justify-around h-16 px-2 safe-area-bottom">
              {mobileNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                    currentView === item.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
