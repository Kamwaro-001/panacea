# Quick Start Guide - Offline-First Development

## Installation

```bash
cd /home/job/projects/panacea
npm install
```

## Running the App

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Key Concepts

### 1. Local-First Reading

Always read from local database first, sync in background:

```typescript
// ✅ Good - Offline-first
const patients = await getPatientsByWardLocal(wardId);

// ❌ Bad - Online-only
const response = await apiClient.get("/patients");
```

### 2. Optimistic Updates

Update local database immediately, queue for sync:

```typescript
// Save locally
await db.runAsync("INSERT INTO patients ...", [data]);

// Queue for sync
await queueOperation("create", "patient", id, data);

// Return immediately (don't wait for API)
return patient;
```

### 3. Background Sync

Let network monitor handle sync automatically:

```typescript
// Fetch in background (non-blocking)
fetchAndCacheData().catch((err) => console.warn("Sync failed:", err));
```

## Common Patterns

### Recording Critical Data (Medication Administration)

```typescript
import { recordAdministration } from "@/services/eventService";

// Works 100% offline
const event = await recordAdministration({
  orderId: "uuid",
  patientId: "uuid",
  nurseId: "uuid",
  outcome: "given",
  vitals: { bp: "120/80", hr: "72" },
});
```

### Creating Records Offline

```typescript
import { generateUUID, queueOperation } from "@/database/operationQueue";
import { getDatabase } from "@/database";

const id = generateUUID();
const db = getDatabase();

// 1. Save locally
await db.runAsync("INSERT INTO table ...", [id, ...data]);

// 2. Queue for sync
await queueOperation("create", "entityType", id, data);

// 3. Return immediately
return { id, ...data };
```

### Updating Records with Version Tracking

```typescript
// 1. Get current version
const current = await db.getFirstAsync(
  "SELECT version FROM table WHERE id = ?",
  [id]
);

// 2. Update locally
await db.runAsync("UPDATE table SET ... WHERE id = ?", [...data, id]);

// 3. Queue with version
await queueOperation("update", "entityType", id, data, current.version);
```

### Checking Network Status

```typescript
import { getNetworkStatus } from "@/utils/networkMonitor";

const isOnline = await getNetworkStatus();
if (isOnline) {
  // Perform online-only operation
}
```

### Manual Sync

```typescript
import { triggerSync } from "@/utils/networkMonitor";

try {
  await triggerSync(wardId);
  console.log("Sync complete");
} catch (error) {
  console.error("Sync failed:", error);
}
```

## Database Helpers

### Query Local Data

```typescript
import {
  getPatientsByWardLocal,
  getPatientByIdLocal,
  getOrdersByPatientLocal,
  getActiveOrdersByPatientLocal,
  getAllWardsLocal,
  getBarcodeByStringLocal,
} from "@/database/helpers";

// Get patients in ward
const patients = await getPatientsByWardLocal("ward-uuid");

// Get single patient
const patient = await getPatientByIdLocal("patient-uuid");

// Get orders
const orders = await getOrdersByPatientLocal("patient-uuid");
const activeOrders = await getActiveOrdersByPatientLocal("patient-uuid");

// Get wards
const wards = await getAllWardsLocal();

// Lookup barcode
const barcode = await getBarcodeByStringLocal("BC-12345");
```

### Direct Database Access

```typescript
import { getDatabase } from '@/database';

const db = getDatabase();

// Query
const rows = await db.getAllAsync<RowType>(
  'SELECT * FROM table WHERE condition = ?',
  [param]
);

// Single row
const row = await db.getFirstAsync<RowType>(
  'SELECT * FROM table WHERE id = ?',
  [id]
);

// Insert/Update
await db.runAsync(
  'INSERT INTO table (col1, col2) VALUES (?, ?)',
  [val1, val2]
);

// Transaction
await db.withTransactionAsync(async () => {
  await db.runAsync(...);
  await db.runAsync(...);
});
```

## UI Components

### Sync Status Banner

```tsx
import { SyncStatusBanner } from '@/components/common/SyncStatus';

// Full banner
<SyncStatusBanner />

// Compact version
<SyncStatusBanner compact />
```

### Connection Indicator

```tsx
import { ConnectionIndicator } from "@/components/common/SyncStatus";

// Shows "OFFLINE" badge when disconnected
<ConnectionIndicator />;
```

## Debugging

### View Pending Operations

```typescript
import {
  getPendingOperations,
  getPendingOperationCount,
} from "@/database/operationQueue";

const count = await getPendingOperationCount();
const ops = await getPendingOperations();

console.log(`Pending: ${count}`, ops);
```

### View Conflicts

```typescript
import { getConflictedOperations } from "@/database/operationQueue";

const conflicts = await getConflictedOperations();
console.log("Conflicts:", conflicts);
```

### Check Database State

```typescript
import { getDatabase } from "@/database";

const db = getDatabase();

// Count records
const counts = {
  patients: await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM patients"
  ),
  orders: await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM orders"
  ),
  events: await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM events"
  ),
  pending: await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM pending_operations"
  ),
};

console.log("Database state:", counts);
```

