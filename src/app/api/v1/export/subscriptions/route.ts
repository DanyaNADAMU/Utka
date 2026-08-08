import { NextResponse, NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

import { getSettings } from '@/lib/settings';

// Helper to validate Bearer or X-Service-Token header
async function validateAuth(req: NextRequest): Promise<boolean> {
  const settings = await getSettings();
  const serviceTokens = (settings.SERVICE_TOKENS || process.env.SERVICE_TOKENS || process.env.API_SERVICE_TOKEN || '')
    .split(/[\n,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (serviceTokens.length === 0) {
    return true; // Open access if no service tokens configured
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('x-service-token');
  if (!authHeader) return false;

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  return serviceTokens.includes(token);
}

export async function GET(req: NextRequest) {
  if (!(await validateAuth(req))) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized service token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const subscriptions = await db.subscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        inbounds: {
          select: {
            xrayUuid: true,
          },
        },
        uuidHistory: {
          select: {
            xrayUuid: true,
          },
        },
      },
    });

    const formatted = subscriptions.map((sub) => {
      const uuidSet = new Set<string>();
      sub.inbounds.forEach((i) => uuidSet.add(i.xrayUuid));
      sub.uuidHistory.forEach((h) => uuidSet.add(h.xrayUuid));

      return {
        id: sub.id,
        name: sub.name || 'Default Device',
        userId: sub.userId,
        userName: sub.user.name || null,
        userEmail: sub.user.email || null,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        uuids: Array.from(uuidSet),
      };
    });

    return NextResponse.json({ subscriptions: formatted });
  } catch (err: any) {
    console.error('[Export Subscriptions API Error]:', err);
    return new NextResponse(JSON.stringify({ error: 'Failed to export subscriptions', message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
