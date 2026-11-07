import crypto from 'crypto';
import db from '@/lib/db';
import { addVlessUser, getClientInboundTags, getXrayInboundTags, buildClientLink } from '@/lib/xray';
import { getSettings } from '@/lib/settings';

async function getNodeInboundTags(node: any, masterTags: string[]): Promise<string[]> {
  if (node.inboundSettings) {
    try {
      const parsed = JSON.parse(node.inboundSettings);
      const customTags = Object.keys(parsed);
      if (customTags.length > 0) {
        return customTags;
      }
    } catch {
      // fallback
    }
  }
  const isStaticNode = !node.apiHost || node.apiHost === 'static' || node.apiHost === 'none';
  if (node.apiHost && !isStaticNode) {
    const remoteTags = await getXrayInboundTags(node.apiHost);
    if (remoteTags.length > 0) {
      return remoteTags;
    }
  }
  return masterTags;
}

function getInboundOverride(node: any, tag: string) {
  if (!node || !node.inboundSettings) return undefined;
  try {
    const settingsObj = JSON.parse(node.inboundSettings);
    return settingsObj[tag];
  } catch {
    return undefined;
  }
}

export interface ProcessSubOptions {
  url: string;
  slug: string[];
  headers: Record<string, string | string[] | undefined>;
  clientIp?: string;
}

export interface ProcessSubResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export async function processSubscription(options: ProcessSubOptions): Promise<ProcessSubResult> {
  const { url, slug, headers, clientIp = 'unknown' } = options;

  const headerGet = (name: string): string => {
    const val = headers[name.toLowerCase()] ?? headers[name];
    if (Array.isArray(val)) return val[0] || '';
    return val || '';
  };

  const userAgent = headerGet('user-agent') || 'unknown';
  console.log(`[DEBUG ROUTE] URL: ${url} | Slug: ${JSON.stringify(slug)} | User-Agent: ${userAgent}`);

