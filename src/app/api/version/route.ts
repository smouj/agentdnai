/**
 * Version API
 *
 * GET /api/version - Version endpoint
 *
 * No auth required.
 * Returns version, name, and description of the platform.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: '0.2.0-alpha',
    name: 'AgentDNAI',
    description: 'Verifiable Digital Identity for AI Agents',
  });
}
