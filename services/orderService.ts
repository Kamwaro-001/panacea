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

export const updateOrder = async (
  orderId: string,
  orderData: Partial<MedicationOrder>
): Promise<MedicationOrder> => {
  const response = await apiClient.put(`/orders/${orderId}`, orderData);
  return response.data;
};

export const stopOrder = async (orderId: string): Promise<MedicationOrder> => {
  const response = await apiClient.post(`/orders/stop/${orderId}`);
  return response.data;
};
