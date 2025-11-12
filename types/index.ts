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
