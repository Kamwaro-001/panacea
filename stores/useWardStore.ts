// store/useWardStore.ts
import { create } from "zustand";

type WardState = {
  selectedWard: string | null;
  selectedWards: string[];
  selectWard: (ward: string) => void;
};

export const useWardStore = create<WardState>((set) => ({
  selectedWard: null,
  selectedWards: [],
  selectWard: (ward) => set({ selectedWard: ward }),
}));