### Clear All Data (Logout)

```typescript
import { clearAllData } from "@/database";

await clearAllData();
```

### Force Re-Sync

```typescript
import { setMetadata } from "@/database";
import { triggerSync } from "@/utils/networkMonitor";

// Reset last sync timestamp
await setMetadata("last_sync_timestamp", "2000-01-01T00:00:00.000Z");

// Trigger full sync
await triggerSync();
```

## Testing Offline Behavior

### Simulate Offline Mode

```typescript
// In development, you can use:
import NetInfo from "@react-native-community/netinfo";

// Force offline
NetInfo.configure({
  reachabilityUrl: "https://invalid.test",
  reachabilityTest: async () => false,
  reachabilityShortTimeout: 5,
  reachabilityLongTimeout: 60,
  reachabilityRequestTimeout: 15,
  reachabilityShouldRun: () => true,
});
```

Or use device settings:

- **Android**: Settings → Network → Airplane mode
- **iOS**: Settings → Airplane mode
- **Expo**: Shake device → Toggle "Fast Refresh" (doesn't affect network, use device settings)

## Common Errors

### "Database not initialized"

**Cause**: Tried to access DB before initialization
**Fix**: Ensure `useAuthStore.initialize()` is called in app root

### "No token available"

**Cause**: Token not found in SecureStore
**Fix**: User needs to login

### "Session expired"

**Cause**: Refresh token expired or revoked
**Fix**: User must login again

### "Sync failed"

**Cause**: Network error or backend unavailable
**Fix**: Will retry automatically with backoff

### "Conflict detected"

**Cause**: Version mismatch on update
**Fix**: Conflict queued for manual resolution (TODO: UI not implemented)

## Best Practices

1. **Always use helpers** - Use `database/helpers.ts` functions instead of raw SQL
2. **Never block UI** - Queue operations, return immediately
3. **Background sync** - Let network monitor handle sync
4. **Error handling** - Catch and log, don't crash
5. **Version tracking** - Always pass `expectedVersion` on updates
6. **Ward filtering** - Use ward ID in sync to reduce data transfer
7. **Optimistic UI** - Show local data, update in background

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                 Mobile App                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐         ┌──────────┐             │
│  │   UI     │────────→│  Stores  │             │
│  └──────────┘         └──────────┘             │
│       ↓                     ↓                    │
│  ┌──────────────────────────────────┐           │
│  │         Services                  │           │
│  │  (Offline-First Logic)           │           │
│  └──────────────────────────────────┘           │
│       ↓                     ↓                    │
│  ┌──────────┐         ┌──────────┐             │
│  │ SQLite DB│         │ API Client│             │
│  │  (Local) │         │ (Backend) │             │
│  └──────────┘         └──────────┘             │
│       ↑                     ↑                    │
│  ┌──────────────────────────────────┐           │
│  │      Sync Service                │           │
│  │  (Bidirectional Sync)            │           │
│  └──────────────────────────────────┘           │
│       ↑                                          │
│  ┌──────────────────────────────────┐           │
│  │   Network Monitor                │           │
│  │  (Auto-Sync Trigger)             │           │
│  └──────────────────────────────────┘           │
│                                                  │
└─────────────────────────────────────────────────┘
```

## File Structure

```
panacea/
├── database/
│   ├── schema.ts          # SQLite schema definitions
│   ├── index.ts           # DB initialization & migrations
│   ├── operationQueue.ts  # Pending operations queue
│   └── helpers.ts         # Type-safe query helpers
├── services/
│   ├── syncService.ts     # Bidirectional sync
│   ├── authService.ts     # Auth with refresh tokens
│   ├── eventService.ts    # Medication events (CRITICAL)
│   ├── patientService.ts  # Patient CRUD (offline-first)
│   ├── orderService.ts    # Order CRUD (offline-first)
│   ├── barcodeService.ts  # Barcode scanning (offline-first)
│   └── wardService.ts     # Ward management (offline-first)
├── stores/
│   └── useAuthStore.ts    # Auth state + offline init
├── utils/
│   ├── apiClient.ts       # API client with token refresh
│   └── networkMonitor.ts  # Network status + auto-sync
├── components/common/
│   └── SyncStatus.tsx     # Sync status UI
└── app/
    └── _layout.tsx        # App initialization
```

## Next Steps

1. **Install dependencies**: `npm install`
2. **Test offline recording**: Record medication administration offline
3. **Implement conflict UI**: See TODO in `OFFLINE_IMPLEMENTATION.md`
4. **Implement cleanup**: See TODO in `OFFLINE_IMPLEMENTATION.md`
5. **Monitor logs**: Watch for sync errors in production

## Support

For questions or issues, refer to:

- `OFFLINE_IMPLEMENTATION.md` - Full implementation details
- `/home/job/projects/panacea-api/OFFLINE_FIRST_IMPLEMENTATION.md` - Backend spec
- Console logs - Verbose logging enabled for debugging
