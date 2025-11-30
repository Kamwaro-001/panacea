import { Ward } from "@/types";
import { apiClient } from "@/utils/apiClient";
import NetInfo from "@react-native-community/netinfo";
import { getDatabase } from "../database";
import { getAllWardsLocal, getWardByIdLocal } from "../database/helpers";

/**
 * Get all wards - offline-first
 */
export const getWards = async (): Promise<Ward[]> => {
  try {
    console.log("🏥 Ward service: Reading wards from local DB...");
    // Always read from local database first
    const localWards = await getAllWardsLocal();
    console.log(`🏥 Ward service: Returning ${localWards.length} local wards`);

    // Try to fetch from API in background
    const networkState = await NetInfo.fetch();
    if (networkState.isConnected) {
      console.log("🌐 Ward service: Triggering background sync...");
      fetchAndCacheWards().catch((err) =>
        console.warn("⚠️ Background sync failed:", err)
      );
    }

    return localWards;
  } catch (error) {
    console.error("❌ Failed to get wards from local DB:", error);
    // Fallback to API
    const response = await apiClient.get("/wards");
    return response.data;
  }
};

/**
 * Get ward by ID - offline-first
 */
export const getWardById = async (wardId: string): Promise<Ward> => {
  try {
    // Try local database first
    const localWard = await getWardByIdLocal(wardId);

    if (localWard) {
      // Fetch updated data in background
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        fetchAndCacheWardById(wardId).catch((err) =>
          console.warn("Background sync failed:", err)
        );
      }

      return localWard;
    }

    // Not in local DB, fetch from API
    const response = await apiClient.get(`/wards/${wardId}`);
    await cacheWard(response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to get ward:", error);
    throw error;
  }
};

/**
 * Background fetch and cache all wards
 */
async function fetchAndCacheWards(): Promise<void> {
  try {
    const response = await apiClient.get("/wards");

    const db = getDatabase();
    for (const ward of response.data) {
      await cacheWard(ward);
    }
  } catch (error) {
    console.warn("Background fetch failed:", error);
  }
}

/**
 * Background fetch and cache single ward
 */
async function fetchAndCacheWardById(wardId: string): Promise<void> {
  try {
    const response = await apiClient.get(`/wards/${wardId}`);
    await cacheWard(response.data);
  } catch (error) {
    console.warn("Background fetch failed:", error);
  }
}

/**
 * Cache ward in local database
 */
async function cacheWard(ward: any): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO wards 
     (id, name, description, version, deleted_at, last_modified_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      ward.id,
      ward.name,
      ward.description || null,
      ward.version || 1,
      null,
      ward.lastModifiedAt || new Date().toISOString(),
      ward.createdAt || new Date().toISOString(),
    ]
  );
}
