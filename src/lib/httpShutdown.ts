import type http from 'http';

/**
 * Closes an HTTP server gracefully, resolving once active requests finish or
 * after `timeoutMs` elapses (closing idle sockets first when supported).
 */
export function closeHttpServerGracefully(
  server: http.Server,
  timeoutMs: number = 5000
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };

    const timer = setTimeout(() => {
      server.closeAllConnections?.();
      finish();
    }, timeoutMs);
    timer.unref?.();

    server.close(() => {
      finish();
    });
    server.closeIdleConnections?.();
  });
}
