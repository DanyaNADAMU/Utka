export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { syncTraffic } = await import('./lib/cron');
    
    // Sync traffic every 60 seconds
    setInterval(() => {
      syncTraffic().catch(console.error);
    }, 60000);
  }
}
