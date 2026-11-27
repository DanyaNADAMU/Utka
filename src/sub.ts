import http from 'http';
import { processSubscription } from '@/lib/subscriptionHandler';
import { getConfigIniContent } from '@/lib/clashConfig';
import { closeHttpServerGracefully } from '@/lib/httpShutdown';
import db from '@/lib/db';

/**
 * Creates the HTTP server for dash-sub service
 */
export function createSubServer() {
  return http.createServer(async (req, res) => {
    try {
      const host = req.headers.host || 'localhost';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const fullUrl = new URL(req.url || '/', `${protocol}://${host}`);
      const pathname = fullUrl.pathname;

      // 1. Healthcheck endpoint
      if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            uptime: Math.floor(process.uptime()),
            service: 'utka-sub',
            timestamp: Date.now(),
          })
        );
        return;
      }

      // 2. Clash configuration file endpoint
      if (pathname === '/config.ini' || pathname === '/api/config.ini') {
        const content = await getConfigIniContent();
        res.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store, max-age=0',
        });
        res.end(content);
        return;
      }

      // 3. Subscription processing
      const slug = pathname.split('/').filter(Boolean);
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

      const result = await processSubscription({
        url: fullUrl.toString(),
        slug,
        headers: req.headers,
        clientIp,
      });

      res.writeHead(result.status, result.headers);
      res.end(result.body);
    } catch (err) {
      console.error('[Sub Service Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
}

/**
 * Starts the standalone dash-sub subscription server
 */
export function startSubServer() {
  console.log('[Utka-Sub] Starting Utka Subscription Service...');
  const port = Number(process.env.SUB_PORT) || 8008;
  const host = process.env.SUB_HOST || '0.0.0.0';

  const server = createSubServer();
  server.listen(port, host, () => {
    console.log(`[Sub] Subscription service listening on http://${host}:${port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[Sub] Received ${signal}. Shutting down gracefully...`);
    await closeHttpServerGracefully(server);
    console.log('[Sub] HTTP server closed.');
    try {
      await db.$disconnect();
    } catch {}
    console.log('[Sub] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { server, shutdown };
}

// Auto-start if executed as main script
if (require.main === module || process.env.RUN_SUB === 'true') {
  startSubServer();
}
