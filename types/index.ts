export type UserRole = "nurse" | "doctor" | "consultant" | "admin";

export interface LoginResponse {
  accessToken: string;
}

export interface UserProfile {
  id: string;
  staffId: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// patient info
export interface PatientProfile {
  id: string;
  name: string;
  photo?: string; // URL to photo
  bedNumber: string;
  diagnosis: string;
  wardId: string;
  attendingDoctorId?: string;
  attendingDoctor?: Pick<UserProfile, "name" | "role">;
  attendingConsultantId?: string;
  attendingConsultant?: Pick<UserProfile, "name" | "role">;
  ward: Ward;
  // createdAt: Date;
  // updatedAt: Date;
}

// ward info
export interface Ward {
  id: string;
  name: string;
  description?: string;
  // patients: PatientProfile[]; // Omit patients for simplicity
  // createdAt: Date;
  // updatedAt: Date;
}

// order status
export type OrderStatus = "active" | "stopped" | "completed";

// medication order
export interface MedicationOrder {
  id: string;
  patientId: string;
  drug: string;
  dose: string;
  route: string;
  frequency: string;
  startTime: Date;
  endTime?: Date;
  status: OrderStatus;
  prescriber: Pick<UserProfile, "id" | "name" | "role">;
  // createdAt: Date;
  // updatedAt: Date;
}

// authentication credentials
export interface LoginCredentials {
  staffId: string;
  password: string;
}
