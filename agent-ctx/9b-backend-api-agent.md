# Task 9b - Agent Risk Scoring + JSON Export/Import API

## Agent: Backend API Agent
## Task: Add Agent Risk Scoring backend + JSON Export/Import API endpoints

## Work Completed

### 1. Agent Risk Score API
- Created `/src/app/api/agents/[id]/risk/route.ts`
- GET endpoint computes risk score (0-100) based on 7 factors:
  - Agent Status: REVOKED/BLOCKED = +30, PAUSED = +15, ACTIVE = 0
  - Permission Count: >20 = +20, >10 = +10
  - High-Risk Scopes: production.*, secrets.*, server.command.* = +5 each
  - DENY Permissions: each +3
  - REQUIRES_APPROVAL Permissions: each +2
  - Active Tokens: each +2
  - Expired Tokens Not Revoked: each +5
- Returns: `{ agentId, riskScore, riskLevel, factors: [{name, impact, description}] }`
- riskLevel: 'low' (0-25), 'medium' (26-50), 'high' (51-75), 'critical' (76-100)
- Score capped at 100

### 2. JSON Export API
- Created `/src/app/api/export/route.ts`
- GET endpoint exports all platform data as JSON download
- Includes: all agents (with permissions, tokens, owner), all audit events, all authorization decisions, stats summary
- Returns with Content-Disposition header for download
- Stats include: totalAgents, activeAgents, pausedAgents, revokedAgents, blockedAgents, totalPermissions, activeTokens, expiredUnrevokedTokens, totalAuditEvents, totalAuthorizationDecisions

### 3. JSON Import API
- Created `/src/app/api/import/route.ts`
- POST endpoint imports data from JSON (same format as export)
- Validates structure before processing (checks agents array exists)
- Creates agents, permissions, tokens from imported data
- Skips existing agents (by agentUri)
- Resolves/creates owner users from imported owner data
- Falls back to default@agentdnai.io user if no owner specified
- Returns: `{ imported: {agents, permissions, tokens}, skipped: {agents}, errors: [] }`
- Handles individual item errors gracefully without stopping entire import
- Validates required fields (agentUri, name, runtime, publicKey)

### 4. API Client Updates
- Updated `/src/lib/api-client.ts`:
  - Added `apiFetchBlob()` helper function for Blob responses
  - Added `getAgentRisk(id)` method → returns risk score object
  - Added `exportData()` method → returns Blob for download
  - Added `importData(data)` method → returns import results

## Testing Results
- All 3 endpoints tested via curl with real data:
  - Risk score: Returns correct factors and levels (e.g., REVOKED agent = 30/medium, hermes-auditor with high-risk scopes + expired tokens = 29/medium)
  - Export: Returns complete JSON with 5 agents, 18 audit events, 11 authz decisions, stats
  - Import: Successfully imported 1 new agent with 2 permissions and 1 token, correctly skipped 1 existing agent
- Error handling verified: 404 for non-existent agent, 400 for invalid import structure
- Content-Disposition header verified: `attachment; filename="agentdnai-export-2026-05-30.json"`
- All lint checks pass (0 errors, 0 warnings)
