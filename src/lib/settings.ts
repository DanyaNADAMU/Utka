import db from '@/lib/db';

export const DEFAULT_SETTINGS = {
  SUB_PATH: '/[token]',
  OLD_UUID_EXPIRE_MINUTES: '2031',
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
    OLD_UUID_EXPIRE_MINUTES: settingsMap.OLD_UUID_EXPIRE_MINUTES ?? DEFAULT_SETTINGS.OLD_UUID_EXPIRE_MINUTES,
  };
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
