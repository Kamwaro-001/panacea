// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = "nurse" | "doctor" | "consultant" | "admin";

export type OrderStatus = "active" | "stopped" | "completed";

export type BarcodeStatus = "active" | "archived";

export type AdminOutcome = "given" | "delayed" | "not_given" | "refused";

export type BatchOperationType = "create" | "update" | "delete";

export type EntityType =
  | "user"
  | "ward"
  | "patient"
  | "barcode"
  | "order"
  | "event";

export type OperationResultStatus = "success" | "conflict" | "error";

// ============================================================================
// BASE ENTITY (OFFLINE-FIRST FIELDS)
// ============================================================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  version: number;
  lastModifiedAt: Date;
}

// ============================================================================
// CORE ENTITIES
// ============================================================================

export interface UserProfile extends BaseEntity {
  staffId: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  // pin is excluded for security
}

export interface Ward extends BaseEntity {
  name: string;
  description?: string;
}

export interface PatientProfile extends BaseEntity {
  name: string;
  photo?: string;
  bedNumber: string;
  diagnosis: string;
  wardId: string;
  attendingDoctorId?: string;
  attendingConsultantId?: string;
  // Optional populated relations (when fetched from API with relations)
  ward?: Ward;
  attendingDoctor?: UserProfile;
  attendingConsultant?: UserProfile;
}

export interface MedicationOrder extends BaseEntity {
  drug: string;
  dose: string;
  route: string;
  frequency: string;
  startTime: Date;
  endTime?: Date;
  status: OrderStatus;
  patientId: string;
  prescriberId: string;
  // Optional populated relations (when fetched from API with relations)
  patient?: PatientProfile;
  prescriber?: UserProfile;
}

export interface Barcode extends BaseEntity {
  barcodeIdString: string;
  status: BarcodeStatus;
  patientId: string;
  // Optional populated relation (when fetched from API with relations)
  patient?: PatientProfile;
}

export interface AdministrationEvent extends BaseEntity {
  orderId: string;
  patientId: string;
  nurseId: string;
  outcome: AdminOutcome;
  scannedBarcodeId?: string;
  vitalsBp?: string;
  vitalsHr?: string;
  vitalsTemp?: string;
  vitalsSpo2?: string;
  vitalsPain?: string;
  reasonCode?: string;
  reasonNote?: string;
  administeredAt: Date;
  // Optional populated relations (when fetched from API with relations)
  order?: MedicationOrder;
  patient?: PatientProfile;
  nurse?: UserProfile;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

export interface LoginCredentials {
  staffId: string;
  pin: string;
  deviceId?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
}

// ============================================================================
// OFFLINE-FIRST SYNC
// ============================================================================

export interface DeviceRegistration {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  userId: string;
  lastSyncAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterDeviceDto {
  deviceId: string;
  deviceName: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
}

export interface BatchOperationDto {
  operationId: string;
  type: BatchOperationType;
  entityType: EntityType;
  entityId: string;
  data: Record<string, any>;
  expectedVersion?: number;
}

export interface BatchSyncRequestDto {
  deviceId: string;
  operations: BatchOperationDto[];
}

export interface OperationResultDto {
  operationId: string;
  status: OperationResultStatus;
  entityId?: string;
  version?: number;
  conflictId?: string;
  error?: string;
}

export interface BatchSyncResponseDto {
  serverTimestamp: string;
  results: OperationResultDto[];
  successCount: number;
  conflictCount: number;
  errorCount: number;
}

export interface SyncChangesResponseDto {
  serverTimestamp: string;
  users: UserProfile[];
  wards: Ward[];
  patients: PatientProfile[];
  barcodes: Barcode[];
  orders: MedicationOrder[];
  events: AdministrationEvent[];
  deletions: {
    users: string[];
    wards: string[];
    patients: string[];
    barcodes: string[];
    orders: string[];
    events: string[];
  };
}

// ============================================================================
// API PAYLOADS
// ============================================================================

export interface CreateWardPayload {
  name: string;
  description?: string;
}

export interface CreateUserPayload {
  staffId: string;
  name: string;
  role: UserRole;
  pin: string;
}

export interface CreatePatientPayload {
  name: string;
  bedNumber: string;
  diagnosis: string;
  wardId: string;
  attendingDoctorId?: string;
  attendingConsultantId?: string;
}

export interface LinkBarcodePayload {
  barcodeString: string;
  patientId: string;
}

export interface CreateEventPayload {
  id?: string; // Client can provide UUID for offline-first
  orderId: string;
  patientId: string;
  outcome: AdminOutcome;
  scannedBarcodeId?: string;
  vitalsBp?: string;
  vitalsHr?: string;
  vitalsTemp?: string;
  vitalsSpo2?: string;
  vitalsPain?: string;
  reasonCode?: string;
  reasonNote?: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ScannedBarcodeResponse {
  patient: PatientProfile;
  activeOrders: MedicationOrder[];
}

export interface ApiError {
  message: string;
  errorCode?: string;
}

// ============================================================================
// DEPRECATED - kept for backward compatibility
// ============================================================================

/** @deprecated Use CreateEventPayload instead */
export interface VitalsData {
  bp: string;
  hr: string;
  temp: string;
  spo2: string;
  painScore: string;
}

/** @deprecated Use CreateEventPayload instead */
export interface RecordAdministrationPayload {
  patientId: string;
  vitals: VitalsData;
}
