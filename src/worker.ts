/**
 * Legacy worker entrypoint kept as a thin compatibility wrapper around core.ts
 * so background stats, Xray reconciliation, and IPC logic live in one place.
 */
import {
  tick,
  syncToDbAndAggregate,
  calculateAggregations,
  compressHistory,
  createWorkerServer,
  startWorker,
  trafficState,
  uuidTrafficState,
  nodeStatusState,
  type TrafficState,
} from '@/core';

export {
  tick,
  syncToDbAndAggregate,
  calculateAggregations,
  compressHistory,
  createWorkerServer,
  startWorker,
  trafficState,
  uuidTrafficState,
  nodeStatusState,
  type TrafficState,
};

if (require.main === module || process.env.RUN_WORKER === 'true' || process.env.RUN_CORE === 'true') {
  startWorker();
}