  if (!slug || slug.length === 0) {
    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' })
    };
  }

  // 1. Fetch dynamic settings
  const settings = await getSettings();
  const subPathParts = (settings.SUB_PATH || '/[token]').split('/').filter(Boolean);

  let token: string | null = null;

  // 2. Try matching configured SUB_PATH
  if (slug.length === subPathParts.length) {
    let matches = true;
    for (let i = 0; i < subPathParts.length; i++) {
      if (subPathParts[i] === '[token]') {
        token = slug[i];
      } else if (subPathParts[i] !== slug[i]) {
        matches = false;
        break;
      }
    }
    if (!matches) token = null;
  }

  // 3. Fallback: allow standard subscription route conventions:
  // /<token> (length 1) or /s/<token> or /sub/<token> (length 2) or /api/sub/<token> (length 3)
  if (!token) {
    if (slug.length === 1) {
      token = slug[0];
    } else if (slug.length === 2 && (slug[0] === 's' || slug[0] === 'sub')) {
      token = slug[1];
    } else if (slug.length === 3 && slug[0] === 'api' && (slug[1] === 's' || slug[1] === 'sub')) {
      token = slug[2];
    }
  }

  if (token) {
    if (token.endsWith('.yaml')) {
      token = token.slice(0, -5);
    } else if (token.endsWith('.yml')) {
      token = token.slice(0, -4);
    }
  }

  if (!token) {
    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' })
    };
  }

  const sub = await db.subscription.findUnique({
    where: { token },
    include: { user: true, inbounds: { include: { node: true } } }
  });

  if (!sub) {
    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' })
    };
  }

  const profileName = sub.name || 'Utka';
  const isAdmin = sub.user?.role === 'ADMIN';

  // Active tags and active nodes sync
  const activeInboundTags = await getClientInboundTags();
  const activeNodes = await db.node.findMany({ where: { isActive: true } });
  const activeNodeMap = new Map(activeNodes.map(n => [n.id, n]));

  // Cache node inbound tags
  const nodeTagsCache = new Map<string, string[]>();
  for (const node of activeNodes) {
    const tags = await getNodeInboundTags(node, activeInboundTags);
    nodeTagsCache.set(node.id, tags);
  }

  // 1. Create missing inbounds for active nodes
  const inboundsToCreate = [];
  if (isAdmin) {
    for (const node of activeNodes) {
      const isStaticNode = !node.apiHost || node.apiHost === 'static' || node.apiHost === 'none';
      const nodeTags = nodeTagsCache.get(node.id) || activeInboundTags;
      for (const tag of nodeTags) {
        const exists = sub.inbounds.find((i: any) => i.inboundTag === tag && i.nodeId === node.id);
        if (!exists) {
          inboundsToCreate.push({
            subscriptionId: sub.id,
            nodeId: node.id,
            inboundTag: tag,
            xrayUuid: (isStaticNode && node.adminUuid) ? node.adminUuid : crypto.randomUUID()
          });
        }
      }
    }
  } else {
    // Non-admin users: only get 'vless-frankfurt' on the Master node (Glacier -> Floe -> WARP)
    const masterNode = activeNodes.find(n => n.isMaster) || activeNodes[0];
    if (masterNode) {
      const exists = sub.inbounds.find((i: any) => i.inboundTag === 'vless-frankfurt' && i.nodeId === masterNode.id);
      if (!exists) {
        inboundsToCreate.push({
          subscriptionId: sub.id,
          nodeId: masterNode.id,
          inboundTag: 'vless-frankfurt',
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

  if (!currentSub) {
    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' })
    };
  }

  // 3. Clean up stale inbounds that no longer exist on active nodes or not allowed for regular users
  const staleInboundIds: string[] = [];
  for (const inbound of currentSub.inbounds) {
    if (!isAdmin && (inbound.inboundTag !== 'vless-frankfurt' || !inbound.node?.isMaster)) {
      staleInboundIds.push(inbound.id);
      continue;
    }
    if (!inbound.node || !inbound.node.isActive || !activeNodeMap.has(inbound.nodeId)) {
      staleInboundIds.push(inbound.id);
      continue;
    }
    const validTags = nodeTagsCache.get(inbound.nodeId) || activeInboundTags;
    if (validTags.length > 0 && !validTags.includes(inbound.inboundTag)) {
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

  if (!updatedSub) {
    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' })
    };
  }

  // Detect browser request vs raw request
  const parsedUrl = new URL(url, 'http://localhost');
  const acceptHeader = headerGet('accept');
  const isRawRequest = parsedUrl.searchParams.get('raw') === 'true';
  const isYamlRequest = url.endsWith('.yaml') || url.endsWith('.yml');

  const lowerUA = userAgent.toLowerCase();
  const isVpnClientUA =
    lowerUA.includes('clash') ||
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

  // --- Browser HTML Page ---
  if (isBrowserRequest) {
    const { renderSubscriptionHtml, generateQrSvg } = await import('@/lib/subPageTemplate');

    const trafficLogs = await db.trafficLog.aggregate({
      where: { subscriptionId: updatedSub.id },
      _sum: { up: true, down: true }
    });
    const trafficUp = trafficLogs._sum.up || BigInt(0);
    const trafficDown = trafficLogs._sum.down || BigInt(0);
    const trafficTotal = trafficUp + trafficDown;

    const host = headerGet('host') || 'nada.mu';
    const protocol = headerGet('x-forwarded-proto') || 'https';
    const subUrl = `${protocol}://${host}/${slug.join('/')}`;
    const subQrSvg = await generateQrSvg(subUrl);

    const nodeLinks = [];

    for (const inbound of updatedSub.inbounds) {
      if (!inbound.node || !inbound.node.isActive) continue;

      const vlessLink = await buildClientLink(
        inbound.inboundTag,
        inbound.xrayUuid,
        `${updatedSub.name || 'Utka'} - ${inbound.node.name}`,
        inbound.node.address,
        inbound.node.port,
        {
          sni: inbound.node.realityServerName,
          pbk: inbound.node.realityPubKey,
          sid: inbound.node.realityShortId
        },
        getInboundOverride(inbound.node, inbound.inboundTag)
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
      subName: updatedSub.name || 'Utka',
      userName: updatedSub.user?.name || updatedSub.user?.email || 'Пользователь',
      subUrl,
      subQrSvg,
      trafficUp,
      trafficDown,
      trafficTotal,
      lastFetched: updatedSub.lastFetched,
      createdAt: updatedSub.createdAt,
      nodeLinks
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0'
      },
      body: htmlContent
    };
  }

  // --- Subconverter Proxy Request ---
  if (!isRawRequest) {
    const forceClash = url.includes('.yaml') || url.includes('.yml');
    const target = forceClash ? 'clash' : 'auto';

    const subInternalUrl = process.env.SUB_INTERNAL_URL || process.env.SUB_URL || 'http://nadamudash-sub:8008';
    const subconverterUrl = process.env.SUBCONVERTER_URL || 'http://subconverter:25500';
    const internalUrl = `${subInternalUrl}/${slug.join('/')}?raw=true`;
    const configUrl = `${subInternalUrl}/api/config.ini`;
    const filenameParam = encodeURIComponent(profileName);
    const subUrl = `${subconverterUrl}/sub?target=${target}&url=${encodeURIComponent(internalUrl)}&config=${encodeURIComponent(configUrl)}&filename=${filenameParam}`;

    try {
      const subRes = await fetch(subUrl, {
        headers: { 'User-Agent': userAgent }
      });

      if (subRes.ok) {
        let subText = await subRes.text();
        // Fix random fingerprint to chrome
        subText = subText.replace(/client-fingerprint: random/g, 'client-fingerprint: chrome');

        const contentType = subRes.headers.get('content-type') || 'text/plain; charset=utf-8';
        const ext = forceClash ? '.yaml' : '';
        const encodedName = encodeURIComponent(profileName);

        return {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'profile-title': profileName,
            'Content-Disposition': `attachment; filename="${encodedName}${ext}"; filename*=utf-8''${encodedName}${ext}`
          },
          body: subText
        };
      }
    } catch (e) {
      console.error('[SUBCONVERTER ERROR]', e);
      // Fallback to generating raw base64 below
    }
  }

  // --- Generate Raw Base64 Subscription ---
  console.log(`[VALID SUB REQUEST] Client IP: ${clientIp} | User-Agent: ${userAgent}`);

  const links: string[] = [];
  const expireMinutes = Number(settings.OLD_UUID_EXPIRE_MINUTES) || 2031;
  const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

  // 1. Generate proxy link(s) for Master server if not configured as a node in DB
  const masterApiHost = process.env.XRAY_API_URL || 'unix:///app/xray/api.sock';
  const hasLocalMasterInDb = activeNodes.some(
    (n: any) =>
      n.apiHost === 'unix:///app/xray/api.sock' ||
      n.apiHost === 'xray:7999' ||
      n.address === '127.0.0.1' ||
      n.address === 'localhost' ||
      n.apiHost === masterApiHost
  );

  if (!hasLocalMasterInDb) {
    const masterAddress =
      process.env.XRAY_SERVER_DOMAIN_OR_IP ||
      process.env.XRAY_SERVER_DOMAIN ||
      headerGet('host').split(':')[0] ||
      '81.30.105.65';

    for (const tag of activeInboundTags) {
      const masterUuid = crypto.randomUUID();
      const masterEmail = `${updatedSub.id}_master_${tag}_${masterUuid}`;
      await addVlessUser('unix:///app/xray/api.sock', tag, masterEmail, masterUuid);

      const masterLink = await buildClientLink(
        tag,
        masterUuid,
        `${updatedSub.name || 'Utka'} - Master`,
        masterAddress,
        443
      );
      links.push(masterLink);
    }
  }

  // 2. Generate proxy link(s) for active Nodes
  for (const inbound of updatedSub.inbounds) {
    if (!inbound.node || !inbound.node.isActive) continue;

    const isStaticNode = !inbound.node.apiHost || inbound.node.apiHost === 'static' || inbound.node.apiHost === 'none';
    let currentUuid = inbound.xrayUuid;

    if (!isStaticNode) {
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
      currentUuid = newUuid;
    }

    const vlessLink = await buildClientLink(
      inbound.inboundTag,
      currentUuid,
      `${updatedSub.name || 'Utka'} - ${inbound.node.name}`,
      inbound.node.address,
      inbound.node.port,
      {
        sni: inbound.node.realityServerName,
        pbk: inbound.node.realityPubKey,
        sid: inbound.node.realityShortId
      },
      getInboundOverride(inbound.node, inbound.inboundTag)
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

  return {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'profile-title': profileName,
      'profile-update-interval': '24',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(profileName)}"; filename*=utf-8''${encodeURIComponent(profileName)}`
    },
    body: base64Link
  };
}
