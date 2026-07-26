import db from '@/lib/db';

export const DEFAULT_SETTINGS = {
  SUB_PATH: '/[token]',
  XRAY_INBOUND_TAG: 'vless-reality',
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;

export async function getSetting(key: SettingKey): Promise<string> {
  const setting = await db.setting.findUnique({ where: { key } });
  return setting?.value ?? DEFAULT_SETTINGS[key];
}

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const settings = await db.setting.findMany();
  const settingsMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  return {
    SUB_PATH: settingsMap.SUB_PATH ?? DEFAULT_SETTINGS.SUB_PATH,
    XRAY_INBOUND_TAG: settingsMap.XRAY_INBOUND_TAG ?? DEFAULT_SETTINGS.XRAY_INBOUND_TAG,
  };
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
