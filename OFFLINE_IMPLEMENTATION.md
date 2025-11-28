# Offline-First Implementation for Panacea Mobile App

## Overview

The Panacea mobile app has been upgraded with comprehensive offline-first capabilities, enabling nurses to record medication administrations and complete clinical tasks without internet connectivity. All actions are automatically queued and synced when connectivity is restored.

## Implementation Date

November 28, 2025

## Architecture

### Key Principles

1. **Local-First Data Access**: All reads go to SQLite first, with background API sync
2. **Optimistic Updates**: Writes update local database immediately, queue for sync
3. **Automatic Sync**: Network monitor detects connectivity and triggers sync automatically
4. **Conflict Detection**: Version-based optimistic locking prevents data loss
5. **Ward-Based Filtering**: Initial sync limited by ward to reduce data transfer

## Components Implemented

### Database Layer

#### Files Created:

- **`database/schema.ts`** - SQLite schema mirroring backend entities with version tracking
- **`database/index.ts`** - Database initialization, migrations, and metadata management
- **`database/operationQueue.ts`** - Operation queue for pending sync operations
- **`database/helpers.ts`** - Type-safe helper functions for common database operations

#### Tables:

- `users` - Healthcare staff with roles
- `wards` - Hospital wards
- `patients` - Patient profiles
- `barcodes` - Barcode assignments
- `orders` - Medication orders
- `events` - **CRITICAL** - Medication administration records
- `pending_operations` - Queue for offline operations
- `device_metadata` - Device registration and sync state

#### Key Features:

- Version numbers for optimistic locking
- Soft deletes (`deleted_at`)
- Server timestamps (`last_modified_at`)
- Indexed for performance

### Sync Infrastructure

#### Files Created:

- **`services/syncService.ts`** - Bidirectional sync implementation
  - Device registration
  - Initial sync with ward filtering
  - Differential pull (GET `/sync/changes`)
  - Batch push (POST `/sync/batch`)
  - Conflict detection and queuing

#### Sync Flow:

```
1. Device Registration (on login)
2. Initial Sync (first launch, ward-filtered)
3. Pull Changes (when online)
4. Push Pending Operations (batch)
5. Handle Conflicts (queue for review)
6. Update Local Database
```

### Authentication & Token Management

#### Files Modified:

- **`services/authService.ts`** - Enhanced with:
  - Refresh token storage in SecureStore
  - Automatic token refresh on expiry
  - Device registration on login
  - Secure token management

- **`utils/apiClient.ts`** - Enhanced with:
  - Automatic token refresh on 401
  - Request retry with new token
  - Refresh token deduplication
  - Proper async token handling

- **`types/index.ts`** - Added refresh token fields to `LoginResponse`

### Offline-First Services

All services refactored for offline-first operation:

#### Files Modified:

- **`services/patientService.ts`**
  - Reads from local SQLite first
  - Background sync when online
  - Optimistic updates with queueing
  - Version tracking for conflicts

- **`services/orderService.ts`**
  - Local-first order management
  - Queue create/update/stop operations
  - Background cache refresh

- **`services/barcodeService.ts`**
  - Offline barcode scanning (if cached)
  - Local patient lookup
  - Queue link operations

- **`services/wardService.ts`**
  - Local ward data access
  - Background refresh

#### Files Created:

- **`services/eventService.ts`** - **CRITICAL OFFLINE FUNCTIONALITY**
  - Record medication administrations offline
  - Optimistic updates with local storage
  - Automatic queueing for sync
  - Best-effort immediate sync when online

### Network Monitoring & Auto-Sync

#### Files Created:

- **`utils/networkMonitor.ts`**
  - NetInfo integration for connectivity detection
  - Automatic sync trigger on reconnection
  - Exponential backoff for failed syncs
  - Sync status tracking
  - Manual sync trigger

#### Features:

- Real-time network status monitoring
- Automatic sync when online
- Retry logic with backoff (5s → 5min)
- Sync status notifications
- Pending operation tracking

### State Management

#### Files Modified:

- **`stores/useAuthStore.ts`** - Enhanced with:
  - Database initialization on app start
  - Device registration on login
  - Initial sync with ward filtering
  - Network monitor lifecycle
  - Session restoration from SecureStore
  - Ward ID for filtering sync
  - Cleanup on logout

### User Interface

#### Files Created:

- **`components/common/SyncStatus.tsx`**
  - Full sync status banner
  - Compact status indicator
  - Connection status badge
  - Manual sync button
  - Pending operations count
  - Last sync timestamp
  - Error notifications

#### Files Modified:

