import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { addVlessUser, removeVlessUser, getClientInboundTags, buildClientLink } from '@/lib/xray';
import crypto from 'crypto';
import { getSettings } from '@/lib/settings';
import stripJsonComments from 'strip-json-comments';

function getNodeInboundTags(node: any, masterTags: string[]): string[] {
  let nodeTags = masterTags;
  if (node.xrayConfig && typeof node.xrayConfig === 'string') {
    try {
      let configText = stripJsonComments(node.xrayConfig);
      let parsedData = JSON.parse(configText);
      if (typeof parsedData === 'string') {
        parsedData = JSON.parse(parsedData);
      }
      if (parsedData.inbounds && Array.isArray(parsedData.inbounds)) {
        const parsedTags = parsedData.inbounds
          .filter((i: any) => i.tag && i.tag !== 'api' && i.protocol !== 'dokodemo-door')
          .map((i: any) => i.tag);
        if (parsedTags.length > 0) {
          nodeTags = parsedTags;
        }
      }
    } catch (e) {
      console.error(`Failed to parse config for node ${node.name}:`, e);
    }
  }
  return nodeTags;
}

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

  const sub = await db.subscription.findUnique({
    where: { token },
    include: { inbounds: { include: { node: true } } }
  });

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const profileName = sub.name || "NadamuDash";

  // Active tags and active nodes sync
  const activeInboundTags = await getClientInboundTags();
  const activeNodes = await db.node.findMany({ where: { isActive: true } });
  const activeNodeMap = new Map(activeNodes.map(n => [n.id, n]));

  // 1. Create missing inbounds for active nodes
  const inboundsToCreate = [];
  for (const node of activeNodes) {
    const nodeTags = getNodeInboundTags(node, activeInboundTags);
    for (const tag of nodeTags) {
      const exists = sub.inbounds.find((i: any) => i.inboundTag === tag && i.nodeId === node.id);
      if (!exists) {
        inboundsToCreate.push({
          subscriptionId: sub.id,
          nodeId: node.id,
          inboundTag: tag,
          xrayUuid: crypto.randomUUID()
        });
      }
    }
  }

  if (inboundsToCreate.length > 0) {
    await db.subscriptionInbound.createMany({
      data: inboundsToCreate
    });
  }

  // 2. Refetch subscription with fresh inbounds
  const currentSub = await db.subscription.findUnique({
    where: { id: sub.id },
    include: { user: true, inbounds: { include: { node: true } } }
  });

  if (!currentSub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 3. Clean up stale inbounds that no longer exist on active nodes
  const staleInboundIds: string[] = [];
  for (const inbound of currentSub.inbounds) {
    if (!inbound.node || !inbound.node.isActive || !activeNodeMap.has(inbound.nodeId)) {
      staleInboundIds.push(inbound.id);
      continue;
    }
    const validTags = getNodeInboundTags(inbound.node, activeInboundTags);
    if (!validTags.includes(inbound.inboundTag)) {
      staleInboundIds.push(inbound.id);
    }
  }

  if (staleInboundIds.length > 0) {
    await db.subscriptionInbound.deleteMany({
      where: { id: { in: staleInboundIds } }
    });
  }

  // 4. Refetch cleaned subscription
  const updatedSub = await db.subscription.findUnique({
    where: { id: sub.id },
    include: { user: true, inbounds: { include: { node: true } } }
  });

  if (!updatedSub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Detect browser request vs raw request
  const reqUrl = new URL(request.url);
  const acceptHeader = request.headers.get('accept') || '';
  const isRawRequest = reqUrl.searchParams.get('raw') === 'true';
  const isYamlRequest = url.endsWith('.yaml') || url.endsWith('.yml');

  const lowerUA = userAgent.toLowerCase();
  const isVpnClientUA = lowerUA.includes('clash') || 
                        lowerUA.includes('hiddify') || 
                        lowerUA.includes('shadowrocket') || 
                        lowerUA.includes('v2ray') || 
                        lowerUA.includes('sing-box') || 
                        lowerUA.includes('stash') || 
                        lowerUA.includes('quantumult') || 
                        lowerUA.includes('subconverter') ||
                        lowerUA.includes('nekobox') ||
                        lowerUA.includes('streisand') ||
                        lowerUA.includes('curl') ||
                        lowerUA.includes('wget');

  const isBrowserRequest = acceptHeader.includes('text/html') && !isRawRequest && !isYamlRequest && !isVpnClientUA;

  if (isBrowserRequest) {
    const { renderSubscriptionHtml, generateQrSvg } = await import('@/lib/subPageTemplate');

    const trafficLogs = await db.trafficLog.aggregate({
      where: { subscriptionId: updatedSub.id },
      _sum: { up: true, down: true }
    });
    const trafficUp = trafficLogs._sum.up || BigInt(0);
    const trafficDown = trafficLogs._sum.down || BigInt(0);
    const trafficTotal = trafficUp + trafficDown;

    const host = request.headers.get('host') || 'nada.mu';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const subUrl = `${protocol}://${host}/${slug.join('/')}`;
    const subQrSvg = await generateQrSvg(subUrl);

    const masterApiHost = process.env.XRAY_API_URL || 'unix:///app/xray/api.sock';
    const nodeLinks = [];

    for (const inbound of updatedSub.inbounds) {
      if (!inbound.node || !inbound.node.isActive) continue;

      const vlessLink = await buildClientLink(
        inbound.inboundTag,
        inbound.xrayUuid,
        `${updatedSub.name || "NadamuDash"} - ${inbound.node.name}`,
        inbound.node.address,
        inbound.node.port,
        {
          sni: inbound.node.apiHost === masterApiHost ? undefined : inbound.node.realityServerName,
          pbk: inbound.node.apiHost === masterApiHost ? undefined : inbound.node.realityPubKey,
          sid: inbound.node.apiHost === masterApiHost ? undefined : inbound.node.realityShortId
        }
      );

      const qrSvg = await generateQrSvg(vlessLink);

      nodeLinks.push({
        nodeName: inbound.node.name,
        address: inbound.node.address,
        port: inbound.node.port,
        inboundTag: inbound.inboundTag,
        vlessLink,
        qrSvg
      });
    }

    const htmlContent = renderSubscriptionHtml({
      subName: updatedSub.name || "NadamuDash",
      userName: updatedSub.user?.name || updatedSub.user?.email || "Пользователь",
      subUrl,
      subQrSvg,
      trafficUp,
      trafficDown,
      trafficTotal,
      lastFetched: updatedSub.lastFetched,
      createdAt: updatedSub.createdAt,
      nodeLinks
    });

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  }

  // Detect if this request is from subconverter
  if (!isRawRequest) {
    const forceClash = url.includes('.yaml') || url.includes('.yml');
    const target = forceClash ? 'clash' : 'auto';

    const internalUrl = `http://nadamudash:3000/${slug.join('/')}?raw=true`;
    const configUrl = `http://nadamudash:3000/api/config.ini`;
    const filenameParam = encodeURIComponent(profileName);
    const subUrl = `http://subconverter:25500/sub?target=${target}&url=${encodeURIComponent(internalUrl)}&config=${encodeURIComponent(configUrl)}&filename=${filenameParam}`;
    
    try {
      const subRes = await fetch(subUrl, {
        headers: { 'User-Agent': userAgent }
      });
      
      if (subRes.ok) {
        let subText = await subRes.text();
        
        // Fix random fingerprint to chrome
        subText = subText.replace(/client-fingerprint: random/g, 'client-fingerprint: chrome');

        const contentType = subRes.headers.get('content-type') || 'text/plain; charset=utf-8';
        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('profile-title', profileName);
        const ext = forceClash ? '.yaml' : '';
        const encodedName = encodeURIComponent(profileName);
        headers.set('Content-Disposition', `attachment; filename="${encodedName}${ext}"; filename*=utf-8''${encodedName}${ext}`);
        
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

  // Cleanup expired UUIDs across all subscriptions (lazy cleanup)
  try {
    const expiredUuids = await db.expiringUuid.findMany({
      where: { expiresAt: { lte: new Date() } },
      include: { node: true }
    });

    for (const exp of expiredUuids) {
      const apiHost = exp.node ? exp.node.apiHost : 'unix:///app/xray/api.sock';
      const success = await removeVlessUser(apiHost, exp.inboundTag, exp.xrayEmail);
      if (success || !success) { 
        await db.expiringUuid.delete({ where: { id: exp.id } });
      }
    }
  } catch (e) {
    console.error("Failed to cleanup expired UUIDs:", e);
  }

  const links: string[] = [];
  const expireMinutes = Number(settings.OLD_UUID_EXPIRE_MINUTES) || 2031;
  const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

  // 1. Generate proxy link(s) for Master server
  const masterApiHost = process.env.XRAY_API_URL || 'unix:///app/xray/api.sock';
  const hasLocalMasterInDb = activeNodes.some((n: any) => n.apiHost === 'unix:///app/xray/api.sock' || n.apiHost === 'xray:7999' || n.address === '127.0.0.1' || n.address === 'localhost' || n.apiHost === masterApiHost);
  if (!hasLocalMasterInDb) {
    const masterAddress = process.env.XRAY_SERVER_DOMAIN_OR_IP || process.env.XRAY_SERVER_DOMAIN || request.headers.get('host')?.split(':')[0] || '81.30.105.65';
    for (const tag of activeInboundTags) {
      const masterUuid = crypto.randomUUID();
      const masterEmail = `${updatedSub.id}_master_${tag}_${masterUuid}`;
      await addVlessUser('unix:///app/xray/api.sock', tag, masterEmail, masterUuid);

      const masterLink = await buildClientLink(
        tag,
        masterUuid,
        `${updatedSub.name || "NadamuDash"} - Master`,
        masterAddress,
        443
      );
      links.push(masterLink);
    }
  }

  // 2. Generate proxy link(s) for active Nodes
  for (const inbound of updatedSub.inbounds) {
    if (!inbound.node || !inbound.node.isActive) continue;

    const newUuid = crypto.randomUUID();
    const oldUuid = inbound.xrayUuid;
    const newXrayEmail = `${updatedSub.id}_${inbound.inboundTag}_${newUuid}`;
    const oldXrayEmail = `${updatedSub.id}_${inbound.inboundTag}_${oldUuid}`;

    // Add old UUID to ExpiringUuid
    await db.expiringUuid.create({
      data: {
        subscriptionId: updatedSub.id,
        xrayUuid: oldUuid,
        xrayEmail: oldXrayEmail,
        inboundTag: inbound.inboundTag,
        nodeId: inbound.nodeId,
        expiresAt: expiresAt
      }
    });

    // Add new UUID to UuidHistory
    await db.uuidHistory.create({
      data: {
        subscriptionId: updatedSub.id,
        inboundTag: inbound.inboundTag,
        xrayUuid: newUuid,
        nodeId: inbound.nodeId
      }
    });

    // Update new UUID in SubscriptionInbound
    await db.subscriptionInbound.update({
      where: { id: inbound.id },
      data: { xrayUuid: newUuid }
    });

    // Add new UUID to Xray (on the specific node)
    await addVlessUser(inbound.node.apiHost, inbound.inboundTag, newXrayEmail, newUuid);

    const vlessLink = await buildClientLink(
      inbound.inboundTag,
      newUuid,
      `${updatedSub.name || "NadamuDash"} - ${inbound.node.name}`,
      inbound.node.address,
      inbound.node.port,
      {
        sni: inbound.node.apiHost === masterApiHost ? undefined : inbound.node.realityServerName,
        pbk: inbound.node.apiHost === masterApiHost ? undefined : inbound.node.realityPubKey,
        sid: inbound.node.apiHost === masterApiHost ? undefined : inbound.node.realityShortId
      }
    );
    console.log(`[Generated VLESS Link for node ${inbound.node.name}]`, vlessLink);
    links.push(vlessLink);
  }

  // Update subscription fetch time
  await db.subscription.update({
    where: { id: updatedSub.id },
    data: { lastFetched: new Date() }
  });

  const base64Link = Buffer.from(links.join('\n')).toString('base64');
  
  return new NextResponse(base64Link, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'profile-title': profileName,
      'profile-update-interval': '24',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(profileName)}"; filename*=utf-8''${encodeURIComponent(profileName)}`
    }
  });
}
