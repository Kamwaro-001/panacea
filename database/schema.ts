/**
 * SQLite Database Schema for Offline-First Panacea
 *
 * Mirrors backend entities with offline-first capabilities:
 * - Version numbers for optimistic locking
 * - Soft deletes (deletedAt)
 * - Server modification timestamps (lastModifiedAt)
 * - Pending operations queue for sync
 */

export const DATABASE_VERSION = 1;
export const DATABASE_NAME = "panacea.db";

export const SCHEMA_SQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  version INTEGER DEFAULT 1,
  deleted_at TEXT,
  last_modified_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Wards table
CREATE TABLE IF NOT EXISTS wards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  deleted_at TEXT,
  last_modified_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Patient profiles table
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  photo TEXT,
  bed_number TEXT,
  diagnosis TEXT,
  ward_id TEXT,
  attending_doctor_id TEXT,
  attending_consultant_id TEXT,
  version INTEGER DEFAULT 1,
  deleted_at TEXT,
  last_modified_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (ward_id) REFERENCES wards (id),
  FOREIGN KEY (attending_doctor_id) REFERENCES users (id),
  FOREIGN KEY (attending_consultant_id) REFERENCES users (id)
);

-- Barcodes table
CREATE TABLE IF NOT EXISTS barcodes (
  id TEXT PRIMARY KEY,
  barcode_id_string TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'unassigned',
  patient_id TEXT,
  version INTEGER DEFAULT 1,
  deleted_at TEXT,
  last_modified_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients (id)
);

-- Medication orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  prescriber_id TEXT NOT NULL,
  drug TEXT NOT NULL,
  dose TEXT NOT NULL,
  route TEXT NOT NULL,
  frequency TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  status TEXT DEFAULT 'active',
  version INTEGER DEFAULT 1,
  deleted_at TEXT,
  last_modified_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients (id),
  FOREIGN KEY (prescriber_id) REFERENCES users (id)
);

-- Administration events table (medication records)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  nurse_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  vitals_bp TEXT,
  vitals_hr TEXT,
  vitals_temp TEXT,
  vitals_spo2 TEXT,
  vitals_pain_score TEXT,
  scanned_barcode_id TEXT,
  reason_code TEXT,
  reason_note TEXT,
  version INTEGER DEFAULT 1,
  deleted_at TEXT,
  last_modified_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders (id),
  FOREIGN KEY (patient_id) REFERENCES patients (id),
  FOREIGN KEY (nurse_id) REFERENCES users (id),
  FOREIGN KEY (scanned_barcode_id) REFERENCES barcodes (id)
);

-- Pending operations queue for sync
CREATE TABLE IF NOT EXISTS pending_operations (
  operation_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL,
  expected_version INTEGER,
  created_at INTEGER NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  status TEXT DEFAULT 'pending'
);

-- Device registration metadata
CREATE TABLE IF NOT EXISTS device_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_last_modified ON users(last_modified_at);
CREATE INDEX IF NOT EXISTS idx_wards_last_modified ON wards(last_modified_at);
CREATE INDEX IF NOT EXISTS idx_patients_last_modified ON patients(last_modified_at);
CREATE INDEX IF NOT EXISTS idx_patients_ward ON patients(ward_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_last_modified ON barcodes(last_modified_at);
CREATE INDEX IF NOT EXISTS idx_barcodes_patient ON barcodes(patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_last_modified ON orders(last_modified_at);
CREATE INDEX IF NOT EXISTS idx_orders_patient ON orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_events_last_modified ON events(last_modified_at);
CREATE INDEX IF NOT EXISTS idx_events_patient ON events(patient_id);
CREATE INDEX IF NOT EXISTS idx_pending_ops_status ON pending_operations(status);
CREATE INDEX IF NOT EXISTS idx_pending_ops_created ON pending_operations(created_at);
`;

export interface UserRow {
  id: string;
  staff_id: string;
  name: string;
  role: string;
  is_active: number;
  version: number;
  deleted_at: string | null;
  last_modified_at: string;
  created_at: string;
}

export interface WardRow {
  id: string;
  name: string;
  description: string | null;
  version: number;
  deleted_at: string | null;
  last_modified_at: string;
  created_at: string;
}

export interface PatientRow {
  id: string;
  name: string;
  photo: string | null;
  bed_number: string | null;
  diagnosis: string | null;
  ward_id: string | null;
  attending_doctor_id: string | null;
  attending_consultant_id: string | null;
  version: number;
  deleted_at: string | null;
  last_modified_at: string;
  created_at: string;
}

export interface BarcodeRow {
  id: string;
  barcode_id_string: string;
  status: string;
  patient_id: string | null;
  version: number;
  deleted_at: string | null;
  last_modified_at: string;
  created_at: string;
}

export interface OrderRow {
  id: string;
  patient_id: string;
  prescriber_id: string;
  drug: string;
  dose: string;
  route: string;
  frequency: string;
  start_time: string;
  end_time: string | null;
  status: string;
  version: number;
  deleted_at: string | null;
  last_modified_at: string;
  created_at: string;
}

export interface EventRow {
  id: string;
  order_id: string;
  patient_id: string;
  nurse_id: string;
  outcome: string;
  vitals_bp: string | null;
  vitals_hr: string | null;
  vitals_temp: string | null;
  vitals_spo2: string | null;
  vitals_pain_score: string | null;
  scanned_barcode_id: string | null;
  reason_code: string | null;
  reason_note: string | null;
  version: number;
  deleted_at: string | null;
  last_modified_at: string;
  created_at: string;
}

export interface PendingOperationRow {
  operation_id: string;
  type: "create" | "update" | "delete";
  entity_type: "user" | "ward" | "patient" | "barcode" | "order" | "event";
  entity_id: string;
  data: string; // JSON
  expected_version: number | null;
  created_at: number;
  retry_count: number;
  last_error: string | null;
  status: "pending" | "syncing" | "failed" | "conflict";
}
