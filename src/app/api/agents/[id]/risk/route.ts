import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/agents/[id]/risk - Compute risk score for an agent
 *
 * Risk factors:
 *   - Status: REVOKED/BLOCKED = +30, PAUSED = +15, ACTIVE = 0
 *   - Permission count: >10 = +10, >20 = +20
 *   - High-risk scopes: production.*, secrets.*, server.command.* = +5 each
 *   - DENY permissions: each +3
 *   - REQUIRES_APPROVAL permissions: each +2
 *   - Active tokens: each +2
 *   - Expired tokens not revoked: each +5
 *
 * Risk levels: low (0-25), medium (26-50), high (51-75), critical (76-100)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const agent = await db.agentIdentity.findUnique({
      where: { id },
      include: {
        permissions: true,
        tokens: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const factors: { name: string; impact: number; description: string }[] = [];
    let riskScore = 0;

    // ── Status risk ──────────────────────────────────────────────────────────
    const statusUpper = agent.status.toUpperCase();
    if (statusUpper === 'REVOKED' || statusUpper === 'BLOCKED') {
      const impact = 30;
      riskScore += impact;
      factors.push({
        name: 'Agent Status',
        impact,
        description: `Agent is ${statusUpper}, indicating it has been flagged or disabled`,
      });
    } else if (statusUpper === 'PAUSED') {
      const impact = 15;
      riskScore += impact;
      factors.push({
        name: 'Agent Status',
        impact,
        description: 'Agent is PAUSED, which may indicate a temporary suspension',
      });
    } else {
      factors.push({
        name: 'Agent Status',
        impact: 0,
        description: 'Agent is ACTIVE with no status-related risk',
      });
    }

    // ── Permission count risk ────────────────────────────────────────────────
    const permCount = agent.permissions.length;
    if (permCount > 20) {
      const impact = 20;
      riskScore += impact;
      factors.push({
        name: 'High Permission Count',
        impact,
        description: `Agent has ${permCount} permissions (>20), increasing attack surface`,
      });
    } else if (permCount > 10) {
      const impact = 10;
      riskScore += impact;
      factors.push({
        name: 'Elevated Permission Count',
        impact,
        description: `Agent has ${permCount} permissions (>10), moderate attack surface`,
      });
    } else {
      factors.push({
        name: 'Permission Count',
        impact: 0,
        description: `Agent has ${permCount} permissions, within acceptable range`,
      });
    }

    // ── High-risk scopes ─────────────────────────────────────────────────────
    const highRiskPatterns = ['production.', 'secrets.', 'server.command.'];
    const highRiskPermissions = agent.permissions.filter((p) =>
      highRiskPatterns.some((pattern) => p.scope.startsWith(pattern))
    );
    const highRiskCount = highRiskPermissions.length;
    if (highRiskCount > 0) {
      const impact = highRiskCount * 5;
      riskScore += impact;
      const scopes = [...new Set(highRiskPermissions.map((p) => p.scope))];
      factors.push({
        name: 'High-Risk Scopes',
        impact,
        description: `${highRiskCount} permission(s) with high-risk scopes: ${scopes.join(', ')}`,
      });
    } else {
      factors.push({
        name: 'High-Risk Scopes',
        impact: 0,
        description: 'No high-risk scopes (production.*, secrets.*, server.command.*) detected',
      });
    }

    // ── DENY permissions ─────────────────────────────────────────────────────
    const denyPermissions = agent.permissions.filter((p) => p.effect === 'DENY');
    const denyCount = denyPermissions.length;
    if (denyCount > 0) {
      const impact = denyCount * 3;
      riskScore += impact;
      factors.push({
        name: 'DENY Permissions',
        impact,
        description: `${denyCount} DENY permission(s) indicate restricted or conflicted access`,
      });
    } else {
      factors.push({
        name: 'DENY Permissions',
        impact: 0,
        description: 'No DENY permissions present',
      });
    }

    // ── REQUIRES_APPROVAL permissions ────────────────────────────────────────
    const approvalPermissions = agent.permissions.filter(
      (p) => p.effect === 'REQUIRES_APPROVAL'
    );
    const approvalCount = approvalPermissions.length;
    if (approvalCount > 0) {
      const impact = approvalCount * 2;
      riskScore += impact;
      factors.push({
        name: 'REQUIRES_APPROVAL Permissions',
        impact,
        description: `${approvalCount} permission(s) require human approval, indicating sensitive access`,
      });
    } else {
      factors.push({
        name: 'REQUIRES_APPROVAL Permissions',
        impact: 0,
        description: 'No REQUIRES_APPROVAL permissions present',
      });
    }

    // ── Active tokens risk ───────────────────────────────────────────────────
    const now = new Date();
    const activeTokens = agent.tokens.filter(
      (t) => t.revokedAt === null && new Date(t.expiresAt) > now
    );
    const activeTokenCount = activeTokens.length;
    if (activeTokenCount > 0) {
      const impact = activeTokenCount * 2;
      riskScore += impact;
      factors.push({
        name: 'Active Tokens',
        impact,
        description: `${activeTokenCount} active token(s) increase credential exposure`,
      });
    } else {
      factors.push({
        name: 'Active Tokens',
        impact: 0,
        description: 'No active tokens',
      });
    }

    // ── Expired tokens not revoked ───────────────────────────────────────────
    const expiredNotRevoked = agent.tokens.filter(
      (t) => t.revokedAt === null && new Date(t.expiresAt) <= now
    );
    const expiredCount = expiredNotRevoked.length;
    if (expiredCount > 0) {
      const impact = expiredCount * 5;
      riskScore += impact;
      factors.push({
        name: 'Expired Tokens Not Revoked',
        impact,
        description: `${expiredCount} expired token(s) have not been revoked, potential cleanup issue`,
      });
    } else {
      factors.push({
        name: 'Expired Tokens Not Revoked',
        impact: 0,
        description: 'No expired unrevoked tokens',
      });
    }

    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    // Determine risk level
    let riskLevel: string;
    if (riskScore <= 25) {
      riskLevel = 'low';
    } else if (riskScore <= 50) {
      riskLevel = 'medium';
    } else if (riskScore <= 75) {
      riskLevel = 'high';
    } else {
      riskLevel = 'critical';
    }

    return NextResponse.json({
      agentId: id,
      riskScore,
      riskLevel,
      factors,
    });
  } catch (error) {
    console.error('Error computing risk score:', error);
    return NextResponse.json(
      { error: 'Failed to compute risk score' },
      { status: 500 }
    );
  }
}
