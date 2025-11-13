import { Ward } from "@/types";
import { apiClient } from "@/utils/apiClient";

export const getWards = async (): Promise<Ward[]> => {
  const response = await apiClient.get("/wards");
  return response.data;
};

export const getWardById = async (wardId: string): Promise<Ward> => {
  console.log("wardId", wardId);
  const response = await apiClient.get(`/wards/${wardId}`);
  return response.data;
};
