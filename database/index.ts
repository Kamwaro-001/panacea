/**
 * SQLite Database Initialization and Management
 *
 * Handles database creation, migrations, and provides connection interface
 */

import * as SQLite from "expo-sqlite";
import { DATABASE_NAME, DATABASE_VERSION, SCHEMA_SQL } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize database and run migrations
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  try {
    // Open database
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Check current version
    const currentVersion = await getDatabaseVersion(db);

    if (currentVersion === 0) {
      // First time setup
      console.log("📦 Creating database schema...");
      await db.execAsync(SCHEMA_SQL);
      await setDatabaseVersion(db, DATABASE_VERSION);
      console.log("✅ Database schema created");
    } else if (currentVersion < DATABASE_VERSION) {
      // Run migrations
      console.log(
        `🔄 Migrating database from v${currentVersion} to v${DATABASE_VERSION}...`
      );
      await runMigrations(db, currentVersion, DATABASE_VERSION);
      await setDatabaseVersion(db, DATABASE_VERSION);
      console.log("✅ Database migration complete");
    } else {
      console.log(`✅ Database ready (v${currentVersion})`);
    }

    return db;
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

/**
 * Get database instance (must call initDatabase first)
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log("🔒 Database closed");
  }
}

/**
 * Get current database version from metadata
 */
async function getDatabaseVersion(
  database: SQLite.SQLiteDatabase
): Promise<number> {
  try {
    const result = await database.getFirstAsync<{ value: string }>(
      "SELECT value FROM device_metadata WHERE key = ?",
      ["database_version"]
    );
    return result ? parseInt(result.value, 10) : 0;
  } catch {
    // Table doesn't exist yet, this is first run
    return 0;
  }
}

/**
 * Set database version in metadata
 */
async function setDatabaseVersion(
  database: SQLite.SQLiteDatabase,
  version: number
): Promise<void> {
  await database.runAsync(
    "INSERT OR REPLACE INTO device_metadata (key, value) VALUES (?, ?)",
    ["database_version", version.toString()]
  );
}

/**
 * Run database migrations (currently none, but structure for future)
 */
async function runMigrations(
  database: SQLite.SQLiteDatabase,
  fromVersion: number,
  toVersion: number
): Promise<void> {
  // Future migrations will go here
  // Example:
  // if (fromVersion < 2) {
  //   await database.execAsync('ALTER TABLE users ADD COLUMN new_field TEXT');
  // }
  console.log(`No migrations needed from v${fromVersion} to v${toVersion}`);
}

/**
 * Clear all local data (for logout or data reset)
 */
export async function clearAllData(): Promise<void> {
  const database = getDatabase();

  await database.execAsync(`
    DELETE FROM events;
    DELETE FROM orders;
    DELETE FROM barcodes;
    DELETE FROM patients;
    DELETE FROM wards;
    DELETE FROM users;
    DELETE FROM pending_operations;
  `);

  // Clear sync metadata to force initial sync on next login
  await database.runAsync(
    "DELETE FROM device_metadata WHERE key IN (?, ?, ?)",
    ["last_sync_timestamp", "initial_sync_complete", "last_sync_changes"]
  );

  // Keep device_id so the device remains registered but force re-sync

  console.log("🗑️  All local data cleared");
}

/**
 * Get metadata value
 */
export async function getMetadata(key: string): Promise<string | null> {
  const database = getDatabase();
  const result = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM device_metadata WHERE key = ?",
    [key]
  );
  return result ? result.value : null;
}

/**
 * Set metadata value
 */
export async function setMetadata(key: string, value: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    "INSERT OR REPLACE INTO device_metadata (key, value) VALUES (?, ?)",
    [key, value]
  );
}

/**
 * Check if this is first launch with offline support or data was cleared
 * Returns true if initial sync is needed (no last sync timestamp)
 */
export async function isFirstLaunchWithOffline(): Promise<boolean> {
  try {
    const lastSync = await getMetadata("last_sync_timestamp");
    console.log("🔍 Checking first launch - last_sync_timestamp:", lastSync);
    // If no last sync timestamp, we need initial sync regardless of device_id
    // This handles both first launch AND post-logout scenarios
    const needsInitialSync = !lastSync;
    console.log("🔍 Needs initial sync:", needsInitialSync);
    return needsInitialSync;
  } catch (error) {
    console.log("🔍 Error checking first launch, assuming true:", error);
    return true;
  }
}

/**
 * Mark initial sync as complete
 */
export async function markInitialSyncComplete(
  deviceId: string,
  timestamp: string
): Promise<void> {
  await setMetadata("device_id", deviceId);
  await setMetadata("last_sync_timestamp", timestamp);
  await setMetadata("initial_sync_complete", "true");
  console.log("✅ Initial sync marked complete");
}
