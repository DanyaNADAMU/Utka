import db from '@/lib/db';
import crypto from 'crypto';
import {
  addVlessUser,
  removeVlessUser,
  getXrayInboundTags,
  syncNodeUsers,
  buildClientLink,
} from '@/lib/xray';

export interface CreateUserParams {
  name?: string;
  email?: string;
  subName?: string;
  role?: string;
  nodeId?: string;
}

/**
 * Creates a new user, subscription, and provisions VLESS credentials across active nodes in Xray.
 */
export async function createUserService(params: CreateUserParams) {
  const name = params.name?.trim() || null;
  const email = params.email?.trim() || (name ? `${name.toLowerCase()}@internal` : null);
  const subName = params.subName?.trim() || `${name || 'Default'}'s Device`;
  const role = params.role === 'ADMIN' ? 'ADMIN' : 'USER';
  const authentikId = `cli_${crypto.randomUUID()}`;

  const user = await db.user.create({
    data: {
      authentikId,
      email,
      name,
      role,
    },
  });

  let targetNode: any = null;
  if (params.nodeId) {
    targetNode = await db.node.findUnique({ where: { id: params.nodeId } });
  }
  if (!targetNode) {
    targetNode = await db.node.findFirst({ where: { isActive: true } });
  }
  if (!targetNode) {
    targetNode = await db.node.findFirst();
  }
  if (!targetNode) {
    targetNode = await db.node.create({
      data: {
        name: 'Main Server',
        address: process.env.XRAY_SERVER_DOMAIN || 'nada.mu',
        port: 443,
        xrayPort: 7999,
        apiHost: process.env.XRAY_API_URL || 'unix:///app/xray/api.sock',
      },
    });
  }

  const subToken = crypto.randomUUID();
  const subscription = await db.subscription.create({
    data: {
      token: subToken,
      name: subName,
      userId: user.id,
      nodeId: targetNode.id,
    },
  });

  const activeNodes = await db.node.findMany({ where: { isActive: true } });
  const createdInbounds: any[] = [];
  const isAdmin = user.role === 'ADMIN';

  for (const node of activeNodes) {
    const nodeTags = await getXrayInboundTags(node.apiHost);
    for (const tag of nodeTags) {
      if (!isAdmin && (!node.isMaster || tag !== 'vless-frankfurt')) {
        continue;
      }
      const newUuid = crypto.randomUUID();

      const inb = await db.subscriptionInbound.create({
        data: {
          subscriptionId: subscription.id,
          nodeId: node.id,
          inboundTag: tag,
          xrayUuid: newUuid,
        },
      });

      await db.uuidHistory.create({
        data: {
          subscriptionId: subscription.id,
          nodeId: node.id,
          inboundTag: tag,
          xrayUuid: newUuid,
        },
      });

      try {
        const xrayEmail = `${subscription.id}_${tag}_${newUuid}`;
        await addVlessUser(node.apiHost, tag, xrayEmail, newUuid);
      } catch (err) {
        console.error(`[userService] Error registering user in Xray node ${node.name}:`, err);
      }

      createdInbounds.push({
        nodeName: node.name,
        nodeAddress: node.address,
        nodePort: node.port,
        inboundTag: tag,
        uuid: newUuid,
      });
    }
  }

  return {
    user,
    subscription,
    inbounds: createdInbounds,
  };
}

/**
 * Lists all users with their subscriptions, inbounds, and aggregated traffic stats.
 */