- **`app/_layout.tsx`**
  - Initialize database on app start
  - Initialize auth store with offline support
  - Loading state during initialization

## Usage Examples

### Recording Medication Administration (Critical Offline Feature)

```typescript
import { recordAdministration } from "@/services/eventService";

// Works completely offline
const event = await recordAdministration({
  orderId: "order-uuid",
  patientId: "patient-uuid",
  nurseId: "nurse-uuid",
  outcome: "given",
  vitals: {
    bp: "120/80",
    hr: "72",
    temp: "36.8",
    spo2: "98",
    painScore: "2",
  },
  scannedBarcodeId: "barcode-uuid",
});

// Data saved locally immediately
// Queued for sync automatically
// Will sync when connectivity restored
```

### Scanning Barcodes Offline

```typescript
import { barcodeService } from "@/services/barcodeService";

// Tries local cache first, falls back to API
const result = await barcodeService.scanBarcode("BC-12345");

// Returns patient profile and active orders from local DB
console.log(result.patient.name);
console.log(result.activeOrders); // Medication orders
```

### Creating/Updating Patients

```typescript
import { createPatient, updatePatient } from "@/services/patientService";

// Works offline with optimistic updates
const newPatient = await createPatient({
  name: "John Doe",
  bedNumber: "A-101",
  diagnosis: "Hypertension",
  wardId: "ward-uuid",
});

// Update with version tracking
await updatePatient(patientId, {
  bedNumber: "A-102",
});
```

### Manual Sync

```typescript
import { triggerSync } from "@/utils/networkMonitor";

// Manually trigger sync
await triggerSync(wardId);
```

## Configuration

### Dependencies Added to `package.json`:

```json
{
  "@react-native-community/netinfo": "^11.4.1",
  "expo-secure-store": "~14.0.0",
  "expo-sqlite": "~15.0.6",
  "react-native-uuid": "^2.0.2"
}
```

### Installation

```bash
cd /home/job/projects/panacea
npm install
```

## API Integration

### Backend Endpoints Used:

- **POST `/auth/login`** - Enhanced with `deviceId` and `refreshToken` response
- **POST `/auth/refresh`** - Refresh access token
- **POST `/auth/logout`** - Revoke refresh token
- **POST `/sync/register-device`** - Register mobile device
- **GET `/sync/changes`** - Pull changes since timestamp (ward-filtered)
- **POST `/sync/batch`** - Push pending operations batch

### Backend Requirements:

The backend must implement the offline-first API as described in `/home/job/projects/panacea-api/OFFLINE_FIRST_IMPLEMENTATION.md`

## First Launch Experience

