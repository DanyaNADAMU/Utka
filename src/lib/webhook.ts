// Helper for pushing real-time subscription webhook updates to trusted services (e.g., NadamuAnalytics)

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
  const analyticsUrl = process.env.NADAMU_ANALYTICS_URL || 'http://127.0.0.1:8005';
  const token = (process.env.SERVICE_TOKENS || process.env.API_SERVICE_TOKEN || '').split(',')[0]?.trim();

  if (!analyticsUrl) return;

  const endpoint = `${analyticsUrl.replace(/\/+$/, '')}/api/v1/subscriptions/webhook`;

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
