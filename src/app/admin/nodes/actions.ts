'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { regenerateMasterXrayConfig } from '@/lib/xrayConfig';

const nodeSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  port: z.coerce.number().int().positive(),
  apiHost: z.string().optional(),
  adminUuid: z.string().optional(),
  realityServerName: z.string().optional(),
  realityPubKey: z.string().optional(),
  realityShortId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function createNode(data: z.infer<typeof nodeSchema>) {
  const parsed = nodeSchema.parse(data);
  
  const isLocal = parsed.address === '127.0.0.1' || parsed.address === 'localhost';

  const node = await db.node.create({
    data: {
      name: parsed.name,
      address: parsed.address,
      port: parsed.port,
      apiHost: isLocal ? 'unix:///app/xray/api.sock' : 'pending',
      adminUuid: parsed.adminUuid || undefined,
      realityServerName: parsed.realityServerName || 'biz.mail.ru',
      realityPubKey: parsed.realityPubKey || undefined,
      realityShortId: parsed.realityShortId || undefined,
      isActive: parsed.isActive,
    }
  });

  if (!isLocal) {
    await db.node.update({
      where: { id: node.id },
      data: { apiHost: `unix:///app/xray/node-${node.id}.sock` }
    });
    node.apiHost = `unix:///app/xray/node-${node.id}.sock`;
  }

  try {
    await regenerateMasterXrayConfig();
  } catch (err) {
    console.error("Failed to regenerate Xray config:", err);
  }

  revalidatePath('/admin/nodes');
  return node;
}

export async function updateNode(id: string, data: Partial<z.infer<typeof nodeSchema>>) {
  const parsed = nodeSchema.partial().parse(data);
  const updateData: any = { ...parsed };

  if (updateData.adminUuid === '') updateData.adminUuid = undefined;
  if (updateData.realityServerName === '') updateData.realityServerName = 'biz.mail.ru';
  if (updateData.realityPubKey === '') updateData.realityPubKey = undefined;
  if (updateData.realityShortId === '') updateData.realityShortId = undefined;
  
  if (updateData.address) {
    const isLocal = updateData.address === '127.0.0.1' || updateData.address === 'localhost';
    updateData.apiHost = isLocal ? 'unix:///app/xray/api.sock' : `unix:///app/xray/node-${id}.sock`;
  }

  const node = await db.node.update({
    where: { id },
    data: updateData
  });

  try {
    await regenerateMasterXrayConfig();
  } catch (err) {
    console.error("Failed to regenerate Xray config:", err);
  }

  revalidatePath('/admin/nodes');
  return node;
}

export async function deleteNode(id: string) {
  await db.node.delete({ where: { id } });
  try {
    await regenerateMasterXrayConfig();
  } catch (err) {
    console.error("Failed to regenerate Xray config:", err);
  }
  revalidatePath('/admin/nodes');
}
