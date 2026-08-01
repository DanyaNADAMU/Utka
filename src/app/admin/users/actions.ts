'use server';

import { auth } from '@/auth';
import db from '@/lib/db';
import { addVlessUser, getClientInboundTags } from '@/lib/xray';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

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
          address: process.env.XRAY_SERVER_DOMAIN || 'nada.mu',
          port: 443,
          apiHost: process.env.XRAY_API_URL || 'xray:7999',
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

    const activeInboundTags = await getClientInboundTags();
    const activeNodes = await db.node.findMany({ where: { isActive: true } });

    for (const node of activeNodes) {
      for (const tag of activeInboundTags) {
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
    return { success: true, userId: newUser.id, subscriptionId: newSub.id };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { success: false, error: error?.message || 'Failed to create user' };
  }
}
