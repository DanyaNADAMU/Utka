import { NextResponse } from 'next/server';
import { processSubscription } from '@/lib/subscriptionHandler';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const reqUrl = new URL(request.url);

  // If standalone dash-sub is configured, proxy request to it
  const subUrl = process.env.SUB_URL;
  if (subUrl && process.env.EMBEDDED_SUB !== 'true') {
    try {
      const targetUrl = `${subUrl}${reqUrl.pathname}${reqUrl.search}`;
      const forwardHeaders = new Headers(request.headers);

      const subRes = await fetch(targetUrl, {
        method: 'GET',
        headers: forwardHeaders,
        redirect: 'manual',
      });

      const responseHeaders = new Headers();
      subRes.headers.forEach((value, key) => {
        responseHeaders.set(key, value);
      });

      const body = await subRes.arrayBuffer();
      return new NextResponse(body, {
        status: subRes.status,
        headers: responseHeaders,
      });
    } catch (proxyError) {
      console.warn('[SUB PROXY] Failed to forward to SUB_URL, falling back to local handler:', proxyError);
    }
  }

  // Fallback / local handling
  const headerMap: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headerMap[key] = value;
  });

  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';

  const result = await processSubscription({
    url: request.url,
    slug,
    headers: headerMap,
    clientIp,
  });

  return new NextResponse(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
