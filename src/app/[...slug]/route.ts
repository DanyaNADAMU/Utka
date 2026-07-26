import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { addVlessUser, removeVlessUser } from '@/lib/xray';
import crypto from 'crypto';
import { getSettings } from '@/lib/settings';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const slug = (await params).slug;
  if (!slug || slug.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 1. Fetch dynamic settings
  const settings = await getSettings();
  const subPathParts = settings.SUB_PATH.split('/').filter(Boolean);
  
  // 2. Validate URL against configured SUB_PATH
  if (slug.length !== subPathParts.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let token = null;
  for (let i = 0; i < subPathParts.length; i++) {
    if (subPathParts[i] === '[token]') {
      token = slug[i];
    } else if (subPathParts[i] !== slug[i]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const inboundTag = settings.XRAY_INBOUND_TAG;

  // Cleanup expired UUIDs across all subscriptions (lazy cleanup)
  try {
    const expiredUuids = await db.expiringUuid.findMany({
      where: { expiresAt: { lte: new Date() } }
    });

    for (const exp of expiredUuids) {
      const success = await removeVlessUser(inboundTag, exp.xrayEmail);
      if (success || !success) { 
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

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Generate new UUID
  const newUuid = crypto.randomUUID();
  const oldUuid = sub.xrayUuid;
  const newXrayEmail = `${sub.id}_${newUuid}`;
  const oldXrayEmail = `${sub.id}_${oldUuid}`;

  const expireMinutes = Number(settings.OLD_UUID_EXPIRE_MINUTES) || 2031;

  // Add old UUID to ExpiringUuid
  const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);
  await db.expiringUuid.create({
    data: {
      subscriptionId: sub.id,
      xrayUuid: oldUuid,
      xrayEmail: oldXrayEmail,
      nodeId: sub.nodeId,
      expiresAt: expiresAt
    }
  });

  // Update subscription in DB
  await db.subscription.update({
    where: { id: sub.id },
    data: { 
      xrayUuid: newUuid,
      lastFetched: new Date() 
    }
  });

  // Add new UUID to Xray
  await addVlessUser(inboundTag, newXrayEmail, newUuid);

  // Generate vless link
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
