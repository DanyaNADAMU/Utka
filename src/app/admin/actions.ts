'use server'

import { auth } from '@/auth';
import { setSetting, SettingKey, getSettings } from '@/lib/settings';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

export async function saveSettings(formData: FormData) {
  const session = await auth();
  
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const subPath = formData.get('SUB_PATH') as string;
  const inboundTag = formData.get('XRAY_INBOUND_TAG') as string;
  const expireMinutes = formData.get('OLD_UUID_EXPIRE_MINUTES') as string;

  if (subPath) await setSetting('SUB_PATH', subPath);
  if (inboundTag) await setSetting('XRAY_INBOUND_TAG', inboundTag);
  if (expireMinutes && !isNaN(Number(expireMinutes))) {
    await setSetting('OLD_UUID_EXPIRE_MINUTES', expireMinutes);
  }

  revalidatePath('/admin/settings');
  revalidatePath('/'); // Revalidate dashboard to update the sub link
}

export async function getXrayConfig() {
  const session = await auth();
  
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const configPath = path.join(process.cwd(), 'xray', 'config.json');
    const data = await fs.readFile(configPath, 'utf-8');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
