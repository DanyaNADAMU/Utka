'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import crypto from 'crypto';
import { generateMasterNodeConfigSnippet, generateNodeConfigSnippet, generateRealityKeypair } from '@/lib/xrayConfig';

const nodeSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  port: z.coerce.number().int().positive().default(443),
  xrayPort: z.coerce.number().int().positive().default(8443),
  apiHost: z.string().optional(),
  adminUuid: z.string().optional(),
  realityServerName: z.string().optional(),
  realityPubKey: z.string().optional(),
  realityPrivKey: z.string().optional(),
  realityShortId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function createNode(data: z.infer<typeof nodeSchema>) {
  const parsed = nodeSchema.parse(data);
  
  const isLocal = parsed.address === '127.0.0.1' || parsed.address === 'localhost';

  // Auto-generate UUID if not provided
  const adminUuid = parsed.adminUuid && parsed.adminUuid.trim() !== '' ? parsed.adminUuid.trim() : crypto.randomUUID();

  // Auto-generate shortId if not provided
  const realityShortId = parsed.realityShortId && parsed.realityShortId.trim() !== ''
    ? parsed.realityShortId.trim()
    : crypto.randomBytes(4).toString('hex');

  // Auto-generate REALITY keypair if pub or priv key is missing
  let realityPubKey = parsed.realityPubKey?.trim();
  let realityPrivKey = parsed.realityPrivKey?.trim();

  if (!realityPubKey || !realityPrivKey) {
    const keypair = generateRealityKeypair();
    realityPubKey = keypair.publicKey;
    realityPrivKey = keypair.privateKey;
  }

  const node = await db.node.create({
    data: {
      name: parsed.name,
      address: parsed.address,
      port: parsed.port,
      xrayPort: parsed.xrayPort,
      apiHost: isLocal ? 'unix:///app/xray/api.sock' : 'pending',
      adminUuid,
      realityServerName: parsed.realityServerName || '',
      realityPubKey,
      realityPrivKey,
      realityShortId,
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

  revalidatePath('/admin/nodes');
  return node;
}

export async function updateNode(id: string, data: Partial<z.infer<typeof nodeSchema>>) {
  const existingNode = await db.node.findUnique({ where: { id } });
  const masterApiHost = process.env.XRAY_API_URL || 'unix:///app/xray/api.sock';
  const isMaster = existingNode?.isMaster || existingNode?.apiHost === masterApiHost;

  const parsed = nodeSchema.partial().parse(data);
  const updateData: any = { ...parsed };

  if (updateData.adminUuid === '') updateData.adminUuid = crypto.randomUUID();
  if (updateData.realityShortId === '') updateData.realityShortId = crypto.randomBytes(4).toString('hex');
  
  if (updateData.realityPubKey === '' || updateData.realityPrivKey === '') {
    const keypair = generateRealityKeypair();
    updateData.realityPubKey = keypair.publicKey;
    updateData.realityPrivKey = keypair.privateKey;
  }

  if (isMaster) {
    updateData.apiHost = masterApiHost;
    updateData.isMaster = true;
  } else if (updateData.address) {
    const isLocal = updateData.address === '127.0.0.1' || updateData.address === 'localhost';
    updateData.apiHost = isLocal ? masterApiHost : `unix:///app/xray/node-${id}.sock`;
  }

  const node = await db.node.update({
    where: { id },
    data: updateData
  });

  revalidatePath('/admin/nodes');
  return node;
}

export async function deleteNode(id: string) {
  const node = await db.node.findUnique({ where: { id } });
  const masterApiHost = process.env.XRAY_API_URL || 'unix:///app/xray/api.sock';
  if (node?.isMaster || node?.apiHost === masterApiHost) {
    throw new Error('Master node cannot be deleted');
  }
  await db.node.delete({ where: { id } });
  revalidatePath('/admin/nodes');
}

export async function saveNodeInboundSettings(id: string, inboundSettingsJson: string) {
  await db.node.update({
    where: { id },
    data: { inboundSettings: inboundSettingsJson }
  });
  revalidatePath(`/admin/nodes/${id}`);
  revalidatePath('/admin/nodes');
}

export async function getNodeConfigInstructions(id: string) {
  const node = await db.node.findUnique({ where: { id } });
  if (!node) throw new Error('Node not found');

  const masterSnippets = generateMasterNodeConfigSnippet(node);
  const nodeSnippets = generateNodeConfigSnippet(node);

  return {
    node,
    masterSnippets,
    nodeSnippets,
  };
}

import { syncNodeUsers } from '@/lib/xray';

export async function syncNodeUsersAction(id: string) {
  const result = await syncNodeUsers(id);
  revalidatePath(`/admin/nodes/${id}`);
  return result;
}