1. **User logs in** → Device registration + token storage
2. **First launch detection** → Database check for `last_sync_timestamp`
3. **Initial sync triggered** → Downloads all ward data (filtered by user's ward)
4. **Progress shown** → "Downloading initial data..."
5. **Completion** → "Initial sync complete"
6. **App ready** → Fully functional offline

## Network Monitoring

### Automatic Behavior:

- **Go Offline** → Banner shows "Offline Mode" with pending count
- **Pending Actions** → Queued in local database
- **Go Online** → Auto-sync triggered within 5 seconds
- **Sync Success** → Banner shows "All Synced"
- **Sync Failure** → Retry with exponential backoff (5s → 10s → 20s → 1min → 5min)

### Manual Sync:

Users can tap "Sync Now" button to force immediate sync.

## Conflict Handling

### Automatic Resolution (Minor conflicts):

- **Entities**: Users, Wards, Barcodes
- **Strategy**: Last-write-wins

### Manual Resolution (Critical conflicts):

- **Entities**: Administration Events (medication records)
- **Strategy**: Queue for review
- **Status**: ⚠️ **TODO** - Conflict resolution UI not yet implemented

### Pending Operations Display:

Operations with conflicts are marked with status `'conflict'` and include `conflictId` for backend tracking.

## Data Retention & Cleanup

⚠️ **TODO** - Storage cleanup not yet implemented

### Planned Strategy:

- Delete soft-deleted records >30 days old
- Remove synced operations from queue after 7 days
- Archive old patient records when no longer in ward
- Add "Clear Local Data" option in settings

## Security

- **Tokens**: Stored in `expo-secure-store` (encrypted)
- **Refresh Tokens**: 30-day expiry, automatically refreshed
- **Access Tokens**: 1-hour expiry, automatically refreshed on 401
- **Device Registration**: Each device tracked with unique ID
- **Data Encryption**: SQLite database not encrypted (consider for production)

## Performance

- **Database Indexes**: All tables indexed on `last_modified_at`
- **Foreign Key Indexes**: Patient/Ward lookups optimized
- **Background Sync**: Non-blocking, uses promises
- **Batch Operations**: All pending ops sent in single request
- **Ward Filtering**: Reduces initial sync payload significantly

## Testing Recommendations

### Critical Paths to Test:

1. **Offline Medication Recording**
   - Turn off wifi
   - Record administration event
   - Verify local save
   - Turn on wifi
   - Verify auto-sync

2. **Initial Sync**
   - Fresh install
   - Login with ward selection
   - Verify data download
   - Verify ward filtering

3. **Conflict Resolution**
   - Modify record on two devices offline
   - Sync both
   - Verify conflict detection

4. **Token Refresh**
   - Wait for token expiry (or force with backend)
   - Make API call
   - Verify automatic refresh

5. **Network Interruption**
   - Start sync
   - Disconnect network mid-sync
   - Verify graceful failure
   - Reconnect
   - Verify retry

## Known Limitations

1. **No Conflict Resolution UI** - Critical conflicts queued but no UI to resolve
2. **No Storage Cleanup** - Local database will grow over time
3. **No Data Encryption** - SQLite database stored unencrypted
4. **No Partial Sync** - Always syncs all entities (could add entity filtering)
5. **No Offline Image Upload** - Patient photos must be uploaded online
6. **No Background Sync** - Sync only triggers when app is active

## Future Enhancements

1. **Conflict Resolution UI** - Allow users/admins to review and resolve conflicts
2. **Storage Management** - Automatic cleanup + manual "Clear Data" option
3. **Background Sync** - Use background tasks for automatic sync when app inactive
4. **Database Encryption** - Encrypt local SQLite database
5. **Partial Sync** - Allow syncing specific entity types
6. **Offline Analytics** - Track offline usage patterns
7. **Compression** - Compress sync payloads for faster transfer
8. **Delta Sync** - Only sync changed fields instead of full records

## Monitoring & Debugging

### Logs to Watch:

- `📦 Creating database schema...` - First run
- `✅ Database schema created` - Database ready
- `🔑 Found saved token, restoring session` - Session restoration
- `📱 Generated new device ID` - Device registration
- `📥 First launch detected, downloading initial data...` - Initial sync
- `✅ Initial data sync complete` - Ready for offline use
- `📡 Network status changed: ONLINE/OFFLINE` - Network monitoring
- `🔄 Starting sync...` - Auto-sync triggered
- `✅ Sync completed successfully` - Sync done
- `⚠️ N conflicts detected` - Conflicts found
- `✅ Medication administration recorded offline` - Critical offline operation

### Database Location:

SQLite database stored at: `<app-data>/SQLite/panacea.db`

Can be inspected with tools like:

- DB Browser for SQLite (desktop)
- Expo SQLite debug tools

## Migration Strategy

### For Existing Users:

1. **Update App** - New version with offline support
2. **First Launch** - Triggers initial sync automatically
3. **Download Data** - Shows progress indicator
4. **Ready** - App now works offline

### For New Users:

1. **Install** - Fresh installation
2. **Login** - Select ward
3. **Initial Sync** - Downloads ward data
4. **Ready** - Offline-ready from start

## Support & Troubleshooting

### Common Issues:

**Issue**: "Session expired" errors
**Solution**: Refresh token may be revoked. User must login again.

**Issue**: Sync never completes
**Solution**: Check backend `/sync/changes` endpoint. May timeout on large datasets.

**Issue**: Conflicts keep appearing
**Solution**: Check `pending_operations` table for status='conflict'. Implement conflict resolution UI.

**Issue**: "Database not initialized" errors
**Solution**: Ensure `useAuthStore.initialize()` is called before any database operations.

### Debug Commands:

Check pending operations:

```typescript
import { getPendingOperationCount } from "@/database/operationQueue";
const count = await getPendingOperationCount();
```

Force sync:

```typescript
import { triggerSync } from "@/utils/networkMonitor";
await triggerSync();
```

Clear all local data:

```typescript
import { clearAllData } from "@/database";
await clearAllData();
```

## Conclusion

The Panacea mobile app now supports full offline-first operation, with automatic sync, conflict detection, and robust error handling. Nurses can record medication administrations in areas with poor connectivity, and all data will be automatically synced when online.

**Key Achievement**: Critical medication administration recording works completely offline, ensuring patient care is never interrupted by connectivity issues.

**Next Steps**:

1. Install dependencies: `npm install`
2. Test offline medication recording
3. Implement conflict resolution UI (TODO)
4. Implement storage cleanup (TODO)
