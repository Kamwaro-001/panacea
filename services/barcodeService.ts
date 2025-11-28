import { ApiError, ScannedBarcodeResponse, PatientProfile } from "@/types";
import { apiClient } from "@/utils/apiClient";
import { AxiosError } from "axios";
import NetInfo from "@react-native-community/netinfo";
import { getDatabase } from "../database";
import {
  getBarcodeByStringLocal,
  getPatientByIdLocal,
  getActiveOrdersByPatientLocal,
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
      // Try local database first
      const barcode = await getBarcodeByStringLocal(barcodeString);

      if (barcode && barcode.patientId) {
        // Get patient and orders from local DB
        const patient = await getPatientByIdLocal(barcode.patientId);
        const orders = await getActiveOrdersByPatientLocal(barcode.patientId);

        if (patient) {
          console.log("✅ Barcode scanned offline:", barcodeString);

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
        }
      }

      // Not found locally or patient data incomplete, try API
      const response = await apiClient.get<ScannedBarcodeResponse>(
        `/barcodes/scan/${barcodeString}`
      );

      // Cache the barcode data
      await cacheBarcodeData(barcodeString, response.data);

      return response.data;
    } catch (error) {
      console.log("Error in scanBarcode:", error);

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
        // Barcode not in local DB, must use API
        await apiClient.post("/barcodes/link", {
          patientId,
          barcodeIdString: barcodeString,
        });

        // Sync to get the new barcode
        const networkState = await NetInfo.fetch();
        if (networkState.isConnected) {
          fetchAndCacheBarcodeData(barcodeString).catch((err) =>
            console.warn("Failed to cache barcode:", err)
          );
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
 */
async function cacheBarcodeData(
  barcodeString: string,
  data: ScannedBarcodeResponse
): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Find barcode ID by string (should be returned from API)
  // For now, we'll update by barcode_id_string
  await db.runAsync(
    `INSERT OR REPLACE INTO barcodes 
     (id, barcode_id_string, status, patient_id, version, deleted_at, last_modified_at, created_at)
     SELECT 
       COALESCE((SELECT id FROM barcodes WHERE barcode_id_string = ?), ?),
       ?, 'active', ?, 1, NULL, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM barcodes WHERE barcode_id_string = ?)`,
    [
      barcodeString,
      barcodeString,
      barcodeString,
      data.patient.id,
      now,
      now,
      barcodeString,
    ]
  );
}
