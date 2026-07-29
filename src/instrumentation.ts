export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startDaemon } = await import('./lib/trafficDaemon');
    startDaemon();
  }
}
