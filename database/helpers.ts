/**
 * Database Helpers
 *
 * Helper functions for common database operations with proper type conversions
 */

import { getDatabase } from "./index";
import {
  UserRow,
  WardRow,
  PatientRow,
  BarcodeRow,
  OrderRow,
  EventRow,
} from "./schema";
import {
  UserProfile,
  Ward,
  PatientProfile,
  Barcode,
  MedicationOrder,
} from "../types";

/**
 * Convert database row to UserProfile type
 */
export function rowToUserProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    staffId: row.staff_id,
    name: row.name,
    role: row.role as any,
    isActive: row.is_active === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.last_modified_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    version: row.version,
    lastModifiedAt: new Date(row.last_modified_at),
  };
}

/**
 * Convert database row to Ward type
 */
export function rowToWard(row: WardRow): Ward {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.last_modified_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    version: row.version,
    lastModifiedAt: new Date(row.last_modified_at),
  };
}

/**
 * Convert database row to PatientProfile type
 */
export function rowToPatientProfile(row: PatientRow): PatientProfile {
  return {
    id: row.id,
    name: row.name,
    photo: row.photo || undefined,
    bedNumber: row.bed_number || "",
    diagnosis: row.diagnosis || "",
    wardId: row.ward_id || "",
    attendingDoctorId: row.attending_doctor_id || undefined,
    attendingConsultantId: row.attending_consultant_id || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.last_modified_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    version: row.version,
    lastModifiedAt: new Date(row.last_modified_at),
  };
}

/**
 * Convert database row to Barcode type
 */
export function rowToBarcode(row: BarcodeRow): Barcode {
  return {
    id: row.id,
    barcodeIdString: row.barcode_id_string,
    status: row.status as any,
    patientId: row.patient_id || "",
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.last_modified_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    version: row.version,
    lastModifiedAt: new Date(row.last_modified_at),
  };
}

/**
 * Convert database row to MedicationOrder type
 */
export function rowToMedicationOrder(row: OrderRow): MedicationOrder {
  return {
    id: row.id,
    patientId: row.patient_id,
    drug: row.drug,
    dose: row.dose,
    route: row.route,
    frequency: row.frequency,
    startTime: new Date(row.start_time),
    endTime: row.end_time ? new Date(row.end_time) : undefined,
    status: row.status as any,
    prescriberId: row.prescriber_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.last_modified_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    version: row.version,
    lastModifiedAt: new Date(row.last_modified_at),
  };
}

/**
 * Get all users from local database
 */
export async function getAllUsersLocal(): Promise<UserProfile[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<UserRow>(
    "SELECT * FROM users WHERE deleted_at IS NULL AND is_active = 1"
  );
  return rows.map(rowToUserProfile);
}

/**
 * Get all wards from local database
 */
export async function getAllWardsLocal(): Promise<Ward[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<WardRow>(
    "SELECT * FROM wards WHERE deleted_at IS NULL"
  );
  console.log(`📊 getAllWardsLocal: Found ${rows.length} wards in DB`);
  return rows.map(rowToWard);
}

/**
 * Get ward by ID from local database
 */
export async function getWardByIdLocal(wardId: string): Promise<Ward | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<WardRow>(
    "SELECT * FROM wards WHERE id = ? AND deleted_at IS NULL",
    [wardId]
  );
  return row ? rowToWard(row) : null;
}

/**
 * Get patients by ward from local database with ward relationship
 */
export async function getPatientsByWardLocal(
  wardId: string
): Promise<PatientProfile[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<PatientRow>(
    "SELECT * FROM patients WHERE ward_id = ? AND deleted_at IS NULL",
    [wardId]
  );

  // Get ward once for all patients
  const wardRow = await db.getFirstAsync<WardRow>(
    "SELECT * FROM wards WHERE id = ? AND deleted_at IS NULL",
    [wardId]
  );
  const ward = wardRow ? rowToWard(wardRow) : undefined;

  return rows.map((row) => {
    const patient = rowToPatientProfile(row);
    if (ward) {
      patient.ward = ward;
    }
    return patient;
  });
}

/**
 * Get patient by ID from local database with relationships
 */
export async function getPatientByIdLocal(
  patientId: string
): Promise<PatientProfile | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<PatientRow>(
    "SELECT * FROM patients WHERE id = ? AND deleted_at IS NULL",
    [patientId]
  );

  if (!row) return null;

  const patient = rowToPatientProfile(row);

  // Populate ward relationship
  if (row.ward_id) {
    const wardRow = await db.getFirstAsync<WardRow>(
      "SELECT * FROM wards WHERE id = ? AND deleted_at IS NULL",
      [row.ward_id]
    );
    if (wardRow) {
      patient.ward = rowToWard(wardRow);
    }
  }

  // Populate attending doctor relationship
  if (row.attending_doctor_id) {
    const doctorRow = await db.getFirstAsync<UserRow>(
      "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
      [row.attending_doctor_id]
    );
    if (doctorRow) {
      patient.attendingDoctor = rowToUserProfile(doctorRow);
    }
  }

  // Populate attending consultant relationship
  if (row.attending_consultant_id) {
    const consultantRow = await db.getFirstAsync<UserRow>(
      "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
      [row.attending_consultant_id]
    );
    if (consultantRow) {
      patient.attendingConsultant = rowToUserProfile(consultantRow);
    }
  }

  return patient;
}

/**
 * Get orders for a patient from local database
 */
export async function getOrdersByPatientLocal(
  patientId: string
): Promise<MedicationOrder[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<OrderRow>(
    "SELECT * FROM orders WHERE patient_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
    [patientId]
  );
  return rows.map(rowToMedicationOrder);
}

/**
 * Get active orders for a patient from local database
 */
export async function getActiveOrdersByPatientLocal(
  patientId: string
): Promise<MedicationOrder[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<OrderRow>(
    `SELECT * FROM orders 
     WHERE patient_id = ? 
     AND status = 'active' 
     AND deleted_at IS NULL 
     ORDER BY created_at DESC`,
    [patientId]
  );
  return rows.map(rowToMedicationOrder);
}

/**
 * Get all barcodes from local database
 */
export async function getAllBarcodesLocal(): Promise<Barcode[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<BarcodeRow>(
    "SELECT * FROM barcodes WHERE deleted_at IS NULL"
  );
  return rows.map(rowToBarcode);
}

/**
 * Get barcode by string from local database
 */
export async function getBarcodeByStringLocal(
  barcodeString: string
): Promise<Barcode | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<BarcodeRow>(
    "SELECT * FROM barcodes WHERE barcode_id_string = ? AND deleted_at IS NULL",
    [barcodeString]
  );
  return row ? rowToBarcode(row) : null;
}
