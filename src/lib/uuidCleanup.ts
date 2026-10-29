import db from '@/lib/db';
import { removeVlessUser } from '@/lib/xray';

export interface CleanupResult {
  totalExpired: number;
  cleaned: number;
  errors: number;
}

/**
 * Periodically cleans up expired UUIDs from Xray inbounds and the database.
 * Moved from the hot subscription route into background worker execution.
 */
export async function cleanupExpiredUuids(
  database = db,
  removeUserFn: typeof removeVlessUser = removeVlessUser
): Promise<CleanupResult> {
  const result: CleanupResult = {
    totalExpired: 0,
    cleaned: 0,
    errors: 0
  };

  try {
    const now = new Date();
    const expiredUuids = await database.expiringUuid.findMany({
      where: { expiresAt: { lte: now } },
      include: { node: true }
    });

    result.totalExpired = expiredUuids.length;
    if (result.totalExpired === 0) {
      return result;
    }

    console.log(`[Worker] Found ${result.totalExpired} expired UUID(s) to clean up`);

    for (const exp of expiredUuids) {
      try {
        const apiHost = exp.node ? exp.node.apiHost : 'unix:///app/xray/api.sock';
        await removeUserFn(apiHost, exp.inboundTag, exp.xrayEmail);
        await database.expiringUuid.delete({ where: { id: exp.id } });
        result.cleaned += 1;
      } catch (err) {
        console.error(`[Worker] Failed to clean up expired UUID ${exp.xrayUuid}:`, err);
        result.errors += 1;
      }
    }
  } catch (err) {
    console.error("[Worker] Error querying expired UUIDs:", err);
    result.errors += 1;
  }

  return result;
}
