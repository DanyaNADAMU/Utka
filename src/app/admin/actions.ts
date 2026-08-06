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

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string' && !key.startsWith('$ACTION_ID_')) {
      if (key === 'OLD_UUID_EXPIRE_MINUTES') {
        if (!isNaN(Number(value)) && value.trim() !== '') {
          await setSetting(key, value);
        }
      } else {
        await setSetting(key, value);
      }
    }
  }

  revalidatePath('/admin/settings');
  revalidatePath('/'); // Revalidate dashboard to update the sub link
}

import { getClientInboundTags } from '@/lib/xray';

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
    const tags = await getClientInboundTags();
    const fallbackData = JSON.stringify({
      note: "Xray configuration is managed via gRPC API.",
      activeInboundTags: tags
    }, null, 2);
    return { success: true, data: fallbackData };
  }
}
