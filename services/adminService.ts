import {
  Barcode,
  CreatePatientPayload,
  CreateUserPayload,
  CreateWardPayload,
  PatientProfile,
  UserProfile,
  Ward,
} from "@/types";
import { apiClient } from "@/utils/apiClient";

// Ward Management
export const createWard = async (
  wardData: CreateWardPayload
): Promise<Ward> => {
  const response = await apiClient.post("/wards", wardData);
  return response.data;
};

export const getAllWards = async (): Promise<Ward[]> => {
  const response = await apiClient.get("/wards");
  return response.data;
};

// Patient Management
export const createPatientProfile = async (
  patientData: CreatePatientPayload
): Promise<PatientProfile> => {
  const response = await apiClient.post("/patient-profiles", patientData);
  return response.data;
};

export const getPatientsByWard = async (
  wardId: string
): Promise<PatientProfile[]> => {
  const response = await apiClient.get("/patient-profiles", {
    params: { wardId },
  });
  return response.data;
};

// User Management
export const createUser = async (
  userData: CreateUserPayload
): Promise<UserProfile> => {
  const response = await apiClient.post("/users", userData);
  return response.data;
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const response = await apiClient.get("/users");
  return response.data;
};

// Barcode Management
export const getAllBarcodes = async (): Promise<Barcode[]> => {
  const response = await apiClient.get("/barcodes");
  return response.data;
};
