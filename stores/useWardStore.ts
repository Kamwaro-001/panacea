import { getWardById, getWards } from "@/services/wardService";
import { Ward } from "@/types";
import { create } from "zustand";

type WardState = {
  wards: Ward[];
  selectedWard: Ward | null;
  isLoading: boolean;
  error: string | null;
  fetchWards: () => Promise<void>;
  selectWard: (wardId: string) => Promise<void>;
  clearSelectedWard: () => void;
};

export const useWardStore = create<WardState>((set, get) => ({
  wards: [],
  selectedWard: null,
  isLoading: false,
  error: null,

  fetchWards: async () => {
    const currentState = get();
    set({ isLoading: true, error: null });
    try {
      console.log("🔄 Ward store: Fetching wards...");
      const wards = await getWards();
      console.log(`✅ Ward store: Fetched ${wards.length} wards`);
      set({ wards, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch wards";
      console.error("❌ Ward store: Failed to fetch wards:", error);
      set({ error: errorMessage, isLoading: false, wards: currentState.wards });
      throw error;
    }
  },

  selectWard: async (wardId: string) => {
    set({ isLoading: true, error: null });
    try {
      // First, try to find the ward in the already fetched wards
      const { wards } = get();
      const existingWard = wards.find((w) => w.id === wardId);

      if (existingWard) {
        // Use the ward we already have
        set({ selectedWard: existingWard, isLoading: false });
      } else {
        // If not found, fetch it from the API
        const ward = await getWardById(wardId);
        set({ selectedWard: ward, isLoading: false });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to select ward";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  clearSelectedWard: () => set({ selectedWard: null }),
}));
