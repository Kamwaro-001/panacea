/**
 * Network Monitor
 *
 * Monitors network connectivity changes and triggers sync when online
 */

import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { syncWithServer } from "../services/syncService";
import { getPendingOperationCount } from "../database/operationQueue";

type NetworkListener = (isConnected: boolean) => void;
type SyncStatusListener = (status: SyncStatus) => void;

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingCount: number;
  error: string | null;
}

let networkListeners: NetworkListener[] = [];
let syncStatusListeners: SyncStatusListener[] = [];
let currentSyncStatus: SyncStatus = {
  isSyncing: false,
  lastSyncTime: null,
  pendingCount: 0,
  error: null,
};

let isInitialized = false;
let isSyncing = false;
let syncTimer: NodeJS.Timeout | null = null;
let backoffDelay = 5000; // Start with 5 seconds
const MAX_BACKOFF_DELAY = 300000; // Max 5 minutes

/**
 * Initialize network monitoring
 */
export function initNetworkMonitor(wardId?: string): () => void {
  if (isInitialized) {
    console.warn("Network monitor already initialized");
    return () => {};
  }

  isInitialized = true;
  console.log("📡 Initializing network monitor...");

  // Subscribe to network state changes
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const isConnected =
      state.isConnected && state.isInternetReachable !== false;

    console.log(
      `📡 Network status changed: ${isConnected ? "ONLINE" : "OFFLINE"}`
    );

    // Notify listeners
    networkListeners.forEach((listener) => listener(isConnected));

    // Trigger sync if now online
    if (isConnected && !isSyncing) {
      scheduleSyncWithBackoff(wardId);
    }
  });

  // Check initial network state
  NetInfo.fetch().then((state) => {
    const isConnected =
      state.isConnected && state.isInternetReachable !== false;
    console.log(
      `📡 Initial network status: ${isConnected ? "ONLINE" : "OFFLINE"}`
    );

    if (isConnected) {
      scheduleSyncWithBackoff(wardId);
    }
  });

  // Return cleanup function
  return () => {
    unsubscribe();
    if (syncTimer) {
      clearTimeout(syncTimer);
    }
    isInitialized = false;
    networkListeners = [];
    syncStatusListeners = [];
  };
}

/**
 * Schedule sync with exponential backoff
 */
function scheduleSyncWithBackoff(wardId?: string): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    performSync(wardId);
  }, backoffDelay);

  console.log(`⏱️  Sync scheduled in ${backoffDelay / 1000}s`);
}

/**
 * Perform sync and handle backoff
 */
async function performSync(wardId?: string): Promise<void> {
  if (isSyncing) {
    console.log("⏭️  Sync already in progress, skipping");
    return;
  }

  isSyncing = true;
  updateSyncStatus({ isSyncing: true, error: null });

  try {
    console.log("🔄 Starting sync...");

    // Update pending count
    const pendingCount = await getPendingOperationCount();
    updateSyncStatus({ pendingCount });

    // Perform sync
    const result = await syncWithServer(wardId);

    // Sync successful
    backoffDelay = 5000; // Reset backoff
    updateSyncStatus({
      isSyncing: false,
      lastSyncTime: new Date(),
      pendingCount: 0,
      error: null,
    });

    console.log("✅ Sync completed successfully");

    if (result.conflictCount > 0) {
      console.warn(`⚠️  ${result.conflictCount} conflicts detected`);
    }
  } catch (error) {
    console.error("❌ Sync failed:", error);

    // Increase backoff delay
    backoffDelay = Math.min(backoffDelay * 2, MAX_BACKOFF_DELAY);

    updateSyncStatus({
      isSyncing: false,
      error: error instanceof Error ? error.message : "Sync failed",
    });

    // Schedule retry
    const networkState = await NetInfo.fetch();
    if (networkState.isConnected) {
      scheduleSyncWithBackoff(wardId);
    }
  } finally {
    isSyncing = false;
  }
}

/**
 * Manually trigger sync
 */
export async function triggerSync(wardId?: string): Promise<void> {
  const networkState = await NetInfo.fetch();

  if (!networkState.isConnected) {
    throw new Error("No internet connection");
  }

  return performSync(wardId);
}

/**
 * Subscribe to network status changes
 */
export function onNetworkStatusChange(listener: NetworkListener): () => void {
  networkListeners.push(listener);

  // Return unsubscribe function
  return () => {
    networkListeners = networkListeners.filter((l) => l !== listener);
  };
}

/**
 * Subscribe to sync status changes
 */
export function onSyncStatusChange(listener: SyncStatusListener): () => void {
  syncStatusListeners.push(listener);

  // Send current status immediately
  listener(currentSyncStatus);

  // Return unsubscribe function
  return () => {
    syncStatusListeners = syncStatusListeners.filter((l) => l !== listener);
  };
}

/**
 * Update sync status and notify listeners
 */
function updateSyncStatus(updates: Partial<SyncStatus>): void {
  currentSyncStatus = {
    ...currentSyncStatus,
    ...updates,
  };

  syncStatusListeners.forEach((listener) => listener(currentSyncStatus));
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return { ...currentSyncStatus };
}

/**
 * Get current network status
 */
export async function getNetworkStatus(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable !== false;
}
