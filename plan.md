# Traffic Tracking by UUID

We need to track traffic statistics on a per-UUID basis in addition to per-subscription. The user has authorized a complete wipe of existing traffic and UUID history to accommodate this architectural change.

## User Review Required
> [!WARNING]
> This plan includes a full wipe of all existing traffic history and UUID history data for all users, as requested. Are you sure you want to proceed with deleting this data?

## Proposed Changes

### Database Schema (`prisma/schema.prisma`)
- [NEW] Add `UuidTrafficLog` model.
- [NEW] Add `UuidTrafficHistory` model.
- Both will link to `Subscription` and store traffic per `xrayUuid`.

### Backend Daemon (`src/lib/trafficDaemon.ts` & `src/lib/xray.ts`)
- [MODIFY] `src/lib/xray.ts`: Add `queryAllUserStats` to fetch all user stats in a single gRPC call instead of looping over subscriptions.
- [MODIFY] `src/lib/trafficDaemon.ts`: 
  - Change to use `queryAllUserStats`.
  - Maintain `trafficState` and aggregations for both `subId` and `xrayUuid`.
  - On flush, save to both `TrafficLog`/`TrafficHistory` and `UuidTrafficLog`/`UuidTrafficHistory`.
  - Compress both histories at midnight.

### API (`src/app/api/admin/traffic/route.ts`)
- [MODIFY] Add support for fetching traffic by `xrayUuid`.

### Frontend
- [MODIFY] `src/components/TrafficTableUI.tsx`: Rename "Sum" to "Total".
- [MODIFY] `src/app/admin/users/[id]/page.tsx`: Remove "(Live)" from the traffic table title.
- [MODIFY] `src/components/UuidHistoryViewer.tsx`: Add columns for "Speed", "1 Hour Traffic", and "All Time Traffic" by fetching real-time data from the traffic API for each UUID.
- [NEW] `src/app/admin/users/uuid/[xrayUuid]/page.tsx`: Create a new dedicated page for a single UUID showing its details (associated user, subscription, tags, status) and a full TrafficTableUI for that specific UUID.

## Verification Plan
1. Run script to wipe `UuidHistory`, `TrafficLog`, and `TrafficHistory`.
2. Apply Prisma schema changes and restart the application.
3. Verify that traffic is collected per UUID and per Subscription simultaneously.
4. Verify the UI updates correctly show the new traffic columns in the UUID History table.
5. Verify the new UUID details page works correctly.
