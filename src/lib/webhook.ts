import { getSettings } from '@/lib/settings';

interface SubscriptionWebhookPayload {
  event: 'subscription.created' | 'subscription.updated' | 'subscription.deleted';
  subscription: {
    id: string;
    name?: string | null;
    userId?: string;
    userName?: string | null;
    userEmail?: string | null;
    uuids?: string[];
  };
}

export async function sendSubscriptionWebhook(payload: SubscriptionWebhookPayload): Promise<void> {
  const settings = await getSettings();
  const endpoint = settings.WEBHOOK_URL ? settings.WEBHOOK_URL.trim() : '';
  const tokenList = (settings.WEBHOOK_TOKEN || settings.SERVICE_TOKENS || '').split(/[\n,]+/).map((t) => t.trim()).filter(Boolean);
  const token = tokenList[0] || '';

  if (!endpoint) return;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      // Timeout after 3 seconds so server actions/routes never block
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      console.warn(`[Subscription Webhook] Analytics responded with HTTP ${res.status}`);
    }
  } catch (err: any) {
    // Non-fatal, log warning (catch-up sync on analytics will recover)
    console.warn(`[Subscription Webhook Warning]: Failed to notify analytics at ${endpoint}:`, err.message || err);
  }
}
