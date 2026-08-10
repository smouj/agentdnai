# AgentDNAI Interface System (AIS)

AgentDNAI should feel like an infrastructure-grade security console for
autonomous agents: precise, technical, sober, traceable and fast. It should not
look like a generic SaaS dashboard or a neon cyberpunk AI site.

## Product Direction

**Infrastructure-grade security console for autonomous agents.**

The application blends the discipline of an IAM console, the density of an
infrastructure control plane and the auditability of an observability tool.

Core traits:

- precise;
- technical;
- sober;
- dense when needed;
- legible;
- institutional;
- modern.

Avoid:

- excessive glassmorphism;
- rainbow gradients;
- hacker neon;
- decorative floating cards;
- giant radii;
- decorative icons;
- constant animation.

## Color System

Dark mode is the primary product mode.

| Token | Color | Use |
|---|---:|---|
| `--adnai-canvas` | `#090A0D` | App background |
| `--adnai-surface-1` | `#0F1115` | Sidebar/topbar |
| `--adnai-surface-2` | `#15181E` | Main surfaces |
| `--adnai-surface-3` | `#1B1F27` | Elevated controls |
| `--adnai-surface-hover` | `#222730` | Hover state |
| `--adnai-border` | `#2A303A` | Dividers |
| `--adnai-border-strong` | `#3A414D` | Strong separators |
| `--adnai-text` | `#F1F3F5` | Primary text |
| `--adnai-text-secondary` | `#A3A9B3` | Secondary text |
| `--adnai-text-tertiary` | `#707782` | Metadata |
| `--adnai-brand` | `#C62E55` | AgentDNAI Crimson |
| `--adnai-brand-hover` | `#DC3A65` | Primary hover |
| `--adnai-brand-soft` | `#C62E5518` | Active backgrounds |
| `--adnai-brand-border` | `#C62E5555` | Selected borders |

Crimson is brand signal, not generic danger. It should appear in:

- active navigation line;
- primary button;
- focus ring;
- active link;
- selection;
- agent identity highlights;
- subtle accent borders;
- AgentDNAI-specific cryptographic surfaces.

It should not fill entire cards or represent DENY/error by default.

## Semantic States

| State | Color |
|---|---:|
| Operational / Allowed | `#3FBF7F` |
| Information | `#5794F2` |
| Pending / Approval | `#E4A853` |
| Elevated risk | `#EF7D4D` |
| Denied / Error | `#E2525C` |
| Critical | `#FF3E4D` |
| Revoked / Disabled | `#737A86` |

Badges must never depend on color alone. Always include icon/text:

- `ACTIVE`, `PAUSED`, `REVOKED`;
- `ALLOW`, `DENY`, `APPROVAL`;
- `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

## Geometry

Use semi-industrial geometry:

| Element | Radius |
|---|---:|
| Badge | `3px` |
| Button / Input / Card | `4px` |
| Panel / Popover | `6px` |
| Modal | `8px` |

Do not use global `0px` radius and do not use large SaaS radii.

## Application Shell

The authenticated app should be a persistent control plane:

- sidebar: `232-248px` expanded, `64px` collapsed;
- topbar: `56px`;
- main area: dense, table-first where data scales;
- right inspector drawer: `420-520px` for object inspection.

Sidebar groups:

- Workspace: Overview, Agents, Policies, Tokens, Approvals, Audit;
- Infrastructure: API Keys, Webhooks, Integrations;
- Organization: Members, Organizations;
- System: Settings, Documentation.

Active item:

- 2px crimson left line;
- `brand-soft` background;
- white text;
- no full crimson blocks.

## Primitives

AIS should introduce reusable primitives before more visual redesign:

- `Surface`: neutral container;
- `Section`: functional block with header/body;
- `Metric`: compact dashboard metric, no giant icon;
- `Inspector`: right-side object inspection panel;
- `CommandPanel`: darker monospace surface for payloads, JSON, policy testing.

Avoid turning every area into a shadcn `Card`. Use lines, spacing and grouped
sections for professional density.

## Screen Direction

Agents should become table-first:

| Column | Purpose |
|---|---|
| Agent | name + short identifier |
| Runtime | Codex, OpenClaw, automation, custom |
| Environment | development, staging, production |
| Permissions | effective permission count |
| Tokens | active/expired count |
| Risk | explainable risk level |
| Status | lifecycle state |
| Last activity | latest action timestamp |

Agent detail should emphasize identity:

- agent URI and fingerprint in Geist Mono;
- status/risk header;
- tabs for Overview, Permissions, Credentials, Tokens, Audit and Risk;
- Effective Access section with ALLOW/DENY/APPROVAL states.

Audit should support both table and timeline views, with a right event
inspector showing decision, agent, action, matched policy, hash and previous
hash.

Tokens and approvals are security-sensitive workflows. They need restrained
modals/drawers, explicit copy, no confetti and no oversized success graphics.

## Typography

Use Geist Sans for interface text and Geist Mono only for:

- agent IDs;
- token IDs;
- hashes;
- fingerprints;
- permission names;
- URLs;
- precise timestamps;
- API/code.

Recommended scale:

| Role | Size / Line Height / Weight |
|---|---|
| Page title | `24 / 30 / 600` |
| Section title | `16 / 24 / 600` |
| Body | `14 / 21 / 400` |
| Label | `13 / 18 / 500` |
| Caption | `12 / 16 / 400` |
| Micro | `11 / 14 / 500` |

## Motion

Use motion sparingly:

- hover: `120ms`;
- popover: `140ms`;
- drawer: `180-220ms`;
- modal: `180ms`;
- page: `160-200ms`.

Keep iridescent effects out of the operational interface. Reserve them for:

- landing;
- login;
- onboarding;
- selected identity surfaces;
- subtle cryptographic highlights.

## Implementation Order

1. Design tokens and palette.
2. AppShell, Sidebar and Topbar.
3. Surface, Section, Metric and Inspector.
4. Button, Input, Select, Badge, Tooltip and Toast.
5. Dialog, Drawer and Popover.
6. Agents and Agent Detail.
7. Permissions and Policy Builder.
8. Tokens and Approvals.
9. Audit and Risk.
10. Dashboard.
11. Landing/login alignment.
12. Split the large `src/app/page.tsx` into reusable components.

This document is the visual contract for future UI work. Code should move
toward these primitives without breaking existing flows.
