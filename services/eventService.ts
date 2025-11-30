/**
 * Event Service - Medication Administration Events
 *
 * Critical offline functionality for nurses to record medication
 * administrations without connectivity. Uses optimistic updates
 * and queues for sync.
 */

import { AdministrationEvent, CreateEventPayload } from "@/types";
import NetInfo from "@react-native-community/netinfo";
import { getDatabase } from "../database";
import { generateUUID, queueOperation } from "../database/operationQueue";
import { apiClient } from "../utils/apiClient";

export interface AdministrationEventData {
  orderId: string;
  patientId: string;
  nurseId: string;
  outcome: "given" | "delayed" | "not_given" | "refused";
  vitalsBp?: string;
  vitalsHr?: string;
  vitalsTemp?: string;
  vitalsSpo2?: string;
  vitalsPain?: string;
  scannedBarcodeId?: string;
  reasonCode?: string;
  reasonNote?: string;
}

/**
 * Record medication administration - CRITICAL OFFLINE FUNCTIONALITY
 * This must work offline for nurses in the field
 */
export async function recordAdministration(
  eventData: AdministrationEventData
): Promise<AdministrationEvent> {
  const eventId = generateUUID();
  const now = new Date().toISOString();

  const event: AdministrationEvent = {
    id: eventId,
    ...eventData,
    administeredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    lastModifiedAt: new Date(),
  };

  try {
    // Save to local database immediately (optimistic update)
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO events 
       (id, order_id, patient_id, nurse_id, outcome, vitals_bp, vitals_hr, vitals_temp,
        vitals_spo2, vitals_pain_score, scanned_barcode_id, version, deleted_at, last_modified_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        eventData.orderId,
        eventData.patientId,
        eventData.nurseId,
        eventData.outcome,
        eventData.vitalsBp || null,
        eventData.vitalsHr || null,
        eventData.vitalsTemp || null,
        eventData.vitalsSpo2 || null,
        eventData.vitalsPain || null,
        eventData.scannedBarcodeId || null,
        1,
        null,
        now,
        now,
      ]
    );

    // Queue for sync
    const syncData: CreateEventPayload = {
      id: eventId,
      orderId: eventData.orderId,
      patientId: eventData.patientId,
      outcome: eventData.outcome,
      vitalsBp: eventData.vitalsBp,
      vitalsHr: eventData.vitalsHr,
      vitalsTemp: eventData.vitalsTemp,
      vitalsSpo2: eventData.vitalsSpo2,
      vitalsPain: eventData.vitalsPain,
      scannedBarcodeId: eventData.scannedBarcodeId,
      reasonCode: eventData.reasonCode,
      reasonNote: eventData.reasonNote,
    };

    await queueOperation("create", "event", eventId, syncData);

    console.log(`✅ Medication administration recorded offline: ${eventId}`);
    console.log(`   Patient: ${eventData.patientId}`);
    console.log(`   Order: ${eventData.orderId}`);
    console.log(`   Outcome: ${eventData.outcome}`);

    // Try to sync immediately if online (but don't block)
    const networkState = await NetInfo.fetch();
    if (networkState.isConnected) {
      attemptImmediateSync(eventId, syncData).catch((err) =>
        console.warn("Immediate sync failed, will retry later:", err)
      );
    }

    return event;
  } catch (error) {
    console.error("Failed to record administration:", error);
    throw error;
  }
}

/**
 * Attempt immediate sync (best effort, non-blocking)
 */
async function attemptImmediateSync(eventId: string, data: any): Promise<void> {
  try {
    await apiClient.post("/events/administer", data);
    console.log(`✅ Administration event synced immediately: ${eventId}`);
  } catch (error) {
    // Silently fail, will be synced in next batch
    console.warn("Immediate sync failed:", error);
  }
}

/**
 * Get administration events for a patient
 */
export async function getAdministrationEvents(
  patientId: string
): Promise<AdministrationEvent[]> {
  try {
    const db = getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM events 
       WHERE patient_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [patientId]
    );

    return rows.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      patientId: row.patient_id,
      nurseId: row.nurse_id,
      outcome: row.outcome,
      vitalsBp: row.vitals_bp || undefined,
      vitalsHr: row.vitals_hr || undefined,
      vitalsTemp: row.vitals_temp || undefined,
      vitalsSpo2: row.vitals_spo2 || undefined,
      vitalsPain: row.vitals_pain_score || undefined,
      scannedBarcodeId: row.scanned_barcode_id || undefined,
      reasonCode: row.reason_code || undefined,
      reasonNote: row.reason_note || undefined,
      administeredAt: new Date(row.created_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.last_modified_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      version: row.version,
      lastModifiedAt: new Date(row.last_modified_at),
    }));
  } catch (error) {
    console.error("Failed to get administration events:", error);
    // Fallback to API
    const response = await apiClient.get("/events", {
      params: { patientId },
    });
    return response.data;
  }
}

/**
 * Get administration events for an order
 */
export async function getAdministrationEventsByOrder(
  orderId: string
): Promise<AdministrationEvent[]> {
  try {
    const db = getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM events 
       WHERE order_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [orderId]
    );

    return rows.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      patientId: row.patient_id,
      nurseId: row.nurse_id,
      outcome: row.outcome,
      vitalsBp: row.vitals_bp || undefined,
      vitalsHr: row.vitals_hr || undefined,
      vitalsTemp: row.vitals_temp || undefined,
      vitalsSpo2: row.vitals_spo2 || undefined,
      vitalsPain: row.vitals_pain_score || undefined,
      scannedBarcodeId: row.scanned_barcode_id || undefined,
      reasonCode: row.reason_code || undefined,
      reasonNote: row.reason_note || undefined,
      administeredAt: new Date(row.created_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.last_modified_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      version: row.version,
      lastModifiedAt: new Date(row.last_modified_at),
    }));
  } catch (error) {
    console.error("Failed to get administration events:", error);
    throw error;
  }
}
