import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeId, config } = body;

    if (!nodeId || !config) {
      return NextResponse.json({ error: 'Missing nodeId or config' }, { status: 400 });
    }

    // Extract Bearer token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Find node and verify token matches adminUuid
    const node = await db.node.findUnique({
      where: { id: nodeId }
    });

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const expectedToken = `${node.adminUuid}${node.id}`;
    if (expectedToken !== token) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 403 });
    }

    if (!config || typeof config !== 'string') {
      return NextResponse.json({ error: 'Config missing or invalid format (expected text)' }, { status: 400 });
    }

    // Update node with the received config
    await db.node.update({
      where: { id: nodeId },
      data: {
        xrayConfig: config,
      }
    });

    return NextResponse.json({ success: true, message: 'Node config updated successfully' });
  } catch (error: any) {
    console.error('Error reporting node config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
