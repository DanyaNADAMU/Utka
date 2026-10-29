/**
 * Sub Client: Provides healthcheck and communication utilities with the standalone dash-sub service.
 */

export interface SubHealthInfo {
  status: string;
  uptime?: number;
  service?: string;
  error?: string;
}

export async function checkSubHealth(): Promise<SubHealthInfo> {
  if (process.env.EMBEDDED_SUB === 'true') {
    return { status: 'embedded', uptime: Math.floor(process.uptime()), service: 'dash-sub-embedded' };
  }

  const subUrl = process.env.SUB_URL || 'http://127.0.0.1:8008';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${subUrl}/health`, {
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        status: data.status || 'ok',
        uptime: data.uptime,
        service: data.service || 'dash-sub'
      };
    }
    return { status: 'unhealthy', error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { status: 'unavailable', error: err?.message || 'Connection refused' };
  }
}
