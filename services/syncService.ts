/**
 * Sync Service
 *
 * Implements bidirectional sync with backend:
 * - Device registration
 * - Pull changes from server (differential sync)
 * - Push local changes (batch operations)
 * - Conflict detection and resolution
 * - Initial data sync with ward filtering
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import uuid from "react-native-uuid";
import {
  getDatabase,
  getMetadata,
  isFirstLaunchWithOffline,
  markInitialSyncComplete,
  setMetadata,
} from "../database";
import {
  getPendingOperations,
  markOperationConflict,
  markOperationFailed,
  markOperationSyncing,
  removeOperation,
} from "../database/operationQueue";
import { apiClient } from "../utils/apiClient";

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingCount: number;
  error: string | null;
}

export interface SyncResult {
  success: boolean;
  successCount: number;
  conflictCount: number;
  errorCount: number;
  conflicts?: string[];
  errors?: string[];
}

interface SyncChangesResponse {
  serverTimestamp: string;
  users: any[];
  wards: any[];
  patients: any[];
  barcodes: any[];
  orders: any[];
  events: any[];
  deletions: {
    users: string[];
    wards: string[];
    patients: string[];
    barcodes: string[];
    orders: string[];
    events: string[];
  };
}

interface BatchSyncResponse {
  serverTimestamp: string;
  successCount: number;
  conflictCount: number;
  errorCount: number;
  results: {
    operationId: string;
    status: "success" | "conflict" | "error";
    entityId?: string;
    version?: number;
    conflictId?: string;
    error?: string;
  }[];
}

/**
 * Get or create device ID
 */
export async function getDeviceId(): Promise<string> {
  let deviceId = await getMetadata("device_id");

  if (!deviceId) {
    deviceId = uuid.v4() as string;
    await setMetadata("device_id", deviceId);
    console.log("📱 Generated new device ID:", deviceId);
  }

  return deviceId;
}

/**
 * Register device with backend
 */
export async function registerDevice(userId: string): Promise<void> {
  const deviceId = await getDeviceId();

  const deviceInfo = {
    deviceId,
    deviceName: `${Device.modelName || "Unknown Device"} - ${userId}`,
    deviceModel: Device.modelName || "Unknown",
    osVersion: `${Platform.OS} ${Platform.Version}`,
    appVersion: Constants.expoConfig?.version || "1.0.0",
  };

  try {
    await apiClient.post("/sync/register-device", deviceInfo);
    await setMetadata("device_registered", "true");
    console.log("✅ Device registered:", deviceInfo.deviceName);
  } catch (error) {
    console.error("❌ Device registration failed:", error);
    throw error;
  }
}

/**
 * Perform initial sync with ward filtering
 * Downloads all relevant data for the user's ward(s)
 */
export async function performInitialSync(wardId?: string): Promise<void> {
  console.log("🔄 Starting initial sync...");

  const deviceId = await getDeviceId();
  const since = "2000-01-01T00:00:00.000Z"; // Get all data

  try {
    // Build query params
    const params: any = {
      since,
      deviceId,
    };

    if (wardId) {
      params.wardId = wardId;
      console.log(`📍 Filtering by ward: ${wardId}`);
    }

    // Fetch all changes
    const response = await apiClient.get<SyncChangesResponse>("/sync/changes", {
      params,
    });
    const changes = response.data;

    // Apply changes to local database
    await applyServerChanges(changes);

    // Mark sync complete
    await markInitialSyncComplete(deviceId, changes.serverTimestamp);

    console.log("✅ Initial sync complete");
    console.log(`   Users: ${changes.users.length}`);
    console.log(`   Wards: ${changes.wards.length}`);
    console.log(`   Patients: ${changes.patients.length}`);
    console.log(`   Barcodes: ${changes.barcodes.length}`);
    console.log(`   Orders: ${changes.orders.length}`);
    console.log(`   Events: ${changes.events.length}`);

    // Verify wards were written to database
    const db = getDatabase();
    const wardCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM wards WHERE deleted_at IS NULL"
    );
    console.log(`   ✓ Verified ${wardCount?.count || 0} wards in local DB`);
  } catch (error) {
    console.error("❌ Initial sync failed:", error);
    throw error;
  }
}

/**
 * Pull changes from server since last sync
 */
