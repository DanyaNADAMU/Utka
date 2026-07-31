'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { regenerateMasterXrayConfig } from '@/lib/xrayConfig';

const nodeSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  port: z.coerce.number().int().positive(),
  apiHost: z.string().min(1),
  adminUuid: z.string().optional(),
  apiToken: z.string().optional(),
  realityPubKey: z.string().optional(),
  realityShortId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function createNode(data: z.infer<typeof nodeSchema>) {
  const parsed = nodeSchema.parse(data);
  const node = await db.node.create({
    data: {
      name: parsed.name,
      address: parsed.address,
      port: parsed.port,
      apiHost: parsed.apiHost,
      adminUuid: parsed.adminUuid || undefined,
      apiToken: parsed.apiToken || undefined,
      realityPubKey: parsed.realityPubKey || undefined,
      realityShortId: parsed.realityShortId || undefined,
      isActive: parsed.isActive,
    }
  });
  await regenerateMasterXrayConfig();
  revalidatePath('/admin/nodes');
  return node;
}

export async function updateNode(id: string, data: Partial<z.infer<typeof nodeSchema>>) {
  const parsed = nodeSchema.partial().parse(data);
  const updateData = { ...parsed };
  if (updateData.adminUuid === '') updateData.adminUuid = undefined;
  if (updateData.apiToken === '') updateData.apiToken = undefined;
  if (updateData.realityPubKey === '') updateData.realityPubKey = undefined;
  if (updateData.realityShortId === '') updateData.realityShortId = undefined;
  
  const node = await db.node.update({
    where: { id },
    data: updateData
  });
  await regenerateMasterXrayConfig();
  revalidatePath('/admin/nodes');
  return node;
}

export async function deleteNode(id: string) {
  await db.node.delete({ where: { id } });
  await regenerateMasterXrayConfig();
  revalidatePath('/admin/nodes');
}
