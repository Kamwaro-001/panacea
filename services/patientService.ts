import { PatientProfile } from "@/types";
import { apiClient } from "@/utils/apiClient";

export const getPatientsByWard = async (
  wardId: string
): Promise<PatientProfile[]> => {
  const response = await apiClient.get("/patient-profiles", {
    params: { wardId },
  });
  return response.data;
};

export const getPatientById = async (
  patientId: string
): Promise<PatientProfile> => {
  const response = await apiClient.get(`/patient-profiles/${patientId}`);
  return response.data;
};

export const createPatient = async (
  patientData: Partial<PatientProfile>
): Promise<PatientProfile> => {
  const response = await apiClient.post("/patient-profiles", patientData);
  return response.data;
};

export const updatePatient = async (
  id: string,
  patientData: Partial<PatientProfile>
): Promise<PatientProfile> => {
  const response = await apiClient.put(`/patient-profiles/${id}`, patientData);
  return response.data;
};