export async function pullChanges(wardId?: string): Promise<void> {
  const deviceId = await getDeviceId();
  const lastSync = await getMetadata("last_sync_timestamp");

  if (!lastSync) {
    // No last sync - perform initial sync instead
    console.log("⚠️  No last sync timestamp found, performing initial sync");
    await performInitialSync(wardId);
    return;
  }

  try {
    const params: any = {
      since: lastSync,
      deviceId,
    };

    if (wardId) {
      params.wardId = wardId;
    }

    const response = await apiClient.get<SyncChangesResponse>("/sync/changes", {
      params,
    });
    const changes = response.data;

    await applyServerChanges(changes);
    await setMetadata("last_sync_timestamp", changes.serverTimestamp);

    console.log("✅ Pull sync complete");
  } catch (error) {
    console.error("❌ Pull sync failed:", error);
    throw error;
  }
}

/**
 * Push local changes to server
 */
export async function pushChanges(): Promise<SyncResult> {
  const deviceId = await getDeviceId();
  const operations = await getPendingOperations();

  if (operations.length === 0) {
    console.log("ℹ️  No pending operations to push");
    return {
      success: true,
      successCount: 0,
      conflictCount: 0,
      errorCount: 0,
    };
  }

  console.log(`🔄 Pushing ${operations.length} operations...`);

  // Mark all as syncing
  for (const op of operations) {
    await markOperationSyncing(op.operationId);
  }

  try {
    const response = await apiClient.post<BatchSyncResponse>("/sync/batch", {
      deviceId,
      operations: operations.map((op) => ({
        operationId: op.operationId,
        type: op.type,
        entityType: op.entityType,
        entityId: op.entityId,
        data: op.data,
        expectedVersion: op.expectedVersion,
      })),
    });

    const result = response.data;
    const conflicts: string[] = [];
    const errors: string[] = [];

    // Process results
    for (const r of result.results) {
      if (r.status === "success") {
        await removeOperation(r.operationId);

        // Update local version if provided
        if (r.version && r.entityId) {
          await updateLocalVersion(r.entityId, r.version);
        }
      } else if (r.status === "conflict") {
        await markOperationConflict(r.operationId, r.conflictId || "unknown");
        conflicts.push(`${r.operationId}: ${r.error}`);
      } else {
        await markOperationFailed(r.operationId, r.error || "Unknown error");
        errors.push(`${r.operationId}: ${r.error}`);
      }
    }

    // Update last sync timestamp
    await setMetadata("last_sync_timestamp", result.serverTimestamp);

    console.log("✅ Push sync complete");
    console.log(`   Success: ${result.successCount}`);
    console.log(`   Conflicts: ${result.conflictCount}`);
    console.log(`   Errors: ${result.errorCount}`);

    return {
      success: result.errorCount === 0,
      successCount: result.successCount,
      conflictCount: result.conflictCount,
      errorCount: result.errorCount,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    // Mark all operations as failed
    for (const op of operations) {
      await markOperationFailed(op.operationId, String(error));
    }

    console.error("❌ Push sync failed:", error);
    throw error;
  }
}

/**
 * Full bidirectional sync (pull then push)
 */
export async function syncWithServer(wardId?: string): Promise<SyncResult> {
  console.log("🔄 Starting full sync...");

  try {
    // Check if this is first launch with offline support
    const isFirstLaunch = await isFirstLaunchWithOffline();

    if (isFirstLaunch) {
      // Perform initial sync
      await performInitialSync(wardId);
    } else {
      // Pull latest changes first
      await pullChanges(wardId);
    }

    // Push local changes
    const result = await pushChanges();

    console.log("✅ Full sync complete");
    return result;
  } catch (error) {
    console.error("❌ Full sync failed:", error);
    throw error;
  }
}

/**
 * Apply server changes to local database
 */
async function applyServerChanges(changes: SyncChangesResponse): Promise<void> {
  const db = getDatabase();

  // Apply in transaction for consistency
  await db.withTransactionAsync(async () => {
    // Users
    for (const user of changes.users) {
      await db.runAsync(
        `INSERT OR REPLACE INTO users 
         (id, staff_id, name, role, is_active, version, deleted_at, last_modified_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.staffId,
          user.name,
          user.role,
          user.isActive ? 1 : 0,
          user.version,
          user.deletedAt || null,
          user.lastModifiedAt,
          user.createdAt,
        ]
      );
    }

    // Wards
    for (const ward of changes.wards) {
      await db.runAsync(
        `INSERT OR REPLACE INTO wards 
         (id, name, description, version, deleted_at, last_modified_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ward.id,
          ward.name,
          ward.description || null,
          ward.version,
          ward.deletedAt || null,
          ward.lastModifiedAt,
          ward.createdAt,
        ]
      );
    }

    // Patients
    for (const patient of changes.patients) {
      await db.runAsync(
        `INSERT OR REPLACE INTO patients 
         (id, name, photo, bed_number, diagnosis, ward_id, attending_doctor_id, attending_consultant_id,
          version, deleted_at, last_modified_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient.id,
          patient.name,
          patient.photo || null,
          patient.bedNumber || null,
          patient.diagnosis || null,
          patient.wardId || null,
          patient.attendingDoctorId || null,
          patient.attendingConsultantId || null,
          patient.version,
          patient.deletedAt || null,
          patient.lastModifiedAt,
          patient.createdAt,
        ]
      );
    }

    // Barcodes
    for (const barcode of changes.barcodes) {
      await db.runAsync(
        `INSERT OR REPLACE INTO barcodes 
         (id, barcode_id_string, status, patient_id, version, deleted_at, last_modified_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          barcode.id,
          barcode.barcodeIdString,
          barcode.status,
          barcode.patientId || null,
          barcode.version,
          barcode.deletedAt || null,
          barcode.lastModifiedAt,
          barcode.createdAt,
        ]
      );
    }

    // Orders
    for (const order of changes.orders) {
      await db.runAsync(
        `INSERT OR REPLACE INTO orders 
         (id, patient_id, prescriber_id, drug, dose, route, frequency, start_time, end_time, status,
          version, deleted_at, last_modified_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          order.patientId,
          order.prescriberId,
          order.drug,
          order.dose,
          order.route,
          order.frequency,
          order.startTime,
          order.endTime || null,
          order.status,
          order.version,
          order.deletedAt || null,
          order.lastModifiedAt,
          order.createdAt,
        ]
      );
    }

    // Events
    for (const event of changes.events) {
      await db.runAsync(
        `INSERT OR REPLACE INTO events 
         (id, order_id, patient_id, nurse_id, outcome, vitals_bp, vitals_hr, vitals_temp,
          vitals_spo2, vitals_pain_score, scanned_barcode_id, reason_code, reason_note,
          version, deleted_at, last_modified_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          event.orderId,
          event.patientId,
          event.nurseId,
          event.outcome,
          event.vitalsBp || null,
          event.vitalsHr || null,
          event.vitalsTemp || null,
          event.vitalsSpo2 || null,
          event.vitalsPain || null, // Backend uses vitalsPain, not vitalsPainScore
          event.scannedBarcodeId || null,
          event.reasonCode || null,
          event.reasonNote || null,
          event.version,
          event.deletedAt || null,
          event.lastModifiedAt,
          event.administeredAt || event.createdAt, // Backend uses administeredAt
        ]
      );
    }

    // Handle deletions
    for (const userId of changes.deletions.users) {
      await db.runAsync("DELETE FROM users WHERE id = ?", [userId]);
    }
    for (const wardId of changes.deletions.wards) {
      await db.runAsync("DELETE FROM wards WHERE id = ?", [wardId]);
    }
    for (const patientId of changes.deletions.patients) {
      await db.runAsync("DELETE FROM patients WHERE id = ?", [patientId]);
    }
    for (const barcodeId of changes.deletions.barcodes) {
      await db.runAsync("DELETE FROM barcodes WHERE id = ?", [barcodeId]);
    }
    for (const orderId of changes.deletions.orders) {
      await db.runAsync("DELETE FROM orders WHERE id = ?", [orderId]);
    }
    for (const eventId of changes.deletions.events) {
      await db.runAsync("DELETE FROM events WHERE id = ?", [eventId]);
    }
  });

  console.log("✅ Server changes applied to local database");
}

/**
 * Update local version after successful sync
 */
async function updateLocalVersion(
  entityId: string,
  version: number
): Promise<void> {
  const db = getDatabase();

  // Try each table until we find the entity
  const tables = ["users", "wards", "patients", "barcodes", "orders", "events"];

  for (const table of tables) {
    const result = await db.runAsync(
      `UPDATE ${table} SET version = ? WHERE id = ?`,
      [version, entityId]
    );

    if (result.changes > 0) {
      console.log(`✅ Updated version for ${table}:${entityId} to ${version}`);
      break;
    }
  }
}
