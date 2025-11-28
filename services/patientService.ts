import { PatientProfile } from "@/types";
import { apiClient } from "@/utils/apiClient";
import NetInfo from "@react-native-community/netinfo";
import { getDatabase } from "../database";
import {
  getPatientsByWardLocal,
  getPatientByIdLocal,
  rowToPatientProfile,
} from "../database/helpers";
import { queueOperation, generateUUID } from "../database/operationQueue";
import { PatientRow } from "../database/schema";

/**
 * Get patients by ward - offline-first
 * Reads from local database, syncs in background
 */
export const getPatientsByWard = async (
  wardId: string
): Promise<PatientProfile[]> => {
  try {
    // Always read from local database first
    const localPatients = await getPatientsByWardLocal(wardId);

    // Try to fetch from API in background (don't wait)
    const networkState = await NetInfo.fetch();
    if (networkState.isConnected) {
      fetchAndCachePatientsByWard(wardId).catch((err) =>
        console.warn("Background sync failed:", err)
      );
    }

    return localPatients;
  } catch (error) {
    console.error("Failed to get patients from local DB:", error);
    // Fallback to API if local DB fails
    const response = await apiClient.get("/patient-profiles", {
      params: { wardId },
    });
    return response.data;
  }
};

/**
 * Background fetch and cache patients
 */
async function fetchAndCachePatientsByWard(wardId: string): Promise<void> {
  try {
    const response = await apiClient.get("/patient-profiles", {
      params: { wardId },
    });

    // Cache in local database
    const db = getDatabase();
    for (const patient of response.data) {
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
          patient.version || 1,
          null,
          patient.lastModifiedAt || new Date().toISOString(),
          patient.createdAt || new Date().toISOString(),
        ]
      );
    }
  } catch (error) {
    console.warn("Background fetch failed:", error);
  }
}

/**
 * Get patient by ID - offline-first
 */
export const getPatientById = async (
  patientId: string
): Promise<PatientProfile> => {
  try {
    // Try local database first
    const localPatient = await getPatientByIdLocal(patientId);

    if (localPatient) {
      // Fetch updated data in background
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        fetchAndCachePatientById(patientId).catch((err) =>
          console.warn("Background sync failed:", err)
        );
      }

      return localPatient;
    }

    // Not in local DB, fetch from API
    const response = await apiClient.get(`/patient-profiles/${patientId}`);

    // Cache in local database
    await cachePatient(response.data);

    return response.data;
  } catch (error) {
    console.error("Failed to get patient:", error);
    throw error;
  }
};

/**
 * Background fetch and cache single patient
 */
async function fetchAndCachePatientById(patientId: string): Promise<void> {
  try {
    const response = await apiClient.get(`/patient-profiles/${patientId}`);
    await cachePatient(response.data);
  } catch (error) {
    console.warn("Background fetch failed:", error);
  }
}

/**
 * Cache patient in local database
 */
async function cachePatient(patient: any): Promise<void> {
  const db = getDatabase();
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
      patient.version || 1,
      null,
      patient.lastModifiedAt || new Date().toISOString(),
      patient.createdAt || new Date().toISOString(),
    ]
  );
}

/**
 * Create patient - offline-first with optimistic updates
 */
export const createPatient = async (
  patientData: Partial<PatientProfile>
): Promise<PatientProfile> => {
  const patientId = generateUUID();
  const now = new Date().toISOString();

  const newPatient: PatientProfile = {
    id: patientId,
    name: patientData.name || "",
    photo: patientData.photo,
    bedNumber: patientData.bedNumber || "",
    diagnosis: patientData.diagnosis || "",
    wardId: patientData.wardId || "",
    attendingDoctorId: patientData.attendingDoctorId,
    attendingConsultantId: patientData.attendingConsultantId,
  };

  try {
    // Save to local database immediately (optimistic update)
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO patients 
       (id, name, photo, bed_number, diagnosis, ward_id, attending_doctor_id, attending_consultant_id,
        version, deleted_at, last_modified_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        newPatient.name,
        newPatient.photo || null,
        newPatient.bedNumber || null,
        newPatient.diagnosis || null,
        newPatient.wardId || null,
        newPatient.attendingDoctorId || null,
        newPatient.attendingConsultantId || null,
        1,
        null,
        now,
        now,
      ]
    );

    // Queue for sync
    await queueOperation("create", "patient", patientId, patientData);

    console.log(`✅ Patient created locally: ${patientId}`);
    return newPatient;
  } catch (error) {
    console.error("Failed to create patient:", error);
    throw error;
  }
};

/**
 * Update patient - offline-first with version tracking
 */
export const updatePatient = async (
  id: string,
  patientData: Partial<PatientProfile>
): Promise<PatientProfile> => {
  try {
    // Get current version from local database
    const db = getDatabase();
    const current = await db.getFirstAsync<PatientRow>(
      "SELECT * FROM patients WHERE id = ?",
      [id]
    );

    if (!current) {
      throw new Error("Patient not found in local database");
    }

    // Update local database immediately (optimistic update)
    const updates: string[] = [];
    const values: any[] = [];

    if (patientData.name !== undefined) {
      updates.push("name = ?");
      values.push(patientData.name);
    }
    if (patientData.photo !== undefined) {
      updates.push("photo = ?");
      values.push(patientData.photo || null);
    }
    if (patientData.bedNumber !== undefined) {
      updates.push("bed_number = ?");
      values.push(patientData.bedNumber);
    }
    if (patientData.diagnosis !== undefined) {
      updates.push("diagnosis = ?");
      values.push(patientData.diagnosis);
    }
    if (patientData.wardId !== undefined) {
      updates.push("ward_id = ?");
      values.push(patientData.wardId);
    }
    if (patientData.attendingDoctorId !== undefined) {
      updates.push("attending_doctor_id = ?");
      values.push(patientData.attendingDoctorId || null);
    }
    if (patientData.attendingConsultantId !== undefined) {
      updates.push("attending_consultant_id = ?");
      values.push(patientData.attendingConsultantId || null);
    }

    updates.push("last_modified_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(
      `UPDATE patients SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    // Queue for sync with version tracking
    await queueOperation("update", "patient", id, patientData, current.version);

    // Return updated patient
    const updated = await getPatientByIdLocal(id);
    if (!updated) {
      throw new Error("Failed to get updated patient");
    }

    console.log(`✅ Patient updated locally: ${id}`);
    return updated;
  } catch (error) {
    console.error("Failed to update patient:", error);
    throw error;
  }
};
