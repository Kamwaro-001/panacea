import { apiClient } from "@/utils/apiClient";

// Example: All these requests will automatically include the Authorization header
// with the Bearer token from the auth store

export const getPatients = async () => {
  const response = await apiClient.get("/patient-profiles");
  return response.data;
};

export const getPatientById = async (id: string) => {
  const response = await apiClient.get(`/patient-profiles/${id}`);
  return response.data;
};

export const createPatient = async (patientData: any) => {
  const response = await apiClient.post("/patient-profiles", patientData);
  return response.data;
};

export const updatePatient = async (id: string, patientData: any) => {
  const response = await apiClient.put(`/patient-profiles/${id}`, patientData);
  return response.data;
};
