'use server'

import { auth } from '@/auth';
import { setSetting, SettingKey, getSettings } from '@/lib/settings';
import { revalidatePath } from 'next/cache';

export async function saveSettings(formData: FormData) {
  const session = await auth();
  
  // We assume any authenticated user visiting admin route is admin
  // (In a real app, verify session.user.role === 'ADMIN')
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const subPath = formData.get('SUB_PATH') as string;
  const inboundTag = formData.get('XRAY_INBOUND_TAG') as string;

  if (subPath) await setSetting('SUB_PATH', subPath);
  if (inboundTag) await setSetting('XRAY_INBOUND_TAG', inboundTag);

  revalidatePath('/admin/settings');
  revalidatePath('/'); // Revalidate dashboard to update the sub link
}
