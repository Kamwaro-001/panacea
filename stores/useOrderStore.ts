import { getOrdersByPatient } from "@/services/orderService";
import { MedicationOrder } from "@/types";
import { create } from "zustand";

type OrderState = {
  orders: MedicationOrder[];
  isLoading: boolean;
  error: string | null;
  fetchOrdersByPatient: (patientId: string) => Promise<void>;
  clearOrders: () => void;
};

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  isLoading: false,
  error: null,

  fetchOrdersByPatient: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const orders = await getOrdersByPatient(patientId);
      set({ orders, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch orders";
      set((state) => ({
        error: errorMessage,
        isLoading: false,
        orders: state.orders,
      }));
      throw error;
    }
  },

  clearOrders: () => set({ orders: [], error: null }),
}));
