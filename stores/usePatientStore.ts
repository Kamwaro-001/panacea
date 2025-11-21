import { getPatientById, getPatientsByWard } from "@/services/patientService";
import { PatientProfile } from "@/types";
import { create } from "zustand";

type PatientState = {
  patients: PatientProfile[];
  selectedPatient: PatientProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchPatientsByWard: (wardId: string) => Promise<void>;
  fetchPatientById: (patientId: string) => Promise<void>;
  clearPatients: () => void;
  clearSelectedPatient: () => void;
};

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  selectedPatient: null,
  isLoading: false,
  error: null,

  fetchPatientsByWard: async (wardId: string) => {
    set({ isLoading: true, error: null });
    try {
      const newPatients = await getPatientsByWard(wardId);
      const { patients: existingPatients } = get();
      // Append new patients, avoiding duplicates by ID
      const updatedPatients = [...existingPatients];
      newPatients.forEach((newPatient) => {
        if (!updatedPatients.some((p) => p.id === newPatient.id)) {
          updatedPatients.push(newPatient);
        }
      });
      set({ patients: updatedPatients, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch patients";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  fetchPatientById: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const patient = await getPatientById(patientId);
      set({ selectedPatient: patient, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch patient";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  clearPatients: () => set({ patients: [], error: null }),

  clearSelectedPatient: () => set({ selectedPatient: null }),
}));
