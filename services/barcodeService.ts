import { ApiError, PatientProfile, ScannedBarcodeResponse } from "@/types";
import { apiClient } from "@/utils/apiClient";
import NetInfo from "@react-native-community/netinfo";
import { AxiosError } from "axios";
import { getDatabase } from "../database";
import {
  getActiveOrdersByPatientLocal,
  getBarcodeByStringLocal,
  getPatientByIdLocal,
} from "../database/helpers";
import { queueOperation } from "../database/operationQueue";

export class BarcodeError extends Error {
  constructor(
    public message: string,
    public errorCode?: string
  ) {
    super(message);
    this.name = "BarcodeError";
  }
}

export const barcodeService = {
  /**
   * Scan a barcode to get patient information and active medication orders
   * Offline-first: tries local database first, falls back to API
   * Throws BarcodeError with errorCode for special handling
   */
  scanBarcode: async (
    barcodeString: string
  ): Promise<ScannedBarcodeResponse> => {
    try {
      console.log("🔍 Scanning barcode:", barcodeString);

      // Try local database first
      const barcode = await getBarcodeByStringLocal(barcodeString);
      console.log(
        "📦 Barcode from local DB:",
        barcode ? `found (patientId: ${barcode.patientId})` : "not found"
      );

      if (barcode && barcode.patientId) {
        // Get patient and orders from local DB
        const patient = await getPatientByIdLocal(barcode.patientId);
        console.log(
          "👤 Patient from local DB:",
          patient ? `found (${patient.name})` : "not found"
        );

        const orders = await getActiveOrdersByPatientLocal(barcode.patientId);
        console.log("💊 Orders from local DB:", orders.length);

        if (patient) {
          console.log(
            "✅ Barcode scanned offline successfully:",
            barcodeString
          );

          // Try to sync in background if online
          const networkState = await NetInfo.fetch();
          if (networkState.isConnected) {
            fetchAndCacheBarcodeData(barcodeString).catch((err) =>
              console.warn("Background sync failed:", err)
            );
          }

          return {
            patient: patient as PatientProfile,
            activeOrders: orders,
          };
        } else {
          console.warn("⚠️ Barcode found but patient data missing in local DB");
        }
      } else if (barcode && !barcode.patientId) {
        console.log("⚠️ Barcode found in local DB but not linked to patient");
      }

      // Check if we're online before attempting API call
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        // Offline and not in local DB - treat as not found
        console.log("⚠️ Barcode not in local DB and offline:", barcodeString);
        throw new BarcodeError(
          "Barcode not found in local database. Please try again when online.",
          "BARCODE_NOT_FOUND"
        );
      }

      // Not found locally but we're online, try API
      const response = await apiClient.get<ScannedBarcodeResponse>(
        `/barcodes/scan/${barcodeString}`
      );

      // Cache the barcode data
      await cacheBarcodeData(barcodeString, response.data);

      return response.data;
    } catch (error) {
      console.log("Error in scanBarcode:", error);

      // If it's already a BarcodeError, just rethrow it
      if (error instanceof BarcodeError) {
        throw error;
      }

      // Check if it's an Axios error with a response
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.data) {
        const errorData = axiosError.response.data;
        console.log("Error response data:", errorData);
        console.log("Error status:", axiosError.response.status);

        // Extract message and errorCode from response
        const message =
          typeof errorData === "string" ? errorData : errorData.message;
        const errorCode =
          typeof errorData === "object" && errorData.errorCode
            ? errorData.errorCode
            : "BARCODE_NOT_FOUND"; // Default error code for 404 responses

        console.log("Throwing BarcodeError with:", { message, errorCode });
        throw new BarcodeError(message, errorCode);
      }

      // Network error without response - check if offline
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new BarcodeError(
          "No connection available. Please check your internet connection.",
          "NETWORK_ERROR"
        );
      }

      // Fallback: rethrow original error
      throw error;
    }
  },

  /**
   * Link a barcode to a patient - offline-first
   */
  linkBarcode: async (
    barcodeString: string,
    patientId: string
  ): Promise<void> => {
    try {
      // Update local database immediately
      const db = getDatabase();
      const now = new Date().toISOString();

      // Check if barcode exists locally
      const existing = await getBarcodeByStringLocal(barcodeString);

      if (existing) {
        // Update existing barcode
        await db.runAsync(
          `UPDATE barcodes 
           SET patient_id = ?, status = 'active', last_modified_at = ?
           WHERE barcode_id_string = ?`,
          [patientId, now, barcodeString]
        );

        // Queue update operation
        await queueOperation(
          "update",
          "barcode",
          existing.id,
          {
            patientId,
            status: "active",
          },
          1
        );
      } else {
        // Barcode not in local DB - create it locally
        const barcodeId = `barcode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await db.runAsync(
          `INSERT INTO barcodes 
           (id, barcode_id_string, status, patient_id, version, deleted_at, last_modified_at, created_at)
           VALUES (?, ?, 'active', ?, 1, NULL, ?, ?)`,
          [barcodeId, barcodeString, patientId, now, now]
        );

        // Queue create operation for when we're back online
        await queueOperation(
          "create",
          "barcode",
          barcodeId,
          {
            barcodeIdString: barcodeString,
            patientId,
            status: "active",
          },
          1
        );

        console.log(
          `✅ Barcode ${barcodeString} queued for creation and linked locally`
        );
      }

      // Try to sync with API in background if online
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        try {
          await apiClient.post("/barcodes/link", {
            patientId,
            barcodeIdString: barcodeString,
          });
          console.log(`✅ Barcode ${barcodeString} synced to server`);
        } catch (syncError) {
          console.warn("Failed to sync barcode to server (queued):", syncError);
          // Don't throw - local operation succeeded and queued for later sync
        }
      }

      console.log(`✅ Barcode ${barcodeString} linked to patient ${patientId}`);
    } catch (error) {
      console.error("Failed to link barcode:", error);
      throw error;
    }
  },
};

/**
 * Background fetch and cache barcode data
 */
async function fetchAndCacheBarcodeData(barcodeString: string): Promise<void> {
  try {
    const response = await apiClient.get<ScannedBarcodeResponse>(
      `/barcodes/scan/${barcodeString}`
    );
    await cacheBarcodeData(barcodeString, response.data);
  } catch (error) {
    console.warn("Background fetch failed:", error);
  }
}

/**
 * Cache barcode scan result in local database
 * Also caches the patient data and active orders
 */
async function cacheBarcodeData(
  barcodeString: string,
  data: ScannedBarcodeResponse
): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  console.log(
    "💾 Caching barcode data:",
    barcodeString,
    "for patient:",
    data.patient.name
  );

  // Cache the patient data first
  await db.runAsync(
    `INSERT OR REPLACE INTO patients 
     (id, name, photo, bed_number, diagnosis, ward_id, attending_doctor_id, attending_consultant_id,
      version, deleted_at, last_modified_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.patient.id,
      data.patient.name,
      data.patient.photo || null,
      data.patient.bedNumber || null,
      data.patient.diagnosis || null,
      data.patient.wardId || null,
      data.patient.attendingDoctorId || null,
      data.patient.attendingConsultantId || null,
      data.patient.version || 1,
      null,
      data.patient.lastModifiedAt
        ? new Date(data.patient.lastModifiedAt).toISOString()
        : now,
      data.patient.createdAt
        ? new Date(data.patient.createdAt).toISOString()
        : now,
    ]
  );

  // Cache the active orders
  for (const order of data.activeOrders) {
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
        order.startTime ? new Date(order.startTime).toISOString() : now,
        order.endTime ? new Date(order.endTime).toISOString() : null,
        order.status,
        order.version || 1,
        null,
        order.lastModifiedAt
          ? new Date(order.lastModifiedAt).toISOString()
          : now,
        order.createdAt ? new Date(order.createdAt).toISOString() : now,
      ]
    );
  }

  // Check if barcode exists
  const existing = await getBarcodeByStringLocal(barcodeString);

  if (existing) {
    // Update existing barcode
    await db.runAsync(
      `UPDATE barcodes 
       SET patient_id = ?, status = 'active', last_modified_at = ?
       WHERE barcode_id_string = ?`,
      [data.patient.id, now, barcodeString]
    );
  } else {
    // Insert new barcode
    const barcodeId = `barcode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.runAsync(
      `INSERT INTO barcodes 
       (id, barcode_id_string, status, patient_id, version, deleted_at, last_modified_at, created_at)
       VALUES (?, ?, 'active', ?, 1, NULL, ?, ?)`,
      [barcodeId, barcodeString, data.patient.id, now, now]
    );
  }

  console.log("✅ Cached barcode data successfully:", barcodeString);
}
