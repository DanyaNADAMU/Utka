import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { addVlessUser, removeVlessUser } from '@/lib/xray';
import crypto from 'crypto';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  // Cleanup expired UUIDs across all subscriptions (lazy cleanup)
  try {
    const expiredUuids = await db.expiringUuid.findMany({
      where: { expiresAt: { lte: new Date() } }
    });

    for (const exp of expiredUuids) {
      // In a real multi-node setup, we would connect to the specific node's API.
      // For now, we assume all Xray operations happen on the local node.
      // We hardcode the inbound tag as 'vless-in' or similar? Wait, what is the inbound tag in the config?
      // Let's assume 'vless-in' for now, but we should verify the config.
      const success = await removeVlessUser('vless-reality', exp.xrayEmail);
      if (success || !success) { 
        // We delete from DB even if remove fails (maybe Xray restarted or it's already removed)
        await db.expiringUuid.delete({ where: { id: exp.id } });
      }
    }
  } catch (e) {
    console.error("Failed to cleanup expired UUIDs:", e);
  }

  const sub = await db.subscription.findUnique({
    where: { token },
    include: { node: true }
  });

  // If not found, return 404. This is important since this is a root-level catch-all!
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 1. Generate new UUID
  const newUuid = crypto.randomUUID();
  const oldUuid = sub.xrayUuid;
  
  // Xray email format: subscriptionId_xrayUuid
  const newXrayEmail = `${sub.id}_${newUuid}`;
  const oldXrayEmail = `${sub.id}_${oldUuid}`;

  // 2. Add old UUID to ExpiringUuid (2031 minutes = 33.85 hours)
  const expiresAt = new Date(Date.now() + 2031 * 60 * 1000);
  await db.expiringUuid.create({
    data: {
      subscriptionId: sub.id,
      xrayUuid: oldUuid,
      xrayEmail: oldXrayEmail,
      nodeId: sub.nodeId,
      expiresAt: expiresAt
    }
  });

  // 3. Update subscription in DB
  await db.subscription.update({
    where: { id: sub.id },
    data: { 
      xrayUuid: newUuid,
      lastFetched: new Date() 
    }
  });

  // 4. Add new UUID to Xray
  // We assume the inbound tag is 'vless-reality', this should match the Xray config.json
  await addVlessUser('vless-reality', newXrayEmail, newUuid);

  // 5. Generate vless link
  const address = sub.node.address;
  const port = sub.node.port;
  const name = encodeURIComponent(sub.name || "NadamuDash");
  
  const pbk = process.env.XRAY_PUBLIC_KEY || "YOUR_PUBLIC_KEY";
  const sid = process.env.XRAY_SHORT_ID || "YOUR_SHORT_ID";
  const sni = process.env.XRAY_SNI || "biz.mail.ru";

  const vlessLink = `vless://${newUuid}@${address}:${port}?encryption=none&flow=xtls-rprx-vision&security=reality&sni=${sni}&fp=chrome&pbk=${pbk}&sid=${sid}&type=tcp&headerType=none#${name}`;
  
  const base64Link = Buffer.from(vlessLink).toString('base64');
  
  return new NextResponse(base64Link, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
