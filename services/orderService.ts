import { MedicationOrder } from "@/types";
import { apiClient } from "@/utils/apiClient";
import NetInfo from "@react-native-community/netinfo";
import { getDatabase } from "../database";
import {
  getOrdersByPatientLocal,
  rowToMedicationOrder,
} from "../database/helpers";
import { queueOperation, generateUUID } from "../database/operationQueue";
import { OrderRow } from "../database/schema";

/**
 * Get orders by patient - offline-first
 */
export const getOrdersByPatient = async (
  patientId: string
): Promise<MedicationOrder[]> => {
  try {
    // Always read from local database first
    const localOrders = await getOrdersByPatientLocal(patientId);

    // Try to sync with API in background (non-blocking)
    const networkState = await NetInfo.fetch();
    if (networkState.isConnected) {
      // Background sync - updates cache but doesn't block return
      fetchAndCacheOrders(patientId).catch((err) =>
        console.warn("Background orders sync failed:", err)
      );
    }

    // Always return local data for consistent offline-first behavior
    return localOrders;
  } catch (error) {
    console.error("Failed to get orders from local DB:", error);
    // Only if local DB completely fails, try API as last resort
    try {
      const response = await apiClient.get("/orders", {
        params: { patientId },
      });
      return response.data;
    } catch (apiError) {
      console.error("API fallback also failed:", apiError);
      return []; // Return empty array as last resort
    }
  }
};

/**
 * Background fetch and cache orders
 */
async function fetchAndCacheOrders(
  patientId: string
): Promise<MedicationOrder[]> {
  try {
    const response = await apiClient.get("/orders", {
      params: { patientId },
    });

    const db = getDatabase();
    for (const order of response.data) {
      await db.runAsync(
        `INSERT OR REPLACE INTO orders 
         (id, patient_id, prescriber_id, drug, dose, route, frequency, start_time, end_time, status,
          version, deleted_at, last_modified_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          order.patientId,
          order.prescriberId || null,
          order.drug,
          order.dose,
          order.route,
          order.frequency,
          order.startTime,
          order.endTime || null,
          order.status,
          order.version || 1,
          null,
          order.lastModifiedAt || new Date().toISOString(),
          order.createdAt || new Date().toISOString(),
        ]
      );
    }
    return response.data;
  } catch (error) {
    console.warn("Background fetch failed:", error);
    return [];
  }
}

/**
 * Create order - offline-first with optimistic updates
 */
export const createOrder = async (
  orderData: Partial<MedicationOrder>
): Promise<MedicationOrder> => {
  const orderId = generateUUID();
  const now = new Date().toISOString();

  const newOrder: MedicationOrder = {
    id: orderId,
    patientId: orderData.patientId || "",
    prescriberId: orderData.prescriberId || "",
    drug: orderData.drug || "",
    dose: orderData.dose || "",
    route: orderData.route || "",
    frequency: orderData.frequency || "",
    startTime: orderData.startTime || new Date(),
    endTime: orderData.endTime,
    status: orderData.status || "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    lastModifiedAt: new Date(),
  };

  try {
    // Save to local database immediately
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO orders 
       (id, patient_id, prescriber_id, drug, dose, route, frequency, start_time, end_time, status,
        version, deleted_at, last_modified_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        newOrder.patientId,
        newOrder.prescriberId,
        newOrder.drug,
        newOrder.dose,
        newOrder.route,
        newOrder.frequency,
        newOrder.startTime.toISOString(),
        newOrder.endTime?.toISOString() || null,
        newOrder.status,
        1,
        null,
        now,
        now,
      ]
    );

    // Queue for sync
    await queueOperation("create", "order", orderId, orderData);

    console.log(`✅ Order created locally: ${orderId}`);
    return newOrder;
  } catch (error) {
    console.error("Failed to create order:", error);
    throw error;
  }
};

/**
 * Update order - offline-first with version tracking
 */
export const updateOrder = async (
  orderId: string,
  orderData: Partial<MedicationOrder>
): Promise<MedicationOrder> => {
  try {
    const db = getDatabase();
    const current = await db.getFirstAsync<OrderRow>(
      "SELECT * FROM orders WHERE id = ?",
      [orderId]
    );

    if (!current) {
      throw new Error("Order not found in local database");
    }

    // Update local database immediately
    const updates: string[] = [];
    const values: any[] = [];

    if (orderData.drug !== undefined) {
      updates.push("drug = ?");
      values.push(orderData.drug);
    }
    if (orderData.dose !== undefined) {
      updates.push("dose = ?");
      values.push(orderData.dose);
    }
    if (orderData.route !== undefined) {
      updates.push("route = ?");
      values.push(orderData.route);
    }
    if (orderData.frequency !== undefined) {
      updates.push("frequency = ?");
      values.push(orderData.frequency);
    }
    if (orderData.status !== undefined) {
      updates.push("status = ?");
      values.push(orderData.status);
    }
    if (orderData.endTime !== undefined) {
      updates.push("end_time = ?");
      values.push(orderData.endTime?.toISOString() || null);
    }

    updates.push("last_modified_at = ?");
    values.push(new Date().toISOString());
    values.push(orderId);

    await db.runAsync(
      `UPDATE orders SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    // Queue for sync
    await queueOperation(
      "update",
      "order",
      orderId,
      orderData,
      current.version
    );

    // Return updated order
    const updated = await db.getFirstAsync<OrderRow>(
      "SELECT * FROM orders WHERE id = ?",
      [orderId]
    );

    if (!updated) {
      throw new Error("Failed to get updated order");
    }

    console.log(`✅ Order updated locally: ${orderId}`);
    return rowToMedicationOrder(updated);
  } catch (error) {
    console.error("Failed to update order:", error);
    throw error;
  }
};

/**
 * Stop order - offline-first
 */
export const stopOrder = async (orderId: string): Promise<MedicationOrder> => {
  return updateOrder(orderId, { status: "stopped", endTime: new Date() });
};
