import { getPatientById, getPatientsByWard } from "@/services/patientService";
import { PatientProfile } from "@/types";
import { create } from "zustand";

type PatientState = {
  patients: PatientProfile[];
  selectedPatient: PatientProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchPatientsByWard: (wardId: string, append?: boolean) => Promise<void>;
  fetchPatientsByWards: (wardIds: string[]) => Promise<void>;
  fetchPatientById: (patientId: string) => Promise<void>;
  clearPatients: () => void;
  clearSelectedPatient: () => void;
};

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  selectedPatient: null,
  isLoading: false,
  error: null,

  fetchPatientsByWard: async (wardId: string, append: boolean = false) => {
    set({ isLoading: true, error: null });
    try {
      const newPatients = await getPatientsByWard(wardId);

      if (append) {
        // For multi-ward users (doctors), append new patients to existing ones
        const currentPatients = get().patients;
        // Filter out any duplicates and patients from the same ward to avoid duplicates
        const filteredCurrent = currentPatients.filter(
          (p) => p.wardId !== wardId
        );
        set({
          patients: [...filteredCurrent, ...newPatients],
          isLoading: false,
        });
      } else {
        // For single-ward users (nurses), replace all patients with new ones
        // This ensures when switching wards, only the new ward's patients are shown
        set({ patients: newPatients, isLoading: false });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch patients";
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  fetchPatientsByWards: async (wardIds: string[]) => {
    set({ isLoading: true, error: null, patients: [] });
    try {
      const allPatients: PatientProfile[] = [];

      for (const wardId of wardIds) {
        const wardPatients = await getPatientsByWard(wardId);
        allPatients.push(...wardPatients);
      }

      set({ patients: allPatients, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch patients";
      set({
        error: errorMessage,
        isLoading: false,
      });
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
