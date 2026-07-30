import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { addVlessUser, removeVlessUser, getClientInboundTags, buildClientLink } from '@/lib/xray';
import crypto from 'crypto';
import { getSettings } from '@/lib/settings';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const url = request.url;
  const slug = (await params).slug;
  console.log(`[DEBUG ROUTE] URL: ${url} | Slug: ${JSON.stringify(slug)} | User-Agent: ${userAgent}`);

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
      if (token.endsWith('.yaml')) {
        token = token.slice(0, -5);
      } else if (token.endsWith('.yml')) {
        token = token.slice(0, -4);
      }
    } else if (subPathParts[i] !== slug[i]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Detect if this request is from our own subconverter container
  const reqUrl = new URL(request.url);
  const isRawRequest = reqUrl.searchParams.get('raw') === 'true';
  
  if (!isRawRequest) {
    // If the client explicitly requested .yaml/.yml, force clash target, otherwise let subconverter auto-detect
    const forceClash = url.includes('.yaml') || url.includes('.yml');
    const target = forceClash ? 'clash' : 'auto';

    const internalUrl = `http://nadamudash:3000/${slug.join('/')}?raw=true`;
    const subUrl = `http://subconverter:25500/sub?target=${target}&url=${encodeURIComponent(internalUrl)}`;
    
    try {
      const subRes = await fetch(subUrl, {
        headers: { 'User-Agent': userAgent }
      });
      
      if (subRes.ok) {
        let subText = await subRes.text();
        
        // Fix random fingerprint to chrome
        subText = subText.replace(/client-fingerprint: random/g, 'client-fingerprint: chrome');
        
        // Clean up default Chinese rules from subconverter if we are serving YAML
        if (subText.includes('rules:')) {
          const rulesIndex = subText.indexOf('rules:');
          const beforeRules = subText.substring(0, rulesIndex);
          const cleanRules = `rules:
  - MATCH,🔰 节点选择`;
          subText = beforeRules + cleanRules;
        }

        const contentType = subRes.headers.get('content-type') || 'text/plain; charset=utf-8';
        const disposition = subRes.headers.get('content-disposition');
        
        const headers = new Headers();
        headers.set('Content-Type', contentType);
        if (disposition) headers.set('Content-Disposition', disposition);
        
        return new NextResponse(subText, { headers, status: 200 });
      }
    } catch (e) {
      console.error("[SUBCONVERTER ERROR]", e);
      // Fallback to generating raw base64 below
    }
  }

  // --- Generate Raw Base64 Subscription ---

  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  console.log(`[VALID SUB REQUEST] Client IP: ${clientIp} | User-Agent: ${userAgent}`);

  const activeInboundTags = await getClientInboundTags();

  // Cleanup expired UUIDs across all subscriptions (lazy cleanup)
  try {
    const expiredUuids = await db.expiringUuid.findMany({
      where: { expiresAt: { lte: new Date() } }
    });

    for (const exp of expiredUuids) {
      const success = await removeVlessUser(exp.inboundTag, exp.xrayEmail);
      if (success || !success) { 
        await db.expiringUuid.delete({ where: { id: exp.id } });
      }
    }
  } catch (e) {
    console.error("Failed to cleanup expired UUIDs:", e);
  }

  const sub = await db.subscription.findUnique({
    where: { token },
    include: { node: true, inbounds: true }
  });

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sync inbounds (add missing ones since by default all are allowed for now)
  const currentInboundTags = sub.inbounds.map((i: any) => i.inboundTag);
  const inboundsToCreate = activeInboundTags.filter(t => !currentInboundTags.includes(t));
  
  if (inboundsToCreate.length > 0) {
    await db.subscriptionInbound.createMany({
      data: inboundsToCreate.map(tag => ({
        subscriptionId: sub.id,
        inboundTag: tag,
        xrayUuid: crypto.randomUUID()
      }))
    });
  }

  // Refetch to get the latest inbounds with UUIDs
  const updatedSub = await db.subscription.findUnique({
    where: { id: sub.id },
    include: { node: true, inbounds: true }
  });
  
  if (!updatedSub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const links: string[] = [];
  const expireMinutes = Number(settings.OLD_UUID_EXPIRE_MINUTES) || 2031;
  const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

  for (const inbound of updatedSub.inbounds) {
    // Only process active inbounds
    if (!activeInboundTags.includes(inbound.inboundTag)) continue;

    const newUuid = crypto.randomUUID();
    const oldUuid = inbound.xrayUuid;
    const newXrayEmail = `${sub.id}_${inbound.inboundTag}_${newUuid}`;
    const oldXrayEmail = `${sub.id}_${inbound.inboundTag}_${oldUuid}`;

    // Add old UUID to ExpiringUuid
    await db.expiringUuid.create({
      data: {
        subscriptionId: sub.id,
        xrayUuid: oldUuid,
        xrayEmail: oldXrayEmail,
        inboundTag: inbound.inboundTag,
        nodeId: sub.nodeId,
        expiresAt: expiresAt
      }
    });

    // Add new UUID to UuidHistory
    await db.uuidHistory.create({
      data: {
        subscriptionId: sub.id,
        inboundTag: inbound.inboundTag,
        xrayUuid: newUuid
      }
    });

    // Update new UUID in SubscriptionInbound
    await db.subscriptionInbound.update({
      where: { id: inbound.id },
      data: { xrayUuid: newUuid }
    });

    // Add new UUID to Xray
    await addVlessUser(inbound.inboundTag, newXrayEmail, newUuid);

    const vlessLink = await buildClientLink(
      inbound.inboundTag,
      newUuid,
      sub.name || "",
      sub.node.address,
      sub.node.port
    );
    links.push(vlessLink);
  }

  // Update subscription fetch time
  await db.subscription.update({
    where: { id: sub.id },
    data: { lastFetched: new Date() }
  });

  const base64Link = Buffer.from(links.join('\n')).toString('base64');
  
  return new NextResponse(base64Link, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
