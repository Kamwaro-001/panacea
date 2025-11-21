import { getWardById, getWards } from "@/services/wardService";
import { Ward } from "@/types";
import { create } from "zustand";

type DoctorWardState = {
  wards: Ward[];
  selectedWards: Ward[];
  isLoading: boolean;
  error: string | null;
  fetchWards: () => Promise<void>;
  toggleWardSelection: (wardId: string) => Promise<void>;
  clearSelectedWards: () => void;
  setSelectedWards: (wardIds: string[]) => Promise<void>;
};

export const useDoctorWardStore = create<DoctorWardState>((set, get) => ({
  wards: [],
  selectedWards: [],
  isLoading: false,
  error: null,

  fetchWards: async () => {
    set({ isLoading: true, error: null });
    try {
      const wards = await getWards();
      set({ wards, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch wards";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  toggleWardSelection: async (wardId: string) => {
    const { selectedWards, wards } = get();

    // Check if ward is already selected
    const isSelected = selectedWards.some((w) => w.id === wardId);

    if (isSelected) {
      // Remove from selection
      set({
        selectedWards: selectedWards.filter((w) => w.id !== wardId),
      });
    } else {
      // Add to selection
      // First, try to find the ward in the already fetched wards
      const existingWard = wards.find((w) => w.id === wardId);

      if (existingWard) {
        set({
          selectedWards: [...selectedWards, existingWard],
        });
      } else {
        // If not found, fetch it from the API
        try {
          set({ isLoading: true, error: null });
          const ward = await getWardById(wardId);
          set({
            selectedWards: [...selectedWards, ward],
            isLoading: false,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to select ward";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      }
    }
  },

  setSelectedWards: async (wardIds: string[]) => {
    const { wards } = get();
    set({ isLoading: true, error: null });

    try {
      const selectedWards: Ward[] = [];

      for (const wardId of wardIds) {
        const existingWard = wards.find((w) => w.id === wardId);

        if (existingWard) {
          selectedWards.push(existingWard);
        } else {
          const ward = await getWardById(wardId);
          selectedWards.push(ward);
        }
      }

      set({ selectedWards, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to set wards";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  clearSelectedWards: () => set({ selectedWards: [] }),
}));