export async function listUsersService() {
  const users = await db.user.findMany({
    include: {
      subscriptions: {
        include: {
          node: true,
          inbounds: true,
          traffic: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return users.map((u) => {
    let totalUp = BigInt(0);
    let totalDown = BigInt(0);

    for (const sub of u.subscriptions) {
      for (const t of sub.traffic) {
        totalUp += t.up;
        totalDown += t.down;
      }
    }

    return {
      id: u.id,
      name: u.name || 'Unnamed',
      email: u.email || '—',
      role: u.role,
      createdAt: u.createdAt,
      subscriptionsCount: u.subscriptions.length,
      subscriptions: u.subscriptions.map((s) => ({
        id: s.id,
        name: s.name,
        token: s.token,
        nodeName: s.node.name,
        inboundCount: s.inbounds.length,
        lastFetched: s.lastFetched,
      })),
      totalUp,
      totalDown,
      totalBytes: totalUp + totalDown,
    };
  });
}

/**
 * Retrieves full details for a user/subscription by token, user ID, name, or email.
 */
export async function getUserDetailsService(identifier: string) {
  const trimmed = identifier.trim();

  // Try finding subscription by token first
  let sub = await db.subscription.findUnique({
    where: { token: trimmed },
    include: {
      user: true,
      node: true,
      inbounds: { include: { node: true } },
      traffic: true,
    },
  });

  // If not found, try finding user by ID or email
  if (!sub) {
    const user = await db.user.findFirst({
      where: {
        OR: [{ id: trimmed }, { email: trimmed }, { name: trimmed }],
      },
      include: {
        subscriptions: {
          include: {
            user: true,
            node: true,
            inbounds: { include: { node: true } },
            traffic: true,
          },
        },
      },
    });

    if (user && user.subscriptions.length > 0) {
      sub = user.subscriptions[0];
    }
  }

  if (!sub) {
    return null;
  }

  let totalUp = BigInt(0);
  let totalDown = BigInt(0);
  for (const t of sub.traffic) {
    totalUp += t.up;
    totalDown += t.down;
  }

  // Generate VLESS URI links for all inbounds
  const links: { tag: string; nodeName: string; link: string }[] = [];
  for (const inb of sub.inbounds) {
    try {
      const link = await buildClientLink(
        inb.inboundTag,
        inb.xrayUuid,
        sub.name || inb.node.name,
        inb.node.address,
        inb.node.port,
        {
          sni: inb.node.realityServerName,
          pbk: inb.node.realityPubKey,
          sid: inb.node.realityShortId,
        }
      );
      links.push({
        tag: inb.inboundTag,
        nodeName: inb.node.name,
        link,
      });
    } catch (err) {
      console.error(`[userService] Failed to generate link for inbound ${inb.inboundTag}:`, err);
    }
  }

  const baseDomain = process.env.BASE_DOMAIN || process.env.AUTH_URL || 'https://dash.test.nada.mu';
  const subUrl = `${baseDomain}/s/${sub.token}`;

  return {
    user: sub.user,
    subscription: {
      id: sub.id,
      name: sub.name,
      token: sub.token,
      createdAt: sub.createdAt,
      lastFetched: sub.lastFetched,
      node: sub.node,
    },
    traffic: {
      up: totalUp,
      down: totalDown,
      total: totalUp + totalDown,
    },
    subUrl,
    links,
  };
}

/**
 * Revokes / deletes a user or subscription by ID or token.
 */
export async function deleteUserService(identifier: string) {
  const details = await getUserDetailsService(identifier);
  if (!details) {
    return { success: false, error: 'User or subscription not found' };
  }

  const sub = details.subscription;

  // Remove from Xray memory on all relevant nodes
  const inbounds = await db.subscriptionInbound.findMany({
    where: { subscriptionId: sub.id },
    include: { node: true },
  });

  for (const inb of inbounds) {
    try {
      const xrayEmail = `${sub.id}_${inb.inboundTag}_${inb.xrayUuid}`;
      await removeVlessUser(inb.node.apiHost, inb.inboundTag, xrayEmail);
    } catch (err) {
      console.error(`[userService] Error removing VLESS user from node ${inb.node.name}:`, err);
    }
  }

  // Remove user & cascade delete subscriptions
  await db.user.delete({
    where: { id: details.user.id },
  });

  return { success: true, deletedUser: details.user.name || details.user.email };
}

/**
 * Resets traffic counters for a given subscription.
 */
export async function resetUserTrafficService(identifier: string) {
  const details = await getUserDetailsService(identifier);
  if (!details) {
    return { success: false, error: 'User or subscription not found' };
  }

  await db.trafficLog.deleteMany({
    where: { subscriptionId: details.subscription.id },
  });
  await db.uuidTrafficLog.deleteMany({
    where: { subscriptionId: details.subscription.id },
  });

  return { success: true };
}

/**
 * Triggers complete gRPC state sync for all active nodes.
 */
export async function syncAllNodesService() {
  const nodes = await db.node.findMany({ where: { isActive: true } });
  const results = [];

  for (const node of nodes) {
    const res = await syncNodeUsers(node.id);
    results.push({
      nodeId: node.id,
      nodeName: node.name,
      total: res.total,
      synced: res.success,
    });
  }

  return results;
}
