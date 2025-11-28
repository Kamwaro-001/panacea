/**
 * Operation Queue Management
 *
 * Manages pending CRUD operations for sync with retry logic,
 * UUID generation, and version tracking for optimistic locking
 */

import uuid from "react-native-uuid";
import { getDatabase } from "./index";
import { PendingOperationRow } from "./schema";

export interface QueueOperation {
  operationId: string;
  type: "create" | "update" | "delete";
  entityType: "user" | "ward" | "patient" | "barcode" | "order" | "event";
  entityId: string;
  data: any;
  expectedVersion?: number;
}

/**
 * Add operation to sync queue
 */
export async function queueOperation(
  type: "create" | "update" | "delete",
  entityType: "user" | "ward" | "patient" | "barcode" | "order" | "event",
  entityId: string,
  data: any,
  expectedVersion?: number
): Promise<string> {
  const db = getDatabase();
  const operationId = uuid.v4() as string;

  await db.runAsync(
    `INSERT INTO pending_operations 
     (operation_id, type, entity_type, entity_id, data, expected_version, created_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      operationId,
      type,
      entityType,
      entityId,
      JSON.stringify(data),
      expectedVersion || null,
      Date.now(),
      "pending",
    ]
  );

  console.log(`📝 Queued ${type} operation for ${entityType}:${entityId}`);
  return operationId;
}

/**
 * Get all pending operations for sync
 */
export async function getPendingOperations(): Promise<QueueOperation[]> {
  const db = getDatabase();

  const rows = await db.getAllAsync<PendingOperationRow>(
    `SELECT * FROM pending_operations 
     WHERE status IN ('pending', 'failed') 
     AND retry_count < 5
     ORDER BY created_at ASC`
  );

  return rows.map((row) => ({
    operationId: row.operation_id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    data: JSON.parse(row.data),
    expectedVersion: row.expected_version || undefined,
  }));
}

/**
 * Get count of pending operations
 */
export async function getPendingOperationCount(): Promise<number> {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pending_operations 
     WHERE status IN ('pending', 'failed')`
  );
  return result?.count || 0;
}

/**
 * Mark operation as syncing
 */
export async function markOperationSyncing(operationId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    "UPDATE pending_operations SET status = ? WHERE operation_id = ?",
    ["syncing", operationId]
  );
}

/**
 * Remove successfully synced operation from queue
 */
export async function removeOperation(operationId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync("DELETE FROM pending_operations WHERE operation_id = ?", [
    operationId,
  ]);
  console.log(`✅ Removed synced operation: ${operationId}`);
}

/**
 * Mark operation as failed and increment retry count
 */
export async function markOperationFailed(
  operationId: string,
  error: string
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE pending_operations 
     SET status = ?, retry_count = retry_count + 1, last_error = ?
     WHERE operation_id = ?`,
    ["failed", error, operationId]
  );
  console.warn(`⚠️  Operation failed: ${operationId} - ${error}`);
}

/**
 * Mark operation as conflict (requires manual resolution)
 */
export async function markOperationConflict(
  operationId: string,
  conflictId: string
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE pending_operations 
     SET status = ?, last_error = ?
     WHERE operation_id = ?`,
    ["conflict", `Conflict ID: ${conflictId}`, operationId]
  );
  console.warn(
    `⚠️  Operation conflict: ${operationId} (Conflict ID: ${conflictId})`
  );
}

/**
 * Get operations with conflicts
 */
export async function getConflictedOperations(): Promise<QueueOperation[]> {
  const db = getDatabase();

  const rows = await db.getAllAsync<PendingOperationRow>(
    `SELECT * FROM pending_operations 
     WHERE status = 'conflict'
     ORDER BY created_at ASC`
  );

  return rows.map((row) => ({
    operationId: row.operation_id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    data: JSON.parse(row.data),
    expectedVersion: row.expected_version || undefined,
  }));
}

/**
 * Clear all operations (use with caution)
 */
export async function clearAllOperations(): Promise<void> {
  const db = getDatabase();
  await db.runAsync("DELETE FROM pending_operations");
  console.log("🗑️  All pending operations cleared");
}

/**
 * Generate UUID for new entities
 */
export function generateUUID(): string {
  return uuid.v4() as string;
}
