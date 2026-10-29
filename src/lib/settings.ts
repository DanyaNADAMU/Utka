import db from '@/lib/db';

export const DEFAULT_SETTINGS = {
  SUB_PATH: '/[token]',
  OLD_UUID_EXPIRE_MINUTES: '2031',
  WEBHOOK_URL: process.env.WEBHOOK_URL || (process.env.NADAMU_ANALYTICS_URL ? `${process.env.NADAMU_ANALYTICS_URL.replace(/\/+$/, '')}/api/v1/subscriptions/webhook` : 'https://example.com/api/v1/subscriptions/webhook'),
  WEBHOOK_TOKEN: process.env.WEBHOOK_TOKEN || process.env.NADAMU_ANALYTICS_TOKEN || '',
  SERVICE_TOKENS: process.env.SERVICE_TOKENS || process.env.API_SERVICE_TOKEN || '',
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS | string;

export async function getSetting(key: SettingKey): Promise<string> {
  try {
    const setting = await db.setting.findUnique({ where: { key } });
    return setting?.value ?? (DEFAULT_SETTINGS as any)[key] ?? '';
  } catch {
    return (DEFAULT_SETTINGS as any)[key] ?? '';
  }
}

export async function getSettings(): Promise<Record<string, string>> {
  try {
    const settings = await db.setting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return {
      ...DEFAULT_SETTINGS,
      ...settingsMap,
    };
  } catch {
    return {
      ...DEFAULT_SETTINGS,
    };
  }
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
