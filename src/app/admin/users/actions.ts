'use server';

import { auth } from '@/auth';
import db from '@/lib/db';
import { addVlessUser, removeVlessUser, getClientInboundTags, getXrayInboundTags } from '@/lib/xray';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { sendSubscriptionWebhook } from '@/lib/webhook';

export async function createUserAction(data: {
  email?: string;
  name?: string;
  subName?: string;
  role?: string;
}) {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const email = data.email?.trim() || null;
    const name = data.name?.trim() || null;
    const subName = data.subName?.trim() || 'Default Device';
    const role = data.role === 'ADMIN' ? 'ADMIN' : 'USER';

    const authentikId = `manual_${crypto.randomUUID()}`;

    const newUser = await db.user.create({
      data: {
        authentikId,
        email,
        name,
        role,
      },
    });

    let defaultNode = await db.node.findFirst({ where: { isActive: true } });
    if (!defaultNode) {
      defaultNode = await db.node.findFirst();
    }
    if (!defaultNode) {
      defaultNode = await db.node.create({
        data: {
          name: 'Main Server',
          address: process.env.XRAY_SERVER_DOMAIN || process.env.XRAY_SERVER_DOMAIN_OR_IP || '127.0.0.1',
          port: 443,
          apiHost: process.env.XRAY_API_URL || 'unix:///app/xray/api.sock',
        },
      });
    }

    const newSub = await db.subscription.create({
      data: {
        name: subName,
        userId: newUser.id,
        nodeId: defaultNode.id,
      },
    });

    const activeNodes = await db.node.findMany({ where: { isActive: true } });
    const isAdmin = newUser.role === 'ADMIN';
    const defaultClientTags = ['vless-frankfurt', 'vless-in'];

    for (const node of activeNodes) {
      const nodeTags = await getXrayInboundTags(node.apiHost);
      for (const tag of nodeTags) {
        if (!isAdmin && (!node.isMaster || !defaultClientTags.includes(tag))) {
          continue;
        }
        const newUuid = crypto.randomUUID();

        await db.subscriptionInbound.create({
          data: {
            subscriptionId: newSub.id,
            nodeId: node.id,
            inboundTag: tag,
            xrayUuid: newUuid,
          },
        });

        await db.uuidHistory.create({
          data: {
            subscriptionId: newSub.id,
            nodeId: node.id,
            inboundTag: tag,
            xrayUuid: newUuid,
          },
        });

        try {
          await addVlessUser(
            node.apiHost,
            tag,
            `${newSub.id}_${tag}_${newUuid}`,
            newUuid
          );
        } catch (xrayErr) {
          console.error(
            `Failed to add VLESS user to node ${node.name}:`,
            xrayErr
          );
        }
      }
    }

    revalidatePath('/admin/users');

    // Notify external services via webhook
    sendSubscriptionWebhook({
      event: 'subscription.created',
      subscription: {
        id: newSub.id,
        name: newSub.name,
        userId: newUser.id,
        userName: newUser.name,
        userEmail: newUser.email,
      },
    }).catch(() => {});

    return { success: true, userId: newUser.id, subscriptionId: newSub.id };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { success: false, error: error?.message || 'Failed to create user' };
  }
}

export async function regenerateTokenAction(subscriptionId: string) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

  try {
    await db.subscription.update({
      where: { id: subscriptionId },
      data: { token: crypto.randomUUID() },
    });
    revalidatePath(`/admin/users/${subscriptionId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUserAction(subscriptionId: string) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

  try {
    const sub = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: { inbounds: { include: { node: true } } },
    });

    if (!sub) return { success: false, error: 'Not found' };

    // Remove from Xray
    for (const inbound of sub.inbounds) {
      try {
        const email = `${sub.id}_${inbound.inboundTag}_${inbound.xrayUuid}`;
        await removeVlessUser(inbound.node.apiHost, inbound.inboundTag, email);
      } catch (e) {
        console.error('Failed to remove from Xray:', e);
      }
    }

    // Delete Subscription
    await db.subscription.delete({ where: { id: subscriptionId } });

    // Delete User if no other subscriptions
    const otherSubs = await db.subscription.count({ where: { userId: sub.userId } });
    if (otherSubs === 0) {
      await db.user.delete({ where: { id: sub.userId } });
    }

    revalidatePath('/admin/users');

    // Notify external services via webhook
    sendSubscriptionWebhook({
      event: 'subscription.deleted',
      subscription: {
        id: subscriptionId,
      },
    }).catch(() => {});

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserAccessAction(
  subscriptionId: string,
  accessData: { nodeId: string; inboundTags: string[] }[]
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

  try {
    const sub = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: { inbounds: { include: { node: true } } },
    });

    if (!sub) return { success: false, error: 'Not found' };

    const currentInbounds = sub.inbounds;
    
    // Build set of desired access
    const desiredAccess = new Set<string>();
    for (const nodeAccess of accessData) {
      for (const tag of nodeAccess.inboundTags) {
        desiredAccess.add(`${nodeAccess.nodeId}:${tag}`);
      }
    }

    // Process removals
    for (const current of currentInbounds) {
      const key = `${current.nodeId}:${current.inboundTag}`;
      if (!desiredAccess.has(key)) {
        // Remove from Xray
        const email = `${sub.id}_${current.inboundTag}_${current.xrayUuid}`;
        await removeVlessUser(current.node.apiHost, current.inboundTag, email);
        
        // Remove from DB
        await db.subscriptionInbound.delete({ where: { id: current.id } });
        
        // Also clean up ExpiringUuid if any
        await db.expiringUuid.deleteMany({
          where: { subscriptionId: sub.id, xrayUuid: current.xrayUuid }
        });
      }
    }

    // Process additions
    const currentKeys = new Set(currentInbounds.map(i => `${i.nodeId}:${i.inboundTag}`));
    
    // We need node apiHost for additions
    const allNodes = await db.node.findMany({ where: { isActive: true } });
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));

    for (const nodeAccess of accessData) {
      const node = nodeMap.get(nodeAccess.nodeId);
      if (!node) continue;
      
      for (const tag of nodeAccess.inboundTags) {
        const key = `${nodeAccess.nodeId}:${tag}`;
        if (!currentKeys.has(key)) {
          // Add new access
          const newUuid = crypto.randomUUID();
          
          await db.subscriptionInbound.create({
            data: {
              subscriptionId: sub.id,
              nodeId: node.id,
              inboundTag: tag,
              xrayUuid: newUuid,
            },
          });

          await db.uuidHistory.create({
            data: {
              subscriptionId: sub.id,
              nodeId: node.id,
              inboundTag: tag,
              xrayUuid: newUuid,
            },
          });

          const email = `${sub.id}_${tag}_${newUuid}`;
          await addVlessUser(node.apiHost, tag, email, newUuid);
        }
      }
    }

    revalidatePath(`/admin/users/${subscriptionId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
