import { MedicationOrder } from "@/types";
import { apiClient } from "@/utils/apiClient";

export const getOrdersByPatient = async (
  patientId: string
): Promise<MedicationOrder[]> => {
  const response = await apiClient.get("/orders", {
    params: { patientId },
  });
  return response.data;
};

export const createOrder = async (
  orderData: Partial<MedicationOrder>
): Promise<MedicationOrder> => {
  const response = await apiClient.post("/orders", orderData);
  return response.data;
};
